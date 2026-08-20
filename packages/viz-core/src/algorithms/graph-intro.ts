import { snap } from '../snap.js';
import type { Frame, GraphEdge, GraphState, VizAlgorithm } from '../types.js';

export interface GraphIntroInput {
  values: number[];
  edges: GraphEdge[];
  directed: boolean;
}

/**
 * Not an algorithm so much as a tour: it walks the nodes one at a time,
 * showing each node's neighbours and degree. The closing frame states the
 * handshake lemma (degrees sum to twice the edge count in an undirected
 * graph), which the learner can verify against the numbers on screen.
 */
export const graphIntro: VizAlgorithm<GraphIntroInput, GraphState> =
function* ({ values, edges, directed }): Generator<Frame<GraphState>> {
  const state: GraphState = { values, edges, directed };

  const incident = (i: number) =>
    edges.filter((e) => (directed ? e.from === i : e.from === i || e.to === i));

  /**
   * Degree counts a self-loop twice, because the edge meets the node at both
   * of its ends. Without this the closing frame's claim that degrees sum to
   * twice the edge count would be false for any graph containing one.
   */
  const degreeOf = (i: number) =>
    directed
      ? edges.filter((e) => e.from === i).length
      : edges.reduce(
          (sum, e) => sum + (e.from === i ? 1 : 0) + (e.to === i ? 1 : 0),
          0,
        );

  yield {
    state: snap(state), line: 'INIT', vars: { nodes: values.length, edges: edges.length },
    note: `A graph: ${values.length} nodes joined by ${edges.length} ${edges.length === 1 ? 'edge' : 'edges'}${directed ? ', each pointing one way' : ''}.`,
  };

  let degreeSum = 0;

  for (let i = 0; i < values.length; i++) {
    const mine = incident(i);
    const degree = degreeOf(i);
    degreeSum += degree;
    const names = mine.map((e) => values[e.from === i ? e.to : e.from]);

    yield {
      state: snap(state), line: 'NODE',
      vars: { node: values[i]!, degree, degreeSum },
      marks: [
        { kind: 'cursor', at: { t: 'index', i } },
        ...mine.map((e) => ({
          kind: 'active' as const,
          at: { t: 'edge' as const, from: e.from, to: e.to },
        })),
      ],
      note: degree === 0
        ? `${values[i]} is isolated — no edges touch it, so its degree is 0.`
        : `${values[i]} has degree ${degree}: ${directed ? 'it points at' : 'its neighbours are'} ${names.join(', ')}.`,
    };
  }

  yield {
    state: snap(state), line: 'DONE',
    vars: { nodes: values.length, edges: edges.length, degreeSum },
    marks: values.map((_, i) => ({
      kind: 'done' as const, at: { t: 'index' as const, i },
    })),
    note: directed
      ? `Every node counted. ${edges.length} directed edges give ${degreeSum} outgoing connections in total.`
      : `Every node counted. The degrees add up to ${degreeSum}, exactly twice the ${edges.length} edges — each edge is counted at both ends.`,
  };
};
