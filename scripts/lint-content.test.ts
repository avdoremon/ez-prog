import { expect, test } from 'vitest';
import { lintContent } from './lint-content.js';

const fixture = (name: string) => `scripts/fixtures/${name}`;

test('rule 1: a DSA lesson without a viz is rejected', async () => {
  const errors = await lintContent(fixture('no-viz'));
  expect(errors.map((e) => e.rule)).toContain('dsa-requires-viz');
});

test('rule 2: a prerequisite pointing at a missing slug is rejected', async () => {
  const errors = await lintContent(fixture('bad-prereq'));
  expect(errors.map((e) => e.rule)).toContain('prerequisite-exists');
});

test('rule 3: prose over 700 words is rejected', async () => {
  const errors = await lintContent(fixture('too-long'));
  expect(errors.map((e) => e.rule)).toContain('prose-word-limit');
});

test('rule 3: code blocks do NOT count toward the word limit', async () => {
  const errors = await lintContent(fixture('long-code-short-prose'));
  expect(errors.map((e) => e.rule)).not.toContain('prose-word-limit');
});

test('rule 4: a code block without a language is rejected', async () => {
  const errors = await lintContent(fixture('untagged-code'));
  expect(errors.map((e) => e.rule)).toContain('code-block-language');
});

test('rule 5: a viz id missing from the registry is rejected', async () => {
  const errors = await lintContent(fixture('unknown-viz'));
  expect(errors.map((e) => e.rule)).toContain('viz-id-exists');
});

test('rule 6: an anchor missing from one language sample is rejected', async () => {
  const errors = await lintContent(fixture('missing-anchor'));
  expect(errors.map((e) => e.rule)).toContain('anchor-coverage');
});

test('rule 7: a generator exceeding MAX_FRAMES on its default input is rejected', async () => {
  const errors = await lintContent(fixture('runaway-generator'));
  expect(errors.map((e) => e.rule)).toContain('frame-budget');
});

test('a clean lesson produces no errors', async () => {
  expect(await lintContent(fixture('clean'))).toEqual([]);
});

test('every error names a file and is human-readable', async () => {
  const errors = await lintContent(fixture('no-viz'));
  for (const e of errors) {
    expect(e.file).toBeTruthy();
    expect(e.message.length).toBeGreaterThan(10);
  }
});
