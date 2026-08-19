// packages/viz-core/test/algorithms.conformance.test.ts
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { binarySearch } from '../src/algorithms/binary-search.js';
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
