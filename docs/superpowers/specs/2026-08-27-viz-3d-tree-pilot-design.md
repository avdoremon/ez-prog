# 3D Tree Visualization Pilot: Design Spec

> Companion to `IMPLEMENTATION_PLAN.md`, which names 2D visualization
> (`packages/viz-core` + `packages/viz-react`) but never mentions 3D — this
> is net-new scope, not a deferred item from the original roadmap.
> 2026-08-27

---

## 0. Scope of this document

Pilot a 3D, camera-controllable rendering of a binary tree on **exactly one
lesson**: `data-structures/tree.mdx` (the `tree-traversal` viz entry, which
today renders via `TreeView`). `TreeView`'s 2D markup is fully replaced by
the 3D view **on that lesson only**.

**Out of scope, deliberately:**

- **`GraphView` / general graphs.** `GraphView`'s own doc comment already
  states it is "deliberately not a node-and-edge diagram" because a real
  spatial layout "needs force simulation or hand-authored coordinates,
  neither of which survives a 360px screen or a screen reader." Force-
  directed 3D layout for arbitrary graphs is a materially harder problem
  than a tree's deterministic layout (§2) and is separate future work,
  attempted only after this pilot proves the accessibility pattern (§4)
  actually holds up.
- **The other 7 lessons using `TreeView`/`GraphView`** (`bst`, `graph`,
  `trie`, `linked-list`, `bfs`, `dfs`, `dijkstra`). Migrating them is a
  later, separate, mechanical follow-up once this pilot ships — the same
  methodology `PHASE0-EXIT.md` used for the viz engine and the Code Runner
  spec used for `RunnableCode`: build it, prove it on one real lesson,
  document the pattern, treat the rest as follow-up.
- **Any change to `packages/viz-core`.** The 3D renderer consumes the exact
  same `Frame<number[]>` / `Mark` / `Target` data `TreeView` already
  consumes; see §2.

---

## 1. Package location and dependencies

`packages/viz-3d` — a new workspace package, **not** folded into
`packages/viz-react`. The reason it must be separate: `three` +
`@react-three/fiber` + `@react-three/drei` is roughly 250KB+ gzipped, by
far the heaviest dependency this project has ever added (for comparison,
CodeMirror was chosen specifically for being "10x lighter than Monaco").
Every one of the other 27 lessons must pay zero bytes for it — that is only
possible if importing `viz-3d` is opt-in per-page (§3), which requires it
to be its own package with its own entry point, the same reasoning
`packages/viz-core`/`packages/viz-react` were already split from `apps/web`
for.

Exact versions, verified against the npm registry on 2026-08-27:

| Package | Version |
|---|---|
| `three` | `0.185.1` |
| `@react-three/fiber` | `9.7.0` |
| `@react-three/drei` | `10.7.8` |
| `@types/three` | `0.185.4` |

`@react-three/fiber@9.7.0`'s peer range is `react >=19 <19.3` /
`react-dom >=19 <19.3` — confirmed compatible with this repo's pinned
`react@19.2.8`.

---

## 2. Data model and layout — no changes to `viz-core`

`TreeView3D` (§3) consumes the identical `Frame<(number | null)[]>` /
`Mark` / `Target` shape `TreeView` already consumes today: index `i`'s
children are `2i+1` and `2i+2`, the same mapping the Heaps lesson
describes. The `tree-traversal` algorithm generator in
`packages/viz-core/src/algorithms/tree-traversal.ts` is **not modified**.

3D position is computed from that same flat array by a pure, directly
unit-testable function:

```ts
// packages/viz-3d/src/layout.ts
export interface Position3D { x: number; y: number; z: number }

export function layoutTree3D(state: (number | null)[]): Map<number, Position3D> {
  // Deterministic radial/layered formula: depth (from the index's binary
  // representation) maps to y; breadth-first angular spread at each depth
  // maps to x/z. Same input always produces the same layout -- no physics
  // simulation, no settling jitter, no run-to-run difference to explain to
  // a learner.
}
```

Because layout is a pure function of `state` alone (marks never affect
position), it is fully testable in Node/Vitest with no renderer, no
Three.js, and no DOM involved at all — same testing philosophy as
`buildSandboxedSource` in the Code Runner spec.

---

## 3. Component and lazy-loading

`packages/viz-3d` exports one component:

```tsx
// packages/viz-3d/src/TreeView3D.tsx
export interface TreeView3DProps {
  state: (number | null)[];
  marks?: Mark[];
  label: string;
}
export function TreeView3D(props: TreeView3DProps): JSX.Element { ... }
```

Internally: a `@react-three/fiber` `<Canvas>` containing `OrbitControls`
(from `drei`, giving the approved drag-to-rotate/scroll-to-zoom camera
control), one mesh + `Text` label (also `drei`) per node positioned via
`layoutTree3D`, and `Line` primitives (`drei`) connecting each node to its
parent's position. The canvas itself carries `aria-hidden="true"` — see §4
for why the accessible interface lives elsewhere.

**Wiring into the lesson**, mirroring `Viz.astro`/`VizIsland`'s existing
pattern (unlike `RunnableCode`, `TreeView3D` keeps the `.astro` wrapper —
it needs both things `Viz.astro` already provides: validating the `id`
against a registry, and the `<noscript>` fallback, §4):

```astro
<!-- apps/web/src/components/Viz3D.astro (new, mirrors Viz.astro) -->
---
import TreeView3DIsland from './TreeView3DIsland.tsx';
---
<figure class="viz viz-3d">
  <TreeView3DIsland id={id} client:visible />
  <noscript>...</noscript>
</figure>
```

`client:visible` — the same hydrate-on-scroll-into-view directive
`Viz.astro`/`RunnableCode` both use — means the `packages/viz-3d` bundle is
fetched only once a reader actually scrolls to this one visualization on
this one lesson page. (The Code Runner's migration hit a real bug where
this directive was accidentally omitted from the shipped MDX and the
component silently never hydrated — verify by hand, on a real page, that
this actually happens before calling the component done; do not rely on
the directive being present just because it's written down here.)

---

## 4. Accessibility

Per-step narration is **unchanged**: `Frame.note` (a required, non-empty,
one-sentence explanation) still drives `Player`'s existing `role="status"
aria-live="polite"` note region regardless of which renderer is mounted —
this is already the primary screen-reader channel for every lesson today,
2D or 3D.

What `TreeView3D` adds, to replace what `TreeView`'s native `role="tree"` /
`treeitem` / `aria-expanded` nesting gave for free in the DOM:

1. **A visible scene-summary region** (`role="status" aria-live="polite"`,
   separate from `Player`'s note region), computed fresh each frame from
   `state` + `marks` — e.g. *"Binary search tree, 7 nodes, 3 levels. Node 4
   (value 15) is active."* Visible, not hidden: this serves low-vision and
   cognitive-load readers too, not only screen-reader users.
2. **One real, focusable, visually-invisible overlay `<button>` per node**,
   absolutely positioned over that node's projected 2D screen coordinate
   (a standard pattern for making canvas/WebGL content keyboard-operable).
   Tab order follows the tree's pre-order traversal — the same order
   `TreeView`'s DOM nesting already implied. Focusing one:
   - Pans/zooms the camera to center that node.
   - Announces the node's full detail (value, depth, active marks) via the
     scene-summary region from (1).
3. **`prefers-reduced-motion` governs camera *transitions* only** — the
   pan-to-node in (2) and any mark-triggered recentering snap instantly
   instead of tweening when the media query matches, per
   `IMPLEMENTATION_PLAN.md`'s existing "tắt animation, chỉ nhảy frame"
   (disable animation, just jump frames) rule. Manual drag/orbit is direct
   user input, not autoplaying animation, and is never restricted by this
   setting.
4. **No-JS fallback is not new work** — `Viz3D.astro`'s `<noscript>` (§3)
   reuses the exact static-message mechanism `Viz.astro` already ships.

**Axe target**: the same zero-violations gate (`wcag2a`/`wcag2aa`, both
colour schemes) every other lesson already meets. The canvas is
`aria-hidden`, so axe never inspects it; the overlay buttons and the
scene-summary region are ordinary labelled, focusable DOM and must satisfy
axe the same way any other interactive control on the site does.

---

## 5. Testing

jsdom provides no real WebGL context, so — same split, same reasoning as
the Code Runner spec's Worker problem:

- **`layout.test.ts`**: unit tests on `layoutTree3D` directly (Node,
  Vitest) — deterministic output for a given input array, correct
  depth/breadth spread, no Three.js or DOM involved.
- **`scene-summary.test.ts`**: unit tests on the pure text-building
  function behind the live region in §4.1 — same reasoning, same
  environment.
- **Playwright e2e** (real Chromium, real WebGL) is the *only* place that
  verifies: the canvas actually renders and responds to drag/zoom; Tab
  moves through the overlay buttons in the right order and each focus
  triggers the correct announcement; axe reports zero violations on the
  hydrated page; a real (measured, not estimated) CLS check — the Code
  Runner's final review found an unverified, guessed CLS reservation that
  turned out fine only by luck of the Layout Instability scoring formula;
  this pilot's CLS budget must be established the same way that review
  demanded: scroll the island into view, measure, *then* set the reserved
  height from the real number; `prefers-reduced-motion` emulation, asserting
  camera transitions snap rather than tween; the `<noscript>` fallback.

---

## 6. Pilot and Definition of Done

- [ ] `packages/viz-3d` built: `layoutTree3D`, `TreeView3D`, per §1–§3.
- [ ] `apps/web/src/components/Viz3D.astro` + its React island built,
      mirroring `Viz.astro`'s id-validation + `<noscript>` pattern (§3).
- [ ] `data-structures/tree.mdx` migrated: `<Viz id="tree-traversal">`
      swapped for `<Viz3D id="tree-traversal">` (or equivalent), verified
      by hand that `client:visible` actually hydrates the component on a
      real page load (§3's warning).
- [ ] Accessibility (§4) verified by test, not just by hand: overlay
      buttons, scene-summary live region, `prefers-reduced-motion` camera
      behavior, axe zero-violations on the hydrated page.
- [ ] CLS budget for the 3D island is a real measured value (§5), not an
      estimate — the comment in the CSS reservation rule must describe a
      check that actually ran, the way the Code Runner spec's original
      (wrong) comment did not.
- [ ] `pnpm lint:content`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
      `pnpm check:offline`, `pnpm test:e2e` all exit 0.
- [ ] No file under `packages/viz-core` is edited — any surprise there is
      the same "stop and report" signal `docs/AUTHORING.md` §0 already
      establishes for content work; it applies equally to engine work.
