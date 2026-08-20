// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { slidingWindow } from '../src/algorithms/sliding-window.js';
import { runConformance } from './conformance.js';

// Matches the registry's inputSchema for 'sliding-window', including its
// cross-field rule that k never exceeds the array length.
const arrayAndWindow = fc
  .array(fc.integer({ min: -50, max: 50 }), { minLength: 1, maxLength: 40 })
  .chain((arr) =>
    fc.record({
      arr: fc.constant(arr),
      k: fc.integer({ min: 1, max: arr.length }),
    }),
  );

runConformance({
  name: 'slidingWindow',
  algorithm: slidingWindow,
  arbitrary: arrayAndWindow,
  supportedTargets: ['index', 'range'],
  mutate: (input) => { input.arr[0] = 999; },
});

function bestWindowByBruteForce(arr: number[], k: number) {
  let best = -Infinity;
  let bestStart = 0;
  for (let s = 0; s + k <= arr.length; s++) {
    let sum = 0;
    for (let i = s; i < s + k; i++) sum += arr[i]!;
    if (sum > best) { best = sum; bestStart = s; }
  }
  return { best, bestStart };
}

test('slidingWindow reports the same window a brute-force scan finds', () => {
  fc.assert(
    fc.property(arrayAndWindow, ({ arr, k }) => {
      const last = collect(slidingWindow({ arr, k })).frames.at(-1)!;
      const { best, bestStart } = last.vars as { best: number; bestStart: number };
      expect({ best, bestStart }).toEqual(bestWindowByBruteForce(arr, k));
    }),
  );
});

test('a window that does not fit still yields one explanatory frame', () => {
  const { frames } = collect(slidingWindow({ arr: [1, 2], k: 5 }));
  expect(frames).toHaveLength(1);
  expect(frames[0]!.note).toMatch(/does not fit/i);
});

test('the whole run costs a constant number of frames per slide', () => {
  // The point of the lesson: sliding is O(1) per step, not O(k). Frame count
  // must therefore not grow with k for a fixed array.
  const arr = Array.from({ length: 20 }, (_, i) => i);
  const forK3 = collect(slidingWindow({ arr, k: 3 })).frames.length;
  const forK9 = collect(slidingWindow({ arr, k: 9 })).frames.length;
  // Larger k means fewer slides and more initial adds, never a k-fold blowup.
  expect(Math.abs(forK3 - forK9)).toBeLessThanOrEqual(arr.length);
});

test('slidingWindow does not mutate its input', () => {
  const arr = [3, -1, 4, 8, 2, -5, 7, 1];
  const copy = [...arr];
  collect(slidingWindow({ arr, k: 3 }));
  expect(arr).toEqual(copy);
});
