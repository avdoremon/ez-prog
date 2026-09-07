# Authoring a lesson

This is the complete, stand-alone guide to writing a lesson for this platform. It is
written **from** the lessons that already exist, not from the design plan — every claim
below was checked against the real source in this repository as of commit `b3d8251`.
Where the design plan (`IMPLEMENTATION_PLAN.md`) says one thing and the code does
another, this document follows the code and calls out the gap.

Every shipped lesson lives under `apps/web/src/content/docs/`; list that directory for
the current set rather than trusting a list here. Four are worth reading first, because
each shows a different shape:

- `algorithms/binary-search.mdx` - the canonical example. Start here.
- `algorithms/insertion-sort.mdx` - written from this guide alone, as the test of
  whether the guide is sufficient.
- `algorithms/linear-search.mdx` - reuses an existing registry entry and adds no new
  generator at all: the cheapest shape a lesson can take.
- `data-structures/tree.mdx` - uses `TreeView3D`, a camera-controllable 3D view,
  instead of `ArrayView`, and lets the learner change the traversal order from the
  input editor. It reaches for the heavy-dependency renderer pattern (§4.6) rather
  than the lightweight one.
- `algorithms/bfs.mdx` - uses `GraphView3D`, the same heavy-dependency 3D pattern as
  `TreeView3D` but for arbitrary node-and-edge graphs (a force-directed layout
  instead of a radial tree). `algorithms/dfs.mdx`, `algorithms/dijkstra.mdx`, and
  `data-structures/graph.mdx` (`graph-intro` in the registry) now use it too.
  Together with `data-structures/tree.mdx`/`data-structures/bst.mdx`,
  `data-structures/linked-list.mdx`, and `data-structures/trie.mdx` (which use
  `HierarchyView3D`, another heavy-dependency 3D renderer with a deterministic
  radial layout), these are the lessons so far that reach for the heavy-dependency
  renderer pattern (§4.6) rather than the lightweight one.

## 0. The one constraint that shapes everything below

**A lesson that reuses an existing renderer never requires you to modify a file that
already exists under `packages/`.** Concretely:

- New lesson prose → `apps/web/src/content/docs/**`. Not under `packages/`.
- A new visualization registry entry → `apps/web/src/viz/registry.ts`. This is under
  `apps/web/`, not `packages/`.
- A new algorithm generator → **one new file** at
  `packages/viz-core/src/algorithms/<your-algorithm>.ts`. This file lives under
  `packages/`, but it is a brand-new file — you are not editing anything that already
  exists there. `packages/viz-core/package.json` exports `"./algorithms/*": "./src/algorithms/*.ts"` (a wildcard), so a new file under `src/algorithms/` is
  importable as `@cs/viz-core/algorithms/<name>` immediately, with **no edit** to
  `package.json` or `src/index.ts`. Verified: `packages/viz-core/src/index.ts` only
  re-exports `types`, `snap`, `collect`, `anchors` — it has never re-exported individual
  algorithms; they are always imported by their subpath, exactly as
  `apps/web/src/viz/registry.ts` does today.
- Per-language code samples for the anchor panel → new files under
  `apps/web/src/viz/code/<your-algorithm>/`. Under `apps/web/`, not `packages/`.

So: **adding a lesson that reuses the `ArrayView` renderer touches zero existing files
under `packages/`.** If your lesson idea needs anything the existing pieces don't
provide — a new renderer (`ArrayView`, `TreeView`, `GraphView`, `TreeView3D`,
`GraphView3D`, and `HierarchyView3D` exist today — see §4.6 for the two different ways a renderer can be
added), a new `Mark`/`Target` shape,
a change to how `snap`, `collect`, or `parseAnchors` behave — that is an **engine
change**. It means editing an *existing* file under `packages/viz-core` or
`packages/viz-react`. Do not make that change as part of a content PR. Stop and report
it — needing an engine change is a signal about scope, not a routine step, and it
belongs in its own scoped piece of work rather than silently absorbed into a "quick"
content edit. When this was last measured, exercising a new lesson end to end surfaced
four pre-existing engine defects (see `docs/PHASE0-EXIT.md`); reporting beats absorbing.

Everything in this document about adding a visualization assumes you are reusing one of
the existing renderers: `ArrayView` for anything positional (sorting, searching,
two-pointer, sliding-window, stacks, queues), `TreeView` for a complete binary tree held
in an array, `GraphView` for nodes and edges, `TreeView3D` for the same complete
binary tree drawn as a camera-controllable 3D scene, `GraphView3D` for the same
node-and-edge graph as `GraphView` drawn as a camera-controllable, force-directed 3D
scene, or `HierarchyView3D` for the same node-and-edge graph drawn as a camera-controllable
3D scene with a deterministic radial layout (acyclic graphs: chains and trees). The first
two take the same `number[]` state and the same index-based marks, so choosing between them
is a one-word change in the registry; `GraphView`, `GraphView3D`, and `HierarchyView3D`
take a `GraphState` instead (§4.6). `TreeView3D` also takes the same
`number[]`/index-based-marks state as `TreeView`, while `GraphView3D` and `HierarchyView3D`
also take the same `GraphState` as `GraphView` — the difference is entirely in *how it's
loaded* (§4.6), not in the data either consumes.

## 1. Where lesson files go, and how a slug is derived

Lessons live under `apps/web/src/content/docs/`, one file per lesson, grouped into
subdirectories by topic:

```
apps/web/src/content/docs/
  index.mdx            the landing page — link your lesson from here (see below)
  data-structures/     array, stack, queue, heap, tree, ...
  algorithms/          searches, sorts, two-pointer, sliding-window, greedy, ...
  complexity/          big-o, amortized-analysis, ...
```

Both `.md` and `.mdx` are discovered and linted identically — verified in
`scripts/lint-content.ts`, which globs `['.mdx', '.md']` under the content root. Use
`.mdx` when the lesson needs the `<Viz />` component (i.e. almost every DSA lesson);
plain `.md` is fine for prose-only pages.

**Slug derivation** (from `lintContent`'s `slugFor`): take the file's path relative to
`apps/web/src/content/docs`, strip the `.md`/`.mdx` extension, normalize backslashes to
forward slashes, and prefix with `/`. So:

```
algorithms/binary-search.mdx  →  /algorithms/binary-search
complexity/big-o.mdx          →  /complexity/big-o
```

This exact string is what `prerequisites` entries must match (see §2), and it is also
the routed URL Starlight serves the page at (with a trailing slash, e.g.
`/algorithms/binary-search/` — see the hero link in
`apps/web/src/content/docs/index.mdx`).

**Which directory to use, and the sidebar:** three directory prefixes are treated as
"DSA content" by the linter — `data-structures/`, `algorithms/`, `complexity/`
(`DSA_PREFIXES` in `scripts/lint-content.ts`). Any lesson under one of these **must**
declare a `viz` (§6, rule `dsa-requires-viz`). Beyond linting, the sidebar is built from
`apps/web/astro.config.mjs`, which lists one explicit group per directory:

```js
sidebar: [
  { label: 'Data Structures', items: [{ autogenerate: { directory: 'data-structures' } }] },
  { label: 'Algorithms', items: [{ autogenerate: { directory: 'algorithms' } }] },
  { label: 'Complexity', items: [{ autogenerate: { directory: 'complexity' } }] },
],
```

A file dropped into any of those appears in the nav automatically. Group order here is
manual and follows `IMPLEMENTATION_PLAN.md` §5.1's numbering. If you introduce a
brand-new top-level directory, you must add a matching group yourself — an ordinary
`apps/web` edit, not an engine change, but it will not happen for you.

**`order` drives the sidebar — set it deliberately.** Starlight's `autogenerate`
sidebar sorts by its own nested `sidebar.order` field (from
`@astrojs/starlight/schema.ts`: *"Pages are sorted by this value in ascending order.
Then by slug. If not provided, pages will be sorted alphabetically by slug."*).
`apps/web/src/content.config.ts` copies this project's `order` into `sidebar.order`
when parsing frontmatter, so the number you write in §2 is the position your lesson
takes in the nav. **You do not write the number twice** — an explicit `sidebar.order`
still wins if you set one, but no lesson needs to.

This was not always true. Until it was wired up, nav order was alphabetical by slug and
merely *coincided* with the teaching order, because the early lesson names happened to
sort the same way their numbers did. The first lesson whose name and number disagreed
would have silently landed in the wrong place — a lesson numbered 222 rendered last,
after 226 and 234. `apps/web/e2e/sidebar-order.spec.ts` now derives the expected order
from the lesson files themselves and fails if the rendered nav disagrees, so it covers
your lesson without you editing the test.

### Two files outside your lesson that you must also edit

A new lesson is not just its own file. Both of these are enforced — skip either and
`pnpm test:e2e` fails, though not always with an obvious message:

1. **`apps/web/e2e/lesson.spec.ts` → the `ALL_LESSONS` array.** Add your lesson's
   routed path, with its trailing slash (`/algorithms/two-pointer/`). That array drives
   the per-lesson accessibility, 360px, dark-scheme, and layout-shift tests — a lesson
   missing from it is simply never checked, which is the quiet failure mode, not a loud
   one.
2. **`apps/web/src/content/docs/index.mdx` → a card in the "Start here" grid.** The
   homepage test asserts that every path in `ALL_LESSONS` is linked from the homepage,
   so adding (1) without (2) fails with `expect(locator).toBeVisible()` on an `a[href]`
   selector. That test exists so lessons cannot ship undiscoverable. Adding a card does
   **not** put the homepage over the 700-word limit — it is `template: splash` and
   exempt from that rule (§6, rule 3). Do not trim homepage copy to make room.

## 2. Frontmatter: every field, exactly

Frontmatter is validated by two schemas merged together (see
`apps/web/src/content.config.ts`): Starlight's own `docsSchema()`, and this project's
`lessonSchema`, passed as `docsSchema({ extend: lessonSchema })`. They merge into one
flat object — you write all fields at the same indentation level.

### Fields owned by Starlight (not this project's schema)

Source: `docsSchema.ts` inside the installed `@astrojs/starlight` package.

| Field | Required? | Type | Notes |
|---|---|---|---|
| `title` | **Required** | `string` | No length limit is enforced in code (the design plan's aspiration of ≤60 chars was never implemented — keep it short anyway, it's the page `<title>` and nav label). |
| `description` | Optional (recommended) | `string` | Starlight's schema literally marks this `.optional()`. Every real lesson supplies one — it drives the page meta description — so always write one even though nothing will fail if you skip it. |
| `template` | Optional | `'doc' \| 'splash'` | Only the site's `index.mdx` uses `splash`. Leave unset for a normal lesson. |
| `sidebar.order` | Optional | `number` | Starlight's *own* nav-ordering field, distinct from this project's `order` (see §1). Not used by any real lesson yet. |

Starlight also accepts `hero`, `banner`, `prev`/`next`, `draft`, `pagefind`, `editUrl`,
`head`, `tableOfContents` — no real lesson uses these; ignore them
unless you have a specific reason.

### Fields owned by this project's `lessonSchema`

Source: `apps/web/src/content.config.ts`.

| Field | Required? | Type / constraint | Notes |
|---|---|---|---|
| `order` | **Required** | `number`, integer | See §1 — does not yet control sidebar position, but is required and validated as an integer. |
| `difficulty` | **Required** | `'beginner' \| 'intermediate' \| 'advanced'` | Exactly these three strings. All five real lessons use `beginner`. |
| `estimatedMinutes` | **Required** | integer, `2`–`12` inclusive | Real values used: 6, 6, 7. Out-of-range values fail the Zod schema at build time (Astro's content collection validation, checked by `pnpm typecheck` via `astro check` and by `pnpm build`). |
| `viz` | Optional in the schema, but **required** by lint for any lesson under `algorithms/`, `data-structures/`, or `complexity/` (rule `dsa-requires-viz`, §6) | `string` | Must be a key in `apps/web/src/viz/registry.ts`, or lint rule `viz-id-exists` fails. |
| `prerequisites` | Optional | `string[]`, defaults to `[]` | Each entry must equal another lesson's derived slug (§1), e.g. `/algorithms/binary-search`. A bare form without the leading slash is also accepted (lint prefixes it), but write the leading-slash form — it's what every real lesson uses and it's the actual slug string. |
| `languages` | Optional | array of `'c' \| 'cpp' \| 'java' \| 'py' \| 'js'`, defaults to `[]` | **Currently metadata only** — verified nothing in `apps/web/src` reads this field to drive UI (no language switcher exists yet; the on-page code panel always shows the `js` sample only — see §4.6/§4.9). Set it to the languages you actually wrote anchor-tagged samples for, for future-proofing, but do not expect it to change what's rendered today. |
| `problems` | Optional | `string[]`, defaults to `[]` | Declared in the schema but **not populated by any real lesson** and not read anywhere in `apps/web/src` or `scripts/`. The actual, working convention for linking to practice is a prose `## Practice` section (§3, §7) — use that, not this field. |

### A complete, copyable, real example

Verbatim from `apps/web/src/content/docs/algorithms/binary-search.mdx`:

```yaml
---
title: Binary Search
description: Find a value in a sorted array by repeatedly discarding half of it.
order: 220
difficulty: beginner
estimatedMinutes: 6
viz: binary-search
languages: [js, py, c]
---
```

And one that also declares a prerequisite, from `complexity/big-o.mdx`:

```yaml
---
title: How Fast Is Fast?
description: Watch two search algorithms race on the same array to see why growth rate matters.
order: 230
difficulty: beginner
estimatedMinutes: 7
viz: linear-search
prerequisites: [/algorithms/binary-search]
languages: [js]
---
```

Immediately after the closing `---`, every lesson that uses a visualization imports the
`Viz` component (path is relative — three levels up from `algorithms/` or
`complexity/` to `src/`):

```mdx
import Viz from '../../../components/Viz.astro';
```

## 3. The lesson shape

Every real lesson follows the same structure (`IMPLEMENTATION_PLAN.md` §5.2, verified
against all five files):

1. **Hook** — 1–2 sentences right after the `import`, before the visualization. States
   the everyday intuition or the problem, not the mechanism.
   > "Looking for a name in a sorted list, you do not start at the top. You open
   > somewhere near the middle and decide which half to keep. Binary search is that
   > instinct, written down." — `binary-search.mdx`
2. **Visualization** — `<Viz id="..." />`, placed right after the hook. A lesson can
   embed more than one: `big-o.mdx` places `<Viz id="linear-search" />` and
   `<Viz id="binary-search" />` back to back to let the reader compare them directly —
   note this reuses the `binary-search` viz id with zero new registry work.
3. **Concept** — an `## How it works` section (or similarly named) explaining the
   mechanism in prose, under the project's word budget (§7).
4. **Runnable example** — a `## Try it` section with one fenced, language-tagged code
   block, ≤ 30 lines. **This block is separate, hand-written prose** — it is not
   pulled from the viz's per-language samples in `apps/web/src/viz/code/`. The two
   happen to describe the same algorithm in the real lessons, but nothing keeps
   them in sync automatically; if you change one, check the other.
5. **Trade-offs** — a `## Trade-offs` section: when to use it, when not to, and what
   the practical alternative is.
6. **Quiz** — a `## Check your understanding` section, 2–3 numbered questions. Each
   question is a bold prompt followed by a bullet list of options, then a
   `<details><summary>Answer</summary>...</details>` block. The explanation must justify
   the correct answer **and** explicitly say why the plausible wrong ones are wrong —
   every real answer does this. Example, verbatim from `binary-search.mdx`:

   ```mdx
   2. **Why does binary search require a sorted array?**
      - It does not — it works on any array
      - Sorting lets each comparison rule out an entire half instead of one value
      - Sorting makes the array shorter
      - It only matters for arrays larger than 1000 elements

      <details>
      <summary>Answer</summary>

      Sorting lets each comparison rule out an entire half. On an unsorted
      array, a midpoint smaller than the target tells you nothing about which
      side the target is on, so the halving trick breaks down completely.
      Array length is unaffected by sorting, and the requirement holds at any
      size, not just large ones.
      </details>
   ```

7. **Practice** — a `## Practice` section, one sentence, one outbound Markdown link to
   a LeetCode or HackerRank problem. **Required by project convention** (see §7's
   copyright rule — `IMPLEMENTATION_PLAN.md` §5.4) even though no automated lint rule
   currently enforces its presence; all five real lessons include one. Example:
   `Try [Binary Search on LeetCode](https://leetcode.com/problems/binary-search/).`

## 4. Adding a visualization, end to end

This section walks through adding a new algorithm to an existing renderer
(`ArrayView`) — the only case that doesn't touch an existing file under `packages/`
(§0). Read `packages/viz-core/src/algorithms/binary-search.ts` alongside this section.

### 4.1 The model: `Frame`, `Mark`, `Target`

Source: `packages/viz-core/src/types.ts`.

```ts
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

A generator (`function*`) takes typed input and `yield`s one `Frame` per visual step.
`ArrayView` (`packages/viz-react/src/renderers/ArrayView.tsx`) supports `Target` kinds
`'index'` and `'range'`, and renders any `MarkKind` generically as a CSS class/tag — you
do not need to touch the renderer to use a new combination of existing mark kinds.

**Every frame must carry a non-empty `note`.** This is enforced for the algorithms
shipped in `packages/viz-core` by a conformance test suite
(`packages/viz-core/test/algorithms.conformance.test.ts` + `conformance.ts`,
`expect(f.note.trim().length).toBeGreaterThan(0)`), and it is also what the Player
displays as a live region for screen readers (`aria-live="polite"` in
`packages/viz-react/src/Player.tsx`). Writing this conformance test for your new
algorithm is optional (it lives under `packages/viz-core/test/`, a **new** file, so it
does not violate §0), but strongly recommended — it is exactly how the existing three
algorithms are proven correct, including proving `snap()` works (see next).

### 4.2 Why `snap()` matters

Source: `packages/viz-core/src/snap.ts`.

```ts
export function snap<S>(value: S): S {
  const copy = structuredClone(value);
  return freezeEnabled ? deepFreeze(copy) : copy;
}
```

Every real generator wraps `state` in `snap(...)` on every single `yield`:
`state: snap(arr)`, verified in `binary-search.ts`, `bubble-sort.ts`, and
`linear-search.ts` — never once is a bare array yielded.

**Why this matters, concretely:** a JS array or object is a reference. If a generator
sorts `arr` in place and yields the *same* `arr` reference at every step —

```ts
// DO NOT DO THIS
function* badGenerator({ arr }: Input) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = arr[i] * 2;
    yield { state: arr, note: `Doubled index ${i}.` }; // same object every time
  }
}
```

— then every `Frame.state` in the collected array is a pointer to the *one* array
object that keeps mutating. `collect()` (`packages/viz-core/src/collect.ts`) has
already run the whole generator to completion by the time the Player renders frame 1,
so **every frame you scrub to shows the final, fully-mutated state** — the array never
appears to change as you step through it. This presents to a learner (or a reviewer)
exactly like a rendering bug in `ArrayView` or `Player` — nothing there is broken; the
generator upstream just handed out one shared mutable object instead of a series of
snapshots. It's very hard to diagnose from the render side because the rendering code
is doing exactly what it's told with whatever `state` it's given.

`snap()` fixes this two ways: `structuredClone` makes each frame's `state` a genuinely
independent copy, and `deepFreeze` (when `freezeEnabled`, the default outside
production builds — see the comment in `snap.ts`, "Production builds may disable
freezing; correctness never depends on it") makes any accidental later mutation throw
immediately instead of silently corrupting a frame. Always wrap `state` in `snap(...)`
on every `yield`.

### 4.3 The `@anchor` convention

Source: `packages/viz-core/src/anchors.ts`.

```ts
const ANCHOR_RE = /\s*(?:\/\/|#)\s*@anchor\s+([A-Z][A-Z0-9_]*)\s*$/;
```

A `Frame.line` field (e.g. `line: 'MID'`) is **not a line number** — it names an anchor
that must be declared, once per language sample, as a trailing comment on the source
line it corresponds to:

```js
// js sample, from apps/web/src/viz/code/binary-search/js.ts
const mid = (lo + hi) >> 1;      // @anchor MID
```

```py
# py sample, same anchor name
mid = (lo + hi) // 2    # @anchor MID
```

Rules, verified from the regex and `parseAnchors`:

- The anchor id must start with an uppercase letter and contain only
  `[A-Z0-9_]` after that (`INIT`, `DISCARD_LEFT`, `NOT_FOUND` — all real examples).
  Lowercase ids are silently ignored as ordinary comments, not anchors.
- It must be the **last thing on the line** (`\s*$` — nothing may follow it).
- `parseAnchors` strips the anchor comment before displaying the code and records the
  **one-indexed line number** it was on; that's what the code panel highlights when the
  matching frame is active.
- Anchor ids must be unique **within one language sample**. A duplicate throws
  (`throw new Error(...duplicate anchor...)`) — and because `lint-content.ts` calls
  `parseAnchors` directly with no try/catch around it, a duplicate anchor **crashes
  `pnpm lint:content` with a raw stack trace**, not a clean `[rule]` message. Keep every
  anchor id unique per file.
- **A frame that emits an anchor some language sample doesn't declare fails the
  build.** This is lint rule `anchor-coverage` (§6) — it checks the anchor is present in
  *every* language key the viz's `code()` loader returns, not just the one displayed on
  the page today.

### 4.4 Writing the generator

Create one new file, e.g. `packages/viz-core/src/algorithms/insertion-sort.ts`,
following `binary-search.ts` as the template:

```ts
import { snap } from '../snap.js';
import type { Frame, VizAlgorithm } from '../types.js';

export interface InsertionSortInput { arr: number[] }

export const insertionSort: VizAlgorithm<InsertionSortInput, number[]> =
function* ({ arr: input }): Generator<Frame<number[]>> {
  const arr = [...input];   // never mutate the caller's array

  yield {
    state: snap(arr), line: 'INIT',
    note: `Sorting ${arr.length} values by inserting each into the sorted prefix.`,
  };

  // ...loop body, yielding a snap()'d frame with a real `note` and an
  // anchor `line` at every step you want the learner to see...

  yield {
    state: snap(arr), line: 'DONE',
    marks: [{ kind: 'done', at: { t: 'range', from: 0, to: arr.length - 1 } }],
    note: `Nothing left to insert — the array is sorted.`,
  };
};
```

No edit to `packages/viz-core/src/index.ts` or `package.json` is needed (§0) — the
wildcard export already covers this new file.

### 4.5 Per-language code samples

Create `apps/web/src/viz/code/insertion-sort/{js,py,c,index}.ts`, mirroring
`apps/web/src/viz/code/bubble-sort/`. Each language file exports the source as a
template string with `@anchor` comments matching every `line` your generator yields.
The `index.ts` aggregates them and **must supply all five `Lang` keys** — verified: the
`Lang` type (`apps/web/src/lib/langs.ts`) is `['c', 'cpp', 'java', 'py', 'js']`, and
`VizEntry['code']` is typed `() => Promise<{ default: Record<Lang, string> }>`, so
TypeScript requires all five keys even if your lesson's `languages` frontmatter only
lists three. The real pattern is to alias, not duplicate — verbatim from
`apps/web/src/viz/code/bubble-sort/index.ts`:

```ts
import c from './c.js';
import js from './js.js';
import py from './py.js';
export default { js, c, py, cpp: c, java: js };
```

(C++ reuses the C sample, Java reuses the JS sample — write three files, alias two
keys.) This also matters for lint rule `anchor-coverage` (§6): it checks *every* key of
this object, including the aliased ones, so if `js` is missing an anchor, both `js` and
`java` will fail.

**Note on what's actually shown today:** `apps/web/src/components/VizIsland.tsx` only
ever parses and displays `codeMod.default.js` — there is no language switcher in the UI
yet. Write correct, anchor-complete `py` and `c`/`cpp`/`java` samples anyway (lint
checks all of them), but know that a learner only ever sees the JS panel today.

### 4.6 Registering in `apps/web/src/viz/registry.ts`

Add one entry, keyed by the id your lesson's `viz:` frontmatter will reference.
Verbatim shape, from the real `binary-search` entry:

```ts
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
```

Field by field:

- `renderer` — `'ArrayView'`, `'TreeView'`, `'GraphView'`, `'TreeView3D'`,
  `'GraphView3D'`, or `'HierarchyView3D'`; the union in
  `apps/web/src/viz/types.ts` is what the type allows. Choosing between them is ordinary
  content work. **Writing a new one is still an engine change** (§0), and there are now
  two different shapes that change can take, depending on whether the renderer's
  dependencies are light or heavy:
  - **Lightweight renderer (the original pattern; use this unless you have a specific
    reason not to).** A new file in `packages/viz-react/src/renderers/`, statically
    imported at the top of `apps/web/src/components/VizIsland.tsx`, plus a name in the
    `renderer` union and an entry in `VizIsland.tsx`'s `RENDERERS` map. `Player` is
    generic over the state type and needs no change. This is what `ArrayView`,
    `TreeView`, and `GraphView` do, and it's the right choice as long as the renderer's
    dependencies are small — the whole `RENDERERS` map is bundled into every lesson page
    that uses `<Viz>`, so a heavy dependency here is a heavy dependency on all 27+ other
    lessons too, whether or not they use that renderer.
  - **Heavy-dependency renderer (new, added for `TreeView3D`; `GraphView3D` and
    `HierarchyView3D` now follow the same pattern).** All three live in the same
    workspace package, `packages/viz-3d`, wrapping
    `@react-three/fiber`/`@react-three/drei`/`three` — roughly 250KB+ gzipped, far more
    than every other renderer's dependencies combined. Statically importing that into
    `VizIsland.tsx` the same way as the lightweight renderers would ship Three.js to
    every lesson in the site, not just `data-structures/tree.mdx` and `algorithms/bfs.mdx`.
    Instead, `VizIsland.tsx` has a `loadRenderer(rendererName)` function that returns the
    lightweight `RENDERERS` map entry for every ordinary renderer name, but has a
    separate branch each for `'TreeView3D'`, `'GraphView3D'`, and `'HierarchyView3D'`
    that all return a
    *dynamic* `import('@cs/viz-3d')` (picking the matching named export off the module)
    — so the Three.js stack is only fetched when a viz entry actually names one of them.
    If your new renderer pulls in a comparably heavy
    dependency (a physics engine, another rendering library, anything past a rounding
    error on the bundle), follow this pattern: its own `packages/viz-<name>` package (or
    an existing heavy-dependency package if it shares one, as `GraphView3D` shares
    `packages/viz-3d` with `TreeView3D`), and
    a branch in `loadRenderer` rather than a static entry in `RENDERERS`. If it doesn't,
    use the lightweight pattern — it's simpler, and dynamic `import()` has its own cost
    (an extra network round-trip before the renderer appears) that isn't worth paying for
    a small dependency.
  - Either way, you only touch `viz-core` if your renderer needs a **new `Target`
    kind**, as `GraphView` did for edges — and that is deliberately noisy, because
    `Target` is a closed union and every existing renderer's exhaustiveness check will
    fail to compile until it decides what to do with the new kind.
  - **`ArrayView`** draws the state as a flat row of cells. Use it for anything
    positional: searches, sorts, windows, pointers, stacks and queues. Its state is
    `(number | null)[]`, where a `null` is a slot that exists but holds nothing and
    draws as an empty cell (dashed border, plus a visually-hidden "empty" for
    assistive tech). Most algorithms never emit one — an array being sorted is
    occupied everywhere — and plain `number[]` is assignable, so this costs existing
    generators nothing. Reach for it when *unoccupied* slots carry meaning, as in a
    hash table, where a linear probe stops at the first empty slot and the load factor
    is simply how full the table looks. Do not fake this with a sentinel number: a
    table of `-1`s renders as data, and `0` is a perfectly good key.
  - **`TreeView`** draws the *same* `number[]` as a binary tree, taking index *i*'s
    children to be 2*i*+1 and 2*i*+2. Because positions are still array indexes, your
    `Mark` targets need no new shape and your generator is unchanged — the only
    difference is how the state is drawn. It expects a complete tree; gaps have no
    representation.
  - **`TreeView3D`** draws that same complete-binary-tree-shaped `number[]` as a
    camera-controllable 3D scene (`@react-three/fiber` Canvas, orbit/zoom, a
    radial layout with deeper levels lower and wider) instead of `TreeView`'s nested
    DOM tree. Same state shape, same marks — swapping `TreeView` for `TreeView3D` in a
    registry entry's `renderer` field is a one-word change, same as `ArrayView`/`TreeView`.
    It carries its own accessible interaction (a visible, focusable "jump to node"
    button strip below the canvas, plus a live-region summary) because the WebGL canvas
    itself is `aria-hidden`. Used by two lessons — `data-structures/tree.mdx`
    (`tree-traversal` in the registry), which was the pilot, and
    `data-structures/bst.mdx` (`bst`), migrated after it; see
    `docs/superpowers/plans/2026-08-27-viz-3d-tree-pilot.md` before migrating another
    `TreeView` lesson to it.
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
  - **`GraphView3D`** draws that same `GraphState` — same `{ values, edges, directed? }`
    shape, same node/edge marks — as a camera-controllable 3D scene instead of
    `GraphView`'s adjacency list. Unlike `TreeView3D`'s radial layout (which can derive
    positions straight from each index's place in a complete binary tree), a graph's
    shape isn't implied by its indexes, so `GraphView3D` runs an actual force-directed
    physics simulation (`packages/viz-3d/src/graphLayout.ts`, via `d3-force-3d`) to
    settle node positions, then rescales the result to a fixed radius so any graph shape
    fits the shared camera regardless of node count — including a weak centering pull
    on every axis (`GRAVITY_STRENGTH`) added after `graph-intro`'s migration exposed
    that an edgeless node could otherwise drift far enough to make the rescale crush
    the rest of the graph together. Same state shape, same marks as `GraphView` —
    swapping `GraphView` for `GraphView3D` in a registry entry's `renderer` field is a
    one-word change, same as `TreeView`/`TreeView3D`. It carries the same kind of
    accessible interaction as `TreeView3D` (a visible, focusable "jump to node" button
    strip below the canvas, plus a live-region summary that includes each focused
    node's neighbours) because the WebGL canvas itself is `aria-hidden`. Used by
    `bfs`, `dfs`, `dijkstra`, and `graph-intro` (`algorithms/bfs.mdx`,
    `algorithms/dfs.mdx`, `algorithms/dijkstra.mdx`, `data-structures/graph.mdx`) —
    `bfs` was the pilot (undirected, unweighted); `dfs` was mechanical (identical
    graph shape to `bfs`); `dijkstra` was the first real exercise of the weighted-edge
    `<Text>` labels; `graph-intro` was the first real exercise of the directed
    toggle's arrowheads (only reachable via the input editor — its `defaultInput`
    ships `directed: false`) and, incidentally, of the layout bug above. See
    `docs/superpowers/plans/2026-08-28-graphview-3d-pilot.md` for the design
    reasoning behind all of this.
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
    numerically disproven as a fix **for that bounding-radius question specifically**;
    that disproof says nothing about the separate screen-projection problem below, where
    an angular scheme remains an unexplored lever rather than a ruled-out one).
    `HierarchyView3D` gets its own, larger `HIERARCHY_LAYOUT_RADIUS` (15, in
    `hierarchyLayout.ts`) and a proportionally pulled-back camera instead. Like its two
    siblings it carries its own accessible interaction — a visible, focusable "jump to
    node" button strip below the canvas plus a live-region summary naming each focused
    node's neighbours — because the WebGL canvas itself is `aria-hidden`. Used by
    `linked-list` and `trie` (`data-structures/linked-list.mdx`,
    `data-structures/trie.mdx`) — both needed their registry schemas tightened to fit
    legibly: `linked-list`'s `arr` (32 → 7 values, i.e. an 8-node chain once its
    generator splices in the inserted node) and `trie`'s per-word length (8 → 4
    characters, i.e. a 25-node worst case at its unchanged word-count cap of 6).

    Two *different* legibility constraints apply here, and it is worth keeping them
    apart. The first is 3D spacing — nodes crushing closer than the sphere diameter —
    which is what `HIERARCHY_LAYOUT_RADIUS` and `hierarchyLayout.test.ts` address. The
    second is **screen-space** separation: because the layout rescales any shape to a
    fixed radius and the camera is fixed too, a long chain can stay comfortably apart in
    3D while projecting to overlapping pixels, simply by lining up with the camera's
    view direction. 3D distance does not predict it, so
    `packages/viz-3d/src/hierarchyProjection.test.ts` measures it directly — projecting
    real layout output through a real `THREE.PerspectiveCamera` built from the
    component's exported `HIERARCHY_CAMERA_POSITION`/`HIERARCHY_CAMERA_FOV` and
    asserting a pixel gap between adjacent spheres. **If you change either camera
    constant, the layout radius, or one of these two lessons' input schemas, re-run that
    test** — it is the only thing checking the property a learner actually sees. It
    checks each lesson's actual current registry worst case (both parent/child pairs
    and, for `trie`'s branching shape, any two nodes at all — unrelated nodes crowding
    together is milder than connected ones overlapping, but still worth a lower bar,
    see the test file itself) — this is what caught `trie`'s schema needing the same
    kind of tightening `linked-list`'s already had. See
    `docs/superpowers/specs/2026-08-31-hierarchyview-3d-design.md`'s §5.1/§5.2
    "Superseded" notes for the full derivation and history before touching
    `hierarchyLayout.ts`'s constants or either lesson's schema again.
- `label` — a short string, used as the `aria-label` on the rendered `ArrayView` /
  `TreeView` and as the `<noscript>` fallback text in `Viz.astro`. Write something a
  screen-reader user or a JS-disabled reader can act on.
- `defaultInput` — the input the algorithm runs with when the page first renders and
  when lint checks it (§6, rule `frame-budget`). It is also what pre-fills the "Try your
  own input" editor (§4.7) and what **Reset** restores there, so pick one that's small
  enough to read at a glance but large enough to show the algorithm's interesting cases
  (e.g. binary search's `defaultInput` needs several halvings, not two elements).
- `inputSchema` — a Zod schema describing valid input shape. This *is* runtime-enforced:
  `VizIsland.tsx` calls `entry.inputSchema.safeParse(...)` on whatever JSON a learner
  types into the input editor before running it (§4.7). Get the bounds right — `.max(...)`
  on array length is what keeps a learner-supplied input inside your `maxFrames` budget
  (see the truncation note in §4.7). It's also what the optional conformance test's
  `fc.Arbitrary` should match.
- `maxFrames` (optional) — overrides the global `MAX_FRAMES = 1500`
  (`packages/viz-core/src/collect.ts`). `bubble-sort` sets `400` with the comment
  *"Quadratic — tighter than the global MAX_FRAMES budget."* — set a tighter cap for a
  quadratic-or-worse algorithm so that (a) the lesson stays fast and legible, and (b) if
  someone later grows `defaultInput` without noticing, lint rule `frame-budget` fails
  loudly instead of shipping a 1500-frame slog.
- `load` / `code` — dynamic imports, exactly as shown. Copy the shape, change the path.

### 4.7 The learner-editable input editor

Every `<Viz>` renders a collapsed `<details><summary>Try your own input</summary>...`
disclosure below the `Player` (`apps/web/src/components/VizIsland.tsx`) — collapsed by
default so it doesn't clutter the lesson, one click to open. Inside it: a `<textarea>`
pre-filled with `entry.defaultInput` as formatted JSON, a **Run** button, and a
**Reset** button.

**Run** parses the textarea as JSON and validates it with `entry.inputSchema.safeParse(...)`:

- On success, it re-runs `collect(algorithm(parsed), entry.maxFrames)` and the `Player`
  shows the new run from frame 0.
- On failure — a schema violation *or* malformed JSON, handled identically — it shows
  the message inline next to the textarea and leaves whatever was already on screen
  alone. It never throws and never blanks the visualization.

**Reset** restores the textarea to `entry.defaultInput` (re-serialized as JSON) and
re-runs the default.

This is why `inputSchema` matters beyond documentation: it is the only thing standing
between a learner's typed JSON and your generator. A schema that's too loose (e.g. no
`.max()` on an array driving a quadratic algorithm) lets a learner type an input that
blows straight through `maxFrames` — which is not a bug, exactly, since `collect()`
still caps it and `Player` still shows the *"stopped early"* truncation notice rather
than hanging, but it's a worse lesson than a schema that keeps the learner in a range
where they can watch the run finish.

Accessibility wiring, non-negotiable if you touch this component: the textarea has a
real `<label htmlFor>`, not a placeholder; the error message's `id` is written into the
textarea's `aria-describedby` whenever an error is showing, so assistive tech announces
*which* field the message is about; the error message itself is `role="alert"`, so it's
announced without the user having to go looking for it; and the error text carries a
leading "⚠" plus prose, not a colour change alone.

### 4.8 Picking `defaultInput` and `maxFrames` together

`lintContent` runs your generator on exactly `entry.defaultInput`, capped at
`entry.maxFrames ?? MAX_FRAMES`, via the same `collect()` the live site uses (§6, rule
`frame-budget`). So: choose `defaultInput` first for pedagogy (small enough to read,
large enough to be interesting), run it once in your head or with a quick script,
count roughly how many frames it produces, and only then decide whether the default
`1500` cap is fine or whether — like `bubble-sort` — you want a tighter `maxFrames` as
a tripwire for future edits.

**`defaultInput` is only the starting input, and rule `frame-budget` never looks past
it.** The "Try your own input" editor (§4.7) will run anything `inputSchema` accepts, so
the pair you actually have to get right is **`inputSchema` against `maxFrames`**, not
`defaultInput` against `maxFrames`. Work out your generator's *worst* case at the bound
your schema allows — for a quadratic algorithm emitting a frame per comparison, that is
usually reversed input — and make sure it fits. Tighten the schema rather than inflating
the cap: a run that completes at 16 elements teaches better than one that is cut off at
24, and `maxFrames` exists to keep lessons short.

This is enforced by `apps/web/src/viz/frame-budget.test.ts`, which searches every
entry's own schema for its worst case and fails if the run truncates — so you do not
have to remember to add your entry to anything. It exists because three of the
quadratic sorts shipped with this defect at once: at a 24-element bound, reversed input
needed 577 frames for `bubble-sort` and 600 for `insertion-sort` against a cap of 400,
stranding the learner mid-sort with the final frame — the one carrying the result —
never reached. Every gate had been green, because every gate only ever ran
`defaultInput`.

### 4.9 Making a Try it block runnable

By default a lesson's `## Try it` example is a plain fenced code block —
static, not automated by anything, and covered only by the "verify by hand"
line in the Definition of Done (§6). A lesson can opt in to an executable
version instead, the same way `<Viz>` opts a lesson into a visualization:

```mdx
import RunnableCode from '../../../components/RunnableCode.tsx';

## Try it

<RunnableCode lang="js" client:visible source={`function insertInto(arr, index, value) {
  ...
}

insertInto([4, 8, 15, 16, 23, 42], 1, 9);
`} />
```

**`client:visible` is required, not optional.** Astro server-renders a
React component used in MDX to static HTML and only hydrates it in the
browser when an explicit `client:*` directive is present — the same rule
`<Viz>` follows with `<VizIsland ... client:visible />`. Omit it and the
editor and Run/Reset buttons render but stay permanently inert: no error,
no console warning, just a "Try it" block that looks right and does
nothing. `client:visible` (rather than `client:load`) matches `<Viz>`'s
choice to defer hydration until the block scrolls into view.

`lang` is `"js"` today — the only language the runner
(`apps/web/src/lib/runner/`) supports; see
`docs/superpowers/specs/2026-08-24-code-runner-design.md` for the sandbox
design and its Python/Tier 2 seam. `source` is the initial editor content,
written as a template literal so multi-line code and embedded quotes need no
escaping — the one thing to avoid inside it is a literal `` ` `` or `${`,
either of which would end the template literal early.

**End the source with a call, not just a definition.** The runner shows
whichever of two things the *last top-level statement* produces:

- If it's a bare expression (e.g. `insertInto(...)` with no `console.log`
  wrapper), its value is shown as a `=>` line — use this when the function's
  return value is the point, as `array.mdx` does.
- If it's a `console.log(...)` call, its arguments are shown as output, in
  call order — use this when watching the *side effect* is the point, as
  `recursion.mdx` does with `console.log(factorial(5))`.

**`<RunnableCode>`'s source counts toward the 700-word prose limit.** Unlike
a triple-backtick fence, `lint-content`'s `prose-word-limit` rule (§5) has no
way to recognise a `source={...}` template literal as code — every word
inside it counts toward the lesson's budget. Budget for that when writing
the surrounding prose, and re-run `pnpm lint:content` after adding a
`<RunnableCode>` block, the same way you'd check any other content change.

**Accessibility, non-negotiable if you touch this component:** the output
panel is `role="status"` `aria-live="polite"` — the same "announce a result
without the user having to go looking for it" pattern the `Player` note
region and §4.7's input-editor error region already use.

**Learner code runs in strict mode.** The worker that runs it is an ES
module, and ES modules are always strict — so e.g. `x = 5` with no prior
declaration throws a `ReferenceError` instead of silently creating a global,
unlike a browser console's default (sloppy) mode. Write samples that declare
everything they assign to, or a correct-looking sample will error for a
learner who never sees why.

**Synchronous output only — nothing streams.** The runner captures whatever
`console.log`/`console.warn`/`console.error` calls and return value the
*synchronous* portion of the run produces; the worker is torn down the
moment that synchronous execution finishes. A `setTimeout` callback, or a
promise's `.then()`, that would log something afterward produces no visible
output at all — it fires, if at all, after the worker sandboxing it is
already gone. This matches the design spec's "no streaming output" decision
(§0); do not write a sample whose interesting output happens after the
initial run completes.

**Escaping a literal backslash inside `source={\`...\`}`.** `source` is a JS
template literal embedded in the MDX author's own source, so it goes through
two rounds of interpretation. A literal backslash meant for the *learner's*
code — e.g. writing `"a\nb"` so the learner's string contains a literal
backslash-n — must be written `\\n` in the sample. A single `\n` is consumed
by the *outer* template literal as an actual newline character before the
learner ever sees it, silently shipping different code than intended.

## 5. Running the gates

| Command | What it does | Needs a prior build? |
|---|---|---|
| `pnpm lint:content` | Runs `scripts/lint-content.ts` — the eight content rules below. | No |
| `pnpm typecheck` | `tsc -b` across all packages, then `astro check` inside `apps/web` (validates frontmatter against the Zod schema, JSX, etc.). | No |
| `pnpm test` | `vitest run` — all unit/conformance tests across `packages/` and `apps/web`. | No |
| `pnpm build` | `pnpm --filter web build` — the real Astro/Starlight production build, to `apps/web/dist`. | — |
| `pnpm check:offline` | Runs `scripts/check-offline.ts`, which scans `apps/web/dist/**/*.{html,css}` for any external (`http(s)://` or protocol-relative `//`) asset reference. | **Yes — run `pnpm build` first**, or it will find nothing to scan (or fail on a missing/stale `dist`). |
| `pnpm test:e2e` | Playwright against the real built site: axe (wcag2a/wcag2aa) in both colour schemes, no horizontal scroll at 360px, a 0.1 layout-shift budget, no-JS rendering, and the homepage links. | **Yes — it serves `apps/web/dist`.** |

Run them in this order during authoring: `lint:content` (fastest feedback on content
mistakes) → `typecheck` → `test` → `build` → `check:offline` → `test:e2e`.

All of them run in CI (`.github/workflows/ci.yml`) in that same order.

### The eight `lint:content` rules

Source: `scripts/lint-content.ts`. Each rule's real error format is
`[rule-name] <file>: <message>`.

1. **`dsa-requires-viz`** — a lesson under `algorithms/`, `data-structures/`, or
   `complexity/` has no `viz` in its frontmatter.
   Real message (captured against a fixture): `` [dsa-requires-viz] algorithms/lesson.mdx: DSA lessons must declare a viz. Add "viz: <id>" to the frontmatter. ``
   **Fix:** add `viz: <id>` naming a real entry in `apps/web/src/viz/registry.ts`, or
   move the file out of a DSA-prefixed directory if it genuinely isn't a DSA lesson.

2. **`prerequisite-exists`** — a `prerequisites` entry doesn't match any lesson's
   derived slug (§1).
   Message shape: `Prerequisite "<slug>" does not match any lesson slug.`
   **Fix:** point at a real slug, e.g. `/algorithms/binary-search`. Check spelling and
   the leading slash.

3. **`prose-word-limit`** — prose body (frontmatter and fenced code blocks excluded)
   exceeds 700 words. **`template: splash` is exempt, and only it** — that is the site
   landing page, whose length tracks how many lessons exist rather than how much anyone
   wrote (every lesson adds a `<Card>`), and whose body is mostly JSX the counter scores
   as words. It hit 700 exactly at the 23rd lesson, so the 24th failed the build on a page
   whose prose it had not touched. Your lesson has no `template`, so the limit applies to
   it in full.
   Real message (captured): `Prose is 750 words; the limit is 700 (code blocks excluded).`
   **Fix:** cut prose. Code inside triple-backtick fences never counts, so moving prose
   into a comment inside a code block to dodge the count is visible and against the
   spirit of the rule — just write less.

4. **`code-block-language`** — a fenced code block opens with bare ` ``` ` and no
   language tag.
   Real message: `A fenced code block does not declare its language.`
   **Fix:** tag every fence, e.g. ` ```js ` or ` ```py `.

5. **`viz-id-exists`** — the `viz` frontmatter value isn't a key in
   `apps/web/src/viz/registry.ts`.
   Real message (captured): `viz "totally-unknown-viz-id" is not in src/viz/registry.ts.`
   **Fix:** fix the typo, or add the registry entry (§4.6) before referencing it.

6. **`anchor-coverage`** — a frame your generator yields on `defaultInput` names an
   anchor (`line: 'X'`) that some language sample in the registry's `code()` doesn't
   declare.
   Message shape: `viz "<id>" emits anchor <ANCHOR>, but the <lang> sample does not define it. Add "// @anchor <ANCHOR>".`
   **Fix:** add the missing `// @anchor <ANCHOR>` (or `# @anchor <ANCHOR>` for Python)
   to the end of the corresponding line in that language's sample file. Check every
   aliased key too (§4.5) — `cpp`/`java` fail exactly when the file they're aliased to
   fails.

7. **`frame-budget`** — running the generator on its own `defaultInput` hits the frame
   cap (`maxFrames`, or the global 1500) before the generator finishes.
   Message shape: `viz "<id>" exceeds its frame budget on its own defaultInput. Lower defaultInput size or raise maxFrames.`
   **Fix:** shrink `defaultInput` (fewer elements), raise `maxFrames` in the registry
   entry if the extra length is genuinely pedagogically valuable, or — if the generator
   never terminates — fix the generator; that's a real bug, not a budget problem.

8. **`code-line-length`** — a line inside a fenced code block is wider than 68
   characters.
   Real message (captured): `Code line 53 is 84 characters; the limit is 68. Longer lines make the rendered <pre> scroll sideways, which fails axe's scrollable-region-focusable (wcag2a). Split the line.`
   **Fix:** split the statement across lines, or shorten names. The limit is measured,
   not chosen by taste: Expressive Code renders each fence as a `<pre>` 630px wide in
   the content column at the e2e suite's 1280px viewport, in a font whose character
   advance is 8.64px — so 72 characters fit and the 73rd makes the block scroll
   sideways, which axe fails as a scroll region no keyboard can reach. 68 leaves margin
   for the fallback font's different metrics. The derivation is in `lint-content.ts`
   next to the constant; re-derive it rather than nudging it if the column or the code
   font ever changes. This rule exists because `pnpm test:e2e` catches the same defect
   **only intermittently** — see §7.

## 6. Definition of Done

Copy this into the pull request description (from `IMPLEMENTATION_PLAN.md` §12,
cross-checked against what the tooling actually enforces — items marked "not
automated" have no lint/test/CI check today and are your responsibility to verify by
hand):

```markdown
- [ ] Frontmatter is complete; `estimatedMinutes` is ≤ 12
- [ ] Prose content is ≤ 700 words (code blocks excluded) — `pnpm lint:content`
- [ ] Lesson added to `ALL_LESSONS` in `apps/web/e2e/lesson.spec.ts` and linked
      from the homepage grid (§1) — `pnpm test:e2e`
- [ ] At least one interactive visualization is present, with its "Try your own
      input" editor working — not automated for content PRs (it's covered by
      `apps/web/src/components/VizIsland.test.tsx` at the engine level; verify by hand
      that your lesson's `<Viz>` renders and its editor accepts/validates input — see
      AUTHORING.md §4.7)
- [ ] A runnable code example exists, ≤ 30 lines (not automated — verify by hand)
- [ ] 2–3 quiz questions, each with an explanation that also addresses the wrong
      answers (not automated — verify by hand)
- [ ] `prerequisites` resolve to real slugs — `pnpm lint:content`
- [ ] The page is readable with JavaScript off — `pnpm test:e2e`
- [ ] No accessibility violations (axe wcag2a/wcag2aa), in both the default and
      dark colour schemes — `pnpm test:e2e`
- [ ] No external URLs in assets — `pnpm check:offline` (after `pnpm build`)
- [ ] Reads well on a 360px-wide screen: no horizontal page scroll — `pnpm test:e2e`
- [ ] The page does not shift layout as the visualization hydrates (CLS < 0.1) —
      `pnpm test:e2e`
- [ ] `pnpm lint:content`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
      `pnpm check:offline`, `pnpm test:e2e` all exit 0
```

Three items that earlier versions of this guide listed as "verify by hand" — no-JS
readability, 360px, and accessibility — are now mechanically enforced by the Playwright
suite, **provided you completed the `ALL_LESSONS` step in §1.** That proviso is the
whole catch: the checks are per-lesson, so a lesson missing from that array passes CI
without ever being examined.

## 7. Constraints that bite

- **700-word prose limit, code excluded.** `stripCodeBlocks` in `lint-content.ts`
  removes everything between triple backticks before counting — write as much runnable
  code as you need, it's free; prose is the budget.
- **Every fenced code block must declare a language.** Bare ` ``` ` fails rule
  `code-block-language` (§6) even for a block you don't intend to be "real code" (e.g.
  sample terminal output) — tag it (`text`, `bash`, whatever fits) rather than leaving
  it bare.
- **Fenced code lines are capped at 68 characters** by rule `code-line-length` (§6).
  The cap guards a rendering property, not a style: a longer line makes Expressive
  Code's `<pre>` scroll sideways, which axe fails as a scroll region no keyboard can
  reach. Worth knowing *why* it is a lint rule rather than left to the e2e suite — the
  Dijkstra lesson shipped an 84-character line and `pnpm test:e2e` caught it **only
  intermittently**, because whether the block overflows depends on whether the web font
  has loaded by the time axe runs. The same commit passed and failed on consecutive
  runs. So: do not read one green e2e run as proof of anything here, and if
  `lint:content` flags a line, split it rather than re-running the suite until it goes
  quiet. (The `<pre>` inside the *code panel* is a different element and is already
  focusable — see `docs/PHASE0-EXIT.md`. This rule is only about the ` ``` ` blocks in
  your `.mdx`.)
- **`prerequisites` must resolve to real slugs**, derived exactly as in §1 — a typo or
  a not-yet-written lesson both fail the build the same way.
- **No external asset references** — `check:offline` scans built HTML/CSS for any
  `http(s)://` or protocol-relative `//` reference in `<link href>`, `<img/script/
  source/video/audio src>`, CSS `url(...)`, and `srcset`. Self-host everything: images,
  fonts, scripts.
- **Outbound LeetCode/HackerRank prose links are the opposite — they are required, not
  forbidden.** `scripts/check-offline.ts` explicitly does *not* scan `<a href>` prose
  links (comment in the source: *"Prose anchors are deliberately ignored:
  IMPLEMENTATION_PLAN.md §5.4 requires outbound practice links."*). Every lesson ends
  with a `## Practice` section linking out to the matching problem (§3).
- **Never copy problem statements, testcases, or solutions from LeetCode/HackerRank.**
  That content is copyrighted (`IMPLEMENTATION_PLAN.md` §5.4). Write your own
  explanation of the classic problem in your own words — the algorithm is common
  knowledge, the exact wording of a specific site's problem page is not — and
  generate your own test cases if you need any. Link out for the reader to practice
  against the real thing instead of reproducing it.

## 8. Quick recap: how the five real lessons satisfy all of the above

| | `binary-search` | `bubble-sort` | `insertion-sort` | `linear-search` | `big-o` |
|---|---|---|---|---|---|
| Directory | `algorithms/` | `algorithms/` | `algorithms/` | `algorithms/` | `complexity/` |
| `viz` | `binary-search` | `bubble-sort` | `insertion-sort` | `linear-search` | `linear-search` (+ reuses `binary-search`) |
| Renderer | `ArrayView` | `ArrayView` | `ArrayView` | `ArrayView` | `ArrayView` (via the two vizzes it embeds) |
| `maxFrames` | default (1500) | `400` (quadratic) | `400` (quadratic) | default (1500) | n/a (embeds the other two) |
| `prerequisites` | `[]` | `[]` | `[/algorithms/bubble-sort]` | `[]` | `[/algorithms/binary-search]` |
| New generator? | yes | yes | yes | **no — reused** | no — embeds two |
| Languages with anchor samples | js, py, c (+ cpp/java aliased) | js, py, c (+ cpp/java aliased) | js, py, c (+ cpp/java aliased) | js, py, c (reused) | js, py, c (reused from the embedded vizzes) |

Two of these are worth studying for what they *avoid* doing:

- **`linear-search`** adds no generator, no code samples, and no registry entry — it is
  one `.mdx` file pointed at a `viz` id that already existed for `big-o`. If a lesson
  you want to write is already visualized somewhere else, this is the cheapest shape a
  lesson can take.
- **`insertion-sort`** was written from this guide alone, with no other context, as the
  test of whether the guide is complete. It is the closest thing here to a worked
  example of the full "new generator + samples + registry + lesson" path.
