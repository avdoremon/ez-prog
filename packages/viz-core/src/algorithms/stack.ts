import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

/** A number pushes that value; `null` pops. */
export type StackOp = number | null;

export interface StackInput { ops: StackOp[] }

/**
 * An array-backed stack. Both operations touch only the far end, which is why
 * they are O(1) — nothing shifts, unlike an insert in the middle of an array.
 *
 * A pop yields the state *before* the removal, with the departing value marked,
 * so the learner sees which cell leaves; the next frame shows it gone.
 */
export const stack: VizAlgorithm<StackInput, number[]> =
function* ({ ops }): Generator<Frame<number[]>> {
  const items: number[] = [];

  yield {
    state: snap(items), line: 'INIT', vars: { size: 0 },
    note: `An empty stack. Values enter and leave at the same end — the top.`,
  };

  for (const op of ops) {
    if (op !== null) {
      items.push(op);
      yield {
        state: snap(items), line: 'PUSH', vars: { size: items.length, top: op },
        marks: [{ kind: 'active', at: { t: 'index', i: items.length - 1 } }],
        note: `Push ${op}. It goes on top, and nothing else moves.`,
      };
      continue;
    }

    if (items.length === 0) {
      yield {
        state: snap(items), line: 'EMPTY', vars: { size: 0 },
        note: `Pop on an empty stack — there is nothing to remove.`,
      };
      continue;
    }

    const top = items[items.length - 1]!;
    yield {
      state: snap(items), line: 'POP', vars: { size: items.length, top },
      marks: [{ kind: 'discard', at: { t: 'index', i: items.length - 1 } }],
      note: `Pop returns ${top} — the most recently pushed value, not the oldest.`,
    };
    items.pop();
  }

  yield {
    state: snap(items), line: 'DONE', vars: { size: items.length },
    marks: items.length
      ? [{ kind: 'done', at: { t: 'range', from: 0, to: items.length - 1 } }]
      : undefined,
    note: items.length === 0
      ? `Every operation is finished. The stack is empty again.`
      : items.length === 1
        ? `Every operation is finished. One value remains.`
        : `Every operation is finished. ${items.length} values remain, oldest at the left.`,
  };
};
