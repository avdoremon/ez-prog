import { snap } from '../snap.js';
import type { Frame, GraphEdge, GraphState, Mark, VizAlgorithm } from '../types.js';

export interface DijkstraInput {
  values: number[];
  edges: GraphEdge[];
  start: number;
}

const INF = Number.POSITIVE_INFINITY;

/**
 * Dijkstra's shortest-path algorithm over an undirected, non-negatively
 * weighted graph. Where BFS settles nodes in the order it meets them — correct
 * only because every edge costs the same — this settles them in order of
 * cheapest known distance, which is what makes weights work.
 *
 * The selection is a linear scan rather than a priority queue. That is the
 * O(V^2) formulation, and it is deliberate: the scan is the step the lesson
 * has to make visible, and a heap would hide it behind an extract-min the
 * learner cannot watch. The asymptotics are discussed in the lesson prose.
 *
 * Non-negative weights are a precondition, not a preference — see the closing
 * frame's reasoning. The registry's inputSchema is what enforces it.
 */
export const dijkstra: VizAlgorithm<DijkstraInput, GraphState> =
function* ({ values, edges, start }): Generator<Frame<GraphState>> {
  const state: GraphState = { values, edges, directed: false };
  const dist = values.map(() => INF);
  const settled = new Set<number>();
  dist[start] = 0;

  const show = (d: number) => (d === INF ? '∞' : String(d));
  /** The whole distance array, which is the real state Dijkstra carries. */
  const table = () => dist.map(show).join(' ');

  const neighbours = (i: number) =>
    edges
      .filter((e) => e.from === i || e.to === i)
      .map((e) => ({ to: e.from === i ? e.to : e.from, weight: e.weight ?? 1 }))
      .sort((a, b) => a.to - b.to);

  /** Settled nodes, plus a cursor on wherever the scan currently stands. */
  const marksAt = (node: number): Mark[] => [
    ...[...settled]
      .filter((s) => s !== node)
      .map((s): Mark => ({ kind: 'visited', at: { t: 'index', i: s } })),
    { kind: 'cursor', at: { t: 'index', i: node } },
  ];

  // No marks on the first frame: the shared conformance suite requires it, and
  // frame 0 is by convention the untouched input.
  yield {
    state: snap(state), line: 'INIT',
    vars: { start: values[start]!, dist: table(), settled: 0 },
    note: `Every distance starts at ∞ except ${values[start]} itself, which costs 0 to reach. Nothing is settled yet.`,
  };

  for (;;) {
    // Cheapest unsettled node. Nodes still at ∞ are unreachable and never win
    // this scan, so an unreachable component ends the loop rather than
    // producing a frame claiming an infinite distance is final.
    let node = -1;
    for (let i = 0; i < values.length; i++) {
      if (!settled.has(i) && dist[i]! < (node === -1 ? INF : dist[node]!)) node = i;
    }
    if (node === -1) break;

    settled.add(node);

    yield {
      state: snap(state), line: 'PICK',
      vars: { node: values[node]!, cost: dist[node]!, dist: table(), settled: settled.size },
      marks: marksAt(node),
      note: `The cheapest unsettled node is ${values[node]}, at ${dist[node]}. No route still unexplored can beat that, so its cost is now final.`,
    };

    for (const { to, weight } of neighbours(node)) {
      if (settled.has(to)) {
        yield {
          state: snap(state), line: 'SKIP',
          vars: { from: values[node]!, to: values[to]!, dist: table(), settled: settled.size },
          marks: [
            ...marksAt(node),
            { kind: 'discard', at: { t: 'edge', from: node, to } },
          ],
          note: `${values[to]} is already settled — its distance cannot improve, so this edge is ignored.`,
        };
        continue;
      }

      const via = dist[node]! + weight;
      const known = dist[to]!;

      if (via >= known) {
        yield {
          state: snap(state), line: 'SKIP',
          vars: { from: values[node]!, to: values[to]!, via, dist: table(), settled: settled.size },
          marks: [
            ...marksAt(node),
            { kind: 'discard', at: { t: 'edge', from: node, to } },
          ],
          note: `Through ${values[node]}, ${values[to]} would cost ${via} — no better than the ${show(known)} already recorded, so leave it alone.`,
        };
        continue;
      }

      dist[to] = via;

      yield {
        state: snap(state), line: 'IMPROVE',
        vars: { from: values[node]!, to: values[to]!, via, dist: table(), settled: settled.size },
        marks: [
          ...marksAt(node),
          { kind: 'active', at: { t: 'edge', from: node, to } },
          { kind: 'active', at: { t: 'index', i: to } },
        ],
        note: `Going via ${values[node]} reaches ${values[to]} for ${via}, beating ${show(known)} — record the cheaper route.`,
      };
    }
  }

  const reached = [...settled];

  yield {
    state: snap(state), line: 'DONE',
    vars: { reached: reached.length, dist: table(), settled: settled.size },
    marks: reached.map((s): Mark => ({ kind: 'done', at: { t: 'index', i: s } })),
    note: `No unsettled node is reachable. Cheapest cost from ${values[start]} to each of the ${reached.length} nodes it can reach: ${reached.map((s) => `${values[s]}=${dist[s]}`).join(', ')}.`,
  };
};
