// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { greedyCoins } from '../src/algorithms/greedy-coins.js';
import { runConformance } from './conformance.js';

// Matches the registry's inputSchema for 'greedy-coins'.
const coinsInput = fc.record({
  coins: fc.uniqueArray(fc.integer({ min: 1, max: 50 }), { minLength: 1, maxLength: 12 }),
  amount: fc.integer({ min: 1, max: 200 }),
});

runConformance({
  name: 'greedyCoins',
  algorithm: greedyCoins,
  arbitrary: coinsInput,
  supportedTargets: ['index', 'range'],
  mutate: (input) => { input.coins[0] = 999; },
});

/** What the greedy rule should produce, computed independently. */
function greedyReference(coins: number[], amount: number) {
  let remaining = amount;
  let used = 0;
  for (const coin of [...coins].sort((a, b) => b - a)) {
    while (coin <= remaining) {
      remaining -= coin;
      used++;
    }
  }
  return { remaining, used };
}

test('the run matches an independent greedy implementation', () => {
  fc.assert(
    fc.property(coinsInput, ({ coins, amount }) => {
      const last = collect(greedyCoins({ coins, amount })).frames.at(-1)!;
      const { remaining, used } = last.vars as { remaining: number; used: number };
      expect({ remaining, used }).toEqual(greedyReference(coins, amount));
    }),
  );
});

test('a coin containing a 1 always reaches exactly zero', () => {
  fc.assert(
    fc.property(
      fc.record({
        coins: fc.uniqueArray(fc.integer({ min: 2, max: 50 }), { minLength: 1, maxLength: 8 }),
        amount: fc.integer({ min: 1, max: 200 }),
      }),
      ({ coins, amount }) => {
        const last = collect(greedyCoins({ coins: [...coins, 1], amount })).frames.at(-1)!;
        expect((last.vars as { remaining: number }).remaining).toBe(0);
      },
    ),
  );
});

test('greedy is optimal on the US system but not on [4, 3, 1]', () => {
  // The lesson's whole point, pinned so the counterexample cannot rot.
  const us = collect(greedyCoins({ coins: [25, 10, 5, 1], amount: 63 })).frames.at(-1)!;
  expect((us.vars as { used: number }).used).toBe(6); // 25+25+10+1+1+1

  const bad = collect(greedyCoins({ coins: [4, 3, 1], amount: 6 })).frames.at(-1)!;
  expect((bad.vars as { used: number }).used).toBe(3); // 4+1+1
  // The optimal answer is 3+3 = 2 coins, which greedy never finds.
});

test('a system that cannot make the amount reports being stuck', () => {
  const { frames } = collect(greedyCoins({ coins: [5, 3], amount: 7 }));
  const last = frames.at(-1)!;
  expect((last.vars as { remaining: number }).remaining).toBeGreaterThan(0);
  expect(last.note).toMatch(/stuck/i);
});
