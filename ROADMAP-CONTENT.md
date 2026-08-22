# Phase 1 content roadmap

This is the candidate lesson backlog for Phase 1 ("DSA + Code Runner",
`IMPLEMENTATION_PLAN.md` §11), derived from the topics that plan names explicitly. It is
a **fixed, numbered list of concrete lessons**, not a quota — see "On the total count"
below for why no target number is given.

Every row not marked `done` is a plan, not a commitment: it may be split into more than
one lesson, merged with a neighbor, or cut, once real authoring cost is known (see
below). `slug` is the intended `apps/web/src/content/docs/...` path (§1 of
`docs/AUTHORING.md`); `order` follows the numbering convention in
`IMPLEMENTATION_PLAN.md` §5.1 (steps of 10 between top-level groups, incrementing by 1
within a group, matching the real values already used by the shipped lessons; it drives
the rendered sidebar position, so see `docs/AUTHORING.md` §1 before picking one).
`renderer needed` names the `packages/viz-react` renderer the lesson
depends on; `ArrayView`, `TreeView` and `GraphView` exist today (see `docs/AUTHORING.md` §4.6) — every other
renderer column value is an **engine change**, not a routine content addition, and must
be scoped and reported as such before work starts, not discovered mid-PR.

## The measurement (Task 20, step 5) — and why it does not set the count

Insertion sort (row 12) was built as the fourth-lesson test on 2026-08-19,
working only from `docs/AUTHORING.md`. **Elapsed authoring time: 3 minutes 36
seconds.**

**Do not set Phase 1's lesson count from that number.** The plan asks how long
*one person* takes; this run was executed by an AI agent, and 3m36s is a
measurement of the agent, not of the human authoring cost the schedule depends
on. Treat it as an upper bound on how much *the documentation* gets in the way,
not as a per-lesson cost. What it does establish, and what is genuinely
reusable:

- `docs/AUTHORING.md` is sufficient on its own. No step required reading the
  implementation plan or reverse-engineering the engine.
- The §0 promise held for content: the lesson needed **no edit to any file that
  already existed under `packages/`**. It added a generator, a conformance test,
  three language samples, a registry entry, and the lesson — all new files.
- The prose budget is the real constraint. The first draft came in at 757 words
  against a 700-word limit and took two trimming passes. Budget for that.

**Until a human runs the same test, Phase 1's count stays unset.** The
`IMPLEMENTATION_PLAN.md` §14 guess of ~35 lessons is neither confirmed nor
refuted by this run. Re-run the test with a human author before committing to a
number; the rows below stay backlog until then.

### Engine gaps the test surfaced

The lesson itself needed no engine change, but exercising it end to end exposed
four pre-existing defects that affected **all three previously shipped
lessons** and that no gate caught. All four are fixed, each with the check that
would have caught it — the fourth is described separately below:

1. **The code panel had no CSS.** Its `white-space: pre` content pushed the
   whole document sideways at 360px (110px of overflow on bubble sort),
   violating the Definition of Done's 360px item. Fixed by confining the scroll
   to the panel; the panel is now focusable, since a scroll region that cannot
   be reached by keyboard is a WCAG 2.1.1 failure.
2. **Run/Reset did not restart the player.** A learner who stepped forward and
   then ran new input landed mid-run in a run they never saw start —
   contradicting `docs/AUTHORING.md` §4.7, which documents frame 0.
3. **The visualization island shifted the page by 0.307 CLS** on hydration,
   costing ~15 Lighthouse performance points (79 → 97 once fixed).

The gate now includes Playwright coverage for every shipped lesson: axe
(wcag2a/wcag2aa), no horizontal scroll at 360px, and a 0.1 CLS budget. Adding a
new lesson to that list is a required authoring step — see `docs/AUTHORING.md` §1.

### A fourth gap, found and fixed: the site was unreadable in dark mode

With `prefers-color-scheme: dark`, Starlight switched its text to white while
`apps/web/src/styles/tokens.css` pinned the background to the light `--paper`
(#F7F5F0). Headings, `<summary>` elements, pagination links and inline `<code>`
rendered at contrast ratios of 1.08–1.61 against WCAG AA's required 4.5 — on
every page, with JavaScript on or off, since Starlight hardcodes
`data-theme="dark"` into the static HTML.

Resolved by committing to the single light "Trace" palette that
`IMPLEMENTATION_PLAN.md` §8 actually specifies: `tokens.css` now forces
Starlight's light values regardless of `data-theme`, Expressive Code is pinned
to one light code theme, and the theme switcher is removed rather than left as
a control that changes nothing. Lighthouse Accessibility went 97 → 100.

The gate gained a dark-scheme axe run over every lesson, which is the check
whose absence hid this: the other axe runs use Chromium's default light scheme.

## On the total count

`IMPLEMENTATION_PLAN.md` §14 guesses "~35 lessons" for Phase 1 before a single lesson
had been authored end to end. §13 of the same plan names this its own top risk:
*"content is the bottleneck, not code... 40 excellent lessons beat 200 mediocre ones."*
This roadmap deliberately does not restate a target total. Task 20 measures how long
one person, working only from `docs/AUTHORING.md` and forbidden from touching
`packages/`, takes to ship a fourth lesson (insertion sort) reusing the existing
`ArrayView` renderer. That measured per-lesson cost — not a guess made before any
lesson existed — is what sets how many rows below this project can actually afford to
ship in Phase 1.

That test has now been **run, but by an agent rather than a person** (see "The
measurement" above), so the human per-lesson cost the schedule needs is still
unknown. Until it lands, treat every `planned` row as backlog, not a promise.

## Shipped

| # | Slug | Title | `order` | Renderer | Viz id | Status |
|---|---|---|---|---|---|---|
| 0a | `/algorithms/binary-search` | Binary Search | 220 | ArrayView | `binary-search` | done |
| 0b | `/algorithms/bubble-sort` | Bubble Sort | 221 | ArrayView | `bubble-sort` | done |
| 0c | `/complexity/big-o` | How Fast Is Fast? | 230 | ArrayView | `linear-search` (+ reuses `binary-search`) | done |
| 12 | `/algorithms/insertion-sort` | Insertion Sort | 223 | ArrayView | `insertion-sort` | done |
| 4 | `/algorithms/linear-search` | Linear Search | 226 | ArrayView | `linear-search` | done |
| 21 | `/algorithms/two-pointer` | Two-Pointer Technique | 234 | ArrayView | `two-pointer` | done |
| 22 | `/algorithms/sliding-window` | Sliding Window | 235 | ArrayView | `sliding-window` | done |
| 1 | `/data-structures/array` | Arrays | 210 | ArrayView | `array-basics` | done |
| 3 | `/data-structures/stack` | Stacks | 212 | ArrayView | `stack` | done |
| 4 | `/data-structures/queue` | Queues | 213 | ArrayView | `queue` | done |
| 8 | `/data-structures/heap` | Heaps | 217 | ArrayView | `heap` | done |
| 13 | `/algorithms/merge-sort` | Merge Sort | 224 | ArrayView | `merge-sort` | done |
| 14 | `/algorithms/quick-sort` | Quick Sort | 225 | ArrayView | `quick-sort` | done |
| 23 | `/complexity/amortized-analysis` | Amortized Analysis | 236 | ArrayView | `amortized-growth` | done |
| 19 | `/algorithms/greedy` | Greedy Algorithms | 232 | ArrayView | `greedy-coins` | done |
| 11 | `/algorithms/selection-sort` | Selection Sort | 222 | ArrayView | `selection-sort` | done |
| 6 | `/data-structures/tree` | Trees | 215 | **TreeView** | `tree-traversal` | done |
| 7 | `/data-structures/bst` | Binary Search Trees | 216 | TreeView | `bst` | done |
| 16 | `/algorithms/bfs` | Breadth-First Search | 228 | **GraphView** | `bfs` | done |
| 17 | `/algorithms/dfs` | Depth-First Search | 229 | GraphView | `dfs` | done |
| 9 | `/data-structures/graph` | Graphs | 218 | GraphView | `graph-intro` | done |
| 18 | `/algorithms/dijkstra` | Dijkstra's Algorithm | 231 | GraphView (weighted) | `dijkstra` | done |

Linear Search (row 4) reuses the `linear-search` viz that `/complexity/big-o` already
embeds — no new generator, code samples, or registry entry were needed, only the lesson
prose. Its `defaultInput` is deliberately left **sorted**, because the same registry
entry drives the Big-O race against binary search, where sortedness is the whole point.
The lesson turns that into a teaching note and sends the reader to the input editor to
try an unsorted array instead of forking the entry.

Dijkstra (row 18) confirms the "content only" call this document made for it: `GraphView`
already rendered `GraphEdge.weight` when present, so the lesson needed a generator, samples,
a registry entry and prose — and **no edit to any existing file under `packages/`** (§0 of
`docs/AUTHORING.md`). It reuses the six-node graph the `bfs` and `dfs` entries use, now
weighted, with one deliberately expensive direct edge 0—4: BFS calls node 4 one step away,
Dijkstra finds a three-edge route costing less. That disagreement is the lesson, and a
conformance test pins it so prose and generator cannot drift apart. The `dijkstra` entry is
also the first `inputSchema` to enforce a *precondition of the algorithm* rather than a
shape — non-negative weights — which is what lets the prose claim the editor rejects them.

Selection sort (row 11) surfaced a gap in what `frame-budget` actually protects. That
lint rule only ever runs a viz on its own `defaultInput`, so it says nothing about the
inputs the "Try your own input" editor will accept. This generator emits a frame per
comparison *and* one per new minimum, so at the 24-element bound its siblings use, a
reversed array needs 468 frames against a `maxFrames` of 400 — the run gets cut off
before `DONE`, which is the frame carrying the final swap count the whole lesson is
built on. Fixed by tightening `inputSchema` to 16 (`docs/AUTHORING.md` §4.6 is explicit
that the schema bound, not the cap, is what keeps learner input inside the budget), with
a test asserting no schema-valid input truncates. That test was mutation-checked: put the
bound back to 24 and it fails.

**The same latent problem exists in `bubble-sort`, and is deliberately not fixed here.**
Reversed input at its 24-element bound needs 577 frames against the same 400 cap. It is a
one-line schema change, but it alters a shipped lesson's behaviour and belongs in its own
change rather than being smuggled into a new lesson's PR.

Dijkstra also surfaced one authoring trap, now written up in `docs/AUTHORING.md` §7: a fenced
code line of 84 characters made Expressive Code's `<pre>` horizontally scrollable, failing
axe's `scrollable-region-focusable` (wcag2a) — **intermittently**, because overflow depends
on whether the web font has loaded when axe runs. The same commit passed and failed
`pnpm test:e2e` on consecutive runs. The fix was content-side (split the line; the longest
is now 60 characters, against 63 for the next-longest lesson). **The flaky gate was the
real finding**, though, and it is now closed: `scripts/lint-content.ts` grew an eighth
rule, `code-line-length`, capping fenced lines at 68 characters. The cap is measured
rather than chosen — the rendered `<pre>` is 630px at a character advance of 8.64px, so
72 fit — and the derivation sits beside the constant so a future layout change can
re-derive it. Authors now get a deterministic failure naming the line, instead of an
axe violation that appears on some runs and not others.

## Data Structures (`data-structures/` — sidebar group now exists in `astro.config.mjs`)

| # | Slug | Title | `order` | Renderer needed | Viz id | Status |
|---|---|---|---|---|---|---|
| 1 | `/data-structures/array` | Arrays | 210 | ArrayView | `array-basics` | **done** (see Shipped) |
| 2 | `/data-structures/linked-list` | Linked Lists | 211 | **LinkedList** (new) | `linked-list` | planned — engine change |
| 3 | `/data-structures/stack` | Stacks | 212 | ArrayView | `stack` | **done** (see Shipped) |
| 4 | `/data-structures/queue` | Queues | 213 | ArrayView | `queue` | **done** (see Shipped) |
| 5 | `/data-structures/hash-table` | Hash Tables | 214 | ArrayView (buckets as array slots)† | `hash-table` | planned |
| 6 | `/data-structures/tree` | Trees | 215 | TreeView | `tree-traversal` | **done** (see Shipped) |
| 7 | `/data-structures/bst` | Binary Search Trees | 216 | TreeView | `bst` | **done** (see Shipped) |
| 8 | `/data-structures/heap` | Heaps | 217 | ArrayView (array-backed binary heap) | `heap` | **done** (see Shipped) |
| 9 | `/data-structures/graph` | Graphs | 218 | GraphView | `graph-intro` | **done** (see Shipped) |
| 10 | `/data-structures/trie` | Tries | 219 | TreeView†, but see the note | `trie` | planned — needs a decision |

## Algorithms (`algorithms/`)

| # | Slug | Title | `order` | Renderer needed | Viz id | Status |
|---|---|---|---|---|---|---|
| 11 | `/algorithms/selection-sort` | Selection Sort | 222 | ArrayView | `selection-sort` | **done** (see Shipped) |
| 12 | `/algorithms/insertion-sort` | Insertion Sort | 223 | ArrayView | `insertion-sort` | **done** — was Task 20's fourth-lesson test (see Shipped) |
| 13 | `/algorithms/merge-sort` | Merge Sort | 224 | ArrayView | `merge-sort` | **done** (see Shipped) |
| 14 | `/algorithms/quick-sort` | Quick Sort | 225 | ArrayView | `quick-sort` | **done** (see Shipped) |
| 4 | `/algorithms/linear-search` | Linear Search | 226 | ArrayView (viz already registered — see Shipped) | `linear-search` | **done** (see Shipped) |
| 15 | `/algorithms/recursion` | Recursion Basics | 227 | **StackFrame** (new) | `recursion-intro` | planned — engine change |
| 16 | `/algorithms/bfs` | Breadth-First Search | 228 | GraphView | `bfs` | **done** (see Shipped) |
| 17 | `/algorithms/dfs` | Depth-First Search | 229 | GraphView | `dfs` | **done** (see Shipped) |
| 18 | `/algorithms/dijkstra` | Dijkstra's Algorithm | 231 | GraphView (weights supported) | `dijkstra` | **done** (see Shipped) |
| 19 | `/algorithms/greedy` | Greedy Algorithms | 232 | ArrayView | `greedy-coins` | **done** (see Shipped) |
| 20 | `/algorithms/dynamic-programming` | Dynamic Programming Basics | 233 | **Matrix2D** (new) | `dp-intro` | planned — engine change |
| 21 | `/algorithms/two-pointer` | Two-Pointer Technique | 234 | ArrayView | `two-pointer` | **done** (see Shipped) |
| 22 | `/algorithms/sliding-window` | Sliding Window | 235 | ArrayView | `sliding-window` | **done** (see Shipped) |

## Complexity (`complexity/`)

| # | Slug | Title | `order` | Renderer needed | Viz id | Status |
|---|---|---|---|---|---|---|
| 0c | `/complexity/big-o` | How Fast Is Fast? | 230 | ArrayView | `linear-search` + `binary-search` | **done** (see Shipped) |
| 23 | `/complexity/amortized-analysis` | Amortized Analysis | 236 | ArrayView | `amortized-growth` | **done** (see Shipped) |
| 24 | `/complexity/best-average-worst-case` | Best, Average, and Worst Case | 237‡ | ArrayView (reuse existing search/sort vizzes) | reuse (e.g. `linear-search`) | planned |

† Inferred, not named explicitly in `IMPLEMENTATION_PLAN.md`: the plan lists `hash
table` and `trie` as Data Structures topics (§11) without specifying a renderer for
either. `ArrayView` for hash tables and `Tree` for tries are this document's
recommendation, not a verified decision — confirm before building the generator.

‡ `IMPLEMENTATION_PLAN.md` §11 gives Complexity a rough total of "3 lessons" but names
only two topics (Big-O, amortized analysis). Row 24 is this document's proposal for the
third slot, not a plan citation — revisit before committing to it.

## Status legend

- **done** — shipped, lint-passing, in `apps/web/src/content/docs`.
- **planned** — no engine change required; a content PR following `docs/AUTHORING.md`
  §0–§7 end to end is sufficient.
- **planned — engine change** — requires a new `packages/viz-react` renderer (or a
  `packages/viz-core` model change) before any lesson using it can be written. Report
  and scope separately; do not fold into a content PR (`docs/AUTHORING.md` §0).
