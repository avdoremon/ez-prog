import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { binarySearch } from '../src/algorithms/binary-search.js';

test('binary search produces a frame sequence that finds the target', () => {
  const { frames, truncated } = collect(
    binarySearch({ arr: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 23 }),
  );
  expect(truncated).toBe(false);
  expect(frames.length).toBeGreaterThan(1);
  expect(frames.at(-1)!.note).toContain('Found 23');
});
