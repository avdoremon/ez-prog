import { expect, test } from 'vitest';
import { layoutGraph3D } from './graphLayout.js';
import type { Position3D } from './layout.js';

function distance(a: Position3D, b: Position3D): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

test('produces one position per node', () => {
  const positions = layoutGraph3D(4, [{ from: 0, to: 1 }, { from: 1, to: 2 }]);
  expect(positions.size).toBe(4);
});

test('an empty graph produces no positions', () => {
  expect(layoutGraph3D(0, []).size).toBe(0);
});

test('a single node with no edges settles at the origin', () => {
  const positions = layoutGraph3D(1, []);
  const p = positions.get(0)!;
  expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(0, 1);
});

test('layout is deterministic', () => {
  const edges = [
    { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 },
    { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 },
  ];
  const a = layoutGraph3D(6, edges);
  const b = layoutGraph3D(6, edges);
  expect([...a.entries()]).toEqual([...b.entries()]);
});

test('no two nodes settle at the exact same position', () => {
  const edges = [
    { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 },
    { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 },
  ];
  const positions = [...layoutGraph3D(6, edges).values()];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      expect(distance(positions[i]!, positions[j]!)).toBeGreaterThan(0);
    }
  }
});

test('two disconnected edges settle with each pair closer together than across pairs', () => {
  // 0-1 is one edge; 2-3 is a separate edge; no path connects the two pairs.
  const positions = layoutGraph3D(4, [{ from: 0, to: 1 }, { from: 2, to: 3 }]);
  const p0 = positions.get(0)!;
  const p1 = positions.get(1)!;
  const p2 = positions.get(2)!;
  const p3 = positions.get(3)!;
  const withinPair0 = distance(p0, p1);
  const withinPair1 = distance(p2, p3);
  const acrossPairs = distance(p0, p2);
  expect(withinPair0).toBeLessThan(acrossPairs);
  expect(withinPair1).toBeLessThan(acrossPairs);
});
