import type { Mark, MarkKind } from '@cs/viz-core';

export function resolveBarMarks(marks: Mark[], length: number): Map<number, MarkKind[]> {
  const map = new Map<number, MarkKind[]>();
  const add = (i: number, kind: MarkKind) => {
    if (!Number.isInteger(i) || i < 0 || i >= length) return;
    map.set(i, [...(map.get(i) ?? []), kind]);
  };

  for (const mark of marks) {
    switch (mark.at.t) {
      case 'index':
        add(mark.at.i, mark.kind);
        break;
      case 'range': {
        const { from, to } = mark.at;
        for (let i = Math.min(from, to); i <= Math.max(from, to); i++) add(i, mark.kind);
        break;
      }
      case 'edge':
        throw new Error(
          'BarView3D cannot render an edge target — a sort generator should never emit one.',
        );
      default: {
        const unsupported: never = mark.at;
        throw new Error(`BarView3D cannot render target ${JSON.stringify(unsupported)}`);
      }
    }
  }
  return map;
}

/**
 * The live-region text a screen reader (or anyone glancing at the page)
 * gets for the current frame -- the WebGL canvas itself is aria-hidden, so
 * this is BarView3D's only description of what changed. A pure function of
 * state+marks, testable without touching the renderer at all (mirrors
 * TreeView3D's buildSceneSummary, but "Array, N values" wording and
 * slot-based mark descriptions instead of tree-node ones).
 */
export function buildBarSummary(state: (number | null)[], marks: Mark[] = []): string {
  if (state.length === 0) return 'Empty array.';

  const base = `Array, ${state.length} value${state.length === 1 ? '' : 's'}.`;

  const parts: string[] = [];
  for (const mark of marks) {
    if (mark.at.t === 'index') {
      const value = state[mark.at.i];
      const described = value === null ? 'empty' : `value ${value}`;
      parts.push(`Slot ${mark.at.i} (${described}) is ${mark.kind}.`);
    } else if (mark.at.t === 'range') {
      const count = Math.abs(mark.at.to - mark.at.from) + 1;
      parts.push(`${count} slot${count === 1 ? '' : 's'} ${mark.kind}.`);
    }
  }

  return parts.length > 0 ? `${base} ${parts.join(' ')}` : base;
}
