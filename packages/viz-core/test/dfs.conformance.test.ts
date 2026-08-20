// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { bfs } from '../src/algorithms/bfs.js';
import { dfs } from '../src/algorithms/dfs.js';
import { runConformance } from './conformance.js';

const graphInput = fc
  .integer({ min: 1, max: 10 })
  .chain((n) =>
    fc.record({
      values: fc.constant(Array.from({ length: n }, (_, i) => i)),
      edges: fc.array(
        fc.record({
          from: fc.integer({ min: 0, max: n - 1 }),
          to: fc.integer({ min: 0, max: n - 1 }),
        }),
        { maxLength: 20 },
      ),
      start: fc.integer({ min: 0, max: n - 1 }),
    }),
  );

runConformance({
  name: 'dfs',
  algorithm: dfs,
  arbitrary: graphInput,
  supportedTargets: ['index', 'range', 'edge'],
  mutate: (input) => { input.start = 0; input.values[0] = 999; },
});

const visitsOf = (frames: { line?: string; vars?: unknown }[], line: string) =>
  frames.filter((f) => f.line === line).map((f) => (f.vars as { node: number }).node);

test('visits every reachable node exactly once', () => {
  fc.assert(
    fc.property(graphInput, ({ values, edges, start }) => {
      const visits = visitsOf(collect(dfs({ values, edges, start })).frames, 'POP');
      expect(new Set(visits).size).toBe(visits.length);
    }),
  );
});

test('reaches exactly the same set of nodes as BFS', () => {
  // Same graph, same start: the two differ in the ORDER they visit, never in
  // WHICH nodes are reachable. That is the claim the lesson makes.
  fc.assert(
    fc.property(graphInput, ({ values, edges, start }) => {
      const d = new Set(visitsOf(collect(dfs({ values, edges, start })).frames, 'POP'));
      const b = new Set(visitsOf(collect(bfs({ values, edges, start })).frames, 'DEQUEUE'));
      expect(d).toEqual(b);
    }),
  );
});

test('unlike BFS, depth is not monotonic — it dives and backtracks', () => {
  // A path 0-1-2-3 with a branch 0-4: BFS takes 4 second, DFS takes it last.
  const graph = {
    values: [0, 1, 2, 3, 4],
    edges: [
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }, { from: 0, to: 4 },
    ],
    start: 0,
  };
  const dfsOrder = visitsOf(collect(dfs(graph)).frames, 'POP');
  const bfsOrder = visitsOf(collect(bfs(graph)).frames, 'DEQUEUE');
  expect(bfsOrder).toEqual([0, 1, 4, 2, 3]); // ring by ring
  expect(dfsOrder).toEqual([0, 4, 1, 2, 3]); // dives down one branch first
  expect(dfsOrder).not.toEqual(bfsOrder);
});

test('a cycle is not re-entered', () => {
  const { frames } = collect(
    dfs({
      values: [0, 1, 2],
      edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 }],
      start: 0,
    }),
  );
  expect(frames.filter((f) => f.line === 'POP')).toHaveLength(3);
  expect(frames.some((f) => f.line === 'SKIP')).toBe(true);
});
