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
  state: number[];
  marks?: Mark[];
  label: string;
}

export function ArrayView({ state, marks = [], label }: ArrayViewProps) {
  const resolved = resolveMarks(marks, state.length);
  return (
    <ol className="array-view" aria-label={label}>
      {state.map((value, i) => {
        const kinds = resolved.get(i) ?? [];
        return (
          <li key={i} className="array-view__cell" data-marks={kinds.join(' ') || undefined}>
            <span className="array-view__value">{value}</span>
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
