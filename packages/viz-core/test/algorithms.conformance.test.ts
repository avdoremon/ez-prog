// packages/viz-core/test/algorithms.conformance.test.ts
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { binarySearch } from '../src/algorithms/binary-search.js';
import { bubbleSort } from '../src/algorithms/bubble-sort.js';
import { linearSearch } from '../src/algorithms/linear-search.js';
import { runConformance } from './conformance.js';

const sortedArrayAndTarget = fc
  .array(fc.integer({ min: -500, max: 500 }), { minLength: 1, maxLength: 64 })
  .chain((raw) => {
    const arr = [...raw].sort((a, b) => a - b);
    return fc.record({
      arr: fc.constant(arr),
      target: fc.oneof(fc.constantFrom(...arr), fc.integer({ min: -600, max: 600 })),
    });
  });

runConformance({
  name: 'binarySearch',
  algorithm: binarySearch,
  arbitrary: sortedArrayAndTarget,
  supportedTargets: ['index', 'range'],
  mutate: (input) => { input.arr[0] = 999; },
});

// packages/viz-core/test/algorithms.conformance.test.ts
test('binarySearch reports found exactly when the target is present', () => {
  fc.assert(fc.property(sortedArrayAndTarget, ({ arr, target }) => {
    const last = collect(binarySearch({ arr, target })).frames.at(-1)!;
    expect(last.note.includes('Found')).toBe(arr.includes(target));
  }));
});

const smallArray = fc.record({
  arr: fc.array(fc.integer({ min: -99, max: 99 }), { minLength: 1, maxLength: 24 }),
});

runConformance({
  name: 'bubbleSort', algorithm: bubbleSort,
  arbitrary: smallArray, supportedTargets: ['index', 'range'],
  mutate: (input) => { input.arr[0] = 999; },
});

test('bubbleSort ends with a sorted array', () => {
  fc.assert(fc.property(smallArray, ({ arr }) => {
    const last = collect(bubbleSort({ arr })).frames.at(-1)!;
    expect(last.state).toEqual([...arr].sort((a, b) => a - b));
  }));
});

test('bubbleSort frames differ from one another — proves snapshotting', () => {
  const { frames } = collect(bubbleSort({ arr: [3, 1, 2] }));
  const first = JSON.stringify(frames[0]!.state);
  const last = JSON.stringify(frames.at(-1)!.state);
  expect(first).not.toBe(last);
});

test('bubbleSort does not mutate its input', () => {
  const arr = [3, 1, 2];
  collect(bubbleSort({ arr }));
  expect(arr).toEqual([3, 1, 2]);
});

runConformance({
  name: 'linearSearch', algorithm: linearSearch,
  arbitrary: sortedArrayAndTarget, supportedTargets: ['index'],
  mutate: (input) => { input.arr[0] = 999; },
});

test('linearSearch reports the number of checks it made', () => {
  const { frames } = collect(linearSearch({ arr: [5, 6, 7], target: 7 }));
  expect(frames.at(-1)!.vars!.checked).toBe(3);
});

test('linearSearch never uses fewer checks than binarySearch on the same input', () => {
  const arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
  const lin = collect(linearSearch({ arr, target: 91 })).frames.length;
  const bin = collect(binarySearch({ arr, target: 91 })).frames.length;
  expect(lin).toBeGreaterThan(bin);
});
