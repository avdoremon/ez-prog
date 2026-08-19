import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

export interface BinarySearchInput { arr: number[]; target: number }

export const binarySearch: VizAlgorithm<BinarySearchInput, number[]> =
function* ({ arr, target }): Generator<Frame<number[]>> {
  let lo = 0;
  let hi = arr.length - 1;

  yield {
    state: snap(arr), line: 'INIT', vars: { lo, hi },
    note: `Searching for ${target} in a sorted array of ${arr.length} values.`,
  };

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    yield {
      state: snap(arr), line: 'MID', vars: { lo, hi, mid },
      marks: [
        { kind: 'active', at: { t: 'range', from: lo, to: hi } },
        { kind: 'cursor', at: { t: 'index', i: mid } },
      ],
      note: `Midpoint is index ${mid}, holding ${arr[mid]}.`,
    };

    if (arr[mid] === target) {
      yield {
        state: snap(arr), line: 'FOUND', vars: { lo, hi, mid },
        marks: [{ kind: 'done', at: { t: 'index', i: mid } }],
        note: `Found ${target} at index ${mid}.`,
      };
      return;
    }

    if (arr[mid]! < target) {
      yield {
        state: snap(arr), line: 'DISCARD_LEFT', vars: { lo, hi, mid },
        marks: [{ kind: 'discard', at: { t: 'range', from: lo, to: mid } }],
        note: `${arr[mid]} is smaller than ${target} — discard the left half.`,
      };
      lo = mid + 1;
    } else {
      yield {
        state: snap(arr), line: 'DISCARD_RIGHT', vars: { lo, hi, mid },
        marks: [{ kind: 'discard', at: { t: 'range', from: mid, to: hi } }],
        note: `${arr[mid]} is larger than ${target} — discard the right half.`,
      };
      hi = mid - 1;
    }
  }

  yield {
    state: snap(arr), line: 'NOT_FOUND', vars: { lo, hi },
    note: `The search space is empty. ${target} is not in the array.`,
  };
};
