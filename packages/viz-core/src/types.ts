export type AnchorId = string;

export type Target =
  | { t: 'index'; i: number }
  | { t: 'range'; from: number; to: number }
  /**
   * An edge between two nodes, for graph-shaped states. Renderers that draw a
   * flat sequence (ArrayView) reject this rather than ignoring it, so a
   * generator emitting edge marks into the wrong renderer fails loudly.
   */
  | { t: 'edge'; from: number; to: number };

/** One edge of a graph. `weight` is omitted for unweighted graphs. */
export interface GraphEdge {
  from: number;
  to: number;
  weight?: number;
}

/**
 * State for graph-shaped visualizations. Nodes are identified by their index
 * into `values`, so `{ t: 'index' }` marks a node exactly as it marks an array
 * cell — the mark vocabulary is shared across renderers rather than forked.
 */
export interface GraphState {
  values: number[];
  edges: GraphEdge[];
  directed?: boolean;
}

export type MarkKind =
  | 'cursor' | 'compare' | 'swap' | 'done' | 'visited' | 'active' | 'discard';

export interface Mark {
  kind: MarkKind;
  at: Target;
}

export interface Frame<S = unknown> {
  /** Immutable snapshot. Never a live reference — see snap(). */
  state: S;
  marks?: Mark[];
  /** Required, non-empty. One sentence explaining this step. */
  note: string;
  /** A named anchor, not a line number. */
  line?: AnchorId;
  vars?: Record<string, string | number>;
}

export type VizAlgorithm<I, S> = (input: I) => Generator<Frame<S>>;
