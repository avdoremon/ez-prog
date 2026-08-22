import { describe, expect, test } from 'vitest';
import { collect, MAX_FRAMES } from '@cs/viz-core';
import { VIZ } from './registry.js';

/**
 * Lint rule `frame-budget` (scripts/lint-content.ts) runs each viz on its own
 * `defaultInput` and nothing else. But `defaultInput` is only the *starting*
 * input: VizIsland's "Try your own input" editor will run anything
 * `inputSchema` accepts (AUTHORING.md §4.7), and a learner who types the worst
 * case gets a run truncated against `maxFrames` — stopping before the final
 * frame, which is usually the one carrying the result the lesson is about.
 *
 * That is not hypothetical. It shipped in three of the quadratic sorts at
 * once: at a 24-element bound, reversed input needed 577 frames for bubble
 * sort and 600 for insertion sort against a cap of 400. Nothing caught it,
 * because every gate only ever looked at `defaultInput`.
 *
 * So this asserts the real contract instead: **every input the editor accepts
 * must run to completion.** It searches each entry's own schema for its worst
 * case rather than taking a hand-written list of inputs, so it covers entries
 * added later without anyone remembering to extend it.
 */

/** Largest/smallest array length `key` still accepts, found by probing. */
function lengthRange(entry: any, key: string, base: any, make: (n: number) => unknown[]) {
  const accepted: number[] = [];
  for (let n = 1; n <= 80; n++) {
    if (entry.inputSchema.safeParse({ ...base, [key]: make(n) }).success) accepted.push(n);
  }
  return accepted;
}

/** Every scalar value `key` accepts, within a generous integer sweep. */
function scalarRange(entry: any, key: string, base: any) {
  const accepted: number[] = [];
  for (let v = 0; v <= 300; v++) {
    if (entry.inputSchema.safeParse({ ...base, [key]: v }).success) accepted.push(v);
  }
  return accepted;
}

const NUMBER_ORDERS: ((n: number) => number[])[] = [
  (n) => Array.from({ length: n }, (_, i) => i + 1),           // ascending
  (n) => Array.from({ length: n }, (_, i) => n - i),           // descending
  (n) => Array.from({ length: n }, () => 7),                   // all equal
  (n) => Array.from({ length: n }, (_, i) => (i % 2 ? n - i : i + 1)), // sawtooth
];

/** number|null op sequences: a null is a pop/dequeue. */
const OP_PATTERNS: ((n: number) => (number | null)[])[] = [
  (n) => Array.from({ length: n }, (_, i) => i + 1),                       // all pushes
  (n) => Array.from({ length: n }, (_, i) => (i % 2 ? null : i + 1)),      // alternating
  (n) => Array.from({ length: n }, (_, i) => (i < n / 2 ? i + 1 : null)),  // fill then drain
];

/** Candidate inputs for one entry: each key pushed to its extremes. */
function candidatesFor(entry: any): unknown[] {
  const base = entry.defaultInput as Record<string, unknown>;
  if (!base || typeof base !== 'object') return [];

  const perKey: Record<string, unknown[]> = {};

  for (const [key, value] of Object.entries(base)) {
    if (Array.isArray(value) && value.every((v) => typeof v === 'number')) {
      const variants: unknown[] = [];
      for (const make of NUMBER_ORDERS) {
        const lengths = lengthRange(entry, key, base, make);
        const longest = lengths.at(-1);
        if (longest !== undefined) variants.push(make(longest));
      }
      if (variants.length > 0) perKey[key] = variants;
    } else if (Array.isArray(value) && value.every((v) => v === null || typeof v === 'number')) {
      const variants: unknown[] = [];
      for (const make of OP_PATTERNS) {
        const lengths = lengthRange(entry, key, base, make);
        const longest = lengths.at(-1);
        if (longest !== undefined) variants.push(make(longest));
      }
      if (variants.length > 0) perKey[key] = variants;
    } else if (typeof value === 'number') {
      const range = scalarRange(entry, key, base);
      // Both ends: the worst case is the maximum for a count, but the
      // *minimum* for something like initialCapacity, where a smaller value
      // means more doublings.
      if (range.length > 0) perKey[key] = [range[0]!, range.at(-1)!];
    }
  }

  // Cartesian product across keys, so simultaneous extremes are covered (a
  // large count AND a small initial capacity, not one at a time).
  let combos: Record<string, unknown>[] = [{ ...base }];
  for (const [key, variants] of Object.entries(perKey)) {
    const next: Record<string, unknown>[] = [];
    for (const combo of combos) {
      for (const v of variants) next.push({ ...combo, [key]: v });
    }
    combos = next.length > 256 ? next.slice(0, 256) : next;
  }
  return combos.filter((c) => entry.inputSchema.safeParse(c).success);
}

describe('every input the editor accepts runs to completion', () => {
  for (const [id, entry] of Object.entries(VIZ) as [string, any][]) {
    test(`${id} never truncates within its own schema`, async () => {
      const cap = entry.maxFrames ?? MAX_FRAMES;
      const algorithm = (await entry.load()).default;
      const candidates = candidatesFor(entry);

      // A silent skip is the failure mode this whole file exists to prevent,
      // so an entry that produced no candidates is itself a failure.
      expect(candidates.length).toBeGreaterThan(0);

      let worst = { frames: 0, input: null as unknown };
      for (const input of candidates) {
        const run = collect(algorithm(input), cap);
        const full = collect(algorithm(input), 100000);
        if (full.frames.length > worst.frames) worst = { frames: full.frames.length, input };
        expect(
          run.truncated,
          `viz "${id}" truncates at maxFrames=${cap} on schema-valid input ` +
            `${JSON.stringify(input)} (needs ${full.frames.length} frames). ` +
            `Tighten inputSchema so the editor cannot accept it, per AUTHORING.md §4.6.`,
        ).toBe(false);
      }
      expect(worst.frames).toBeLessThanOrEqual(cap);
    });
  }
});
