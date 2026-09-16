# BarView3D Full Migration: Design Spec

> Follow-up to `docs/superpowers/specs/2026-09-16-barview-3d-design.md`
> (the original 5-sort-lesson `BarView3D` spec), prompted by the user
> asking to apply it to every remaining `ArrayView` lesson after noticing
> some lessons still looked "old." 2026-09-16.

---

## 0. Scope of this document

Migrate the remaining **13** `ArrayView` lessons to `BarView3D`, and
extend `BarView3D` itself to support `(number | null)[]` state (empty
slots) so all 13 can move, not just the ones that already fit
`BarView3D`'s current `number[]`-only type.

**Confirmed by reading each generator's `VizAlgorithm<I, S>` signature —
not assumed from the lesson's registry id alone:**

| Group | Lessons | State type | Change needed |
|---|---|---|---|
| A — plain `number[]` | `binary-search`, `linear-search`, `two-pointer`, `sliding-window`, `array-basics`, `heap`, `amortized-growth`, `greedy-coins`, `queue`, `stack` | `number[]` | `renderer` field only |
| B — needs null-slot support | `hash-table`, `dp-fibonacci`, `recursion` | `(number \| null)[]` | `BarView3D` extension + `renderer` field |

Group B is **3** lessons, not the 2 (`hash-table`, `dp-fibonacci`) first
guessed when scoping this with the user — `recursion`'s call-stack state
(`packages/viz-core/src/algorithms/recursion.ts`) is also
`(number | null)[]`, discovered only by actually reading its type
signature. `queue`/`stack` looked like candidates for the same reason
(their *input* — `ops` — is `(number | null)[]`, `null` meaning "dequeue"/
"pop") but their *rendered state* is confirmed plain `number[]`: the
queue/stack itself never holds a null, only the operation list does.

All 13 generators were also checked for `Mark`/`Target` kinds: every one
uses only `{ t: 'index' }`/`{ t: 'range' }`, never `{ t: 'edge' }` — no new
`Target` kind, no change to `packages/viz-core` beyond nothing at all
(same as the original 5-lesson migration).

**Out of scope, deliberately:**

- Any lesson already on a 3D renderer (`TreeView3D`, `GraphView3D`,
  `HierarchyView3D` lessons) — not "old," already migrated.
- Any change to `packages/viz-core` — confirmed unnecessary above.
- Bar-slide-on-swap animation — same reasoning as the original spec's §0.

---

## 1. `BarView3D`'s null-slot extension

Mirrors `ArrayView`'s own null-slot convention
(`packages/viz-react/src/renderers/ArrayView.tsx`): `null` is a slot that
exists but holds nothing (a hash table's unfilled bucket, a DP table's
not-yet-computed cell, a call stack's frame beyond the current depth) —
not the same as the value `0`, which is a real, meaningful bar.

**`barLayout.ts`:**

```ts
export const EMPTY_BAR_HEIGHT = 0.1; // a thin, fixed marker -- not scaled by any value

export interface Bar3D extends Position3D {
  height: number;
  sign: 1 | -1;
  isEmpty: boolean;
}

export function layoutBar3D(values: (number | null)[]): Map<number, Bar3D> {
  // maxAbs is computed from non-null values only (Math.max(1, ...numeric)),
  // same divide-by-zero guard as before, now also covering "every value is
  // null."
  // A null slot gets height = EMPTY_BAR_HEIGHT (fixed, never scaled --
  // it must never coincidentally read as "a very small real value"),
  // sign = 1, isEmpty = true. x position is UNCHANGED -- an empty slot
  // still occupies its own place in the row, exactly like ArrayView's
  // empty cell keeps the row from going ragged.
}
```

`cameraDistanceFor` is unchanged (still keyed on `n` and `BAR_MAX_HEIGHT`
alone) — `EMPTY_BAR_HEIGHT` (0.1) is far under `BAR_MAX_HEIGHT` (4), so an
empty slot never becomes the tallest thing in the scene and never affects
the vertical-fit distance.

**`BarView3D.tsx`:** an empty slot renders as a `wireframe` box at
`EMPTY_BAR_HEIGHT` (visually distinct from a solid, colored bar — the 3D
equivalent of `ArrayView`'s dashed border) instead of the normal solid
`meshStandardMaterial`, and skips the value `<Text>` label (there is no
value to show). The button-strip label reads `"Slot i, empty"` instead of
`"Slot i, value v"` — same pattern `ArrayView`'s
`aria-label={... isEmpty ? 'empty' : value}` already uses.

**`barSummary.ts`:** `buildBarSummary`'s per-mark description branch
becomes `state[mark.at.i] === null ? 'empty' : \`value ${state[mark.at.i]}\`` — the
only change; `resolveBarMarks` is untouched (it never inspects values, only
indices/ranges).

---

## 2. A real legibility question, measured before deciding: the 64-cap lessons

`binary-search`, `linear-search`, `sliding-window`, and `two-pointer` all
allow `arr` up to **64** elements — far beyond anything `BarView3D` has
rendered (the sort lessons' worst case was 24). `cameraDistanceFor`'s
horizontal fit is closed-form, but closed-form correctness does not by
itself mean *legible*: as `n` grows, the same frustum width has to fit
more bars, so the pixel gap between adjacent bars shrinks — verified with
a real projection calculation (same method as
`barProjection.test.ts`/`hierarchyProjection.test.ts`), not assumed:

| n | adjacent-bar gap |
|---|---|
| 24 | 8.65px |
| 32 | 6.62px |
| 40 | 5.54px |
| 48 | 4.69px |
| 56 | 4.06px |
| 64 | 3.58px |

> Corrected during implementation: a quick standalone script (used only to
> decide scope before writing this spec) first estimated the n=32 case at
> 6.77px; `barProjection.test.ts`, importing the real shipped
> `cameraDistanceFor`/`BAR_CAMERA_HEIGHT` rather than re-deriving them, is
> the authoritative measurement and reads 6.62px. The other rows above
> were never re-measured against the real test and may carry the same
> small discrepancy — treat only 24/32 (both now backed by a real pinned
> test) as load-bearing.

64 clears the project's `MIN_GAP_PX = 3` floor, but only by 0.58px — a
~19% margin, far thinner than every other lesson this project has shipped
(the sort lessons' own worst case, 24 bars, has a 188% margin). Per this
project's own established practice (`linked-list`/`trie`'s registry caps
were both set from a real screenshot judgement anchored to `MIN_GAP_PX`,
not from "positive gap" alone — see
`docs/superpowers/specs/2026-08-31-hierarchyview-3d-design.md` §5), this
is not something to accept on arithmetic alone.

**Decision: cap these 4 lessons' `arr.max()` at 64 → 32 for `BarView3D`**
(6.62px, comfortably closer to this project's typical margins), to be
confirmed with a real screenshot during implementation before treating it
as settled — exactly the same order of operations (measure, screenshot,
then decide) `linked-list`/`trie` went through. If the screenshot judges
32 still too dense, the implementation task tightens further and this
section is corrected, not silently overridden.

No other lesson in Group A or B needs a schema change: their existing
maxima (`heap` 31, `hash-table` 16, `amortized-growth` 32,
`array-basics` 32, `queue` 24, `stack` 40, `greedy-coins` 12,
`dp-fibonacci`'s table length ≤16, `recursion`'s stack depth ≤11) are all
at or below 32, where the gap is already ≥6.62px.

---

## 3. Registry changes

All 13 entries change `renderer: 'ArrayView'` → `'BarView3D'`. Additionally:

- `binary-search`, `linear-search`, `sliding-window`, `two-pointer`:
  `arr` schema max 64 → 32 (§2).
- All others: `renderer` field only, no schema change.

No `.mdx` lesson prose changes — same as every prior 3D migration.

---

## 4. Testing

- `barLayout.test.ts` gains null-slot cases: a null value gets
  `EMPTY_BAR_HEIGHT`/`isEmpty: true`; an all-null array doesn't divide by
  zero; a mix of null and real values scales correctly off the real ones
  only.
- `barSummary.test.ts` gains a null-value mark-description case.
- `barProjection.test.ts` gains a case at `n = 32` (the new cap) replacing
  the need to test 64, plus keeps the existing 16/24 cases (still the
  worst case for the sort lessons).
- e2e: the pre-existing `ALL_LESSONS` axe/CLS loop automatically covers
  all 13 once migrated (no new loop needed, same as the original
  migration). One additional keyboard-operable test is added, on a
  Group B (null-slot) lesson specifically (`hash-table`), since that is
  the one behavior (`empty` announcement) not already covered by the
  original migration's `bubble-sort` keyboard test.
- Visual verification: screenshot all 13 lessons at a representative
  frame, specifically including `hash-table` (empty-slot wireframe
  rendering) and the 32-bar worst case of one of the 4 capped lessons —
  not test-suite-green alone, per this project's own established
  practice (a real defect was found exactly this way in the original
  `BarView3D` migration).

---

## 5. Definition of Done

- [ ] `BarView3D`, `barLayout.ts`, `barSummary.ts` support
      `(number | null)[]` state; empty slots render as a visually distinct
      wireframe marker, never scaled by any value.
- [ ] All 13 lessons migrated to `BarView3D`; `binary-search`,
      `linear-search`, `sliding-window`, `two-pointer` have `arr.max()`
      tightened 64 → 32, confirmed by real screenshot.
- [ ] `barLayout.test.ts`/`barSummary.test.ts` cover null-slot behavior.
- [ ] `barProjection.test.ts` covers the new 32-bar worst case with a real
      measured, pinned number.
- [ ] All 13 lessons screenshot-verified, including `hash-table`'s
      empty-slot rendering and the 32-bar case.
- [ ] `pnpm lint:content`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
      `pnpm check:offline`, `pnpm test:e2e` all exit 0.
- [ ] No file under `packages/viz-core` is edited. No `.mdx` lesson file's
      prose changed.
