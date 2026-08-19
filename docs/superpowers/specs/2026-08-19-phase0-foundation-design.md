# Phase 0 — Foundation: Design Spec

> Executable design for Phase 0 of the CS Learning Platform.
> Companion to `IMPLEMENTATION_PLAN.md`, which remains the strategy document.
> 2026-08-19

---

## 0. Scope of this document

`IMPLEMENTATION_PLAN.md` decides *what the product is*. This document decides
*what gets built in the first two weeks, in what order, and how each piece is
verified*. It overrides the strategy plan wherever the two disagree; every such
disagreement is listed in §1.

Out of scope: Phase 1 and later. Phase 1 is planned after Phase 0, using the
authoring-cost measurement Phase 0 produces (§7).

**Assumed capacity:** one person, full-time, ten working days.

---

## 1. Corrections to IMPLEMENTATION_PLAN.md

These are errors and gaps found while reviewing the strategy plan. Each is
resolved in the section named.

### 1.1. Version pins (§2.1)

Verified against the npm registry on 2026-08-19:

| Package | Plan says | Actual latest | Action |
|---|---|---|---|
| `astro` | 7.x | 7.2.3 | correct |
| `@astrojs/starlight` | 0.41.x | 0.41.7 | correct |
| `react` | 19.x | 19.2.8 | correct |
| `tailwindcss` | 4.x | 4.3.3 | correct |
| `@xyflow/react` | 12.x | 12.11.3 | correct |
| `recharts` | 3.x | 3.10.1 | correct |
| `idb-keyval` | 6.x | 6.3.0 | correct |
| `motion` | 12.x | **13.1.0** | plan is a major version behind |
| `xterm` | 5.x | **`@xterm/xterm` 6.0.0** | `xterm` is the dead package name |
| `pyodide` | 0.28+ | **314.0.5** | Pyodide moved to CPython-tracking versions (314 = Python 3.14); "0.28+" would pin a year-old release |

`motion`, `@xterm/xterm`, and `pyodide` are Phase 2/3 concerns and are not
installed in Phase 0. They are recorded here so the table is not trusted
verbatim later.

**Rule going forward:** resolve versions from the registry at install time.
Pin exactly (no `^`, no `~`), per §2.2's existing reasoning about Starlight 0.x.

### 1.2. Frames must own their state (§4.1, §4.2)

The `binarySearch` example yields `state: arr` — the same array reference in
every frame. Harmless there, because binary search never writes to the array.
**Fatal for `bubbleSort`**, which mutates in place: every frame would point at
one array, and the player would render the final sorted state at step 1.

Resolved in §2.1.

### 1.3. `Mark.at` is overloaded (§4.1)

`at: number | string | [number, number]` means *a range* in `ArrayView`
(`{kind:'active', at:[lo,hi]}` in the §4.2 example). The same type would mean
*an edge* in `GraphView` and *a cell* in `Matrix2DView` — three incompatible
meanings in a package that is explicitly renderer-agnostic (§3).

Resolved in §2.2.

### 1.4. `Frame.line` cannot address multi-language code (§4.1, §4.5)

The registry holds `code: { js, c, java }`, but a frame carries one
`line: number`. Line 6 of the JS sample is not line 6 of the C sample.

Resolved in §2.3.

### 1.5. No frame budget (§4.3, §4.6)

Bubble sort at n=60 produces roughly 3,600 frames, each holding a full array
snapshot. §4.6 tests that "frame count is bounded" but no bound is defined and
no input size is capped — while §4.3 hands learners a free-text input box.

Resolved in §2.4.

### 1.6. Content config path is the Astro 4 location (§3)

The plan puts the Zod schema at `src/content/config.ts`. Astro 5+ uses
`src/content.config.ts` at the `src` root with the loader API, and Starlight
requires *extending* its schema rather than replacing it. Following the plan
literally produces a schema Astro silently ignores.

Resolved in §3.1.

### 1.7. The registry defeats the islands argument (§4.5)

As written, `registry.ts` statically imports every algorithm and every code
sample. Importing it from a lesson page ships *all* viz code to *every* lesson —
which undermines the zero-JS islands argument §2.2 uses to justify the entire
stack choice.

Resolved in §3.2.

### 1.8. `check:offline` contradicts the LeetCode links (§5.4 vs §9.4)

§9.4 fails the build on any external URL in the output. §5.4 *requires* every
lesson to link out to LeetCode/HackerRank. As specified, the first real lesson
breaks CI.

Resolved in §3.4.

### 1.9. The 700-word limit counts code blocks (§5.3)

A 30-line example (itself required by §12) would consume a large share of the
budget, pushing authors toward worse lessons to satisfy a lint rule.

Resolved in §3.4.

### 1.10. Hidden-testcase secrecy is overstated (§0.1)

§0.1 says learners "cannot read the answer" because only
`sha256(normalize(expected_output))` ships. Two holes:

1. The hidden test's **stdin must ship anyway**, because the client is what
   sends it to Judge0. Anyone with a working solution runs it on the visible
   inputs and gets the expected output directly.
2. The comparison happens in client JavaScript, which is patchable.

The trade-off remains correct for a learning site. The *claim* must be
corrected, so that nothing is later built on a guarantee that was never real.

**Accurate statement:** hidden tests are *not displayed by default*, which
prevents casual answer-peeking during debugging. They are not secret. Real
secrecy requires Phase 5's backend.

Resolved in §4.3.

### 1.11. The Big-O lesson has no renderer (§11 Phase 0)

Phase 0 names Binary Search, Bubble Sort, and Big-O as its three reference
lessons, but complexity growth is a chart. Building a chart renderer on day one
breaks §4.4's "no eleventh renderer until three lessons need it" rule at the
first opportunity.

Resolved in §5.2.

### 1.12. The exit criterion is not falsifiable (§11 Phase 0)

"Someone outside the project reads `AUTHORING.md` and writes lesson #4" has no
outsider in a solo build, and degrades into "I feel ready."

Resolved in §7.

### 1.13. Judge0 in Phase 0 is the largest schedule risk

Judge0 needs privileged containers with cgroup access. The development machine
is Windows 11 / WSL2. This is the most likely multi-day time sink in the plan,
and Phase 0 currently blocks on it.

Resolved in §4: timeboxed spike, then deferred to Phase 1 behind an interface.

### 1.14. The repository was not under version control

`git init` is task zero. §10.4 assumes CI on pull requests.

---

## 2. `viz-core` API

`viz-core` does not import React. It produces frame data; renderers consume it.
This is what makes the algorithms testable under plain Vitest, and it is the
single most important boundary in the codebase.

### 2.1. Frames own their state

```ts
/**
 * Frames are immutable snapshots.
 * Generators MUST NOT yield a reference to live, mutating state.
 */
export function snap<S>(s: S): S;   // structuredClone; Object.freeze in dev builds
```

Every generator yields `state: snap(arr)`, never `state: arr`.

Enforced by test, not by convention: collect the frames, mutate the input array,
assert no frame changed. This test runs against every registered algorithm.

### 2.2. Marks target a tagged union

```ts
export type Target =
  | { t: 'index'; i: number }
  | { t: 'range'; from: number; to: number };

export type MarkKind =
  | 'cursor' | 'compare' | 'swap' | 'done' | 'visited' | 'active' | 'discard';

export interface Mark { kind: MarkKind; at: Target }
```

Phase 0 ships `index` and `range` only — that is all `ArrayView` needs, and
YAGNI applies to the members. It does **not** apply to the shape: a tagged union
makes `{t:'cell'}`, `{t:'node'}`, `{t:'edge'}` additive in Phase 1 instead of a
breaking rewrite of every generator written before them.

Renderers narrow on `t` and must throw a clear error on a target they do not
support, rather than rendering nothing.

### 2.3. Code positions are named anchors

```ts
export interface Frame<S = unknown> {
  state: S;                                   // immutable snapshot (§2.1)
  marks?: Mark[];
  note: string;                               // required, non-empty
  line?: AnchorId;                            // a label, not a line number
  vars?: Record<string, string | number>;
}

export type AnchorId = string;                // e.g. 'DISCARD_LEFT'
```

Code samples declare where each anchor lives, using a comment in the sample's
own language:

```c
lo = mid + 1;   // @anchor DISCARD_LEFT
```

```py
lo = mid + 1    # @anchor DISCARD_LEFT
```

A build step strips the `@anchor` comments from the displayed source and emits
`Record<Lang, Record<AnchorId, number>>`. A frame referencing an anchor that a
language sample does not define **fails the build** (§3.4) — the same
build-time-discipline philosophy §5.3 already applies to frontmatter.

### 2.4. Frame budget enforced at collection

```ts
export const MAX_FRAMES = 1500;

export function collect<S>(
  g: Generator<Frame<S>>,
  cap: number = MAX_FRAMES,
): { frames: Frame<S>[]; truncated: boolean };
```

Generators stay pure and unbounded — they read like textbook pseudo-code, which
is the point of §4.2 and must not be compromised. The *collector* enforces the
cap and, on overflow, appends a terminal frame explaining the truncation rather
than throwing.

Paired with a size cap in each registry entry's `inputSchema`
(`z.array(z.number()).max(64)`), this makes the learner-editable input box of
§4.3 safe by construction.

**Per-entry caps are tighter than the global one.** 64 is the ceiling, not the
default. An O(n log n) algorithm can afford it; bubble sort at n=64 produces
roughly 2,000 frames and would truncate on its own default input. Each entry
sets a cap that keeps its `defaultInput` comfortably under `MAX_FRAMES` —
bubble sort's is 24. Truncation is a safety net for learner input, never
something a shipped lesson relies on, and lint rule 7 (§3.4) enforces that.

### 2.5. Generator contract

A registered algorithm must:

1. be a pure generator — no I/O, no clock, no randomness without a seeded source
2. yield at least one frame
3. yield an unmarked initial frame first, showing the starting state
4. give every frame a non-empty `note`
5. yield only snapshots (§2.1)
6. terminate within `MAX_FRAMES` on any input its `inputSchema` accepts

Items 2–6 are enforced by a shared conformance test suite that every registry
entry is run through automatically.

### 2.6. Tests

Property-based, using `fast-check`:

- every sorting algorithm's final frame equals the sorted input
- every frame has a non-empty `note`
- every algorithm terminates within `MAX_FRAMES` for schema-valid input
- mutating the input after `collect` changes no frame (§2.1)
- every `Target` emitted is supported by the entry's declared renderer

Coverage target: 80% (project standard), which `viz-core` should exceed easily
given it is pure functions.

---

## 3. Content pipeline

### 3.1. Collection config

```ts
// apps/web/src/content.config.ts
import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

const lessonSchema = z.object({
  order: z.number().int(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedMinutes: z.number().int().min(2).max(12),
  viz: z.string().optional(),
  prerequisites: z.array(z.string()).default([]),
  languages: z.array(z.enum(['c', 'cpp', 'java', 'py', 'js'])).default([]),
  problems: z.array(z.string()).default([]),
});

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({ extend: lessonSchema }),
  }),
};
```

`title` and `description` come from Starlight's own schema and are not
redeclared.

### 3.2. Registry, code-split

```ts
// apps/web/src/viz/registry.ts
export const VIZ = {
  'binary-search': {
    renderer: 'ArrayView',                                  // static, tiny
    defaultInput: { arr: [2,5,8,12,16,23,38,56,72,91], target: 23 },
    inputSchema: z.object({
      arr: z.array(z.number()).max(64),
      target: z.number(),
    }),
    load: () => import('@cs/viz-core/algorithms/binary-search'),   // dynamic
    code: () => import('./code/binary-search.js'),                 // dynamic
  },
} satisfies Record<string, VizEntry>;
```

Static metadata stays in the main chunk; generators and code samples load on
demand. Without this split, one lesson page ships every algorithm on the site.

### 3.3. `<Viz>` component

- hydrates with `client:visible` — visualizations sit below the fold, and prose
  lessons must keep shipping 0 KB of JS (§2.2)
- the slot contains a real no-JS fallback: the initial frame's `note` rendered
  as prose plus a short line stating the interactive version needs JavaScript.
  §12's Definition of Done requires the lesson to remain readable with
  JavaScript disabled; a blank box does not satisfy that
- validates learner input against `inputSchema` before running, and shows the
  validation message inline rather than throwing

### 3.4. Lint gates (`scripts/lint-content.ts`)

Fails the build when:

1. a lesson in the DSA tree has no `viz`
2. `prerequisites` names a slug that does not exist
3. prose exceeds 700 words — **excluding fenced code blocks** (§1.9)
4. a code block does not declare its language
5. a `viz:` id does not resolve to a registry entry
6. a frame emits an `AnchorId` that some language sample of that entry does not
   define (§2.3)
7. an entry's generator, run on its `defaultInput`, exceeds `MAX_FRAMES`

Rules 5–7 are new and exist because §2 makes them checkable. Rule 7 is the
valuable one: a runaway generator fails CI instead of hanging a learner's tab.

Each rule ships with a negative test — a fixture that violates it and asserts
the build fails with a legible message.

### 3.5. `check:offline`

Scans build output for **asset references only**: `<link href>`, `<script src>`,
`<img src>`, `srcset`, `url()` in CSS, and `fetch`/`import` targets. Prose
anchors are ignored, because §5.4 requires outbound links to LeetCode and
HackerRank in every lesson.

---

## 4. Judge seam

### 4.1. Interface

```ts
// apps/web/src/lib/judge/types.ts
export interface Judge {
  languages(): Promise<Record<Lang, number>>;
  run(subs: Submission[], signal?: AbortSignal): Promise<Result[]>;
}
```

Phase 0 ships `MockJudge`: deterministic, in-memory, no network. Tests and the
Problem-page skeleton run against it. Phase 1 adds `Judge0Http` behind the same
interface; only the factory knows which is in use.

This mirrors §7's reasoning for putting progress behind an interface, and exists
for the same reason: the swap should cost nothing.

### 4.2. Spike (timeboxed to one day)

**Check first — five minutes.** Run `stat -fc %T /sys/fs/cgroup` inside WSL. A
result of `cgroup2fs` means cgroup v2, and Judge0's `isolate` sandbox has a
well-known dependency on cgroup v1. This is the most likely cause of failure,
and finding it immediately is most of the value of the timebox.

The spike passes only if all six hold. `GET /about` alone is **not** sufficient —
it answers even when workers cannot sandbox anything:

1. `GET /about` returns a version **and** a C submission returns `Accepted`
2. with `ENABLE_NETWORK=false`, a program opening a socket fails
3. an infinite loop returns TLE and the worker stays healthy afterward
4. a fork bomb is contained by `max_processes_and_or_threads`
5. the batch endpoint round-trips with `base64_encoded=true` (§6.2 depends on
   this)
6. `GET /languages` returns a map and `map-judge0-languages.ts` writes a real
   mapping file

**Exit condition, either outcome:** `docs/spikes/2026-08-judge0-wsl2.md`,
recording either "works, here is the compose file and the gotchas" or "does not
work here, and the fallback is X." A spike ending in a vague impression is a
spike that gets repeated.

Fallbacks, if it fails: run Judge0 on a Linux VM rather than WSL2, or evaluate a
judge that does not require privileged mode. Either is a Phase 1 decision; it
does not block Phase 0.

### 4.3. Correction to the testcase-secrecy claim

`README.md` and §0.1 must state: hidden tests are **not displayed by default**,
which prevents casual answer-peeking while debugging. They are **not secret** —
their stdin ships to the client, and the comparison runs in client JavaScript.
Real secrecy requires Phase 5's backend.

---

## 5. Reference lessons

### 5.1. Why three, and which three

Phase 0's lessons are not content — they are the specification of the authoring
experience, written in the form of examples. Each one exists to exercise a
distinct part of the engine.

| Lesson | Exercises |
|---|---|
| Binary Search | the read-only case; `range` marks; anchors across languages |
| Bubble Sort | the **mutating** case — proves `snap` (§2.1); frame budget near its cap |
| Big-O as a counter race | two `ArrayView` instances on one page; shared input |

### 5.2. Big-O without a chart renderer

Instead of plotting growth curves, the lesson runs **linear search and binary
search on the same array, side by side, with live operation counters**. The
learner watches fifty steps lose to six.

This keeps Phase 0 at one renderer, honours §4.4's rule, and is pedagogically
stronger than a curve — the abstraction is derived from something watched rather
than asserted. A chart renderer arrives in Phase 1, when three lessons need it.

---

## 6. Task sequence

Ten working days. One rule governs the ordering: **task 1 is the only task
allowed to be ugly, and nothing before task 6 needs styling at all.**

| # | Task | Done when |
|---|---|---|
| 0 | `git init`; pnpm workspace; scaffold Astro + Starlight; pin versions exactly from the registry | `pnpm --filter web dev` serves the default site; zero `^` ranges in any `package.json` |
| 1 | **Vertical slice, deliberately ugly.** Minimal types, `snap`, `collect`, `binarySearch`; unstyled `ArrayView`; three-button `Player`; one MDX page wiring them together | Clicking "step" in a browser changes cells and updates the note. No CSS. This is the integration proof; everything after is hardening |
| 2 | Harden `viz-core`: property tests, frame budget, truncation frame, snapshot-isolation test (§2.6) | Tests green at ≥80% coverage; mutating the input after `collect` provably changes no frame |
| 3 | `Player` for real: full transport, scrub rail, speed control, vars and note panels, keyboard map, `prefers-reduced-motion`, focus rings | Keyboard-only traversal of every frame; axe-core clean; usable at 360px |
| 4 | Content pipeline: `content.config.ts`, code-split registry, `<Viz>` with no-JS fallback, anchor extraction, `lint-content.ts` | All seven lint rules have negative tests that fail the build with legible messages |
| 5 | **Judge0 spike (hard timebox: one day)**; `Judge` interface; `MockJudge` | The six-point checklist of §4.2, and the spike note written either way |
| 6 | Design tokens, self-hosted fonts, Frame Rail, light and dark themes (§8) | AA contrast verified; every mark colour also carries a text label; `check:offline` passes |
| 7–8 | The three reference lessons (§5) | All three pass §12's Definition of Done, item by item |
| 9 | `AUTHORING.md`, written *from* the lessons just built; `ROADMAP-CONTENT.md`; CI pipeline | CI green on a pull request; a deliberately broken lesson fails it |
| 10 | Buffer; exit review (§7) | — |

Design tokens land at task 6, not at the start. Styling an interface whose shape
is not yet confirmed is wasted work; by task 6 three lessons have exercised it.

The Judge0 spike sits at task 5 deliberately: early enough that failure leaves
room to react, late enough that a bad Docker day does not stall the project
before anything visible exists.

---

## 7. Exit criteria

**The fourth-lesson test.** Build a fourth lesson (Insertion Sort) using only
`AUTHORING.md`, with a timer running, under one constraint: **no changes to
anything under `packages/`.** If lesson 4 requires touching `viz-core`,
`viz-react`, or the `Player`, the engine is not finished.

This is §11's original intent made falsifiable, and it produces the number
Phase 1 depends on. §14 budgets ~35 lessons for Phase 1 against an authoring
cost nobody has measured. Lesson 4 measures it: at 3 hours per lesson, Phase 1's
5–6 weeks holds; at 6 hours, Phase 1 is a 20-lesson phase — known before
committing, rather than discovered in week five.

Full gate:

- [ ] Lesson 4 built from documentation alone, no `packages/` changes, time recorded
- [ ] All three reference lessons pass §12's Definition of Done **mechanically in CI**, not by human checklist
- [ ] The Judge0 question answered in writing — either outcome passes
- [ ] Lighthouse Performance ≥ 95 on a lesson page
- [ ] A lesson is readable with JavaScript disabled
- [ ] `ROADMAP-CONTENT.md` frozen
- [ ] Phase 1's lesson count set from the measured cost, not from §14's estimate

The last item is the gate's real purpose. Phase 0 is not only infrastructure —
it is the experiment that establishes whether the rest of the plan's numbers are
real.

---

## 8. Explicitly deferred

Not in Phase 0, and not to be started early:

| Item | Phase | Why |
|---|---|---|
| Judge0 integration (`Judge0Http`) | 1 | Behind the §4.1 interface; spike only in Phase 0 |
| `content-problems/`, `build-problems.ts`, testcase hashing | 1 | Nothing to submit to yet |
| Pyodide, browser runner | 1 | No lesson needs it; asset weight is real |
| Progress store, export/import (§7) | 1 | No progress worth storing across three lessons |
| Renderers beyond `ArrayView` | 1 | §4.4's rule: three lessons must need one first |
| Chart renderer | 1 | §5.2 removes Phase 0's need for it |
| Search (Pagefind) | 1 | Ships with Starlight; three lessons do not need tuning |
| i18n | — | §0: English only |
