import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

export interface RecursionInput { n: number }

/**
 * Computes n! by simulating the call stack a recursive factorial(n) actually
 * builds: each call pushes its argument and waits, base case reached, then
 * every return pops one frame and folds it into the running result. Reuses
 * ArrayView — the same stack-of-numbers shape as the stack.ts lesson — rather
 * than a dedicated stack-frame renderer, since one push per call and one pop
 * per return is the whole picture.
 *
 * The base case (n <= 1) always returns 1, never "n itself" — folding that in
 * as `n * 1` would be wrong for n = 0, whose factorial is 1, not 0.
 */
export const recursion: VizAlgorithm<RecursionInput, (number | null)[]> =
function* ({ n }): Generator<Frame<(number | null)[]>> {
  const stack: number[] = [];

  yield {
    state: snap(stack), line: 'INIT',
    note: `Computing ${n}! by recursion. Each call pushes a frame and waits for the next call to return.`,
  };

  for (let i = n; i > 1; i--) {
    stack.push(i);
    yield {
      state: snap(stack), line: 'CALL', vars: { calling: i },
      marks: [{ kind: 'active', at: { t: 'index', i: stack.length - 1 } }],
      note: `Call factorial(${i}). It needs factorial(${i - 1}) before it can finish, so this frame waits.`,
    };
  }

  const base = n > 1 ? 1 : n;
  stack.push(base);
  yield {
    state: snap(stack), line: 'BASE', vars: { calling: base },
    marks: [{ kind: 'done', at: { t: 'index', i: stack.length - 1 } }],
    note: `factorial(${base}) is the base case: it returns 1 immediately, with no further call.`,
  };

  let result = 1;
  // The base case is always the last frame pushed, so it is always the
  // first one popped — regardless of how tall the stack grew above it.
  let first = true;

  while (stack.length > 0) {
    const returning = stack[stack.length - 1]!;
    const previous = result;
    result = first ? 1 : returning * previous;
    yield {
      state: snap(stack), line: 'RETURN', vars: { returning, result },
      marks: [{ kind: 'discard', at: { t: 'index', i: stack.length - 1 } }],
      note: first
        ? `factorial(${returning}) returns 1. Nothing to multiply yet.`
        : `factorial(${returning}) returns ${returning} × ${previous} = ${result}.`,
    };
    first = false;
    stack.pop();
  }

  yield {
    state: snap(stack), line: 'DONE', vars: { result },
    note: `The stack is empty again. ${n}! = ${result}.`,
  };
};
