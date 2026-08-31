# HierarchyView3D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third `packages/viz-3d` renderer, `HierarchyView3D` — a
deterministic (no physics settle) radial layout for a rooted,
singly-parented, acyclic `GraphState` (a chain or a tree, not a general
graph with cycles) — and migrate `linked-list` and `trie` onto it from the
2D `GraphView`.

**Architecture:** `HierarchyView3D.tsx` is structurally a near-copy of the
already-shipped `GraphView3D.tsx`, reusing its accessibility helpers
(`graphAccessibility.ts`), mark coloring (`markColors.ts`), directed-edge
arrowheads, button-strip + hidden-live-region pattern, and camera rig
unchanged. The only genuinely new logic is `hierarchyLayout.ts`: BFS depth
from a detected root, a per-parent angular wedge subdivided among children,
then a uniform rescale to this renderer's **own** bounding radius
(`HIERARCHY_LAYOUT_RADIUS = 15`) — deliberately not `graphLayout.ts`'s
`LAYOUT_RADIUS` (5), which was numerically proven too small to hold a
useful chain length (see the spec's "Why a bigger, renderer-specific
bounding radius" section — a real, verified finding, not an estimate).

**Tech Stack:** React 19, `@react-three/fiber`/`@react-three/drei`/`three`
(already `packages/viz-3d` dependencies — no new dependency), Vitest,
Playwright.

**Spec:** `docs/superpowers/specs/2026-08-31-hierarchyview-3d-design.md`
(this plan implements it in full — read both; the spec's "Why a bigger,
renderer-specific bounding radius" section explains a real dead-end
(sharing `GraphView3D`'s radius, then a golden-angle spiral) this plan does
NOT repeat, because both were numerically disproven before this plan was
written).

## Global Constraints

- `HierarchyView3D` lives in `packages/viz-3d` (not a new package). No new
  runtime dependency.
- **No change to `packages/viz-core`.** `HierarchyView3D` consumes the
  exact same `GraphState`/`Mark`/`Target` shape `GraphView`/`GraphView3D`
  already consume.
- `HIERARCHY_LAYOUT_RADIUS = 15` — this renderer's own bounding radius, not
  `graphLayout.ts`'s `LAYOUT_RADIUS` (5). Do not share the two constants;
  they are calibrated for different camera distances (§3 of the spec).
- Equal (not leaf-count-weighted) angular subdivision among a node's
  children — deliberately simpler; see spec §2.
- Scope: `linked-list` and `trie` only. `linked-list`'s registry schema
  tightens (`arr` max 32 → 16); `trie`'s registry schema is **unchanged**
  (its existing worst case already clears the sphere-diameter floor at
  `HIERARCHY_LAYOUT_RADIUS = 15` — verified numerically, not assumed).
- The canvas/its wrapper carries `aria-hidden`; all accessible interaction
  lives in ordinary, visible, focusable DOM alongside it (button strip +
  hidden live region), matching `TreeView3D`/`GraphView3D`'s established
  pattern.
- `prefers-reduced-motion` governs camera transitions only (snap instead of
  tween); manual orbit/drag is never restricted.
- Mark-kind colors mirror `apps/web/src/styles/tokens.css` exactly, via the
  already-shipped `colorForMarks` (`packages/viz-3d/src/markColors.ts`) —
  do not reimplement this mapping.
- The layout is fully deterministic (same graph in, same settled positions
  out) — pure arithmetic (BFS + angle bookkeeping), no physics simulation,
  so this requires no seeding work and no settle-tick loop.

---

### Task 1: Export `layout.ts`'s step constants; add the pure `hierarchyLayout.ts`

**Files:**
- Modify: `packages/viz-3d/src/layout.ts` (export two currently-private consts)
- Create: `packages/viz-3d/src/hierarchyLayout.ts`
- Create: `packages/viz-3d/src/hierarchyLayout.test.ts`

**Interfaces:**
- Consumes: `Position3D`, `LEVEL_RADIUS_STEP`, `LEVEL_HEIGHT_STEP` from
  `./layout.js` (this task exports the latter two); `GraphEdge` from
  `@cs/viz-core`.
- Produces: `export const HIERARCHY_LAYOUT_RADIUS = 15` and
  `export function layoutHierarchy3D(nodeCount: number, edges:
  {from:number; to:number}[]): Map<number, Position3D>` (from
  `hierarchyLayout.ts`) — consumed by Task 2's `HierarchyView3D` component
  by exact name.

- [ ] **Step 1: Export `layout.ts`'s per-level step constants**

In `packages/viz-3d/src/layout.ts`, change:

```ts
const LEVEL_RADIUS_STEP = 2.4;
const LEVEL_HEIGHT_STEP = 1.8;
```

to:

```ts
export const LEVEL_RADIUS_STEP = 2.4;
export const LEVEL_HEIGHT_STEP = 1.8;
```

(No other change to this file. `layout.test.ts` is unaffected — it doesn't
import these constants and its assertions are unchanged by this export.)

- [ ] **Step 2: Run the existing tree layout tests to confirm no regression**

Run: `pnpm exec vitest run packages/viz-3d/src/layout.test.ts`
Expected: PASS (6 tests, unchanged).

- [ ] **Step 3: Write the failing tests for `layoutHierarchy3D`**

```ts
// packages/viz-3d/src/hierarchyLayout.test.ts
import { expect, test } from 'vitest';
import { HIERARCHY_LAYOUT_RADIUS, layoutHierarchy3D } from './hierarchyLayout.js';
import type { Position3D } from './layout.js';

function distance(a: Position3D, b: Position3D): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

test('an empty graph produces no positions', () => {
  expect(layoutHierarchy3D(0, []).size).toBe(0);
});

test('a single node with no edges sits at the origin', () => {
  const positions = layoutHierarchy3D(1, []);
  expect(positions.get(0)).toEqual({ x: 0, y: 0, z: 0 });
});

test('root falls back to index 0 when more than one node has no parent', () => {
  // Two disconnected nodes -- neither has an incoming edge, so root
  // detection can't pick a unique one. Falls back to 0 rather than
  // throwing; this only checks the fallback rule itself, not layout
  // quality for malformed/disconnected input (out of scope -- neither
  // real lesson ever produces a disconnected graph; see the design spec's
  // trust-boundary note in §2).
  const positions = layoutHierarchy3D(2, []);
  expect(positions.get(0)).toEqual({ x: 0, y: 0, z: 0 });
});

test('a 4-node chain lays out as a straight line, deepest node exactly at the bounding radius', () => {
  const edges = [{ from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 }];
  const positions = layoutHierarchy3D(4, edges);
  expect(positions.get(0)).toEqual({ x: 0, y: 0, z: 0 });
  const p1 = positions.get(1)!;
  const p2 = positions.get(2)!;
  const p3 = positions.get(3)!;
  expect(p1.x).toBeCloseTo(-4);
  expect(p1.y).toBeCloseTo(-3);
  expect(p1.z).toBeCloseTo(0);
  expect(p2.x).toBeCloseTo(-8);
  expect(p2.y).toBeCloseTo(-6);
  expect(p2.z).toBeCloseTo(0);
  expect(p3.x).toBeCloseTo(-12);
  expect(p3.y).toBeCloseTo(-9);
  expect(p3.z).toBeCloseTo(0);
  expect(Math.hypot(p3.x, p3.y, p3.z)).toBeCloseTo(HIERARCHY_LAYOUT_RADIUS);
});

test('a node with two children splits its wedge into two non-overlapping, mirrored angles', () => {
  const edges = [{ from: 0, to: 1 }, { from: 0, to: 2 }];
  const positions = layoutHierarchy3D(3, edges);
  const p1 = positions.get(1)!;
  const p2 = positions.get(2)!;
  expect(p1.x).toBeCloseTo(0);
  expect(p1.y).toBeCloseTo(-9);
  expect(p1.z).toBeCloseTo(12);
  expect(p2.x).toBeCloseTo(0);
  expect(p2.y).toBeCloseTo(-9);
  expect(p2.z).toBeCloseTo(-12);
});

test('layout is deterministic', () => {
  const edges = [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 3 }];
  const a = layoutHierarchy3D(4, edges);
  const b = layoutHierarchy3D(4, edges);
  expect([...a.entries()]).toEqual([...b.entries()]);
});

test('no two nodes settle closer than the sphere diameter, for a 16-node chain (linked-list at its registry cap)', () => {
  const edges: { from: number; to: number }[] = [];
  for (let i = 0; i < 15; i++) edges.push({ from: i, to: i + 1 });
  const positions = [...layoutHierarchy3D(16, edges).values()];
  const SPHERE_DIAMETER = 0.8;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      expect(distance(positions[i]!, positions[j]!)).toBeGreaterThan(SPHERE_DIAMETER);
    }
  }
});

test('no two nodes settle closer than the sphere diameter, for a worst-case trie shape (6 words, 8 chars, no shared prefix)', () => {
  // 6 separate 8-node chains hanging off the root: the real worst case
  // trie's unchanged registry schema (words.max(6), each word.max(8))
  // allows -- no shared prefixes means every word is its own chain from
  // the root, so this is topologically equivalent to a real trie built
  // from 6 words that share no letters.
  const edges: { from: number; to: number }[] = [];
  let next = 1;
  for (let branch = 0; branch < 6; branch++) {
    let parent = 0;
    for (let step = 0; step < 8; step++) {
      edges.push({ from: parent, to: next });
      parent = next;
      next++;
    }
  }
  const positions = [...layoutHierarchy3D(next, edges).values()];
  const SPHERE_DIAMETER = 0.8;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      expect(distance(positions[i]!, positions[j]!)).toBeGreaterThan(SPHERE_DIAMETER);
    }
  }
});

test('every settled node fits within the bounding radius', () => {
  const edges: { from: number; to: number }[] = [];
  for (let i = 0; i < 15; i++) edges.push({ from: i, to: i + 1 });
  const positions = layoutHierarchy3D(16, edges);
  for (const p of positions.values()) {
    expect(Math.hypot(p.x, p.y, p.z)).toBeLessThanOrEqual(HIERARCHY_LAYOUT_RADIUS + 1e-6);
  }
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `pnpm exec vitest run packages/viz-3d/src/hierarchyLayout.test.ts`
Expected: FAIL — `./hierarchyLayout.js` cannot be resolved (module doesn't
exist yet).

- [ ] **Step 5: Implement `hierarchyLayout.ts`**

```ts
// packages/viz-3d/src/hierarchyLayout.ts
import type { GraphEdge } from '@cs/viz-core';
import { LEVEL_HEIGHT_STEP, LEVEL_RADIUS_STEP, type Position3D } from './layout.js';

export type { Position3D };

/**
 * This renderer's own bounding radius -- NOT graphLayout.ts's LAYOUT_RADIUS
 * (5), which is calibrated for GraphView3D's force-settled shapes and its
 * own camera distance. At that radius, a chain longer than ~7 nodes
 * crushes below the sphere-diameter floor (0.8) no matter how the layout
 * is shaped -- verified directly, not assumed: for any chain under a
 * rescale-to-fit-the-farthest-node layout, the root-to-first-child gap is
 * independent of LEVEL_RADIUS_STEP/LEVEL_HEIGHT_STEP's actual values and
 * shrinks linearly with chain length (see the design spec's "Why a
 * bigger, renderer-specific bounding radius" section for the full
 * derivation, including why a golden-angle spiral does NOT fix this --
 * distance from the origin depends only on radius, never angle). 15 gives
 * a 16-node chain (linked-list's registry cap, Task 3) exactly 1.0 units
 * of spacing (a 25% margin over 0.8), and lets trie's existing, unchanged
 * worst case (6 words x 8 chars, 49 nodes) settle at 1.5.
 */
export const HIERARCHY_LAYOUT_RADIUS = 15;

/** The node with no incoming edge. Falls back to index 0 if none or more than one exists. */
function findRoot(nodeCount: number, edges: GraphEdge[]): number {
  const hasParent = new Array<boolean>(nodeCount).fill(false);
  for (const e of edges) hasParent[e.to] = true;
  const roots: number[] = [];
  for (let i = 0; i < nodeCount; i++) if (!hasParent[i]) roots.push(i);
  return roots.length === 1 ? roots[0]! : 0;
}

/** Each node's direct children, in edge-array order (preserves each generator's own insertion order). */
function childrenOf(nodeCount: number, edges: GraphEdge[]): number[][] {
  const children: number[][] = Array.from({ length: nodeCount }, () => []);
  for (const e of edges) children[e.from]!.push(e.to);
  return children;
}

/**
 * Deterministic radial layout for a rooted, singly-parented, acyclic graph
 * (a chain or a tree -- not a general graph with cycles, which
 * GraphView3D's force simulation handles instead). Each node inherits an
 * angular wedge from its parent (root gets the full circle); a node with
 * n children divides its own wedge into n equal sub-wedges, one per
 * child, in edge-array order. Deeper nodes sit lower (more negative y)
 * and farther out (larger radius), matching layoutTree3D's convention.
 * Settled positions are rescaled to HIERARCHY_LAYOUT_RADIUS so any shape
 * fits this renderer's camera regardless of node count.
 */
export function layoutHierarchy3D(
  nodeCount: number,
  edges: GraphEdge[],
): Map<number, Position3D> {
  const positions = new Map<number, Position3D>();
  if (nodeCount === 0) return positions;

  const root = findRoot(nodeCount, edges);
  const children = childrenOf(nodeCount, edges);
  const depth = new Array<number>(nodeCount).fill(0);
  const angleStart = new Array<number>(nodeCount).fill(0);
  const angleEnd = new Array<number>(nodeCount).fill(Math.PI * 2);
  const seen = new Array<boolean>(nodeCount).fill(false);
  seen[root] = true;

  const queue: number[] = [root];
  while (queue.length > 0) {
    const node = queue.shift()!;
    const kids = children[node]!.filter((c) => !seen[c]);
    const span = (angleEnd[node]! - angleStart[node]!) / (kids.length || 1);
    kids.forEach((child, i) => {
      seen[child] = true;
      depth[child] = depth[node]! + 1;
      angleStart[child] = angleStart[node]! + i * span;
      angleEnd[child] = angleStart[node]! + (i + 1) * span;
      queue.push(child);
    });
  }

  for (let i = 0; i < nodeCount; i++) {
    const d = depth[i]!;
    const angle = (angleStart[i]! + angleEnd[i]!) / 2;
    const radius = d * LEVEL_RADIUS_STEP;
    positions.set(i, {
      x: radius * Math.cos(angle),
      y: d === 0 ? 0 : -d * LEVEL_HEIGHT_STEP,
      z: radius * Math.sin(angle),
    });
  }

  const maxRadius = [...positions.values()].reduce(
    (max, p) => Math.max(max, Math.hypot(p.x, p.y, p.z)), 0,
  );
  const scale = maxRadius === 0 ? 1 : HIERARCHY_LAYOUT_RADIUS / maxRadius;
  for (const [i, p] of positions) {
    positions.set(i, { x: p.x * scale, y: p.y * scale, z: p.z * scale });
  }

  return positions;
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm exec vitest run packages/viz-3d/src/hierarchyLayout.test.ts`
Expected: PASS (9 tests). If either sphere-diameter test fails, do not
weaken the test — this would mean the numeric derivation in this task's
doc comment has an error; recompute with a throwaway script (the same way
the spec's numbers were derived) before changing anything.

- [ ] **Step 7: Typecheck**

Run: `pnpm typecheck`
Expected: exits 0.

- [ ] **Step 8: Commit**

```bash
git add packages/viz-3d/src/layout.ts packages/viz-3d/src/hierarchyLayout.ts packages/viz-3d/src/hierarchyLayout.test.ts
git commit -m "feat: add HierarchyView3D's pure deterministic layout function"
```

---

### Task 2: `HierarchyView3D` component

**Files:**
- Create: `packages/viz-3d/src/HierarchyView3D.tsx`
- Modify: `packages/viz-3d/src/index.ts`

**Interfaces:**
- Consumes: `layoutHierarchy3D`, `Position3D` (from `hierarchyLayout.js`,
  Task 1); `buildGraphSummary` (from the already-shipped `graphSummary.js`);
  `describeNeighbors`, `marksForEdge`, `marksForNode`, `neighborsOf` (from
  the already-shipped `graphAccessibility.js`); `colorForMarks`,
  `INK_COLOR` (from the already-shipped `markColors.js`).
- Produces: `export interface HierarchyView3DProps { state: GraphState;
  marks?: Mark[]; label: string }` and `export function
  HierarchyView3D(props: HierarchyView3DProps): JSX.Element` — matches the
  site's `Renderer<S>` type exactly, so Task 3's `VizIsland` integration
  needs no adapter.

No dedicated test file for this task — same reasoning as
`TreeView3D.tsx`/`GraphView3D.tsx`: jsdom has no real WebGL context. The
logic worth testing (`layoutHierarchy3D`) is already fully covered by
Task 1. Verified by Playwright e2e (Task 4) and a manual screenshot check
(also Task 4) instead.

- [ ] **Step 1: Implement `HierarchyView3D.tsx`**

```tsx
// packages/viz-3d/src/HierarchyView3D.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, OrbitControls, Text } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Quaternion, Vector3 } from 'three';
import type { GraphState, Mark } from '@cs/viz-core';
import { layoutHierarchy3D, type Position3D } from './hierarchyLayout.js';
import { buildGraphSummary } from './graphSummary.js';
import { colorForMarks, INK_COLOR } from './markColors.js';
import {
  describeNeighbors, marksForEdge, marksForNode, neighborsOf,
} from './graphAccessibility.js';

export interface HierarchyView3DProps {
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

export function HierarchyView3D({ state, marks = NO_MARKS, label }: HierarchyView3DProps) {
  const { values, edges, directed = false } = state;
  // `state` comes from `snap()` (packages/viz-core/src/snap.ts), which deep-clones
  // on every frame -- `values`/`edges` get a fresh object identity each render even
  // when the graph's actual shape hasn't changed. Memoizing on those identities would
  // never hit, so memoize on a structural key instead (same pattern GraphView3D uses).
  const edgeKey = edges.map((e) => `${e.from}-${e.to}`).join(',');
  const positions = useMemo(
    () => layoutHierarchy3D(values.length, edges),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- edgeKey is edges' structural identity; values.length covers node count
    [values.length, edgeKey],
  );
  const summary = useMemo(
    () => buildGraphSummary(values.length, edges.length, directed),
    [values.length, edges.length, directed],
  );
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  if (values.length === 0) {
    return <p className="hierarchy-view-3d hierarchy-view-3d--empty">{label}: empty</p>;
  }

  const hasFocusedNode = focusedIndex !== null && values[focusedIndex] !== undefined;
  const focusedPosition = hasFocusedNode ? (positions.get(focusedIndex!) ?? null) : null;
  const focusedAnnouncement = hasFocusedNode
    ? `Node ${focusedIndex}, value ${values[focusedIndex!]}, ` +
      `${describeNeighbors(neighborsOf(focusedIndex!, values, edges, directed), directed)}.`
    : '';

  return (
    <div className="hierarchy-view-3d viz-3d">
      <div className="hierarchy-view-3d__canvas-wrap" aria-hidden="true">
        <Canvas camera={{ position: [0, 9, 36], fov: 50 }}>
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

      <div className="hierarchy-view-3d__nodes" role="group" aria-label={label}>
        {values.map((value, i) => {
          const kinds = marksForNode(marks, i);
          const neighbors = neighborsOf(i, values, edges, directed);
          const kindsText = kinds.length ? `, ${kinds.join(' ')}` : '';
          return (
            <button
              key={i}
              type="button"
              className="hierarchy-view-3d__node-button"
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

      <p className="hierarchy-view-3d__summary">
        {hasFocusedNode ? focusedAnnouncement : summary}
      </p>
      <p role="status" aria-live="polite" className="hierarchy-view-3d__announcer visually-hidden">
        {focusedAnnouncement}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Export it**

In `packages/viz-3d/src/index.ts`, add these two lines (anywhere after the
existing `GraphView3D`/`graphAccessibility` exports):

```ts
export {
  HIERARCHY_LAYOUT_RADIUS, layoutHierarchy3D,
} from './hierarchyLayout.js';
export { HierarchyView3D, type HierarchyView3DProps } from './HierarchyView3D.js';
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: exits 0. If TypeScript reports a mismatch against
`@react-three/drei`'s `<Line>`/`<Text>`/`<OrbitControls>` props, check the
actual installed `.d.ts` under `node_modules/@react-three/drei` before
guessing a fix — this component's JSX is copied verbatim from
`GraphView3D.tsx`, which already typechecks against the installed version.

- [ ] **Step 4: Commit**

```bash
git add packages/viz-3d/src/HierarchyView3D.tsx packages/viz-3d/src/index.ts
git commit -m "feat: add the HierarchyView3D component"
```

---

### Task 3: Wire `HierarchyView3D` into the site

**Files:**
- Modify: `apps/web/src/viz/types.ts` (widen the `renderer` union)
- Modify: `apps/web/src/viz/registry.ts` (`linked-list` and `trie` entries)
- Modify: `apps/web/src/components/VizIsland.tsx` (add a `HierarchyView3D`
  branch to `loadRenderer`)
- Modify: `apps/web/src/styles/viz.css` (append `.hierarchy-view-3d*` rules)

**Interfaces:**
- Consumes: `HierarchyView3D` from `@cs/viz-3d` (Task 2).
- Produces: nothing new for later tasks — this is the integration point.

- [ ] **Step 1: Widen the renderer union**

In `apps/web/src/viz/types.ts`, change:

```ts
  renderer: 'ArrayView' | 'TreeView' | 'GraphView' | 'TreeView3D' | 'GraphView3D';
```

to:

```ts
  renderer:
    | 'ArrayView' | 'TreeView' | 'GraphView'
    | 'TreeView3D' | 'GraphView3D' | 'HierarchyView3D';
```

(Only this one field changes.)

- [ ] **Step 2: Point `linked-list` at the new renderer and tighten its schema**

In `apps/web/src/viz/registry.ts`, change the `'linked-list'` entry from:

```ts
  'linked-list': {
    renderer: 'GraphView',
    label: 'Singly linked list, one arrow per node pointing at the next',
    // Deliberately the same values and readIndex/insertAt/value as the
    // 'array-basics' entry, so the two lessons can be compared directly on
    // identical input — one pays for reading, the other pays for inserting.
    defaultInput: { arr: [4, 8, 15, 16, 23, 42], readIndex: 3, insertAt: 1, value: 9 },
    inputSchema: z
      .object({
        arr: z.array(z.number()).min(1).max(32),
        readIndex: z.number().int().min(0),
        insertAt: z.number().int().min(0),
        value: z.number(),
      })
```

to:

```ts
  'linked-list': {
    renderer: 'HierarchyView3D',
    label: 'Singly linked list, one arrow per node pointing at the next',
    // Deliberately the same values and readIndex/insertAt/value SHAPE as
    // the 'array-basics' entry, so the two lessons can be compared
    // directly on identical input — one pays for reading, the other pays
    // for inserting. The two entries no longer share an identical `arr`
    // length ceiling, though: array-basics' ArrayView has no spatial
    // legibility concern, but HierarchyView3D lays this list out in 3D
    // space, and 32 nodes would crush well under the sphere-diameter
    // floor once rescaled to fit the camera (see hierarchyLayout.ts's
    // HIERARCHY_LAYOUT_RADIUS doc comment for the exact numbers). 16
    // matches the cap the three quadratic-sort lessons already use for
    // an analogous legibility reason.
    defaultInput: { arr: [4, 8, 15, 16, 23, 42], readIndex: 3, insertAt: 1, value: 9 },
    inputSchema: z
      .object({
        arr: z.array(z.number()).min(1).max(16),
        readIndex: z.number().int().min(0),
        insertAt: z.number().int().min(0),
        value: z.number(),
      })
```

(Every other field of the `linked-list` entry — the two `.refine()` calls,
`load`, `code` — stays exactly as it is today.)

- [ ] **Step 3: Point `trie` at the new renderer (no schema change)**

In `apps/web/src/viz/registry.ts`, change only the `trie` entry's
`renderer` field:

```ts
  trie: {
    renderer: 'HierarchyView3D',
    label: 'Trie built from a set of words, root as a bullet, each node a character',
```

(Every other field — `defaultInput`, `inputSchema`, `load`, `code` — is
unchanged. `trie`'s existing worst case, at `HIERARCHY_LAYOUT_RADIUS = 15`,
settles at 1.5 units of spacing — verified in Task 1's test — so no schema
tightening is needed here, unlike `linked-list`.)

- [ ] **Step 4: Add the `HierarchyView3D` branch to `loadRenderer`**

In `apps/web/src/components/VizIsland.tsx`, change:

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

to:

```tsx
function loadRenderer(rendererName: VizEntry['renderer']): Promise<Renderer<never>> {
  if (rendererName === 'TreeView3D') {
    return import('@cs/viz-3d').then((m) => m.TreeView3D as Renderer<never>);
  }
  if (rendererName === 'GraphView3D') {
    return import('@cs/viz-3d').then((m) => m.GraphView3D as Renderer<never>);
  }
  if (rendererName === 'HierarchyView3D') {
    return import('@cs/viz-3d').then((m) => m.HierarchyView3D as Renderer<never>);
  }
  return Promise.resolve(RENDERERS[rendererName]);
}
```

- [ ] **Step 5: Typecheck and build**

Run: `pnpm typecheck && pnpm build`
Expected: both exit 0.

- [ ] **Step 6: Add `hierarchy-view-3d__*` CSS**

Append to `apps/web/src/styles/viz.css` (after the existing
`.graph-view-3d__summary` rule at the end of the file):

```css
.hierarchy-view-3d {
  margin-top: .5rem;
}

.hierarchy-view-3d--empty {
  padding: 1rem;
  text-align: center;
}

.hierarchy-view-3d__canvas-wrap {
  height: 24rem;
  border: 2px solid var(--muted);
}

.hierarchy-view-3d__canvas-wrap canvas {
  display: block;
}

.hierarchy-view-3d__nodes {
  display: flex;
  flex-wrap: wrap;
  gap: .35rem;
  margin-top: .5rem;
}

.hierarchy-view-3d__node-button {
  font-family: var(--font-mono);
  font-size: var(--step-0);
  min-width: 2.5rem;
  min-height: 2.5rem;
  border: 2px solid var(--muted);
  background: var(--paper);
  color: var(--ink);
  cursor: pointer;
}

.hierarchy-view-3d__node-button:focus-visible {
  outline: 3px solid var(--signal);
  outline-offset: 2px;
}

.hierarchy-view-3d__summary {
  margin-top: .5rem;
  font-weight: 600;
}
```

(No change needed to the shared `.js .viz:has(.viz-3d)` CLS-reservation
rule — `HierarchyView3D` carries the same `viz-3d` marker class the other
two 3D renderers do, and its `__canvas-wrap` is the same fixed 24rem height
as theirs. Task 4 adds a real measured CLS test rather than assuming this
holds.)

- [ ] **Step 7: Manual dev-server check**

Run: `pnpm dev`, open `/data-structures/linked-list/`. Confirm: a 3D scene
renders (6 spheres connected by a chain of directed edges/arrowheads, no
weight labels since neither lesson sets `edge.weight`); dragging orbits the
camera; a row of node-value buttons appears below the canvas; focusing one
pans the camera and updates the text below the button strip to that node's
value and "points at" neighbour. Then open `/data-structures/trie/` and
confirm the branching structure (root `•`, three branches for `cat`/`car`/
`cart` sharing a `c`→`a` prefix) renders legibly with no overlapping
spheres. Also confirm `/algorithms/bfs/` and `/data-structures/tree/` still
render correctly (this task didn't touch their renderers, but it did touch
shared files: `types.ts`, `VizIsland.tsx`).

Run: `pnpm --filter web exec astro dev stop` when done (stops the daemon).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/viz/types.ts apps/web/src/viz/registry.ts apps/web/src/components/VizIsland.tsx apps/web/src/styles/viz.css
git commit -m "feat: wire HierarchyView3D into the linked-list and trie lessons"
```

---

### Task 4: E2E coverage, CLS measurement, visual verification, final gates

**Files:**
- Modify: `apps/web/e2e/lesson.spec.ts`
- Modify: `apps/web/src/styles/viz.css` (only if Step 3 below finds the
  shared 60rem reservation wrong for either lesson)

**Interfaces:**
- Consumes: the built site (`HierarchyView3D`-hydrated `/data-structures/
  linked-list/` and `/data-structures/trie/` pages) from Tasks 1–3.

Both lesson paths are already in `apps/web/e2e/lesson.spec.ts`'s
`ALL_LESSONS`, so they already get the standard axe/360px/CLS/dark-palette
loops — this task adds the renderer-specific tests those generic loops
don't cover.

- [ ] **Step 1: Confirm neighbor announcements for both lessons, by hand,
  before writing assertions**

Trace `linked-list`'s `defaultInput` (`arr: [4, 8, 15, 16, 23, 42]`)
through `chainEdges` (`packages/viz-core/src/algorithms/linked-list.ts`):
directed edges 0→1→2→3→4→5, so node 0 (value 4) points at node 1 (value 8)
only. `buildGraphSummary(6, 5, true)` = `"Graph, 6 nodes, 5 directed
edges."`.

Trace `trie`'s `defaultInput` (`words: ['cat', 'car', 'cart']`) through
`packages/viz-core/src/algorithms/trie.ts`: root `•` (index 0) → `c` (1) →
`a` (2) → `t` (3, completes "cat"); `a` (2) also → `r` (4, shared prefix
"ca"); `r` (4) → `t` (5, completes "cart"). 5 edges, 6 nodes — the same
counts as `linked-list` by coincidence. Node 0 (`•`) points at node 1
(`c`) only. `buildGraphSummary(6, 5, true)` = `"Graph, 6 nodes, 5 directed
edges."`.

If either trace disagrees with the registry's actual current
`defaultInput` (check `apps/web/src/viz/registry.ts` — it may have changed
since this plan was written), use the registry's real values instead of
these, the same way the `GraphView3D` pilot's own e2e task handled this.

- [ ] **Step 2: Add the keyboard/neighbor-announcement tests**

Insert into `apps/web/e2e/lesson.spec.ts`, after the existing `'reduced
motion (graph)'` `describe` block (added by the `dijkstra`/`graph-intro`
migrations) and before the `'forced light palette'` `describe` block:

```ts
test('the 3D hierarchy view (linked-list) is keyboard-operable and announces the next pointer', async ({ page }) => {
  await page.goto('/data-structures/linked-list/');
  const nodeButtons = page.locator('.hierarchy-view-3d__node-button');
  await expect(nodeButtons.first()).toBeVisible();

  const summary = page.locator('.hierarchy-view-3d__summary');
  await expect(summary).toContainText('Graph, 6 nodes, 5 directed edges.');

  await nodeButtons.nth(0).focus();
  const announcer = page.locator('.hierarchy-view-3d__announcer');
  await expect(announcer).toContainText('Node 0, value 4, points at 8.');

  await page.keyboard.press('Tab');
  await expect(announcer).toContainText('Node 1, value 8, points at 15.');
});

test('/data-structures/linked-list/ does not shift layout while the 3D view hydrates', async ({ page }) => {
  await page.goto('/data-structures/linked-list/');
  // Anchors this test to a genuinely hydrated page, same reasoning as the
  // tree/bfs pilots' own CLS tests.
  await expect(page.locator('.hierarchy-view-3d__node-button').first()).toBeVisible();
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

test.describe('reduced motion (hierarchy)', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('focusing a hierarchy node snaps the camera instead of animating it', async ({ page }) => {
    await page.goto('/data-structures/linked-list/');
    const nodeButtons = page.locator('.hierarchy-view-3d__node-button');
    await nodeButtons.nth(2).focus();
    await expect(page.locator('.hierarchy-view-3d__announcer')).toContainText('Node 2, value 15');
  });
});

test('the 3D hierarchy view (trie) is keyboard-operable and announces the next character', async ({ page }) => {
  await page.goto('/data-structures/trie/');
  const nodeButtons = page.locator('.hierarchy-view-3d__node-button');
  await expect(nodeButtons.first()).toBeVisible();

  const summary = page.locator('.hierarchy-view-3d__summary');
  await expect(summary).toContainText('Graph, 6 nodes, 5 directed edges.');

  await nodeButtons.nth(0).focus();
  const announcer = page.locator('.hierarchy-view-3d__announcer');
  await expect(announcer).toContainText('Node 0, value •, points at c.');

  await page.keyboard.press('Tab');
  await expect(announcer).toContainText('Node 1, value c, points at a.');
});
```

Run: `pnpm build && pnpm test:e2e -- -g "hierarchy"`
Expected: PASS (4 tests). If the exact neighbor text doesn't match (e.g.
either `defaultInput` has changed since this plan was written), adjust the
expected strings to match the registry's current values rather than
guessing (Step 1 shows how to re-derive them).

- [ ] **Step 3: If the CLS test from Step 2 fails, measure and correct**

If `/data-structures/linked-list/ does not shift layout while the 3D view
hydrates` fails, measure the real hydrated height:

```ts
// Temporary, in the same test file, to find the real number; delete once done.
const height = await page.evaluate(
  () => document.querySelector('.viz')!.getBoundingClientRect().height,
);
console.log(height);
```

Convert the logged pixel value to rem (`--step-0: 1rem` is `16px`, per
`apps/web/src/styles/tokens.css`), add a small safety margin, and correct
the `.js .viz:has(.viz-3d)` `min-height` in `apps/web/src/styles/viz.css`
(Task 3, Step 6) — **check this doesn't break the already-passing
`TreeView3D`/`GraphView3D` CLS tests**, since all three renderers share
this one rule; raise it to whichever value satisfies all of them, then
remove the temporary logging line.

- [ ] **Step 4: Full gate run**

Run, in order:
`pnpm lint:content && pnpm typecheck && pnpm test && pnpm build && pnpm check:offline && pnpm test:e2e`
Expected: all exit 0.

- [ ] **Step 5: Visual verification via screenshot (both lessons)**

jsdom/Playwright's DOM assertions can't see into the WebGL canvas — the
`graph-intro` migration shipped a real Critical layout bug (`e1d59a5`)
that only a screenshot caught. Do not skip this step.

Use this session's scratchpad directory (not `/tmp` — on Windows this repo
runs under Git Bash, where a scratchpad path under the OS temp directory is
the established convention; see any prior session's use of
`startPreview`/`stopPreview`/`PREVIEW_URL` from `apps/web/e2e/
preview-server.ts` for the exact pattern already proven this session on
`dijkstra`/`graph-intro`). Write a throwaway script there:

```ts
import { chromium } from '@playwright/test';
import { startPreview, stopPreview, PREVIEW_URL } from 'G:/My Projects/ez_prog/apps/web/e2e/preview-server.js';

const OUT = '<this session's scratchpad directory>';

async function shot(page: import('@playwright/test').Page, path: string, out: string) {
  await page.goto(`${PREVIEW_URL}${path}`);
  await page.locator('.hierarchy-view-3d__node-button').first().waitFor({ state: 'visible' });
  await page.waitForTimeout(800);
  await page.locator('.hierarchy-view-3d__canvas-wrap').screenshot({ path: out });
}

async function main() {
  await startPreview();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  await shot(page, '/data-structures/linked-list/', `${OUT}/linked-list.png`);
  await shot(page, '/data-structures/trie/', `${OUT}/trie.png`);
  await browser.close();
  stopPreview();
}

main().catch((e) => { console.error(e); stopPreview(); process.exit(1); });
```

Before running: stop any `astro dev` daemon first (`pnpm --filter web exec
astro dev stop`) — it and the preview server this script starts fight over
port 4321 otherwise. Then run it with `pnpm exec tsx <path-to-script>`
from `apps/web/` (`cd "G:\My Projects\ez_prog\apps\web"` first).

Look at both PNGs. Confirm for `linked-list.png`: 6 spheres in a single
visibly-connected chain (not a spiral — Task 1's layout produces a
straight line for a single-child chain), directed arrowheads pointing
from each node to the next, no two spheres overlapping or touching. Confirm
for `trie.png`: a root sphere, branching into `c`→`a`→`t`/`r` with `r`→`t`
(the "cart" branch), no overlapping spheres, arrowheads oriented parent to
child. If either shows overlap, clipping, or an unreadable jumble, do not
proceed — re-derive the numbers in `hierarchyLayout.ts`'s
`HIERARCHY_LAYOUT_RADIUS` doc comment with a throwaway script (the same
process used to write this plan) rather than guessing a fix.

- [ ] **Step 6: Commit**

```bash
git add apps/web/e2e/lesson.spec.ts
git commit -m "test: add accessibility, keyboard, and CLS coverage for HierarchyView3D"
```

(If Step 3 required a `viz.css` correction, include it in this commit too:
`git add apps/web/src/styles/viz.css`.)

---

### Task 5: Update `docs/AUTHORING.md`

**Files:**
- Modify: `docs/AUTHORING.md`

**Interfaces:** None — documentation only.

`docs/AUTHORING.md`'s renderer catalogue currently says `GraphView` "Used
by `linked-list` and `trie` in the registry today" (written when the
`GraphView3D` migrations left those two as `GraphView`'s only remaining
users). After this plan, **no shipped lesson uses `GraphView` at all** —
worth stating plainly, since a future author skimming this doc for "what
renders a `GraphState`" needs to know `GraphView` still exists and works,
it's just currently unused.

- [ ] **Step 1: Update the renderer catalogue's `GraphView` entry**

Find this passage (from the `c3aca42` docs commit) in `docs/AUTHORING.md`:

```
  - **`GraphView`** is the one 2D renderer whose state is *not* `number[]`. It takes a
    `GraphState` — `{ values, edges, directed? }` from `@cs/viz-core` — and draws an
    adjacency list, one row per node listing its neighbours, rather than a node-and-edge
    diagram. Nodes are still marked by `{ t: 'index' }`; edges use `{ t: 'edge', from,
    to }`, and on an undirected graph a single edge mark lights up both listings of that
    edge. Weights render when present. Used by `linked-list` and `trie` in the registry
    today — both acyclic (a chain and a tree, not a binary one), which is why they're
    candidates for extending `TreeView3D`'s deterministic layout rather than
    `GraphView3D`'s force-directed one (see the `GraphView3D` pilot spec's scope
    section), not migration targets for this renderer. `bfs`, `dfs`, `dijkstra`, and
    `graph-intro` have all moved off `GraphView` onto `GraphView3D` (below).
```

Replace it with:

```
  - **`GraphView`** is the one 2D renderer whose state is *not* `number[]`. It takes a
    `GraphState` — `{ values, edges, directed? }` from `@cs/viz-core` — and draws an
    adjacency list, one row per node listing its neighbours, rather than a node-and-edge
    diagram. Nodes are still marked by `{ t: 'index' }`; edges use `{ t: 'edge', from,
    to }`, and on an undirected graph a single edge mark lights up both listings of that
    edge. Weights render when present. **No shipped lesson currently uses it** — `bfs`,
    `dfs`, `dijkstra`, and `graph-intro` moved to `GraphView3D`; `linked-list` and
    `trie` (both acyclic — a chain and a tree, not a binary one) moved to
    `HierarchyView3D` (below). It remains a real, working option for a future
    `GraphState`-shaped lesson that specifically wants an adjacency-list rendering
    (e.g. one where a 3D spatial layout wouldn't add anything) — it just has no current
    user.
```

- [ ] **Step 2: Add a `HierarchyView3D` catalogue entry**

Immediately after the `GraphView3D` catalogue entry (ends with `...for
`dfs`/`dijkstra`, and `graph-intro`'s later migrations` in the `c3aca42`
version), insert:

```
  - **`HierarchyView3D`** draws the same `GraphState` shape as `GraphView`/`GraphView3D`
    — same `{ values, edges, directed? }`, same node/edge marks — as a
    camera-controllable 3D scene, but with a deterministic (not force-directed) radial
    layout: a BFS depth from a detected root plus a per-parent angular wedge, the same
    philosophy `TreeView3D`'s formula uses, generalized from "index implies structure"
    to "edges imply structure" so it also covers non-binary branching (a trie) and a
    plain chain (a linked list) — shapes `TreeView3D`'s `2i+1`/`2i+2` formula can't
    express. Deliberately **not** shared with `GraphView3D`'s bounding radius: at
    `GraphView3D`'s `LAYOUT_RADIUS` (5), a chain longer than ~7 nodes crushes below the
    sphere-diameter floor regardless of layout shape (the root-to-first-child gap is the
    bottleneck, and it's angle-invariant — a golden-angle spiral was tried and
    numerically disproven as a fix). `HierarchyView3D` gets its own, larger
    `HIERARCHY_LAYOUT_RADIUS` (15, in `hierarchyLayout.ts`) and a proportionally
    pulled-back camera instead. Used by `linked-list` and `trie`
    (`data-structures/linked-list.mdx`, `data-structures/trie.mdx`) — `linked-list`
    needed its registry schema tightened (32 → 16 nodes) to fit legibly at that radius;
    `trie`'s existing schema already fit with no change. See
    `docs/superpowers/specs/2026-08-31-hierarchyview-3d-design.md` for the full
    derivation before touching `hierarchyLayout.ts`'s constants.
```

- [ ] **Step 3: Update the `renderer` field enum list**

Find:

```
- `renderer` — `'ArrayView'`, `'TreeView'`, `'GraphView'`, `'TreeView3D'` or
  `'GraphView3D'`; the union in
```

Replace with:

```
- `renderer` — `'ArrayView'`, `'TreeView'`, `'GraphView'`, `'TreeView3D'`,
  `'GraphView3D'`, or `'HierarchyView3D'`; the union in
```

- [ ] **Step 4: Update the heavy-dependency renderer paragraph**

Find (in the "Heavy-dependency renderer" bullet, from the `c3aca42`
version):

```
  - **Heavy-dependency renderer (new, added for `TreeView3D`; `GraphView3D` now
    follows the same pattern).** `TreeView3D` and `GraphView3D` both live in the same
    workspace package, `packages/viz-3d`, wrapping
```

Replace with:

```
  - **Heavy-dependency renderer (new, added for `TreeView3D`; `GraphView3D` and
    `HierarchyView3D` now follow the same pattern).** All three live in the same
    workspace package, `packages/viz-3d`, wrapping
```

And find:

```
    separate branch each for `'TreeView3D'` and `'GraphView3D'` that both return a
```

Replace with:

```
    separate branch each for `'TreeView3D'`, `'GraphView3D'`, and `'HierarchyView3D'`
    that all return a
```

- [ ] **Step 5: Run content lint (this doc isn't lesson content, but confirm nothing else broke)**

Run: `pnpm lint:content`
Expected: exits 0 (this doc isn't linted content, but this confirms the
edit didn't accidentally corrupt something lint does check).

- [ ] **Step 6: Commit**

```bash
git add docs/AUTHORING.md
git commit -m "docs: document HierarchyView3D and GraphView's now-zero lesson usage"
```

---

## Definition of Done

- [ ] `packages/viz-3d` gains: `layoutHierarchy3D`, `HIERARCHY_LAYOUT_RADIUS`,
      `HierarchyView3D` (Tasks 1–2). `layout.ts` exports
      `LEVEL_RADIUS_STEP`/`LEVEL_HEIGHT_STEP` (Task 1).
- [ ] `data-structures/linked-list.mdx` and `data-structures/trie.mdx`
      render via `HierarchyView3D` with no lesson-prose changes needed
      (Task 3) — confirmed by hand.
- [ ] `linked-list`'s registry schema is tightened (32 → 16); `trie`'s is
      unchanged (Task 3).
- [ ] Camera orbit/zoom works; layout verified against real worst-case
      shapes (16-node chain, 49-node trie) via unit test (Task 1) AND a
      screenshot of the actual rendered page (Task 4) — not test-suite-green
      alone, given `graph-intro`'s precedent of a bug tests alone missed.
- [ ] Keyboard node-focus pans the camera, announces the node's value and
      "points at" neighbour, verified by test for both lessons (Task 4).
- [ ] `prefers-reduced-motion` path verified not to break anything (Task 4).
- [ ] CLS budget for `HierarchyView3D` is a real measured value (Task 4),
      not assumed from `GraphView3D`'s already-shipped number.
- [ ] Zero axe violations (wcag2a/wcag2aa, both colour schemes) on both
      lesson pages (Task 4, via the existing `ALL_LESSONS` loop).
- [ ] `docs/AUTHORING.md` reflects the new renderer and `GraphView`'s
      now-zero usage (Task 5).
- [ ] `pnpm lint:content`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
      `pnpm check:offline`, `pnpm test:e2e` all exit 0.
- [ ] No file under `packages/viz-core` was edited.
