import type { Mark, MarkKind } from '@cs/viz-core';

export function resolveMarks(marks: Mark[], length: number): Map<number, MarkKind[]> {
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
        // Rejected rather than ignored: a generator emitting edge marks has
        // graph-shaped state and belongs in GraphView. Silently dropping them
        // would render a plausible-looking but incomplete picture.
        throw new Error(
          'ArrayView cannot render an edge target — use the GraphView renderer.',
        );
      default: {
        const unsupported: never = mark.at;
        throw new Error(
          `ArrayView cannot render target ${JSON.stringify(unsupported)}`,
        );
      }
    }
  }
  return map;
}

export interface ArrayViewProps {
  /**
   * `null` is a slot that exists but holds nothing, drawn as an empty cell.
   *
   * Most algorithms never produce one — an array being sorted is occupied
   * everywhere — and `number[]` is assignable to this, so nothing that
   * already exists has to change. It is here for fixed-size structures whose
   * *unoccupied* slots carry meaning: a hash table's probe stops at the first
   * empty slot, and how full the table looks is what a load factor is. A
   * sentinel number cannot express that; a table of `-1`s reads as data.
   */
  state: (number | null)[];
  marks?: Mark[];
  label: string;
}

export function ArrayView({ state, marks = [], label }: ArrayViewProps) {
  const resolved = resolveMarks(marks, state.length);
  return (
    <ol className="array-view" aria-label={label}>
      {state.map((value, i) => {
        const kinds = resolved.get(i) ?? [];
        const isEmpty = value === null;
        return (
          <li
            key={i}
            className="array-view__cell"
            data-empty={isEmpty || undefined}
            data-marks={kinds.join(' ') || undefined}
          >
            {/*
              A non-breaking space rather than nothing, so an empty cell keeps
              the height of a filled one and the row does not go ragged. It is
              whitespace, so it raises no contrast question of its own — the
              empty state is carried by the border (see viz.css) and, for
              assistive tech, by the word below.
            */}
            <span className="array-view__value">{isEmpty ? ' ' : value}</span>
            {isEmpty && <span className="visually-hidden">empty</span>}
            <span className="array-view__index">{i}</span>
            {kinds.map((k) => (
              <span key={k} className="array-view__tag">{k}</span>
            ))}
          </li>
        );
      })}
    </ol>
  );
}
