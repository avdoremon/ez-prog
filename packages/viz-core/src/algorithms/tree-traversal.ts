import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

export type TraversalOrder = 'pre' | 'in' | 'post';

export interface TreeTraversalInput {
  /** A complete binary tree, level by level: index i's children are 2i+1, 2i+2. */
  values: number[];
  order: TraversalOrder;
}

/**
 * Depth-first traversal of an array-backed binary tree. The three orders differ
 * only in *when* a node is recorded relative to its subtrees, which is the
 * whole lesson — so the order is an input the learner can change.
 */
export const treeTraversal: VizAlgorithm<TreeTraversalInput, number[]> =
function* ({ values, order }): Generator<Frame<number[]>> {
  const visited: number[] = [];

  yield {
    state: snap(values), line: 'INIT', vars: { size: values.length, order },
    note: `A binary tree of ${values.length} values. Walking it in ${order}-order.`,
  };

  function* walk(i: number): Generator<Frame<number[]>> {
    if (i >= values.length) return;

    const record = function* (): Generator<Frame<number[]>> {
      visited.push(i);
      yield {
        state: snap(values), line: 'VISIT',
        vars: { index: i, value: values[i]!, visited: visited.length },
        marks: [
          ...visited.slice(0, -1).map((v) => ({
            kind: 'visited' as const, at: { t: 'index' as const, i: v },
          })),
          { kind: 'cursor', at: { t: 'index', i } },
        ],
        note: `Record ${values[i]} (index ${i}). That is ${visited.length} of ${values.length}.`,
      };
    };

    if (order === 'pre') yield* record();
    yield* walk(2 * i + 1);
    if (order === 'in') yield* record();
    yield* walk(2 * i + 2);
    if (order === 'post') yield* record();
  }

  yield* walk(0);

  yield {
    state: snap(values), line: 'DONE', vars: { order, visited: visited.length },
    marks: [{ kind: 'done', at: { t: 'range', from: 0, to: values.length - 1 } }],
    note: `${order}-order visits: ${visited.map((i) => values[i]).join(', ')}.`,
  };
};
