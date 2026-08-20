import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

export interface HeapInput {
  values: number[];
  /** Follow the build with one extract-max, showing sift-down. */
  extract: boolean;
}

const parentOf = (i: number) => (i - 1) >> 1;

/**
 * A max-heap stored in a flat array: the children of index i live at 2i+1 and
 * 2i+2, so the tree needs no pointers at all. Inserting appends and sifts up;
 * extracting takes the root, moves the last value there, and sifts down.
 */
export const heap: VizAlgorithm<HeapInput, number[]> =
function* ({ values, extract }): Generator<Frame<number[]>> {
  const items: number[] = [];

  yield {
    state: snap(items), line: 'INIT', vars: { size: 0 },
    note: `An empty heap. Index i's children live at 2i+1 and 2i+2 — the tree is the arithmetic.`,
  };

  for (const value of values) {
    items.push(value);
    let i = items.length - 1;

    yield {
      state: snap(items), line: 'INSERT', vars: { value, at: i },
      marks: [{ kind: 'active', at: { t: 'index', i } }],
      note: `Insert ${value} at the end — the only free slot that keeps the tree filled left to right.`,
    };

    while (i > 0) {
      const p = parentOf(i);
      if (items[p]! >= items[i]!) {
        yield {
          state: snap(items), line: 'SIFT_UP', vars: { child: i, parent: p },
          marks: [
            { kind: 'compare', at: { t: 'index', i } },
            { kind: 'compare', at: { t: 'index', i: p } },
          ],
          note: `Parent ${items[p]} is not smaller than ${items[i]}, so ${items[i]} is already low enough.`,
        };
        break;
      }

      [items[p], items[i]] = [items[i]!, items[p]!];
      yield {
        state: snap(items), line: 'SIFT_UP', vars: { child: i, parent: p },
        marks: [{ kind: 'swap', at: { t: 'index', i: p } }],
        note: `${items[p]} is bigger than its parent ${items[i]}, so they swap — it rises toward the root.`,
      };
      i = p;
    }
  }

  if (extract && items.length > 0) {
    const max = items[0]!;

    yield {
      state: snap(items), line: 'EXTRACT', vars: { max },
      marks: [{ kind: 'discard', at: { t: 'index', i: 0 } }],
      note: `The maximum is always at the root: ${max}. Take it.`,
    };

    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;

      yield {
        state: snap(items), line: 'EXTRACT', vars: { moved: last },
        marks: [{ kind: 'active', at: { t: 'index', i: 0 } }],
        note: `Move the last value, ${last}, into the empty root so the tree stays filled.`,
      };

      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = 2 * i + 2;
        let largest = i;
        if (left < items.length && items[left]! > items[largest]!) largest = left;
        if (right < items.length && items[right]! > items[largest]!) largest = right;

        if (largest === i) {
          yield {
            state: snap(items), line: 'SIFT_DOWN', vars: { at: i },
            marks: [{ kind: 'compare', at: { t: 'index', i } }],
            note: `${items[i]} is at least as big as its children — the heap order holds again.`,
          };
          break;
        }

        [items[i], items[largest]] = [items[largest]!, items[i]!];
        yield {
          state: snap(items), line: 'SIFT_DOWN', vars: { from: i, to: largest },
          marks: [{ kind: 'swap', at: { t: 'index', i: largest } }],
          note: `${items[i]} is the larger child, so it swaps up and ${items[largest]} sinks.`,
        };
        i = largest;
      }
    }
  }

  yield {
    state: snap(items), line: 'DONE', vars: { size: items.length, root: items[0] ?? 0 },
    marks: items.length
      ? [{ kind: 'done', at: { t: 'index', i: 0 } }]
      : undefined,
    note: items.length
      ? `Done. The largest value sits at index 0, reachable without searching.`
      : `Done. The heap is empty.`,
  };
};
