# GraphView3D Pilot: Design Spec

> Companion to `docs/superpowers/specs/2026-08-27-viz-3d-tree-pilot-design.md`,
> which shipped `TreeView3D` and explicitly deferred general (cyclic) graphs
> as separate future work. This spec is that future work.
> 2026-08-28

---

## 0. Scope of this document

Pilot a 3D, force-directed rendering of an arbitrary graph on **exactly one
lesson**: `algorithms/bfs.mdx` (the `bfs` viz entry). `GraphView`'s 2D
markup is fully replaced by `GraphView3D` on that lesson only.

**Out of scope, deliberately:**

- **`dfs`, `dijkstra`, `graph-intro`.** Migrating them is later, separate,
  mostly-mechanical follow-up, once this pilot proves the force-directed
  layout and its accessibility pattern hold up — the same methodology
  `TreeView3D` (and `bst` after it) already used. `dfs` shares `bfs`'s exact
  graph shape (same `defaultInput`), so it should need close to zero new
  design work. `dijkstra` adds edge-weight labels (§3 already designs the
  rendering for this, just not exercised by the pilot). `graph-intro` adds a
  learner-toggleable `directed` flag (§3 also already designs arrow
  rendering for this).
- **`linked-list` and `trie`.** Both are acyclic (a chain and a tree,
  respectively) and were explicitly carved out during brainstorming as
  candidates for extending `TreeView3D`'s existing deterministic layout
  rather than needing this spec's force-directed approach at all. Not
  addressed here.
- **Any change to `packages/viz-core`.** `GraphView3D` consumes the exact
  same `Frame<GraphState>`/`Mark`/`Target` data `GraphView` already
  consumes; see §2.

---

## 1. Package and dependency

`GraphView3D` lives in the **same** `packages/viz-3d` package `TreeView3D`
already lives in — not a new package. Both need the Three.js stack, no
lesson ever uses both renderers at once (so there is no bundle-duplication
cost to sharing), and `GraphView3D` reuses `colorForMarks` and the
accessibility pattern (`aria-hidden` canvas + a parallel real-DOM button
strip + a hidden live region) `TreeView3D` already established.

New dependency, exact pin verified against the npm registry and against the
package's own shipped source on 2026-08-28: **`d3-force-3d@3.0.6`**. No
official `@types/d3-force-3d` package exists — this plan needs a small local
ambient type declaration (`packages/viz-3d/src/d3-force-3d.d.ts`) covering
only the functions actually used (`forceSimulation`, `forceManyBody`,
`forceLink`, `forceCenter`, `forceCollide`), not a full API surface.

**Determinism, verified against the installed package's real source, not
assumed:** `forceSimulation`'s internal random-number generator (`lcg()`,
a linear congruential generator) is seeded with a fixed constant (`s = 1`)
every time a simulation is constructed — not from wall-clock time or
crypto randomness. Node starting positions, when not explicitly set, are
also assigned deterministically from each node's array index (a
golden-ratio-angle spiral). Together, this means the simulation's settled
output is **fully deterministic for a given graph** — same nodes and edges
in, same layout out, every time — with no seeding work required from this
codebase. This matches the same "no run-to-run difference to explain to a
learner" property `layoutTree3D` already has.

---

## 2. Data model — no changes to `viz-core`

`GraphView3D` consumes the identical `GraphState`/`Mark`/`Target` shape
`GraphView` already consumes today: `{ values: (number|string)[]; edges:
{from,to,weight?}[]; directed?: boolean }`. `bfs`'s algorithm generator in
`packages/viz-core/src/algorithms/bfs.ts` is **not modified**. Confirmed by
reading the source: `bfs`/`dfs`/`dijkstra` mark **edges**, not just nodes,
during traversal (`{ kind: 'active', at: { t: 'edge', from, to } }` and
`{ kind: 'discard', ... }`) — `GraphView3D`'s edges must be
`colorForMarks`-colorable, not a fixed color, unlike `TreeView3D`'s edges
(which are never marked by `tree-traversal`).

Layout is computed by a pure, directly unit-testable function:

```ts
// packages/viz-3d/src/graphLayout.ts
export interface Position3D { x: number; y: number; z: number }

const SETTLE_TICKS = 300; // matches d3-force-3d's own default convergence
                            // point (alphaDecay reaches alphaMin at ~300
                            // ticks of its normal async stepping)

export function layoutGraph3D(
  nodeCount: number,
  edges: { from: number; to: number }[],
): Map<number, Position3D> {
  // Builds `nodeCount` plain node objects and `{source, target}` link
  // objects (using raw index numbers -- forceLink's default `.id()`
  // accessor resolves against each node's auto-assigned `.index`, which is
  // exactly array position, so this needs no custom id function).
  // Applies forceManyBody (repulsion), forceLink (attraction along edges),
  // forceCenter (keeps the whole graph centered at the origin), and
  // forceCollide (a fixed per-node radius, so settled nodes never visually
  // overlap regardless of graph density). Calls `.stop()` immediately to
  // cancel the auto-started async timer, then steps `SETTLE_TICKS` times
  // synchronously via `.tick()` before reading final positions -- fully
  // synchronous, no timers, no async, matching "pre-settled, shown static"
  // (§3).
}
```

**The force strengths (`forceManyBody`'s repulsion, `forceLink`'s target
distance, `forceCollide`'s radius) are starting values, not verified-good
ones.** Unlike `layoutTree3D`'s formula (hand-traced and proven correct for
its exact use case before shipping), a force simulation's quality can only
really be judged by looking at real settled output for the real graphs this
renders. The implementation task must render `bfs`'s actual 6-node graph,
visually confirm no overlapping nodes and a legible spread, and tune the
constants if the defaults don't produce that — the same "estimate, then
verify and correct" discipline the tree pilot's CLS reservation used.

---

## 3. Rendering (`GraphView3D.tsx`)

Structurally mirrors `TreeView3D.tsx`: a `@react-three/fiber` `<Canvas>`
(`aria-hidden`, `OrbitControls` for the same drag/zoom camera control),
nodes as spheres positioned via `layoutGraph3D` and colored via
`colorForMarks`, plus a button strip and hidden live region below it (§4).

Edges need more than `TreeView3D`'s fixed-color `<Line>`s:

- **Color**: `colorForMarks` applied per edge (via the same `{t:'edge'}`
  mark-resolution logic `GraphView`'s 2D renderer already has, reused
  conceptually, not copied verbatim since the data structure differs).
- **Direction**: when `state.directed` is true, a small cone primitive
  (`<mesh>` with a `coneGeometry`) at the edge's midpoint, oriented along
  the edge's direction vector, acting as an arrowhead. `bfs` never sets
  `directed: true` (confirmed in its algorithm source: hardcoded
  `directed: false`), so the pilot never exercises this path, but the
  component must not break when a later migration (`graph-intro`) does.
- **Weight labels**: when `edge.weight !== undefined`, a `<Text>` at the
  edge's midpoint showing the weight, using the same self-hosted font
  (`/fonts/IBMPlexMono-Regular.ttf`) the offline-guarantee fix already
  established for `TreeView3D` — not a new font asset. `bfs` has no
  weighted edges, so the pilot never exercises this path either, but
  `dijkstra`'s later migration will.

**Shared marker class, a small in-service refactor to `TreeView3D.tsx`:**
both 3D renderers' outer containers get a shared `viz-3d` class alongside
their own specific one (`className="tree-view-3d viz-3d"` /
`className="graph-view-3d viz-3d"`), so a single CSS rule
(`.js .viz:has(.viz-3d) { min-height: ...; }`) reserves layout space for
either renderer, replacing the tree-specific-only
`.js .viz:has(.tree-view-3d)` rule. `GraphView3D` still gets its own real,
measured CLS e2e test in the pilot task — a force-directed layout spreads
nodes differently than the tree's compact radial one, so the already-shipped
number is a starting point to re-verify, not something to assume still
holds.

---

## 4. Accessibility

Per-step narration (`Player`'s existing note region) and the camera-pan-on-
focus mechanism (`CameraRig`, unchanged) carry over exactly as `TreeView3D`
built them. Two things are graph-specific:

1. **Node buttons describe neighbors, not just position.** A tree's 3D
   position already implies its structure (a node's depth and ring say
   where its parent is); a graph's doesn't — two nodes can sit near each
   other in the settled layout without being connected at all. Mirroring
   2D `GraphView`'s existing pattern (`Node ${i}, value ${value}${kinds...}`
   for the node, then a neighbor list per row), each button's `aria-label`
   names its neighbors: for `bfs` (undirected, unweighted, the pilot's only
   exercised case), something like `Node 2, value 15, neighbours 0 and 3`.
   The weighted (`", weight 5"` per neighbor) and directed (`"points at"`
   vs `"neighbours are"`) variants are designed here for `dijkstra`/
   `graph-intro`'s later migrations but not exercised by the pilot.
2. **A graph-shaped idle scene-summary**, a new pure function parallel to
   `buildSceneSummary`:

```ts
// packages/viz-3d/src/graphSummary.ts
export function buildGraphSummary(
  nodeCount: number,
  edgeCount: number,
  directed: boolean,
): string {
  // e.g. "Graph, 6 nodes, 6 edges." (undirected) or "Graph, 6 nodes, 6
  // directed edges." -- mirrors 2D GraphView/graph-intro's own note-text
  // style. Deliberately does NOT report "levels" or "depth" the way
  // buildSceneSummary does for trees -- neither concept is well-defined
  // for a graph with cycles.
}
```

---

## 5. Testing

Same split as the tree pilot, same reasoning: `layoutGraph3D` and
`buildGraphSummary` are pure functions, fully unit-tested in Node/Vitest —
determinism (two calls with the same input produce identical output),
connected nodes ending up closer together than an unconnected pair, a
single-node graph, an empty graph. `GraphView3D.tsx` has no dedicated unit
test (jsdom has no real WebGL context) — verified by Playwright e2e instead,
covering: the button strip renders with correct neighbor-describing
`aria-label`s, keyboard focus pans the camera and announces the right node,
a real measured CLS check (not assumed from the tree pilot's number), axe
zero-violations on the hydrated page, and `prefers-reduced-motion` behavior
(camera snap vs. tween, same as `TreeView3D`).

---

## 6. Pilot and Definition of Done

- [ ] `packages/viz-3d` gains: `layoutGraph3D`, `buildGraphSummary`,
      `GraphView3D`, and a local `d3-force-3d.d.ts` ambient type
      declaration (§1–§4).
- [ ] `TreeView3D.tsx` gains the shared `viz-3d` marker class (§3); the CSS
      reservation rule is generalized to match either 3D renderer.
- [ ] `algorithms/bfs.mdx` migrated: `<Viz id="bfs">` unchanged, only the
      registry's `renderer` field changes to `'GraphView3D'` — verified by
      hand that the lesson's prose still reads sensibly with no edits
      needed (the same outcome `tree-traversal`'s and `bst`'s migrations
      had).
- [ ] Force parameters (`forceManyBody`/`forceLink`/`forceCollide`) tuned
      against `bfs`'s real 6-node graph until the settled layout has no
      overlapping nodes and a legible spread — not shipped at their
      untuned starting values without a visual check.
- [ ] Accessibility (§4) verified by test: neighbor-describing button
      labels, camera-pan-on-focus, live-region announcement,
      `prefers-reduced-motion`, axe zero-violations on the hydrated page.
- [ ] CLS budget for `GraphView3D` on `/algorithms/bfs/` is a real measured
      value (§3, §5), not assumed from `TreeView3D`'s already-shipped
      number.
- [ ] `pnpm lint:content`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
      `pnpm check:offline`, `pnpm test:e2e` all exit 0.
- [ ] No file under `packages/viz-core` is edited.
