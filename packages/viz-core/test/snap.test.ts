import { afterEach, expect, test } from 'vitest';
import { setFreezeSnapshots, snap } from '../src/snap.js';
import { collect } from '../src/collect.js';
import { binarySearch } from '../src/algorithms/binary-search.js';

afterEach(() => setFreezeSnapshots(true));

test('snap returns a structurally equal but distinct object', () => {
  const original = [1, 2, 3];
  const copy = snap(original);
  expect(copy).toEqual(original);
  expect(copy).not.toBe(original);
});

test('mutating the original does not affect the snapshot', () => {
  const original = [1, 2, 3];
  const copy = snap(original);
  original[0] = 99;
  expect(copy[0]).toBe(1);
});

test('snapshots are frozen when freezing is enabled', () => {
  const copy = snap([1, 2, 3]);
  expect(Object.isFrozen(copy)).toBe(true);
});

test('nested structures are deeply frozen', () => {
  const copy = snap({ rows: [[1, 2]] });
  expect(Object.isFrozen(copy.rows[0])).toBe(true);
});

test('setFreezeSnapshots(false) skips freezing but still copies', () => {
  setFreezeSnapshots(false);
  const original = [1, 2, 3];
  const copy = snap(original);
  expect(Object.isFrozen(copy)).toBe(false);
  expect(copy).not.toBe(original);
});

test('mutating the input after collect changes no frame', () => {
  const arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
  const { frames } = collect(binarySearch({ arr, target: 23 }));
  const before = frames.map((f) => [...f.state]);
  arr[0] = 999;
  expect(frames.map((f) => [...f.state])).toEqual(before);
});
