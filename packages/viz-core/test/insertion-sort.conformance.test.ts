// A new file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids a content PR from editing a file that already
// exists under packages/, and §4.1 points new algorithms here instead.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { insertionSort } from '../src/algorithms/insertion-sort.js';
import { runConformance } from './conformance.js';

// Matches the registry's inputSchema for 'insertion-sort'
// (apps/web/src/viz/registry.ts): 1–16 numbers. It was 24 until reversed
// input at that bound was found to need 600 frames against the entry's
// maxFrames of 400 — see apps/web/src/viz/frame-budget.test.ts.
const smallArray = fc.record({
  arr: fc.array(fc.integer({ min: -99, max: 99 }), { minLength: 1, maxLength: 16 }),
});

runConformance({
  name: 'insertionSort',
  algorithm: insertionSort,
  arbitrary: smallArray,
  supportedTargets: ['index', 'range'],
  mutate: (input) => { input.arr[0] = 999; },
});

test('insertionSort ends with a sorted array', () => {
  fc.assert(fc.property(smallArray, ({ arr }) => {
    const last = collect(insertionSort({ arr })).frames.at(-1)!;
    expect(last.state).toEqual([...arr].sort((a, b) => a - b));
  }));
});

test('insertionSort never shifts past an equal value — the basis of stability', () => {
  // Stability is unobservable in the sorted output when the values are bare
  // numbers (equal numbers are indistinguishable), so assert the behaviour it
  // rests on instead: an equal neighbour must stop the walk, emitting no
  // SHIFT frame. With `>=` in the loop condition, every pass here would shift.
  const { frames } = collect(insertionSort({ arr: [2, 2, 2, 2] }));
  expect(frames.filter((f) => f.line === 'SHIFT')).toHaveLength(0);
  expect(frames.at(-1)!.state).toEqual([2, 2, 2, 2]);
});

test('insertionSort does not mutate its input', () => {
  const arr = [5, 2, 9, 1, 7, 3];
  const copy = [...arr];
  collect(insertionSort({ arr }));
  expect(arr).toEqual(copy);
});

test('insertionSort frames differ from one another — proves snapshotting', () => {
  const { frames } = collect(insertionSort({ arr: [3, 1, 2] }));
  const first = JSON.stringify(frames[0]!.state);
  const last = JSON.stringify(frames.at(-1)!.state);
  expect(first).not.toBe(last);
});
