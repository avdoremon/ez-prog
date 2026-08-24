import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

export interface DpFibonacciInput { n: number }

/**
 * Fibonacci, bottom-up: fills a table of n+1 answers left to right, each
 * cell computed from the two before it. Where the recursion lesson's naive
 * factorial-style call tree would recompute fib(i) roughly fib(n - i) times,
 * every cell here is written exactly once — the point of the lesson.
 *
 * Reuses ArrayView's empty-slot support (built for the hash-table lesson)
 * rather than a dedicated matrix renderer: the table starts as n+1 empty
 * cells and fills in, which is the whole visual.
 */
export const dpFibonacci: VizAlgorithm<DpFibonacciInput, (number | null)[]> =
function* ({ n }): Generator<Frame<(number | null)[]>> {
  const dp: (number | null)[] = new Array(n + 1).fill(null);

  yield {
    state: snap(dp), line: 'INIT', vars: { size: n + 1 },
    note: `Building a table of ${n + 1} ${n + 1 === 1 ? 'answer' : 'answers'}, bottom-up. Every cell starts empty.`,
  };

  dp[0] = 0;
  yield {
    state: snap(dp), line: 'BASE', vars: { i: 0, value: 0 },
    marks: [{ kind: 'done', at: { t: 'index', i: 0 } }],
    note: `dp[0] = 0. A base case, filled directly rather than computed.`,
  };

  if (n >= 1) {
    dp[1] = 1;
    yield {
      state: snap(dp), line: 'BASE', vars: { i: 1, value: 1 },
      marks: [{ kind: 'done', at: { t: 'index', i: 1 } }],
      note: `dp[1] = 1. The second base case.`,
    };
  }

  for (let i = 2; i <= n; i++) {
    yield {
      state: snap(dp), line: 'READ', vars: { i },
      marks: [
        { kind: 'compare', at: { t: 'index', i: i - 1 } },
        { kind: 'compare', at: { t: 'index', i: i - 2 } },
      ],
      note: `To fill dp[${i}], look up dp[${i - 1}] and dp[${i - 2}] — both already computed.`,
    };

    const value = dp[i - 1]! + dp[i - 2]!;
    dp[i] = value;
    yield {
      state: snap(dp), line: 'FILL', vars: { i, value },
      marks: [{ kind: 'done', at: { t: 'index', i } }],
      note: `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${value}.`,
    };
  }

  yield {
    state: snap(dp), line: 'DONE', vars: { result: dp[n]! },
    marks: [{ kind: 'done', at: { t: 'range', from: 0, to: n } }],
    note: `fib(${n}) = ${dp[n]}. Each subproblem was computed exactly once.`,
  };
};
