// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { arrayBasics } from '../src/algorithms/array-basics.js';
import { runConformance } from './conformance.js';

// Matches the registry's inputSchema, including both cross-field refines.
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
  name: 'arrayBasics',
  algorithm: arrayBasics,
  arbitrary: insertScenario,
  supportedTargets: ['index', 'range'],
  mutate: (input) => { input.arr[0] = 999; },
});

test('the final array is the input with the value spliced in', () => {
  fc.assert(
    fc.property(insertScenario, ({ arr, readIndex, insertAt, value }) => {
      const last = collect(arrayBasics({ arr, readIndex, insertAt, value })).frames.at(-1)!;
      const expected = [...arr];
      expected.splice(insertAt, 0, value);
      expect(last.state).toEqual(expected);
    }),
  );
});

test('the number of shift frames equals the number of displaced values', () => {
  // This is the lesson's claim: inserting at the front shifts everything,
  // appending at the end shifts nothing.
  fc.assert(
    fc.property(insertScenario, ({ arr, readIndex, insertAt, value }) => {
      const { frames } = collect(arrayBasics({ arr, readIndex, insertAt, value }));
      const shifts = frames.filter((f) => f.line === 'SHIFT').length;
      expect(shifts).toBe(arr.length - insertAt);
    }),
  );
});

test('appending at the end shifts nothing', () => {
  const arr = [4, 8, 15];
  const { frames } = collect(
    arrayBasics({ arr, readIndex: 0, insertAt: arr.length, value: 99 }),
  );
  expect(frames.filter((f) => f.line === 'SHIFT')).toHaveLength(0);
  expect(frames.at(-1)!.state).toEqual([4, 8, 15, 99]);
});

test('arrayBasics does not mutate its input', () => {
  const arr = [4, 8, 15, 16, 23, 42];
  const copy = [...arr];
  collect(arrayBasics({ arr, readIndex: 3, insertAt: 1, value: 9 }));
  expect(arr).toEqual(copy);
});
