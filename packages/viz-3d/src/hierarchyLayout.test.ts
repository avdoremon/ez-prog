import { expect, test } from 'vitest';
import { HIERARCHY_LAYOUT_RADIUS, layoutHierarchy3D } from './hierarchyLayout.js';
import type { Position3D } from './layout.js';

function distance(a: Position3D, b: Position3D): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

test('an empty graph produces no positions', () => {
  expect(layoutHierarchy3D(0, []).size).toBe(0);
});

test('a single node with no edges sits at the origin', () => {
  const positions = layoutHierarchy3D(1, []);
  expect(positions.get(0)).toEqual({ x: 0, y: 0, z: 0 });
});

test('root falls back to index 0 when more than one node has no parent', () => {
  // Two disconnected nodes -- neither has an incoming edge, so root
  // detection can't pick a unique one. Falls back to 0 rather than
  // throwing; this only checks the fallback rule itself, not layout
  // quality for malformed/disconnected input (out of scope -- neither
  // real lesson ever produces a disconnected graph; see the design spec's
  // trust-boundary note in §2).
  const positions = layoutHierarchy3D(2, []);
  expect(positions.get(0)).toEqual({ x: 0, y: 0, z: 0 });
});

test('a 4-node chain lays out as a straight line, deepest node exactly at the bounding radius', () => {
  const edges = [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }];
  const positions = layoutHierarchy3D(4, edges);
  expect(positions.get(0)).toEqual({ x: 0, y: 0, z: 0 });
  const p1 = positions.get(1)!;
  const p2 = positions.get(2)!;
  const p3 = positions.get(3)!;
  expect(p1.x).toBeCloseTo(-4);
  expect(p1.y).toBeCloseTo(-3);
  expect(p1.z).toBeCloseTo(0);
  expect(p2.x).toBeCloseTo(-8);
  expect(p2.y).toBeCloseTo(-6);
  expect(p2.z).toBeCloseTo(0);
  expect(p3.x).toBeCloseTo(-12);
  expect(p3.y).toBeCloseTo(-9);
  expect(p3.z).toBeCloseTo(0);
  expect(Math.hypot(p3.x, p3.y, p3.z)).toBeCloseTo(HIERARCHY_LAYOUT_RADIUS);
});

test('a node with two children splits its wedge into two non-overlapping, mirrored angles', () => {
  const edges = [{ from: 0, to: 1 }, { from: 0, to: 2 }];
  const positions = layoutHierarchy3D(3, edges);
  const p1 = positions.get(1)!;
  const p2 = positions.get(2)!;
  expect(p1.x).toBeCloseTo(0);
  expect(p1.y).toBeCloseTo(-9);
  expect(p1.z).toBeCloseTo(12);
  expect(p2.x).toBeCloseTo(0);
  expect(p2.y).toBeCloseTo(-9);
  expect(p2.z).toBeCloseTo(-12);
});

test('layout is deterministic', () => {
  const edges = [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 }];
  const a = layoutHierarchy3D(4, edges);
  const b = layoutHierarchy3D(4, edges);
  expect([...a.entries()]).toEqual([...b.entries()]);
});

test('no two nodes settle closer than the sphere diameter, for a 16-node chain (HIERARCHY_LAYOUT_RADIUS\'s calibration length)', () => {
  // 16 is the length HIERARCHY_LAYOUT_RADIUS = 15 was sized against (it
  // yields exactly 1.0 units of spacing, a 25% margin over the 0.8 floor)
  // -- NOT any lesson's cap. linked-list caps `arr` at 7 and renders at
  // most 8 nodes after its generator splices in the inserted one; that cap
  // is set by screen projection (hierarchyProjection.test.ts), a bound this
  // 3D-distance test does not and cannot speak to.
  const edges: { from: number; to: number }[] = [];
  for (let i = 0; i < 15; i++) edges.push({ from: i, to: i + 1 });
  const positions = [...layoutHierarchy3D(16, edges).values()];
  const SPHERE_DIAMETER = 0.8;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      expect(distance(positions[i]!, positions[j]!)).toBeGreaterThan(SPHERE_DIAMETER);
    }
  }
});

test('no two nodes settle closer than the sphere diameter, for trie\'s ORIGINAL worst-case shape (6 words, 8 chars, no shared prefix) -- kept as a calibration check, not the current registry cap', () => {
  // 6 separate 8-node chains hanging off the root. This was trie's actual
  // registry-permitted worst case when HIERARCHY_LAYOUT_RADIUS was
  // calibrated; a later screen-projection check (hierarchyProjection.test.ts)
  // found it projects to OVERLAPPING spheres despite clearing this 3D
  // floor comfortably (1.5 units), and the registry's per-word length cap
  // was tightened 8 -> 4 as a result (see apps/web/src/viz/registry.ts's
  // `trie` entry). This 3D-distance test is kept anyway, unmodified, as a
  // calibration/regression anchor for HIERARCHY_LAYOUT_RADIUS itself,
  // against a strictly harder shape than anything the schema permits
  // today -- mirroring the 16-node chain test above, which plays the same
  // role for linked-list's own now-tighter cap.
  const edges: { from: number; to: number }[] = [];
  let next = 1;
  for (let branch = 0; branch < 6; branch++) {
    let parent = 0;
    for (let step = 0; step < 8; step++) {
      edges.push({ from: parent, to: next });
      parent = next;
      next++;
    }
  }
  const positions = [...layoutHierarchy3D(next, edges).values()];
  const SPHERE_DIAMETER = 0.8;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      expect(distance(positions[i]!, positions[j]!)).toBeGreaterThan(SPHERE_DIAMETER);
    }
  }
});

test('every settled node fits within the bounding radius', () => {
  const edges: { from: number; to: number }[] = [];
  for (let i = 0; i < 15; i++) edges.push({ from: i, to: i + 1 });
  const positions = layoutHierarchy3D(16, edges);
  for (const p of positions.values()) {
    expect(Math.hypot(p.x, p.y, p.z)).toBeLessThanOrEqual(HIERARCHY_LAYOUT_RADIUS + 1e-6);
  }
});
