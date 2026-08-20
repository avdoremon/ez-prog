// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { queue, type QueueOp } from '../src/algorithms/queue.js';
import { runConformance } from './conformance.js';

// Matches the registry's inputSchema for 'queue': numbers enqueue, null dequeues.
const opsInput = fc.record({
  ops: fc.array(
    fc.oneof(fc.integer({ min: -99, max: 99 }), fc.constant(null)),
    { minLength: 1, maxLength: 24 },
  ) as fc.Arbitrary<QueueOp[]>,
});

runConformance({
  name: 'queue',
  algorithm: queue,
  arbitrary: opsInput,
  supportedTargets: ['index', 'range'],
  mutate: (input) => { input.ops[0] = 999; },
});

function referenceQueue(ops: QueueOp[]): number[] {
  const out: number[] = [];
  for (const op of ops) {
    if (op !== null) out.push(op);
    else out.shift();
  }
  return out;
}

test('the final state matches a plain array used as a queue', () => {
  fc.assert(
    fc.property(opsInput, ({ ops }) => {
      const last = collect(queue({ ops })).frames.at(-1)!;
      expect(last.state).toEqual(referenceQueue(ops));
    }),
  );
});

test('dequeue always returns the longest-waiting value', () => {
  const ops: QueueOp[] = [4, 8, 15, null, 16, null, 23];
  const served = collect(queue({ ops })).frames
    .filter((f) => f.line === 'DEQUEUE')
    .map((f) => (f.vars as { front: number }).front);
  // 4 arrived first, then 8 — the opposite of the stack lesson's order.
  expect(served).toEqual([4, 8]);
});

test('each dequeue costs one shift per value left behind', () => {
  // The lesson's claim: removing from the front is O(n), unlike a stack's pop.
  const { frames } = collect(queue({ ops: [1, 2, 3, 4, null] }));
  expect(frames.filter((f) => f.line === 'SHIFT')).toHaveLength(3);
});

test('dequeueing an empty queue is reported, not crashed', () => {
  const { frames } = collect(queue({ ops: [null, 7] }));
  const empty = frames.filter((f) => f.line === 'EMPTY');
  expect(empty).toHaveLength(1);
  expect(frames.at(-1)!.state).toEqual([7]);
});
