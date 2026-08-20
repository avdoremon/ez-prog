import type { GraphState, Mark, MarkKind } from '@cs/viz-core';

export interface GraphViewProps {
  state: GraphState;
  marks?: Mark[];
  label: string;
}

const edgeKey = (from: number, to: number) => `${from}->${to}`;

/**
 * Draws a graph as an adjacency list: one row per node, listing its
 * neighbours. Deliberately not a node-and-edge diagram — laying one out
 * legibly needs force simulation or hand-authored coordinates, neither of
 * which survives a 360px screen or a screen reader. An adjacency list is what
 * the algorithms actually traverse, and it stays readable at any width.
 *
 * Nodes are marked by `{ t: 'index' }`, the same target every other renderer
 * uses. Edges get `{ t: 'edge' }`; in an undirected graph a mark on (a, b)
 * lights up the edge under both endpoints, because it is one edge.
 */
export function GraphView({ state, marks = [], label }: GraphViewProps) {
  const { values, edges, directed = false } = state;

  const nodeMarks = new Map<number, MarkKind[]>();
  const edgeMarks = new Map<string, MarkKind[]>();

  for (const mark of marks) {
    switch (mark.at.t) {
      case 'index':
        if (mark.at.i >= 0 && mark.at.i < values.length) {
          nodeMarks.set(mark.at.i, [...(nodeMarks.get(mark.at.i) ?? []), mark.kind]);
        }
        break;
      case 'range': {
        const { from, to } = mark.at;
        for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
          if (i >= 0 && i < values.length) {
            nodeMarks.set(i, [...(nodeMarks.get(i) ?? []), mark.kind]);
          }
        }
        break;
      }
      case 'edge': {
        const { from, to } = mark.at;
        const keys = directed ? [edgeKey(from, to)] : [edgeKey(from, to), edgeKey(to, from)];
        for (const k of keys) edgeMarks.set(k, [...(edgeMarks.get(k) ?? []), mark.kind]);
        break;
      }
      default: {
        const unsupported: never = mark.at;
        throw new Error(`GraphView cannot render target ${JSON.stringify(unsupported)}`);
      }
    }
  }

  /** Neighbours of `i`, following direction only when the graph is directed. */
  function neighbours(i: number) {
    const out: { to: number; weight?: number }[] = [];
    for (const e of edges) {
      if (e.from === i) out.push({ to: e.to, weight: e.weight });
      else if (!directed && e.to === i) out.push({ to: e.from, weight: e.weight });
    }
    return out;
  }

  return (
    <ul className="graph-view" aria-label={label}>
      {values.map((value, i) => {
        const kinds = nodeMarks.get(i) ?? [];
        const label_ = `Node ${i}, value ${value}${kinds.length ? `, ${kinds.join(' ')}` : ''}`;
        return (
          <li
            key={i}
            className="graph-view__node"
            aria-label={label_}
            data-marks={kinds.join(' ') || undefined}
          >
            <span className="graph-view__value">{value}</span>
            {kinds.length > 0 && (
              <span className="graph-view__tag" aria-hidden="true">{kinds.join(' ')}</span>
            )}
            <span className="graph-view__arrow" aria-hidden="true">{directed ? '→' : '—'}</span>
            <span className="graph-view__edges">
              {neighbours(i).map(({ to, weight }) => {
                const ek = edgeMarks.get(edgeKey(i, to)) ?? [];
                return (
                  <span
                    key={`${i}-${to}`}
                    className="graph-view__edge"
                    data-marks={ek.join(' ') || undefined}
                  >
                    {values[to]}
                    {weight !== undefined && (
                      <span className="graph-view__weight"> ({weight})</span>
                    )}
                  </span>
                );
              })}
              {neighbours(i).length === 0 && (
                <span className="graph-view__edge graph-view__edge--none">none</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
