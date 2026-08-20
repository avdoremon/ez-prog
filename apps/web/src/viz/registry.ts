import { z } from 'zod';
import type { VizEntry } from './types.js';

const registry = {
  'binary-search': {
    renderer: 'ArrayView',
    label: 'Sorted array being searched',
    defaultInput: { arr: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 23 },
    inputSchema: z.object({
      arr: z.array(z.number()).min(1).max(64),
      target: z.number(),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/binary-search').then((m) => ({
        default: m.binarySearch,
      })),
    code: () => import('./code/binary-search/index.js'),
  },
  'bubble-sort': {
    renderer: 'ArrayView',
    label: 'Array being sorted by repeated swaps',
    defaultInput: { arr: [5, 2, 9, 1, 7, 3] },
    // Quadratic — tighter than the global MAX_FRAMES budget.
    maxFrames: 400,
    inputSchema: z.object({
      arr: z.array(z.number()).min(1).max(24),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/bubble-sort').then((m) => ({
        default: m.bubbleSort,
      })),
    code: () => import('./code/bubble-sort/index.js'),
  },
  'insertion-sort': {
    renderer: 'ArrayView',
    label: 'Array being sorted by inserting each value into the sorted prefix',
    defaultInput: { arr: [5, 2, 9, 1, 7, 3] },
    // Quadratic — tighter than the global MAX_FRAMES budget.
    maxFrames: 400,
    inputSchema: z.object({
      arr: z.array(z.number()).min(1).max(24),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/insertion-sort').then((m) => ({
        default: m.insertionSort,
      })),
    code: () => import('./code/insertion-sort/index.js'),
  },
  'two-pointer': {
    renderer: 'ArrayView',
    label: 'Sorted array with a pointer converging from each end',
    defaultInput: { arr: [1, 3, 4, 6, 8, 11, 15], target: 14 },
    inputSchema: z.object({
      arr: z.array(z.number()).min(2).max(64),
      target: z.number(),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/two-pointer').then((m) => ({
        default: m.twoPointer,
      })),
    code: () => import('./code/two-pointer/index.js'),
  },
  'linear-search': {
    renderer: 'ArrayView',
    label: 'Array scanned one value at a time',
    defaultInput: { arr: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 23 },
    inputSchema: z.object({
      arr: z.array(z.number()).min(1).max(64),
      target: z.number(),
    }),
    load: () =>
      import('@cs/viz-core/algorithms/linear-search').then((m) => ({
        default: m.linearSearch,
      })),
    code: () => import('./code/linear-search/index.js'),
  },
} satisfies Record<string, VizEntry<any, any>>;

export type VizId = keyof typeof registry;

// Widened to the full VizEntry shape (including optional fields such as
// `maxFrames`) so consumers can access any VizEntry member on any id.
// `satisfies` above only validates `registry`; it does not widen its type,
// so a bare `export const VIZ = {...} satisfies ...` would make omitted
// optional fields (like `maxFrames`) absent from the value type entirely.
export const VIZ: Record<VizId, VizEntry<any, any>> = registry;
