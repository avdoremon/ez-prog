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
