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
