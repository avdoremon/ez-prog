import { expect, test } from 'vitest';
import { buildGraphSummary } from './graphSummary.js';

test('describes an empty graph', () => {
  expect(buildGraphSummary(0, 0, false)).toBe('Empty graph.');
});

test('describes an undirected graph', () => {
  expect(buildGraphSummary(6, 6, false)).toBe('Graph, 6 nodes, 6 edges.');
});

test('describes a directed graph', () => {
  expect(buildGraphSummary(4, 4, true)).toBe('Graph, 4 nodes, 4 directed edges.');
});

test('uses singular wording for one node and one edge', () => {
  expect(buildGraphSummary(1, 1, false)).toBe('Graph, 1 node, 1 edge.');
});
