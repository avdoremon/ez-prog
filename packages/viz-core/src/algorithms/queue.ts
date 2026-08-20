import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

/** A number enqueues that value; `null` dequeues. */
export type QueueOp = number | null;

export interface QueueInput { ops: QueueOp[] }

/**
 * A deliberately naive array-backed queue: values enter at the back and leave
 * at the front, and removing from the front shifts everything left. The shift
 * frames are the lesson — they are why a real queue keeps a head index or wraps
 * around a circular buffer instead of doing this.
 */
export const queue: VizAlgorithm<QueueInput, number[]> =
function* ({ ops }): Generator<Frame<number[]>> {
  const items: number[] = [];

  yield {
    state: snap(items), line: 'INIT', vars: { size: 0 },
    note: `An empty queue. Values join at the back and leave from the front.`,
  };

  for (const op of ops) {
    if (op !== null) {
      items.push(op);
      yield {
        state: snap(items), line: 'ENQUEUE', vars: { size: items.length, back: op },
        marks: [{ kind: 'active', at: { t: 'index', i: items.length - 1 } }],
        note: `Enqueue ${op}. It joins at the back, behind everyone already waiting.`,
      };
      continue;
    }

    if (items.length === 0) {
      yield {
        state: snap(items), line: 'EMPTY', vars: { size: 0 },
        note: `Dequeue on an empty queue — nobody is waiting.`,
      };
      continue;
    }

    const front = items[0]!;
    yield {
      state: snap(items), line: 'DEQUEUE', vars: { size: items.length, front },
      marks: [{ kind: 'discard', at: { t: 'index', i: 0 } }],
      note: `Dequeue returns ${front} — the value that has waited longest.`,
    };

    // Shift left by hand rather than calling shift(), because the cost of
    // closing the gap is exactly what this lesson is about.
    for (let i = 1; i < items.length; i++) {
      items[i - 1] = items[i]!;
      // The full array is shown, so the value appears twice for one frame —
      // that is what a copy looks like. The stale tail disappears when the
      // length drops after the loop, exactly as in the Arrays lesson.
      yield {
        state: snap(items), line: 'SHIFT',
        vars: { from: i, to: i - 1 },
        marks: [{ kind: 'swap', at: { t: 'range', from: i - 1, to: i } }],
        note: `Everyone moves up one: ${items[i - 1]} slides from index ${i} to ${i - 1}.`,
      };
    }
    items.pop();
  }

  yield {
    state: snap(items), line: 'DONE', vars: { size: items.length },
    marks: items.length
      ? [{ kind: 'done', at: { t: 'range', from: 0, to: items.length - 1 } }]
      : undefined,
    note: items.length === 0
      ? `Every operation is finished. The queue is empty again.`
      : items.length === 1
        ? `Every operation is finished. One value is still waiting.`
        : `Every operation is finished. ${items.length} values are still waiting, longest-waiting first.`,
  };
};
