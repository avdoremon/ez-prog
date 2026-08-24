// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { recursion } from '../src/algorithms/recursion.js';
import { runConformance } from './conformance.js';

// Matches the registry's inputSchema for 'recursion'.
const nInput = fc.record({ n: fc.integer({ min: 0, max: 10 }) });

function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

runConformance({
  name: 'recursion',
  algorithm: recursion,
  arbitrary: nInput,
  supportedTargets: ['index'],
  mutate: (input) => { input.n = 999; },
});

test('the final result is n!', () => {
  fc.assert(
    fc.property(nInput, ({ n }) => {
      const last = collect(recursion({ n })).frames.at(-1)!;
      expect((last.vars as { result: number }).result).toBe(factorial(n));
    }),
  );
});

test('the number of CALL frames is max(n - 1, 0) — one push per recursive call before the base case', () => {
  fc.assert(
    fc.property(nInput, ({ n }) => {
      const { frames } = collect(recursion({ n }));
      expect(frames.filter((f) => f.line === 'CALL')).toHaveLength(Math.max(n - 1, 0));
    }),
  );
});

test('there is always exactly one BASE frame', () => {
  fc.assert(
    fc.property(nInput, ({ n }) => {
      const { frames } = collect(recursion({ n }));
      expect(frames.filter((f) => f.line === 'BASE')).toHaveLength(1);
    }),
  );
});

test('the number of RETURN frames equals the number of frames pushed', () => {
  fc.assert(
    fc.property(nInput, ({ n }) => {
      const { frames } = collect(recursion({ n }));
      const pushed = frames.filter((f) => f.line === 'CALL' || f.line === 'BASE').length;
      expect(frames.filter((f) => f.line === 'RETURN')).toHaveLength(pushed);
    }),
  );
});

test('n = 0 resolves to 1, not 0 — the base case returns 1, it does not multiply by its own argument', () => {
  const last = collect(recursion({ n: 0 })).frames.at(-1)!;
  expect((last.vars as { result: number }).result).toBe(1);
});

test('n = 1 resolves to 1', () => {
  const last = collect(recursion({ n: 1 })).frames.at(-1)!;
  expect((last.vars as { result: number }).result).toBe(1);
});

test('n = 2 resolves to 2 — a regression pin for a real bug fast-check found', () => {
  // An earlier version detected "this is the base-case frame" by checking
  // `stack.length === 1`, true only when the base case is the *only* frame
  // on the stack (n <= 1). At n = 2 the base-case frame sits on top of one
  // other frame, so that check was wrong — it returned 1 instead of 2!'s
  // correct 2. n = 0 and n = 1 alone both happen to have stack height 1 at
  // the base case, so neither would have caught this; n = 2 is the smallest
  // input that does.
  const last = collect(recursion({ n: 2 })).frames.at(-1)!;
  expect((last.vars as { result: number }).result).toBe(2);
});

test('the stack grows to height n before any RETURN frame, then drains to empty', () => {
  const { frames } = collect(recursion({ n: 5 }));
  const firstReturn = frames.findIndex((f) => f.line === 'RETURN');
  const callAndBase = frames.slice(0, firstReturn).filter((f) => f.line === 'CALL' || f.line === 'BASE');
  expect(callAndBase).toHaveLength(5);
  const last = frames.at(-1)!;
  expect((last.state as (number | null)[]).length).toBe(0);
});

test('recursion does not mutate anything about its input', () => {
  const input = { n: 5 };
  collect(recursion(input));
  expect(input).toEqual({ n: 5 });
});
