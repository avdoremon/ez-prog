import { expect, test } from 'vitest';
import { LAYOUT_RADIUS, layoutGraph3D } from './graphLayout.js';
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

test('no two nodes settle closer than the sphere diameter', () => {
  const edges = [
    { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 },
    { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 },
  ];
  const positions = [...layoutGraph3D(6, edges).values()];
  const SPHERE_DIAMETER = 0.8; // matches GraphView3D.tsx's sphereGeometry radius (0.4) * 2
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      expect(distance(positions[i]!, positions[j]!)).toBeGreaterThan(SPHERE_DIAMETER);
    }
  }
});

test('every settled node fits within the camera-framed radius', () => {
  const edges = [
    { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 },
    { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 },
  ];
  const positions = layoutGraph3D(6, edges);
  for (const p of positions.values()) {
    expect(Math.hypot(p.x, p.y, p.z)).toBeLessThanOrEqual(LAYOUT_RADIUS + 1e-6);
  }
});

test('an isolated node (no edges at all) does not crush the connected cluster together', () => {
  // graph-intro's exact default shape: nodes 0-1-2 mutually connected plus
  // 2-3, and node 4 with no edges touching it at all -- the case that
  // exposed the bug this test guards (see GRAVITY_STRENGTH's doc comment
  // in graphLayout.ts): an untethered node drifting far enough to become
  // the rescale's outlier crushed the connected cluster below the sphere
  // diameter.
  const edges = [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 2 }, { from: 2, to: 3 }];
  const positions = [...layoutGraph3D(5, edges).values()];
  const SPHERE_DIAMETER = 0.8;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      expect(distance(positions[i]!, positions[j]!)).toBeGreaterThan(SPHERE_DIAMETER);
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
