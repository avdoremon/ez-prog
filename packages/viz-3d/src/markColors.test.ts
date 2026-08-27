import { expect, test } from 'vitest';
import { colorForMarks } from './markColors.js';

test('returns the default muted color for no marks', () => {
  expect(colorForMarks([])).toBe('#7A8493');
});

test('maps cursor to the signal color', () => {
  expect(colorForMarks(['cursor'])).toBe('#B58415');
});

test('maps done to the commit color', () => {
  expect(colorForMarks(['done'])).toBe('#369E71');
});

test('maps discard to the discard color', () => {
  expect(colorForMarks(['discard'])).toBe('#E5654B');
});

test('returns the first matching mark color when multiple marks are present', () => {
  expect(colorForMarks(['visited', 'done'])).toBe('#2F93E2');
});
