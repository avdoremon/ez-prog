import type { Mark } from '@cs/viz-core';

function depthOf(index: number): number {
  return Math.floor(Math.log2(index + 1));
}

function treeLevels(size: number): number {
  return size === 0 ? 0 : depthOf(size - 1) + 1;
}

/**
 * The live-region text a screen reader (or anyone glancing at the page)
 * gets for the current frame -- TreeView3D has no DOM tree structure the
 * way TreeView's role="tree"/treeitem nesting gives for free, so this is
 * the replacement summary. A pure function of state+marks, so it is
 * testable without touching the renderer at all.
 */
export function buildSceneSummary(state: number[], marks: Mark[] = []): string {
  if (state.length === 0) return 'Empty tree.';

  const levels = treeLevels(state.length);
  const base =
    `Binary tree, ${state.length} node${state.length === 1 ? '' : 's'}, ` +
    `${levels} level${levels === 1 ? '' : 's'}.`;

  const parts: string[] = [];
  for (const mark of marks) {
    if (mark.at.t === 'index') {
      parts.push(`Node ${mark.at.i} (value ${state[mark.at.i]}) is ${mark.kind}.`);
    } else if (mark.at.t === 'range') {
      const count = mark.at.to - mark.at.from + 1;
      parts.push(`${count} node${count === 1 ? '' : 's'} ${mark.kind}.`);
    }
  }

  return parts.length > 0 ? `${base} ${parts.join(' ')}` : base;
}
