import { expect, test } from 'vitest';
import { collect, MAX_FRAMES } from '../src/collect.js';
import type { Frame } from '../src/types.js';

function* counter(n: number): Generator<Frame<number>> {
  for (let i = 0; i < n; i++) yield { state: i, note: `step ${i}` };
}

function* endless(): Generator<Frame<number>> {
  for (let i = 0; ; i++) yield { state: i, note: `step ${i}` };
}

test('MAX_FRAMES is 1500', () => {
  expect(MAX_FRAMES).toBe(1500);
});

test('collects every frame when under the cap', () => {
  const { frames, truncated } = collect(counter(5), 10);
  expect(frames).toHaveLength(5);
  expect(truncated).toBe(false);
});

test('a generator exactly at the cap is not truncated', () => {
  const { frames, truncated } = collect(counter(10), 10);
  expect(frames).toHaveLength(10);
  expect(truncated).toBe(false);
});

test('exceeding the cap appends one explanatory frame', () => {
  const { frames, truncated } = collect(counter(50), 10);
  expect(truncated).toBe(true);
  expect(frames).toHaveLength(11);
  expect(frames.at(-1)!.note).toContain('stopped after 10 steps');
});

test('an endless generator terminates instead of hanging', () => {
  const { frames, truncated } = collect(endless(), 20);
  expect(truncated).toBe(true);
  expect(frames).toHaveLength(21);
});

test('the truncation frame carries a non-empty note', () => {
  const { frames } = collect(counter(50), 10);
  expect(frames.at(-1)!.note.length).toBeGreaterThan(0);
});

test('a non-positive cap is rejected', () => {
  expect(() => collect(counter(5), 0)).toThrow(RangeError);
  expect(() => collect(counter(5), 1.5)).toThrow(RangeError);
});
