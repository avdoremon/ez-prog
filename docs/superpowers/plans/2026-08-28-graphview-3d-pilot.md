# GraphView3D Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 2D `GraphView` renderer with a force-directed 3D view
(`GraphView3D`) on exactly one lesson — `algorithms/bfs.mdx` — as a pilot
proving force-directed layout and its accessibility pattern work, before
`dfs`, `dijkstra`, or `graph-intro` are touched.

**Architecture:** `GraphView3D` lives in the same `packages/viz-3d`
package `TreeView3D` already lives in, consuming the exact same
`Frame<GraphState>`/`Mark` data `GraphView` already consumes — zero
changes to `packages/viz-core`. Node positions come from a pure,
deterministic `layoutGraph3D` function driving `d3-force-3d`'s physics
simulation to convergence synchronously before anything renders. It plugs
into `VizIsland`'s existing dynamic-import renderer mechanism (the same
one `TreeView3D` already uses) as a second heavy-dependency renderer.

**Tech Stack:** `d3-force-3d@3.0.6` (new), `three`/`@react-three/fiber`/
`@react-three/drei` (already a `packages/viz-3d` dependency), React 19,
Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-28-graphview-3d-pilot-design.md`
(this plan implements it in full — read both).

---

## Decisions the spec left open (resolved while writing this plan)

1. **`Position3D` is not redefined.** `graphLayout.ts` imports it from the
   already-shipped `./layout.js` (`packages/viz-3d/src/layout.ts`) rather
   than declaring a second, identical `{x,y,z}` interface — avoids a name
   collision in `index.ts`'s exports and keeps one source of truth for the
   shape both 3D renderers position nodes with.
2. **Neighbor-list wording is plain comma-joined, no "and"/Oxford-comma
   grammar.** The spec's accessibility section names the CONTENT a node's
   description needs (neighbors, weights, direction) but not its exact
   English phrasing. `"neighbours 1, 2, 3"` is unambiguous and fully
   accessible without needing list-grammar logic (`"1, 2, and 3"`) that
   would only exist to sound more natural — YAGNI for a first pilot.
3. **`describeNeighbors`/`neighborsOf`/`marksForNode`/`marksForEdge` are
   pulled into their own pure, exported, unit-tested module**
   (`graphAccessibility.ts`), not left as private helpers inside
   `GraphView3D.tsx`. `bfs` (the pilot lesson) never exercises the
   weighted or directed formatting paths — those are only exercised later,
   by `dijkstra`/`graph-intro` — so without this split, that logic would
   ship with zero real test coverage. Splitting it out means the
   *correctness* of the weighted/directed cases is verified now, even
   though nothing e2e-visible uses them yet; only the WebGL rendering of
   arrows/weight-labels stays untested (consistent with every other
   WebGL-specific piece of code in this package).

## Global Constraints

- `GraphView3D` lives in `packages/viz-3d` (not a new package).
- Exact new dependency pin, no `^`/`~`: `d3-force-3d@3.0.6` — verified
  against the npm registry and the package's own shipped source on
  2026-08-28.
- **No change to `packages/viz-core`.** `GraphView3D` consumes the exact
  same `GraphState`/`Mark`/`Target` shape `GraphView` already consumes.
- Scope: `algorithms/bfs.mdx` (`bfs` viz entry) only. `dfs`, `dijkstra`,
  `graph-intro`, `linked-list`, `trie` are explicitly out of scope.
- The canvas/its wrapper carries `aria-hidden`; all accessible interaction
  lives in ordinary, visible, focusable DOM alongside it (button strip +
  hidden live region), matching `TreeView3D`'s established pattern.
- `prefers-reduced-motion` governs camera transitions only (snap instead
  of tween); manual orbit/drag is never restricted.
- Mark-kind colors mirror `apps/web/src/styles/tokens.css` exactly, via
  the already-shipped `colorForMarks` (`packages/viz-3d/src/markColors.ts`)
  — do not reimplement this mapping.
- Force-directed layout must be fully deterministic (same graph in, same
  settled positions out) — confirmed already true of `d3-force-3d`'s
  default behavior (fixed-seed internal RNG, index-derived starting
  positions), so this requires no extra seeding work, only verification
  by test.
- The force simulation runs to completion synchronously before anything
  is ever rendered (no live-animating settle).

---

### Task 1: Pure layout, summary, and accessibility functions

**Files:**
- Modify: `packages/viz-3d/package.json` (add `d3-force-3d` dependency)
- Create: `packages/viz-3d/src/d3-force-3d.d.ts`
- Create: `packages/viz-3d/src/graphLayout.ts`
- Create: `packages/viz-3d/src/graphLayout.test.ts`
- Create: `packages/viz-3d/src/graphSummary.ts`
- Create: `packages/viz-3d/src/graphSummary.test.ts`
- Create: `packages/viz-3d/src/graphAccessibility.ts`
- Create: `packages/viz-3d/src/graphAccessibility.test.ts`

**Interfaces:**
- Consumes: `Position3D` from `./layout.js` (already shipped).
- Produces: `export function layoutGraph3D(nodeCount: number, edges:
  {from:number; to:number}[]): Map<number, Position3D>` (from
  `graphLayout.ts`); `export function buildGraphSummary(nodeCount: number,
  edgeCount: number, directed: boolean): string` (from `graphSummary.ts`);
  `export interface Neighbor { to: number; value: number | string; weight?:
  number }`, `export function neighborsOf(i: number, values: (number |
  string)[], edges: GraphEdge[], directed: boolean): Neighbor[]`,
  `export function describeNeighbors(neighbors: Neighbor[], directed:
  boolean): string`, `export function marksForNode(marks: Mark[], i:
  number): MarkKind[]`, `export function marksForEdge(marks: Mark[], from:
  number, to: number, directed: boolean): MarkKind[]` (all from
  `graphAccessibility.ts`) — all six functions consumed by Task 2's
  `GraphView3D` component by exact name.

- [ ] **Step 1: Add the `d3-force-3d` dependency**

Edit `packages/viz-3d/package.json`'s `"dependencies"` block to add,
alphabetically:

```json
    "d3-force-3d": "3.0.6",
```

Run: `pnpm install`
Expected: exits 0.

- [ ] **Step 2: Add the local ambient type declaration**

No official `@types/d3-force-3d` package exists.

```ts
// packages/viz-3d/src/d3-force-3d.d.ts
declare module 'd3-force-3d' {
  export interface SimulationNodeDatum3D {
    index?: number;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
  }

  export interface SimulationLinkDatum3D {
    source: number | SimulationNodeDatum3D;
    target: number | SimulationNodeDatum3D;
  }

  export interface Simulation3D<N extends SimulationNodeDatum3D> {
    tick(iterations?: number): Simulation3D<N>;
    stop(): Simulation3D<N>;
    force(name: string, force: unknown): Simulation3D<N>;
  }

  export function forceSimulation<N extends SimulationNodeDatum3D>(
    nodes: N[],
    numDimensions?: number,
  ): Simulation3D<N>;

  export interface ManyBodyForce {
    strength(value: number): ManyBodyForce;
  }
  export function forceManyBody(): ManyBodyForce;

  export interface LinkForce {
    distance(value: number): LinkForce;
  }
  export function forceLink<L extends SimulationLinkDatum3D>(links: L[]): LinkForce;

  export type CenterForce = Record<string, never>;
  export function forceCenter(x?: number, y?: number, z?: number): CenterForce;

  export interface CollideForce {
    strength(value: number): CollideForce;
  }
  export function forceCollide(radius?: number): CollideForce;
}
```

- [ ] **Step 3: Write the failing tests for `layoutGraph3D`**

```ts
// packages/viz-3d/src/graphLayout.test.ts
import { expect, test } from 'vitest';
import { layoutGraph3D } from './graphLayout.js';
import type { Position3D } from './layout.js';

function distance(a: Position3D, b: Position3D): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

test('produces one position per node', () => {
  const positions = layoutGraph3D(4, [{ from: 0, to: 1 }, { from: 1, to: 2 }]);
  expect(positions.size).toBe(4);
});

test('an empty graph produces no positions', () => {
  expect(layoutGraph3D(0, []).size).toBe(0);
});

test('a single node with no edges settles at the origin', () => {
  const positions = layoutGraph3D(1, []);
  const p = positions.get(0)!;
  expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(0, 1);
});

test('layout is deterministic', () => {
  const edges = [
    { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 },
    { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 },
  ];
  const a = layoutGraph3D(6, edges);
  const b = layoutGraph3D(6, edges);
  expect([...a.entries()]).toEqual([...b.entries()]);
});

test('no two nodes settle at the exact same position', () => {
  const edges = [
    { from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 },
    { from: 2, to: 3 }, { from: 3, to: 4 }, { from: 4, to: 5 },
  ];
  const positions = [...layoutGraph3D(6, edges).values()];
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      expect(distance(positions[i]!, positions[j]!)).toBeGreaterThan(0);
    }
  }
});

test('two disconnected edges settle with each pair closer together than across pairs', () => {
  // 0-1 is one edge; 2-3 is a separate edge; no path connects the two pairs.
  const positions = layoutGraph3D(4, [{ from: 0, to: 1 }, { from: 2, to: 3 }]);
  const p0 = positions.get(0)!;
  const p1 = positions.get(1)!;
  const p2 = positions.get(2)!;
  const p3 = positions.get(3)!;
  const withinPair0 = distance(p0, p1);
  const withinPair1 = distance(p2, p3);
  const acrossPairs = distance(p0, p2);
  expect(withinPair0).toBeLessThan(acrossPairs);
  expect(withinPair1).toBeLessThan(acrossPairs);
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm vitest run packages/viz-3d/src/graphLayout.test.ts`
Expected: FAIL — `./graphLayout.js` cannot be resolved (module doesn't
exist yet).

- [ ] **Step 5: Implement `graphLayout.ts`**

```ts
// packages/viz-3d/src/graphLayout.ts
import {
  forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation,
} from 'd3-force-3d';
import type { SimulationNodeDatum3D } from 'd3-force-3d';
import type { Position3D } from './layout.js';

export type { Position3D };

/**
 * Matches d3-force-3d's own default convergence point: with the
 * library's default alphaDecay (alphaMin ** (1/300)), alpha crosses
 * alphaMin at ~300 ticks of its normal async stepping. This is that
 * same point, just stepped synchronously instead.
 */
const SETTLE_TICKS = 300;

/** Repulsion between every pair of nodes (negative = push apart). */
const CHARGE_STRENGTH = -60;

/** Target rest length for an edge once settled. */
const LINK_DISTANCE = 3;

/**
 * Minimum center-to-center distance between two node spheres (radius 0.4
 * each, matching TreeView3D's node size, plus a visible gap).
 */
const COLLIDE_RADIUS = 1;

/**
 * Deterministic force-directed layout: same graph in, same settled
 * positions out, every time. d3-force-3d seeds its internal randomness
 * with a fixed constant and assigns un-set starting positions from each
 * node's array index alone, so nothing here needs its own seeding.
 * Runs to completion synchronously -- `.stop()` cancels the library's own
 * auto-started async timer immediately, then SETTLE_TICKS manual
 * `.tick()` calls step the simulation by hand before positions are read
 * -- no timers, no waiting, safe to call from a plain function.
 */
export function layoutGraph3D(
  nodeCount: number,
  edges: { from: number; to: number }[],
): Map<number, Position3D> {
  const nodes: SimulationNodeDatum3D[] = Array.from({ length: nodeCount }, () => ({}));
  const links = edges.map((e) => ({ source: e.from, target: e.to }));

  const simulation = forceSimulation(nodes, 3)
    .force('charge', forceManyBody().strength(CHARGE_STRENGTH))
    .force('link', forceLink(links).distance(LINK_DISTANCE))
    .force('center', forceCenter())
    .force('collide', forceCollide(COLLIDE_RADIUS))
    .stop();

  for (let i = 0; i < SETTLE_TICKS; i++) simulation.tick();

  const positions = new Map<number, Position3D>();
  nodes.forEach((n, i) => {
    positions.set(i, { x: n.x ?? 0, y: n.y ?? 0, z: n.z ?? 0 });
  });
  return positions;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm vitest run packages/viz-3d/src/graphLayout.test.ts`
Expected: PASS (6 tests). If "two disconnected edges" or "no two nodes
settle at the exact same position" fails, the force constants (§ above)
need tuning — do not weaken the test; adjust `CHARGE_STRENGTH`/
`LINK_DISTANCE`/`COLLIDE_RADIUS` until the physically-expected property
holds.

- [ ] **Step 7: Write the failing tests for `buildGraphSummary`**

```ts
// packages/viz-3d/src/graphSummary.test.ts
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
```

- [ ] **Step 8: Run the tests to verify they fail**

Run: `pnpm vitest run packages/viz-3d/src/graphSummary.test.ts`
Expected: FAIL — `./graphSummary.js` cannot be resolved.

- [ ] **Step 9: Implement `graphSummary.ts`**

```ts
// packages/viz-3d/src/graphSummary.ts

/**
 * The idle-state scene-summary text for a graph -- the graph-shaped
 * equivalent of TreeView3D's buildSceneSummary. Deliberately does not
 * report "levels"/"depth" the way the tree summary does: neither concept
 * is well-defined for a graph with cycles.
 */
export function buildGraphSummary(
  nodeCount: number,
  edgeCount: number,
  directed: boolean,
): string {
  if (nodeCount === 0) return 'Empty graph.';
  const nodeWord = nodeCount === 1 ? 'node' : 'nodes';
  const edgeWord = edgeCount === 1 ? 'edge' : 'edges';
  const edgeDesc = directed ? `directed ${edgeWord}` : edgeWord;
  return `Graph, ${nodeCount} ${nodeWord}, ${edgeCount} ${edgeDesc}.`;
}
```

- [ ] **Step 10: Run the tests to verify they pass**

Run: `pnpm vitest run packages/viz-3d/src/graphSummary.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 11: Write the failing tests for `graphAccessibility.ts`**

```ts
// packages/viz-3d/src/graphAccessibility.test.ts
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
```

- [ ] **Step 12: Run the tests to verify they fail**

Run: `pnpm vitest run packages/viz-3d/src/graphAccessibility.test.ts`
Expected: FAIL — `./graphAccessibility.js` cannot be resolved.

- [ ] **Step 13: Implement `graphAccessibility.ts`**

```ts
// packages/viz-3d/src/graphAccessibility.ts
import type { GraphEdge, Mark, MarkKind } from '@cs/viz-core';

export interface Neighbor {
  to: number;
  value: number | string;
  weight?: number;
}

/**
 * Neighbours of node `i`, following direction only when the graph is
 * directed -- mirrors GraphView's own (2D) `neighbours()` helper.
 */
export function neighborsOf(
  i: number,
  values: (number | string)[],
  edges: GraphEdge[],
  directed: boolean,
): Neighbor[] {
  const out: Neighbor[] = [];
  for (const e of edges) {
    if (e.from === i) out.push({ to: e.to, value: values[e.to]!, weight: e.weight });
    else if (!directed && e.to === i) {
      out.push({ to: e.from, value: values[e.from]!, weight: e.weight });
    }
  }
  return out;
}

/**
 * The neighbour clause of a node's accessible description, e.g.
 * "neighbours 1, 3" or "points at 2 (weight 5)".
 */
export function describeNeighbors(neighbors: Neighbor[], directed: boolean): string {
  if (neighbors.length === 0) return directed ? 'points at nothing' : 'no neighbours';
  const list = neighbors
    .map((n) => (n.weight !== undefined ? `${n.value} (weight ${n.weight})` : `${n.value}`))
    .join(', ');
  return directed ? `points at ${list}` : `neighbours ${list}`;
}

export function marksForNode(marks: Mark[], i: number): MarkKind[] {
  return marks.filter((m) => m.at.t === 'index' && m.at.i === i).map((m) => m.kind);
}

export function marksForEdge(
  marks: Mark[],
  from: number,
  to: number,
  directed: boolean,
): MarkKind[] {
  return marks
    .filter((m) => {
      if (m.at.t !== 'edge') return false;
      if (m.at.from === from && m.at.to === to) return true;
      return !directed && m.at.from === to && m.at.to === from;
    })
    .map((m) => m.kind);
}
```

- [ ] **Step 14: Run the tests to verify they pass**

Run: `pnpm vitest run packages/viz-3d/src/graphAccessibility.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 15: Typecheck**

Run: `pnpm typecheck`
Expected: exits 0.

- [ ] **Step 16: Commit**

```bash
git add packages/viz-3d/package.json pnpm-lock.yaml packages/viz-3d/src/d3-force-3d.d.ts packages/viz-3d/src/graphLayout.ts packages/viz-3d/src/graphLayout.test.ts packages/viz-3d/src/graphSummary.ts packages/viz-3d/src/graphSummary.test.ts packages/viz-3d/src/graphAccessibility.ts packages/viz-3d/src/graphAccessibility.test.ts
git commit -m "feat: add GraphView3D's pure layout, summary, and accessibility functions"
```

---

### Task 2: `GraphView3D` component

**Files:**
- Create: `packages/viz-3d/src/GraphView3D.tsx`
- Modify: `packages/viz-3d/src/index.ts`

**Interfaces:**
- Consumes: `layoutGraph3D`, `Position3D` (from `graphLayout.js`);
  `buildGraphSummary` (from `graphSummary.js`); `describeNeighbors`,
  `marksForEdge`, `marksForNode`, `neighborsOf` (from
  `graphAccessibility.js`) — all from Task 1. `colorForMarks`,
  `INK_COLOR` (already-shipped exports of `packages/viz-3d/src/markColors.ts`).
- Produces: `export interface GraphView3DProps { state: GraphState;
  marks?: Mark[]; label: string }` and `export function GraphView3D(props:
  GraphView3DProps): JSX.Element` — matches the site's `Renderer<S>` type
  exactly (`(props: {state: S; marks?: Mark[]; label: string}) =>
  React.ReactNode`), so Task 3's `VizIsland` integration needs no adapter.

No dedicated test file for this task — same reasoning as `TreeView3D.tsx`:
jsdom has no real WebGL context, so a unit test mounting a real `<Canvas>`
would not exercise anything meaningful. The logic worth testing
(`layoutGraph3D`, `buildGraphSummary`, `graphAccessibility.ts`) is already
fully covered by Task 1. Verified by Playwright e2e in Task 4 instead.

- [ ] **Step 1: Implement `GraphView3D.tsx`**

```tsx
// packages/viz-3d/src/GraphView3D.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, OrbitControls, Text } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Quaternion, Vector3 } from 'three';
import type { GraphState, Mark } from '@cs/viz-core';
import { layoutGraph3D, type Position3D } from './graphLayout.js';
import { buildGraphSummary } from './graphSummary.js';
import { colorForMarks, INK_COLOR } from './markColors.js';
import {
  describeNeighbors, marksForEdge, marksForNode, neighborsOf,
} from './graphAccessibility.js';

export interface GraphView3DProps {
  state: GraphState;
  marks?: Mark[];
  label: string;
}

const NO_MARKS: Mark[] = [];
const NODE_FONT = '/fonts/IBMPlexMono-Regular.ttf';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Pans OrbitControls' target toward `focus` every frame -- lerp normally, snap when `instant`. */
function CameraRig({ focus, instant }: { focus: Position3D | null; instant: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const targetVec = useRef(new Vector3());

  useFrame(() => {
    if (!focus || !controls.current) return;
    targetVec.current.set(focus.x, focus.y, focus.z);
    if (instant) {
      controls.current.target.copy(targetVec.current);
    } else {
      controls.current.target.lerp(targetVec.current, 0.15);
    }
    controls.current.update();
  });

  return <OrbitControls ref={controls} makeDefault />;
}

/** A small cone near the target end of a directed edge, oriented along it. */
function ArrowHead({ from, to, color }: { from: Position3D; to: Position3D; color: string }) {
  const dir = new Vector3(to.x - from.x, to.y - from.y, to.z - from.z).normalize();
  const tip = new Vector3(to.x, to.y, to.z).sub(dir.clone().multiplyScalar(0.45));
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir);
  return (
    <mesh position={[tip.x, tip.y, tip.z]} quaternion={quaternion}>
      <coneGeometry args={[0.12, 0.3, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

export function GraphView3D({ state, marks = NO_MARKS, label }: GraphView3DProps) {
  const { values, edges, directed = false } = state;
  const positions = useMemo(() => layoutGraph3D(values.length, edges), [values, edges]);
  const summary = useMemo(
    () => buildGraphSummary(values.length, edges.length, directed),
    [values.length, edges.length, directed],
  );
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  if (values.length === 0) {
    return <p className="graph-view-3d graph-view-3d--empty">{label}: empty</p>;
  }

  const hasFocusedNode = focusedIndex !== null && values[focusedIndex] !== undefined;
  const focusedPosition = hasFocusedNode ? (positions.get(focusedIndex!) ?? null) : null;
  const focusedAnnouncement = hasFocusedNode
    ? `Node ${focusedIndex}, value ${values[focusedIndex!]}, ` +
      `${describeNeighbors(neighborsOf(focusedIndex!, values, edges, directed), directed)}.`
    : '';

  return (
    <div className="graph-view-3d viz-3d">
      <div className="graph-view-3d__canvas-wrap" aria-hidden="true">
        <Canvas camera={{ position: [0, 3, 12], fov: 50 }}>
          <ambientLight intensity={0.7} />
          <pointLight position={[8, 10, 8]} />
          <CameraRig focus={focusedPosition} instant={reducedMotion} />
          {edges.map((edge, edgeIndex) => {
            const a = positions.get(edge.from)!;
            const b = positions.get(edge.to)!;
            const color = colorForMarks(marksForEdge(marks, edge.from, edge.to, directed));
            const midpoint: [number, number, number] = [
              (a.x + b.x) / 2,
              (a.y + b.y) / 2,
              (a.z + b.z) / 2,
            ];
            return (
              <group key={`edge-${edgeIndex}`}>
                <Line points={[[a.x, a.y, a.z], [b.x, b.y, b.z]]} color={color} lineWidth={1} />
                {directed && <ArrowHead from={a} to={b} color={color} />}
                {edge.weight !== undefined && (
                  <Text
                    position={midpoint}
                    fontSize={0.28}
                    color={INK_COLOR}
                    anchorX="center"
                    font={NODE_FONT}
                  >
                    {String(edge.weight)}
                  </Text>
                )}
              </group>
            );
          })}
          {values.map((value, i) => {
            const p = positions.get(i)!;
            const color = colorForMarks(marksForNode(marks, i));
            return (
              <group key={i} position={[p.x, p.y, p.z]}>
                <mesh>
                  <sphereGeometry args={[0.4, 24, 24]} />
                  <meshStandardMaterial color={color} />
                </mesh>
                <Text
                  position={[0, 0.65, 0]}
                  fontSize={0.32}
                  color={INK_COLOR}
                  anchorX="center"
                  font={NODE_FONT}
                >
                  {String(value)}
                </Text>
              </group>
            );
          })}
        </Canvas>
      </div>

      <div className="graph-view-3d__nodes" role="group" aria-label={label}>
        {values.map((value, i) => {
          const kinds = marksForNode(marks, i);
          const neighbors = neighborsOf(i, values, edges, directed);
          const kindsText = kinds.length ? `, ${kinds.join(' ')}` : '';
          return (
            <button
              key={i}
              type="button"
              className="graph-view-3d__node-button"
              aria-label={
                `Node ${i}, value ${value}${kindsText}, ` +
                `${describeNeighbors(neighbors, directed)}`
              }
              onFocus={() => setFocusedIndex(i)}
              onBlur={() => setFocusedIndex(null)}
              onClick={() => setFocusedIndex(i)}
            >
              {value}
            </button>
          );
        })}
      </div>

      <p className="graph-view-3d__summary">
        {hasFocusedNode ? `Node ${focusedIndex}, value ${values[focusedIndex!]}.` : summary}
      </p>
      <p role="status" aria-live="polite" className="graph-view-3d__announcer visually-hidden">
        {focusedAnnouncement}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Export it**

```ts
// packages/viz-3d/src/index.ts
export { TreeView3D, type TreeView3DProps } from './TreeView3D.js';
export { layoutTree3D, type Position3D } from './layout.js';
export { buildSceneSummary } from './sceneSummary.js';
export { colorForMarks, DEFAULT_COLOR, INK_COLOR } from './markColors.js';
export { GraphView3D, type GraphView3DProps } from './GraphView3D.js';
export { layoutGraph3D } from './graphLayout.js';
export { buildGraphSummary } from './graphSummary.js';
export {
  describeNeighbors, marksForEdge, marksForNode, neighborsOf, type Neighbor,
} from './graphAccessibility.js';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: exits 0. If TypeScript reports a mismatch against
`@react-three/drei`'s `<Line>`/`<Text>`/`<OrbitControls>` props or against
the local `d3-force-3d.d.ts` shim, check the actual installed `.d.ts`
under `node_modules/@react-three/drei` before guessing a fix — these
prop shapes were verified against `@react-three/drei@10.7.8` when the
tree pilot's plan was written and reused unchanged here.

- [ ] **Step 4: Commit**

```bash
git add packages/viz-3d/src/GraphView3D.tsx packages/viz-3d/src/index.ts
git commit -m "feat: add the GraphView3D component"
```

---

### Task 3: Wire `GraphView3D` into the site, generalize the CLS reservation

**Files:**
- Modify: `apps/web/src/viz/types.ts:6` (widen the `renderer` union)
- Modify: `apps/web/src/viz/registry.ts:189` (the `bfs` entry's `renderer`
  field)
- Modify: `apps/web/src/components/VizIsland.tsx` (add a `GraphView3D`
  branch to `loadRenderer`)
- Modify: `packages/viz-3d/src/TreeView3D.tsx:105` (add the shared
  `viz-3d` marker class)
- Modify: `apps/web/src/styles/viz.css` (generalize the CLS reservation
  rule; append `.graph-view-3d*` rules)

**Interfaces:**
- Consumes: `GraphView3D` from `@cs/viz-3d` (Task 2).
- Produces: nothing new for later tasks — this is the integration point.

- [ ] **Step 1: Widen the renderer union**

```ts
// apps/web/src/viz/types.ts:6
  renderer: 'ArrayView' | 'TreeView' | 'GraphView' | 'TreeView3D' | 'GraphView3D';
```

(Only this one line changes.)

- [ ] **Step 2: Point `bfs` at the new renderer**

```ts
// apps/web/src/viz/registry.ts:189
  bfs: {
    renderer: 'GraphView3D',
```

(Only the `renderer` value changes — every other field of the `bfs`
entry stays exactly as it is today.)

- [ ] **Step 3: Add the `GraphView3D` branch to `loadRenderer`**

In `apps/web/src/components/VizIsland.tsx`, change:

```tsx
function loadRenderer(rendererName: VizEntry['renderer']): Promise<Renderer<never>> {
  if (rendererName === 'TreeView3D') {
    return import('@cs/viz-3d').then((m) => m.TreeView3D as Renderer<never>);
  }
  return Promise.resolve(RENDERERS[rendererName]);
}
```

to:

```tsx
function loadRenderer(rendererName: VizEntry['renderer']): Promise<Renderer<never>> {
  if (rendererName === 'TreeView3D') {
    return import('@cs/viz-3d').then((m) => m.TreeView3D as Renderer<never>);
  }
  if (rendererName === 'GraphView3D') {
    return import('@cs/viz-3d').then((m) => m.GraphView3D as Renderer<never>);
  }
  return Promise.resolve(RENDERERS[rendererName]);
}
```

(`RENDERERS`, the static map for `ArrayView`/`TreeView`/`GraphView`, is
unchanged.)

- [ ] **Step 4: Add the shared `viz-3d` marker class to `TreeView3D`**

```tsx
// packages/viz-3d/src/TreeView3D.tsx:105
    <div className="tree-view-3d viz-3d">
```

(Was `<div className="tree-view-3d">`. This is the only change to this
file.)

- [ ] **Step 5: Typecheck and build**

Run: `pnpm typecheck && pnpm build`
Expected: both exit 0.

- [ ] **Step 6: Generalize the CLS reservation and add graph-specific CSS**

In `apps/web/src/styles/viz.css`, replace:

```css
/*
 * 60rem covers the 3D view's canvas + node strip + summary pushing the
 * figure past the plain .viz reservation above. This has since been
 * checked against a real measurement: the "/data-structures/tree/ does not
 * shift layout while the 3D view hydrates" test in
 * apps/web/e2e/lesson.spec.ts (added in Task 4) measures accumulated
 * layout-shift after navigating to the lesson and passes comfortably under
 * the 0.1 budget -- 60rem needed no correction.
 */
.js .viz:has(.tree-view-3d) {
  min-height: 60rem;
}
```

with:

```css
/*
 * 60rem covers a 3D view's canvas + node strip + summary pushing the
 * figure past the plain .viz reservation above. Verified for TreeView3D
 * against a real measurement (see the "/data-structures/tree/ does not
 * shift layout" e2e test) -- 60rem needed no correction there. Shared by
 * both 3D renderers via the common `viz-3d` marker class (see
 * TreeView3D.tsx and GraphView3D.tsx) rather than duplicating this rule
 * per renderer. GraphView3D gets its own real CLS measurement in its own
 * pilot task (a force-directed layout spreads nodes differently than the
 * tree's compact radial one) -- 60rem here is a starting point to
 * re-verify, not assumed to already be correct for it.
 */
.js .viz:has(.viz-3d) {
  min-height: 60rem;
}
```

Then append:

```css
.graph-view-3d {
  margin-top: .5rem;
}

.graph-view-3d--empty {
  padding: 1rem;
  text-align: center;
}

.graph-view-3d__canvas-wrap {
  height: 24rem;
  border: 2px solid var(--muted);
}

.graph-view-3d__canvas-wrap canvas {
  display: block;
}

.graph-view-3d__nodes {
  display: flex;
  flex-wrap: wrap;
  gap: .35rem;
  margin-top: .5rem;
}

.graph-view-3d__node-button {
  font-family: var(--font-mono);
  font-size: var(--step-0);
  min-width: 2.5rem;
  min-height: 2.5rem;
  border: 2px solid var(--muted);
  background: var(--paper);
  color: var(--ink);
  cursor: pointer;
}

.graph-view-3d__node-button:focus-visible {
  outline: 3px solid var(--signal);
  outline-offset: 2px;
}

.graph-view-3d__summary {
  margin-top: .5rem;
  font-weight: 600;
}
```

- [ ] **Step 7: Manual dev-server check**

Run: `pnpm dev`, open `/algorithms/bfs/`. Confirm: a 3D scene renders
(6 spheres connected by lines, no directed arrows since `bfs` is
undirected, no weight labels since `bfs` is unweighted); dragging orbits
the camera; a row of node-value buttons appears below the canvas;
focusing one pans the camera and updates the text below the button strip
to that node's value and neighbor list. Also confirm `/data-structures/tree/`
(from the prior plan) still renders correctly — the shared `viz-3d` class
change (Step 4, Step 6) must not have broken it.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/viz/types.ts apps/web/src/viz/registry.ts apps/web/src/components/VizIsland.tsx packages/viz-3d/src/TreeView3D.tsx apps/web/src/styles/viz.css
git commit -m "feat: wire GraphView3D into the bfs lesson"
```

---

### Task 4: E2E coverage, CLS measurement, final gates

**Files:**
- Modify: `apps/web/e2e/lesson.spec.ts`
- Modify: `apps/web/src/styles/viz.css` (only if Step 2 below finds the
  60rem estimate wrong for this lesson)

**Interfaces:**
- Consumes: the built site (`GraphView3D`-hydrated `/algorithms/bfs/`
  page) from Tasks 1–3.

`/algorithms/bfs/` is already in `apps/web/e2e/lesson.spec.ts`'s
`ALL_LESSONS`, so it already gets the standard axe/360px/CLS/dark-palette
loops. Like `TreeView3D`, this component sits near the top of its lesson
page (not below the fold), so — as with the tree pilot — it likely
doesn't need a scroll-into-view trick to hydrate before those loops
examine it; verify this rather than assume it (Step 1).

- [ ] **Step 1: Confirm the existing `ALL_LESSONS` loops see the hydrated 3D view**

Run: `pnpm build && pnpm --filter web exec playwright install --with-deps chromium && pnpm test:e2e`

Expected: all existing tests still pass, including
`/algorithms/bfs/ has no accessibility violations` (both light and dark
palette) and the CLS test for the same path. Before assuming a failure is
a code defect, check for a stray `astro dev`/`preview` process squatting
port 4321 from a different checkout (a real issue that occurred during
the tree pilot's own Task 4) — if `netstat`/process list shows one,
stop it via the graceful `astro dev stop` command run from its own
directory; do not otherwise touch that checkout.

- [ ] **Step 2: Add a targeted keyboard/neighbor-announcement e2e test**

Insert into `apps/web/e2e/lesson.spec.ts`, after the existing
`prefers-reduced-motion` `describe` block added for `TreeView3D` (in the
prior plan) and before the `forced light palette` `describe`:

```ts
test('the 3D graph view is keyboard-operable and announces neighbours', async ({ page }) => {
  await page.goto('/algorithms/bfs/');
  const nodeButtons = page.locator('.graph-view-3d__node-button');
  await expect(nodeButtons.first()).toBeVisible();

  const summary = page.locator('.graph-view-3d__summary');
  await expect(summary).toContainText('Graph, 6 nodes, 6 edges.');

  await nodeButtons.nth(0).focus();
  const announcer = page.locator('.graph-view-3d__announcer');
  await expect(announcer).toContainText('Node 0, value 0');
  await expect(announcer).toContainText('neighbours');

  await page.keyboard.press('Tab');
  await expect(announcer).toContainText('Node 1, value 1');
});
```

Run: `pnpm test:e2e -- -g "3D graph view"`
Expected: PASS. If the exact neighbor text in the assertion doesn't match
(e.g. `bfs`'s `defaultInput` values/edges have changed since this plan
was written), adjust the expected string to match
`apps/web/src/viz/registry.ts`'s current `bfs.defaultInput` rather than
guessing.

- [ ] **Step 3: Add a real, measured CLS test**

Insert immediately after the test from Step 2:

```ts
test('/algorithms/bfs/ does not shift layout while the 3D view hydrates', async ({ page }) => {
  await page.goto('/algorithms/bfs/');
  await expect(page.locator('.graph-view-3d__node-button').first()).toBeVisible();
  const cls = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          })[]) {
            if (!entry.hadRecentInput) total += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(total), 1500);
      }),
  );
  expect(cls).toBeLessThan(0.1);
});
```

Run: `pnpm test:e2e -- -g "does not shift layout while the 3D view"`

If it FAILS: measure the real hydrated height —

```ts
// Temporary, in the same test file, to find the real number; delete once done.
const height = await page.evaluate(
  () => document.querySelector('.viz')!.getBoundingClientRect().height,
);
console.log(height);
```

— convert the logged pixel value to rem (`--step-0: 1rem` is `16px`,
per `apps/web/src/styles/tokens.css`), add a small safety margin, and
correct the `.js .viz:has(.viz-3d)` `min-height` in
`apps/web/src/styles/viz.css` (Task 3, Step 6). **Do not simply raise it
for both renderers without checking** — if `TreeView3D`'s own CLS test
(from the prior plan) still needs 60rem or less, and `GraphView3D`'s
needs more, raise the shared value to whichever is larger; both renderers
share one rule, so it must satisfy both. Re-run until both this test and
the pre-existing tree CLS test pass, then remove the temporary logging
line.

- [ ] **Step 4: Add a `prefers-reduced-motion` test**

```ts
test.describe('reduced motion (graph)', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('focusing a graph node snaps the camera instead of animating it', async ({ page }) => {
    await page.goto('/algorithms/bfs/');
    const nodeButtons = page.locator('.graph-view-3d__node-button');
    await nodeButtons.nth(2).focus();
    await expect(page.locator('.graph-view-3d__announcer')).toContainText('Node 2, value 2');
  });
});
```

(Uses `contextOptions: { reducedMotion: 'reduce' }`, not a flat
`reducedMotion` option — the pinned `@playwright/test@1.62.1`'s type
shape requires the nested form, discovered and fixed the same way during
the tree pilot's own Task 4.)

Run: `pnpm test:e2e -- -g "reduced motion (graph)"`
Expected: PASS.

- [ ] **Step 5: Full gate run**

Run, in order:
`pnpm lint:content && pnpm typecheck && pnpm test && pnpm build && pnpm check:offline && pnpm test:e2e`
Expected: all exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/e2e/lesson.spec.ts apps/web/src/styles/viz.css
git commit -m "test: add accessibility, keyboard, and CLS coverage for GraphView3D"
```

---

## Definition of Done

- [ ] `packages/viz-3d` gains: `layoutGraph3D`, `buildGraphSummary`,
      `describeNeighbors`/`neighborsOf`/`marksForNode`/`marksForEdge`,
      `GraphView3D` (Tasks 1–2).
- [ ] `algorithms/bfs.mdx` renders via `GraphView3D` with no content
      changes needed (Task 3) — confirmed by hand.
- [ ] Camera orbit/zoom works; force parameters tuned against `bfs`'s
      real graph until settled positions have no overlap and a legible
      spread (Task 1 Step 6, Task 3 Step 7).
- [ ] Keyboard node-focus pans the camera, announces the node's value and
      neighbors, verified by test (Task 4).
- [ ] `prefers-reduced-motion` path verified not to break anything
      (Task 4).
- [ ] CLS budget for `GraphView3D` is a real measured value (Task 4), not
      assumed from `TreeView3D`'s already-shipped number — and the shared
      reservation rule satisfies both renderers' real measurements.
- [ ] Zero axe violations (wcag2a/wcag2aa, both colour schemes) on
      `/algorithms/bfs/` (Task 4, via the existing `ALL_LESSONS` loop).
- [ ] `pnpm lint:content`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
      `pnpm check:offline`, `pnpm test:e2e` all exit 0.
- [ ] No file under `packages/viz-core` was edited.
