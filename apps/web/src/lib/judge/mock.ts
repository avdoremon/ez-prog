import type { Lang } from '../langs.js';
import type { Judge, Result, Submission } from './types.js';

/** Deterministic in-memory judge. Phase 1 replaces it with Judge0Http. */
export class MockJudge implements Judge {
  async languages(): Promise<Record<Lang, number>> {
    return { c: 50, cpp: 54, java: 62, js: 63, py: 71 };
  }

  async run(subs: Submission[], signal?: AbortSignal): Promise<Result[]> {
    if (signal?.aborted) throw new Error('MockJudge: run aborted');
    return subs.map((s) => {
      if (s.source.includes('TLE')) {
        return { verdict: 'time_limit', stdout: '', timeMs: 5000 };
      }
      if (s.source.includes('FAIL')) {
        return { verdict: 'wrong_answer', stdout: '', timeMs: 1 };
      }
      return { verdict: 'accepted', stdout: s.stdin, timeMs: 1, memoryKb: 1024 };
    });
  }
}
