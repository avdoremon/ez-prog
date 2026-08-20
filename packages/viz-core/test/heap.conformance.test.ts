// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { heap } from '../src/algorithms/heap.js';
import { runConformance } from './conformance.js';

// Matches the registry's inputSchema for 'heap'.
const heapInput = fc.record({
  values: fc.array(fc.integer({ min: -99, max: 99 }), { minLength: 1, maxLength: 31 }),
  extract: fc.boolean(),
});

runConformance({
  name: 'heap',
  algorithm: heap,
  arbitrary: heapInput,
  supportedTargets: ['index', 'range'],
  mutate: (input) => { input.values[0] = 999; },
});

/** Every parent must be >= both of its children. */
function isMaxHeap(a: number[]): boolean {
  for (let i = 1; i < a.length; i++) {
    if (a[(i - 1) >> 1]! < a[i]!) return false;
  }
  return true;
}

test('the heap property holds on every single frame, not just at the end', () => {
  // The invariant is what a heap *is*; a run that only restores it at the end
  // would still look plausible frame by frame.
  fc.assert(
    fc.property(heapInput, ({ values, extract }) => {
      for (const frame of collect(heap({ values, extract })).frames) {
        // Mid-sift frames are the one place the invariant is legitimately
        // broken: a value is in transit between a parent and a child.
        if (frame.line === 'SIFT_UP' || frame.line === 'SIFT_DOWN') continue;
        if (frame.line === 'INSERT' || frame.line === 'EXTRACT') continue;
        expect(isMaxHeap(frame.state)).toBe(true);
      }
    }),
  );
});

test('the root is the maximum once the build finishes', () => {
  fc.assert(
    fc.property(
      fc.array(fc.integer({ min: -99, max: 99 }), { minLength: 1, maxLength: 31 }),
      (values) => {
        const last = collect(heap({ values, extract: false })).frames.at(-1)!;
        expect(last.state[0]).toBe(Math.max(...values));
        expect(isMaxHeap(last.state)).toBe(true);
      },
    ),
  );
});

test('extracting removes exactly the maximum and keeps the heap valid', () => {
  fc.assert(
    fc.property(
      fc.array(fc.integer({ min: -99, max: 99 }), { minLength: 1, maxLength: 31 }),
      (values) => {
        const last = collect(heap({ values, extract: true })).frames.at(-1)!;
        const expected = [...values].sort((a, b) => b - a).slice(1).sort((a, b) => a - b);
        expect([...last.state].sort((a, b) => a - b)).toEqual(expected);
        expect(isMaxHeap(last.state)).toBe(true);
      },
    ),
  );
});

test('sifting costs at most the tree depth, not the heap size', () => {
  // 31 ascending values is the worst case: each insert rises to the root.
  const values = Array.from({ length: 31 }, (_, i) => i);
  const { frames } = collect(heap({ values, extract: false }));
  const sifts = frames.filter((f) => f.line === 'SIFT_UP').length;
  // Depth of a 31-node heap is 5, so even the worst case stays far below 31^2.
  expect(sifts).toBeLessThanOrEqual(values.length * 5);
});
