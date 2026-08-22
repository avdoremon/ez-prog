import { snap } from '../snap.js';
import type { Frame, Mark, VizAlgorithm } from '../types.js';

export interface SelectionSortInput { arr: number[] }

/**
 * Selection sort: repeatedly find the smallest value in the unsorted region
 * and swap it into the boundary slot.
 *
 * The `swaps` var is not decoration. Selection sort's reason to exist is that
 * it performs at most n-1 swaps whatever the input looks like, where the other
 * elementary sorts move data O(n^2) times in the worst case — so the counter
 * is the one number the lesson is really about, and it stays on screen through
 * every frame rather than only appearing at the end.
 */
export const selectionSort: VizAlgorithm<SelectionSortInput, number[]> =
function* ({ arr: input }): Generator<Frame<number[]>> {
  const arr = [...input];   // never mutate the caller's array
  let swaps = 0;

  /** The settled prefix, which grows by exactly one slot per pass. */
  const sorted = (upTo: number): Mark[] =>
    upTo >= 0 ? [{ kind: 'done', at: { t: 'range', from: 0, to: upTo } }] : [];

  yield {
    state: snap(arr), line: 'INIT', vars: { swaps },
    note: `Sorting ${arr.length} values by repeatedly selecting the smallest one still unsorted.`,
  };

  for (let i = 0; i < arr.length - 1; i++) {
    let min = i;

    yield {
      state: snap(arr), line: 'PASS', vars: { i, min: arr[min]!, swaps },
      marks: [...sorted(i - 1), { kind: 'cursor', at: { t: 'index', i } }],
      note: `Slot ${i} is next to fill. Assume ${arr[i]} is the smallest until something smaller turns up.`,
    };

    for (let j = i + 1; j < arr.length; j++) {
      yield {
        state: snap(arr), line: 'SCAN', vars: { i, j, min: arr[min]!, swaps },
        marks: [
          ...sorted(i - 1),
          { kind: 'active', at: { t: 'index', i: min } },
          { kind: 'compare', at: { t: 'index', i: j } },
        ],
        note: `Is ${arr[j]} smaller than the smallest so far, ${arr[min]}?`,
      };

      if (arr[j]! < arr[min]!) {
        min = j;

        yield {
          state: snap(arr), line: 'NEW_MIN', vars: { i, j, min: arr[min]!, swaps },
          marks: [
            ...sorted(i - 1),
            { kind: 'active', at: { t: 'index', i: min } },
          ],
          note: `Yes — ${arr[min]} is the new smallest. Remember where it is; nothing moves yet.`,
        };
      }
    }

    // The anchor sits on the guarded swap, so this one frame covers both
    // outcomes: a value already in its final slot costs no swap at all, which
    // is the behaviour the n-1 bound depends on.
    if (min !== i) {
      [arr[i], arr[min]] = [arr[min]!, arr[i]!];
      swaps++;

      yield {
        state: snap(arr), line: 'SWAP', vars: { i, swaps },
        marks: [
          ...sorted(i - 1),
          { kind: 'swap', at: { t: 'index', i } },
          { kind: 'swap', at: { t: 'index', i: min } },
        ],
        note: `Swap ${arr[min]} out and ${arr[i]} in. Slot ${i} is settled — that is swap ${swaps}.`,
      };
    } else {
      yield {
        state: snap(arr), line: 'SWAP', vars: { i, swaps },
        marks: [...sorted(i), { kind: 'cursor', at: { t: 'index', i } }],
        note: `${arr[i]} was already the smallest, so slot ${i} settles without a swap.`,
      };
    }
  }

  yield {
    state: snap(arr), line: 'DONE', vars: { swaps },
    marks: [{ kind: 'done', at: { t: 'range', from: 0, to: arr.length - 1 } }],
    note: `Only one value can be left, so it is already in place. Sorted in ${swaps} ${swaps === 1 ? 'swap' : 'swaps'}.`,
  };
};
