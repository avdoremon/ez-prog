import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

export interface QuickSortInput { arr: number[] }

/**
 * Lomuto partition, pivoting on the last element of each range. The pivot
 * choice is deliberately naive: it is what makes already-sorted input the
 * quadratic worst case, which the lesson asks the learner to reproduce.
 */
export const quickSort: VizAlgorithm<QuickSortInput, number[]> =
function* ({ arr: input }): Generator<Frame<number[]>> {
  const arr = [...input];

  yield {
    state: snap(arr), line: 'INIT', vars: { length: arr.length },
    note: `Sorting ${arr.length} values by partitioning around a pivot, then repeating on each side.`,
  };

  function* partition(lo: number, hi: number): Generator<Frame<number[]>, number> {
    const pivot = arr[hi]!;

    yield {
      state: snap(arr), line: 'PIVOT', vars: { lo, hi, pivot },
      marks: [
        { kind: 'active', at: { t: 'range', from: lo, to: hi } },
        { kind: 'cursor', at: { t: 'index', i: hi } },
      ],
      note: `Partitioning ${lo}–${hi} around the pivot ${pivot}, taken from the end.`,
    };

    // Everything below `small` is known to be < pivot.
    let small = lo;

    for (let i = lo; i < hi; i++) {
      yield {
        state: snap(arr), line: 'COMPARE', vars: { i, value: arr[i]!, pivot },
        marks: [
          { kind: 'compare', at: { t: 'index', i } },
          { kind: 'cursor', at: { t: 'index', i: hi } },
        ],
        note: `Is ${arr[i]} smaller than the pivot ${pivot}?`,
      };

      if (arr[i]! < pivot) {
        if (i !== small) {
          [arr[small], arr[i]] = [arr[i]!, arr[small]!];
          yield {
            state: snap(arr), line: 'SWAP', vars: { from: i, to: small },
            marks: [{ kind: 'swap', at: { t: 'range', from: small, to: i } }],
            note: `Yes — swap it down to index ${small}, just past the smaller values.`,
          };
        }
        small++;
      }
    }

    [arr[small], arr[hi]] = [arr[hi]!, arr[small]!];

    yield {
      // lo/hi are carried so the partition invariant can be checked against
      // the exact window this call owns — see quick-sort.conformance.test.ts.
      state: snap(arr), line: 'PLACE', vars: { pivot, at: small, lo, hi },
      marks: [
        { kind: 'done', at: { t: 'index', i: small } },
        { kind: 'discard', at: { t: 'range', from: lo, to: Math.max(lo, small - 1) } },
      ],
      note: `Put the pivot at index ${small}. Everything left is smaller, everything right is bigger — so ${pivot} is final.`,
    };

    return small;
  }

  function* sort(lo: number, hi: number): Generator<Frame<number[]>> {
    if (lo >= hi) return;
    const p = yield* partition(lo, hi);
    yield* sort(lo, p - 1);
    yield* sort(p + 1, hi);
  }

  yield* sort(0, arr.length - 1);

  yield {
    state: snap(arr), line: 'DONE',
    marks: [{ kind: 'done', at: { t: 'range', from: 0, to: arr.length - 1 } }],
    note: `Every pivot has landed in its final position — the array is sorted.`,
  };
};
