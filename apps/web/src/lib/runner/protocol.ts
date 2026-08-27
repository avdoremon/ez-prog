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
