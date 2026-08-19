import { MockJudge } from './mock.js';
import type { Judge } from './types.js';

export * from './types.js';

/** Phase 1 swaps this for Judge0Http; no caller changes. */
export function getJudge(): Judge {
  return new MockJudge();
}
