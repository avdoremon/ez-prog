# BarView3D: Design Spec

> Sibling to `docs/superpowers/specs/2026-08-27-viz-3d-tree-pilot-design.md`
> (`TreeView3D`), `.../2026-08-28-graphview-3d-pilot-design.md` (`GraphView3D`),
> and `.../2026-08-31-hierarchyview-3d-design.md` (`HierarchyView3D`). Prompted
> by a reference visualization style (a 3D bar-chart sort animation) the user
> pointed at; this spec adapts the *idea* — bars whose height encodes value,
> in 3D — to this project's existing engine and conventions, not a copy of
> any specific implementation. 2026-09-16.

---

## 0. Scope of this document

Migrate all 5 existing sort lessons — `bubble-sort`, `insertion-sort`,
`selection-sort`, `merge-sort`, `quick-sort` — from the 2D `ArrayView`
renderer to a new 3D renderer, `BarView3D`, in one combined implementation
plan. All 5 at once, per explicit decision: unlike `GraphView3D`'s pilot (one
lesson first, to de-risk a physics-based layout), there is no analogous risk
here — all 5 generators already share the exact same `Frame<number[]>` shape
`ArrayView` consumes today, so there is no per-lesson unknown to de-risk one
lesson at a time against.

**Decided during brainstorming, load-bearing for the rest of this spec:**

- **Bars keep a fixed position per array index**, exactly like every
  existing renderer (`ArrayView`, `TreeView3D`, `GraphView3D`,
  `HierarchyView3D`) keeps each element's on-screen position fixed and only
  changes color/height/labels between frames. A swap changes the *height and
  color* at the two affected slots, not which slot a bar occupies. This was
  an explicit choice against animating bars sliding to a new slot (closer to
  the "reel" reference but a wholly new pattern for this codebase — value-
  identity tracking across frames, a tween per swap, its own
  `prefers-reduced-motion` handling) in favor of consistency with the site's
  established discrete-step-player philosophy (`IMPLEMENTATION_PLAN.md`
  §4.3: a step debugger, not continuous animation).

**Out of scope, deliberately:**

- **Any change to `packages/viz-core`.** All 5 generators
  (`bubble-sort.ts`, `insertion-sort.ts`, `selection-sort.ts`,
  `merge-sort.ts`, `quick-sort.ts`) already yield `Frame<number[]>` with
  `index`/`range` marks (`cursor`, `compare`, `swap`, `done`, `active`,
  `discard`) — confirmed by reading all 5 files. `BarView3D` consumes this
  unchanged; no generator is touched.
- **Any `.mdx` lesson content change.** Exactly like every prior 3D
  migration, `<Viz id="...">` embeds don't name a renderer — only the
  registry entry's `renderer` field does. Lesson prose is unaffected.
- **A literal extension of `TreeView3D`/`GraphView3D`/`HierarchyView3D`.**
  None of their layout formulas (complete-binary-tree index math, force
  simulation, angular hierarchy subdivision) describes "n independent slots
  in a row" — a new, much simpler layout function, but still its own
  renderer file, matching this codebase's one-shape-one-renderer convention
  (`coding-style.md`: small, single-purpose files).
- **Animated bar-slide-on-swap.** See the decision above.
- **Any renderer beyond the 5 sort lessons.** No other `ArrayView` lesson
  moves: `binary-search`, `big-o`, `two-pointer`, `sliding-window`,
  `hash-table`, `heap`, `amortized-growth`, `greedy-coins`,
  `best-average-worst-case`, `dynamic-programming`, `recursion`,
  `linear-search` all keep `ArrayView` — none of them is fundamentally a
  "bars encoding magnitude" visualization the way a comparison sort is, and
  migrating them isn't what was asked.

---

## 1. Package and naming

`BarView3D` lives in the **same** `packages/viz-3d` package the other three
already live in. Named for what it draws (bars in a row, height = value) —
deliberately not `ArrayView3D`, to avoid implying it's a drop-in 3D upgrade
for every `ArrayView` lesson (it isn't; see §0's scope list).

No new runtime dependency: `three` / `@react-three/fiber` / `@react-three/drei`
are already `viz-3d` dependencies. The layout is pure arithmetic (evenly
spaced slots + a linear height scale), no physics simulation.

---

## 2. Data model — no changes to `viz-core`

`BarView3D` consumes the identical `Frame<number[]>` shape `ArrayView`
consumes today: a plain `number[]` state, with `Mark`s targeting `{ t:
'index' }` or `{ t: 'range' }` (never `{ t: 'edge' }` — all 5 generators only
ever emit `index`/`range` marks, confirmed by reading each file). Like
`ArrayView.resolveMarks`, `BarView3D` rejects an `edge` mark rather than
silently ignoring it — the same "fail loudly on a shape the renderer can't
draw" rule `ArrayView` already applies, ported unchanged rather than
re-invented.

Two things `ArrayView` never had to handle, because a flat list has no
notion of magnitude, that a bar's *height* now must:

- **Sign.** None of the 5 lessons' `inputSchema`s constrain values to be
  positive (`z.array(z.number())`, no `.positive()`/`.int()`) — the "Try your
  own input" editor accepts negative numbers and non-integers today, and
  will keep accepting them. A bar for a negative value extends *down* from a
  `y = 0` baseline plane instead of up; the baseline itself is drawn (a thin,
  wide plane) so `0` reads as "no bar," not "missing bar."
- **Scale.** Bar height is `|value| * scale`, where `scale` is derived once
  per run from the *current run's own* values (`BAR_MAX_HEIGHT /
  max(1, maxAbs(state))`) — the `max(1, ...)` guards an all-zero array
  against a division by zero, mirroring the same defensive-default instinct
  `HierarchyView3D`'s root-detection fallback already uses for its own edge
  case. A value's magnitude only ever needs to be legible *relative to the
  other values in the same run*, not across lessons or across separate runs,
  so a per-run scale (not a fixed one) is correct, not just convenient.
- **A visibility floor.** `height = max(MIN_BAR_HEIGHT, |value| * scale)` so
  a zero (or a value that rounds to a sliver at this scale) still renders as
  a visible thin plate rather than disappearing — the 3D equivalent of
  `ArrayView`'s empty-slot handling (§ its own doc comment: "a non-breaking
  space... so an empty cell keeps the height of a filled one").

Layout is a pure, directly unit-testable function:

```ts
// packages/viz-3d/src/barLayout.ts
export interface Position3D { x: number; y: number; z: number } // from ./layout.js, not redeclared

export const BAR_WIDTH = 0.8;      // matches the 0.8 sphere-diameter floor
                                    // unit scale the other 3D renderers use
export const BAR_PITCH = 1.2;      // center-to-center; leaves a 0.4 visible
                                    // gap between adjacent bars at BAR_WIDTH
export const BAR_MAX_HEIGHT = 4;   // the tallest bar at the current run's max |value|
export const MIN_BAR_HEIGHT = 0.15;

export interface Bar3D extends Position3D { height: number; sign: 1 | -1 }

export function layoutBar3D(state: number[]): Map<number, Bar3D> {
  // 1. scale = BAR_MAX_HEIGHT / max(1, max(|v| for v in state))
  // 2. For index i: x = (i - (n - 1) / 2) * BAR_PITCH, z = 0
  //    height = max(MIN_BAR_HEIGHT, |state[i]| * scale)
  //    sign = state[i] < 0 ? -1 : 1
  //    y = (sign * height) / 2   -- so the box's vertical CENTER is offset
  //    from the y=0 baseline by half its own height, i.e. it sits flush
  //    against the baseline and extends away from it, up or down.
}

/**
 * Closed-form, not empirically tuned like HierarchyView3D's
 * HIERARCHY_LAYOUT_RADIUS: bar pitch here is FIXED regardless of n (bars
 * never crowd each other as n grows -- the failure mode HierarchyView3D's
 * fixed bounding radius had), so the only thing that changes with n is the
 * TOTAL ROW WIDTH, which camera distance alone can compensate for by simple
 * frustum-width trigonometry. See barProjection.test.ts for the real
 * on-screen verification this formula's constants are checked against.
 */
export function cameraDistanceFor(n: number): number {
  // halfWidth = ((n - 1) / 2) * BAR_PITCH + BAR_WIDTH / 2 + MARGIN
  // distance  = halfWidth / (aspect * tan(fov_radians / 2)), clamped to a
  //   MIN_CAMERA_DISTANCE floor so a 1- or 2-bar run doesn't dolly in
  //   uncomfortably close.
}
```

**Why camera distance, not a fixed worst-case-tuned camera.** Every other 3D
renderer picks ONE fixed camera position tuned to its worst-case input,
because their layouts pack more elements into the *same* fixed bounding
volume as the element count grows — more crowding, a genuine geometric
problem no camera position alone can fix (see `HierarchyView3D`'s §2: "the
only lever that actually works is the ratio of bounding radius to sphere
size"). A row of bars is different: `BAR_PITCH` never shrinks as `n` grows,
so bars never crowd each other — the *only* thing that changes is how wide
the whole row is, which is exactly what dollying the camera back
compensates for. This is why no `inputSchema.arr` tightening is expected for
any of the 5 lessons (unlike `linked-list`/`trie`'s forced cap in the
`HierarchyView3D` migration) — **expected, to be confirmed, not assumed**:
that migration's own record (§5.1/§5.2's "Superseded" notes) is a direct
lesson in not trusting an optimistic claim like this without a real
projection measurement, which is exactly what `barProjection.test.ts` (§6)
exists to check before this spec's Definition of Done can claim it.

**No rendering component work beyond the layout being different.**
`BarView3D.tsx` is structurally a near-copy of `TreeView3D.tsx`: same
`Canvas`/lighting/`OrbitControls`/`CameraRig` setup, same
`colorForMarks(marksForIndex(marks, i))` call, same per-element `<Text>`
value label, same hidden button-strip-plus-announcer accessibility pattern.
The only genuinely new files are `barLayout.ts` and `barProjection.test.ts`;
`BarView3D.tsx` differs from `TreeView3D.tsx` only in which layout function
it calls and in adding the baseline plane mesh.

---

## 3. Rendering (`BarView3D.tsx`)

Structurally mirrors `TreeView3D.tsx`, importing `layoutBar3D`/
`cameraDistanceFor` from `./barLayout.js` in place of `layoutTree3D`. Each
bar is a `<mesh boxGeometry args={[BAR_WIDTH, height, BAR_WIDTH]}>`
positioned via `layoutBar3D`'s output, colored via
`colorForMarks(marksForIndex(marks, i))` (a `marksForIndex` ported
unchanged from `TreeView3D`'s own, since both key marks by `{ t: 'index'
}`) — plus one additional flattening step `range` marks need (mirroring
`ArrayView.resolveMarks`'s `range` branch: a `{ t: 'range', from, to }` mark
applies to every index in `[from, to]`).

A `<mesh>` baseline plane at `y = 0`, spanning the full row width (computed
from `n` the same way `cameraDistanceFor` does), gives the `value = 0` case
a visible reference rather than an invisible flush-to-nothing bar.

Camera: `<Canvas camera={{ position: [0, BAR_CAMERA_HEIGHT,
cameraDistanceFor(state.length)], fov: 50 }}>`, recomputed via `useMemo`
keyed on `state.length` (which is invariant across frames within one run,
since every sort here only reorders/rewrites values in place — never
resizes the array — so this only ever recomputes once per run, not once per
frame). `BAR_CAMERA_HEIGHT` (a fixed constant, angled slightly downward at
the row — the same purpose `HierarchyView3D`'s `[25.5, 9, 25.5]` and
`GraphView3D`'s `[0, 3, 12]` each serve, a perspective that reads as "3D,"
not a flat top-down or dead-on-level view) is derived and pinned by
`barProjection.test.ts` alongside the distance formula's constants.

`className="bar-view-3d viz-3d"` (the shared `viz-3d` marker class every 3D
renderer carries, for the shared CLS-reservation CSS rule) — a new
`bar-view-3d__*` class family, structurally identical to `tree-view-3d__*`'s.

`CameraRig` is reused unchanged: focusing a bar (via the button strip) pans
the orbit target to that bar's `(x, y, z)`, exactly like `TreeView3D`
focusing a node — the same component, no new camera-rig logic.

---

## 4. Accessibility

Identical pattern to `TreeView3D`/`HierarchyView3D` — no new design needed.
One hidden `<button>` per bar (`aria-label="Slot {i}, value {v}{, marks}"`),
`onFocus`/`onClick` sets the focused index (pans the camera, per §3), a
visible resting summary (`"Array, n values."`, mirroring
`buildSceneSummary`'s existing wording — reused unchanged, since a bar row
is exactly the same "flat sequence" shape `TreeView3D`'s summary function
already describes for `ArrayView`-shaped state), and a hidden
`aria-live="polite"` announcer for the focused bar's detail. No new
accessibility primitive is written; `marksForIndex` reuses `TreeView3D`'s
implementation, not a fork.

---

## 5. Registry changes

All 5 entries change only their `renderer` field:

| Lesson | `renderer` change | `inputSchema` change |
|---|---|---|
| `bubble-sort` | `'ArrayView'` → `'BarView3D'` | none expected |
| `insertion-sort` | `'ArrayView'` → `'BarView3D'` | none expected |
| `selection-sort` | `'ArrayView'` → `'BarView3D'` | none expected |
| `merge-sort` | `'ArrayView'` → `'BarView3D'` | none expected |
| `quick-sort` | `'ArrayView'` → `'BarView3D'` | none expected |

"None expected" per §2's frustum-width argument — **not** claimed as settled
until `barProjection.test.ts` (§6) measures it against each lesson's actual
`inputSchema.arr` max (16 for the three quadratic sorts, 24 for merge/quick)
using real values, not just the `defaultInput`s. If the projection test
finds a real legibility problem at a schema's own worst case (e.g., bars at
`n = 24` becoming visually indistinct in width, or a maximum-value run
compressing every other bar to `MIN_BAR_HEIGHT` — a scale problem
`barLayout.test.ts`, not `barProjection.test.ts`, should catch first), the
fix is scoped then, following exactly the precedent
`HierarchyView3D`'s own spec left behind: tighten the schema, document why,
update this table.

`defaultInput`s are unaffected (all under every lesson's own existing cap
already).

---

## 6. Testing

Same split as every prior 3D renderer: `barLayout.ts` is a pure function,
fully unit-tested in Node/Vitest (`barLayout.test.ts`) —

- Positions: `n` bars evenly spaced at `BAR_PITCH`, centered on `x = 0`.
- Height scaling: proportional to `|value|`, `MIN_BAR_HEIGHT` floor
  respected for a zero (and near-zero) value, correct behavior for an
  all-zero array (no divide-by-zero).
- Sign: a negative value's bar center sits below `y = 0`; a positive one's
  above; `y = 0`'s box centers flush at the baseline either way.
- `cameraDistanceFor`: monotonically non-decreasing in `n`; never below
  `MIN_CAMERA_DISTANCE`.
- Determinism: two calls with the same input produce identical output.

`barProjection.test.ts` (mirroring `hierarchyProjection.test.ts`'s
methodology exactly): builds a real `three.js` camera from the derived
constants and measures actual projected on-screen pixel gap between
adjacent bars —

- At each of the 5 lessons' own `inputSchema.arr` max (16, 16, 16, 24, 24)
  with a worst-case-for-crowding value distribution.
- At each lesson's `defaultInput` length, for the common case.
- Asserts a positive, real (not assumed) pixel margin between adjacent
  bars, and that the outermost bars remain within the viewport at the
  camera's `fov`/aspect.

`BarView3D.tsx` itself has no dedicated unit test — same reasoning as every
other 3D renderer: jsdom has no real WebGL context. Verified by Playwright
e2e instead, covering, for all 5 lessons: the button strip renders with
correct value-and-mark `aria-label`s, keyboard focus pans the camera and
announces the right bar, axe zero-violations and CLS budget via the
existing `ALL_LESSONS`/`RUNNABLE_LESSONS`-style loop, and
`prefers-reduced-motion` behavior. Additionally, a manual screenshot-based
visual check of all 5 built lesson pages (the same methodology used for
`graph-intro`'s crowding fix and `dijkstra`'s weight labels — jsdom/
Playwright can't see into the WebGL canvas, so a real rendering defect
wouldn't be caught by DOM assertions alone) before considering any lesson
done, specifically checking: a mid-sort frame with an active swap (color
correct), and the `DONE` frame (every bar reads as sorted/`done`-colored).

---

## 7. Definition of Done

- [x] `packages/viz-3d` gains: `layoutBar3D`, `cameraDistanceFor`,
      `BarView3D`, and the `bar-view-3d__*` CSS class family (`viz.css`).
- [x] All 5 sort lessons' registry entries (`bubble-sort`, `insertion-sort`,
      `selection-sort`, `merge-sort`, `quick-sort`) migrated: `renderer`
      field only, `<Viz id="...">` unchanged, verified by hand that every
      lesson's prose still reads sensibly with no edits needed.
- [x] `barLayout.ts`/`cameraDistanceFor` unit-tested per §6, including
      sign, zero-value floor, and determinism.
- [x] `barProjection.test.ts` measures real on-screen bar spacing at every
      lesson's actual schema-max array length (16/16/16/24/24), not just
      `defaultInput` — and the §5 table's "none expected" schema-change
      claim is either confirmed by this test or corrected, matching what
      actually gets found (per `HierarchyView3D`'s own precedent of a
      spec's initial optimistic claim being wrong until measured).
- [x] Accessibility (§4) verified by e2e test for all 5 lessons: value-
      and-mark-describing button labels, camera-pan-on-focus, live-region
      announcement, `prefers-reduced-motion`, axe zero-violations.
- [x] CLS budget for `BarView3D` is a real measured value for all 5
      lessons (via the existing e2e CLS loop), not assumed from another
      3D renderer's already-shipped number.
- [x] All 5 lessons visually verified via screenshot of the built page
      (§6) before being considered done — not test-suite-green alone —
      specifically a mid-run swap frame and the final `DONE` frame.
- [x] `pnpm lint:content`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
      `pnpm check:offline`, `pnpm test:e2e` all exit 0.
- [x] No file under `packages/viz-core` is edited. No `.mdx` lesson file's
      prose changes, only its registry entry.
