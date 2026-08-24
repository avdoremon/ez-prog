import { snap } from '../snap.js';
import type { Frame, GraphEdge, GraphState, Mark, VizAlgorithm } from '../types.js';

export interface LinkedListInput {
  arr: number[];
  readIndex: number;
  insertAt: number;
  value: number;
}

/** Consecutive edges 0->1->2->...->n-1, the shape of a singly linked chain. */
function chainEdges(n: number): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (let i = 0; i < n - 1; i++) edges.push({ from: i, to: i + 1 });
  return edges;
}

/**
 * Deliberately the same input shape as arrayBasics (readIndex, insertAt,
 * value) so the two lessons can be compared directly on identical input. A
 * linked list is graph-shaped — each node has at most one outgoing edge — so
 * this reuses GraphView rather than needing a new renderer.
 *
 * Where arrayBasics reads in one step and pays for insertion with a shift per
 * displaced value, this pays for reading with one hop per node (no index
 * arithmetic — only a reference to chase) and inserts with exactly one
 * rewired pointer, however many nodes come after it.
 */
export const linkedList: VizAlgorithm<LinkedListInput, GraphState> =
function* ({ arr, readIndex, insertAt, value }): Generator<Frame<GraphState>> {
  const values = [...arr];
  const state: GraphState = { values, edges: chainEdges(values.length), directed: true };

  yield {
    state: snap(state), line: 'INIT', vars: { length: values.length },
    note: `A linked list of ${values.length} ${values.length === 1 ? 'node' : 'nodes'}. Each node knows only its neighbour — nothing here is stored side by side.`,
  };

  const target = Math.max(0, Math.min(readIndex, values.length - 1));

  for (let i = 0; i < target; i++) {
    yield {
      state: snap(state), line: 'STEP', vars: { at: i, next: i + 1 },
      marks: [
        { kind: 'visited', at: { t: 'index', i } },
        { kind: 'active', at: { t: 'edge', from: i, to: i + 1 } },
        { kind: 'cursor', at: { t: 'index', i: i + 1 } },
      ],
      note: `Follow the pointer from node ${i} to node ${i + 1}. No arithmetic — just chase the reference.`,
    };
  }

  yield {
    state: snap(state), line: 'FOUND', vars: { readIndex: target, value: values[target]! },
    marks: [{ kind: 'done', at: { t: 'index', i: target } }],
    note: `Reached node ${target}: ${values[target]}. That cost ${target} ${target === 1 ? 'hop' : 'hops'} from the head.`,
  };

  const at = Math.max(0, Math.min(insertAt, values.length));

  for (let i = 0; i < at; i++) {
    const marks: Mark[] = [{ kind: 'visited', at: { t: 'index', i } }];
    if (i + 1 < values.length) {
      marks.push({ kind: 'active', at: { t: 'edge', from: i, to: i + 1 } });
    }
    yield {
      state: snap(state), line: 'LOCATE', vars: { at: i },
      marks,
      note: `Walk to node ${i}, looking for the insertion point.`,
    };
  }

  values.splice(at, 0, value);
  const inserted: GraphState = { values, edges: chainEdges(values.length), directed: true };

  yield {
    state: snap(inserted), line: 'INSERT', vars: { insertAt: at, value },
    marks:
      at > 0
        ? [{ kind: 'swap', at: { t: 'edge', from: at - 1, to: at } }]
        : [{ kind: 'swap', at: { t: 'index', i: 0 } }],
    note:
      at > 0
        ? `Rewire one pointer: node ${at - 1} now points to the new node, which points to whatever followed it before. No other node moves.`
        : `The new node becomes the head. Every other node keeps its place — nothing shifts.`,
  };

  yield {
    state: snap(inserted), line: 'DONE', vars: { hops: target, rewired: 1 },
    marks: values.map((_, i) => ({ kind: 'done' as const, at: { t: 'index' as const, i } })),
    note: `Done: reading cost ${target} ${target === 1 ? 'hop' : 'hops'}, but inserting rewired exactly one pointer — however many nodes came after it.`,
  };
};
