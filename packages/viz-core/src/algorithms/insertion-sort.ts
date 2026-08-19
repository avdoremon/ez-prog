import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

export interface InsertionSortInput { arr: number[] }

export const insertionSort: VizAlgorithm<InsertionSortInput, number[]> =
function* ({ arr: input }): Generator<Frame<number[]>> {
  const arr = [...input];   // never mutate the caller's array

  yield {
    state: snap(arr), line: 'INIT',
    note: `Sorting ${arr.length} values by inserting each one into the sorted prefix on its left.`,
  };

  for (let i = 1; i < arr.length; i++) {
    const key = arr[i]!;

    yield {
      state: snap(arr), line: 'KEY', vars: { i, key },
      marks: [
        { kind: 'done', at: { t: 'range', from: 0, to: i - 1 } },
        { kind: 'cursor', at: { t: 'index', i } },
      ],
      note: `Take ${key} as the key. Everything to its left is already sorted.`,
    };

    let j = i - 1;

    while (j >= 0 && arr[j]! > key) {
      yield {
        state: snap(arr), line: 'COMPARE', vars: { key, j },
        marks: [
          { kind: 'compare', at: { t: 'index', i: j } },
          { kind: 'active', at: { t: 'index', i: j + 1 } },
        ],
        note: `${arr[j]} is bigger than the key ${key}, so it has to move right.`,
      };

      arr[j + 1] = arr[j]!;
      j--;

      yield {
        state: snap(arr), line: 'SHIFT', vars: { key, j },
        marks: [{ kind: 'swap', at: { t: 'range', from: j + 1, to: j + 2 } }],
        note: `Shift it one slot right, opening a gap for the key.`,
      };
    }

    if (j >= 0) {
      yield {
        state: snap(arr), line: 'COMPARE', vars: { key, j },
        marks: [{ kind: 'compare', at: { t: 'index', i: j } }],
        note: `${arr[j]} is not bigger than ${key}, so the key belongs just after it.`,
      };
    }

    arr[j + 1] = key;

    yield {
      state: snap(arr), line: 'PLACE', vars: { key, at: j + 1 },
      marks: [
        { kind: 'done', at: { t: 'range', from: 0, to: i } },
        { kind: 'active', at: { t: 'index', i: j + 1 } },
      ],
      note: `Drop ${key} into the gap. The first ${i + 1} values are now sorted.`,
    };
  }

  yield {
    state: snap(arr), line: 'DONE',
    marks: [{ kind: 'done', at: { t: 'range', from: 0, to: arr.length - 1 } }],
    note: `Every value has been inserted — the array is sorted.`,
  };
};
