// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { dijkstra } from '../src/algorithms/dijkstra.js';
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
          // Matches the registry inputSchema, which forbids negative weights.
          weight: fc.integer({ min: 0, max: 20 }),
        }),
        { maxLength: 20 },
      ),
      start: fc.integer({ min: 0, max: n - 1 }),
    }),
  );

runConformance({
  name: 'dijkstra',
  algorithm: dijkstra,
  arbitrary: graphInput,
  supportedTargets: ['index', 'range', 'edge'],
  mutate: (input) => { input.start = 0; input.values[0] = 999; },
});

type Edge = { from: number; to: number; weight: number };

/**
 * Shortest-path costs from `start`, computed by Bellman-Ford — a different
 * algorithm, on purpose. Re-implementing Dijkstra here would only prove the
 * test agrees with itself.
 */
function costs(n: number, edges: Edge[], start: number) {
  const dist = Array.from({ length: n }, () => Infinity);
  dist[start] = 0;
  for (let pass = 0; pass < n; pass++) {
    for (const e of edges) {
      for (const [a, b] of [[e.from, e.to], [e.to, e.from]] as const) {
        if (dist[a]! + e.weight < dist[b]!) dist[b] = dist[a]! + e.weight;
      }
    }
  }
  return dist;
}

/** Final distances as the generator's last frame reports them. */
function finalDist(input: { values: number[]; edges: Edge[]; start: number }) {
  const last = collect(dijkstra(input)).frames.at(-1)!;
  return (last.vars as { dist: string }).dist
    .split(' ')
    .map((d) => (d === '∞' ? Infinity : Number(d)));
}

test('final distances match Bellman-Ford on the same graph', () => {
  fc.assert(
    fc.property(graphInput, (input) => {
      expect(finalDist(input)).toEqual(
        costs(input.values.length, input.edges, input.start),
      );
    }),
  );
});

test('every node is settled at most once, and only reachable ones are', () => {
  fc.assert(
    fc.property(graphInput, (input) => {
      const picked = collect(dijkstra(input)).frames
        .filter((f) => f.line === 'PICK')
        .map((f) => (f.vars as { node: number }).node);
      const reachable = costs(input.values.length, input.edges, input.start)
        .flatMap((d, i) => (d === Infinity ? [] : [i]));
      expect(new Set(picked).size).toBe(picked.length);
      expect(new Set(picked)).toEqual(new Set(reachable));
    }),
  );
});

test('nodes are settled in non-decreasing cost order — the greedy invariant', () => {
  // This is the property that lets Dijkstra declare a distance final the
  // moment it settles a node, and it is exactly what a negative edge breaks.
  fc.assert(
    fc.property(graphInput, (input) => {
      const picked = collect(dijkstra(input)).frames
        .filter((f) => f.line === 'PICK')
        .map((f) => (f.vars as { cost: number }).cost);
      for (let i = 1; i < picked.length; i++) {
        expect(picked[i]!).toBeGreaterThanOrEqual(picked[i - 1]!);
      }
    }),
  );
});

test('weight, not edge count, decides the route', () => {
  // The registry's defaultInput. Node 4 is one edge from the start at cost 9,
  // but three edges away at cost 6 — the disagreement with BFS the lesson is
  // built on. If this ever comes out as 9, the lesson's claim is wrong.
  const input = {
    values: [0, 1, 2, 3, 4, 5],
    edges: [
      { from: 0, to: 1, weight: 2 }, { from: 0, to: 2, weight: 1 },
      { from: 0, to: 4, weight: 9 }, { from: 1, to: 3, weight: 1 },
      { from: 2, to: 3, weight: 5 }, { from: 3, to: 4, weight: 3 },
      { from: 4, to: 5, weight: 2 },
    ],
    start: 0,
  };
  expect(finalDist(input)).toEqual([0, 2, 1, 3, 6, 8]);

  const frames = collect(dijkstra(input)).frames;
  const improvedTo4 = frames.flatMap((f, i) =>
    f.line === 'IMPROVE' && (f.vars as { to: number }).to === 4
      ? [{ i, via: (f.vars as { via: number }).via }]
      : [],
  );
  // Twice: the direct 9, then the cheaper 6 that replaces it. The positions
  // are asserted, not just the values, because the lesson prose cites them by
  // number ("step 5 records it at cost 9. Ten steps later..."), counting from
  // 1 as the Player's counter does. Renumber these and the prose goes stale
  // silently, so fail here instead.
  expect(improvedTo4).toEqual([{ i: 4, via: 9 }, { i: 14, via: 6 }]);
});

test('an unreachable node keeps an infinite distance and is never settled', () => {
  const { frames } = collect(
    dijkstra({
      values: [0, 1, 2],
      edges: [{ from: 0, to: 1, weight: 4 }],
      start: 0,
    }),
  );
  const last = frames.at(-1)!;
  expect((last.vars as { reached: number }).reached).toBe(2);
  expect((last.vars as { dist: string }).dist).toBe('0 4 ∞');
});

test('a zero-weight edge settles without looping', () => {
  const { frames } = collect(
    dijkstra({
      values: [0, 1, 2],
      edges: [
        { from: 0, to: 1, weight: 0 },
        { from: 1, to: 2, weight: 0 },
        { from: 2, to: 0, weight: 0 },
      ],
      start: 0,
    }),
  );
  expect(frames.filter((f) => f.line === 'PICK')).toHaveLength(3);
  expect((frames.at(-1)!.vars as { dist: string }).dist).toBe('0 0 0');
});
