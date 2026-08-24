// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { linkedList } from '../src/algorithms/linked-list.js';
import { runConformance } from './conformance.js';

// Same shape as arrayBasics' arbitrary (packages/viz-core/test/array-basics.conformance.test.ts)
// — this lesson deliberately mirrors array-basics' input so the two can be compared
// directly. Matches the registry's inputSchema, including both cross-field refines.
const insertScenario = fc
  .array(fc.integer({ min: -99, max: 99 }), { minLength: 1, maxLength: 32 })
  .chain((arr) =>
    fc.record({
      arr: fc.constant(arr),
      readIndex: fc.integer({ min: 0, max: arr.length - 1 }),
      insertAt: fc.integer({ min: 0, max: arr.length }),
      value: fc.integer({ min: -99, max: 99 }),
    }),
  );

runConformance({
  name: 'linkedList',
  algorithm: linkedList,
  arbitrary: insertScenario,
  supportedTargets: ['index', 'edge'],
  mutate: (input) => { input.arr[0] = 999; },
});

test('the final chain is the input with the value spliced in at insertAt', () => {
  fc.assert(
    fc.property(insertScenario, ({ arr, readIndex, insertAt, value }) => {
      const last = collect(linkedList({ arr, readIndex, insertAt, value })).frames.at(-1)!;
      const expected = [...arr];
      expected.splice(insertAt, 0, value);
      expect((last.state as { values: number[] }).values).toEqual(expected);
    }),
  );
});

test('the number of STEP frames (reading) equals readIndex — one hop per pointer chase', () => {
  fc.assert(
    fc.property(insertScenario, ({ arr, readIndex, insertAt, value }) => {
      const { frames } = collect(linkedList({ arr, readIndex, insertAt, value }));
      expect(frames.filter((f) => f.line === 'STEP')).toHaveLength(readIndex);
    }),
  );
});

test('the number of LOCATE frames (inserting) equals insertAt, and INSERT rewires exactly one edge', () => {
  fc.assert(
    fc.property(insertScenario, ({ arr, readIndex, insertAt, value }) => {
      const { frames } = collect(linkedList({ arr, readIndex, insertAt, value }));
      expect(frames.filter((f) => f.line === 'LOCATE')).toHaveLength(insertAt);
      const insert = frames.find((f) => f.line === 'INSERT')!;
      expect(insert.marks).toHaveLength(1);
      expect(insert.marks![0]!.kind).toBe('swap');
    }),
  );
});

test('reading the head takes zero hops', () => {
  const { frames } = collect(linkedList({ arr: [4, 8, 15], readIndex: 0, insertAt: 0, value: 99 }));
  expect(frames.filter((f) => f.line === 'STEP')).toHaveLength(0);
});

test('inserting at the head rewires no existing edge — the new node becomes head', () => {
  const { frames } = collect(linkedList({ arr: [4, 8, 15], readIndex: 0, insertAt: 0, value: 99 }));
  const insert = frames.find((f) => f.line === 'INSERT')!;
  expect(insert.marks![0]!.at).toEqual({ t: 'index', i: 0 });
  const last = frames.at(-1)!;
  expect((last.state as { values: number[] }).values).toEqual([99, 4, 8, 15]);
});

test('appending at the tail leaves the previous last node pointing at the new one', () => {
  const { frames } = collect(linkedList({ arr: [4, 8, 15], readIndex: 2, insertAt: 3, value: 99 }));
  const last = frames.at(-1)!;
  const state = last.state as { values: number[]; edges: { from: number; to: number }[] };
  expect(state.values).toEqual([4, 8, 15, 99]);
  expect(state.edges).toContainEqual({ from: 2, to: 3 });
});

test('linkedList does not mutate its input array', () => {
  const arr = [4, 8, 15, 16, 23, 42];
  const copy = [...arr];
  collect(linkedList({ arr, readIndex: 3, insertAt: 1, value: 9 }));
  expect(arr).toEqual(copy);
});
