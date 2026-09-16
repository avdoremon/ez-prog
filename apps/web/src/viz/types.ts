import type { Frame, VizAlgorithm } from '@cs/viz-core';
import type { z } from 'zod';
import type { Lang } from '../lib/langs.js';

export interface VizEntry<I = unknown, S = unknown> {
  renderer:
    | 'ArrayView' | 'TreeView' | 'GraphView'
    | 'TreeView3D' | 'GraphView3D' | 'HierarchyView3D' | 'BarView3D';
  label: string;
  defaultInput: I;
  inputSchema: z.ZodType<I>;
  /** Tighter than the global 64 cap where the algorithm is quadratic. */
  maxFrames?: number;
  load: () => Promise<{ default: VizAlgorithm<I, S> }>;
  code: () => Promise<{ default: Record<Lang, string> }>;
}

export type AnyFrame = Frame<number[]>;
