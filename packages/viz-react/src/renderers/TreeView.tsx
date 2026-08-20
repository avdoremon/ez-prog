import type { Mark } from '@cs/viz-core';
import { resolveMarks } from './ArrayView.js';

export interface RendererProps {
  state: number[];
  marks?: Mark[];
  label: string;
}

/**
 * Renders a flat array as a binary tree: index i's children are 2i+1 and 2i+2,
 * the same mapping the Heaps lesson describes.
 *
 * Because positions are still array indexes, `Mark` targets need no new shape
 * and `resolveMarks` is reused verbatim — a Tree renderer costs no change to
 * the frame model at all.
 *
 * The markup is a real `tree` role with nested `treeitem`s rather than drawn
 * lines: it stays readable to a screen reader, survives at 360px, and needs no
 * layout maths. Depth is conveyed by nesting and by an explicit text label,
 * never by position alone.
 */
export function TreeView({ state, marks = [], label }: RendererProps) {
  const marked = resolveMarks(marks, state.length);

  function renderNode(i: number): React.ReactNode {
    if (i >= state.length) return null;

    const kinds = marked.get(i) ?? [];
    const left = 2 * i + 1;
    const right = 2 * i + 2;
    const hasChildren = left < state.length || right < state.length;

    return (
      <li
        key={i}
        role="treeitem"
        aria-expanded={hasChildren ? true : undefined}
        aria-label={`${state[i]}, index ${i}${kinds.length ? `, ${kinds.join(' ')}` : ''}`}
        className="tree-view__node"
        data-marks={kinds.join(' ') || undefined}
      >
        <span className="tree-view__value">{state[i]}</span>
        <span className="tree-view__index" aria-hidden="true">{i}</span>
        {kinds.length > 0 && (
          <span className="tree-view__tag" aria-hidden="true">{kinds.join(' ')}</span>
        )}
        {hasChildren && (
          <ul role="group" className="tree-view__children">
            {renderNode(left)}
            {renderNode(right)}
          </ul>
        )}
      </li>
    );
  }

  if (state.length === 0) {
    return <p className="tree-view tree-view--empty">{label}: empty</p>;
  }

  return (
    <ul role="tree" aria-label={label} className="tree-view">
      {renderNode(0)}
    </ul>
  );
}
