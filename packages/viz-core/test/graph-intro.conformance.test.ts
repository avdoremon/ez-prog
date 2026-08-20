// New file rather than an addition to algorithms.conformance.test.ts:
// AUTHORING.md §0 forbids editing a file that already exists under packages/.
import fc from 'fast-check';
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { graphIntro } from '../src/algorithms/graph-intro.js';
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
      directed: fc.boolean(),
    }),
  );

runConformance({
  name: 'graphIntro',
  algorithm: graphIntro,
  arbitrary: graphInput,
  supportedTargets: ['index', 'range', 'edge'],
  mutate: (input) => { input.values[0] = 999; },
});

test('every node gets exactly one frame', () => {
  fc.assert(
    fc.property(graphInput, ({ values, edges, directed }) => {
      const nodeFrames = collect(graphIntro({ values, edges, directed })).frames
        .filter((f) => f.line === 'NODE');
      expect(nodeFrames).toHaveLength(values.length);
    }),
  );
});

test('undirected degrees sum to twice the edge count — the handshake lemma', () => {
  // The closing note states this as a fact the learner can check on screen,
  // so it had better hold for every graph, not just the default one.
  fc.assert(
    fc.property(
      graphInput.map((g) => ({ ...g, directed: false })),
      ({ values, edges }) => {
        const last = collect(graphIntro({ values, edges, directed: false })).frames.at(-1)!;
        const { degreeSum } = last.vars as { degreeSum: number };
        // Holds even with self-loops, which contribute 2 to their node's
        // degree because the edge meets it at both ends.
        expect(degreeSum).toBe(2 * edges.length);
      },
    ),
  );
});

test('a directed graph counts only outgoing edges', () => {
  const last = collect(
    graphIntro({
      values: [0, 1, 2],
      edges: [{ from: 0, to: 1 }, { from: 0, to: 2 }],
      directed: true,
    }),
  ).frames.at(-1)!;
  expect((last.vars as { degreeSum: number }).degreeSum).toBe(2);
});

test('an isolated node is reported as degree 0 rather than skipped', () => {
  const { frames } = collect(
    graphIntro({ values: [0, 1], edges: [], directed: false }),
  );
  const nodes = frames.filter((f) => f.line === 'NODE');
  expect(nodes).toHaveLength(2);
  expect(nodes[0]!.note).toMatch(/isolated/i);
});
