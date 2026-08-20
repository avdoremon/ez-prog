// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { bstSearch } from '../src/algorithms/bst-search.js';
import { runConformance } from './conformance.js';

/** Builds a complete, valid BST in level order from sorted values. */
function buildBst(sorted: number[]): number[] {
  const out: number[] = [];
  const fill = (lo: number, hi: number, i: number) => {
    if (lo > hi) return;
    const mid = (lo + hi) >> 1;
    out[i] = sorted[mid]!;
    fill(lo, mid - 1, 2 * i + 1);
    fill(mid + 1, hi, 2 * i + 2);
  };
  fill(0, sorted.length - 1, 0);
  // A complete tree has no holes for these sizes; guard the assumption.
  return out.every((v) => v !== undefined) ? out : [];
}

const bstInput = fc
  .uniqueArray(fc.integer({ min: -99, max: 99 }), { minLength: 1, maxLength: 15 })
  .chain((raw) => {
    const tree = buildBst([...raw].sort((a, b) => a - b));
    return fc.record({
      values: fc.constant(tree.length ? tree : [raw[0]!]),
      target: fc.oneof(fc.constantFrom(...raw), fc.integer({ min: -200, max: 200 })),
    });
  });

runConformance({
  name: 'bstSearch',
  algorithm: bstSearch,
  arbitrary: bstInput,
  supportedTargets: ['index', 'range'],
  mutate: (input) => { input.values[0] = 999; },
});

test('reports found exactly when the value is in the tree', () => {
  fc.assert(
    fc.property(bstInput, ({ values, target }) => {
      const last = collect(bstSearch({ values, target })).frames.at(-1)!;
      expect(last.line === 'FOUND').toBe(values.includes(target));
    }),
  );
});

test('never makes more comparisons than the tree is deep', () => {
  // The lesson's claim: cost is the height, not the node count.
  fc.assert(
    fc.property(bstInput, ({ values, target }) => {
      const last = collect(bstSearch({ values, target })).frames.at(-1)!;
      const { checked } = last.vars as { checked: number };
      const height = Math.floor(Math.log2(values.length)) + 1;
      expect(checked).toBeLessThanOrEqual(height);
    }),
  );
});

test('each step discards a whole subtree, never a single node', () => {
  const { frames } = collect(bstSearch({ values: [8, 3, 10, 1, 6, 9, 14], target: 6 }));
  const afterFirstTurn = frames.find((f) => f.line === 'GO_LEFT')!;
  const discarded = afterFirstTurn.marks!.filter((m) => m.kind === 'discard');
  // Going left from the root discards 10 and both of its children.
  expect(discarded).toHaveLength(3);
});

test('the default search finds 6 in three comparisons', () => {
  const last = collect(bstSearch({ values: [8, 3, 10, 1, 6, 9, 14], target: 6 })).frames.at(-1)!;
  expect(last.line).toBe('FOUND');
  expect((last.vars as { checked: number }).checked).toBe(3);
});

test('a value absent from the tree runs off the bottom rather than looping', () => {
  const { frames } = collect(bstSearch({ values: [8, 3, 10, 1, 6, 9, 14], target: 7 }));
  expect(frames.at(-1)!.line).toBe('MISSING');
});
