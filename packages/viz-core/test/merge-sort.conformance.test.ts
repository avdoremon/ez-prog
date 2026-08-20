// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { mergeSort } from '../src/algorithms/merge-sort.js';
import { runConformance } from './conformance.js';

// Matches the registry's inputSchema for 'merge-sort'.
const smallArray = fc.record({
  arr: fc.array(fc.integer({ min: -99, max: 99 }), { minLength: 1, maxLength: 24 }),
});

runConformance({
  name: 'mergeSort',
  algorithm: mergeSort,
  arbitrary: smallArray,
  supportedTargets: ['index', 'range'],
  mutate: (input) => { input.arr[0] = 999; },
});

test('mergeSort ends with a sorted array', () => {
  fc.assert(
    fc.property(smallArray, ({ arr }) => {
      const last = collect(mergeSort({ arr })).frames.at(-1)!;
      expect(last.state).toEqual([...arr].sort((a, b) => a - b));
    }),
  );
});

test('mergeSort is stable — equal values keep their original order', () => {
  // Equal numbers are indistinguishable in the output, so assert the property
  // stability rests on: a tie must be resolved by taking from the LEFT run,
  // which means no COMPARE of equal values is followed by taking the right.
  fc.assert(
    fc.property(
      fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 2, maxLength: 16 }),
      (arr) => {
        const { frames } = collect(mergeSort({ arr }));
        for (let f = 0; f < frames.length - 1; f++) {
          const cmp = frames[f]!;
          if (cmp.line !== 'COMPARE') continue;
          const { left, right } = cmp.vars as { left: number; right: number };
          if (left !== right) continue;
          const wrote = (frames[f + 1]!.vars as { wrote: number }).wrote;
          expect(wrote).toBe(left);
        }
      },
    ),
  );
});

test('a merged range is sorted at the moment it is declared merged', () => {
  fc.assert(
    fc.property(smallArray, ({ arr }) => {
      for (const frame of collect(mergeSort({ arr })).frames) {
        if (frame.line !== 'MERGED') continue;
        const { lo, hi } = frame.vars as { lo: number; hi: number };
        const run = frame.state.slice(lo, hi + 1);
        expect(run).toEqual([...run].sort((a, b) => a - b));
      }
    }),
  );
});

test('the total number of writes is n per level, not n squared', () => {
  const arr = Array.from({ length: 16 }, (_, i) => 16 - i); // worst-ish case
  const { frames } = collect(mergeSort({ arr }));
  const writes = frames.filter((f) => f.line === 'WRITE').length;
  // 16 values over 4 levels = 64 writes; n^2 would be 256.
  expect(writes).toBe(64);
});

test('mergeSort does not mutate its input', () => {
  const arr = [5, 2, 9, 1, 7, 3, 8, 4];
  const copy = [...arr];
  collect(mergeSort({ arr }));
  expect(arr).toEqual(copy);
});
