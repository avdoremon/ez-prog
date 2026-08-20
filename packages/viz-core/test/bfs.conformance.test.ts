// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { bfs } from '../src/algorithms/bfs.js';
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
  name: 'bfs',
  algorithm: bfs,
  arbitrary: graphInput,
  supportedTargets: ['index', 'range', 'edge'],
  mutate: (input) => { input.start = 0; input.values[0] = 999; },
});

/** Shortest-path distances from `start`, computed independently. */
function distances(n: number, edges: { from: number; to: number }[], start: number) {
  const dist = new Map<number, number>([[start, 0]]);
  const q = [start];
  while (q.length) {
    const node = q.shift()!;
    for (const e of edges) {
      const next = e.from === node ? e.to : e.to === node ? e.from : null;
      if (next === null || dist.has(next)) continue;
      dist.set(next, dist.get(node)! + 1);
      q.push(next);
    }
  }
  return dist;
}

test('visits every reachable node exactly once', () => {
  fc.assert(
    fc.property(graphInput, ({ values, edges, start }) => {
      const visits = collect(bfs({ values, edges, start })).frames
        .filter((f) => f.line === 'DEQUEUE')
        .map((f) => (f.vars as { node: number }).node);
      const reachable = distances(values.length, edges, start);
      expect(new Set(visits).size).toBe(visits.length);
      expect(new Set(visits)).toEqual(new Set(reachable.keys()));
    }),
  );
});

test('nodes come out in non-decreasing distance order — the shortest-path property', () => {
  // This is what makes BFS worth teaching, and it is entirely a consequence of
  // the queue being FIFO. A stack here would break it.
  fc.assert(
    fc.property(graphInput, ({ values, edges, start }) => {
      const depths = collect(bfs({ values, edges, start })).frames
        .filter((f) => f.line === 'DEQUEUE')
        .map((f) => (f.vars as { depth: number }).depth);
      for (let i = 1; i < depths.length; i++) {
        expect(depths[i]!).toBeGreaterThanOrEqual(depths[i - 1]!);
      }
    }),
  );
});

test('reported depths match independently computed shortest distances', () => {
  fc.assert(
    fc.property(graphInput, ({ values, edges, start }) => {
      const dist = distances(values.length, edges, start);
      for (const f of collect(bfs({ values, edges, start })).frames) {
        if (f.line !== 'DEQUEUE') continue;
        const { node, depth } = f.vars as { node: number; depth: number };
        expect(depth).toBe(dist.get(node));
      }
    }),
  );
});

test('a cycle is not re-entered', () => {
  // 0-1-2-0 is a triangle: without the seen check this would never terminate.
  const { frames } = collect(
    bfs({
      values: [0, 1, 2],
      edges: [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 0 }],
      start: 0,
    }),
  );
  expect(frames.filter((f) => f.line === 'DEQUEUE')).toHaveLength(3);
  expect(frames.some((f) => f.line === 'SKIP')).toBe(true);
});

test('unreachable nodes are never visited', () => {
  const { frames } = collect(
    bfs({ values: [0, 1, 2], edges: [{ from: 0, to: 1 }], start: 0 }),
  );
  const last = frames.at(-1)!;
  expect((last.vars as { reached: number }).reached).toBe(2);
});
