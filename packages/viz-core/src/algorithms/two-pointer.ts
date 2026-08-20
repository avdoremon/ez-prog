import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

export interface TwoPointerInput { arr: number[]; target: number }

/**
 * Finds a pair summing to `target` in a **sorted** array by converging two
 * pointers. Sortedness is the precondition that makes the move decision valid;
 * on unsorted input the generator still terminates, it just proves nothing.
 */
export const twoPointer: VizAlgorithm<TwoPointerInput, number[]> =
function* ({ arr, target }): Generator<Frame<number[]>> {
  let lo = 0;
  let hi = arr.length - 1;

  yield {
    state: snap(arr), line: 'INIT', vars: { lo, hi, target },
    note: `Looking for two values that add up to ${target}. One pointer starts at each end.`,
  };

  while (lo < hi) {
    const sum = arr[lo]! + arr[hi]!;

    yield {
      state: snap(arr), line: 'SUM', vars: { lo, hi, sum },
      marks: [
        { kind: 'compare', at: { t: 'index', i: lo } },
        { kind: 'compare', at: { t: 'index', i: hi } },
      ],
      note: `${arr[lo]} + ${arr[hi]} = ${sum}.`,
    };

    if (sum === target) {
      yield {
        state: snap(arr), line: 'FOUND', vars: { lo, hi, sum },
        marks: [
          { kind: 'done', at: { t: 'index', i: lo } },
          { kind: 'done', at: { t: 'index', i: hi } },
        ],
        note: `That is ${target} — found the pair at indexes ${lo} and ${hi}.`,
      };
      return;
    }

    if (sum < target) {
      yield {
        state: snap(arr), line: 'MOVE_LO', vars: { lo, hi, sum },
        marks: [
          { kind: 'discard', at: { t: 'range', from: 0, to: lo } },
          { kind: 'cursor', at: { t: 'index', i: lo + 1 } },
        ],
        note: `${sum} is too small. Nothing paired with ${arr[lo]} can reach ${target}, so move the left pointer right.`,
      };
      lo++;
    } else {
      yield {
        state: snap(arr), line: 'MOVE_HI', vars: { lo, hi, sum },
        marks: [
          { kind: 'discard', at: { t: 'range', from: hi, to: arr.length - 1 } },
          { kind: 'cursor', at: { t: 'index', i: hi - 1 } },
        ],
        note: `${sum} is too big. Nothing paired with ${arr[hi]} can come back down to ${target}, so move the right pointer left.`,
      };
      hi--;
    }
  }

  yield {
    state: snap(arr), line: 'NOT_FOUND', vars: { lo, hi },
    note: `The pointers met without finding a pair. No two values add up to ${target}.`,
  };
};
