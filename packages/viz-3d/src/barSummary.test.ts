import { expect, test } from 'vitest';
import { buildBarSummary, resolveBarMarks } from './barSummary.js';

test('resolveBarMarks expands an index mark to just that slot', () => {
  const resolved = resolveBarMarks([{ kind: 'cursor', at: { t: 'index', i: 2 } }], 5);
  expect(resolved.get(2)).toEqual(['cursor']);
  expect(resolved.get(0)).toBeUndefined();
});

test('resolveBarMarks expands a range mark to every slot in [from, to]', () => {
  const resolved = resolveBarMarks([{ kind: 'compare', at: { t: 'range', from: 1, to: 3 } }], 5);
  expect(resolved.get(1)).toEqual(['compare']);
  expect(resolved.get(2)).toEqual(['compare']);
  expect(resolved.get(3)).toEqual(['compare']);
  expect(resolved.get(0)).toBeUndefined();
  expect(resolved.get(4)).toBeUndefined();
});

test('resolveBarMarks throws on an edge mark', () => {
  expect(() => resolveBarMarks([{ kind: 'swap', at: { t: 'edge', from: 0, to: 1 } }], 5))
    .toThrow(/cannot render an edge target/);
});

test('resolveBarMarks ignores an out-of-range index', () => {
  const resolved = resolveBarMarks([{ kind: 'cursor', at: { t: 'index', i: 99 } }], 5);
  expect(resolved.size).toBe(0);
});

test('buildBarSummary describes an empty array', () => {
  expect(buildBarSummary([])).toBe('Empty array.');
});

test('buildBarSummary describes the resting state with no marks', () => {
  expect(buildBarSummary([5, 2, 9])).toBe('Array, 3 values.');
});

test('buildBarSummary appends a description per index mark', () => {
  const summary = buildBarSummary([5, 2, 9], [{ kind: 'cursor', at: { t: 'index', i: 1 } }]);
  expect(summary).toBe('Array, 3 values. Slot 1 (value 2) is cursor.');
});

test('buildBarSummary appends a description per range mark', () => {
  const summary = buildBarSummary([5, 2, 9], [{ kind: 'done', at: { t: 'range', from: 0, to: 2 } }]);
  expect(summary).toBe('Array, 3 values. 3 slots done.');
});
