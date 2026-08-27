# Code Runner (Tier 1 — Browser JS): Design Spec

> Companion to `IMPLEMENTATION_PLAN.md` §6 ("Code Runner"), which remains the
> strategy document. This spec decides what gets built now, in what shape, and
> how it's verified.
> 2026-08-24

---

## 0. Scope of this document

`IMPLEMENTATION_PLAN.md` §6 describes two tiers: **Tier 1** (browser-native
execution for the "Run" affordance on a lesson's own example) and **Tier 2**
(Judge0, for grading submitted practice problems). This spec covers **Tier 1,
JavaScript only**.

**Out of scope, deliberately:**

- **Pyodide / Python execution.** Every one of the 28 shipped lessons' `## Try
  it` blocks is JavaScript — none are Python (verified by scanning every
  lesson file before this spec was written). Building and self-hosting a WASM
  Python runtime for zero current consumers is premature. The runner's
  interface (§3) is shaped so a Pyodide-backed implementation can be added
  later without changing any lesson-facing code, but no Pyodide asset is
  fetched, bundled, or referenced by this work.
- **Judge0 / Tier 2.** Blocked on Docker + a WSL2 Linux distro being set up on
  the development machine, which needs the machine owner's authorization (see
  `docs/spikes/2026-08-judge0-wsl2.md`). Entirely separate piece of work.
- **The Problem page, `content-problems/`, and the progress store.** None of
  these exist yet and none are needed for a lesson's `## Try it` block to run.
- **Migrating all 28 lessons.** This plan wires the runner into **two pilot
  lessons** (§6) to prove the pattern end-to-end, mirrors the methodology
  Phase 0 used for the viz engine (build it, prove it on real lessons,
  document the pattern, treat the rest as a mechanical follow-up — see
  `docs/PHASE0-EXIT.md` §1). Migrating the remaining 26 lessons is a separate,
  later, mostly-mechanical task, not part of this plan.
- **Streaming console output during a run.** Output is buffered in the worker
  and delivered once, on completion or timeout. A run that times out shows no
  partial output. Noted as a known, deliberate v1 limitation, not a gap
  discovered later.

---

## 1. Package location

`IMPLEMENTATION_PLAN.md` §3 names `packages/runner/` as a workspace package.
Phase 0 already deviated from that for the Judge0 client: it built
`apps/web/src/lib/judge/` instead — a plain lib folder — since there is one
app and no cross-app sharing need (`getJudge()` in that folder's `index.ts`
is the deliberate seam for swapping the mock for a real client later, without
a caller changing). This spec follows that precedent rather than the
original plan's literal layout:

```
apps/web/src/lib/runner/
  index.ts          # public API: runJs(source) -> Promise<RunResult>
  worker.ts          # the actual Worker entry point (built source, capture, eval)
  protocol.ts        # RunRequest / RunResult message shapes, shared by both sides
  sandbox.ts          # pure, directly-testable wrapping/capture logic (no Worker API)
  sandbox.test.ts
  index.test.ts       # exercises runJs() against a real Worker (jsdom-permitting) or is skipped there — see §7
```

If a second app ever needs this, promoting it to `packages/runner/` is a
mechanical move (same pattern Phase 0 already established for `viz-core` and
`viz-react`); doing that pre-emptively now would be speculative.

---

## 2. Execution sandbox

### 2.1 Why a Web Worker, non-negotiably

JavaScript is single-threaded. Code run via `eval`/`new Function` on the main
thread cannot be externally interrupted — an infinite loop freezes the tab,
full stop, and no timeout mechanism on the main thread can preempt it (a
`setTimeout` callback never fires while a synchronous loop is still running).
A separate `Worker` is the only construct that can be `.terminate()`d from
outside itself. This is not a style preference; it is the actual mechanism
that makes "Run untrusted-by-the-runner learner code with a hard timeout"
possible at all in a browser. `IMPLEMENTATION_PLAN.md` §6.1 already specifies
"Web Worker + timeout 3s" for exactly this reason.

### 2.2 Protocol

```ts
// apps/web/src/lib/runner/protocol.ts
export interface RunRequest {
  source: string;
}

export interface RunResult {
  /** Buffered console.log/warn/error calls, in call order, stringified. */
  output: string[];
  /** The last top-level expression's value, JSON-stringified, if any. */
  returnValue?: string;
  /** Present when the run threw, was a syntax error, or the run itself failed. */
  error?: string;
  /** True if the run was killed by the 3s timeout. */
  timedOut: boolean;
}
```

A fresh `Worker` is spawned **per run**, not reused across runs. A worker
that gets `.terminate()`d for a timeout is a worker whose internal state (any
half-finished loop, any global it polluted) can never be trusted for a
second run — spawning fresh is simpler and safer than trying to prove a
terminated worker's state is clean.

### 2.3 `sandbox.ts` — the directly-testable core

The logic that wraps source to capture `console.*` and extract a return value
is a **pure function**, independent of the `Worker` global, so it can be unit
tested directly in Node/vitest without spinning up a real worker:

```ts
// apps/web/src/lib/runner/sandbox.ts
export function buildSandboxedSource(userSource: string): string {
  // Wraps userSource so console.log/warn/error push into a captured array
  // instead of reaching the real console, and the final statement's value
  // (if it's an expression) is captured for `returnValue`. Returns a string
  // of JS ready to be eval()'d inside the worker.
}
```

`worker.ts` itself is a thin shell: receive a `RunRequest`, call
`buildSandboxedSource`, `eval` the result inside a `try/catch`, `postMessage`
the `RunResult` back. Nearly everything worth unit-testing lives in
`sandbox.ts`, not `worker.ts`.

### 2.4 `index.ts` — the public API and timeout race

```ts
// apps/web/src/lib/runner/index.ts
export function runJs(source: string): Promise<RunResult> {
  // Spawns a fresh Worker, posts the RunRequest, races the worker's
  // response against a 3000ms timeout (per IMPLEMENTATION_PLAN.md §6.1).
  // On timeout: worker.terminate(), resolve with { output: [], timedOut:
  // true, error: 'Timed out after 3s — check for an infinite loop.' }.
  // Always resolves — never rejects — so a caller's UI never has to
  // distinguish "the promise rejected" from "the run failed" as two
  // different states to handle.
}
```

---

## 3. Future Python seam

`runJs` is exported by name, not as a generic `run(lang, source)`. When a
Pyodide-backed runner is eventually built, it will export its own
`runPython(source): Promise<RunResult>` from a sibling module, and
`RunnableCode` (§4) will pick which to call based on its `lang` prop. No
change to `RunResult`'s shape, to `runJs`, or to any lesson using
`<RunnableCode lang="js">` is implied by that future work — this is the
"interface shaped so Python can be added later" promise from §0.

---

## 4. `RunnableCode` component

```
apps/web/src/components/RunnableCode.tsx
apps/web/src/components/RunnableCode.test.tsx
```

Props:

```ts
export interface RunnableCodeProps {
  lang: 'js';          // only value today; widens when Python lands
  source: string;       // initial editor content, from the MDX author
  /** Injectable for tests; defaults to the real runJs from lib/runner. */
  run?: (source: string) => Promise<RunResult>;
}
```

The `run` prop mirrors why `VizIsland` is testable without a browser today:
dependency injection at the component boundary means `RunnableCode.test.tsx`
can pass a fake `run` and assert on UI wiring without ever touching a real
`Worker`, which `jsdom` cannot reliably provide (§7).

**Editor.** CodeMirror 6 (`@codemirror/state`, `@codemirror/view`,
`@codemirror/lang-javascript`, plus a minimal set — exact packages and exact
versions resolved from the npm registry at implementation time and pinned
without `^`/`~`, per the rule `docs/superpowers/specs/2026-08-19-phase0-foundation-design.md`
§1.1 already established), pre-filled with `source`. This is the first use
of CodeMirror in the repo — `IMPLEMENTATION_PLAN.md` §2.1 already named it as
the intended editor (chosen over Monaco for being roughly 10× lighter).

**Controls.** `Run` and `Reset` buttons, directly under the editor —
same button semantics and placement as `VizIsland`'s existing "Try your own
input" editor, for a consistent feel across the two kinds of "try it
yourself" the site now has.

- **Run**: clears the output panel, calls `run(currentEditorContent)`,
  renders the result once it resolves (§5 covers exactly what's shown).
- **Reset**: restores the editor to the original `source` prop and clears
  the output panel. Does not auto-run.

**Output panel.** `role="status"` `aria-live="polite"`, matching the
accessibility pattern `Player` already uses for its note region — a screen
reader announces a new run's result without the user having to go looking
for it.

## 5. MDX authoring convention

A lesson opts in explicitly, replacing the plain fence:

````mdx
<RunnableCode lang="js" source={`function insertInto(arr, index, value) {
  ...
}

console.log(insertInto([4, 8, 15, 16, 23, 42], 1, 9));
`} />
````

> **Note:** this example predates the `client:visible` fix (see the plan's
> "Decisions the spec left open" §3) and does not show it. `docs/AUTHORING.md`
> §4.9 is the up-to-date, authoritative form — it includes the required
> `client:visible` directive. Follow that, not this example, when authoring.

This is additive to `AUTHORING.md` (new section, "Making a Try it block
runnable") — not a silent transform of every fenced block in every lesson. A
lesson can still ship a plain, non-runnable ` ```js ` example if that's ever
the right call; `<RunnableCode>` is opt-in the same way `<Viz>` is.

---

## 6. Pilot lessons

Two lessons, chosen to exercise the two different output paths:

| Lesson | Why | Output path exercised |
|---|---|---|
| `data-structures/array.mdx` | The canonical "start here" lesson (`AUTHORING.md` names it first). Its example returns a value. | `returnValue` display |
| `algorithms/recursion.mdx` | `factorial(5)` with one clean `console.log(factorial(5))` call. | `output` (console) display |

Both lessons' `## Try it` blocks get an explicit call + `console.log`/return
appended (content edit, approved as in-scope for this task), and their fence
swapped for `<RunnableCode>`.

---

## 7. Error handling

Three cases, and — unlike the viz input editor's "leave the prior good run
on screen when validation fails" rule — **each `Run` clears prior output
first**, because a code error is a different situation: the code *did*
execute and something happened partway through, so showing what it produced
up to the failure is the useful, real-console-like behavior, not a
regression to hide.

| Case | Detection | Shown |
|---|---|---|
| Syntax error | `eval` throws immediately, no output produced | The error message |
| Runtime error (thrown) | `eval` throws mid-execution | `output` buffered so far, then the error message |
| Timeout (e.g. infinite loop) | `runJs`'s 3000ms race fires first | "Timed out after 3s — check for an infinite loop." No partial output (§0) |

The `Run` button always returns to its idle, clickable state once the
promise resolves — `runJs` never rejects (§2.4), so there is no unhandled-
promise path that could leave the button permanently disabled.

---

## 8. Testing

- **`sandbox.test.ts`** (Vitest, Node environment): unit tests on
  `buildSandboxedSource` directly — console capture order, return-value
  capture, syntax-error passthrough — with no `Worker` involved.
- **`index.test.ts`**: exercises `runJs` end-to-end against a real `Worker`.
  Vitest's `jsdom`/`happy-dom` environments do not reliably implement
  `Worker`; if that proves true when this is built, this file runs under
  Vitest's `node` project instead (Node has had a real, spec-following
  `Worker` — via `worker_threads`-backed polyfill or Node's own — available
  for this kind of test), or is deliberately deferred entirely to the
  Playwright e2e coverage below. Which of those applies is a decision for
  implementation time, not this spec — but the fallback path is written down
  here so it is not discovered mid-PR.
- **`RunnableCode.test.tsx`** (Vitest + Testing Library, jsdom, mirroring
  `VizIsland.test.tsx`'s existing pattern exactly): injects a fake `run` prop,
  asserts Run/Reset/output/error wiring — success, thrown error, and timeout
  cases — without touching a real worker.
- **Playwright e2e**, added to the existing per-lesson suite pattern in
  `apps/web/e2e/lesson.spec.ts`, for both pilot lessons:
  - Click Run, see the real expected output.
  - axe (wcag2a/wcag2aa), both colour schemes — the same gate every lesson
    already has to pass.
  - No horizontal scroll at 360px.
  - CLS budget on hydration (the same 0.1 budget every island already meets).

---

## 9. Definition of done

- [ ] `apps/web/src/lib/runner/` built: `runJs`, `buildSandboxedSource`,
      protocol types, per §1–§3.
- [ ] `RunnableCode` component built and tested per §4, §8.
- [ ] `AUTHORING.md` gains a new section documenting the `<RunnableCode>`
      convention (§5).
- [ ] `array.mdx` and `recursion.mdx` migrated (§6): content edited to add a
      call + output, fence swapped for `<RunnableCode>`.
- [ ] All three error/timeout cases (§7) verified by test, not just by hand.
- [ ] `pnpm lint:content`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
      `pnpm check:offline`, `pnpm test:e2e` all exit 0.
- [ ] No `packages/` file is edited that this spec didn't already name —
      any surprise falls under the same "stop and report" rule
      `docs/AUTHORING.md` §0 already establishes for lesson work.
