// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { quickSort } from '../src/algorithms/quick-sort.js';
import { runConformance } from './conformance.js';

// Matches the registry's inputSchema for 'quick-sort'.
const smallArray = fc.record({
  arr: fc.array(fc.integer({ min: -99, max: 99 }), { minLength: 1, maxLength: 24 }),
});

runConformance({
  name: 'quickSort',
  algorithm: quickSort,
  arbitrary: smallArray,
  supportedTargets: ['index', 'range'],
  mutate: (input) => { input.arr[0] = 999; },
});

test('quickSort ends with a sorted array', () => {
  fc.assert(
    fc.property(smallArray, ({ arr }) => {
      const last = collect(quickSort({ arr })).frames.at(-1)!;
      expect(last.state).toEqual([...arr].sort((a, b) => a - b));
    }),
  );
});

test('a placed pivot is already in its final position', () => {
  // The lesson's central claim: PLACE is permanent, unlike a merge sort
  // write, which can still move within a later merge.
  fc.assert(
    fc.property(smallArray, ({ arr }) => {
      const { frames } = collect(quickSort({ arr }));
      const finalState = frames.at(-1)!.state;
      for (const frame of frames) {
        if (frame.line !== 'PLACE') continue;
        const { at, pivot } = frame.vars as { at: number; pivot: number };
        expect(frame.state[at]).toBe(pivot);
        expect(finalState[at]).toBe(pivot);
      }
    }),
  );
});

test('after a partition, its window really is split around the pivot', () => {
  // The invariant holds only within the range that call owns, which is why
  // the PLACE frame carries lo/hi: asserting over the whole array would be
  // wrong, and asserting over nothing would be vacuous.
  fc.assert(
    fc.property(smallArray, ({ arr }) => {
      for (const frame of collect(quickSort({ arr })).frames) {
        if (frame.line !== 'PLACE') continue;
        const { at, pivot, lo, hi } = frame.vars as {
          at: number; pivot: number; lo: number; hi: number;
        };
        for (let i = lo; i < at; i++) expect(frame.state[i]!).toBeLessThan(pivot);
        for (let i = at + 1; i <= hi; i++) {
          expect(frame.state[i]!).toBeGreaterThanOrEqual(pivot);
        }
      }
    }),
  );
});

test('already-sorted input is the quadratic worst case for this pivot choice', () => {
  // The whole reason the lesson tells the reader to try sorted input.
  const sorted = Array.from({ length: 12 }, (_, i) => i);
  const shuffled = [7, 2, 11, 4, 0, 9, 5, 1, 10, 3, 8, 6];
  const comparisons = (a: number[]) =>
    collect(quickSort({ arr: a })).frames.filter((f) => f.line === 'COMPARE').length;

  // n(n-1)/2 = 66 for n = 12: every partition peels off exactly one value.
  expect(comparisons(sorted)).toBe(66);
  expect(comparisons(shuffled)).toBeLessThan(comparisons(sorted));
});

test('quickSort does not mutate its input', () => {
  const arr = [5, 2, 9, 1, 7, 3, 8, 4];
  const copy = [...arr];
  collect(quickSort({ arr }));
  expect(arr).toEqual(copy);
});
