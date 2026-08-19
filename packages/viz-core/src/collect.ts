import type { Frame } from './types.js';

export const MAX_FRAMES = 1500;

export interface CollectResult<S> {
  frames: Frame<S>[];
  truncated: boolean;
}

export function collect<S>(
  gen: Generator<Frame<S>>,
  cap: number = MAX_FRAMES,
): CollectResult<S> {
  if (!Number.isInteger(cap) || cap < 1) {
    throw new RangeError(`collect: cap must be a positive integer, received ${cap}`);
  }
  const frames: Frame<S>[] = [];
  for (const frame of gen) {
    if (frames.length === cap) {
      frames.push({
        state: frame.state,
        note: `Visualization stopped after ${cap} steps. Try a smaller input to watch it finish.`,
      });
      return { frames, truncated: true };
    }
    frames.push(frame);
  }
  return { frames, truncated: false };
}
