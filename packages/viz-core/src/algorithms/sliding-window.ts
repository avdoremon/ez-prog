import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

export interface SlidingWindowInput { arr: number[]; k: number }

/**
 * Maximum sum of any contiguous window of `k` values. The point of the
 * visualization is the SLIDE step: the running sum is repaired with one
 * addition and one subtraction rather than re-added from scratch.
 */
export const slidingWindow: VizAlgorithm<SlidingWindowInput, number[]> =
function* ({ arr, k }): Generator<Frame<number[]>> {
  // The registry's inputSchema rejects this, but a generator must never hang
  // or emit a frameless run if it is called directly.
  if (k < 1 || k > arr.length) {
    yield {
      state: snap(arr), line: 'INIT', vars: { k },
      note: `A window of ${k} does not fit in ${arr.length} values.`,
    };
    return;
  }

  let sum = 0;

  yield {
    state: snap(arr), line: 'INIT', vars: { k, sum },
    note: `Adding up the first window of ${k} values.`,
  };

  for (let i = 0; i < k; i++) {
    sum += arr[i]!;
    yield {
      state: snap(arr), line: 'ADD', vars: { i, sum },
      marks: [{ kind: 'active', at: { t: 'range', from: 0, to: i } }],
      note: `Add ${arr[i]}. The first window now sums to ${sum}.`,
    };
  }

  let best = sum;
  let bestStart = 0;

  for (let i = k; i < arr.length; i++) {
    const leaving = arr[i - k]!;
    const entering = arr[i]!;
    sum += entering - leaving;

    yield {
      state: snap(arr), line: 'SLIDE', vars: { start: i - k + 1, sum },
      marks: [
        { kind: 'discard', at: { t: 'index', i: i - k } },
        { kind: 'active', at: { t: 'range', from: i - k + 1, to: i } },
      ],
      // Deliberately not "...not ${k}": when the running sum happens to equal
      // k, that phrasing reads as "not 3" right after "Sum is 3".
      note: `Slide right: drop ${leaving}, add ${entering}. Sum is ${sum} — one subtraction and one addition, whatever the window size.`,
    };

    if (sum > best) {
      best = sum;
      bestStart = i - k + 1;

      yield {
        state: snap(arr), line: 'BEST', vars: { best, bestStart },
        marks: [{ kind: 'compare', at: { t: 'range', from: bestStart, to: i } }],
        note: `${sum} beats every earlier window — this is the new leader.`,
      };
    }
  }

  yield {
    state: snap(arr), line: 'DONE', vars: { best, bestStart },
    marks: [{ kind: 'done', at: { t: 'range', from: bestStart, to: bestStart + k - 1 } }],
    note: `Best window starts at index ${bestStart} and sums to ${best}.`,
  };
};
