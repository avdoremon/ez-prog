import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

export interface LinearSearchInput { arr: number[]; target: number }

export const linearSearch: VizAlgorithm<LinearSearchInput, number[]> =
function* ({ arr, target }): Generator<Frame<number[]>> {
  yield {
    state: snap(arr), line: 'INIT', vars: { checked: 0 },
    note: `Checking every value in order until ${target} turns up.`,
  };

  for (let i = 0; i < arr.length; i++) {
    yield {
      state: snap(arr), line: 'COMPARE', vars: { i, checked: i + 1 },
      marks: [{ kind: 'cursor', at: { t: 'index', i } }],
      note: `Is ${arr[i]} equal to ${target}?`,
    };

    if (arr[i] === target) {
      yield {
        state: snap(arr), line: 'FOUND', vars: { i, checked: i + 1 },
        marks: [{ kind: 'done', at: { t: 'index', i } }],
        note: `Found ${target} at index ${i}, after ${i + 1} checks.`,
      };
      return;
    }
  }

  yield {
    state: snap(arr), line: 'NOT_FOUND', vars: { checked: arr.length },
    note: `Checked all ${arr.length} values. ${target} is not present.`,
  };
};
