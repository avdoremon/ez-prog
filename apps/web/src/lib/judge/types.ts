import type { Lang } from '../langs.js';

export type Verdict =
  | 'accepted' | 'wrong_answer' | 'time_limit'
  | 'compile_error' | 'runtime_error';

export interface Submission {
  languageId: number;
  source: string;
  stdin: string;
}

export interface Result {
  verdict: Verdict;
  stdout: string;
  stderr?: string;
  timeMs?: number;
  memoryKb?: number;
}

export interface Judge {
  languages(): Promise<Record<Lang, number>>;
  run(subs: Submission[], signal?: AbortSignal): Promise<Result[]>;
}
