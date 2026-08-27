# Code Runner (Tier 1 — Browser JS) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Web Worker–sandboxed JavaScript runner and a `<RunnableCode>`
editor component, and migrate two pilot lessons (`data-structures/array.mdx`,
`algorithms/recursion.mdx`) from a static fenced code block to a live "Run"
button.

**Architecture:** A fresh `Worker` is spawned per run and `.terminate()`d
after (success, error, or a 3s timeout) so a run can never freeze the tab and
a killed worker's state is never reused. The console/return-value capture
logic is a pure, Worker-free function (`buildSandboxedSource`) so it is
unit-testable directly in Node. `RunnableCode` is a CodeMirror 6–backed React
island, using dependency injection (a `run` prop) the same way `VizIsland`
does, so its UI wiring is testable without a real Worker.

**Tech Stack:** TypeScript, Web Worker API, CodeMirror 6 (`codemirror` +
`@codemirror/lang-javascript`), React 19, Vitest + Testing Library,
Playwright.

**Spec:** `docs/superpowers/specs/2026-08-24-code-runner-design.md` (this
plan implements it in full; deviations from it are recorded below with
rationale — read both).

---

## Decisions the spec left open

The design spec (§8, §1) explicitly flagged a few choices as "implementation
time, not this spec." Resolved here, so no task below carries a placeholder:

1. **No `index.test.ts`.** The spec's own fallback (§8) pre-authorizes
   deferring `runJs`'s Worker-orchestration coverage to Playwright "if
   jsdom/happy-dom don't reliably implement `Worker`." The real blocker is
   one level up: `runJs` uses Vite's special-cased
   `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })`
   pattern, which Vite rewrites at the *source* level independently of any
   runtime `Worker` stub — so even a mocked global `Worker` class doesn't
   sidestep however Vite's worker plugin behaves under vitest's SSR/node
   transform. Real Worker behavior (spawn, message, timeout, terminate) is
   instead verified by Task 5's Playwright e2e tests, which run through a
   real browser and a real client build. `sandbox.ts` — where the actual
   run/capture logic lives — is still fully unit tested in Task 1.
2. **`buildSandboxedSource`'s try/catch lives inside the generated string**,
   not around the `eval()` call in `worker.ts`. §7 requires a mid-run throw
   to still show whatever console output happened before it; that output
   array is scoped inside the sandboxed wrapper, so the only way to return it
   *and* an error together is to catch inside the same scope. `worker.ts`
   stays a thin, never-throwing shell (still "eval in a sandbox," matching
   spec §2.3's intent, just structured so the try/catch travels with the
   output it needs to see).
3. **`RunnableCode` is used directly in MDX with `client:visible`, no
   `.astro` wrapper** (unlike `Viz`/`VizIsland`, which use one). Astro's MDX
   integration supports client directives directly on imported framework
   components in `.mdx` files — `Viz.astro` exists for a different reason
   (validating the `id` prop against the registry and supplying a static
   `<noscript>` fallback), neither of which `RunnableCode` needs from a
   wrapper: it has no id to validate, and its own `<noscript>` fallback is
   simple enough to render inline. **Confirmed by Task 5's e2e run:** the
   directive does work directly in `.mdx` — but Task 4's own `<RunnableCode>`
   JSX was first shipped with the `client:visible` attribute itself missing
   (an authoring slip in this plan, not a framework limitation), which Task
   4's implementer couldn't catch (no browser available to click-verify) and
   only surfaced once Task 5's real-browser Playwright run tried to click
   Run. Fixed by adding `client:visible` to both lessons' `<RunnableCode>`
   tags (ruling recorded in the SDD ledger). No `.astro` wrapper was needed.
4. **Package set: `codemirror` (6.0.2) + `@codemirror/lang-javascript`
   (6.2.5)**, not the individual `@codemirror/state`/`@codemirror/view`
   packages the spec's prose lists. The `codemirror` meta-package re-exports
   `EditorView`, `EditorState`, and `basicSetup` and depends on `/state`,
   `/view`, `/commands`, `/language`, `/autocomplete`, `/lint`, `/search`
   itself — this is CodeMirror 6's own documented minimal setup, and two
   pinned packages is a smaller surface than five. Versions verified against
   the npm registry on 2026-08-27 (`npm view <pkg> version`).

## Global Constraints

- Location: `apps/web/src/lib/runner/` (a plain lib folder, following the
  `apps/web/src/lib/judge/` precedent), **not** `packages/runner/`.
- A fresh `Worker` is spawned per run and always `.terminate()`d afterward
  (success, error, or timeout) — never reused across runs.
- Timeout is exactly `3000` ms; the timeout's error message is exactly
  `'Timed out after 3s — check for an infinite loop.'`
- `runJs(source: string): Promise<RunResult>` **never rejects.**
- Package versions are pinned exactly, no `^`/`~`: `codemirror@6.0.2`,
  `@codemirror/lang-javascript@6.2.5`.
- Out of scope, do not touch: Pyodide/Python execution, Judge0/Tier 2, the
  Problem page, `content-problems/`, the progress store, migrating any of
  the other 26 lessons, streaming output during a run.
- No file under `packages/` is edited by this plan. If a task seems to need
  one, stop and report per `docs/AUTHORING.md` §0 rather than editing it.

---

### Task 1: Sandbox core — `buildSandboxedSource`

**Files:**
- Create: `apps/web/src/lib/runner/protocol.ts`
- Create: `apps/web/src/lib/runner/sandbox.ts`
- Test: `apps/web/src/lib/runner/sandbox.test.ts`

**Interfaces:**
- Produces: `export interface RunRequest { source: string }`;
  `export interface RunResult { output: string[]; returnValue?: string;
  error?: string; timedOut: boolean }` (both from `protocol.ts`);
  `export function buildSandboxedSource(userSource: string): string` (from
  `sandbox.ts`) — returns a JS source string whose own `eval()` completion
  value is `{ output: string[]; returnValue?: string } | { output: string[];
  error: string }` (this exact shape is consumed by `worker.ts` in Task 2).

- [ ] **Step 1: Create `protocol.ts`**

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

- [ ] **Step 2: Write the failing tests for `buildSandboxedSource`**

```ts
// apps/web/src/lib/runner/sandbox.test.ts
import { expect, test } from 'vitest';
import { buildSandboxedSource } from './sandbox.js';

interface SandboxOutcome {
  output: string[];
  returnValue?: string;
  error?: string;
}

function run(userSource: string): SandboxOutcome {
  // eslint-disable-next-line no-eval -- exercising the generated sandbox directly.
  return eval(buildSandboxedSource(userSource)) as SandboxOutcome;
}

test('captures console.log/warn/error calls in call order', () => {
  const result = run("console.log(1); console.warn('two'); console.error(3);");
  expect(result.output).toEqual(['1', 'two', '3']);
});

test('joins multiple arguments to one console call with a space', () => {
  const result = run("console.log('a', 1, [1, 2]);");
  expect(result.output).toEqual(['a 1 [1,2]']);
});

test('captures the last top-level expression as returnValue, JSON-stringified', () => {
  expect(run('40 + 2;').returnValue).toBe('42');
  expect(run('[1, 2, 3];').returnValue).toBe('[1,2,3]');
});

test('returns a bare string return value unquoted', () => {
  expect(run("'hello';").returnValue).toBe('hello');
});

test('has no returnValue when the last statement produces no value', () => {
  const result = run('var x = 5;');
  expect(result.returnValue).toBeUndefined();
});

test('a function call as the last statement returns its value, not console output', () => {
  const result = run('function double(n) { return n * 2; } double(21);');
  expect(result.returnValue).toBe('42');
  expect(result.output).toEqual([]);
});

test('a runtime error keeps whatever output was produced before the throw', () => {
  const result = run("console.log('before'); throw new Error('boom');");
  expect(result.output).toEqual(['before']);
  expect(result.error).toBe('boom');
});

test('a syntax error is returned as an error, not thrown', () => {
  expect(() => run('this is ) not valid js')).not.toThrow();
  const result = run('this is ) not valid js');
  expect(result.output).toEqual([]);
  expect(result.error).toBeTruthy();
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm vitest run apps/web/src/lib/runner/sandbox.test.ts`
Expected: FAIL — `buildSandboxedSource` is not defined (module doesn't exist yet).

- [ ] **Step 4: Implement `sandbox.ts`**

```ts
// apps/web/src/lib/runner/sandbox.ts

/**
 * Wraps `userSource` so console.log/warn/error calls are captured into an
 * array instead of reaching the real console, and so the source's own last
 * top-level expression's value comes back as `returnValue` — both without a
 * parser, by relying on two real JS semantics rather than string surgery:
 *
 * - A *direct* `eval(...)` call (this literal token, not an alias or
 *   `(0, eval)`) runs in its caller's lexical scope, so a locally-declared
 *   `var console = {...}` right above it is what the user's code sees —
 *   indirect eval would run in global scope and miss the shadow entirely.
 * - A direct eval's own completion value is exactly its last top-level
 *   statement's value, skipping over declarations (`eval("1; var x;")` is
 *   `1`) — the same mechanism a REPL uses to show you a value without you
 *   writing `return`.
 *
 * The try/catch lives INSIDE the returned string (around the inner `eval`),
 * not around the outer `eval(buildSandboxedSource(...))` call in worker.ts —
 * `__output` is only reachable from inside this scope, so catching outside
 * it would lose whatever console output happened before a mid-run throw.
 * See design spec §7 ("Runtime error... output buffered so far, then the
 * error message") and §2.3.
 */
export function buildSandboxedSource(userSource: string): string {
  const encoded = JSON.stringify(userSource);
  return `(function () {
  var __output = [];
  function __stringify(v) {
    if (typeof v === 'string') return v;
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }
  function __capture() {
    __output.push(Array.prototype.map.call(arguments, __stringify).join(' '));
  }
  var console = { log: __capture, warn: __capture, error: __capture };
  try {
    var __value = eval(${encoded});
    return {
      output: __output,
      returnValue: __value === undefined ? undefined : __stringify(__value),
    };
  } catch (e) {
    return {
      output: __output,
      error: e instanceof Error ? e.message : String(e),
    };
  }
})()`;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run apps/web/src/lib/runner/sandbox.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/runner/protocol.ts apps/web/src/lib/runner/sandbox.ts apps/web/src/lib/runner/sandbox.test.ts
git commit -m "feat: add the code runner's sandboxed-eval core"
```

---

### Task 2: Worker + `runJs` public API

**Files:**
- Create: `apps/web/src/lib/runner/worker.ts`
- Create: `apps/web/src/lib/runner/index.ts`

**Interfaces:**
- Consumes: `buildSandboxedSource` and `RunRequest`/`RunResult` from Task 1.
- Produces: `export function runJs(source: string): Promise<RunResult>` —
  the function `RunnableCode` (Task 3) imports as its default `run`
  implementation.

No dedicated test file for this task — see "Decisions the spec left open"
item 1. Its behavior is verified end-to-end by Task 5's Playwright tests
(real browser, real Worker) and by `pnpm typecheck`/`pnpm build` in the
interim.

- [ ] **Step 1: Implement `worker.ts`**

```ts
// apps/web/src/lib/runner/worker.ts
import { buildSandboxedSource } from './sandbox.js';
import type { RunRequest, RunResult } from './protocol.js';

interface SandboxOutcome {
  output: string[];
  returnValue?: string;
  error?: string;
}

// `eval` here always runs the wrapper `buildSandboxedSource` generated, never
// the user's source directly — see sandbox.ts for why that wrapper never
// throws (so this call doesn't need its own try/catch) and how it captures
// console output and a return value without a parser.
self.onmessage = (event: MessageEvent<RunRequest>) => {
  const outcome = eval(buildSandboxedSource(event.data.source)) as SandboxOutcome;
  const result: RunResult = { ...outcome, timedOut: false };
  postMessage(result);
};
```

- [ ] **Step 2: Implement `index.ts`**

```ts
// apps/web/src/lib/runner/index.ts
import type { RunRequest, RunResult } from './protocol.js';

export * from './protocol.js';

const TIMEOUT_MS = 3000;
const TIMEOUT_MESSAGE = 'Timed out after 3s — check for an infinite loop.';

/**
 * Runs `source` as JavaScript in a fresh, disposable Web Worker and always
 * resolves — never rejects — with a RunResult, so a caller's UI never has to
 * distinguish "the promise rejected" from "the run failed" as two separate
 * states. A fresh worker is spawned per call, never reused: a worker that
 * gets `.terminate()`d mid-run (the timeout branch below) can be left in an
 * unknown state, which is not worth trying to prove clean for a second run.
 */
export function runJs(source: string): Promise<RunResult> {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    let settled = false;

    const finish = (result: RunResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({ output: [], timedOut: true, error: TIMEOUT_MESSAGE });
    }, TIMEOUT_MS);

    worker.onmessage = (event: MessageEvent<RunResult>) => finish(event.data);
    worker.onerror = (event: ErrorEvent) => {
      finish({ output: [], timedOut: false, error: event.message || 'The run failed unexpectedly.' });
    };

    const request: RunRequest = { source };
    worker.postMessage(request);
  });
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: exits 0. (`worker.ts`'s `self`/`postMessage`/`onmessage` typings
resolve via the `WebWorker` lib Astro's tsconfig already includes for
`.ts` files under `apps/web/src`; if TS instead reports `self`/`postMessage`
as undefined, add `"lib": ["ES2022", "DOM", "WebWorker"]` is not the fix —
Astro's strict tsconfig already targets DOM; instead confirm the error isn't
from `packages/` project references picking up this file, since
`apps/web` is intentionally excluded from those per the root `tsconfig.json`
comment.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/runner/worker.ts apps/web/src/lib/runner/index.ts
git commit -m "feat: add the Web Worker runner and its runJs public API"
```

---

### Task 3: `RunnableCode` component

**Files:**
- Modify: `apps/web/package.json` (add `codemirror`, `@codemirror/lang-javascript`)
- Create: `apps/web/src/components/RunnableCode.tsx`
- Create: `apps/web/src/components/RunnableCode.test.tsx`
- Modify: `apps/web/src/styles/viz.css` (append `.runnable-code*` rules)

**Interfaces:**
- Consumes: `runJs` and `RunResult` from `apps/web/src/lib/runner/index.js` (Task 2).
- Produces: `export interface RunnableCodeProps { lang: 'js'; source: string;
  run?: (source: string) => Promise<RunResult> }` and its default export
  `RunnableCode` — this is exactly what Task 4's MDX migration imports and
  renders.

- [ ] **Step 1: Add and install the CodeMirror dependencies**

Edit `apps/web/package.json`'s `"dependencies"` block to add, alphabetically:

```json
    "@codemirror/lang-javascript": "6.2.5",
    "codemirror": "6.0.2",
```

Run: `pnpm install`
Expected: lockfile updates; exits 0.

- [ ] **Step 2: Write the failing component tests**

```tsx
// apps/web/src/components/RunnableCode.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import RunnableCode from './RunnableCode.js';
import type { RunResult } from '../lib/runner/protocol.js';

// CodeMirror's EditorView uses ResizeObserver internally to track its own
// size; jsdom, unlike a real browser, does not implement it, so mounting a
// real editor in these tests throws without this minimal stand-in.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const SOURCE = 'const value = 6 * 7;\nvalue;';

function successResult(overrides: Partial<RunResult> = {}): RunResult {
  return { output: [], timedOut: false, ...overrides };
}

test('the editor pre-fills with the given source', async () => {
  // `basicSetup` syntax-highlights every token into its own <span>, so no
  // single element's DIRECT text (what *ByText matches) is ever the full
  // line -- assert on the editor host's full text content instead.
  const { container } = render(<RunnableCode lang="js" source={SOURCE} run={vi.fn()} />);
  await waitFor(() => {
    expect(container.querySelector('.cm-content')?.textContent).toContain('const value = 6 * 7;');
  });
});

test('Run calls the injected run function with the current editor content and shows the return value', async () => {
  const user = userEvent.setup();
  const run = vi.fn().mockResolvedValue(successResult({ returnValue: '42' }));
  render(<RunnableCode lang="js" source={SOURCE} run={run} />);

  await user.click(screen.getByRole('button', { name: /^run$/i }));

  await waitFor(() => expect(run).toHaveBeenCalledWith(SOURCE));
  expect(await screen.findByText('=> 42')).toBeInTheDocument();
});

test('console output is shown in call order', async () => {
  const user = userEvent.setup();
  const run = vi.fn().mockResolvedValue(successResult({ output: ['first', 'second'] }));
  render(<RunnableCode lang="js" source={SOURCE} run={run} />);

  await user.click(screen.getByRole('button', { name: /^run$/i }));

  const lines = await screen.findAllByText(/^(first|second)$/);
  expect(lines.map((l) => l.textContent)).toEqual(['first', 'second']);
});

test('a thrown error is shown after any output produced before it', async () => {
  const user = userEvent.setup();
  const run = vi.fn().mockResolvedValue(
    successResult({ output: ['before the throw'], error: 'boom' }),
  );
  render(<RunnableCode lang="js" source={SOURCE} run={run} />);

  await user.click(screen.getByRole('button', { name: /^run$/i }));

  expect(await screen.findByText('before the throw')).toBeInTheDocument();
  expect(await screen.findByText(/boom/)).toBeInTheDocument();
});

test('a timeout shows the timeout message and no output', async () => {
  const user = userEvent.setup();
  const run = vi.fn().mockResolvedValue(
    successResult({ timedOut: true, error: 'Timed out after 3s — check for an infinite loop.' }),
  );
  render(<RunnableCode lang="js" source={SOURCE} run={run} />);

  await user.click(screen.getByRole('button', { name: /^run$/i }));

  expect(await screen.findByText(/timed out after 3s/i)).toBeInTheDocument();
});

test('Reset restores the original source and clears the output panel', async () => {
  const user = userEvent.setup();
  const run = vi.fn().mockResolvedValue(successResult({ returnValue: '42' }));
  const { container } = render(<RunnableCode lang="js" source={SOURCE} run={run} />);

  await user.click(screen.getByRole('button', { name: /^run$/i }));
  expect(await screen.findByText('=> 42')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /^reset$/i }));

  expect(screen.queryByText('=> 42')).not.toBeInTheDocument();
  // Same span-per-token reason as the pre-fill test above.
  await waitFor(() => {
    expect(container.querySelector('.cm-content')?.textContent).toContain('const value = 6 * 7;');
  });
});

test('the output region is announced politely', () => {
  render(<RunnableCode lang="js" source={SOURCE} run={vi.fn()} />);
  const status = screen.getByRole('status');
  expect(status).toHaveAttribute('aria-live', 'polite');
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `pnpm vitest run apps/web/src/components/RunnableCode.test.tsx`
Expected: FAIL — `./RunnableCode.js` cannot be found.

- [ ] **Step 4: Implement `RunnableCode.tsx`**

```tsx
// apps/web/src/components/RunnableCode.tsx
import { useEffect, useRef, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { runJs } from '../lib/runner/index.js';
import type { RunResult } from '../lib/runner/protocol.js';

export interface RunnableCodeProps {
  /** Only value today; widens when a Pyodide-backed runner lands (design spec §3). */
  lang: 'js';
  /** Initial editor content, from the MDX author. */
  source: string;
  /** Injectable for tests; defaults to the real runJs from lib/runner. */
  run?: (source: string) => Promise<RunResult>;
}

export default function RunnableCode({ source, run = runJs }: RunnableCodeProps) {
  const editorHostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const view = new EditorView({
      doc: source,
      extensions: [basicSetup, javascript(), EditorView.lineWrapping],
      parent: editorHostRef.current!,
    });
    viewRef.current = view;
    return () => view.destroy();
    // Reset (below) mutates the existing view directly instead of depending
    // on `source` here, so this effect is meant to run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRun() {
    setRunning(true);
    const currentSource = viewRef.current?.state.doc.toString() ?? source;
    const runResult = await run(currentSource);
    setResult(runResult);
    setRunning(false);
  }

  function handleReset() {
    const view = viewRef.current;
    if (view) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: source } });
    }
    setResult(null);
  }

  return (
    <div className="runnable-code">
      <div className="runnable-code__editor" ref={editorHostRef} />
      <noscript>
        <pre className="runnable-code__fallback">{source}</pre>
      </noscript>
      <div className="runnable-code__actions">
        <button type="button" onClick={() => void handleRun()} disabled={running}>
          {running ? 'Running…' : 'Run'}
        </button>
        <button type="button" onClick={handleReset} disabled={running}>Reset</button>
      </div>
      <div role="status" aria-live="polite" className="runnable-code__output">
        {result && <RunOutput result={result} />}
      </div>
    </div>
  );
}

function RunOutput({ result }: { result: RunResult }) {
  if (result.timedOut) {
    return (
      <p className="runnable-code__error">
        <span aria-hidden="true">⚠ </span>{result.error}
      </p>
    );
  }
  return (
    <>
      {result.output.map((line, i) => (
        <pre key={i} className="runnable-code__line">{line}</pre>
      ))}
      {result.returnValue !== undefined && (
        <pre className="runnable-code__return">{`=> ${result.returnValue}`}</pre>
      )}
      {result.error && (
        <p className="runnable-code__error">
          <span aria-hidden="true">⚠ </span>{result.error}
        </p>
      )}
    </>
  );
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run apps/web/src/components/RunnableCode.test.tsx`
Expected: PASS (7 tests). If CodeMirror throws on a missing browser API other
than `ResizeObserver` (jsdom's DOM implementation is not complete), add a
matching minimal stub next to `ResizeObserverStub` following the same
pattern — do not skip or delete the failing test.

- [ ] **Step 6: Add the CLS-reservation and output styles**

Append to `apps/web/src/styles/viz.css`:

```css
.runnable-code {
  margin-top: 1rem;
}

.runnable-code__editor {
  border: 2px solid var(--muted);
}

.runnable-code__editor .cm-editor {
  font-family: var(--font-mono);
  font-size: var(--step-0);
}

.runnable-code__actions {
  display: flex;
  gap: .5rem;
  margin-top: .5rem;
}

.runnable-code__output {
  margin-top: .5rem;
}

.runnable-code__line,
.runnable-code__return {
  font-family: var(--font-mono);
  font-size: var(--step-0);
  white-space: pre-wrap;
  overflow-wrap: break-word;
  margin: 0 0 .25rem;
}

.runnable-code__error {
  border: 2px solid var(--discard);
  border-style: dashed;
  padding: .5rem .75rem;
  font-weight: 600;
}

/*
 * RunnableCode's CodeMirror instance mounts client-side only (useEffect);
 * server-rendered HTML has an empty editor host. Reserving space up front
 * avoids the same hydration layout shift documented above for `.viz` — see
 * that comment for the mechanism (the `.js` class, the CLS budget). 12rem is
 * a starting estimate for a short (~10-line) sample; Task 5's CLS e2e test
 * against the real pilot lessons is the actual check — raise this if it
 * still fails there.
 */
.js .runnable-code__editor {
  min-height: 12rem;
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/components/RunnableCode.tsx apps/web/src/components/RunnableCode.test.tsx apps/web/src/styles/viz.css
git commit -m "feat: add the RunnableCode editor component"
```

---

### Task 4: Migrate the two pilot lessons

**Files:**
- Modify: `apps/web/src/content/docs/data-structures/array.mdx`
- Modify: `apps/web/src/content/docs/algorithms/recursion.mdx`

**Interfaces:**
- Consumes: `RunnableCode` from `apps/web/src/components/RunnableCode.tsx` (Task 3).

Both lessons already appear in `apps/web/e2e/lesson.spec.ts`'s
`ALL_LESSONS`, so no e2e registration step is needed here — Task 5 adds the
Run-specific assertions on top of the axe/360px/CLS checks these lessons
already get.

- [ ] **Step 1: Replace `array.mdx`'s `## Try it` block**

Add the import (next to the existing `Viz` import) and replace the fenced
block. `array.mdx`'s full new content:

```mdx
---
title: Arrays
description: One contiguous block of memory — why reading by index is instant and inserting in the middle is not.
order: 210
difficulty: beginner
estimatedMinutes: 6
viz: array-basics
languages: [js, py, c]
---

import Viz from '../../../components/Viz.astro';
import RunnableCode from '../../../components/RunnableCode.tsx';

An array is not a list of things so much as a single block of memory with the
values packed side by side. Almost everything arrays are good and bad at
follows from that one decision.

<Viz id="array-basics" />

## How it works

Because the values are contiguous and every one is the same size, the machine
does not *search* for index 3 — it computes where it must be:

```text
address = start + index × size
```

One multiplication, one addition, regardless of length — an array of ten
costs the same to read from as one of ten million. That is what "random
access" means: no position is harder to reach than any other.

The same layout is what makes inserting expensive. There is no spare room
between neighbours, so to put a value at index 1, everything from index 1
onward must first move one slot right — and each of those moves is a real
copy. Step the visualization and count the shifts: inserting near the front of
*n* values costs about *n* moves, while appending at the end costs none.

Deleting has the mirror problem: remove from the middle and everything to its
right slides left to close the hole.

## Try it

<RunnableCode lang="js" client:visible source={`function insertInto(arr, index, value) {
  arr.length = arr.length + 1;
  for (let i = arr.length - 1; i > index; i--) {
    arr[i] = arr[i - 1];
  }
  arr[index] = value;
  return arr;
}

insertInto([4, 8, 15, 16, 23, 42], 1, 9);
`} />

## Trade-offs

Reach for an array when you index, or when you iterate. Contiguity makes
iteration genuinely faster than the step count suggests: memory arrives in
cache lines, so reading one value drags its neighbours along for free.
Structures that scatter their values across memory lose that.

Avoid it when you insert or delete in the middle often — that shifting cost is
paid per operation. A structure that stores each value with a pointer to the
next can splice in one step, at the cost of losing indexing and cache
locality.

One wrinkle: JavaScript and Python arrays grow on demand by allocating spare
capacity and, once it runs out, copying everything into a larger block — so
individual appends are usually free and occasionally expensive.

## Check your understanding

1. **Why is reading `arr[500]` no slower than reading `arr[0]`?**
   - The array keeps an index of where each value lives
   - Because the address is computed with arithmetic, not searched for
   - Because modern CPUs cache the whole array
   - It is slower — later indexes take longer to reach

   <details>
   <summary>Answer</summary>

   The address is computed: start plus index times element size. No scan, no
   lookup table, no dependence on length. Caching does make repeated access
   faster in practice, but it is not why the *first* read is constant-time —
   the arithmetic is.
   </details>

2. **Inserting at the front of an array of *n* values costs roughly how much?**
   - One step, like appending
   - About *n* steps, because every value shifts right
   - About log *n* steps
   - It depends on the values, not the length

   <details>
   <summary>Answer</summary>

   About *n* steps: every existing value must move one slot right to open the
   gap. Appending at the end is the cheap case precisely because nothing sits
   to its right. The cost tracks how many values are displaced — the length —
   never what the values are.
   </details>

3. **What does contiguous storage buy beyond index arithmetic?**
   - Nothing else — it is purely about indexing
   - Cache locality: neighbouring values arrive together, so iteration is fast
   - Automatic sorting of the values
   - Protection against running out of memory

   <details>
   <summary>Answer</summary>

   Cache locality. Memory is fetched in blocks, so reading one value pulls its
   neighbours into cache and the next few reads are nearly free — which is why
   iterating an array beats iterating a structure of the same size scattered
   across memory. Contiguity says nothing about order, and it does not prevent
   exhausting memory.
   </details>

## Practice

Try [Remove Element on LeetCode](https://leetcode.com/problems/remove-element/)
— removing in place, where the shifting cost is the entire problem.
```

- [ ] **Step 2: Replace `recursion.mdx`'s `## Try it` block**

`recursion.mdx`'s full new content:

```mdx
---
title: Recursion Basics
description: A function that calls itself is quietly building the same call stack every function uses — just watch it happen.
order: 227
difficulty: beginner
estimatedMinutes: 7
viz: recursion
prerequisites: [/data-structures/stack]
languages: [js, py, c]
---

import Viz from '../../../components/Viz.astro';
import RunnableCode from '../../../components/RunnableCode.tsx';

The Stacks lesson mentioned, almost in passing, that every function call
pushes a frame and every return pops one. Recursion is what happens when
you can actually see that: a function calling itself pushes a new frame
onto the very same stack, over and over, until something stops it.

<Viz id="recursion" />

## How it works

Computing `factorial(5)` calls `factorial(4)`, which calls `factorial(3)`,
and so on — each call pushes its argument onto the stack and then *waits*,
because it needs the answer from the call below it before it can finish.
Step the visualization through the growth: the stack reaches height 5
before anything returns.

That waiting has to stop somewhere, or the calls never end. The **base
case** — here, `n <= 1` — is the call that returns immediately, without
recursing further. Miss it, or get its condition wrong, and the stack
grows forever; that is exactly what a *stack overflow* is, the same
failure the Stacks lesson named.

Once the base case returns, the stack **unwinds**: each waiting frame
gets the value it was blocked on, multiplies it by its own argument, and
returns that upward in turn. Watch the result panel as the stack drains —
1, then 2, then 6, then 24, then 120 — each pop folding one more frame's
argument into the answer below it.

## Try it

<RunnableCode lang="js" client:visible source={`function factorial(n) {
  if (n <= 1) {
    return 1;
  }
  const smaller = factorial(n - 1);
  return n * smaller;
}

console.log(factorial(5));
`} />

## Trade-offs

Reach for recursion when the problem is naturally self-similar — a tree's
children are themselves trees, a fractal's parts are themselves fractals.
The code reads as a direct statement of the definition, with no explicit
stack management.

Avoid it when depth is large and unpredictable. The call stack is finite,
and each frame costs real memory; a recursive scan of a million-element
list can overflow where the equivalent loop, using no extra stack space,
would not. Many recursive functions — this factorial included — have a
straightforward iterative equivalent, trading the self-similar reading for
a guarantee about how much stack the run will ever use.

## Check your understanding

1. **Why does `factorial(5)` need a base case?**
   - To make the function run faster
   - Without one, the calls never stop, and the stack grows until it
     overflows
   - So the result is a bigger number
   - Base cases are only needed for negative input

   <details>
   <summary>Answer</summary>

   Without a call that returns without recursing, every call would keep
   pushing another frame with no frame ever popping — the stack grows
   without bound and eventually overflows. It has nothing to do with speed
   or the size of the answer, and ordinary positive input needs it just as
   much as negative input would.
   </details>

2. **The stack for `factorial(5)` reaches height 5 before anything returns.
   What is happening on the way down?**
   - Nothing — the calls are wasted work
   - Each call pushes its argument and waits for the call below it to
     return first
   - The values are being sorted
   - Each call finishes immediately and only the last one matters

   <details>
   <summary>Answer</summary>

   Each call pushes a frame and blocks, because `n * factorial(n - 1)`
   cannot be computed until `factorial(n - 1)` has a value. That is why the
   stack keeps growing on the way down — every one of those calls is real,
   pending work, not wasted effort, and no sorting is involved.
   </details>

## Practice

Try [Fibonacci Number on LeetCode](https://leetcode.com/problems/fibonacci-number/)
— the same push-then-unwind shape, with two waiting calls per frame
instead of one.
```

- [ ] **Step 3: Lint content**

Run: `pnpm lint:content`
Expected: exits 0 — `Content lint passed.` (Both files were verified at
690 and 610 prose words respectively — under the 700-word `prose-word-limit`
— against this exact content before this plan was written; a mismatch here
means the file above was not copied verbatim.)

- [ ] **Step 4: Typecheck and build**

Run: `pnpm typecheck && pnpm build`
Expected: both exit 0.

- [ ] **Step 5: Manual dev-server check**

Run: `pnpm dev`, open `/data-structures/array/` and `/algorithms/recursion/`.
Confirm: the editor shows the pre-filled source and is editable; clicking
**Run** shows `=> [4,9,8,15,16,23,42]` on the array lesson and `120` on the
recursion lesson; clicking **Reset** restores the original source and clears
the output. This is also where "Decisions the spec left open" item 3 (no
`.astro` wrapper) gets its first real check — if Run does nothing at all
(not even a network/console error), the component never hydrated; add the
`RunnableCode.astro` wrapper described there before continuing.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/content/docs/data-structures/array.mdx apps/web/src/content/docs/algorithms/recursion.mdx
git commit -m "feat: migrate array and recursion lessons to RunnableCode"
```

---

### Task 5: E2E coverage, docs, and final verification

**Files:**
- Modify: `apps/web/e2e/lesson.spec.ts`
- Modify: `docs/AUTHORING.md`

**Interfaces:**
- Consumes: the built site (RunnableCode-hydrated pilot lessons) from Tasks 3–4.

- [ ] **Step 1: Add Run/Reset and timeout e2e tests**

Insert into `apps/web/e2e/lesson.spec.ts`, after the existing CLS
`describe`-less loop (i.e. after the `for (const path of ALL_LESSONS) { ...
does not shift layout ... }` block) and before the `forced light palette`
`describe`:

`RunnableCode` hydrates with `client:visible` (added to both lessons'
`<RunnableCode>` tags per "Decisions the spec left open" §3 above), so a
naive click-immediately test races Astro's intersection-observer →
dynamic-import → mount chain: Playwright's own click-time auto-scroll fires
the click on the same tick the scroll completes, faster than hydration, and
a click landing on inert pre-hydration HTML is lost (Astro islands don't
replay past DOM events). A helper that scrolls the island into view and
waits for `.cm-content` (which only exists once CodeMirror has mounted)
closes that race before the real interaction begins:

```ts
import { expect, test, type Locator } from '@playwright/test';
```

(replaces the existing `import { expect, test } from '@playwright/test';`
at the top of the file — only the `type Locator` addition, nothing else
changes there.)

```ts
const RUNNABLE_LESSONS: { path: string; expectedText: string }[] = [
  { path: '/data-structures/array/', expectedText: '=> [4,9,8,15,16,23,42]' },
  { path: '/algorithms/recursion/', expectedText: '120' },
];

/*
 * RunnableCode hydrates with client:visible (matching Viz.astro's pattern),
 * not client:load: the CodeMirror + worker bundle only loads once the
 * "Try it" block scrolls into view. That is invisible to a human — by the
 * time someone scrolls this far and reaches for Run, hydration is long done
 * — but Playwright's own actionability scroll-then-click happens on one
 * tick, faster than the intersection-observer → dynamic-import → mount
 * chain. A click fired at an unhydrated island lands on inert static HTML
 * with no listener yet attached, and is lost — no amount of waiting
 * afterwards recovers it, since Astro islands don't replay past DOM events.
 * scrollIntoViewIfNeeded() plus an explicit wait for `.cm-content` (which
 * only exists once CodeMirror has mounted) makes the hydration finish
 * before the real interaction begins.
 */
async function waitForRunnableCodeHydrated(runnable: Locator) {
  await runnable.scrollIntoViewIfNeeded();
  await expect(runnable.locator('.cm-content')).toBeVisible();
}

for (const { path, expectedText } of RUNNABLE_LESSONS) {
  test(`${path} Run produces the expected output`, async ({ page }) => {
    await page.goto(path);
    const runnable = page.locator('.runnable-code');
    await waitForRunnableCodeHydrated(runnable);
    await runnable.getByRole('button', { name: /^run$/i }).click();
    await expect(runnable.locator('.runnable-code__output')).toContainText(expectedText);
  });

  test(`${path} Reset clears the output panel`, async ({ page }) => {
    await page.goto(path);
    const runnable = page.locator('.runnable-code');
    await waitForRunnableCodeHydrated(runnable);
    await runnable.getByRole('button', { name: /^run$/i }).click();
    await expect(runnable.locator('.runnable-code__output')).toContainText(expectedText);
    await runnable.getByRole('button', { name: /^reset$/i }).click();
    await expect(runnable.locator('.runnable-code__output')).toBeEmpty();
  });
}

test('an infinite loop in RunnableCode times out with a helpful message, no crash', async ({ page }) => {
  await page.goto('/data-structures/array/');
  const runnable = page.locator('.runnable-code');
  await waitForRunnableCodeHydrated(runnable);
  await runnable.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('while (true) {}');
  await runnable.getByRole('button', { name: /^run$/i }).click();
  await expect(runnable.locator('.runnable-code__output')).toContainText(
    /timed out after 3s/i,
    { timeout: 6000 },
  );
});
```

- [ ] **Step 2: Run the e2e suite**

Run: `pnpm build && pnpm --filter web exec playwright install --with-deps chromium && pnpm test:e2e`
Expected: all tests pass, including the pre-existing axe/360px/CLS loops
against `/data-structures/array/` and `/algorithms/recursion/` (now
exercising the RunnableCode-hydrated pages) and the new tests from Step 1.
If a CLS test fails against either pilot lesson, raise the `min-height` in
`.js .runnable-code__editor` (Task 3, Step 6) and re-run.

- [ ] **Step 3: Document the `<RunnableCode>` convention in AUTHORING.md**

Insert a new `### 4.9 Making a Try it block runnable` subsection into
`docs/AUTHORING.md`, immediately after the existing `### 4.8 Picking
defaultInput and maxFrames together` subsection (i.e. right before `## 5.
Running the gates`):

````markdown
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
````

- [ ] **Step 4: Full gate run**

Run, in order:
`pnpm lint:content && pnpm typecheck && pnpm test && pnpm build && pnpm check:offline && pnpm test:e2e`
Expected: all exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e/lesson.spec.ts docs/AUTHORING.md
git commit -m "test: add e2e coverage for RunnableCode and document the convention"
```

---

## Definition of Done

- [ ] `apps/web/src/lib/runner/` built: `runJs`, `buildSandboxedSource`,
      protocol types (Tasks 1–2).
- [ ] `RunnableCode` built and tested (Task 3).
- [ ] `AUTHORING.md` documents the `<RunnableCode>` convention (Task 5).
- [ ] `array.mdx` and `recursion.mdx` migrated (Task 4).
- [ ] All three error/timeout cases (syntax error, runtime error, timeout)
      verified by test — `sandbox.test.ts` (Task 1), `RunnableCode.test.tsx`
      (Task 3), and the e2e timeout test (Task 5).
- [ ] `pnpm lint:content`, `pnpm typecheck`, `pnpm test`, `pnpm build`,
      `pnpm check:offline`, `pnpm test:e2e` all exit 0.
- [ ] No file under `packages/` was edited.
