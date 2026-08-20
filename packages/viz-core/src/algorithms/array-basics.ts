import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

export interface ArrayBasicsInput {
  arr: number[];
  readIndex: number;
  insertAt: number;
  value: number;
}

/**
 * Contrasts the two costs that define an array: reading by index is one step
 * regardless of size, while inserting in the middle has to shift every element
 * to its right. The shifting is the point — it is what motivates linked lists.
 */
export const arrayBasics: VizAlgorithm<ArrayBasicsInput, number[]> =
function* ({ arr: input, readIndex, insertAt, value }): Generator<Frame<number[]>> {
  const arr = [...input];

  yield {
    state: snap(arr), line: 'INIT', vars: { length: arr.length },
    note: `An array of ${arr.length} values, laid out in one contiguous block.`,
  };

  if (readIndex >= 0 && readIndex < arr.length) {
    yield {
      state: snap(arr), line: 'READ', vars: { readIndex, value: arr[readIndex]! },
      marks: [{ kind: 'cursor', at: { t: 'index', i: readIndex } }],
      note: `Read index ${readIndex}: ${arr[readIndex]}. One step — the address is computed, not searched for.`,
    };
  }

  const at = Math.max(0, Math.min(insertAt, arr.length));
  const n = arr.length;

  // Grow by one. Duplicating the final value is invisible: the first shift
  // immediately overwrites the new slot with the same number.
  arr.push(arr[n - 1] ?? value);

  yield {
    state: snap(arr), line: 'GROW', vars: { length: arr.length, insertAt: at },
    marks: [{ kind: 'active', at: { t: 'index', i: arr.length - 1 } }],
    note: `To insert ${value} at index ${at}, the array first needs one more slot.`,
  };

  for (let i = n; i > at; i--) {
    arr[i] = arr[i - 1]!;
    yield {
      state: snap(arr), line: 'SHIFT', vars: { from: i - 1, to: i },
      marks: [{ kind: 'swap', at: { t: 'range', from: i - 1, to: i } }],
      note: `Shift ${arr[i]} from index ${i - 1} to ${i}. Every value right of the gap has to move.`,
    };
  }

  arr[at] = value;

  yield {
    state: snap(arr), line: 'PLACE', vars: { insertAt: at, value },
    marks: [{ kind: 'active', at: { t: 'index', i: at } }],
    note: `Now the gap exists, so ${value} can go in at index ${at}.`,
  };

  const shifted = n - at;

  yield {
    state: snap(arr), line: 'DONE', vars: { length: arr.length, shifted },
    marks: [{ kind: 'done', at: { t: 'range', from: 0, to: arr.length - 1 } }],
    note:
      shifted === 0
        ? `Done: the read cost one step, and appending at the end shifted nothing.`
        : `Done: the read cost one step, but the insert shifted ${shifted} ${shifted === 1 ? 'value' : 'values'}.`,
  };
};
