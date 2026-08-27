import type { MarkKind } from '@cs/viz-core';

/**
 * Mirrors the palette apps/web/src/styles/tokens.css defines for the 2D
 * renderers (cursor/compare/swap -> --signal, done -> --commit,
 * visited/active -> --probe, discard -> --discard) -- kept in sync by
 * hand, since a WebGL material needs a real hex value, not a CSS custom
 * property.
 */
const MARK_COLORS: Partial<Record<MarkKind, string>> = {
  cursor: '#B58415',
  compare: '#B58415',
  swap: '#B58415',
  done: '#369E71',
  visited: '#2F93E2',
  active: '#2F93E2',
  discard: '#E5654B',
};

/** tokens.css's --muted -- the default, unmarked node color. Also used for edge lines. */
export const DEFAULT_COLOR = '#7A8493';

/** tokens.css's --ink -- the body-text color, used for 3D node value labels. */
export const INK_COLOR = '#12161C';

export function colorForMarks(kinds: MarkKind[]): string {
  for (const kind of kinds) {
    const color = MARK_COLORS[kind];
    if (color) return color;
  }
  return DEFAULT_COLOR;
}
