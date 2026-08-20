import { snap } from '../snap.js';
import type { Frame, GraphEdge, GraphState, VizAlgorithm } from '../types.js';

export interface BfsInput {
  values: number[];
  edges: GraphEdge[];
  start: number;
}

/**
 * Breadth-first search over an undirected graph. The queue is the whole idea:
 * because it serves oldest-first, every node one step away is dequeued before
 * any node two steps away, which is what makes BFS find shortest paths in an
 * unweighted graph.
 */
export const bfs: VizAlgorithm<BfsInput, GraphState> =
function* ({ values, edges, start }): Generator<Frame<GraphState>> {
  const state: GraphState = { values, edges, directed: false };
  const seen = new Set<number>([start]);
  const queue: number[] = [start];
  const order: number[] = [];
  const distance = new Map<number, number>([[start, 0]]);

  const neighbours = (i: number) =>
    edges
      .filter((e) => e.from === i || e.to === i)
      .map((e) => (e.from === i ? e.to : e.from))
      .sort((a, b) => a - b);

  // No marks on the first frame: the shared conformance suite requires it, and
  // the convention is that frame 0 shows the untouched input. The start node
  // gets its cursor on the DEQUEUE frame immediately after.
  yield {
    state: snap(state), line: 'INIT', vars: { start, queued: queue.length },
    note: `Starting at ${values[start]}. The queue holds nodes waiting to be explored.`,
  };

  while (queue.length > 0) {
    const node = queue.shift()!;
    order.push(node);
    const depth = distance.get(node)!;

    yield {
      state: snap(state), line: 'DEQUEUE',
      vars: { node: values[node]!, depth, queued: queue.length },
      marks: [
        ...order.slice(0, -1).map((n) => ({
          kind: 'visited' as const, at: { t: 'index' as const, i: n },
        })),
        { kind: 'cursor', at: { t: 'index', i: node } },
      ],
      note: `Take ${values[node]} from the front of the queue — ${depth} ${depth === 1 ? 'step' : 'steps'} from the start.`,
    };

    for (const next of neighbours(node)) {
      if (seen.has(next)) {
        yield {
          state: snap(state), line: 'SKIP',
          vars: { from: values[node]!, to: values[next]!, queued: queue.length },
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
      distance.set(next, depth + 1);
      queue.push(next);

      yield {
        state: snap(state), line: 'ENQUEUE',
        vars: { from: values[node]!, to: values[next]!, depth: depth + 1, queued: queue.length },
        marks: [
          ...order.map((n) => ({
            kind: 'visited' as const, at: { t: 'index' as const, i: n },
          })),
          { kind: 'active', at: { t: 'edge', from: node, to: next } },
          { kind: 'active', at: { t: 'index', i: next } },
        ],
        note: `${values[next]} is new — put it at the back of the queue, ${depth + 1} ${depth + 1 === 1 ? 'step' : 'steps'} out.`,
      };
    }
  }

  yield {
    state: snap(state), line: 'DONE', vars: { reached: order.length },
    marks: order.map((n) => ({
      kind: 'done' as const, at: { t: 'index' as const, i: n },
    })),
    note: `Queue empty. Reached ${order.length} of ${values.length} nodes, nearest first: ${order.map((n) => values[n]).join(', ')}.`,
  };
};
