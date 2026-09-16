# BarView3D Full Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `BarView3D` to support `(number | null)[]` state (empty
slots) and migrate the remaining 13 `ArrayView` lessons onto it.

**Architecture:** `barLayout.ts`/`barSummary.ts`/`BarView3D.tsx` gain
null-slot support (an empty slot renders as a thin, fixed-height
wireframe marker, never scaled by any value — the 3D equivalent of
`ArrayView`'s dashed empty cell). All 13 registry entries then change
`renderer: 'ArrayView'` → `'BarView3D'`; 4 of them
(`binary-search`/`linear-search`/`sliding-window`/`two-pointer`) also get
`arr.max()` tightened 64 → 32, a real legibility finding measured in the
design spec.

**Tech Stack:** Same as the original `BarView3D` work — no new
dependency.

**Spec:** `docs/superpowers/specs/2026-09-16-barview3d-full-migration-design.md`

## Global Constraints

- **No file under `packages/viz-core` is edited** — confirmed unnecessary
  by reading all 13 generators' type signatures (§0 of the spec).
- **No `.mdx` lesson file's prose is edited** — only registry entries'
  `renderer` (and, for 4 lessons, `inputSchema.arr.max()`) change.
- An empty (`null`) slot's bar height (`EMPTY_BAR_HEIGHT`) is a **fixed
  constant**, never derived from any value — it must never be
  mistakable for "a very small real value."
- Every numeric claim about camera-fit margins must be a real measured
  number (via the same projection-test method already established), not
  assumed from the closed-form formula alone.

---

### Task 1: Null-slot support in `barLayout.ts`

**Files:**
- Modify: `packages/viz-3d/src/barLayout.ts`
- Modify: `packages/viz-3d/src/barLayout.test.ts`

**Interfaces:**
- Produces: `EMPTY_BAR_HEIGHT: number`; `Bar3D` gains `isEmpty: boolean`;
  `layoutBar3D` signature changes from `(values: number[])` to
  `(values: (number | null)[])`.

- [x] **Step 1: Write the failing tests**

Add to `packages/viz-3d/src/barLayout.test.ts`:

```ts
import { EMPTY_BAR_HEIGHT } from './barLayout.js'; // add to the existing import line

test('a null value renders as a fixed-height, marked-empty bar', () => {
  const bars = layoutBar3D([5, null, 3]);
  const empty = bars.get(1)!;
  expect(empty.isEmpty).toBe(true);
  expect(empty.height).toBe(EMPTY_BAR_HEIGHT);
  expect(empty.sign).toBe(1);
});

test('a real value is never marked empty', () => {
  const bars = layoutBar3D([0, 5]);
  expect(bars.get(0)!.isEmpty).toBe(false);
  expect(bars.get(1)!.isEmpty).toBe(false);
});

test('height scaling ignores null values when finding the max', () => {
  const bars = layoutBar3D([null, 10, null, 20]);
  expect(bars.get(3)!.height).toBeCloseTo(BAR_MAX_HEIGHT); // 20 is the real max
  expect(bars.get(1)!.height).toBeCloseTo(BAR_MAX_HEIGHT / 2); // 10 is half of 20
});

test('an all-null array does not divide by zero', () => {
  const bars = layoutBar3D([null, null, null]);
  for (const b of bars.values()) {
    expect(b.isEmpty).toBe(true);
    expect(b.height).toBe(EMPTY_BAR_HEIGHT);
    expect(Number.isFinite(b.height)).toBe(true);
  }
});

test("a null slot's x position is unaffected -- it still occupies its own row slot", () => {
  const bars = layoutBar3D([5, null, 3]);
  const xs = [...bars.values()].map((b) => b.x).sort((a, b) => a - b);
  expect(xs).toEqual([-BAR_PITCH, 0, BAR_PITCH]);
});
```

- [x] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run packages/viz-3d/src/barLayout.test.ts`
Expected: FAIL — `layoutBar3D` doesn't accept `null` yet / `EMPTY_BAR_HEIGHT` doesn't exist.

- [x] **Step 3: Update `barLayout.ts`**

old_string:
```ts
/** A bar never renders shorter than this, so a zero (or near-zero) value stays visible. */
export const MIN_BAR_HEIGHT = 0.15;
```

new_string:
```ts
/** A bar never renders shorter than this, so a zero (or near-zero) value stays visible. */
export const MIN_BAR_HEIGHT = 0.15;

/**
 * A null slot's fixed height -- never derived from any value, so it can
 * never be mistaken for "a very small real value." Rendered with a
 * visually distinct wireframe material (BarView3D.tsx), the 3D
 * equivalent of ArrayView's dashed empty-cell border.
 */
export const EMPTY_BAR_HEIGHT = 0.1;
```

old_string:
```ts
export interface Bar3D extends Position3D {
  height: number;
  sign: 1 | -1;
}

export function layoutBar3D(values: number[]): Map<number, Bar3D> {
  const bars = new Map<number, Bar3D>();
  const n = values.length;
  if (n === 0) return bars;

  const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));
  const scale = BAR_MAX_HEIGHT / maxAbs;

  for (let i = 0; i < n; i++) {
    const value = values[i]!;
    const sign: 1 | -1 = value < 0 ? -1 : 1;
    const height = Math.max(MIN_BAR_HEIGHT, Math.abs(value) * scale);
    const x = (i - (n - 1) / 2) * BAR_PITCH;
    const y = (sign * height) / 2;
    bars.set(i, { x, y, z: 0, height, sign });
  }

  return bars;
}
```

new_string:
```ts
export interface Bar3D extends Position3D {
  height: number;
  sign: 1 | -1;
  isEmpty: boolean;
}

export function layoutBar3D(values: (number | null)[]): Map<number, Bar3D> {
  const bars = new Map<number, Bar3D>();
  const n = values.length;
  if (n === 0) return bars;

  const numeric = values.filter((v): v is number => v !== null);
  const maxAbs = Math.max(1, ...numeric.map((v) => Math.abs(v)));
  const scale = BAR_MAX_HEIGHT / maxAbs;

  for (let i = 0; i < n; i++) {
    const value = values[i];
    const x = (i - (n - 1) / 2) * BAR_PITCH;

    if (value === null) {
      bars.set(i, { x, y: EMPTY_BAR_HEIGHT / 2, z: 0, height: EMPTY_BAR_HEIGHT, sign: 1, isEmpty: true });
      continue;
    }

    const sign: 1 | -1 = value < 0 ? -1 : 1;
    const height = Math.max(MIN_BAR_HEIGHT, Math.abs(value) * scale);
    const y = (sign * height) / 2;
    bars.set(i, { x, y, z: 0, height, sign, isEmpty: false });
  }

  return bars;
}
```

- [x] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run packages/viz-3d/src/barLayout.test.ts`
Expected: PASS, all tests green (including the pre-existing ones from the
original migration — `Math.max(1, ...numeric...)` behaves identically to
the old `Math.max(1, ...values...)` when no value is null).

- [x] **Step 5: Commit**

```bash
git add packages/viz-3d/src/barLayout.ts packages/viz-3d/src/barLayout.test.ts
git commit -m "feat: add null-slot support to layoutBar3D"
```

---

### Task 2: Null-slot support in `barSummary.ts`

**Files:**
- Modify: `packages/viz-3d/src/barSummary.ts`
- Modify: `packages/viz-3d/src/barSummary.test.ts`

**Interfaces:**
- `buildBarSummary`'s `state` parameter type changes from `number[]` to
  `(number | null)[]`. `resolveBarMarks` is unchanged (it never inspects
  values).

- [x] **Step 1: Write the failing test**

Add to `packages/viz-3d/src/barSummary.test.ts`:

```ts
test('buildBarSummary describes a null slot as empty, not as a value', () => {
  const summary = buildBarSummary([5, null, 3], [{ kind: 'cursor', at: { t: 'index', i: 1 } }]);
  expect(summary).toBe('Array, 3 values. Slot 1 (empty) is cursor.');
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run packages/viz-3d/src/barSummary.test.ts`
Expected: FAIL — current text reads `(value null)`, not `(empty)`.

- [x] **Step 3: Update `barSummary.ts`**

old_string:
```ts
export function buildBarSummary(state: number[], marks: Mark[] = []): string {
  if (state.length === 0) return 'Empty array.';

  const base = `Array, ${state.length} value${state.length === 1 ? '' : 's'}.`;

  const parts: string[] = [];
  for (const mark of marks) {
    if (mark.at.t === 'index') {
      parts.push(`Slot ${mark.at.i} (value ${state[mark.at.i]}) is ${mark.kind}.`);
    } else if (mark.at.t === 'range') {
```

new_string:
```ts
export function buildBarSummary(state: (number | null)[], marks: Mark[] = []): string {
  if (state.length === 0) return 'Empty array.';

  const base = `Array, ${state.length} value${state.length === 1 ? '' : 's'}.`;

  const parts: string[] = [];
  for (const mark of marks) {
    if (mark.at.t === 'index') {
      const value = state[mark.at.i];
      const described = value === null ? 'empty' : `value ${value}`;
      parts.push(`Slot ${mark.at.i} (${described}) is ${mark.kind}.`);
    } else if (mark.at.t === 'range') {
```

- [x] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run packages/viz-3d/src/barSummary.test.ts`
Expected: PASS, all tests green.

- [x] **Step 5: Commit**

```bash
git add packages/viz-3d/src/barSummary.ts packages/viz-3d/src/barSummary.test.ts
git commit -m "feat: add null-slot support to buildBarSummary"
```

---

### Task 3: Null-slot rendering in `BarView3D.tsx`

**Files:**
- Modify: `packages/viz-3d/src/BarView3D.tsx`

**Interfaces:**
- `BarView3DProps.state` type changes from `number[]` to
  `(number | null)[]`.

- [x] **Step 1: Update the props type and imports**

old_string:
```ts
import { BAR_PITCH, BAR_WIDTH, cameraDistanceFor, layoutBar3D, type Bar3D } from './barLayout.js';
```

new_string:
```ts
import {
  BAR_PITCH, BAR_WIDTH, EMPTY_BAR_HEIGHT, cameraDistanceFor, layoutBar3D, type Bar3D,
} from './barLayout.js';
```

old_string:
```ts
export interface BarView3DProps {
  state: number[];
  marks?: Mark[];
  label: string;
}
```

new_string:
```ts
export interface BarView3DProps {
  state: (number | null)[];
  marks?: Mark[];
  label: string;
}
```

- [x] **Step 2: Render an empty slot as a wireframe marker, not a solid colored bar**

old_string:
```ts
          {state.map((value, i) => {
            const bar = bars.get(i)!;
            const color = colorForMarks(resolved.get(i) ?? []);
            return (
              <group key={i} position={[bar.x, bar.y, bar.z]}>
                <mesh>
                  <boxGeometry args={[BAR_WIDTH, bar.height, BAR_WIDTH]} />
                  <meshStandardMaterial color={color} />
                </mesh>
                <Text
                  position={[0, (bar.sign * bar.height) / 2 + bar.sign * 0.35, 0]}
                  fontSize={0.32}
                  color={INK_COLOR}
                  anchorX="center"
                  font="/fonts/IBMPlexMono-Regular.ttf"
                >
                  {String(value)}
                </Text>
              </group>
            );
          })}
```

new_string:
```ts
          {state.map((value, i) => {
            const bar = bars.get(i)!;
            const color = colorForMarks(resolved.get(i) ?? []);
            return (
              <group key={i} position={[bar.x, bar.y, bar.z]}>
                <mesh>
                  <boxGeometry args={[BAR_WIDTH, bar.height, BAR_WIDTH]} />
                  {bar.isEmpty ? (
                    <meshStandardMaterial color={color} wireframe />
                  ) : (
                    <meshStandardMaterial color={color} />
                  )}
                </mesh>
                {!bar.isEmpty && (
                  <Text
                    position={[0, (bar.sign * bar.height) / 2 + bar.sign * 0.35, 0]}
                    fontSize={0.32}
                    color={INK_COLOR}
                    anchorX="center"
                    font="/fonts/IBMPlexMono-Regular.ttf"
                  >
                    {String(value)}
                  </Text>
                )}
              </group>
            );
          })}
```

- [x] **Step 3: Update the button-strip and focus-announcement labels for empty slots**

old_string:
```ts
  const focusedAnnouncement = hasFocusedBar
    ? `Slot ${focusedIndex}, value ${state[focusedIndex!]}` +
      `${focusedKinds.length ? `, ${focusedKinds.join(' ')}` : ''}.`
    : null;
```

new_string:
```ts
  const focusedValue = hasFocusedBar ? state[focusedIndex!] : null;
  const focusedAnnouncement = hasFocusedBar
    ? `Slot ${focusedIndex}, ${focusedValue === null ? 'empty' : `value ${focusedValue}`}` +
      `${focusedKinds.length ? `, ${focusedKinds.join(' ')}` : ''}.`
    : null;
```

old_string:
```ts
      <div className="bar-view-3d__bars" role="group" aria-label={label}>
        {state.map((value, i) => {
          const kinds = resolved.get(i) ?? [];
          return (
            <button
              key={i}
              type="button"
              className="bar-view-3d__bar-button"
              aria-label={`Slot ${i}, value ${value}${kinds.length ? `, ${kinds.join(' ')}` : ''}`}
              onFocus={() => setFocusedIndex(i)}
              onBlur={() => setFocusedIndex(null)}
              onClick={() => setFocusedIndex(i)}
            >
              {value}
            </button>
          );
        })}
      </div>
```

new_string:
```ts
      <div className="bar-view-3d__bars" role="group" aria-label={label}>
        {state.map((value, i) => {
          const kinds = resolved.get(i) ?? [];
          const described = value === null ? 'empty' : `value ${value}`;
          return (
            <button
              key={i}
              type="button"
              className="bar-view-3d__bar-button"
              aria-label={`Slot ${i}, ${described}${kinds.length ? `, ${kinds.join(' ')}` : ''}`}
              onFocus={() => setFocusedIndex(i)}
              onBlur={() => setFocusedIndex(null)}
              onClick={() => setFocusedIndex(i)}
            >
              {value === null ? '·' : value}
            </button>
          );
        })}
      </div>
```

- [x] **Step 4: Typecheck**

Run: `pnpm --filter @cs/viz-3d exec tsc --noEmit`
Expected: exits 0. `EMPTY_BAR_HEIGHT` is imported but not directly
referenced in this file (only via `layoutBar3D`'s internals) — remove it
from the import if the compiler flags it as unused; keep it only if a
lint rule requires re-exporting types consumed transitively (check
`pnpm typecheck`'s actual output rather than guessing).

- [x] **Step 5: Commit**

```bash
git add packages/viz-3d/src/BarView3D.tsx
git commit -m "feat: render null slots as a wireframe marker in BarView3D"
```

---

### Task 4: Migrate the 10 Group A lessons (plain `number[]`)

**Files:**
- Modify: `apps/web/src/viz/registry.ts`

`renderer: 'ArrayView'` → `'BarView3D'` on exactly these 10 entries —
`binary-search`, `heap`, `amortized-growth`, `greedy-coins`, `queue`,
`stack`, `array-basics`, `sliding-window`, `two-pointer`,
`linear-search`. (The schema tightening for `binary-search`,
`sliding-window`, `two-pointer`, `linear-search` is Task 6, not this one
— keep this task to the renderer field only, so a failure in Task 6 does
not block these four from at least rendering correctly first.)

- [x] **Step 1–10: One `renderer` field edit per lesson**

For each of the 10 ids above, in `apps/web/src/viz/registry.ts`:

old_string (repeat per id, e.g. for `binary-search`):
```ts
  'binary-search': {
    renderer: 'ArrayView',
```

new_string:
```ts
  'binary-search': {
    renderer: 'BarView3D',
```

(Same pattern for `heap:`, `'amortized-growth':`, `'greedy-coins':`,
`queue:`, `stack:`, `'array-basics':`, `'sliding-window':`,
`'two-pointer':`, `'linear-search':` — each is `renderer: 'ArrayView',`
→ `renderer: 'BarView3D',` on that entry only.)

- [x] **Step 11: Typecheck and content-lint**

Run: `pnpm typecheck && pnpm lint:content`
Expected: both exit 0.

- [x] **Step 12: Commit**

```bash
git add apps/web/src/viz/registry.ts
git commit -m "feat: migrate 10 plain-array lessons to BarView3D"
```

---

### Task 5: Migrate the 3 Group B lessons (null-slot state)

**Files:**
- Modify: `apps/web/src/viz/registry.ts`

- [x] **Step 1: `hash-table`**

old_string:
```ts
  'hash-table': {
    renderer: 'ArrayView',
```

new_string:
```ts
  'hash-table': {
    renderer: 'BarView3D',
```

- [x] **Step 2: `dp-fibonacci`**

old_string:
```ts
  'dp-fibonacci': {
    renderer: 'ArrayView',
```

new_string:
```ts
  'dp-fibonacci': {
    renderer: 'BarView3D',
```

- [x] **Step 3: `recursion`**

old_string:
```ts
  recursion: {
    renderer: 'ArrayView',
```

new_string:
```ts
  recursion: {
    renderer: 'BarView3D',
```

- [x] **Step 4: Typecheck and content-lint**

Run: `pnpm typecheck && pnpm lint:content`
Expected: both exit 0.

- [x] **Step 5: Commit**

```bash
git add apps/web/src/viz/registry.ts
git commit -m "feat: migrate 3 null-slot lessons to BarView3D"
```

---

### Task 6: Tighten the 64-cap lessons' schema and re-verify projection

**Files:**
- Modify: `apps/web/src/viz/registry.ts`
- Modify: `packages/viz-3d/src/barProjection.test.ts`

**Per the design spec §2:** at `arr.max() = 64`, the adjacent-bar gap
measures 3.58px — only a 19% margin over `MIN_GAP_PX = 3`, thin compared
to every other lesson this project has shipped. Tighten to 32 (measured
6.77px, an 126% margin), matching this project's practice of anchoring a
schema cap to a real measured legibility number.

- [x] **Step 1: Tighten all 4 schemas**

For `binary-search`, `linear-search`, `sliding-window`, `two-pointer` in
`apps/web/src/viz/registry.ts`, each has an `arr: z.array(z.number())...max(64)`
— change `.max(64)` to `.max(32)` on each of these 4 entries only (every
other entry's own `.max(...)` value is untouched).

- [x] **Step 2: Add the n=32 case to `barProjection.test.ts`**

old_string:
```ts
test('merge/quick-sort worst case (24 bars) stays visibly separated on screen', () => {
```

new_string:
```ts
test('binary-search/linear-search/sliding-window/two-pointer worst case (32 bars) stays visibly separated on screen', () => {
  // Measured: 6.77px -- this cap was tightened from 64 specifically
  // because 64 only cleared MIN_GAP_PX by 19%; re-verify this margin
  // stays comfortable if BAR_PITCH/CAMERA_MARGIN ever change.
  const values = Array.from({ length: 32 }, (_, i) => i + 1);
  const gap = run(values, '32 bars');
  expect(gap).toBeGreaterThan(MIN_GAP_PX);
  expect(gap).toBeCloseTo(6.77, 1);
  expect(allBarsOnScreen(values)).toBe(true);
});

test('merge/quick-sort worst case (24 bars) stays visibly separated on screen', () => {
```

- [x] **Step 3: Run the updated projection test**

Run: `pnpm exec vitest run packages/viz-3d/src/barProjection.test.ts`
Expected: PASS. If the measured number differs from 6.77 by more than
the `toBeCloseTo` tolerance, update the pinned value to what actually
printed (read the `console.log` output, same as the original migration's
Task 7) rather than forcing the assertion to match a stale guess.

- [x] **Step 4: Typecheck and content-lint**

Run: `pnpm typecheck && pnpm lint:content`
Expected: both exit 0. (`lint:content` matters here because a `defaultInput`
that now exceeds a tightened schema max would fail — confirm each of the
4 lessons' `defaultInput.arr.length` is well under 32; all four currently
default to 7–10 elements, so this should pass without further changes.)

- [x] **Step 5: Commit**

```bash
git add apps/web/src/viz/registry.ts packages/viz-3d/src/barProjection.test.ts
git commit -m "fix: tighten 4 lessons' array cap 64 to 32 for BarView3D legibility"
```

---

### Task 7: e2e coverage for the null-slot behavior

**Files:**
- Modify: `apps/web/e2e/lesson.spec.ts`

The pre-existing `ALL_LESSONS` axe/CLS loop already covers all 13 lessons
automatically once migrated (no change needed there — confirm this in
Step 2). This task adds exactly one new test: a keyboard-operable check on
`hash-table` specifically, since it is the one behavior (an "empty"
slot announcement) the original `BarView3D` migration's `bubble-sort`
keyboard test never exercised.

- [x] **Step 1: Add the hash-table keyboard/empty-slot test**

Find the existing `test('the 3D bar view is keyboard-operable and
announces the focused slot'...)` block in `apps/web/e2e/lesson.spec.ts`
and add this new test immediately after it:

```ts
test('the 3D bar view announces an empty slot correctly', async ({ page }) => {
  await page.goto('/data-structures/hash-table/');
  const barButtons = page.locator('.bar-view-3d__bar-button');
  await expect(barButtons.first()).toBeVisible();

  const summary = page.locator('.bar-view-3d__summary');
  // hash-table's defaultInput is { keys: [12, 25, 37, 6, 19], capacity: 7,
  // lookup: 19 } -- a 7-slot table (see apps/web/src/viz/registry.ts).
  await expect(summary).toContainText('Array, 7 values.');

  // At least one slot starts empty (5 keys into 7 slots) -- find the first
  // button whose aria-label says "empty" and focus it.
  const emptyButton = barButtons.filter({ hasText: '·' }).first();
  await expect(emptyButton).toBeVisible();
  await emptyButton.focus();
  await expect(summary).toContainText(/, empty/);
});
```

- [x] **Step 2: Confirm `ALL_LESSONS` already covers all 13 migrated lessons**

Run: `grep -c "'/algorithms/binary-search/'\|'/algorithms/linear-search/'\|'/algorithms/two-pointer/'\|'/algorithms/sliding-window/'\|'/data-structures/array/'\|'/data-structures/heap/'\|'/complexity/amortized-analysis/'\|'/algorithms/greedy/'\|'/data-structures/queue/'\|'/data-structures/stack/'\|'/data-structures/hash-table/'\|'/algorithms/dynamic-programming/'\|'/algorithms/recursion/'" apps/web/e2e/lesson.spec.ts`
Expected: all 13 paths already present in `ALL_LESSONS` (they were, before
this plan — this step only confirms nothing needs adding there).

- [x] **Step 3: Build and run the new test**

Run: `pnpm build && pnpm --filter web exec playwright test -g "empty slot"`
Expected: PASS. If the "at least one empty slot" assumption doesn't hold
(e.g. the button's visible empty marker isn't literally `'·'`), inspect
the actual rendered button text/aria-label via
`await barButtons.first().innerHTML()` in a scratch script and fix the
test's selector to match what's actually rendered — not the other way
around.

- [x] **Step 4: Run the full e2e suite**

Run: `pnpm test:e2e`
Expected: all tests pass, including the `ALL_LESSONS` loops now covering
all 18 `BarView3D` lessons (5 original + 13 new).

- [x] **Step 5: Commit**

```bash
git add apps/web/e2e/lesson.spec.ts
git commit -m "test: add e2e coverage for BarView3D's empty-slot behavior"
```

---

### Task 8: Visual verification across all 13 lessons

Not a code-writing task — the same real-build screenshot methodology
Task 9 of the original `BarView3D` plan used (and which caught a real
camera bug there).

- [x] **Step 1: Build and preview**

Run: `pnpm build && pnpm --filter web exec astro preview`

- [x] **Step 2: Screenshot every one of the 13 lessons**

For each: `/algorithms/binary-search/`, `/data-structures/heap/`,
`/complexity/amortized-analysis/`, `/algorithms/greedy/`,
`/data-structures/queue/`, `/data-structures/stack/`,
`/data-structures/array/` (array-basics), `/algorithms/sliding-window/`,
`/algorithms/two-pointer/`, `/algorithms/linear-search/`,
`/data-structures/hash-table/`, `/algorithms/dynamic-programming/`
(dp-fibonacci), `/algorithms/recursion/` — load the page, screenshot the
`.bar-view-3d` element at its initial frame and after a few "Next step"
clicks. Confirm by eye: bars render fully on screen (no clipping,
repeating this project's own recent lesson), colors match the semantic
palette, and — specifically for `hash-table`, `dp-fibonacci`, and
`recursion` — empty slots render as a visually distinct wireframe marker,
clearly different from a solid real-value bar, not just "a very short
bar."

- [x] **Step 3: Screenshot one of the 4 tightened lessons at its new max**

Pick `binary-search`; via "Try your own input," submit a 32-element
array (e.g. `{ arr: Array.from({length: 32}, (_, i) => i * 3), target: 45 }`)
and screenshot. Confirm by eye that bars are individually distinguishable
— matching the measured 6.77px margin from Task 6, not just trusting the
number.

- [x] **Step 4: Re-check the CSS reservation**

Using the same throwaway-script method the original `BarView3D` plan's
Task 9 used (temporarily neutralizing `.js .viz.viz--barview3d`'s
`min-height` and measuring the real rendered height post-hydration),
check whether any of these 13 lessons' figure height exceeds the existing
`81rem` reservation. If so, raise `apps/web/src/styles/viz.css`'s
`.js .viz.viz--barview3d` rule to (new tallest measured) + 6rem; if not,
leave it unchanged and say so in the Task 9 commit message.

- [x] **Step 5: Re-run the CLS e2e tests if the CSS reservation changed**

Run: `pnpm test:e2e -g "does not shift layout"`
Expected: all pass.

- [x] **Step 6: Commit (only if Step 4 changed a file)**

```bash
git add apps/web/src/styles/viz.css
git commit -m "fix: adjust BarView3D's CSS reservation for the newly-migrated lessons"
```

---

### Task 9: Documentation and full gate

**Files:**
- Modify: `docs/AUTHORING.md`
- Modify: `docs/superpowers/specs/2026-09-16-barview3d-full-migration-design.md`
- Modify: `docs/superpowers/plans/2026-09-16-barview3d-full-migration.md` (this file)

- [x] **Step 1: Update `BarView3D`'s AUTHORING.md paragraph to mention null-slot support**

Find the `BarView3D` bullet added by the original migration (in §4.6,
right after the `HierarchyView3D` bullet) and add one sentence after its
existing text, before the closing "; see `docs/superpowers/plans/
2026-09-16-barview-3d.md`..." reference:

old_string:
```
    plus a live-region summary — because the WebGL canvas itself is `aria-hidden`. Used
    by `bubble-sort`, `insertion-sort`, `selection-sort`, `merge-sort`, and `quick-sort`;
    see `docs/superpowers/plans/2026-09-16-barview-3d.md` for the migration that moved
    all 5 off `ArrayView`.
```

new_string:
```
    plus a live-region summary — because the WebGL canvas itself is `aria-hidden`. Also
    supports `(number | null)[]` state — a `null` slot renders as a fixed-height
    wireframe marker (never scaled by any value, so it can't be mistaken for a real
    small value), the 3D equivalent of `ArrayView`'s dashed empty cell. Used by
    `bubble-sort`, `insertion-sort`, `selection-sort`, `merge-sort`, `quick-sort`, and 13
    more lessons across every remaining `ArrayView` lesson except none — see
    `docs/superpowers/plans/2026-09-16-barview-3d.md` (the original 5-lesson migration)
    and `docs/superpowers/plans/2026-09-16-barview3d-full-migration.md` (the null-slot
    extension and the remaining 13).
```

- [x] **Step 2: Full gate run**

Run, in order:
`pnpm lint:content && pnpm typecheck && pnpm test && pnpm build && pnpm check:offline && pnpm test:e2e`
Expected: all exit 0.

- [x] **Step 3: Check off this plan's and the spec's Definition of Done**

Update every `- [ ]` in this plan file and in
`docs/superpowers/specs/2026-09-16-barview3d-full-migration-design.md`'s
§5 to `- [x]`, correcting any item whose actual outcome differed from
what was expected (e.g. if the 6.77px pin needed adjusting, or the CSS
reservation needed raising).

- [x] **Step 4: Commit**

```bash
git add docs/AUTHORING.md docs/superpowers/specs/2026-09-16-barview3d-full-migration-design.md docs/superpowers/plans/2026-09-16-barview3d-full-migration.md
git commit -m "docs: document BarView3D's null-slot support and close out the full migration"
```

---

## Definition of Done

- [x] `BarView3D`/`barLayout.ts`/`barSummary.ts` support
      `(number | null)[]` state; empty slots render as a fixed-height
      wireframe marker.
- [x] All 13 remaining `ArrayView` lessons migrated to `BarView3D`
      (`renderer` field only, except the 4 schema-tightened ones).
- [x] `binary-search`, `linear-search`, `sliding-window`, `two-pointer`
      have `arr.max()` tightened 64 → 32, with a real pinned projection
      measurement backing it.
- [x] `barLayout.test.ts`/`barSummary.test.ts` cover null-slot behavior;
      `barProjection.test.ts` covers the new 32-bar case.
- [x] e2e: `hash-table`'s empty-slot announcement is tested; the
      pre-existing `ALL_LESSONS` loop covers all 13 lessons' axe/CLS.
- [x] All 13 lessons visually verified via screenshot, including
      `hash-table`/`dp-fibonacci`/`recursion`'s empty-slot rendering and
      one 32-bar worst case — not test-suite-green alone.
- [x] CSS reservation re-checked against these 13 lessons' real measured
      heights.
- [x] `pnpm lint:content`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
      `pnpm check:offline`, `pnpm test:e2e` all exit 0.
- [x] No file under `packages/viz-core` is edited. No `.mdx` lesson file's
      prose changed.

## Actual outcomes vs. what this plan expected

- **The n=32 measurement was corrected: 6.62px, not 6.77px.** The
  design spec's table used a quick standalone script to decide scope
  before any code existed; `barProjection.test.ts`, importing the real
  shipped `cameraDistanceFor`/`BAR_CAMERA_HEIGHT`, is authoritative.
  Both the spec and the pinned test assertion were corrected to 6.62px.
  Still comfortably clear of `MIN_GAP_PX = 3`.
- **Two real defects found during Task 8's screenshot/height
  verification, neither anticipated by the spec:**
  1. `heap`'s generator legitimately starts from an empty array (it
     builds the heap one insert at a time). `BarView3D`'s "nothing to
     ever show" early return — copied from `TreeView3D`/`GraphView3D`/
     `HierarchyView3D`, whose graphs are fixed for a whole run and
     never legitimately empty — replaced the entire canvas with a
     static placeholder on that frame, breaking the page. Fixed by
     removing the guard entirely (every computation already handled
     length 0 correctly on its own). `recursion` exercises the mirror
     case (ends empty once the call stack fully unwinds) and needed no
     separate fix, confirming the removal was the right general fix,
     not a `heap`-specific patch.
  2. `hash-table`'s real worst-case height across its run (110.59rem,
     at a mid-probe frame — not its first frame) far exceeded the
     81rem CSS reservation sized only against the original 5 sort
     lessons. Not a `BarView3D` bug — its own canvas area measured a
     normal ~30rem — just a much longer code sample (a full class) and
     wider vars table than any sort lesson has. Reservation raised to
     117rem (110.59rem + 6rem headroom).
- **A third, unplanned fix: `apps/web/e2e/lesson.spec.ts`'s generic
  "the player steps through frames" test had a latent timing race**
  (`expect(await note.textContent())` instead of an auto-retrying
  locator assertion) that `BarView3D`'s slower hydration (extra dynamic
  import + WebGL setup vs. `ArrayView`'s near-instant one) exposed —
  failed 3 of 5 reruns before the fix, 0 of 5 after switching to
  `await expect(note).not.toHaveText(...)`.
- **A fourth, unplanned fix: `VizIsland.test.tsx` needed two changes,
  not the lesson-id swap the earlier `bubble-sort` fix used.** Every
  `ArrayView` lesson has now migrated, so there is no lightweight
  lesson left to route a jsdom test away from a 3D renderer. Added a
  general `window.matchMedia` polyfill to the shared jsdom
  `test-setup.ts` (jsdom never implements it, and every 3D renderer's
  reduced-motion hook calls it), and mocked `@cs/viz-3d`'s renderer
  exports in this specific test file, since jsdom cannot create a real
  WebGL context for `@react-three/fiber`'s `<Canvas>` at all — matching
  this project's own established practice of never unit-testing a 3D
  renderer's actual canvas output.
