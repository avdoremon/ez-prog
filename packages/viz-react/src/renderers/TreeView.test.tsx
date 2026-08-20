import { render, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { TreeView } from './TreeView.js';

// Index i's children are 2i+1 and 2i+2 — the mapping the Heaps lesson uses.
const heap = [42, 23, 16, 4, 8, 15];

test('nests children under their parent by index arithmetic', () => {
  render(<TreeView state={heap} label="demo" />);
  const root = screen.getByRole('treeitem', { name: /^42, index 0/ });
  const children = within(root).getAllByRole('treeitem');
  // 23 (index 1) and 16 (index 2) are direct children; their own children
  // are nested deeper and also appear in this subtree query.
  expect(children.map((c) => c.getAttribute('aria-label')?.split(',')[0]))
    .toEqual(['23', '4', '8', '16', '15']);
});

test('a leaf is not marked expandable', () => {
  render(<TreeView state={heap} label="demo" />);
  const leaf = screen.getByRole('treeitem', { name: /^4, index 3/ });
  expect(leaf).not.toHaveAttribute('aria-expanded');
});

test('marks resolve to the same indexes ArrayView would use', () => {
  render(
    <TreeView
      state={heap}
      label="demo"
      marks={[
        { kind: 'compare', at: { t: 'index', i: 1 } },
        { kind: 'done', at: { t: 'range', from: 3, to: 4 } },
      ]}
    />,
  );
  expect(screen.getByRole('treeitem', { name: /^23, index 1, compare/ })).toBeInTheDocument();
  expect(screen.getByRole('treeitem', { name: /^4, index 3, done/ })).toBeInTheDocument();
  expect(screen.getByRole('treeitem', { name: /^8, index 4, done/ })).toBeInTheDocument();
  // Index 5 was outside the range and must stay unmarked.
  expect(screen.getByRole('treeitem', { name: /^15, index 5$/ })).toBeInTheDocument();
});

test('every marked node carries a text tag, not colour alone', () => {
  const { container } = render(
    <TreeView state={heap} label="demo" marks={[{ kind: 'swap', at: { t: 'index', i: 2 } }]} />,
  );
  const tags = [...container.querySelectorAll('.tree-view__tag')].map((t) => t.textContent);
  expect(tags).toEqual(['swap']);
});

test('an empty tree renders a labelled placeholder rather than an empty list', () => {
  render(<TreeView state={[]} label="demo" />);
  expect(screen.getByText(/demo: empty/i)).toBeInTheDocument();
  expect(screen.queryByRole('tree')).not.toBeInTheDocument();
});
