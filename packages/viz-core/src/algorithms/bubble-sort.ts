import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

export interface BubbleSortInput { arr: number[] }

export const bubbleSort: VizAlgorithm<BubbleSortInput, number[]> =
function* ({ arr: input }): Generator<Frame<number[]>> {
  const arr = [...input];   // never mutate the caller's array

  yield {
    state: snap(arr), line: 'INIT',
    note: `Sorting ${arr.length} values by repeatedly swapping neighbours.`,
  };

  for (let i = 0; i < arr.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < arr.length - 1 - i; j++) {
      yield {
        state: snap(arr), line: 'COMPARE', vars: { pass: i + 1, j },
        marks: [{ kind: 'compare', at: { t: 'range', from: j, to: j + 1 } }],
        note: `Compare ${arr[j]} and ${arr[j + 1]}.`,
      };

      if (arr[j]! > arr[j + 1]!) {
        [arr[j], arr[j + 1]] = [arr[j + 1]!, arr[j]!];
        swapped = true;
        yield {
          state: snap(arr), line: 'SWAP', vars: { pass: i + 1, j },
          marks: [{ kind: 'swap', at: { t: 'range', from: j, to: j + 1 } }],
          note: `They are out of order — swap them.`,
        };
      }
    }

    yield {
      state: snap(arr), line: 'PASS_END', vars: { pass: i + 1 },
      marks: [{ kind: 'done', at: { t: 'range', from: arr.length - 1 - i, to: arr.length - 1 } }],
      note: `Pass ${i + 1} finished. The largest ${i + 1} value(s) are settled.`,
    };

    if (!swapped) break;
  }

  yield {
    state: snap(arr), line: 'DONE',
    marks: [{ kind: 'done', at: { t: 'range', from: 0, to: arr.length - 1 } }],
    note: `Nothing left to swap — the array is sorted.`,
  };
};
