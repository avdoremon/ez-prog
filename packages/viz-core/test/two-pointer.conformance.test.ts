// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { twoPointer } from '../src/algorithms/two-pointer.js';
import { runConformance } from './conformance.js';

// Matches the registry's inputSchema for 'two-pointer': 2–64 sorted numbers.
const sortedArrayAndTarget = fc
  .array(fc.integer({ min: -200, max: 200 }), { minLength: 2, maxLength: 64 })
  .chain((raw) => {
    const arr = [...raw].sort((a, b) => a - b);
    return fc.record({
      arr: fc.constant(arr),
      target: fc.oneof(
        // A target that really is the sum of some pair, plus arbitrary ones.
        fc.constant(arr[0]! + arr[arr.length - 1]!),
        fc.integer({ min: -400, max: 400 }),
      ),
    });
  });

runConformance({
  name: 'twoPointer',
  algorithm: twoPointer,
  arbitrary: sortedArrayAndTarget,
  supportedTargets: ['index', 'range'],
  mutate: (input) => { input.arr[0] = 999; },
});

function hasPair(arr: number[], target: number): boolean {
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i]! + arr[j]! === target) return true;
    }
  }
  return false;
}

test('twoPointer reports a pair exactly when one exists', () => {
  fc.assert(
    fc.property(sortedArrayAndTarget, ({ arr, target }) => {
      const last = collect(twoPointer({ arr, target })).frames.at(-1)!;
      expect(last.line === 'FOUND').toBe(hasPair(arr, target));
    }),
  );
});

test('the reported indexes really sum to the target', () => {
  fc.assert(
    fc.property(sortedArrayAndTarget, ({ arr, target }) => {
      const last = collect(twoPointer({ arr, target })).frames.at(-1)!;
      if (last.line !== 'FOUND') return;
      const { lo, hi } = last.vars as { lo: number; hi: number };
      expect(lo).toBeLessThan(hi);
      expect(arr[lo]! + arr[hi]!).toBe(target);
    }),
  );
});

test('the pointers only ever move inward', () => {
  const { frames } = collect(twoPointer({ arr: [1, 3, 4, 6, 8, 11, 15], target: 14 }));
  let prevLo = -1;
  let prevHi = Number.POSITIVE_INFINITY;
  for (const f of frames) {
    const { lo, hi } = (f.vars ?? {}) as { lo?: number; hi?: number };
    if (lo === undefined || hi === undefined) continue;
    expect(lo).toBeGreaterThanOrEqual(prevLo);
    expect(hi).toBeLessThanOrEqual(prevHi);
    prevLo = lo;
    prevHi = hi;
  }
});

test('twoPointer does not mutate its input', () => {
  const arr = [1, 3, 4, 6, 8, 11, 15];
  const copy = [...arr];
  collect(twoPointer({ arr, target: 14 }));
  expect(arr).toEqual(copy);
});
