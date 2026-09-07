# HierarchyView3D: Design Spec

> Companion to `docs/superpowers/specs/2026-08-27-viz-3d-tree-pilot-design.md`
> (`TreeView3D`) and `docs/superpowers/specs/2026-08-28-graphview-3d-pilot-design.md`
> (`GraphView3D`), both of which explicitly carved `linked-list` and `trie` out
> of scope as candidates for "extending `TreeView3D`'s deterministic layout."
> This spec is that extension. 2026-08-31

---

## 0. Scope of this document

Migrate **both** `data-structures/linked-list.mdx` (`linked-list` in the
registry) and `data-structures/trie.mdx` (`trie` in the registry) from the 2D
`GraphView` renderer to a new 3D renderer, in one combined implementation
plan — unlike the `GraphView3D` pilot, there is no reason to hold one lesson
back: both are small, low-risk, and together they exercise the new layout's
two real cases in a single pass (linked-list validates the degenerate
single-child chain; trie validates real branching).

**Out of scope, deliberately:**

- **Any change to `packages/viz-core`.** The new renderer consumes the exact
  same `Frame<GraphState>`/`Mark`/`Target` data `GraphView`/`GraphView3D`
  already consume; see §2. Confirmed by reading
  `packages/viz-core/src/algorithms/linked-list.ts` and `.../trie.ts`: both
  already produce `GraphState` (`{ values, edges, directed: true }`), not the
  `number[]` shape `TreeView`/`TreeView3D` consume — so this is not a
  variant of `TreeView3D`, it is a new renderer with the same *philosophy*
  (deterministic, no physics settle) applied to `GraphState` instead.
- **Literally extending `TreeView3D.tsx`.** Its layout formula (`2i+1`/`2i+2`)
  only works for a complete binary tree packed by array index — incompatible
  with a trie's variable branching factor and character-labeled nodes, and
  with a linked list's `GraphState`-shaped chain. A union prop type
  (`number[] | GraphState`) was considered and rejected: it would mix two
  different state shapes and layout algorithms behind one interface for no
  real reuse benefit, since almost nothing in `TreeView3D.tsx`'s rendering
  code is state-shape-agnostic.
- **Leaf-count-weighted angular subdivision.** See §3 — equal subdivision
  among children is deliberately simpler and sufficient at these lessons'
  sizes.
- **Any lesson beyond `linked-list`/`trie`.** No other `GraphView` lesson
  remains — `bfs`, `dfs`, `dijkstra`, and `graph-intro` are already on
  `GraphView3D` (force-directed, appropriate for graphs with cycles).
  `linked-list` and `trie` are exactly the two carved out during the graph
  pilot's own brainstorming as *not* wanting a force simulation: both are
  acyclic, single-parented (a chain and a tree, not a general graph), so a
  deterministic layout is both correct and unambiguous — no "why did the
  physics settle differently" question for a learner to ask.

---

## 1. Package and naming

`HierarchyView3D` lives in the **same** `packages/viz-3d` package
`TreeView3D`/`GraphView3D` already live in — not a new package. Named to
describe what it draws (a rooted, singly-parented tree/chain from
`GraphState`) without implying binary-only (`TreeView3D`) or force-directed
(`GraphView3D`).

No new runtime dependency: the layout is pure arithmetic (BFS traversal +
angle bookkeeping), unlike `GraphView3D`'s `d3-force-3d` physics simulation.

---

## 2. Data model — no changes to `viz-core`

`HierarchyView3D` consumes the identical `GraphState`/`Mark`/`Target` shape
`GraphView`/`GraphView3D` already consume: `{ values: (number|string)[];
edges: {from,to,weight?}[]; directed?: boolean }`. Neither
`packages/viz-core/src/algorithms/linked-list.ts` nor `.../trie.ts` is
modified.

Both lessons' generators already produce a shape this renderer can assume
without validation (the same trust boundary `GraphView3D` already has toward
its marks/edges — not re-verified at render time):

- **Exactly one root** — the node with in-degree 0. `linked-list`'s
  `chainEdges` always starts numbering at node 0 (the head); `trie`'s root
  (`'•'`) is always node 0. Root detection is still computed generically
  (in-degree 0), not hardcoded to index 0, so the renderer isn't silently
  wrong if a future lesson's generator numbers its root differently — but
  falls back to index 0 if no in-degree-0 node exists or more than one does
  (defensive default, not a validated guarantee).
- **Every non-root node has exactly one parent** — both generators build
  edges strictly parent-to-child, never creating a second incoming edge to
  an existing node. (`trie`'s prefix-reuse creates zero *new* nodes when an
  edge already exists for a character, so it never creates a second parent
  either.)
- **Acyclic and connected** — both are built purely by extension from the
  root, so there is no unreachable node and no cycle.

`directed: true` on both — reuses `GraphView3D`'s existing arrowhead
rendering unchanged; both lessons already draw arrowheads today via the 2D
`GraphView`.

Layout is a pure, directly unit-testable function:

```ts
// packages/viz-3d/src/hierarchyLayout.ts
export interface Position3D { x: number; y: number; z: number } // from ./layout.js, not redeclared

/**
 * This renderer's own bounding radius -- NOT graphLayout.ts's LAYOUT_RADIUS
 * (5). See "Why a bigger, renderer-specific bounding radius" below: at
 * GraphView3D's radius, a chain longer than ~7 nodes crushes below the
 * sphere-diameter floor no matter how the layout is shaped. 15 was chosen
 * empirically (not derived from a formula and trusted -- computed with a
 * throwaway script, the same discipline graph-intro's gravity fix used):
 * a 16-node chain settles at exactly 1.0 unit of spacing at this radius (a
 * comfortable 25% margin over the 0.8 floor), and trie's existing,
 * unchanged worst case (6 words x 8 chars, 49 nodes) settles at 1.5.
 */
export const HIERARCHY_LAYOUT_RADIUS = 15;

export function layoutHierarchy3D(state: GraphState): Map<number, Position3D> {
  // 1. Root: the node with in-degree 0, computed from state.edges;
  //    falls back to index 0 if none or multiple exist.
  // 2. Depth: BFS from root, following state.edges (from -> to).
  // 3. Angle: each node inherits an angular wedge [start, end) from its
  //    parent (root gets the full circle). A node with n children divides
  //    its own wedge into n equal sub-wedges, one per child, in edge-array
  //    order. A node sits at its wedge's midpoint angle.
  // 4. Radius/height: reuses layoutTree3D's existing LEVEL_RADIUS_STEP /
  //    LEVEL_HEIGHT_STEP values (currently private consts in ./layout.ts --
  //    this task exports them, rather than redeclaring the same two
  //    numbers a third time) per depth, for visual consistency with the
  //    already-shipped tree/graph views.
  // 5. Rescale: a uniform rescale (fit the single farthest node to
  //    HIERARCHY_LAYOUT_RADIUS, about the origin) -- the same technique
  //    layoutGraph3D.ts uses, but against this renderer's OWN constant,
  //    not graphLayout.ts's LAYOUT_RADIUS (see above).
}
```

**Equal, not leaf-count-weighted, subdivision among children.** A proper
Reingold-Tilford-style layout would give each subtree an angular slice
proportional to its descendant leaf count, so a bushy branch doesn't get
visually squeezed next to a single-leaf one. Deliberately not built:
simpler to implement and test, and correct enough at these lessons' small
sizes. A linked-list chain (every node has exactly one child) degenerates
naturally to a straight line under equal subdivision too: the wedge never
splits, so every node inherits the same angle and the chain extends
outward as a straight radial line, not a spiral.

**Why a bigger, renderer-specific bounding radius (not a spiral, not a
tighter cap alone).** The first version of this spec proposed sharing
`graphLayout.ts`'s `LAYOUT_RADIUS = 5` and capping `linked-list` at 16
nodes. That number turns out to be wrong by more than 2x: for *any* chain
under a uniform-rescale-to-fit-the-farthest-node layout, the tightest pair
is always the root and its first child, at distance `LEVEL_RADIUS_STEP *
(LAYOUT_RADIUS / deepestNodeRadius)` — a quantity that shrinks linearly as
chain length grows, independent of `LEVEL_RADIUS_STEP`/`LEVEL_HEIGHT_STEP`'s
actual values. At `LAYOUT_RADIUS = 5`, a 16-node chain settles at 0.333
units of spacing, well under the 0.8 sphere-diameter floor `graph-intro`'s
bug (`e1d59a5`) already established as a real failure mode — not a
hypothetical one. A golden-angle spiral (rotating each depth's wedge by a
fixed increment, so a chain coils instead of running straight) was
considered next and **numerically disproven**: the root always sits at the
origin, and distance-from-origin depends only on radius, never on angle,
so the root-to-first-child gap — the actual bottleneck — is completely
unaffected by any angular scheme. The only lever that actually works is
the ratio of bounding radius to sphere size, so this renderer gets its own,
larger `HIERARCHY_LAYOUT_RADIUS` and its own camera distance (§3), rather
than sharing `GraphView3D`'s. This also means `trie`'s registry schema
needs **no tightening at all** (§5.2) — its current worst case fits
comfortably at the new radius, unlike the first version of this spec
assumed.

**No rendering component work beyond swapping the layout function.**
`HierarchyView3D.tsx` is structurally a near-copy of `GraphView3D.tsx`
(§3): same edges-then-nodes render order, same `colorForMarks`/
`marksForEdge`/`marksForNode` from the already-shipped, already-tested
`graphAccessibility.ts`, same directed-edge `ArrowHead`, same weight-label
`<Text>` (dead code for these two lessons — neither sets `edge.weight` —
but free to keep since it's the same shared conditional `GraphView3D`
already has, not new code written for this component), same button strip
and hidden live region, same `CameraRig`. The only genuinely new file is
`hierarchyLayout.ts`; `HierarchyView3D.tsx` differs from `GraphView3D.tsx`
only in which layout function it calls.

---

## 3. Rendering (`HierarchyView3D.tsx`)

Structurally mirrors `GraphView3D.tsx` exactly, importing
`layoutHierarchy3D` from `./hierarchyLayout.js` in place of `layoutGraph3D`.
Its `<Canvas>` gets its own camera calibration, pulled back proportionally
to `HIERARCHY_LAYOUT_RADIUS` being 3x `GraphView3D`'s bounding radius —
`camera={{ position: [0, 9, 36], fov: 50 }}` versus `GraphView3D`'s
`[0, 3, 12]` (same fov, same viewing angle, further back so the larger
bounding sphere still fills the frame the same way). A graph-shaped idle
scene-summary reuses `buildGraphSummary` from
`graphSummary.ts` unchanged (its wording — "Graph, *n* nodes, *m* edges" —
doesn't claim anything tree-specific like levels/depth that would need a
hierarchy-shaped variant; `buildGraphSummary`'s own doc comment already
notes it deliberately omits levels/depth because "neither concept is
well-defined for a graph with cycles" — moot here since these two are
acyclic, but the wording still reads correctly for a chain or tree).

`className="hierarchy-view-3d viz-3d"` (the shared `viz-3d` marker class
both existing 3D renderers already carry, for the shared CLS-reservation
CSS rule) — a new `hierarchy-view-3d__*` class family, structurally
identical to `graph-view-3d__*`'s, since the DOM structure is identical.

---

## 4. Accessibility

Identical to `GraphView3D`'s existing pattern — no new design needed here.
Both lessons are undirected-neighbor-list-free by construction (every node
but the root has exactly one neighbor "up," described by
`graphAccessibility.ts`'s existing `describeNeighbors`/`neighborsOf`, which
already handle the directed case: "points at 1, 2" for a node with children,
"points at nothing" for a leaf). No accessibility-specific code is new;
this section exists only to confirm nothing about a tree/chain shape breaks
the existing pattern — it doesn't.

---

## 5. Registry changes

### 5.1 `linked-list`

> **Superseded (final review):** the `arr` cap below shipped at 16, but 16
> was derived from 3D spacing alone. The whole-branch review then showed 3D
> distance doesn't predict on-screen legibility: the generator splices in an
> inserted node, so a max-16 `arr` renders a 17-node chain, which projects to
> **overlapping** spheres (−2.32px) through the shipped camera. The cap is now
> **7** (an 8-node rendered chain, +3.69px), set by
> `packages/viz-3d/src/hierarchyProjection.test.ts`. Everything below is
> retained as the record of the original, narrower derivation.

- `renderer: 'GraphView'` → `'HierarchyView3D'`.
- `inputSchema.arr` max **32 → 16**: the existing 32-node ceiling was
  inherited from sharing `array-basics`'s exact shape for direct 2D-lesson
  comparability, not chosen for viz legibility — the 2D `GraphView`
  renders a chain as a scrollable adjacency list, where length doesn't hurt
  legibility. A 3D spatial layout is different: even at this renderer's
  own, larger `HIERARCHY_LAYOUT_RADIUS` (§2), a 32-node chain still settles
  at 0.484 units of spacing — under the 0.8 sphere-diameter floor. 16 is
  the largest chain length that clears that floor with a real margin (1.0
  units, computed directly, not assumed) at this radius, and happens to
  match the cap the three quadratic-sort lessons already use for an
  analogous legibility reason. `array-basics` itself is untouched (still
  32) — it uses `ArrayView`, which has no spatial-crowding concern — so a
  comment on `linked-list`'s entry should note the two lessons no longer
  share an identical input ceiling, and why.
- `defaultInput` (6 nodes) is unaffected — well under the new cap.

### 5.2 `trie`

> **Superseded (post-final-review follow-up):** the "no schema change"
> claim below held only for 3D distance. The whole-branch review that
> caught `linked-list`'s regression (§5.1) also found `trie`'s worst case
> was never screen-legible, under either camera — 6 words × 8 chars (49
> nodes, no shared prefix) projects a parent/child pair to **−1.44px**
> (overlapping) through the shipped camera, and to a still-negative value
> under the original camera too, so this was pre-existing, not a
> regression. Parked as a `test.todo` at final review pending a human
> decision; resolved by tightening the per-word length cap **8 → 4**
> (`words.max(6)` stays — word count is the more pedagogically useful axis
> for this lesson). The new worst case (6 words × 4 chars, 25 nodes)
> measures **+3.93px** on the tightest parent/child pair, set by
> `packages/viz-3d/src/hierarchyProjection.test.ts`. Everything below is
> retained as the record of the original, 3D-distance-only derivation.

- `renderer: 'GraphView'` → `'HierarchyView3D'`. **No schema change.** At
  this renderer's own `HIERARCHY_LAYOUT_RADIUS` (§2), `trie`'s existing
  worst case (6 words × 8 chars, no shared prefixes → 49 nodes, 8 levels
  deep) settles at 1.5 units of spacing — comfortably clear of the 0.8
  floor, computed directly rather than assumed. An earlier version of this
  spec proposed tightening this schema too, before the bounding-radius fix
  (§2) made it unnecessary.
- `defaultInput` (`['cat', 'car', 'cart']`, `search: 'ca'`) is unaffected.

---

## 6. Testing

Same split as both prior pilots: `layoutHierarchy3D` is a pure function,
fully unit-tested in Node/Vitest —

- Root detection (in-degree-0 node), including the index-0 fallback.
- Depth via BFS on a hand-traced small trie shape (branching) and a chain
  shape (linear) — exact expected positions checked for at least the root
  and one full path, not just aggregate properties.
- Angle: a node with *n* children produces *n* non-overlapping equal
  sub-wedges of its own wedge; a chain (single child at every node) keeps
  every node at the same angle.
- Determinism: two calls with the same input produce identical output.
- No two nodes settle closer than the sphere diameter (0.8), on both a
  deep/narrow shape (a 16-node chain, `linked-list`'s new cap) and a
  wide/deep one (a 6-word × 8-char, no-shared-prefix trie — `trie`'s
  existing, unchanged worst case) — the two real shapes §5's numbers were
  computed against, not just the lessons' small `defaultInput`s.
- Every settled node fits within `HIERARCHY_LAYOUT_RADIUS` (exported from
  `hierarchyLayout.ts`, not `graphLayout.ts`'s `LAYOUT_RADIUS` — this
  renderer does not share `GraphView3D`'s bounding radius; see §2).
- An empty graph and a single-root-only graph (no children) don't throw.

`HierarchyView3D.tsx` has no dedicated unit test — same reasoning as
`TreeView3D.tsx`/`GraphView3D.tsx`: jsdom has no real WebGL context.
Verified by Playwright e2e instead, covering, for **both** lessons: the
button strip renders with correct neighbor-describing `aria-label`s,
keyboard focus pans the camera and announces the right node, axe
zero-violations and CLS budget via the existing `ALL_LESSONS` loop (both
paths are already in that list), and `prefers-reduced-motion` behavior.
Additionally, a manual screenshot-based visual check of the built pages for
both lessons (same methodology used for `dijkstra`'s weight labels and
`graph-intro`'s arrowheads/isolated-node fix — jsdom/Playwright can't see
into the WebGL canvas, so a real rendering defect like the `graph-intro`
crowding bug wouldn't be caught by DOM assertions alone) before considering
either lesson done.

---

## 7. Definition of Done

- [ ] `packages/viz-3d` gains: `layoutHierarchy3D`, `HierarchyView3D`, and
      the `hierarchy-view-3d__*` CSS class family (viz.css). `layout.ts`
      exports `LEVEL_RADIUS_STEP`/`LEVEL_HEIGHT_STEP` (currently private)
      for `hierarchyLayout.ts` to reuse.
- [ ] `data-structures/linked-list.mdx` and `data-structures/trie.mdx`
      migrated: `<Viz id="...">` unchanged, only each registry entry's
      `renderer` field changes (plus `linked-list`'s schema tightening,
      §5.1 — `trie`'s schema is unchanged, §5.2) — verified by hand that
      both lessons' prose still reads sensibly with no edits needed.
- [ ] `layoutHierarchy3D` unit-tested per §6, including both real shapes
      §5's numbers were computed against (a 16-node chain, a 49-node
      worst-case trie).
- [ ] Accessibility (§4) verified by e2e test for both lessons: neighbor-
      describing button labels, camera-pan-on-focus, live-region
      announcement, `prefers-reduced-motion`, axe zero-violations.
- [ ] CLS budget for `HierarchyView3D` is a real measured value for both
      lessons (via the existing `ALL_LESSONS` loop, or a dedicated test if
      that loop's generic assertion isn't sufficient), not assumed from
      `GraphView3D`'s already-shipped number.
- [ ] Both lessons visually verified via screenshot of the built page (§6)
      before being considered done — not test-suite-green alone.
- [ ] `pnpm lint:content`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
      `pnpm check:offline`, `pnpm test:e2e` all exit 0.
- [ ] No file under `packages/viz-core` is edited.
