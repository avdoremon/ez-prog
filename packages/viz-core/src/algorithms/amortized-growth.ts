import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

export interface AmortizedGrowthInput {
  /** How many values to append, one at a time. */
  count: number;
  /** Capacity the array starts with before any growth. */
  initialCapacity: number;
}

/**
 * A dynamic array growing by doubling. Each append is normally one write, but
 * an append that finds the array full must first copy everything into a bigger
 * block. Counting those copies is the whole point: they total less than the
 * number of appends, so the *average* append stays constant-time even though
 * individual ones are not.
 */
export const amortizedGrowth: VizAlgorithm<AmortizedGrowthInput, number[]> =
function* ({ count, initialCapacity }): Generator<Frame<number[]>> {
  const items: number[] = [];
  let capacity = Math.max(1, initialCapacity);
  let copies = 0;
  let grows = 0;

  yield {
    state: snap(items), line: 'INIT', vars: { capacity, size: 0, copies },
    note: `An empty dynamic array with room for ${capacity}. Watch what an append costs as it fills.`,
  };

  for (let value = 1; value <= count; value++) {
    if (items.length === capacity) {
      capacity *= 2;
      grows++;

      yield {
        state: snap(items), line: 'GROW', vars: { capacity, size: items.length, copies },
        marks: [{ kind: 'active', at: { t: 'range', from: 0, to: items.length - 1 } }],
        note: `Full. Allocate a block of ${capacity} — double the old size — and move everything across.`,
      };

      for (let i = 0; i < items.length; i++) {
        copies++;
        yield {
          state: snap(items), line: 'COPY', vars: { copied: items[i]!, copies },
          marks: [{ kind: 'visited', at: { t: 'index', i } }],
          note: `Copy ${items[i]} into the new block. This is the cost a resize pays: ${copies} copies so far.`,
        };
      }
    }

    items.push(value);

    yield {
      state: snap(items), line: 'APPEND', vars: { size: items.length, capacity, copies },
      marks: [{ kind: 'active', at: { t: 'index', i: items.length - 1 } }],
      note: `Append ${value}: one write into a slot that already exists.`,
    };
  }

  yield {
    state: snap(items), line: 'DONE', vars: { size: items.length, capacity, copies, grows },
    marks: [{ kind: 'done', at: { t: 'range', from: 0, to: Math.max(0, items.length - 1) } }],
    // The bound is 2n, not n: the copies form the geometric series
    // 1 + 2 + 4 + ... which sums to just under twice the final size. Claiming
    // "fewer copies than appends" is wrong — at count 5 it is 7 copies to 5
    // appends. Under *two* per append is the real, and still constant, claim.
    note: `${count} appends caused ${grows} resizes and ${copies} copies — under two copies per append, no matter how long this runs.`,
  };
};
