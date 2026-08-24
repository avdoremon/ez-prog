// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { dpFibonacci } from '../src/algorithms/dp-fibonacci.js';
import { runConformance } from './conformance.js';

// Matches the registry's inputSchema for 'dp-fibonacci'.
const nInput = fc.record({ n: fc.integer({ min: 0, max: 15 }) });

function fib(n: number): number {
  let a = 0;
  let b = 1;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}

runConformance({
  name: 'dpFibonacci',
  algorithm: dpFibonacci,
  arbitrary: nInput,
  supportedTargets: ['index', 'range'],
  mutate: (input) => { input.n = 999; },
});

test('the final table holds fib(n) at index n', () => {
  fc.assert(
    fc.property(nInput, ({ n }) => {
      const last = collect(dpFibonacci({ n })).frames.at(-1)!;
      const dp = last.state as (number | null)[];
      expect(dp[n]).toBe(fib(n));
    }),
  );
});

test('every cell is filled exactly once — no null survives to the final frame', () => {
  fc.assert(
    fc.property(nInput, ({ n }) => {
      const last = collect(dpFibonacci({ n })).frames.at(-1)!;
      const dp = last.state as (number | null)[];
      expect(dp).toHaveLength(n + 1);
      expect(dp.every((v) => v !== null)).toBe(true);
    }),
  );
});

test('the number of READ frames equals the number of FILL frames, both max(n - 1, 0)', () => {
  fc.assert(
    fc.property(nInput, ({ n }) => {
      const { frames } = collect(dpFibonacci({ n }));
      const expected = Math.max(n - 1, 0);
      expect(frames.filter((f) => f.line === 'READ')).toHaveLength(expected);
      expect(frames.filter((f) => f.line === 'FILL')).toHaveLength(expected);
    }),
  );
});

test('n = 0 fills only dp[0] = 0, with a single BASE frame', () => {
  const { frames } = collect(dpFibonacci({ n: 0 }));
  expect(frames.filter((f) => f.line === 'BASE')).toHaveLength(1);
  const dp = frames.at(-1)!.state as (number | null)[];
  expect(dp).toEqual([0]);
});

test('n = 1 fills dp[0] = 0 and dp[1] = 1, with two BASE frames and no READ/FILL', () => {
  const { frames } = collect(dpFibonacci({ n: 1 }));
  expect(frames.filter((f) => f.line === 'BASE')).toHaveLength(2);
  expect(frames.filter((f) => f.line === 'READ' || f.line === 'FILL')).toHaveLength(0);
  const dp = frames.at(-1)!.state as (number | null)[];
  expect(dp).toEqual([0, 1]);
});

test('n = 5 produces the exact table [0, 1, 1, 2, 3, 5]', () => {
  const { frames } = collect(dpFibonacci({ n: 5 }));
  const dp = frames.at(-1)!.state as (number | null)[];
  expect(dp).toEqual([0, 1, 1, 2, 3, 5]);
});

test('each READ frame marks exactly the two cells the following FILL frame combines', () => {
  const { frames } = collect(dpFibonacci({ n: 5 }));
  for (let idx = 0; idx < frames.length - 1; idx++) {
    const read = frames[idx]!;
    if (read.line !== 'READ') continue;
    const fill = frames[idx + 1]!;
    expect(fill.line).toBe('FILL');
    const readIndexes = read.marks!.map((m) => (m.at as { i: number }).i).sort();
    const i = (fill.vars as { i: number }).i;
    expect(readIndexes).toEqual([i - 2, i - 1]);
  }
});

test('dpFibonacci does not mutate its input', () => {
  const input = { n: 6 };
  collect(dpFibonacci(input));
  expect(input).toEqual({ n: 6 });
});
