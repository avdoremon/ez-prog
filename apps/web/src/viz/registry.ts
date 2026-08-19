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
} satisfies Record<string, VizEntry<any, any>>;

export type VizId = keyof typeof registry;

// Widened to the full VizEntry shape (including optional fields such as
// `maxFrames`) so consumers can access any VizEntry member on any id.
// `satisfies` above only validates `registry`; it does not widen its type,
// so a bare `export const VIZ = {...} satisfies ...` would make omitted
// optional fields (like `maxFrames`) absent from the value type entirely.
export const VIZ: Record<VizId, VizEntry<any, any>> = registry;
