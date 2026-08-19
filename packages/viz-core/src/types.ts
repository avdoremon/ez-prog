export type AnchorId = string;

export type Target =
  | { t: 'index'; i: number }
  | { t: 'range'; from: number; to: number };

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
