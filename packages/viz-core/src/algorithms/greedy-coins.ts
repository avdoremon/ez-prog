import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

export interface GreedyCoinsInput {
  /** Denominations available in unlimited supply. Order does not matter. */
  coins: number[];
  /** Amount to make up. */
  amount: number;
}

/**
 * Greedy coin change: always take the largest coin that still fits.
 *
 * The state shown is the denomination list, sorted largest first — the order
 * greedy considers them in. Whether the result is optimal depends entirely on
 * the coin system, which is the lesson: [25,10,5,1] is safe, [4,3,1] is not.
 */
export const greedyCoins: VizAlgorithm<GreedyCoinsInput, number[]> =
function* ({ coins, amount }): Generator<Frame<number[]>> {
  const sorted = [...coins].sort((a, b) => b - a);
  let remaining = amount;
  let used = 0;

  yield {
    state: snap(sorted), line: 'INIT', vars: { amount, remaining, used },
    note: `Making ${amount} from these denominations, always taking the largest that still fits.`,
  };

  for (let i = 0; i < sorted.length; i++) {
    const coin = sorted[i]!;

    if (coin > remaining) {
      yield {
        state: snap(sorted), line: 'SKIP', vars: { coin, remaining, used },
        marks: [{ kind: 'discard', at: { t: 'index', i } }],
        note: `${coin} is bigger than the ${remaining} still owed — skip it.`,
      };
      continue;
    }

    yield {
      state: snap(sorted), line: 'CONSIDER', vars: { coin, remaining, used },
      marks: [{ kind: 'cursor', at: { t: 'index', i } }],
      note: `${coin} fits inside ${remaining}. Take as many as possible.`,
    };

    while (coin <= remaining) {
      remaining -= coin;
      used++;
      yield {
        state: snap(sorted), line: 'TAKE', vars: { coin, remaining, used },
        marks: [{ kind: 'active', at: { t: 'index', i } }],
        note: `Take a ${coin}. ${used} ${used === 1 ? 'coin' : 'coins'} so far, ${remaining} still owed.`,
      };
    }
  }

  yield {
    state: snap(sorted), line: 'DONE', vars: { remaining, used },
    marks: [{ kind: 'done', at: { t: 'range', from: 0, to: sorted.length - 1 } }],
    note: remaining === 0
      ? `Done: ${amount} made from ${used} ${used === 1 ? 'coin' : 'coins'}. Greedy never reconsidered a choice.`
      : `Stuck: ${remaining} still owed with no coin small enough. Greedy cannot back up to fix this.`,
  };
};
