// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { stack, type StackOp } from '../src/algorithms/stack.js';
import { runConformance } from './conformance.js';

// Matches the registry's inputSchema for 'stack': numbers push, null pops.
const opsInput = fc.record({
  ops: fc.array(
    fc.oneof(fc.integer({ min: -99, max: 99 }), fc.constant(null)),
    { minLength: 1, maxLength: 40 },
  ) as fc.Arbitrary<StackOp[]>,
});

runConformance({
  name: 'stack',
  algorithm: stack,
  arbitrary: opsInput,
  supportedTargets: ['index', 'range'],
  mutate: (input) => { input.ops[0] = 999; },
});

function referenceStack(ops: StackOp[]): number[] {
  const out: number[] = [];
  for (const op of ops) {
    if (op !== null) out.push(op);
    else out.pop();
  }
  return out;
}

test('the final state matches a plain array used as a stack', () => {
  fc.assert(
    fc.property(opsInput, ({ ops }) => {
      const last = collect(stack({ ops })).frames.at(-1)!;
      expect(last.state).toEqual(referenceStack(ops));
    }),
  );
});

test('popping always removes the most recently pushed value', () => {
  const ops: StackOp[] = [4, 8, 15, null, 16, null, null, 23];
  const popped = collect(stack({ ops })).frames
    .filter((f) => f.line === 'POP')
    .map((f) => (f.vars as { top: number }).top);
  // 15 was pushed after 8, and 16 after 15, so they leave in that order.
  expect(popped).toEqual([15, 16, 8]);
});

test('popping an empty stack is reported, not crashed or skipped silently', () => {
  const { frames } = collect(stack({ ops: [null, 7] }));
  const empty = frames.filter((f) => f.line === 'EMPTY');
  expect(empty).toHaveLength(1);
  expect(empty[0]!.state).toEqual([]);
  expect(frames.at(-1)!.state).toEqual([7]);
});

test('a pop frame still shows the value that is about to leave', () => {
  // The frame is emitted before the removal so the departing cell can be
  // marked; the shorter stack shows up in the next frame.
  const { frames } = collect(stack({ ops: [5, null] }));
  const pop = frames.find((f) => f.line === 'POP')!;
  expect(pop.state).toEqual([5]);
  expect(pop.marks?.[0]?.kind).toBe('discard');
  expect(frames.at(-1)!.state).toEqual([]);
});
