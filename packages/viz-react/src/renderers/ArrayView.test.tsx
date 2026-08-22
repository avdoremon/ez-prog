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

/*
 * Empty slots. `null` is a slot that exists and holds nothing — needed by
 * fixed-size structures where the unoccupied slots are the point, such as a
 * hash table, where a linear probe stops at the first empty slot and the load
 * factor is just how full the table looks. A sentinel number cannot express
 * it: a table of -1s reads as data.
 */
test('a null renders as a cell with no value, not as a missing cell', () => {
  render(<ArrayView state={[3, null, 4]} label="table" />);
  // Still three slots: an empty slot occupies a position, which is exactly
  // what makes a probe sequence make sense.
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
  expect(screen.queryByText('null')).not.toBeInTheDocument();
  expect(screen.queryByText('-1')).not.toBeInTheDocument();
});

test('an empty slot is announced to assistive tech, not left blank', () => {
  // A blank cell is only distinguishable visually. Without this, a screen
  // reader hears the index and nothing else, and cannot tell an empty slot
  // from one whose value failed to render.
  render(<ArrayView state={[3, null]} label="table" />);
  expect(screen.getByText('empty')).toBeInTheDocument();
});

test('a filled slot is not announced as empty', () => {
  render(<ArrayView state={[3, 4]} label="table" />);
  expect(screen.queryByText('empty')).not.toBeInTheDocument();
});

test('zero is a value, not an empty slot', () => {
  // The distinction the sentinel approach could not make. 0 hashes and stores
  // like any other key, so it must render as a value.
  //
  // Queried by class rather than by text: every cell also renders its index,
  // so getByText('0') matches the value in slot 0 AND slot 0's own index
  // label. That ambiguity is in the test, not the component.
  const { container } = render(<ArrayView state={[0]} label="table" />);
  expect(container.querySelector('.array-view__value')).toHaveTextContent('0');
  expect(screen.queryByText('empty')).not.toBeInTheDocument();
});

test('an empty slot can still carry a mark', () => {
  // The frame that ends a hash-table insert marks the free slot it landed on,
  // so "empty" and "marked" have to be able to coexist.
  render(
    <ArrayView state={[3, null]} label="table"
      marks={[{ kind: 'cursor', at: { t: 'index', i: 1 } }]} />,
  );
  expect(screen.getByText('cursor')).toBeInTheDocument();
  expect(screen.getByText('empty')).toBeInTheDocument();
});
