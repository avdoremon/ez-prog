// packages/viz-core/test/conformance.ts
import fc from 'fast-check';
import { describe, expect, test } from 'vitest';
import { collect, MAX_FRAMES } from '../src/collect.js';
import type { MarkKind, Target, VizAlgorithm } from '../src/types.js';

const VALID_KINDS: MarkKind[] = [
  'cursor', 'compare', 'swap', 'done', 'visited', 'active', 'discard',
];

export interface ConformanceSpec<I, S> {
  name: string;
  algorithm: VizAlgorithm<I, S>;
  /** Generates inputs the algorithm's inputSchema would accept. */
  arbitrary: fc.Arbitrary<I>;
  /** Target kinds the paired renderer supports. */
  supportedTargets: Target['t'][];
  /** Mutates `input` in place (e.g. `(input) => { input.arr[0] = 999; }`). */
  mutate: (input: I) => void;
}

export function runConformance<I, S>(spec: ConformanceSpec<I, S>): void {
  describe(`conformance: ${spec.name}`, () => {
    test('yields at least one frame', () => {
      fc.assert(fc.property(spec.arbitrary, (input) => {
        expect(collect(spec.algorithm(input)).frames.length).toBeGreaterThan(0);
      }));
    });

    test('the first frame carries no marks', () => {
      fc.assert(fc.property(spec.arbitrary, (input) => {
        const first = collect(spec.algorithm(input)).frames[0]!;
        expect(first.marks ?? []).toHaveLength(0);
      }));
    });

    test('every frame has a non-empty note', () => {
      fc.assert(fc.property(spec.arbitrary, (input) => {
        for (const f of collect(spec.algorithm(input)).frames) {
          expect(f.note.trim().length).toBeGreaterThan(0);
        }
      }));
    });

    test('terminates within MAX_FRAMES for schema-valid input', () => {
      fc.assert(fc.property(spec.arbitrary, (input) => {
        expect(collect(spec.algorithm(input), MAX_FRAMES).truncated).toBe(false);
      }));
    });

    test('every mark kind is valid', () => {
      fc.assert(fc.property(spec.arbitrary, (input) => {
        for (const f of collect(spec.algorithm(input)).frames) {
          for (const m of f.marks ?? []) expect(VALID_KINDS).toContain(m.kind);
        }
      }));
    });

    test('every target is supported by the paired renderer', () => {
      fc.assert(fc.property(spec.arbitrary, (input) => {
        for (const f of collect(spec.algorithm(input)).frames) {
          for (const m of f.marks ?? []) {
            expect(spec.supportedTargets).toContain(m.at.t);
          }
        }
      }));
    });

    test('mutating the input after collect changes no frame', () => {
      fc.assert(fc.property(spec.arbitrary, (rawInput) => {
        // Clone so mutation never touches fast-check's own generated value
        // (which it may reuse across shrink attempts).
        const input = structuredClone(rawInput);
        const frames = collect(spec.algorithm(input)).frames;
        const before = frames.map((f) => JSON.stringify(f.state));
        spec.mutate(input);
        const after = frames.map((f) => JSON.stringify(f.state));
        expect(after).toEqual(before);
      }));
    });
  });
}
