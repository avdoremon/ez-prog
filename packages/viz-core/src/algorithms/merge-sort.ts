import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

export interface MergeSortInput { arr: number[] }

/**
 * Top-down merge sort, merging back into the same array so a single ArrayView
 * can show the whole run. The comparison uses `<=`, which is what makes the
 * sort stable — equal values keep their original relative order.
 */
export const mergeSort: VizAlgorithm<MergeSortInput, number[]> =
function* ({ arr: input }): Generator<Frame<number[]>> {
  const arr = [...input];

  yield {
    state: snap(arr), line: 'INIT', vars: { length: arr.length },
    note: `Sorting ${arr.length} values by splitting down to single values, then merging sorted runs.`,
  };

  function* merge(lo: number, mid: number, hi: number): Generator<Frame<number[]>> {
    const left = arr.slice(lo, mid + 1);
    const right = arr.slice(mid + 1, hi + 1);
    let i = 0;
    let j = 0;
    let k = lo;

    while (i < left.length && j < right.length) {
      yield {
        state: snap(arr), line: 'COMPARE', vars: { left: left[i]!, right: right[j]! },
        marks: [
          { kind: 'active', at: { t: 'range', from: lo, to: hi } },
          { kind: 'cursor', at: { t: 'index', i: k } },
        ],
        note: `Compare ${left[i]} from the left run with ${right[j]} from the right.`,
      };

      // `<=` takes from the left on a tie, which preserves original order.
      const takeLeft = left[i]! <= right[j]!;
      arr[k] = takeLeft ? left[i++]! : right[j++]!;

      yield {
        state: snap(arr), line: 'WRITE', vars: { wrote: arr[k]!, at: k },
        marks: [{ kind: 'swap', at: { t: 'index', i: k } }],
        note: `${arr[k]} is smaller, so it goes to index ${k}.`,
      };
      k++;
    }

    while (i < left.length) {
      arr[k] = left[i++]!;
      yield {
        state: snap(arr), line: 'WRITE', vars: { wrote: arr[k]!, at: k },
        marks: [{ kind: 'swap', at: { t: 'index', i: k } }],
        note: `The right run is spent, so ${arr[k]} comes across unchallenged.`,
      };
      k++;
    }

    while (j < right.length) {
      arr[k] = right[j++]!;
      yield {
        state: snap(arr), line: 'WRITE', vars: { wrote: arr[k]!, at: k },
        marks: [{ kind: 'swap', at: { t: 'index', i: k } }],
        note: `The left run is spent, so ${arr[k]} comes across unchallenged.`,
      };
      k++;
    }

    yield {
      state: snap(arr), line: 'MERGED', vars: { lo, hi },
      marks: [{ kind: 'done', at: { t: 'range', from: lo, to: hi } }],
      note: `Indexes ${lo}–${hi} are now one sorted run.`,
    };
  }

  function* sort(lo: number, hi: number): Generator<Frame<number[]>> {
    if (lo >= hi) return;

    const mid = (lo + hi) >> 1;
    yield {
      state: snap(arr), line: 'SPLIT', vars: { lo, mid, hi },
      marks: [{ kind: 'active', at: { t: 'range', from: lo, to: hi } }],
      note: `Split ${lo}–${hi} into ${lo}–${mid} and ${mid + 1}–${hi}.`,
    };

    yield* sort(lo, mid);
    yield* sort(mid + 1, hi);
    yield* merge(lo, mid, hi);
  }

  yield* sort(0, arr.length - 1);

  yield {
    state: snap(arr), line: 'DONE',
    marks: [{ kind: 'done', at: { t: 'range', from: 0, to: arr.length - 1 } }],
    note: `Every run has been merged — the array is sorted.`,
  };
};
