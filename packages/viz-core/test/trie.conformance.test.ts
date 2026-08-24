// New file rather than an addition to graph-intro.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { trie } from '../src/algorithms/trie.js';
import { runConformance } from './conformance.js';

// Matches the registry's inputSchema for 'trie': lowercase-only words/search.
const lowercaseWord = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 1, maxLength: 8 })
  .map((cs) => cs.join(''));

const trieInput = fc.record({
  words: fc.array(lowercaseWord, { minLength: 1, maxLength: 6 }),
  search: lowercaseWord,
});

runConformance({
  name: 'trie',
  algorithm: trie,
  arbitrary: trieInput,
  supportedTargets: ['index', 'edge'],
  mutate: (input) => { input.words[0] = 'zzz'; },
});

test('the root is always node 0, with no incoming edge', () => {
  fc.assert(
    fc.property(trieInput, ({ words, search }) => {
      const last = collect(trie({ words, search })).frames.at(-1)!;
      const state = last.state as { edges: { from: number; to: number }[] };
      expect(state.edges.every((e) => e.to !== 0)).toBe(true);
    }),
  );
});

test('inserting the same prefix twice creates no duplicate node', () => {
  const { frames } = collect(trie({ words: ['cat', 'car'], search: 'ca' }));
  const last = frames.at(-1)!;
  const state = last.state as { values: (number | string)[] };
  // root + c + a + t + r = 5 nodes, not 3 + 3 = 6.
  expect(state.values).toHaveLength(5);
});

test('a word that was inserted is found', () => {
  const { frames } = collect(trie({ words: ['cat', 'car', 'cart'], search: 'car' }));
  expect(frames.at(-1)!.note).toMatch(/found/i);
});

test("a real prefix that was never itself inserted is reported as a prefix, not found", () => {
  const { frames } = collect(trie({ words: ['cat', 'car', 'cart'], search: 'ca' }));
  const last = frames.at(-1)!;
  expect(last.note).not.toMatch(/\bfound\b/i);
  expect(last.note.toLowerCase()).toContain('prefix');
});

test('a character with no matching edge is reported as missing', () => {
  const { frames } = collect(trie({ words: ['cat', 'car'], search: 'cow' }));
  const last = frames.at(-1)!;
  expect(last.note.toLowerCase()).toMatch(/not in the trie|no edge/);
});

test('every inserted word is itself found by a search for that exact word', () => {
  fc.assert(
    fc.property(trieInput, ({ words }) => {
      for (const word of words) {
        const { frames } = collect(trie({ words, search: word }));
        expect(frames.at(-1)!.note).toMatch(/found/i);
      }
    }),
  );
});

test('trie does not mutate its input', () => {
  const input = { words: ['cat', 'car'], search: 'ca' };
  const copy = { words: [...input.words], search: input.search };
  collect(trie(input));
  expect(input).toEqual(copy);
});
