import { expect, test } from 'vitest';
import { parseAnchors } from '../src/anchors.js';

test('extracts a C-style anchor and strips it from the display source', () => {
  const { display, anchors } = parseAnchors('lo = mid + 1;   // @anchor DISCARD_LEFT');
  expect(anchors).toEqual({ DISCARD_LEFT: 1 });
  expect(display).toBe('lo = mid + 1;');
});

test('extracts a hash-style anchor for Python', () => {
  const { display, anchors } = parseAnchors('lo = mid + 1    # @anchor DISCARD_LEFT');
  expect(anchors).toEqual({ DISCARD_LEFT: 1 });
  expect(display).toBe('lo = mid + 1');
});

test('records one-indexed line numbers', () => {
  const src = ['int lo = 0;', 'int hi = n - 1;  // @anchor INIT'].join('\n');
  expect(parseAnchors(src).anchors).toEqual({ INIT: 2 });
});

test('leaves lines without anchors untouched', () => {
  const src = 'int mid = (lo + hi) / 2;  // ordinary comment';
  const { display, anchors } = parseAnchors(src);
  expect(display).toBe(src);
  expect(anchors).toEqual({});
});

test('supports multiple anchors in one file', () => {
  const src = ['a();  // @anchor ONE', 'b();', 'c();  // @anchor TWO'].join('\n');
  expect(parseAnchors(src).anchors).toEqual({ ONE: 1, TWO: 3 });
});

test('rejects duplicate anchor ids', () => {
  const src = ['a();  // @anchor DUP', 'b();  // @anchor DUP'].join('\n');
  expect(() => parseAnchors(src)).toThrow(/duplicate anchor DUP/);
});

test('ignores lowercase ids so prose comments are not captured', () => {
  const { anchors } = parseAnchors('a();  // @anchor notAnAnchor');
  expect(anchors).toEqual({});
});
