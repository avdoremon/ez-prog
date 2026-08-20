import { snap } from '../snap.js';
import type { Frame, GraphEdge, GraphState, VizAlgorithm } from '../types.js';

export interface DfsInput {
  values: number[];
  edges: GraphEdge[];
  start: number;
}

/**
 * Depth-first search, written as deliberately the same shape as `bfs` in this
 * directory: identical loop, identical bookkeeping, and one difference —
 * `pop()` instead of `shift()`. The lesson's claim that the container *is* the
 * algorithm should be checkable by diffing the two files.
 */
export const dfs: VizAlgorithm<DfsInput, GraphState> =
function* ({ values, edges, start }): Generator<Frame<GraphState>> {
  const state: GraphState = { values, edges, directed: false };
  const seen = new Set<number>([start]);
  const stack: number[] = [start];
  const order: number[] = [];
  const depth = new Map<number, number>([[start, 0]]);

  const neighbours = (i: number) =>
    edges
      .filter((e) => e.from === i || e.to === i)
      .map((e) => (e.from === i ? e.to : e.from))
      .sort((a, b) => a - b);

  yield {
    state: snap(state), line: 'INIT', vars: { start, stacked: stack.length },
    note: `Starting at ${values[start]}. The stack holds nodes waiting to be explored.`,
  };

  while (stack.length > 0) {
    const node = stack.pop()!;
    order.push(node);
    const d = depth.get(node)!;

    yield {
      state: snap(state), line: 'POP',
      vars: { node: values[node]!, depth: d, stacked: stack.length },
      marks: [
        ...order.slice(0, -1).map((n) => ({
          kind: 'visited' as const, at: { t: 'index' as const, i: n },
        })),
        { kind: 'cursor', at: { t: 'index', i: node } },
      ],
      note: `Take ${values[node]} off the top of the stack — the most recently added, not the oldest.`,
    };

    for (const next of neighbours(node)) {
      if (seen.has(next)) {
        yield {
          state: snap(state), line: 'SKIP',
          vars: { from: values[node]!, to: values[next]!, stacked: stack.length },
          marks: [
            ...order.map((n) => ({
              kind: 'visited' as const, at: { t: 'index' as const, i: n },
            })),
            { kind: 'discard', at: { t: 'edge', from: node, to: next } },
          ],
          note: `${values[next]} has been seen already — ignore this edge, or the search would loop.`,
        };
        continue;
      }

      seen.add(next);
      depth.set(next, d + 1);
      stack.push(next);

      yield {
        state: snap(state), line: 'PUSH',
        vars: { from: values[node]!, to: values[next]!, stacked: stack.length },
        marks: [
          ...order.map((n) => ({
            kind: 'visited' as const, at: { t: 'index' as const, i: n },
          })),
          { kind: 'active', at: { t: 'edge', from: node, to: next } },
          { kind: 'active', at: { t: 'index', i: next } },
        ],
        note: `${values[next]} is new — push it on top, so it will be explored before anything below.`,
      };
    }
  }

  yield {
    state: snap(state), line: 'DONE', vars: { reached: order.length },
    marks: order.map((n) => ({
      kind: 'done' as const, at: { t: 'index' as const, i: n },
    })),
    note: `Stack empty. Reached ${order.length} of ${values.length} nodes, in this order: ${order.map((n) => values[n]).join(', ')}.`,
  };
};
