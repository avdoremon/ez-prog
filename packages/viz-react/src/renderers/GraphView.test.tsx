import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import type { GraphState } from '@cs/viz-core';
import { GraphView } from './GraphView.js';

const graph: GraphState = {
  values: [0, 1, 2, 3],
  edges: [
    { from: 0, to: 1 },
    { from: 0, to: 2 },
    { from: 1, to: 3, weight: 7 },
  ],
};

test('lists every node with its index', () => {
  render(<GraphView state={graph} label="demo" />);
  expect(screen.getByRole('list', { name: 'demo' })).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
});

test('shows each node its neighbours, so the structure is readable as text', () => {
  render(<GraphView state={graph} label="demo" />);
  const node0 = screen.getByRole('listitem', { name: /node 0/i });
  expect(node0).toHaveTextContent('1');
  expect(node0).toHaveTextContent('2');
});

test('index marks apply to nodes, exactly as in the other renderers', () => {
  render(
    <GraphView state={graph} label="demo" marks={[{ kind: 'visited', at: { t: 'index', i: 2 } }]} />,
  );
  expect(screen.getByRole('listitem', { name: /node 2.*visited/i })).toBeInTheDocument();
});

test('an edge mark highlights that edge in both directions of an undirected graph', () => {
  const { container } = render(
    <GraphView
      state={graph}
      label="demo"
      marks={[{ kind: 'active', at: { t: 'edge', from: 0, to: 1 } }]}
    />,
  );
  const marked = container.querySelectorAll('.graph-view__edge[data-marks~="active"]');
  // Undirected: the edge appears under node 0 and under node 1.
  expect(marked).toHaveLength(2);
});

test('a directed graph marks only the stated direction', () => {
  const { container } = render(
    <GraphView
      state={{ ...graph, directed: true }}
      label="demo"
      marks={[{ kind: 'active', at: { t: 'edge', from: 0, to: 1 } }]}
    />,
  );
  expect(container.querySelectorAll('.graph-view__edge[data-marks~="active"]')).toHaveLength(1);
});

test('weights are shown at both ends of an undirected edge', () => {
  // The 1—3 edge is one edge listed twice, once under each endpoint, so its
  // weight legitimately appears twice. Asserting a single match would have
  // been asserting the wrong thing.
  const { container } = render(<GraphView state={graph} label="demo" />);
  const weights = [...container.querySelectorAll('.graph-view__weight')].map(
    (w) => w.textContent?.trim(),
  );
  expect(weights).toEqual(['(7)', '(7)']);
});

test('a node with no neighbours says so rather than rendering blank', () => {
  render(<GraphView state={{ values: [0, 1], edges: [] }} label="demo" />);
  expect(screen.getAllByText('none')).toHaveLength(2);
});
