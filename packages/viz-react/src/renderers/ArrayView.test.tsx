import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { ArrayView, resolveMarks } from './ArrayView.js';

test('renders one cell per value', () => {
  render(<ArrayView state={[3, 1, 4]} label="test array" />);
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
});

test('resolveMarks maps an index target to a single cell', () => {
  const map = resolveMarks([{ kind: 'cursor', at: { t: 'index', i: 1 } }], 3);
  expect(map.get(1)).toEqual(['cursor']);
  expect(map.has(0)).toBe(false);
});

test('resolveMarks expands a range target inclusively', () => {
  const map = resolveMarks([{ kind: 'active', at: { t: 'range', from: 1, to: 3 } }], 5);
  expect([...map.keys()].sort()).toEqual([1, 2, 3]);
});

test('resolveMarks accumulates overlapping marks on one index', () => {
  const map = resolveMarks(
    [
      { kind: 'active', at: { t: 'range', from: 0, to: 2 } },
      { kind: 'cursor', at: { t: 'index', i: 1 } },
    ],
    3,
  );
  expect(map.get(1)).toEqual(['active', 'cursor']);
});

test('resolveMarks ignores out-of-bounds targets rather than throwing', () => {
  const map = resolveMarks([{ kind: 'cursor', at: { t: 'index', i: 99 } }], 3);
  expect(map.size).toBe(0);
});

test('resolveMarks throws a clear error on an unsupported target', () => {
  const bad = [{ kind: 'cursor', at: { t: 'node', id: 'a' } }] as never;
  expect(() => resolveMarks(bad, 3)).toThrow(/ArrayView cannot render target/);
});

test('marked cells carry a text label, not only colour', () => {
  render(
    <ArrayView state={[3, 1, 4]} label="test array"
      marks={[{ kind: 'compare', at: { t: 'index', i: 0 } }]} />,
  );
  expect(screen.getByText('compare')).toBeInTheDocument();
});

test('the list has an accessible name', () => {
  render(<ArrayView state={[1]} label="sorted values" />);
  expect(screen.getByRole('list', { name: 'sorted values' })).toBeInTheDocument();
});
