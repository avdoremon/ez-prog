// A new file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids a content PR from editing a file that already
// exists under packages/, and §4.1 points new algorithms here instead.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { hashTable } from '../src/algorithms/hash-table.js';
import { runConformance } from './conformance.js';

// Matches the registry's inputSchema for 'hash-table'
// (apps/web/src/viz/registry.ts).
const tableInput = fc.record({
  keys: fc.array(fc.integer({ min: -99, max: 99 }), { minLength: 1, maxLength: 16 }),
  capacity: fc.integer({ min: 2, max: 16 }),
  lookup: fc.integer({ min: -99, max: 99 }),
});

runConformance({
  name: 'hashTable',
  algorithm: hashTable,
  arbitrary: tableInput,
  supportedTargets: ['index', 'range'],
  mutate: (input) => { input.keys[0] = 999; input.lookup = 999; },
});

const finalState = (input: { keys: number[]; capacity: number; lookup: number }) =>
  collect(hashTable(input)).frames.at(-1)!.state as (number | null)[];

const framesOf = (input: { keys: number[]; capacity: number; lookup: number }) =>
  collect(hashTable(input)).frames;

test('the table always has exactly `capacity` slots', () => {
  // Open addressing means the array IS the table: it never grows, and an
  // empty slot still occupies a position. That is what makes a probe
  // sequence meaningful, so it must hold on every frame, not just the last.
  fc.assert(fc.property(tableInput, (input) => {
    for (const f of framesOf(input)) {
      expect((f.state as (number | null)[]).length).toBe(input.capacity);
    }
  }));
});

test('every key that was placed is still in the table at the end', () => {
  fc.assert(fc.property(tableInput, (input) => {
    const placed = framesOf(input)
      .filter((f) => f.line === 'PLACE')
      .map((f) => (f.vars as { key: number }).key);
    const stored = finalState(input).filter((v): v is number => v !== null);
    expect([...stored].sort((a, b) => a - b)).toEqual([...placed].sort((a, b) => a - b));
  }));
});

test('a key is stored at most once, however many times it is inserted', () => {
  // A table is a set, not a bag. Without the EXISTS check, a repeated key
  // walks past the copy already there and stores a second one.
  fc.assert(fc.property(tableInput, (input) => {
    const stored = finalState(input).filter((v): v is number => v !== null);
    expect(new Set(stored).size).toBe(stored.length);
  }));
});

test('re-inserting a key a FULL table already holds is a no-op, not a failure', () => {
  // The ordering trap: answering "is the table full?" before walking would
  // report FULL for a key the table already contains, which is wrong.
  const input = { keys: [1, 2, 3, 1], capacity: 3, lookup: 1 };
  const lines = framesOf(input).map((f) => f.line);
  expect(lines).toContain('EXISTS');
  expect(lines).not.toContain('FULL');
  expect(finalState(input).filter((v) => v !== null)).toHaveLength(3);
});

test('a genuinely new key meeting a full table reports FULL', () => {
  const input = { keys: [1, 2, 3, 4], capacity: 3, lookup: 4 };
  expect(framesOf(input).map((f) => f.line)).toContain('FULL');
});

test('0 is stored as a key, not mistaken for an empty slot', () => {
  // The reason ArrayView had to learn about null (commit a5b62f5). Under a
  // sentinel scheme this case is unrepresentable.
  const state = finalState({ keys: [0], capacity: 4, lookup: 0 });
  expect(state).toContain(0);
  expect(state.filter((v) => v === null)).toHaveLength(3);
  expect(framesOf({ keys: [0], capacity: 4, lookup: 0 }).map((f) => f.line)).toContain('DONE');
});

test('a negative key hashes into range rather than off the front', () => {
  // JS % yields a negative remainder for a negative left operand, so a bare
  // `key % capacity` would index before slot 0 and silently store nothing.
  fc.assert(fc.property(
    fc.array(fc.integer({ min: -99, max: -1 }), { minLength: 1, maxLength: 8 }),
    fc.integer({ min: 2, max: 16 }),
    (keys, capacity) => {
      const frames = framesOf({ keys, capacity, lookup: keys[0]! });
      for (const f of frames) {
        const slot = (f.vars as { slot?: number }).slot;
        if (slot !== undefined) {
          expect(slot).toBeGreaterThanOrEqual(0);
          expect(slot).toBeLessThan(capacity);
        }
      }
    },
  ));
});

test('a lookup retraces the insert walk and finds a displaced key', () => {
  // The registry defaultInput. 19 collides at slot 5 and is displaced to slot
  // 0 by wrapping; the lesson's whole point is that a displaced key is not at
  // its own hash, so the lookup must walk the identical path to find it.
  const input = { keys: [12, 25, 37, 6, 19], capacity: 7, lookup: 19 };
  const frames = framesOf(input);
  expect(finalState(input)).toEqual([19, null, 37, null, 25, 12, 6]);

  const placed = frames.find(
    (f) => f.line === 'PLACE' && (f.vars as { key: number }).key === 19,
  )!;
  const found = frames.at(-1)!;
  expect(found.line).toBe('DONE');
  // Found where it was actually put, not where it hashed to.
  expect((found.vars as { slot: number }).slot).toBe((placed.vars as { slot: number }).slot);
  expect((found.vars as { slot: number }).slot).not.toBe(19 % 7);
});

test('a miss stops at the first empty slot instead of scanning the table', () => {
  // This is why a deletion cannot simply blank a slot, and why the lesson
  // says so: the empty slot is what terminates the search.
  const input = { keys: [12, 25, 37, 6, 19], capacity: 7, lookup: 3 };
  const last = framesOf(input).at(-1)!;
  expect(last.line).toBe('MISS');
  expect((last.vars as { checked: number }).checked).toBeLessThan(7);
});

test('hashTable does not mutate its input', () => {
  const keys = [12, 25, 37, 6, 19];
  const copy = [...keys];
  collect(hashTable({ keys, capacity: 7, lookup: 19 }));
  expect(keys).toEqual(copy);
});
