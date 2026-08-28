import { expect, test } from 'vitest';
import {
  describeNeighbors, marksForEdge, marksForNode, neighborsOf,
} from './graphAccessibility.js';

test('neighborsOf finds both directions on an undirected graph', () => {
  const values = [10, 20, 30];
  const edges = [{ from: 0, to: 1 }, { from: 2, to: 0 }];
  expect(neighborsOf(0, values, edges, false)).toEqual([
    { to: 1, value: 20, weight: undefined },
    { to: 2, value: 30, weight: undefined },
  ]);
});

test('neighborsOf follows direction only when the graph is directed', () => {
  const values = [10, 20];
  const edges = [{ from: 0, to: 1 }];
  expect(neighborsOf(1, values, edges, true)).toEqual([]);
  expect(neighborsOf(0, values, edges, true)).toEqual([
    { to: 1, value: 20, weight: undefined },
  ]);
});

test('describeNeighbors lists plain undirected neighbours', () => {
  expect(describeNeighbors([{ to: 1, value: 20 }, { to: 2, value: 30 }], false))
    .toBe('neighbours 20, 30');
});

test('describeNeighbors reports isolation', () => {
  expect(describeNeighbors([], false)).toBe('no neighbours');
  expect(describeNeighbors([], true)).toBe('points at nothing');
});

test('describeNeighbors includes weights when present', () => {
  expect(describeNeighbors([{ to: 1, value: 20, weight: 5 }], false))
    .toBe('neighbours 20 (weight 5)');
});

test('describeNeighbors uses directed wording', () => {
  expect(describeNeighbors([{ to: 1, value: 20 }], true)).toBe('points at 20');
});

test('marksForNode filters to index-targeted marks for the given node', () => {
  const marks = [
    { kind: 'cursor' as const, at: { t: 'index' as const, i: 0 } },
    { kind: 'visited' as const, at: { t: 'index' as const, i: 1 } },
  ];
  expect(marksForNode(marks, 0)).toEqual(['cursor']);
});

test('marksForEdge lights up an undirected edge under either endpoint order', () => {
  const marks = [{ kind: 'active' as const, at: { t: 'edge' as const, from: 1, to: 0 } }];
  expect(marksForEdge(marks, 0, 1, false)).toEqual(['active']);
});

test('marksForEdge respects direction on a directed graph', () => {
  const marks = [{ kind: 'active' as const, at: { t: 'edge' as const, from: 1, to: 0 } }];
  expect(marksForEdge(marks, 0, 1, true)).toEqual([]);
  expect(marksForEdge(marks, 1, 0, true)).toEqual(['active']);
});
