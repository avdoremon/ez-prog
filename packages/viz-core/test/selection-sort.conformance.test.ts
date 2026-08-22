// A new file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids a content PR from editing a file that already
// exists under packages/, and §4.1 points new algorithms here instead.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { selectionSort } from '../src/algorithms/selection-sort.js';
import { runConformance } from './conformance.js';

// Matches the registry's inputSchema for 'selection-sort'
// (apps/web/src/viz/registry.ts): 1–16 numbers. The bound is 16 rather than
// the 24 the sibling sorts allow because this generator emits a frame per
// comparison and another per new minimum — see the note on the registry entry.
const MAX_LEN = 16;
const smallArray = fc.record({
  arr: fc.array(fc.integer({ min: -99, max: 99 }), { minLength: 1, maxLength: MAX_LEN }),
});

runConformance({
  name: 'selectionSort',
  algorithm: selectionSort,
  arbitrary: smallArray,
  supportedTargets: ['index', 'range'],
  mutate: (input) => { input.arr[0] = 999; },
});

/** The `swaps` counter as the final frame reports it. */
const swapsFor = (arr: number[]) =>
  (collect(selectionSort({ arr })).frames.at(-1)!.vars as { swaps: number }).swaps;

test('selectionSort ends with a sorted array', () => {
  fc.assert(fc.property(smallArray, ({ arr }) => {
    const last = collect(selectionSort({ arr })).frames.at(-1)!;
    expect(last.state).toEqual([...arr].sort((a, b) => a - b));
  }));
});

test('selectionSort never makes more than n-1 swaps — its whole reason to exist', () => {
  // The lesson claims the swap count is bounded by n-1 on *every* input, which
  // is what makes selection sort worth choosing when moving data is expensive.
  // Asserting it over generated input is the only honest way to back a claim
  // phrased as "whatever the input looks like".
  fc.assert(fc.property(smallArray, ({ arr }) => {
    expect(swapsFor(arr)).toBeLessThanOrEqual(Math.max(0, arr.length - 1));
  }));
});

test('selectionSort does the same number of comparisons regardless of input', () => {
  // Best case equals worst case: there is no early exit and no input-dependent
  // shortcut, which is exactly what distinguishes it from bubble sort (whose
  // swapped flag can stop early) and insertion sort (fast on sorted input).
  // The lesson leans on this, so pin it rather than asserting it in prose.
  const scans = (arr: number[]) =>
    collect(selectionSort({ arr })).frames.filter((f) => f.line === 'SCAN').length;

  const n = 8;
  const sorted = Array.from({ length: n }, (_, i) => i);
  const reversed = [...sorted].reverse();
  const shuffled = [3, 7, 1, 0, 6, 2, 5, 4];
  const expected = (n * (n - 1)) / 2;

  expect(scans(sorted)).toBe(expected);
  expect(scans(reversed)).toBe(expected);
  expect(scans(shuffled)).toBe(expected);
});

test('selectionSort swaps nothing for input already sorted', () => {
  // Every pass finds the smallest value already in its slot, so the guarded
  // swap never fires. This is the branch the lesson calls out, and the
  // registry's defaultInput exercises it on passes 1, 3 and 4.
  expect(swapsFor([1, 2, 3, 4, 5])).toBe(0);
  expect(swapsFor([5, 4, 3, 2, 1])).toBeGreaterThan(0);
});

test('selectionSort is NOT stable, unlike insertion sort', () => {
  // [2, 2, 1] is the minimal counterexample: selecting 1 swaps it with the
  // FIRST 2, throwing that 2 behind the second one. Equal numbers are
  // indistinguishable in the output, so observe the swap itself instead --
  // the first pass moves index 0 to index 2, which is what reorders them.
  const { frames } = collect(selectionSort({ arr: [2, 2, 1] }));
  const firstSwap = frames.find((f) => f.line === 'SWAP')!;
  expect(firstSwap.state).toEqual([1, 2, 2]);
  expect((firstSwap.vars as { swaps: number }).swaps).toBe(1);
  // The lesson's contrast with insertion sort rests on this, so state it:
  // one swap reorders two equal values, which a stable sort never does.
  expect(swapsFor([2, 2, 1])).toBe(1);
});

test('every input the editor accepts finishes inside the frame budget', () => {
  // Not covered by lint rule frame-budget, which only ever runs defaultInput.
  // A learner who types the worst case must still reach the DONE frame, since
  // that is where the final swap count — the whole point of the lesson — is
  // reported. At the previous bound of 24 this failed: reversed input needed
  // 468 frames against a cap of 400 and the run was cut off mid-sort.
  const MAX_FRAMES_FOR_ENTRY = 400;
  const worstCases = [
    Array.from({ length: MAX_LEN }, (_, i) => MAX_LEN - i),  // reversed
    Array.from({ length: MAX_LEN }, (_, i) => i),            // already sorted
  ];
  for (const arr of worstCases) {
    expect(collect(selectionSort({ arr }), MAX_FRAMES_FOR_ENTRY).truncated).toBe(false);
  }
  fc.assert(fc.property(smallArray, ({ arr }) => {
    expect(collect(selectionSort({ arr }), MAX_FRAMES_FOR_ENTRY).truncated).toBe(false);
  }));
});

test('selectionSort does not mutate its input', () => {
  const arr = [5, 2, 9, 1, 7, 3];
  const copy = [...arr];
  collect(selectionSort({ arr }));
  expect(arr).toEqual(copy);
});

test('selectionSort frames differ from one another — proves snapshotting', () => {
  const { frames } = collect(selectionSort({ arr: [3, 1, 2] }));
  expect(JSON.stringify(frames[0]!.state)).not.toBe(
    JSON.stringify(frames.at(-1)!.state),
  );
});
