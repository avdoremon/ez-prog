// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { treeTraversal, type TraversalOrder } from '../src/algorithms/tree-traversal.js';
import { runConformance } from './conformance.js';

// Matches the registry's inputSchema for 'tree-traversal'.
const treeInput = fc.record({
  values: fc.array(fc.integer({ min: -99, max: 99 }), { minLength: 1, maxLength: 31 }),
  order: fc.constantFrom<TraversalOrder>('pre', 'in', 'post'),
});

runConformance({
  name: 'treeTraversal',
  algorithm: treeTraversal,
  arbitrary: treeInput,
  supportedTargets: ['index', 'range'],
  mutate: (input) => { input.values[0] = 999; },
});

/** Independent reference walk over the same array-as-tree mapping. */
function reference(values: number[], order: TraversalOrder, i = 0, out: number[] = []) {
  if (i >= values.length) return out;
  if (order === 'pre') out.push(values[i]!);
  reference(values, order, 2 * i + 1, out);
  if (order === 'in') out.push(values[i]!);
  reference(values, order, 2 * i + 2, out);
  if (order === 'post') out.push(values[i]!);
  return out;
}

test('every node is recorded exactly once, in the order the traversal defines', () => {
  fc.assert(
    fc.property(treeInput, ({ values, order }) => {
      const visits = collect(treeTraversal({ values, order })).frames
        .filter((f) => f.line === 'VISIT')
        .map((f) => (f.vars as { value: number }).value);
      expect(visits).toEqual(reference(values, order));
    }),
  );
});

test('in-order on a BST-shaped tree comes out sorted', () => {
  // The hook for the Binary Search Trees lesson, and the default input.
  const visits = collect(
    treeTraversal({ values: [8, 3, 10, 1, 6, 9, 14], order: 'in' }),
  ).frames.filter((f) => f.line === 'VISIT').map((f) => (f.vars as { value: number }).value);
  expect(visits).toEqual([1, 3, 6, 8, 9, 10, 14]);
});

test('the three orders differ only in when the parent is recorded', () => {
  const values = [8, 3, 10, 1, 6, 9, 14];
  const of = (order: TraversalOrder) =>
    collect(treeTraversal({ values, order })).frames
      .filter((f) => f.line === 'VISIT')
      .map((f) => (f.vars as { value: number }).value);

  expect(of('pre')).toEqual([8, 3, 1, 6, 10, 9, 14]);   // root first
  expect(of('in')).toEqual([1, 3, 6, 8, 9, 10, 14]);    // root in the middle
  expect(of('post')).toEqual([1, 6, 3, 9, 14, 10, 8]);  // root last
});

test('a single-node tree is visited once', () => {
  const { frames } = collect(treeTraversal({ values: [7], order: 'pre' }));
  expect(frames.filter((f) => f.line === 'VISIT')).toHaveLength(1);
});
