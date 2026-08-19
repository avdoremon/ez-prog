# Phase 0 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the CS Learning Platform's foundation — a static Astro/Starlight site with a framework-agnostic step-frame visualization engine, a content pipeline that enforces lesson quality at build time, and three reference lessons that define the authoring experience.

**Architecture:** A pnpm monorepo. `packages/viz-core` is pure TypeScript with no React dependency — algorithms are generators yielding immutable frames, which keeps them testable under plain Vitest and lets renderers change without touching algorithms. `packages/viz-react` renders those frames. `apps/web` is Astro + Starlight, shipping zero JavaScript for prose and hydrating visualizations only when they scroll into view. Build-time lint gates enforce the lesson Definition of Done mechanically instead of by checklist.

**Tech Stack:** Astro 7, Starlight 0.41, React 19, TypeScript, Vitest, fast-check, Testing Library, Playwright, axe-core, Zod, pnpm workspaces.

**Spec:** `docs/superpowers/specs/2026-08-19-phase0-foundation-design.md`

## Global Constraints

Copied verbatim from the spec. Every task's requirements implicitly include these.

- **Pin every dependency exactly.** No `^`, no `~`. Install with `pnpm add -E`. Resolve versions from the registry at install time — do not copy version numbers from `IMPLEMENTATION_PLAN.md` §2.1, which is stale (spec §1.1).
- **`viz-core` must not import React**, or any renderer, or any browser-only API. It is consumed by plain Vitest under Node (spec §2).
- **Generators must yield snapshots, never live references.** Every `state:` value passes through `snap()` (spec §2.1).
- **`MAX_FRAMES = 1500`** is the global collection cap. Per-entry input caps are tighter than the global array cap of 64; bubble sort's is 24 (spec §2.4).
- **Every frame carries a non-empty `note`.** This is contractual, not stylistic (spec §2.5).
- **Code positions are named anchors (`AnchorId` strings), never line numbers** (spec §2.3).
- **Every mark colour must also carry a text label.** Colour is never the sole information channel (spec §6 task 6, `IMPLEMENTATION_PLAN.md` §8.5).
- **Lessons must remain readable with JavaScript disabled** (spec §3.3).
- **Prose limit is 700 words, excluding fenced code blocks** (spec §3.4 rule 3).
- **`check:offline` scans asset references only**, never prose anchors — outbound LeetCode/HackerRank links are required by `IMPLEMENTATION_PLAN.md` §5.4 (spec §3.5).
- **Node 24.15.0 is installed. pnpm is NOT** — Task 1 installs it.
- **Commit after every task.** Conventional commit format (`feat:`, `test:`, `docs:`, `chore:`, `ci:`).

### Deviation from strict TDD, and why

Spec §6 mandates that Task 2 is an ugly end-to-end vertical slice — the integration proof — and that everything after it is hardening. That ordering is a deliberate, approved choice (spec §6, and the "Three ways to shape Phase 0" analysis behind it). Task 2 therefore ships with one smoke test rather than a full red-green cycle per unit.

**Every task from Task 3 onward is strict TDD: failing test first, minimal implementation, green, commit.**

---

## File Structure

| Path | Responsibility |
|---|---|
| `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json` | Workspace wiring |
| `packages/viz-core/src/types.ts` | `Frame`, `Mark`, `Target`, `MarkKind`, `AnchorId`, `VizAlgorithm` |
| `packages/viz-core/src/snap.ts` | Snapshot + freeze helper |
| `packages/viz-core/src/collect.ts` | `collect()`, `MAX_FRAMES`, truncation frame |
| `packages/viz-core/src/anchors.ts` | `parseAnchors()` — shared by runtime and lint |
| `packages/viz-core/src/algorithms/*.ts` | One generator per file |
| `packages/viz-core/test/conformance.ts` | Shared contract suite (test-only; keeps Vitest out of `src`) |
| `packages/viz-react/src/renderers/ArrayView.tsx` | Renders `number[]` + `index`/`range` marks |
| `packages/viz-react/src/useFramePlayer.ts` | Transport state, framework-testable in isolation |
| `packages/viz-react/src/Player.tsx` | Controls, rail, panels, keyboard map |
| `apps/web/src/content.config.ts` | Starlight schema extension |
| `apps/web/src/viz/registry.ts` | Static metadata + dynamic loaders |
| `apps/web/src/components/Viz.astro` | Island wrapper + no-JS fallback |
| `apps/web/src/lib/judge/` | `Judge` interface + `MockJudge` |
| `apps/web/src/styles/tokens.css` | Design tokens |
| `scripts/lint-content.ts` | Seven build gates |
| `scripts/check-offline.ts` | Asset-reference scan |

---

## Task 1: Monorepo scaffold with pinned dependencies

**Files:**
- Create: `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `.npmrc`
- Create: `apps/web/` (via scaffold), `packages/viz-core/package.json`, `packages/viz-react/package.json`

**Interfaces:**
- Consumes: nothing
- Produces: workspace packages `@cs/viz-core`, `@cs/viz-react`; a runnable `pnpm --filter web dev`

- [ ] **Step 1: Install pnpm**

```bash
corepack enable
corepack prepare pnpm@latest --activate
pnpm --version
```

Expected: a version number prints. If `corepack` is unavailable, use `npm i -g pnpm`.

- [ ] **Step 2: Create the workspace manifest**

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 3: Create the root package.json**

```json
{
  "name": "cs-learning-platform",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "pnpm --filter web dev",
    "build": "pnpm --filter web build",
    "test": "vitest run",
    "typecheck": "tsc -b",
    "lint:content": "tsx scripts/lint-content.ts",
    "check:offline": "tsx scripts/check-offline.ts"
  }
}
```

- [ ] **Step 4: Force exact version pinning**

```
# .npmrc
save-exact=true
```

This makes the Global Constraint structural rather than a habit.

- [ ] **Step 5: Scaffold the Astro + Starlight app**

```bash
pnpm create astro@latest apps/web -- --template starlight --no-install --no-git --typescript strict --yes
```

- [ ] **Step 6: Install and pin dependencies**

```bash
pnpm add -E -w -D typescript vitest tsx @types/node
pnpm add -E --filter web astro @astrojs/starlight @astrojs/react react react-dom zod
pnpm add -E --filter web -D @types/react @types/react-dom
```

Do not hand-write versions into `package.json`. Let the registry resolve them; `.npmrc` pins them.

- [ ] **Step 7: Create the two workspace packages**

```json
{
  "name": "@cs/viz-core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": { ".": "./src/index.ts", "./algorithms/*": "./src/algorithms/*.ts" }
}
```

```json
{
  "name": "@cs/viz-react",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.tsx",
  "exports": { ".": "./src/index.tsx" }
}
```

Source-level exports (no build step) — these are internal packages consumed by Vite, which transpiles TypeScript directly. A build step here would be pure overhead.

- [ ] **Step 8: Verify the dev server runs**

Run: `pnpm --filter web dev`
Expected: Starlight's default site serves at `http://localhost:4321`.

- [ ] **Step 9: Verify no caret ranges exist**

Run: `grep -rn '"\^' --include=package.json . | grep -v node_modules`
Expected: **no output.** Any match is a Global Constraint violation — fix before committing.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm monorepo with astro, starlight, and pinned deps"
```

---

## Task 2: Vertical slice — ugly, end-to-end

The integration proof (spec §6 task 1). This is the **only** task allowed to be ugly. No CSS, no polish, no abstraction beyond what makes it run. Its purpose is to discover integration problems now rather than on day nine.

**Files:**
- Create: `packages/viz-core/src/types.ts`, `src/snap.ts`, `src/collect.ts`, `src/index.ts`
- Create: `packages/viz-core/src/algorithms/binary-search.ts`
- Create: `packages/viz-react/src/renderers/ArrayView.tsx`, `src/Player.tsx`, `src/index.tsx`
- Create: `apps/web/src/content/docs/slice.mdx`
- Modify: `apps/web/astro.config.mjs`

**Interfaces:**
- Consumes: workspace from Task 1
- Produces: `Frame`, `Mark`, `Target`, `MarkKind`, `AnchorId`, `VizAlgorithm`, `snap()`, `collect()`, `MAX_FRAMES`, `binarySearch`, `ArrayView`, `Player`. Tasks 3–9 harden these; the names and signatures below are final.

- [ ] **Step 1: Write the types**

```ts
// packages/viz-core/src/types.ts
export type AnchorId = string;

export type Target =
  | { t: 'index'; i: number }
  | { t: 'range'; from: number; to: number };

export type MarkKind =
  | 'cursor' | 'compare' | 'swap' | 'done' | 'visited' | 'active' | 'discard';

export interface Mark {
  kind: MarkKind;
  at: Target;
}

export interface Frame<S = unknown> {
  /** Immutable snapshot. Never a live reference — see snap(). */
  state: S;
  marks?: Mark[];
  /** Required, non-empty. One sentence explaining this step. */
  note: string;
  /** A named anchor, not a line number. */
  line?: AnchorId;
  vars?: Record<string, string | number>;
}

export type VizAlgorithm<I, S> = (input: I) => Generator<Frame<S>>;
```

- [ ] **Step 2: Write `snap`**

```ts
// packages/viz-core/src/snap.ts
let freezeEnabled = true;

/** Production builds may disable freezing; correctness never depends on it. */
export function setFreezeSnapshots(on: boolean): void {
  freezeEnabled = on;
}

export function snap<S>(value: S): S {
  const copy = structuredClone(value);
  return freezeEnabled ? deepFreeze(copy) : copy;
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  Object.freeze(value);
  for (const key of Object.keys(value as object)) {
    deepFreeze((value as Record<string, unknown>)[key]);
  }
  return value;
}
```

`freezeEnabled` is a module flag rather than `process.env.NODE_ENV` so that `viz-core` stays free of bundler-specific globals — a Global Constraint.

- [ ] **Step 3: Write `collect`**

```ts
// packages/viz-core/src/collect.ts
import type { Frame } from './types.js';

export const MAX_FRAMES = 1500;

export interface CollectResult<S> {
  frames: Frame<S>[];
  truncated: boolean;
}

export function collect<S>(
  gen: Generator<Frame<S>>,
  cap: number = MAX_FRAMES,
): CollectResult<S> {
  if (!Number.isInteger(cap) || cap < 1) {
    throw new RangeError(`collect: cap must be a positive integer, received ${cap}`);
  }
  const frames: Frame<S>[] = [];
  for (const frame of gen) {
    if (frames.length === cap) {
      frames.push({
        state: frame.state,
        note: `Visualization stopped after ${cap} steps. Try a smaller input to watch it finish.`,
      });
      return { frames, truncated: true };
    }
    frames.push(frame);
  }
  return { frames, truncated: false };
}
```

- [ ] **Step 4: Write the binary search generator**

```ts
// packages/viz-core/src/algorithms/binary-search.ts
import { snap } from '../snap.js';
import type { VizAlgorithm } from '../types.js';

export interface BinarySearchInput { arr: number[]; target: number }

export const binarySearch: VizAlgorithm<BinarySearchInput, number[]> =
function* ({ arr, target }) {
  let lo = 0;
  let hi = arr.length - 1;

  yield {
    state: snap(arr), line: 'INIT', vars: { lo, hi },
    note: `Searching for ${target} in a sorted array of ${arr.length} values.`,
  };

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    yield {
      state: snap(arr), line: 'MID', vars: { lo, hi, mid },
      marks: [
        { kind: 'active', at: { t: 'range', from: lo, to: hi } },
        { kind: 'cursor', at: { t: 'index', i: mid } },
      ],
      note: `Midpoint is index ${mid}, holding ${arr[mid]}.`,
    };

    if (arr[mid] === target) {
      yield {
        state: snap(arr), line: 'FOUND', vars: { lo, hi, mid },
        marks: [{ kind: 'done', at: { t: 'index', i: mid } }],
        note: `Found ${target} at index ${mid}.`,
      };
      return;
    }

    if (arr[mid]! < target) {
      yield {
        state: snap(arr), line: 'DISCARD_LEFT', vars: { lo, hi, mid },
        marks: [{ kind: 'discard', at: { t: 'range', from: lo, to: mid } }],
        note: `${arr[mid]} is smaller than ${target} — discard the left half.`,
      };
      lo = mid + 1;
    } else {
      yield {
        state: snap(arr), line: 'DISCARD_RIGHT', vars: { lo, hi, mid },
        marks: [{ kind: 'discard', at: { t: 'range', from: mid, to: hi } }],
        note: `${arr[mid]} is larger than ${target} — discard the right half.`,
      };
      hi = mid - 1;
    }
  }

  yield {
    state: snap(arr), line: 'NOT_FOUND', vars: { lo, hi },
    note: `The search space is empty. ${target} is not in the array.`,
  };
};
```

- [ ] **Step 5: Write the barrel export**

```ts
// packages/viz-core/src/index.ts
export * from './types.js';
export * from './snap.js';
export * from './collect.js';
```

- [ ] **Step 6: Write the ugly ArrayView**

```tsx
// packages/viz-react/src/renderers/ArrayView.tsx
import type { Mark } from '@cs/viz-core';

export function ArrayView({ state, marks }: { state: number[]; marks?: Mark[] }) {
  const kinds = new Map<number, string>();
  for (const m of marks ?? []) {
    if (m.at.t === 'index') kinds.set(m.at.i, m.kind);
    else for (let i = m.at.from; i <= m.at.to; i++) kinds.set(i, m.kind);
  }
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {state.map((v, i) => (
        <div key={i} style={{ border: '1px solid #999', padding: 8, minWidth: 32 }}>
          {v}
          <div style={{ fontSize: 10 }}>{kinds.get(i) ?? ''}</div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Write the three-button Player**

```tsx
// packages/viz-react/src/Player.tsx
import { useState } from 'react';
import { collect } from '@cs/viz-core';
import { binarySearch } from '@cs/viz-core/algorithms/binary-search';
import { ArrayView } from './renderers/ArrayView.js';

export function Player() {
  const { frames } = collect(
    binarySearch({ arr: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 23 }),
  );
  const [i, setI] = useState(0);
  const f = frames[i]!;
  return (
    <div>
      <ArrayView state={f.state} marks={f.marks} />
      <p data-testid="note">{f.note}</p>
      <button onClick={() => setI((n) => Math.max(0, n - 1))}>Prev</button>
      <button onClick={() => setI(0)}>Reset</button>
      <button onClick={() => setI((n) => Math.min(frames.length - 1, n + 1))}>Next</button>
      <span data-testid="counter">{i + 1} / {frames.length}</span>
    </div>
  );
}
```

Hardcoding the input and the algorithm here is intentional — the registry arrives in Task 11.

```tsx
// packages/viz-react/src/index.tsx
export { Player } from './Player.js';
export { ArrayView } from './renderers/ArrayView.js';
```

- [ ] **Step 8: Enable React in Astro**

```js
// apps/web/astro.config.mjs — add to the existing config
import react from '@astrojs/react';
// integrations: [starlight({...}), react()]
```

- [ ] **Step 9: Create the slice page**

```mdx
---
title: Vertical Slice
description: Temporary integration proof. Deleted in Task 11.
---

import { Player } from '@cs/viz-react';

<Player client:visible />
```

- [ ] **Step 10: Verify in a browser — the actual integration proof**

Run: `pnpm --filter web dev`, open `http://localhost:4321/slice`

Expected: an array of ten numbers renders; clicking **Next** advances the counter, changes which cells are labelled, and updates the note text. If this works, the seam between generator, renderer, and Astro island is proven.

- [ ] **Step 11: Add the smoke test**

```ts
// packages/viz-core/test/slice.smoke.test.ts
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';
import { binarySearch } from '../src/algorithms/binary-search.js';

test('binary search produces a frame sequence that finds the target', () => {
  const { frames, truncated } = collect(
    binarySearch({ arr: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 23 }),
  );
  expect(truncated).toBe(false);
  expect(frames.length).toBeGreaterThan(1);
  expect(frames.at(-1)!.note).toContain('Found 23');
});
```

- [ ] **Step 12: Run the test**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: vertical slice proving generator, renderer, and island integration"
```

---

## Task 3: Frame ownership — harden `snap`

Resolves spec §1.2, the latent bug that would render every bubble-sort frame identically.

**Files:**
- Create: `packages/viz-core/test/snap.test.ts`
- Modify: `packages/viz-core/src/snap.ts` (only if tests reveal a defect)

**Interfaces:**
- Consumes: `snap()`, `setFreezeSnapshots()` from Task 2
- Produces: no new API — a proven guarantee that later tasks depend on

- [ ] **Step 1: Write the failing tests**

```ts
// packages/viz-core/test/snap.test.ts
import { afterEach, expect, test } from 'vitest';
import { setFreezeSnapshots, snap } from '../src/snap.js';
import { collect } from '../src/collect.js';
import { binarySearch } from '../src/algorithms/binary-search.js';

afterEach(() => setFreezeSnapshots(true));

test('snap returns a structurally equal but distinct object', () => {
  const original = [1, 2, 3];
  const copy = snap(original);
  expect(copy).toEqual(original);
  expect(copy).not.toBe(original);
});

test('mutating the original does not affect the snapshot', () => {
  const original = [1, 2, 3];
  const copy = snap(original);
  original[0] = 99;
  expect(copy[0]).toBe(1);
});

test('snapshots are frozen when freezing is enabled', () => {
  const copy = snap([1, 2, 3]);
  expect(Object.isFrozen(copy)).toBe(true);
});

test('nested structures are deeply frozen', () => {
  const copy = snap({ rows: [[1, 2]] });
  expect(Object.isFrozen(copy.rows[0])).toBe(true);
});

test('setFreezeSnapshots(false) skips freezing but still copies', () => {
  setFreezeSnapshots(false);
  const original = [1, 2, 3];
  const copy = snap(original);
  expect(Object.isFrozen(copy)).toBe(false);
  expect(copy).not.toBe(original);
});

test('mutating the input after collect changes no frame', () => {
  const arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
  const { frames } = collect(binarySearch({ arr, target: 23 }));
  const before = frames.map((f) => [...f.state]);
  arr[0] = 999;
  expect(frames.map((f) => [...f.state])).toEqual(before);
});
```

- [ ] **Step 2: Run the tests to see them fail or pass**

Run: `pnpm test snap`
Expected: PASS — Task 2 already implemented `snap` correctly. If any test **fails**, that is the §1.2 bug surfacing; fix `snap.ts` before continuing. A passing suite here is a guarantee locked in, not wasted work.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: lock in frame snapshot isolation guarantees"
```

---

## Task 4: Frame budget — harden `collect`

Resolves spec §1.5.

**Files:**
- Create: `packages/viz-core/test/collect.test.ts`

**Interfaces:**
- Consumes: `collect()`, `MAX_FRAMES` from Task 2
- Produces: proven truncation semantics that lint rule 7 (Task 14) relies on

- [ ] **Step 1: Write the failing tests**

```ts
// packages/viz-core/test/collect.test.ts
import { expect, test } from 'vitest';
import { collect, MAX_FRAMES } from '../src/collect.js';
import type { Frame } from '../src/types.js';

function* counter(n: number): Generator<Frame<number>> {
  for (let i = 0; i < n; i++) yield { state: i, note: `step ${i}` };
}

function* endless(): Generator<Frame<number>> {
  for (let i = 0; ; i++) yield { state: i, note: `step ${i}` };
}

test('MAX_FRAMES is 1500', () => {
  expect(MAX_FRAMES).toBe(1500);
});

test('collects every frame when under the cap', () => {
  const { frames, truncated } = collect(counter(5), 10);
  expect(frames).toHaveLength(5);
  expect(truncated).toBe(false);
});

test('a generator exactly at the cap is not truncated', () => {
  const { frames, truncated } = collect(counter(10), 10);
  expect(frames).toHaveLength(10);
  expect(truncated).toBe(false);
});

test('exceeding the cap appends one explanatory frame', () => {
  const { frames, truncated } = collect(counter(50), 10);
  expect(truncated).toBe(true);
  expect(frames).toHaveLength(11);
  expect(frames.at(-1)!.note).toContain('stopped after 10 steps');
});

test('an endless generator terminates instead of hanging', () => {
  const { frames, truncated } = collect(endless(), 20);
  expect(truncated).toBe(true);
  expect(frames).toHaveLength(21);
});

test('the truncation frame carries a non-empty note', () => {
  const { frames } = collect(counter(50), 10);
  expect(frames.at(-1)!.note.length).toBeGreaterThan(0);
});

test('a non-positive cap is rejected', () => {
  expect(() => collect(counter(5), 0)).toThrow(RangeError);
  expect(() => collect(counter(5), 1.5)).toThrow(RangeError);
});
```

- [ ] **Step 2: Run the tests**

Run: `pnpm test collect`
Expected: PASS. The endless-generator test is the important one — it proves a runaway algorithm cannot hang a learner's browser tab.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: lock in frame budget and truncation semantics"
```

---

## Task 5: Conformance suite

The shared contract from spec §2.5, run automatically against every registered algorithm. Lives in `test/` so Vitest never enters `src/` — a Global Constraint.

**Files:**
- Create: `packages/viz-core/test/conformance.ts`
- Create: `packages/viz-core/test/algorithms.conformance.test.ts`
- Modify: `packages/viz-core/package.json` (add `fast-check`)

**Interfaces:**
- Consumes: `collect`, `MAX_FRAMES`, `VizAlgorithm`
- Produces: `runConformance<I, S>(spec: ConformanceSpec<I, S>): void` — Tasks 17 call this for each new algorithm

- [ ] **Step 1: Install fast-check**

```bash
pnpm add -E -w -D fast-check
```

- [ ] **Step 2: Write the conformance helper**

```ts
// packages/viz-core/test/conformance.ts
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { collect, MAX_FRAMES } from '../src/collect.js';
import type { MarkKind, Target, VizAlgorithm } from '../src/types.js';

const VALID_KINDS: MarkKind[] = [
  'cursor', 'compare', 'swap', 'done', 'visited', 'active', 'discard',
];

export interface ConformanceSpec<I, S> {
  name: string;
  algorithm: VizAlgorithm<I, S>;
  /** Generates inputs the algorithm's inputSchema would accept. */
  arbitrary: fc.Arbitrary<I>;
  /** Target kinds the paired renderer supports. */
  supportedTargets: Target['t'][];
}

export function runConformance<I, S>(spec: ConformanceSpec<I, S>): void {
  describe(`conformance: ${spec.name}`, () => {
    test('yields at least one frame', () => {
      fc.assert(fc.property(spec.arbitrary, (input) => {
        expect(collect(spec.algorithm(input)).frames.length).toBeGreaterThan(0);
      }));
    });

    test('the first frame carries no marks', () => {
      fc.assert(fc.property(spec.arbitrary, (input) => {
        const first = collect(spec.algorithm(input)).frames[0]!;
        expect(first.marks ?? []).toHaveLength(0);
      }));
    });

    test('every frame has a non-empty note', () => {
      fc.assert(fc.property(spec.arbitrary, (input) => {
        for (const f of collect(spec.algorithm(input)).frames) {
          expect(f.note.trim().length).toBeGreaterThan(0);
        }
      }));
    });

    test('terminates within MAX_FRAMES for schema-valid input', () => {
      fc.assert(fc.property(spec.arbitrary, (input) => {
        expect(collect(spec.algorithm(input), MAX_FRAMES).truncated).toBe(false);
      }));
    });

    test('every mark kind is valid', () => {
      fc.assert(fc.property(spec.arbitrary, (input) => {
        for (const f of collect(spec.algorithm(input)).frames) {
          for (const m of f.marks ?? []) expect(VALID_KINDS).toContain(m.kind);
        }
      }));
    });

    test('every target is supported by the paired renderer', () => {
      fc.assert(fc.property(spec.arbitrary, (input) => {
        for (const f of collect(spec.algorithm(input)).frames) {
          for (const m of f.marks ?? []) {
            expect(spec.supportedTargets).toContain(m.at.t);
          }
        }
      }));
    });

    test('yields snapshots, not live references', () => {
      fc.assert(fc.property(spec.arbitrary, (input) => {
        const frames = collect(spec.algorithm(input)).frames;
        const states = frames.map((f) => f.state);
        // Distinct object identities prove snapshotting for object states.
        const objects = states.filter((s) => typeof s === 'object' && s !== null);
        if (objects.length > 1) {
          expect(new Set(objects).size).toBeGreaterThan(1);
        }
      }));
    });
  });
}
```

- [ ] **Step 3: Run conformance against binary search**

```ts
// packages/viz-core/test/algorithms.conformance.test.ts
import fc from 'fast-check';
import { binarySearch } from '../src/algorithms/binary-search.js';
import { runConformance } from './conformance.js';

const sortedArrayAndTarget = fc
  .array(fc.integer({ min: -500, max: 500 }), { minLength: 1, maxLength: 64 })
  .chain((raw) => {
    const arr = [...raw].sort((a, b) => a - b);
    return fc.record({
      arr: fc.constant(arr),
      target: fc.oneof(fc.constantFrom(...arr), fc.integer({ min: -600, max: 600 })),
    });
  });

runConformance({
  name: 'binarySearch',
  algorithm: binarySearch,
  arbitrary: sortedArrayAndTarget,
  supportedTargets: ['index', 'range'],
});
```

- [ ] **Step 4: Run the tests**

Run: `pnpm test conformance`
Expected: PASS, all seven properties.

- [ ] **Step 5: Add a correctness property specific to binary search**

```ts
// append to packages/viz-core/test/algorithms.conformance.test.ts
import { expect, test } from 'vitest';
import { collect } from '../src/collect.js';

test('binarySearch reports found exactly when the target is present', () => {
  fc.assert(fc.property(sortedArrayAndTarget, ({ arr, target }) => {
    const last = collect(binarySearch({ arr, target })).frames.at(-1)!;
    expect(last.note.includes('Found')).toBe(arr.includes(target));
  }));
});
```

- [ ] **Step 6: Run and commit**

Run: `pnpm test`
Expected: PASS.

```bash
git add -A
git commit -m "test: add generator conformance suite and binary search properties"
```

---

## Task 6: `parseAnchors`

Resolves spec §1.4. One pure function, used at runtime by the code panel and at build time by lint rule 6 — no codegen step, no duplication.

**Files:**
- Create: `packages/viz-core/src/anchors.ts`, `packages/viz-core/test/anchors.test.ts`
- Modify: `packages/viz-core/src/index.ts`

**Interfaces:**
- Consumes: `AnchorId`
- Produces: `parseAnchors(source: string): ParsedCode` where `ParsedCode = { display: string; anchors: Record<AnchorId, number> }`. Used by Task 9 (`CodePanel`) and Task 14 (lint rule 6).

- [ ] **Step 1: Write the failing tests**

```ts
// packages/viz-core/test/anchors.test.ts
import { expect, test } from 'vitest';
import { parseAnchors } from '../src/anchors.js';

test('extracts a C-style anchor and strips it from the display source', () => {
  const { display, anchors } = parseAnchors('lo = mid + 1;   // @anchor DISCARD_LEFT');
  expect(anchors).toEqual({ DISCARD_LEFT: 1 });
  expect(display).toBe('lo = mid + 1;');
});

test('extracts a hash-style anchor for Python', () => {
  const { display, anchors } = parseAnchors('lo = mid + 1    # @anchor DISCARD_LEFT');
  expect(anchors).toEqual({ DISCARD_LEFT: 1 });
  expect(display).toBe('lo = mid + 1');
});

test('records one-indexed line numbers', () => {
  const src = ['int lo = 0;', 'int hi = n - 1;  // @anchor INIT'].join('\n');
  expect(parseAnchors(src).anchors).toEqual({ INIT: 2 });
});

test('leaves lines without anchors untouched', () => {
  const src = 'int mid = (lo + hi) / 2;  // ordinary comment';
  const { display, anchors } = parseAnchors(src);
  expect(display).toBe(src);
  expect(anchors).toEqual({});
});

test('supports multiple anchors in one file', () => {
  const src = ['a();  // @anchor ONE', 'b();', 'c();  // @anchor TWO'].join('\n');
  expect(parseAnchors(src).anchors).toEqual({ ONE: 1, TWO: 3 });
});

test('rejects duplicate anchor ids', () => {
  const src = ['a();  // @anchor DUP', 'b();  // @anchor DUP'].join('\n');
  expect(() => parseAnchors(src)).toThrow(/duplicate anchor DUP/);
});

test('ignores lowercase ids so prose comments are not captured', () => {
  const { anchors } = parseAnchors('a();  // @anchor notAnAnchor');
  expect(anchors).toEqual({});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test anchors`
Expected: FAIL — `Cannot find module '../src/anchors.js'`.

- [ ] **Step 3: Write the implementation**

```ts
// packages/viz-core/src/anchors.ts
import type { AnchorId } from './types.js';

const ANCHOR_RE = /\s*(?:\/\/|#)\s*@anchor\s+([A-Z][A-Z0-9_]*)\s*$/;

export interface ParsedCode {
  /** Source with @anchor comments removed, for display. */
  display: string;
  /** One-indexed line number for each anchor. */
  anchors: Record<AnchorId, number>;
}

export function parseAnchors(source: string): ParsedCode {
  const anchors: Record<AnchorId, number> = {};
  const lines = source.split('\n');

  const display = lines.map((line, idx) => {
    const match = ANCHOR_RE.exec(line);
    if (!match) return line;
    const id = match[1]!;
    if (id in anchors) {
      throw new Error(`parseAnchors: duplicate anchor ${id} on line ${idx + 1}`);
    }
    anchors[id] = idx + 1;
    return line.slice(0, match.index);
  });

  return { display: display.join('\n'), anchors };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test anchors`
Expected: PASS, all seven.

- [ ] **Step 5: Export it**

```ts
// packages/viz-core/src/index.ts — add
export * from './anchors.js';
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add language-agnostic code anchor parsing"
```

---

## Task 7: `ArrayView`, properly

Replaces the ugly Task 2 renderer. Adds mark-to-index resolution, exhaustive target narrowing, and the text labels that satisfy the colour-is-never-the-only-channel constraint.

**Files:**
- Modify: `packages/viz-react/src/renderers/ArrayView.tsx`
- Create: `packages/viz-react/src/renderers/ArrayView.test.tsx`, `packages/viz-react/vitest.config.ts`

**Interfaces:**
- Consumes: `Mark`, `Target`, `MarkKind`
- Produces: `<ArrayView state={number[]} marks={Mark[]} label={string} />`; exported helper `resolveMarks(marks: Mark[], length: number): Map<number, MarkKind[]>`

- [ ] **Step 1: Install the React testing toolchain**

```bash
pnpm add -E -w -D jsdom @testing-library/react @testing-library/jest-dom @vitejs/plugin-react
```

```ts
// packages/viz-react/vitest.config.ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./test-setup.ts'] },
});
```

```ts
// packages/viz-react/test-setup.ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 2: Write the failing tests**

```tsx
// packages/viz-react/src/renderers/ArrayView.test.tsx
import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { ArrayView, resolveMarks } from './ArrayView.js';

test('renders one cell per value', () => {
  render(<ArrayView state={[3, 1, 4]} label="test array" />);
  expect(screen.getAllByRole('listitem')).toHaveLength(3);
});

test('resolveMarks maps an index target to a single cell', () => {
  const map = resolveMarks([{ kind: 'cursor', at: { t: 'index', i: 1 } }], 3);
  expect(map.get(1)).toEqual(['cursor']);
  expect(map.has(0)).toBe(false);
});

test('resolveMarks expands a range target inclusively', () => {
  const map = resolveMarks([{ kind: 'active', at: { t: 'range', from: 1, to: 3 } }], 5);
  expect([...map.keys()].sort()).toEqual([1, 2, 3]);
});

test('resolveMarks accumulates overlapping marks on one index', () => {
  const map = resolveMarks(
    [
      { kind: 'active', at: { t: 'range', from: 0, to: 2 } },
      { kind: 'cursor', at: { t: 'index', i: 1 } },
    ],
    3,
  );
  expect(map.get(1)).toEqual(['active', 'cursor']);
});

test('resolveMarks ignores out-of-bounds targets rather than throwing', () => {
  const map = resolveMarks([{ kind: 'cursor', at: { t: 'index', i: 99 } }], 3);
  expect(map.size).toBe(0);
});

test('resolveMarks throws a clear error on an unsupported target', () => {
  const bad = [{ kind: 'cursor', at: { t: 'node', id: 'a' } }] as never;
  expect(() => resolveMarks(bad, 3)).toThrow(/ArrayView cannot render target/);
});

test('marked cells carry a text label, not only colour', () => {
  render(
    <ArrayView state={[3, 1, 4]} label="test array"
      marks={[{ kind: 'compare', at: { t: 'index', i: 0 } }]} />,
  );
  expect(screen.getByText('compare')).toBeInTheDocument();
});

test('the list has an accessible name', () => {
  render(<ArrayView state={[1]} label="sorted values" />);
  expect(screen.getByRole('list', { name: 'sorted values' })).toBeInTheDocument();
});
```

- [ ] **Step 3: Run to verify failure**

Run: `pnpm test ArrayView`
Expected: FAIL — `resolveMarks` is not exported.

- [ ] **Step 4: Write the implementation**

```tsx
// packages/viz-react/src/renderers/ArrayView.tsx
import type { Mark, MarkKind } from '@cs/viz-core';

export function resolveMarks(marks: Mark[], length: number): Map<number, MarkKind[]> {
  const map = new Map<number, MarkKind[]>();
  const add = (i: number, kind: MarkKind) => {
    if (!Number.isInteger(i) || i < 0 || i >= length) return;
    map.set(i, [...(map.get(i) ?? []), kind]);
  };

  for (const mark of marks) {
    switch (mark.at.t) {
      case 'index':
        add(mark.at.i, mark.kind);
        break;
      case 'range': {
        const { from, to } = mark.at;
        for (let i = Math.min(from, to); i <= Math.max(from, to); i++) add(i, mark.kind);
        break;
      }
      default: {
        const unsupported: never = mark.at;
        throw new Error(
          `ArrayView cannot render target ${JSON.stringify(unsupported)}`,
        );
      }
    }
  }
  return map;
}

export interface ArrayViewProps {
  state: number[];
  marks?: Mark[];
  label: string;
}

export function ArrayView({ state, marks = [], label }: ArrayViewProps) {
  const resolved = resolveMarks(marks, state.length);
  return (
    <ol className="array-view" aria-label={label}>
      {state.map((value, i) => {
        const kinds = resolved.get(i) ?? [];
        return (
          <li key={i} className="array-view__cell" data-marks={kinds.join(' ') || undefined}>
            <span className="array-view__value">{value}</span>
            <span className="array-view__index">{i}</span>
            {kinds.map((k) => (
              <span key={k} className="array-view__tag">{k}</span>
            ))}
          </li>
        );
      })}
    </ol>
  );
}
```

The `default` branch's `never` assignment is what makes an unsupported target a **compile-time** error once Phase 1 adds `cell`/`node`/`edge` — the runtime throw only covers untyped callers.

- [ ] **Step 5: Run to verify pass**

Run: `pnpm test ArrayView`
Expected: PASS, all eight.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: harden ArrayView with exhaustive target resolution and text labels"
```

---

## Task 8: `useFramePlayer` transport hook

Transport logic is separated from presentation so it can be tested without a DOM tree, and so Phase 1 renderers reuse it unchanged.

**Files:**
- Create: `packages/viz-react/src/useFramePlayer.ts`, `packages/viz-react/src/useFramePlayer.test.ts`

**Interfaces:**
- Consumes: nothing from `viz-core`
- Produces: `useFramePlayer(frameCount: number, opts?: { speed?: number }): FramePlayer` where `FramePlayer = { index, playing, speed, atStart, atEnd, play(), pause(), toggle(), next(), prev(), first(), last(), seek(i), setSpeed(s) }`. Task 9 consumes this.

- [ ] **Step 1: Write the failing tests**

```ts
// packages/viz-react/src/useFramePlayer.test.ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useFramePlayer } from './useFramePlayer.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('starts at frame zero, paused', () => {
  const { result } = renderHook(() => useFramePlayer(5));
  expect(result.current.index).toBe(0);
  expect(result.current.playing).toBe(false);
  expect(result.current.atStart).toBe(true);
});

test('next advances, prev retreats', () => {
  const { result } = renderHook(() => useFramePlayer(5));
  act(() => result.current.next());
  expect(result.current.index).toBe(1);
  act(() => result.current.prev());
  expect(result.current.index).toBe(0);
});

test('clamps at both ends instead of wrapping', () => {
  const { result } = renderHook(() => useFramePlayer(3));
  act(() => result.current.prev());
  expect(result.current.index).toBe(0);
  act(() => result.current.last());
  expect(result.current.index).toBe(2);
  act(() => result.current.next());
  expect(result.current.index).toBe(2);
  expect(result.current.atEnd).toBe(true);
});

test('seek clamps out-of-range values', () => {
  const { result } = renderHook(() => useFramePlayer(3));
  act(() => result.current.seek(99));
  expect(result.current.index).toBe(2);
  act(() => result.current.seek(-4));
  expect(result.current.index).toBe(0);
});

test('playing advances one frame per tick', () => {
  const { result } = renderHook(() => useFramePlayer(4));
  act(() => result.current.play());
  expect(result.current.playing).toBe(true);
  act(() => vi.advanceTimersByTime(800));
  expect(result.current.index).toBe(1);
  act(() => vi.advanceTimersByTime(800));
  expect(result.current.index).toBe(2);
});

test('playback stops automatically at the last frame', () => {
  const { result } = renderHook(() => useFramePlayer(2));
  act(() => result.current.play());
  act(() => vi.advanceTimersByTime(3200));
  expect(result.current.index).toBe(1);
  expect(result.current.playing).toBe(false);
});

test('speed scales the interval', () => {
  const { result } = renderHook(() => useFramePlayer(6));
  act(() => result.current.setSpeed(4));
  act(() => result.current.play());
  act(() => vi.advanceTimersByTime(200));
  expect(result.current.index).toBe(1);
});

test('shrinking frameCount clamps the current index', () => {
  const { result, rerender } = renderHook(({ n }) => useFramePlayer(n), {
    initialProps: { n: 10 },
  });
  act(() => result.current.last());
  expect(result.current.index).toBe(9);
  rerender({ n: 3 });
  expect(result.current.index).toBe(2);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test useFramePlayer`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// packages/viz-react/src/useFramePlayer.ts
import { useCallback, useEffect, useState } from 'react';

const BASE_INTERVAL_MS = 800;

export interface FramePlayer {
  index: number;
  playing: boolean;
  speed: number;
  atStart: boolean;
  atEnd: boolean;
  play(): void;
  pause(): void;
  toggle(): void;
  next(): void;
  prev(): void;
  first(): void;
  last(): void;
  seek(i: number): void;
  setSpeed(s: number): void;
}

export function useFramePlayer(
  frameCount: number,
  opts: { speed?: number } = {},
): FramePlayer {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(opts.speed ?? 1);

  const maxIndex = Math.max(0, frameCount - 1);
  const clamp = useCallback(
    (i: number) => Math.min(Math.max(0, i), maxIndex),
    [maxIndex],
  );

  // Frame count can shrink when the learner edits the input.
  useEffect(() => setIndex((i) => Math.min(i, maxIndex)), [maxIndex]);

  useEffect(() => {
    if (!playing) return;
    if (index >= maxIndex) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setIndex((i) => clamp(i + 1)), BASE_INTERVAL_MS / speed);
    return () => clearTimeout(id);
  }, [playing, index, maxIndex, speed, clamp]);

  return {
    index,
    playing,
    speed,
    atStart: index === 0,
    atEnd: index >= maxIndex,
    play: useCallback(() => setPlaying(true), []),
    pause: useCallback(() => setPlaying(false), []),
    toggle: useCallback(() => setPlaying((p) => !p), []),
    next: useCallback(() => setIndex((i) => clamp(i + 1)), [clamp]),
    prev: useCallback(() => setIndex((i) => clamp(i - 1)), [clamp]),
    first: useCallback(() => setIndex(0), []),
    last: useCallback(() => setIndex(maxIndex), [maxIndex]),
    seek: useCallback((i: number) => setIndex(clamp(i)), [clamp]),
    setSpeed,
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test useFramePlayer`
Expected: PASS, all eight.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add frame transport hook with clamping and auto-stop"
```

---

## Task 9: Player UI, panels, and accessibility

Replaces the three-button Task 2 Player. Delivers spec §6 task 3.

**Files:**
- Modify: `packages/viz-react/src/Player.tsx`
- Create: `packages/viz-react/src/FrameRail.tsx`, `src/VarsPanel.tsx`, `src/CodePanel.tsx`
- Create: `packages/viz-react/src/Player.test.tsx`

**Interfaces:**
- Consumes: `useFramePlayer`, `ArrayView`, `parseAnchors`, `Frame`
- Produces: `<Player frames={Frame<number[]>[]} truncated={boolean} label={string} code={ParsedCode | undefined} />`. Task 11 renders this.

- [ ] **Step 1: Write the failing tests**

```tsx
// packages/viz-react/src/Player.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import type { Frame } from '@cs/viz-core';
import { Player } from './Player.js';

const frames: Frame<number[]>[] = [
  { state: [3, 1], note: 'Start.', vars: { i: 0 } },
  { state: [1, 3], note: 'Swapped.', vars: { i: 1 },
    marks: [{ kind: 'swap', at: { t: 'range', from: 0, to: 1 } }] },
];

test('shows the first frame note and position on mount', () => {
  render(<Player frames={frames} truncated={false} label="demo" />);
  expect(screen.getByText('Start.')).toBeInTheDocument();
  expect(screen.getByText('1 / 2')).toBeInTheDocument();
});

test('the next button advances the frame', async () => {
  const user = userEvent.setup();
  render(<Player frames={frames} truncated={false} label="demo" />);
  await user.click(screen.getByRole('button', { name: /next step/i }));
  expect(screen.getByText('Swapped.')).toBeInTheDocument();
});

test('arrow keys step through frames', async () => {
  const user = userEvent.setup();
  render(<Player frames={frames} truncated={false} label="demo" />);
  await user.click(screen.getByRole('group', { name: /playback/i }));
  await user.keyboard('{ArrowRight}');
  expect(screen.getByText('Swapped.')).toBeInTheDocument();
  await user.keyboard('{ArrowLeft}');
  expect(screen.getByText('Start.')).toBeInTheDocument();
});

test('Home and End jump to the ends', async () => {
  const user = userEvent.setup();
  render(<Player frames={frames} truncated={false} label="demo" />);
  await user.click(screen.getByRole('group', { name: /playback/i }));
  await user.keyboard('{End}');
  expect(screen.getByText('2 / 2')).toBeInTheDocument();
  await user.keyboard('{Home}');
  expect(screen.getByText('1 / 2')).toBeInTheDocument();
});

test('the vars panel shows the current frame variables', async () => {
  const user = userEvent.setup();
  render(<Player frames={frames} truncated={false} label="demo" />);
  expect(screen.getByRole('row', { name: /i 0/ })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /next step/i }));
  expect(screen.getByRole('row', { name: /i 1/ })).toBeInTheDocument();
});

test('the rail is a slider bound to the frame index', async () => {
  const user = userEvent.setup();
  render(<Player frames={frames} truncated={false} label="demo" />);
  const rail = screen.getByRole('slider', { name: /step/i });
  // jest-dom reports a NUMBER for range inputs, not a string.
  expect(rail).toHaveValue(0);
  expect(rail).toHaveAttribute('aria-valuetext', 'Step 1 of 2');
  await user.click(screen.getByRole('button', { name: /next step/i }));
  expect(rail).toHaveValue(1);
});

test('a truncation warning appears only when truncated', () => {
  const { rerender } = render(<Player frames={frames} truncated={false} label="demo" />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  rerender(<Player frames={frames} truncated label="demo" />);
  expect(screen.getByRole('status')).toHaveTextContent(/stopped early/i);
});

test('the note region is a live region for screen readers', () => {
  render(<Player frames={frames} truncated={false} label="demo" />);
  expect(screen.getByTestId('note')).toHaveAttribute('aria-live', 'polite');
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test Player`
Expected: FAIL — the Task 2 Player takes no props.

- [ ] **Step 3: Write the sub-components**

```tsx
// packages/viz-react/src/VarsPanel.tsx
export function VarsPanel({ vars }: { vars?: Record<string, string | number> }) {
  const entries = Object.entries(vars ?? {});
  if (entries.length === 0) return null;
  return (
    <table className="vars-panel">
      <caption className="visually-hidden">Current variables</caption>
      <tbody>
        {entries.map(([name, value]) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

```tsx
// packages/viz-react/src/FrameRail.tsx
export function FrameRail({
  index, count, onSeek,
}: { index: number; count: number; onSeek: (i: number) => void }) {
  return (
    <input
      className="frame-rail"
      type="range"
      min={0}
      max={Math.max(0, count - 1)}
      step={1}
      value={index}
      aria-label="Step"
      aria-valuetext={`Step ${index + 1} of ${count}`}
      onChange={(e) => onSeek(Number(e.target.value))}
    />
  );
}
```

```tsx
// packages/viz-react/src/CodePanel.tsx
import type { AnchorId } from '@cs/viz-core';
import type { ParsedCode } from '@cs/viz-core';

export function CodePanel({ code, active }: { code: ParsedCode; active?: AnchorId }) {
  const activeLine = active ? code.anchors[active] : undefined;
  return (
    <pre className="code-panel"><code>
      {code.display.split('\n').map((line, i) => (
        <span key={i} className="code-panel__line"
              data-active={activeLine === i + 1 ? 'true' : undefined}>
          {line || ' '}{'\n'}
        </span>
      ))}
    </code></pre>
  );
}
```

- [ ] **Step 4: Write the Player**

```tsx
// packages/viz-react/src/Player.tsx
import { useCallback } from 'react';
import type { Frame, ParsedCode } from '@cs/viz-core';
import { ArrayView } from './renderers/ArrayView.js';
import { CodePanel } from './CodePanel.js';
import { FrameRail } from './FrameRail.js';
import { useFramePlayer } from './useFramePlayer.js';
import { VarsPanel } from './VarsPanel.js';

const SPEEDS = [0.5, 1, 2, 4];

export interface PlayerProps {
  frames: Frame<number[]>[];
  truncated: boolean;
  label: string;
  code?: ParsedCode;
}

export function Player({ frames, truncated, label, code }: PlayerProps) {
  const p = useFramePlayer(frames.length);
  const frame = frames[p.index]!;

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const actions: Record<string, () => void> = {
        ArrowRight: p.next, ArrowLeft: p.prev,
        Home: p.first, End: p.last,
        ' ': p.toggle, r: p.first, R: p.first,
      };
      const action = actions[e.key];
      if (!action) return;
      e.preventDefault();
      action();
    },
    [p],
  );

  return (
    <div className="player" onKeyDown={onKeyDown}>
      <ArrayView state={frame.state} marks={frame.marks} label={label} />

      {code && <CodePanel code={code} active={frame.line} />}

      <p className="player__note" data-testid="note" aria-live="polite">{frame.note}</p>
      <VarsPanel vars={frame.vars} />

      {truncated && (
        <p role="status" className="player__warning">
          This run stopped early at the step limit. Try a smaller input.
        </p>
      )}

      <div role="group" aria-label="Playback controls" tabIndex={0} className="player__controls">
        <button onClick={p.first} disabled={p.atStart} aria-label="First step">⏮</button>
        <button onClick={p.prev} disabled={p.atStart} aria-label="Previous step">◀</button>
        <button onClick={p.toggle} aria-label={p.playing ? 'Pause' : 'Play'}>
          {p.playing ? '⏸' : '▶'}
        </button>
        <button onClick={p.next} disabled={p.atEnd} aria-label="Next step">▶|</button>
        <button onClick={p.last} disabled={p.atEnd} aria-label="Last step">⏭</button>

        <FrameRail index={p.index} count={frames.length} onSeek={p.seek} />
        <span className="player__counter">{p.index + 1} / {frames.length}</span>

        <label>
          <span className="visually-hidden">Speed</span>
          <select value={p.speed} onChange={(e) => p.setSpeed(Number(e.target.value))}>
            {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm test Player`
Expected: PASS, all eight.

- [ ] **Step 6: Update the barrel and the slice page**

```tsx
// packages/viz-react/src/index.tsx
export { Player, type PlayerProps } from './Player.js';
export { ArrayView, resolveMarks } from './renderers/ArrayView.js';
export { useFramePlayer, type FramePlayer } from './useFramePlayer.js';
```

The slice page's `<Player />` now needs props; give it `frames` from a local `collect(binarySearch(...))` call until Task 11 deletes the page.

- [ ] **Step 7: Verify manually in a browser**

Run: `pnpm --filter web dev`
Expected: transport buttons, rail, speed, vars, and note all work. Tab to the controls group and confirm arrow keys, Home, End, and Space respond.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: build accessible frame player with rail, panels, and keyboard map"
```

---

## Task 10: Content config and lesson schema

Resolves spec §1.6 — the Astro 4 config path that Astro 5+ silently ignores.

**Files:**
- Create: `apps/web/src/content.config.ts`
- Delete: `apps/web/src/content/config.ts` if the scaffold created one

**Interfaces:**
- Consumes: nothing
- Produces: the `docs` collection with `lessonSchema` fields available on `entry.data`; `Lang` type used by Tasks 12 and 14

- [ ] **Step 1: Write the config**

```ts
// apps/web/src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const LANGS = ['c', 'cpp', 'java', 'py', 'js'] as const;
export type Lang = (typeof LANGS)[number];

export const lessonSchema = z.object({
  order: z.number().int(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedMinutes: z.number().int().min(2).max(12),
  viz: z.string().optional(),
  prerequisites: z.array(z.string()).default([]),
  languages: z.array(z.enum(LANGS)).default([]),
  problems: z.array(z.string()).default([]),
});

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({ extend: lessonSchema }),
  }),
};
```

`title` and `description` come from Starlight's own schema and must not be redeclared.

- [ ] **Step 2: Verify the schema rejects bad frontmatter**

Create a throwaway lesson with `estimatedMinutes: 99`, then run `pnpm --filter web build`.
Expected: the build **fails** naming `estimatedMinutes`. Delete the throwaway file afterward.

- [ ] **Step 3: Verify the schema accepts good frontmatter**

Give the slice page valid frontmatter (`order: 0`, `difficulty: beginner`, `estimatedMinutes: 5`) and rebuild.
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: extend starlight schema with lesson frontmatter validation"
```

---

## Task 11: Registry, `Viz` island, and no-JS fallback

Resolves spec §1.7 — the registry that would otherwise ship every algorithm to every lesson.

**Files:**
- Create: `apps/web/src/viz/registry.ts`, `apps/web/src/viz/types.ts`
- Create: `apps/web/src/viz/code/binary-search/{js,c,py}.ts`
- Create: `apps/web/src/components/Viz.astro`, `apps/web/src/components/VizIsland.tsx`
- Delete: `apps/web/src/content/docs/slice.mdx`

**Interfaces:**
- Consumes: `Player`, `collect`, `parseAnchors`
- Produces: `VIZ` registry, `<Viz id="..." />` usable from MDX. Task 18 authors lessons against this.

- [ ] **Step 1: Define the entry type**

```ts
// apps/web/src/viz/types.ts
import type { Frame, VizAlgorithm } from '@cs/viz-core';
import type { z } from 'zod';
import type { Lang } from '../content.config.js';

export interface VizEntry<I = unknown, S = unknown> {
  renderer: 'ArrayView';
  label: string;
  defaultInput: I;
  inputSchema: z.ZodType<I>;
  /** Tighter than the global 64 cap where the algorithm is quadratic. */
  maxFrames?: number;
  load: () => Promise<{ default: VizAlgorithm<I, S> }>;
  code: () => Promise<{ default: Record<Lang, string> }>;
}

export type AnyFrame = Frame<number[]>;
```

- [ ] **Step 2: Write the code samples with anchors**

```ts
// apps/web/src/viz/code/binary-search/js.ts
export default `function binarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1;   // @anchor INIT
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;      // @anchor MID
    if (arr[mid] === target) return mid;   // @anchor FOUND
    if (arr[mid] < target) lo = mid + 1;   // @anchor DISCARD_LEFT
    else hi = mid - 1;               // @anchor DISCARD_RIGHT
  }
  return -1;                         // @anchor NOT_FOUND
}`;
```

```ts
// apps/web/src/viz/code/binary-search/py.ts
export default `def binary_search(arr, target):
    lo, hi = 0, len(arr) - 1      # @anchor INIT
    while lo <= hi:
        mid = (lo + hi) // 2      # @anchor MID
        if arr[mid] == target:
            return mid            # @anchor FOUND
        if arr[mid] < target:
            lo = mid + 1          # @anchor DISCARD_LEFT
        else:
            hi = mid - 1          # @anchor DISCARD_RIGHT
    return -1                     # @anchor NOT_FOUND`;
```

```ts
// apps/web/src/viz/code/binary-search/c.ts
export default `int binary_search(const int *arr, int n, int target) {
    int lo = 0, hi = n - 1;            // @anchor INIT
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;  // @anchor MID
        if (arr[mid] == target) return mid;  // @anchor FOUND
        if (arr[mid] < target) lo = mid + 1; // @anchor DISCARD_LEFT
        else hi = mid - 1;             // @anchor DISCARD_RIGHT
    }
    return -1;                         // @anchor NOT_FOUND
}`;
```

Every sample defines all six anchors the generator emits. Lint rule 6 (Task 14) enforces this.

```ts
// apps/web/src/viz/code/binary-search/index.ts
import c from './c.js';
import js from './js.js';
import py from './py.js';
export default { js, c, py, cpp: c, java: js };
```

- [ ] **Step 3: Write the registry**

```ts
// apps/web/src/viz/registry.ts
import { z } from 'zod';
import type { VizEntry } from './types.js';

export const VIZ = {
  'binary-search': {
    renderer: 'ArrayView',
    label: 'Sorted array being searched',
    defaultInput: { arr: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 23 },
    inputSchema: z.object({
      arr: z.array(z.number()).min(1).max(64),
      target: z.number(),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/binary-search').then((m) => ({
        default: m.binarySearch,
      })),
    code: () => import('./code/binary-search/index.js'),
  },
} satisfies Record<string, VizEntry<any, any>>;

export type VizId = keyof typeof VIZ;
```

Only `renderer`, `label`, `defaultInput`, and `inputSchema` land in the main chunk. `load` and `code` are dynamic imports, so a lesson downloads only its own visualization.

- [ ] **Step 4: Write the island**

```tsx
// apps/web/src/components/VizIsland.tsx
import { useEffect, useState } from 'react';
import { collect, parseAnchors, type Frame, type ParsedCode } from '@cs/viz-core';
import { Player } from '@cs/viz-react';
import { VIZ, type VizId } from '../viz/registry.js';

export default function VizIsland({ id }: { id: VizId }) {
  const entry = VIZ[id];
  const [data, setData] = useState<
    { frames: Frame<number[]>[]; truncated: boolean; code: ParsedCode } | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([entry.load(), entry.code()])
      .then(([algo, codeMod]) => {
        if (cancelled) return;
        const { frames, truncated } = collect(
          algo.default(entry.defaultInput) as Generator<Frame<number[]>>,
          entry.maxFrames,
        );
        setData({ frames, truncated, code: parseAnchors(codeMod.default.js) });
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => { cancelled = true; };
  }, [id, entry]);

  if (error) return <p role="alert">This visualization failed to load: {error}</p>;
  if (!data) return <p>Loading visualization…</p>;

  return (
    <Player frames={data.frames} truncated={data.truncated}
            label={entry.label} code={data.code} />
  );
}
```

- [ ] **Step 5: Write the Astro wrapper with the no-JS fallback**

```astro
---
// apps/web/src/components/Viz.astro
import VizIsland from './VizIsland.tsx';
import { VIZ } from '../viz/registry.js';

interface Props { id: keyof typeof VIZ }
const { id } = Astro.props;
const entry = VIZ[id];
if (!entry) throw new Error(`Viz: unknown id "${id}". Add it to src/viz/registry.ts.`);
---

<figure class="viz">
  <VizIsland id={id} client:visible>
    <noscript>
      <p>
        <strong>{entry.label}.</strong>
        The interactive step-by-step version of this diagram needs JavaScript.
        The explanation below covers the same material.
      </p>
    </noscript>
  </VizIsland>
</figure>
```

The unknown-id throw is a build-time failure, which is why lint rule 5 can stay simple.

- [ ] **Step 6: Delete the slice page and verify**

```bash
rm apps/web/src/content/docs/slice.mdx
```

Create a temporary lesson using `<Viz id="binary-search" />`, run `pnpm --filter web dev`, and confirm the player renders with the code panel highlighting a line as you step.

- [ ] **Step 7: Verify the code split actually happened**

Run: `pnpm --filter web build`, then inspect `apps/web/dist/_astro/`.
Expected: `binary-search` appears in its **own** chunk, not inside the main entry chunk. If it is inlined, the dynamic imports were hoisted — check that `load`/`code` are not referenced at module top level anywhere.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add code-split viz registry with island and no-JS fallback"
```

---

## Task 12: Judge interface and `MockJudge`

Delivers spec §4.1. No network, no Docker — this is the seam that lets Phase 1 add Judge0 without touching callers.

**Files:**
- Create: `apps/web/src/lib/judge/types.ts`, `src/lib/judge/mock.ts`, `src/lib/judge/index.ts`
- Create: `apps/web/src/lib/judge/mock.test.ts`

**Interfaces:**
- Consumes: `Lang` from Task 10
- Produces: `Judge`, `Submission`, `Result`, `Verdict`, `MockJudge`, `getJudge()`. Phase 1 adds `Judge0Http` behind the same interface.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/web/src/lib/judge/mock.test.ts
import { expect, test } from 'vitest';
import { MockJudge } from './mock.js';

const judge = new MockJudge();

test('reports a language map covering every supported language', async () => {
  const langs = await judge.languages();
  expect(Object.keys(langs).sort()).toEqual(['c', 'cpp', 'java', 'js', 'py']);
});

test('returns one result per submission, in order', async () => {
  const results = await judge.run([
    { languageId: 63, source: 'echo 1', stdin: 'a' },
    { languageId: 63, source: 'echo 2', stdin: 'b' },
  ]);
  expect(results).toHaveLength(2);
  expect(results[0]!.stdout).toBe('a');
  expect(results[1]!.stdout).toBe('b');
});

test('echoes stdin as stdout with an accepted verdict by default', async () => {
  const [r] = await judge.run([{ languageId: 63, source: 'x', stdin: 'hello' }]);
  expect(r!.verdict).toBe('accepted');
  expect(r!.stdout).toBe('hello');
});

test('a source containing FAIL yields a wrong-answer verdict', async () => {
  const [r] = await judge.run([{ languageId: 63, source: 'FAIL', stdin: 'x' }]);
  expect(r!.verdict).toBe('wrong_answer');
});

test('a source containing TLE yields a time-limit verdict', async () => {
  const [r] = await judge.run([{ languageId: 63, source: 'TLE', stdin: 'x' }]);
  expect(r!.verdict).toBe('time_limit');
});

test('results are deterministic across runs', async () => {
  const subs = [{ languageId: 63, source: 'x', stdin: 'y' }];
  expect(await judge.run(subs)).toEqual(await judge.run(subs));
});

test('an aborted signal rejects', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    judge.run([{ languageId: 63, source: 'x', stdin: 'y' }], controller.signal),
  ).rejects.toThrow(/abort/i);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test mock`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the interface**

```ts
// apps/web/src/lib/judge/types.ts
import type { Lang } from '../../content.config.js';

export type Verdict =
  | 'accepted' | 'wrong_answer' | 'time_limit'
  | 'compile_error' | 'runtime_error';

export interface Submission {
  languageId: number;
  source: string;
  stdin: string;
}

export interface Result {
  verdict: Verdict;
  stdout: string;
  stderr?: string;
  timeMs?: number;
  memoryKb?: number;
}

export interface Judge {
  languages(): Promise<Record<Lang, number>>;
  run(subs: Submission[], signal?: AbortSignal): Promise<Result[]>;
}
```

- [ ] **Step 4: Write MockJudge**

```ts
// apps/web/src/lib/judge/mock.ts
import type { Lang } from '../../content.config.js';
import type { Judge, Result, Submission } from './types.js';

/** Deterministic in-memory judge. Phase 1 replaces it with Judge0Http. */
export class MockJudge implements Judge {
  async languages(): Promise<Record<Lang, number>> {
    return { c: 50, cpp: 54, java: 62, js: 63, py: 71 };
  }

  async run(subs: Submission[], signal?: AbortSignal): Promise<Result[]> {
    if (signal?.aborted) throw new Error('MockJudge: run aborted');
    return subs.map((s) => {
      if (s.source.includes('TLE')) {
        return { verdict: 'time_limit', stdout: '', timeMs: 5000 };
      }
      if (s.source.includes('FAIL')) {
        return { verdict: 'wrong_answer', stdout: '', timeMs: 1 };
      }
      return { verdict: 'accepted', stdout: s.stdin, timeMs: 1, memoryKb: 1024 };
    });
  }
}
```

```ts
// apps/web/src/lib/judge/index.ts
import { MockJudge } from './mock.js';
import type { Judge } from './types.js';

export * from './types.js';

/** Phase 1 swaps this for Judge0Http; no caller changes. */
export function getJudge(): Judge {
  return new MockJudge();
}
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm test mock`
Expected: PASS, all seven.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add judge interface with deterministic mock implementation"
```

---

## Task 13: Judge0 spike — hard timebox, one day

Delivers spec §4.2. **This task is investigation, not implementation.** Its deliverable is a written note. Nothing else in the plan depends on the outcome — that is the point.

**Files:**
- Create: `docs/spikes/2026-08-judge0-wsl2.md`
- Create (only if the spike succeeds): `infra/docker-compose.dev.yml`, `infra/judge0/judge0.conf`, `.env.example`

**Interfaces:**
- Consumes: nothing
- Produces: a documented yes/no answer. **Both outcomes pass.**

- [ ] **Step 1: Check the cgroup version — five minutes, do this first**

```bash
wsl -e stat -fc %T /sys/fs/cgroup
```

`cgroup2fs` means cgroup v2, and Judge0's `isolate` sandbox has a well-known dependency on cgroup v1. If you see this, record it immediately in the spike note — it is the single most likely reason the rest fails, and knowing it now is most of the value of the timebox.

- [ ] **Step 2: Write the env template**

```bash
# .env.example
JUDGE0_AUTH_TOKEN=change-me-before-production
POSTGRES_PASSWORD=change-me
REDIS_PASSWORD=change-me
```

Copy to `.env`, fill in real values. `.env` is already gitignored.

- [ ] **Step 3: Bring up the stack**

```bash
docker compose -f infra/docker-compose.dev.yml up -d
docker compose -f infra/docker-compose.dev.yml ps
```

Use `IMPLEMENTATION_PLAN.md` §9.2 as the compose file's starting point.

- [ ] **Step 4: Run the six-point checklist**

`GET /about` alone is **not** sufficient — it answers even when workers cannot sandbox anything. All six must hold:

```bash
# 1a. server is up
curl -s localhost:2358/about

# 1b. a real C submission is Accepted  ← the actual proof that isolate works
curl -s -X POST 'localhost:2358/submissions?base64_encoded=false&wait=true' \
  -H 'Content-Type: application/json' \
  -d '{"language_id":50,"source_code":"#include <stdio.h>\nint main(){printf(\"ok\");}"}'

# 2. network is blocked (expect failure, not success)
#    submit a program that opens a socket; confirm it errors

# 3. an infinite loop returns TLE and the worker survives
curl -s -X POST 'localhost:2358/submissions?base64_encoded=false&wait=true' \
  -H 'Content-Type: application/json' \
  -d '{"language_id":50,"source_code":"int main(){while(1);}"}'
docker compose -f infra/docker-compose.dev.yml ps   # workers still healthy?

# 4. a fork bomb is contained by max_processes_and_or_threads

# 5. the batch endpoint round-trips base64
curl -s -X POST 'localhost:2358/submissions/batch?base64_encoded=true' \
  -H 'Content-Type: application/json' \
  -d '{"submissions":[{"language_id":63,"source_code":"Y29uc29sZS5sb2coMSk="}]}'

# 6. the language map is retrievable
curl -s localhost:2358/languages | head -40
```

- [ ] **Step 5: Write the note — required regardless of outcome**

```markdown
# Spike: Judge0 on WSL2 — 2026-08

**Question:** Can Judge0 CE run sandboxed submissions on this Windows 11 / WSL2 machine?

**Timebox:** 1 day. **Outcome:** <WORKS | DOES NOT WORK>

## cgroup version
`stat -fc %T /sys/fs/cgroup` → <result>

## Checklist
| # | Check | Result |
|---|---|---|
| 1 | /about responds AND a C submission is Accepted | |
| 2 | ENABLE_NETWORK=false blocks outbound sockets | |
| 3 | Infinite loop → TLE, worker survives | |
| 4 | Fork bomb contained | |
| 5 | Batch endpoint round-trips base64 | |
| 6 | GET /languages returns a map | |

## Latency
10-testcase batch, wall clock: <ms>

## Gotchas
<what bit you, and how you fixed it>

## Recommendation for Phase 1
<compose file location, or the fallback: Linux VM / privileged-free judge>
```

- [ ] **Step 6: Stop at the timebox**

If the day ends with unresolved failures, **stop and write the note anyway** with `DOES NOT WORK` and what you learned. Fallbacks — running Judge0 on a Linux VM instead of WSL2, or evaluating a judge that does not need privileged mode — are Phase 1 decisions. They do not block Phase 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs: record judge0 WSL2 spike findings"
```

---

## Task 14: Content lint gates

Delivers spec §3.4, all seven rules. Rules 5–7 exist only because Tasks 5, 6, and 11 made them checkable.

**Files:**
- Create: `scripts/lint-content.ts`
- Create: `scripts/lint-content.test.ts`, `scripts/fixtures/` (one violating fixture per rule)

**Interfaces:**
- Consumes: `VIZ`, `parseAnchors`, `collect`, `MAX_FRAMES`
- Produces: `lintContent(root: string): LintError[]`; exit code 1 when any error is returned

- [ ] **Step 1: Write the failing tests — one negative fixture per rule**

```ts
// scripts/lint-content.test.ts
import { expect, test } from 'vitest';
import { lintContent } from './lint-content.js';

const fixture = (name: string) => `scripts/fixtures/${name}`;

test('rule 1: a DSA lesson without a viz is rejected', async () => {
  const errors = await lintContent(fixture('no-viz'));
  expect(errors.map((e) => e.rule)).toContain('dsa-requires-viz');
});

test('rule 2: a prerequisite pointing at a missing slug is rejected', async () => {
  const errors = await lintContent(fixture('bad-prereq'));
  expect(errors.map((e) => e.rule)).toContain('prerequisite-exists');
});

test('rule 3: prose over 700 words is rejected', async () => {
  const errors = await lintContent(fixture('too-long'));
  expect(errors.map((e) => e.rule)).toContain('prose-word-limit');
});

test('rule 3: code blocks do NOT count toward the word limit', async () => {
  const errors = await lintContent(fixture('long-code-short-prose'));
  expect(errors.map((e) => e.rule)).not.toContain('prose-word-limit');
});

test('rule 4: a code block without a language is rejected', async () => {
  const errors = await lintContent(fixture('untagged-code'));
  expect(errors.map((e) => e.rule)).toContain('code-block-language');
});

test('rule 5: a viz id missing from the registry is rejected', async () => {
  const errors = await lintContent(fixture('unknown-viz'));
  expect(errors.map((e) => e.rule)).toContain('viz-id-exists');
});

test('rule 6: an anchor missing from one language sample is rejected', async () => {
  const errors = await lintContent(fixture('missing-anchor'));
  expect(errors.map((e) => e.rule)).toContain('anchor-coverage');
});

test('rule 7: a generator exceeding MAX_FRAMES on its default input is rejected', async () => {
  const errors = await lintContent(fixture('runaway-generator'));
  expect(errors.map((e) => e.rule)).toContain('frame-budget');
});

test('a clean lesson produces no errors', async () => {
  expect(await lintContent(fixture('clean'))).toEqual([]);
});

test('every error names a file and is human-readable', async () => {
  const errors = await lintContent(fixture('no-viz'));
  for (const e of errors) {
    expect(e.file).toBeTruthy();
    expect(e.message.length).toBeGreaterThan(10);
  }
});
```

- [ ] **Step 2: Create the fixtures**

Each fixture is a directory with one `.mdx` file violating exactly its rule, plus a `clean/` fixture violating none. Keep them minimal — three lines of frontmatter and one paragraph — except `too-long`, which needs 701 words of prose, and `long-code-short-prose`, which needs a 200-line code block with 50 words of prose.

- [ ] **Step 3: Run to verify failure**

Run: `pnpm test lint-content`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the linter**

```ts
// scripts/lint-content.ts
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { collect, MAX_FRAMES, parseAnchors, type Frame } from '@cs/viz-core';
import { VIZ } from '../apps/web/src/viz/registry.js';

export interface LintError { rule: string; file: string; message: string }

const DSA_PREFIXES = ['data-structures/', 'algorithms/', 'complexity/'];
const WORD_LIMIT = 700;

/** Strips fenced code blocks so they do not count toward the prose limit. */
function stripCodeBlocks(body: string): string {
  return body.replace(/```[\s\S]*?```/g, '');
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function untaggedCodeFences(body: string): number {
  const opens = body.match(/^```(\w*)/gm) ?? [];
  // Fences alternate open/close; only odd-indexed opens are real openers.
  return opens.filter((f, i) => i % 2 === 0 && f === '```').length;
}

export async function lintContent(root: string): Promise<LintError[]> {
  const errors: LintError[] = [];
  const files = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter((d) => d.isFile() && d.name.endsWith('.mdx'))
    .map((d) => join(d.parentPath, d.name));

  const slugs = new Set(files.map((f) => f.replace(root, '').replace(/\.mdx$/, '')));

  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    const fm = /^---\n([\s\S]*?)\n---/.exec(raw);
    const front = fm?.[1] ?? '';
    const body = raw.slice(fm?.[0].length ?? 0);
    const rel = file.replace(root, '').replace(/^[/\\]/, '');

    const vizId = /^viz:\s*(\S+)/m.exec(front)?.[1];

    // Rule 1
    if (DSA_PREFIXES.some((p) => rel.replace(/\\/g, '/').startsWith(p)) && !vizId) {
      errors.push({ rule: 'dsa-requires-viz', file: rel,
        message: `DSA lessons must declare a viz. Add "viz: <id>" to the frontmatter.` });
    }

    // Rule 2
    const prereqBlock = /^prerequisites:\s*\n((?:\s+-\s+.*\n)*)/m.exec(front)?.[1] ?? '';
    for (const line of prereqBlock.split('\n')) {
      const slug = /-\s+(\S+)/.exec(line)?.[1];
      if (slug && !slugs.has(slug.startsWith('/') ? slug : `/${slug}`)) {
        errors.push({ rule: 'prerequisite-exists', file: rel,
          message: `Prerequisite "${slug}" does not match any lesson slug.` });
      }
    }

    // Rule 3
    const words = countWords(stripCodeBlocks(body));
    if (words > WORD_LIMIT) {
      errors.push({ rule: 'prose-word-limit', file: rel,
        message: `Prose is ${words} words; the limit is ${WORD_LIMIT} (code blocks excluded).` });
    }

    // Rule 4
    if (untaggedCodeFences(body) > 0) {
      errors.push({ rule: 'code-block-language', file: rel,
        message: `A fenced code block does not declare its language.` });
    }

    // Rules 5-7
    if (vizId) {
      const entry = (VIZ as Record<string, (typeof VIZ)[keyof typeof VIZ]>)[vizId];
      if (!entry) {
        errors.push({ rule: 'viz-id-exists', file: rel,
          message: `viz "${vizId}" is not in src/viz/registry.ts.` });
        continue;
      }

      const [algo, codeMod] = await Promise.all([entry.load(), entry.code()]);
      const { frames, truncated } = collect(
        algo.default(entry.defaultInput) as Generator<Frame<number[]>>,
        entry.maxFrames ?? MAX_FRAMES,
      );

      // Rule 7
      if (truncated) {
        errors.push({ rule: 'frame-budget', file: rel,
          message: `viz "${vizId}" exceeds its frame budget on its own defaultInput. ` +
                   `Lower defaultInput size or raise maxFrames.` });
      }

      // Rule 6
      const used = new Set(frames.map((f) => f.line).filter(Boolean) as string[]);
      for (const [lang, source] of Object.entries(codeMod.default)) {
        const { anchors } = parseAnchors(source);
        for (const anchor of used) {
          if (!(anchor in anchors)) {
            errors.push({ rule: 'anchor-coverage', file: rel,
              message: `viz "${vizId}" emits anchor ${anchor}, but the ${lang} sample ` +
                       `does not define it. Add "// @anchor ${anchor}".` });
          }
        }
      }
    }
  }
  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = await lintContent('apps/web/src/content/docs');
  for (const e of errors) console.error(`[${e.rule}] ${e.file}: ${e.message}`);
  if (errors.length > 0) {
    console.error(`\n${errors.length} content error(s).`);
    process.exit(1);
  }
  console.log('Content lint passed.');
}
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm test lint-content`
Expected: PASS, all ten.

- [ ] **Step 6: Run against real content**

Run: `pnpm lint:content`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add seven content lint gates with negative test fixtures"
```

---

## Task 15: Offline asset check

Delivers spec §3.5, resolving the §1.8 contradiction — outbound prose links are required by `IMPLEMENTATION_PLAN.md` §5.4 and must not fail the build.

**Files:**
- Create: `scripts/check-offline.ts`, `scripts/check-offline.test.ts`

**Interfaces:**
- Consumes: build output at `apps/web/dist`
- Produces: `findExternalAssets(html: string): string[]`; exit code 1 on any finding

- [ ] **Step 1: Write the failing tests**

```ts
// scripts/check-offline.test.ts
import { expect, test } from 'vitest';
import { findExternalAssets } from './check-offline.js';

test('flags an external stylesheet', () => {
  const html = '<link rel="stylesheet" href="https://fonts.googleapis.com/css?x">';
  expect(findExternalAssets(html)).toContain('https://fonts.googleapis.com/css?x');
});

test('flags an external script', () => {
  expect(findExternalAssets('<script src="https://cdn.jsdelivr.net/x.js"></script>'))
    .toHaveLength(1);
});

test('flags an external image', () => {
  expect(findExternalAssets('<img src="https://example.com/a.png">')).toHaveLength(1);
});

test('flags an external url() in inline CSS', () => {
  expect(findExternalAssets('<style>@font-face{src:url(https://x.com/f.woff2)}</style>'))
    .toHaveLength(1);
});

test('IGNORES an external prose link — LeetCode links are required', () => {
  const html = '<p>Practise on <a href="https://leetcode.com/problems/two-sum/">LeetCode</a>.</p>';
  expect(findExternalAssets(html)).toEqual([]);
});

test('ignores local asset paths', () => {
  const html = '<link rel="stylesheet" href="/_astro/index.css"><img src="/img/a.png">';
  expect(findExternalAssets(html)).toEqual([]);
});

test('ignores protocol-relative local paths and data URIs', () => {
  expect(findExternalAssets('<img src="data:image/png;base64,AAA">')).toEqual([]);
});

test('flags every external srcset candidate', () => {
  const html = '<img srcset="https://a.com/1.png 1x, https://a.com/2.png 2x">';
  expect(findExternalAssets(html)).toHaveLength(2);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test check-offline`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// scripts/check-offline.ts
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const EXTERNAL = /^(?:https?:)?\/\//i;

/**
 * Scans ASSET references only. Prose anchors (<a href>) are deliberately
 * ignored: IMPLEMENTATION_PLAN.md §5.4 requires outbound practice links.
 */
export function findExternalAssets(html: string): string[] {
  const found: string[] = [];

  const push = (url: string | undefined) => {
    if (url && EXTERNAL.test(url)) found.push(url);
  };

  for (const m of html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/gi)) push(m[1]);
  for (const m of html.matchAll(/<(?:script|img|source|video|audio)\b[^>]*\bsrc=["']([^"']+)["']/gi)) push(m[1]);
  for (const m of html.matchAll(/\burl\(\s*["']?([^"')]+)["']?\s*\)/gi)) push(m[1]);

  for (const m of html.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
    for (const candidate of m[1]!.split(',')) push(candidate.trim().split(/\s+/)[0]);
  }

  return found;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = 'apps/web/dist';
  const files = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter((d) => d.isFile() && (d.name.endsWith('.html') || d.name.endsWith('.css')))
    .map((d) => join(d.parentPath, d.name));

  let failures = 0;
  for (const file of files) {
    for (const url of findExternalAssets(await readFile(file, 'utf8'))) {
      console.error(`[external-asset] ${file}: ${url}`);
      failures++;
    }
  }
  if (failures > 0) {
    console.error(`\n${failures} external asset reference(s). All assets must be self-hosted.`);
    process.exit(1);
  }
  console.log('Offline check passed.');
}
```

- [ ] **Step 4: Run to verify pass**

Run: `pnpm test check-offline`
Expected: PASS, all eight. The LeetCode test is the one that matters.

- [ ] **Step 5: Run against a real build**

Run: `pnpm build && pnpm check:offline`
Expected: exit 0. If Starlight emits a Google Fonts link, remove it — Task 16 self-hosts fonts.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add offline asset check that ignores prose links"
```

---

## Task 16: Design tokens, self-hosted fonts, and Frame Rail styling

Delivers spec §6 task 6 and `IMPLEMENTATION_PLAN.md` §8. Lands **after** three lessons' worth of interface use, per the spec's ordering rule.

**Files:**
- Create: `apps/web/src/styles/tokens.css`, `apps/web/src/styles/viz.css`
- Create: `apps/web/public/fonts/` (self-hosted woff2)
- Modify: `apps/web/astro.config.mjs`

**Interfaces:**
- Consumes: the class names emitted by Tasks 7 and 9 (`array-view__cell`, `player__note`, `frame-rail`, …)
- Produces: styled components; no API change

- [ ] **Step 1: Download the fonts locally**

Fetch Archivo, IBM Plex Sans, and IBM Plex Mono woff2 files into `apps/web/public/fonts/`. **Do not link Google Fonts** — Task 15's check will fail the build, which is the intended guardrail.

- [ ] **Step 2: Write the tokens**

```css
/* apps/web/src/styles/tokens.css */
:root {
  --ink: #12161C;
  --paper: #F7F5F0;
  --rule: #2A313B;

  /* Semantic colours — shared by visualizations AND UI (§8.2) */
  --signal:  #E8B33C;  /* compare / cursor / primary action */
  --commit:  #3FB984;  /* done / sorted / accepted */
  --discard: #E5654B;  /* discard / wrong answer */
  --probe:   #57A8E8;  /* visited / info */
  --muted:   #7A8493;  /* default state */

  --font-display: 'Archivo', system-ui, sans-serif;
  --font-body: 'IBM Plex Sans', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  --measure: 68ch;
  --step-0: 1rem; --step-1: 1.125rem; --step-2: 1.375rem;
  --step-3: 1.75rem; --step-4: 2.25rem; --step-5: 3rem;
}

@font-face {
  font-family: 'IBM Plex Sans';
  src: url('/fonts/IBMPlexSans-Regular.woff2') format('woff2');
  font-weight: 400; font-display: swap;
}
/* …repeat for each weight and family… */

body { font-family: var(--font-body); font-size: var(--step-1); line-height: 1.65; }
```

- [ ] **Step 3: Style marks with a non-colour channel**

```css
/* apps/web/src/styles/viz.css */
.array-view { display: flex; gap: .25rem; list-style: none; padding: 0; flex-wrap: wrap; }
.array-view__cell { border: 2px solid var(--muted); padding: .5rem; min-width: 2.5rem;
                    text-align: center; font-family: var(--font-mono); }

/* Colour is never the only channel — each state also changes border style (§8.5). */
.array-view__cell[data-marks~="compare"] { border-color: var(--signal); border-style: dashed; }
.array-view__cell[data-marks~="cursor"]  { border-color: var(--signal); border-width: 4px; }
.array-view__cell[data-marks~="done"]    { border-color: var(--commit); border-style: double; }
.array-view__cell[data-marks~="discard"] { border-color: var(--discard); opacity: .45; }
.array-view__cell[data-marks~="active"]  { border-color: var(--probe); }

.array-view__tag { display: block; font-size: .625rem; text-transform: uppercase; }

.frame-rail { width: 100%; }

:where(button, select, input, [tabindex]):focus-visible {
  outline: 3px solid var(--signal); outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .player *, .array-view * { transition: none !important; animation: none !important; }
}

@media (max-width: 480px) {
  .player__controls { position: sticky; bottom: 0; background: var(--paper); }
}
```

- [ ] **Step 4: Verify contrast**

Check every token pair used for text against its background at AA (4.5:1 for body, 3:1 for large text). Record the ratios in a comment in `tokens.css`.

- [ ] **Step 5: Verify at 360px**

Open a lesson in a 360px-wide viewport.
Expected: no horizontal page scroll; controls remain reachable.

- [ ] **Step 6: Verify offline compliance**

Run: `pnpm build && pnpm check:offline`
Expected: exit 0 — proving fonts are genuinely self-hosted.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add design tokens, self-hosted fonts, and non-colour mark channels"
```

---

## Task 17: `bubbleSort` and `linearSearch` generators

`bubbleSort` is the mutating case that proves `snap` (spec §5.1). `linearSearch` powers the Big-O counter race (spec §5.2).

**Files:**
- Create: `packages/viz-core/src/algorithms/bubble-sort.ts`, `src/algorithms/linear-search.ts`
- Modify: `packages/viz-core/test/algorithms.conformance.test.ts`
- Modify: `apps/web/src/viz/registry.ts`, plus code samples for each

**Interfaces:**
- Consumes: `snap`, `VizAlgorithm`, `runConformance`
- Produces: `bubbleSort`, `linearSearch`; registry entries `bubble-sort`, `linear-search`

- [ ] **Step 1: Write the failing tests**

```ts
// append to packages/viz-core/test/algorithms.conformance.test.ts
import { bubbleSort } from '../src/algorithms/bubble-sort.js';
import { linearSearch } from '../src/algorithms/linear-search.js';

const smallArray = fc.record({
  arr: fc.array(fc.integer({ min: -99, max: 99 }), { minLength: 1, maxLength: 24 }),
});

runConformance({
  name: 'bubbleSort', algorithm: bubbleSort,
  arbitrary: smallArray, supportedTargets: ['index', 'range'],
});

test('bubbleSort ends with a sorted array', () => {
  fc.assert(fc.property(smallArray, ({ arr }) => {
    const last = collect(bubbleSort({ arr })).frames.at(-1)!;
    expect(last.state).toEqual([...arr].sort((a, b) => a - b));
  }));
});

test('bubbleSort frames differ from one another — proves snapshotting', () => {
  const { frames } = collect(bubbleSort({ arr: [3, 1, 2] }));
  const first = JSON.stringify(frames[0]!.state);
  const last = JSON.stringify(frames.at(-1)!.state);
  expect(first).not.toBe(last);
});

test('bubbleSort does not mutate its input', () => {
  const arr = [3, 1, 2];
  collect(bubbleSort({ arr }));
  expect(arr).toEqual([3, 1, 2]);
});

runConformance({
  name: 'linearSearch', algorithm: linearSearch,
  arbitrary: sortedArrayAndTarget, supportedTargets: ['index'],
});

test('linearSearch reports the number of checks it made', () => {
  const { frames } = collect(linearSearch({ arr: [5, 6, 7], target: 7 }));
  expect(frames.at(-1)!.vars!.checked).toBe(3);
});

test('linearSearch never uses fewer checks than binarySearch on the same input', () => {
  const arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
  const lin = collect(linearSearch({ arr, target: 91 })).frames.length;
  const bin = collect(binarySearch({ arr, target: 91 })).frames.length;
  expect(lin).toBeGreaterThan(bin);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm test conformance`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `bubbleSort`**

```ts
// packages/viz-core/src/algorithms/bubble-sort.ts
import { snap } from '../snap.js';
import type { VizAlgorithm } from '../types.js';

export interface BubbleSortInput { arr: number[] }

export const bubbleSort: VizAlgorithm<BubbleSortInput, number[]> =
function* ({ arr: input }) {
  const arr = [...input];   // never mutate the caller's array

  yield {
    state: snap(arr), line: 'INIT',
    note: `Sorting ${arr.length} values by repeatedly swapping neighbours.`,
  };

  for (let i = 0; i < arr.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < arr.length - 1 - i; j++) {
      yield {
        state: snap(arr), line: 'COMPARE', vars: { pass: i + 1, j },
        marks: [{ kind: 'compare', at: { t: 'range', from: j, to: j + 1 } }],
        note: `Compare ${arr[j]} and ${arr[j + 1]}.`,
      };

      if (arr[j]! > arr[j + 1]!) {
        [arr[j], arr[j + 1]] = [arr[j + 1]!, arr[j]!];
        swapped = true;
        yield {
          state: snap(arr), line: 'SWAP', vars: { pass: i + 1, j },
          marks: [{ kind: 'swap', at: { t: 'range', from: j, to: j + 1 } }],
          note: `They are out of order — swap them.`,
        };
      }
    }

    yield {
      state: snap(arr), line: 'PASS_END', vars: { pass: i + 1 },
      marks: [{ kind: 'done', at: { t: 'range', from: arr.length - 1 - i, to: arr.length - 1 } }],
      note: `Pass ${i + 1} finished. The largest ${i + 1} value(s) are settled.`,
    };

    if (!swapped) break;
  }

  yield {
    state: snap(arr), line: 'DONE',
    marks: [{ kind: 'done', at: { t: 'range', from: 0, to: arr.length - 1 } }],
    note: `Nothing left to swap — the array is sorted.`,
  };
};
```

`const arr = [...input]` is what makes the "does not mutate its input" test pass, and `snap` is what makes each frame independent. Both are required; neither is sufficient alone.

- [ ] **Step 4: Write `linearSearch`**

```ts
// packages/viz-core/src/algorithms/linear-search.ts
import { snap } from '../snap.js';
import type { VizAlgorithm } from '../types.js';

export interface LinearSearchInput { arr: number[]; target: number }

export const linearSearch: VizAlgorithm<LinearSearchInput, number[]> =
function* ({ arr, target }) {
  yield {
    state: snap(arr), line: 'INIT', vars: { checked: 0 },
    note: `Checking every value in order until ${target} turns up.`,
  };

  for (let i = 0; i < arr.length; i++) {
    yield {
      state: snap(arr), line: 'COMPARE', vars: { i, checked: i + 1 },
      marks: [{ kind: 'cursor', at: { t: 'index', i } }],
      note: `Is ${arr[i]} equal to ${target}?`,
    };

    if (arr[i] === target) {
      yield {
        state: snap(arr), line: 'FOUND', vars: { i, checked: i + 1 },
        marks: [{ kind: 'done', at: { t: 'index', i } }],
        note: `Found ${target} at index ${i}, after ${i + 1} checks.`,
      };
      return;
    }
  }

  yield {
    state: snap(arr), line: 'NOT_FOUND', vars: { checked: arr.length },
    note: `Checked all ${arr.length} values. ${target} is not present.`,
  };
};
```

- [ ] **Step 5: Run to verify pass**

Run: `pnpm test`
Expected: PASS. Note that `bubbleSort`'s conformance arbitrary caps at 24 — the per-entry budget from the Global Constraints, not the global 64.

- [ ] **Step 6: Add registry entries with code samples**

Follow the Task 11 pattern exactly. `bubble-sort` sets `defaultInput: { arr: [5, 2, 9, 1, 7, 3] }` and **`maxFrames: 400`**. Every sample must define `INIT`, `COMPARE`, `SWAP`, `PASS_END`, `DONE` for bubble sort and `INIT`, `COMPARE`, `FOUND`, `NOT_FOUND` for linear search, or lint rule 6 fails the build.

- [ ] **Step 7: Verify the gates**

Run: `pnpm lint:content && pnpm build`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add bubble sort and linear search generators with registry entries"
```

---

## Task 18: Three reference lessons

Spec §5. These are not content — they are the specification of the authoring experience, written as examples. Each must pass `IMPLEMENTATION_PLAN.md` §12's Definition of Done.

**Files:**
- Create: `apps/web/src/content/docs/algorithms/binary-search.mdx`
- Create: `apps/web/src/content/docs/algorithms/bubble-sort.mdx`
- Create: `apps/web/src/content/docs/complexity/big-o.mdx`
- Delete: any temporary lesson from Task 11

**Interfaces:**
- Consumes: `<Viz id="..." />`, the registry, lint gates
- Produces: the lessons `AUTHORING.md` (Task 19) is written from

- [ ] **Step 1: Write the Binary Search lesson**

```mdx
---
title: Binary Search
description: Find a value in a sorted array by repeatedly discarding half of it.
order: 220
difficulty: beginner
estimatedMinutes: 6
viz: binary-search
languages: [js, py, c]
---

import Viz from '../../../components/Viz.astro';

Looking for a name in a sorted list, you do not start at the top. You open
somewhere near the middle and decide which half to keep. Binary search is
that instinct, written down.

<Viz id="binary-search" />

Each step compares the target against the midpoint and throws away the half
that cannot contain it. The array **must** be sorted — that is the entire
source of the speedup.

## Trade-offs

Use it when the data is already sorted and you search it often. Avoid it when
the data changes constantly: keeping an array sorted costs more than the
searches save.

## Practice

Try [Binary Search on LeetCode](https://leetcode.com/problems/binary-search/).
```

Note the outbound LeetCode link — required by §5.4, and proof that Task 15's check does the right thing.

- [ ] **Step 2: Write the Bubble Sort lesson**

Same structure, `order: 221`, `viz: bubble-sort`. The hook should name why it is taught despite being slow: it is the shortest correct sort, and watching it makes "number of comparisons" concrete.

- [ ] **Step 3: Write the Big-O lesson as a counter race**

```mdx
---
title: How Fast Is Fast?
description: Watch two search algorithms race on the same array to see why growth rate matters.
order: 230
difficulty: beginner
estimatedMinutes: 7
viz: linear-search
prerequisites: [/algorithms/binary-search]
---
```

Show `linear-search` and `binary-search` on the **same** input, with each player's `checked` variable visible. The lesson's argument is watched, not asserted: fifty steps against six, on identical data. Do not introduce a growth-curve chart — that renderer arrives in Phase 1 (spec §5.2).

- [ ] **Step 4: Verify each lesson against the Definition of Done**

Walk `IMPLEMENTATION_PLAN.md` §12 item by item for all three:
frontmatter complete, ≤700 prose words, an interactive viz, a runnable ≤30-line example, 2–3 quiz questions with explanations, real prerequisites, readable with JS off, no external assets, readable at 360px.

- [ ] **Step 5: Verify JavaScript-disabled reading**

Disable JavaScript in the browser and load each lesson.
Expected: prose and code render; the `<noscript>` fallback explains the missing visualization. **This is a Definition-of-Done item, not a nicety.**

- [ ] **Step 6: Run every gate**

Run: `pnpm typecheck && pnpm test && pnpm build && pnpm lint:content && pnpm check:offline`
Expected: all exit 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add binary search, bubble sort, and big-o reference lessons"
```

---

## Task 19: Authoring documentation and content roadmap

`IMPLEMENTATION_PLAN.md` §15 step 7 argues the roadmap matters more than it looks: a fixed list is what makes progress measurable and what resists drifting into other content groups.

**Files:**
- Create: `docs/AUTHORING.md`, `ROADMAP-CONTENT.md`

**Interfaces:**
- Consumes: the three lessons from Task 18
- Produces: the document the Task 20 exit gate tests

- [ ] **Step 1: Write `docs/AUTHORING.md`**

Write it **from** the three lessons just built, not from theory. It must cover, with real copied-out examples: lesson file location and naming; every frontmatter field and its constraints; adding a registry entry; writing a generator (link the binary search source); the `@anchor` convention; picking `defaultInput` and `maxFrames`; running `pnpm lint:content` and reading its errors; and the §12 Definition of Done as a checklist to copy into a PR.

The test of this document is Task 20's fourth-lesson exercise. Write it for someone who has never seen the repository.

- [ ] **Step 2: Write `ROADMAP-CONTENT.md`**

List the Phase 1 lessons as a fixed, numbered table: slug, title, `order`, renderer needed, viz id, status. Leave the **count deliberately unset** — Task 20 sets it from measured data.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "docs: add authoring guide and phase 1 content roadmap"
```

---

## Task 20: CI pipeline and the exit gate

Delivers spec §6 task 9 and §7. The fourth-lesson test is the measurement Phase 1's schedule depends on.

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `apps/web/e2e/lesson.spec.ts`
- Modify: `ROADMAP-CONTENT.md` (record the measurement)

**Interfaces:**
- Consumes: every script from Tasks 14, 15, 18
- Produces: a green pipeline; a recorded per-lesson authoring cost

- [ ] **Step 1: Install Playwright and axe**

```bash
pnpm add -E --filter web -D @playwright/test @axe-core/playwright
pnpm --filter web exec playwright install --with-deps chromium
```

- [ ] **Step 2: Write the smoke test**

```ts
// apps/web/e2e/lesson.spec.ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('the player steps through frames', async ({ page }) => {
  await page.goto('/algorithms/binary-search');
  const note = page.getByTestId('note');
  const before = await note.textContent();
  await page.getByRole('button', { name: /next step/i }).click();
  expect(await note.textContent()).not.toBe(before);
});

test('the lesson has no accessibility violations', async ({ page }) => {
  await page.goto('/algorithms/binary-search');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

test('prose renders with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/algorithms/binary-search');
  await expect(page.getByRole('heading', { name: 'Binary Search' })).toBeVisible();
  await context.close();
});
```

- [ ] **Step 3: Write the workflow**

```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push: { branches: [master] }

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
      - run: pnpm lint:content
      - run: pnpm check:offline
      - run: pnpm --filter web exec playwright install --with-deps chromium
      - run: pnpm --filter web exec playwright test
```

Order matters: cheap checks fail fast, and `check:offline` runs after `build` because it scans build output.

- [ ] **Step 4: Verify CI fails on a broken lesson**

Temporarily break one lesson (remove its `viz:` field), push, and confirm the pipeline **fails** at `lint:content`. Revert.

This proves the Definition of Done is enforced mechanically rather than by checklist — spec §7's second gate item.

- [ ] **Step 5: Run the fourth-lesson test**

Build **Insertion Sort** as a fourth lesson using **only `docs/AUTHORING.md`**, with a timer running, under one constraint: **change nothing under `packages/`.**

If you need to touch `viz-core`, `viz-react`, or `Player`, the engine is not finished. Record what was missing, fix it, and re-run the test.

- [ ] **Step 6: Record the measurement and set Phase 1's scope**

Write the elapsed time into `ROADMAP-CONTENT.md`, then set the Phase 1 lesson count from it — not from `IMPLEMENTATION_PLAN.md` §14's estimate. At roughly 3 hours per lesson the planned ~35 lessons holds; at 6, Phase 1 is a ~20-lesson phase.

- [ ] **Step 7: Walk the full exit gate**

Confirm every item in spec §7:

- [ ] Lesson 4 built from documentation alone, no `packages/` changes, time recorded
- [ ] All three reference lessons pass the Definition of Done mechanically in CI
- [ ] The Judge0 question answered in writing (either outcome)
- [ ] Lighthouse Performance ≥ 95 on a lesson page
- [ ] A lesson is readable with JavaScript disabled
- [ ] `ROADMAP-CONTENT.md` frozen
- [ ] Phase 1's lesson count set from measured cost

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "ci: add verification pipeline and record phase 0 exit measurements"
```

---

## Self-Review Notes

**Spec coverage.** Every spec section maps to a task: §2.1→3, §2.2→7, §2.3→6, §2.4→4, §2.5→5, §2.6→5, §3.1→10, §3.2→11, §3.3→11, §3.4→14, §3.5→15, §4.1→12, §4.2→13, §4.3→13 step 5, §5→17+18, §6→all, §7→20, §8→covered by omission (the deferral table needs no task).

**One spec item deliberately carries no task:** §4.3's correction to the testcase-secrecy claim in `README.md`. There is no `README.md` in Phase 0 — the correction belongs with the Phase 1 work that introduces problems. It is recorded in the spec, which is where a future reader will look.

**Known gap to watch during execution.** Task 14's `untaggedCodeFences` uses fence-alternation to distinguish opening from closing fences. That heuristic breaks on nested fences (a fenced block containing a fenced block), which MDX permits. No Phase 0 lesson does this. If a lesson ever needs it, replace the regex with a real MDX AST walk rather than patching the heuristic.
