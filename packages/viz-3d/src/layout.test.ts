import { expect, test } from 'vitest';
import { layoutTree3D } from './layout.js';

test('root sits at the origin', () => {
  const positions = layoutTree3D([8, 3, 10]);
  expect(positions.get(0)).toEqual({ x: 0, y: 0, z: 0 });
});

test('same-depth siblings sit at the same radius from the vertical axis', () => {
  const positions = layoutTree3D([8, 3, 10, 1, 6, 9, 14]);
  const p1 = positions.get(1)!;
  const p2 = positions.get(2)!;
  expect(Math.hypot(p1.x, p1.z)).toBeCloseTo(Math.hypot(p2.x, p2.z));
});

test('deeper nodes sit lower (more negative y) than their parent', () => {
  const positions = layoutTree3D([8, 3, 10, 1, 6, 9, 14]);
  expect(positions.get(1)!.y).toBeLessThan(positions.get(0)!.y);
  expect(positions.get(3)!.y).toBeLessThan(positions.get(1)!.y);
});

test('layout is deterministic', () => {
  const state = [8, 3, 10, 1, 6, 9, 14];
  expect([...layoutTree3D(state).entries()]).toEqual([...layoutTree3D(state).entries()]);
});

test('an empty tree produces no positions', () => {
  expect(layoutTree3D([]).size).toBe(0);
});

test('a single node sits at the origin', () => {
  const positions = layoutTree3D([42]);
  expect(positions.size).toBe(1);
  expect(positions.get(0)).toEqual({ x: 0, y: 0, z: 0 });
});
