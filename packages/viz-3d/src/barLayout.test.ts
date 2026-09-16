import { expect, test } from 'vitest';
import {
  BAR_MAX_HEIGHT, BAR_PITCH, EMPTY_BAR_HEIGHT, MIN_BAR_HEIGHT, MIN_CAMERA_DISTANCE,
  cameraDistanceFor, layoutBar3D,
} from './barLayout.js';

test('an empty array produces no bars', () => {
  expect(layoutBar3D([]).size).toBe(0);
});

test('bars are evenly spaced at BAR_PITCH, centered on x = 0', () => {
  const bars = layoutBar3D([5, 5, 5, 5]);
  const xs = [...bars.values()].map((b) => b.x).sort((a, b) => a - b);
  expect(xs).toEqual([-1.5 * BAR_PITCH, -0.5 * BAR_PITCH, 0.5 * BAR_PITCH, 1.5 * BAR_PITCH]);
  for (const b of bars.values()) {
    expect(b.z).toBe(0);
  }
});

test('a single bar sits at x = 0', () => {
  const bars = layoutBar3D([7]);
  expect(bars.get(0)!.x).toBe(0);
});

test('height scales proportionally to the largest absolute value in the run', () => {
  const bars = layoutBar3D([10, 20, 5]);
  expect(bars.get(1)!.height).toBeCloseTo(BAR_MAX_HEIGHT); // 20 is the max
  expect(bars.get(0)!.height).toBeCloseTo(BAR_MAX_HEIGHT / 2); // 10 is half of 20
  expect(bars.get(2)!.height).toBeCloseTo(BAR_MAX_HEIGHT / 4); // 5 is a quarter of 20
});

test('a zero value gets the minimum visible bar height, not zero', () => {
  const bars = layoutBar3D([0, 8]);
  expect(bars.get(0)!.height).toBeCloseTo(MIN_BAR_HEIGHT);
});

test('an all-zero array does not divide by zero', () => {
  const bars = layoutBar3D([0, 0, 0]);
  for (const b of bars.values()) {
    expect(b.height).toBeCloseTo(MIN_BAR_HEIGHT);
    expect(Number.isFinite(b.height)).toBe(true);
  }
});

test('a negative value gets sign -1 and a positive value gets sign 1', () => {
  const bars = layoutBar3D([-4, 4, 0]);
  expect(bars.get(0)!.sign).toBe(-1);
  expect(bars.get(1)!.sign).toBe(1);
  expect(bars.get(2)!.sign).toBe(1); // zero treated as non-negative
});

test("a bar's y center sits half its own height away from the y=0 baseline, in its sign's direction", () => {
  const bars = layoutBar3D([-4, 4]);
  const neg = bars.get(0)!;
  const pos = bars.get(1)!;
  expect(neg.y).toBeCloseTo(-neg.height / 2);
  expect(pos.y).toBeCloseTo(pos.height / 2);
});

test('layout is deterministic', () => {
  const a = layoutBar3D([3, 1, 4, 1, 5]);
  const b = layoutBar3D([3, 1, 4, 1, 5]);
  expect([...a.entries()]).toEqual([...b.entries()]);
});

test('cameraDistanceFor grows monotonically as n grows, for a fixed fov/aspect', () => {
  const d6 = cameraDistanceFor(6, 50, 16 / 9);
  const d16 = cameraDistanceFor(16, 50, 16 / 9);
  const d24 = cameraDistanceFor(24, 50, 16 / 9);
  expect(d16).toBeGreaterThan(d6);
  expect(d24).toBeGreaterThan(d16);
});

test('cameraDistanceFor never drops below MIN_CAMERA_DISTANCE for a tiny array', () => {
  expect(cameraDistanceFor(1, 50, 16 / 9)).toBeGreaterThanOrEqual(MIN_CAMERA_DISTANCE);
});

test('a null value renders as a fixed-height, marked-empty bar', () => {
  const bars = layoutBar3D([5, null, 3]);
  const empty = bars.get(1)!;
  expect(empty.isEmpty).toBe(true);
  expect(empty.height).toBe(EMPTY_BAR_HEIGHT);
  expect(empty.sign).toBe(1);
});

test('a real value is never marked empty', () => {
  const bars = layoutBar3D([0, 5]);
  expect(bars.get(0)!.isEmpty).toBe(false);
  expect(bars.get(1)!.isEmpty).toBe(false);
});

test('height scaling ignores null values when finding the max', () => {
  const bars = layoutBar3D([null, 10, null, 20]);
  expect(bars.get(3)!.height).toBeCloseTo(BAR_MAX_HEIGHT); // 20 is the real max
  expect(bars.get(1)!.height).toBeCloseTo(BAR_MAX_HEIGHT / 2); // 10 is half of 20
});

test('an all-null array does not divide by zero', () => {
  const bars = layoutBar3D([null, null, null]);
  for (const b of bars.values()) {
    expect(b.isEmpty).toBe(true);
    expect(b.height).toBe(EMPTY_BAR_HEIGHT);
    expect(Number.isFinite(b.height)).toBe(true);
  }
});

test("a null slot's x position is unaffected -- it still occupies its own row slot", () => {
  const bars = layoutBar3D([5, null, 3]);
  const xs = [...bars.values()].map((b) => b.x).sort((a, b) => a - b);
  expect(xs).toEqual([-BAR_PITCH, 0, BAR_PITCH]);
});
