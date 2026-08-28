import type { GraphEdge, Mark, MarkKind } from '@cs/viz-core';

export interface Neighbor {
  to: number;
  value: number | string;
  weight?: number;
}

/**
 * Neighbours of node `i`, following direction only when the graph is
 * directed -- mirrors GraphView's own (2D) `neighbours()` helper.
 */
export function neighborsOf(
  i: number,
  values: (number | string)[],
  edges: GraphEdge[],
  directed: boolean,
): Neighbor[] {
  const out: Neighbor[] = [];
  for (const e of edges) {
    if (e.from === i) out.push({ to: e.to, value: values[e.to]!, weight: e.weight });
    else if (!directed && e.to === i) {
      out.push({ to: e.from, value: values[e.from]!, weight: e.weight });
    }
  }
  return out;
}

/**
 * The neighbour clause of a node's accessible description, e.g.
 * "neighbours 1, 3" or "points at 2 (weight 5)".
 */
export function describeNeighbors(neighbors: Neighbor[], directed: boolean): string {
  if (neighbors.length === 0) return directed ? 'points at nothing' : 'no neighbours';
  const list = neighbors
    .map((n) => (n.weight !== undefined ? `${n.value} (weight ${n.weight})` : `${n.value}`))
    .join(', ');
  return directed ? `points at ${list}` : `neighbours ${list}`;
}

export function marksForNode(marks: Mark[], i: number): MarkKind[] {
  return marks.filter((m) => m.at.t === 'index' && m.at.i === i).map((m) => m.kind);
}

export function marksForEdge(
  marks: Mark[],
  from: number,
  to: number,
  directed: boolean,
): MarkKind[] {
  return marks
    .filter((m) => {
      if (m.at.t !== 'edge') return false;
      if (m.at.from === from && m.at.to === to) return true;
      return !directed && m.at.from === to && m.at.to === from;
    })
    .map((m) => m.kind);
}
