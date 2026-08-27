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
    if (v === undefined) return 'undefined';
    if (typeof v === 'function') return String(v);
    if (typeof v === 'number' && !Number.isFinite(v)) return String(v);
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
