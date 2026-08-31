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
  // 5. Rescale: the same LAYOUT_RADIUS-normalizing uniform rescale
  //    layoutGraph3D.ts already uses (fit the single farthest node to a
  //    fixed radius, about the origin) -- needed because, unlike a bushy
  //    binary tree, a 16-node linked-list chain would otherwise extend far
  //    past the fixed camera. LAYOUT_RADIUS is imported from graphLayout.ts,
  //    not redeclared, so both renderers stay fit to the same shared camera.
}
```

**Equal, not leaf-count-weighted, subdivision among children.** A proper
Reingold-Tilford-style layout would give each subtree an angular slice
proportional to its descendant leaf count, so a bushy branch doesn't get
visually squeezed next to a single-leaf one. Deliberately not built:
simpler to implement and test, and correct enough at these lessons' small
sizes (`trie`'s branching factor is bounded by its word count, capped at 5
by this spec — see §5.1). A linked-list chain (every node has exactly one
child) degenerates naturally to a straight line under equal subdivision too:
the wedge never splits, so every node inherits the same angle and the chain
extends outward as a straight radial line, not a spiral.

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
A graph-shaped idle scene-summary reuses `buildGraphSummary` from
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

- `renderer: 'GraphView'` → `'HierarchyView3D'`.
- `inputSchema.arr` max **32 → 16**: the existing 32-node ceiling was
  inherited from sharing `array-basics`'s exact shape for direct 2D-lesson
  comparability, not chosen for viz legibility — the 2D `GraphView`
  renders a chain as a scrollable adjacency list, where length doesn't hurt
  legibility. A 3D spatial layout is different: `layoutHierarchy3D`'s
  rescale-to-fit-camera step (§2) would otherwise shrink a 32-node chain's
  inter-node spacing well under the sphere-diameter floor the
  `graph-intro` bug (`e1d59a5`) already established as a real failure
  mode. 16 matches the cap the three quadratic-sort lessons already use for
  an analogous legibility reason. `array-basics` itself is untouched (still
  32) — it uses `ArrayView`, which has no spatial-crowding concern — so a
  comment on `linked-list`'s entry should note the two lessons no longer
  share an identical input ceiling, and why.
- `defaultInput` (6 nodes) is unaffected — well under the new cap.

### 5.2 `trie`

- `renderer: 'GraphView'` → `'HierarchyView3D'`.
- `inputSchema.words` max **6 → 5**; per-word length max **8 → 6**. Same
  reasoning as `linked-list`: worst case (no shared prefixes) is
  `words.length * word.length` nodes at up to `word.length` deep — the
  current bound (6 × 8 = 48 nodes, 8 levels deep) is comfortably larger
  than what a small fixed camera frame can render legibly. 5 × 6 = 30 nodes
  worst case, 6 levels deep, is a meaningfully tighter bound while leaving
  room for `defaultInput`'s 3 words well below it.
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
  wide/shallow shape (a 5-word trie near its new cap) and a deep/narrow one
  (a 16-node chain at its new cap) — the two shapes this spec's schema
  changes (§5) were sized around.
- Every settled node fits within `LAYOUT_RADIUS` (imported, not
  redeclared, from `graphLayout.ts`).
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
      `renderer` field changes, plus the two schema tightenings (§5) —
      verified by hand that both lessons' prose still reads sensibly with
      no edits needed.
- [ ] `layoutHierarchy3D` unit-tested per §6, including both shapes this
      spec's schema changes were sized around (16-node chain, 5-word trie
      near its cap).
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
