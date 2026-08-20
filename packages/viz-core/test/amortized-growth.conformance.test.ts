// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { amortizedGrowth } from '../src/algorithms/amortized-growth.js';
import { runConformance } from './conformance.js';

// Matches the registry's inputSchema for 'amortized-growth'.
const growthInput = fc.record({
  count: fc.integer({ min: 1, max: 32 }),
  initialCapacity: fc.integer({ min: 1, max: 16 }),
});

runConformance({
  name: 'amortizedGrowth',
  algorithm: amortizedGrowth,
  arbitrary: growthInput,
  supportedTargets: ['index', 'range'],
  mutate: (input) => { input.count = 999; },
});

test('every value is appended exactly once, in order', () => {
  fc.assert(
    fc.property(growthInput, ({ count, initialCapacity }) => {
      const last = collect(amortizedGrowth({ count, initialCapacity })).frames.at(-1)!;
      expect(last.state).toEqual(Array.from({ length: count }, (_, i) => i + 1));
    }),
  );
});

test('total copies stay below twice the number of appends', () => {
  // The lesson's actual claim, and the reason the average append is O(1):
  // the copies form the geometric series 1 + 2 + 4 + ..., which sums to just
  // under 2n. It is emphatically NOT bounded by n — at count 5 from capacity
  // 1 the run makes 7 copies for 5 appends. The constant is 2, not 1.
  fc.assert(
    fc.property(growthInput, ({ count, initialCapacity }) => {
      const { frames } = collect(amortizedGrowth({ count, initialCapacity }));
      const copies = frames.filter((f) => f.line === 'COPY').length;
      expect(copies).toBeLessThan(2 * count);
    }),
  );
});

test('copies can exceed the append count, just never by a growing factor', () => {
  // Pins the counterexample that corrected this lesson's framing, so nobody
  // reintroduces "fewer copies than appends".
  const { frames } = collect(amortizedGrowth({ count: 5, initialCapacity: 1 }));
  expect(frames.filter((f) => f.line === 'COPY')).toHaveLength(7);
});

test('a resize only happens when the array is exactly full', () => {
  fc.assert(
    fc.property(growthInput, ({ count, initialCapacity }) => {
      for (const frame of collect(amortizedGrowth({ count, initialCapacity })).frames) {
        if (frame.line !== 'GROW') continue;
        const { size, capacity } = frame.vars as { size: number; capacity: number };
        // capacity has already doubled on this frame, so size was the old one.
        expect(size).toBe(capacity / 2);
      }
    }),
  );
});

test('16 appends from capacity 1 cost exactly 15 copies', () => {
  // 1 + 2 + 4 + 8: each resize copies what fits, and the series never
  // catches up with the append count.
  const { frames } = collect(amortizedGrowth({ count: 16, initialCapacity: 1 }));
  expect(frames.filter((f) => f.line === 'COPY')).toHaveLength(15);
  expect(frames.filter((f) => f.line === 'GROW')).toHaveLength(4);
  expect(frames.filter((f) => f.line === 'APPEND')).toHaveLength(16);
});

test('a large enough initial capacity means no resize at all', () => {
  const { frames } = collect(amortizedGrowth({ count: 8, initialCapacity: 16 }));
  expect(frames.filter((f) => f.line === 'GROW')).toHaveLength(0);
  expect(frames.filter((f) => f.line === 'COPY')).toHaveLength(0);
});
