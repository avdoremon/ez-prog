import { useCallback, useEffect, useState } from 'react';

const BASE_INTERVAL_MS = 800;

export interface FramePlayer {
  index: number;
  playing: boolean;
  speed: number;
  atStart: boolean;
  atEnd: boolean;
  play(): void;
  pause(): void;
  toggle(): void;
  next(): void;
  prev(): void;
  first(): void;
  last(): void;
  seek(i: number): void;
  setSpeed(s: number): void;
}

export function useFramePlayer(
  frameCount: number,
  opts: { speed?: number } = {},
): FramePlayer {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(opts.speed ?? 1);

  const maxIndex = Math.max(0, frameCount - 1);
  const clamp = useCallback(
    (i: number) => Math.min(Math.max(0, i), maxIndex),
    [maxIndex],
  );

  // Frame count can shrink when the learner edits the input.
  useEffect(() => setIndex((i) => Math.min(i, maxIndex)), [maxIndex]);

  useEffect(() => {
    if (!playing) return;
    if (index >= maxIndex) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => setIndex((i) => clamp(i + 1)), BASE_INTERVAL_MS / speed);
    return () => clearTimeout(id);
  }, [playing, index, maxIndex, speed, clamp]);

  return {
    index,
    playing,
    speed,
    atStart: index === 0,
    atEnd: index >= maxIndex,
    play: useCallback(() => setPlaying(true), []),
    pause: useCallback(() => setPlaying(false), []),
    toggle: useCallback(() => setPlaying((p) => !p), []),
    next: useCallback(() => setIndex((i) => clamp(i + 1)), [clamp]),
    prev: useCallback(() => setIndex((i) => clamp(i - 1)), [clamp]),
    first: useCallback(() => setIndex(0), []),
    last: useCallback(() => setIndex(maxIndex), [maxIndex]),
    seek: useCallback((i: number) => setIndex(clamp(i)), [clamp]),
    setSpeed,
  };
}
