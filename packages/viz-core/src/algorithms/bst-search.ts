import { snap } from '../snap.js';
import type { Frame, Mark, VizAlgorithm } from '../types.js';

export interface BstSearchInput {
  /** A binary search tree in level order: index i's children are 2i+1, 2i+2. */
  values: number[];
  target: number;
}

/**
 * Searching a binary search tree. Each comparison discards one whole subtree,
 * exactly as binary search discards half an array — the difference is that a
 * tree can be re-shaped by insertions, so "half" is only true while it stays
 * balanced.
 *
 * A subtree is NOT a contiguous range in level order (children scatter as
 * 2i+1, 2i+2), so the discarded side is marked index by index rather than with
 * a single range target.
 */
function subtreeIndexes(root: number, size: number): number[] {
  if (root >= size) return [];
  return [root, ...subtreeIndexes(2 * root + 1, size), ...subtreeIndexes(2 * root + 2, size)];
}

export const bstSearch: VizAlgorithm<BstSearchInput, number[]> =
function* ({ values, target }): Generator<Frame<number[]>> {
  yield {
    state: snap(values), line: 'INIT', vars: { target, checked: 0 },
    note: `Looking for ${target}. Every comparison will throw away a whole subtree.`,
  };

  let i = 0;
  let checked = 0;
  const discarded: Mark[] = [];

  while (i < values.length) {
    const node = values[i]!;
    checked++;

    yield {
      state: snap(values), line: 'COMPARE', vars: { node, target, checked },
      marks: [...discarded, { kind: 'cursor', at: { t: 'index', i } }],
      note: `Compare ${target} with ${node}.`,
    };

    if (target === node) {
      yield {
        state: snap(values), line: 'FOUND', vars: { node, checked, index: i },
        marks: [...discarded, { kind: 'done', at: { t: 'index', i } }],
        note: `Found ${target} at index ${i}, after ${checked} ${checked === 1 ? 'comparison' : 'comparisons'}.`,
      };
      return;
    }

    const goLeft = target < node;
    const prunedRoot = goLeft ? 2 * i + 2 : 2 * i + 1;
    const next = goLeft ? 2 * i + 1 : 2 * i + 2;

    for (const p of subtreeIndexes(prunedRoot, values.length)) {
      discarded.push({ kind: 'discard', at: { t: 'index', i: p } });
    }

    yield {
      state: snap(values), line: goLeft ? 'GO_LEFT' : 'GO_RIGHT',
      vars: { node, target, checked },
      marks: [
        ...discarded,
        ...(next < values.length
          ? [{ kind: 'cursor' as const, at: { t: 'index' as const, i: next } }]
          : []),
      ],
      note: goLeft
        ? `${target} is smaller than ${node}, so it cannot be in the right subtree. Go left.`
        : `${target} is bigger than ${node}, so it cannot be in the left subtree. Go right.`,
    };

    i = next;
  }

  yield {
    state: snap(values), line: 'MISSING', vars: { target, checked },
    marks: discarded,
    note: `Ran off the bottom of the tree after ${checked} ${checked === 1 ? 'comparison' : 'comparisons'} — ${target} is not here.`,
  };
};
