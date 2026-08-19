import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useFramePlayer } from './useFramePlayer.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('starts at frame zero, paused', () => {
  const { result } = renderHook(() => useFramePlayer(5));
  expect(result.current.index).toBe(0);
  expect(result.current.playing).toBe(false);
  expect(result.current.atStart).toBe(true);
});

test('next advances, prev retreats', () => {
  const { result } = renderHook(() => useFramePlayer(5));
  act(() => result.current.next());
  expect(result.current.index).toBe(1);
  act(() => result.current.prev());
  expect(result.current.index).toBe(0);
});

test('clamps at both ends instead of wrapping', () => {
  const { result } = renderHook(() => useFramePlayer(3));
  act(() => result.current.prev());
  expect(result.current.index).toBe(0);
  act(() => result.current.last());
  expect(result.current.index).toBe(2);
  act(() => result.current.next());
  expect(result.current.index).toBe(2);
  expect(result.current.atEnd).toBe(true);
});

test('seek clamps out-of-range values', () => {
  const { result } = renderHook(() => useFramePlayer(3));
  act(() => result.current.seek(99));
  expect(result.current.index).toBe(2);
  act(() => result.current.seek(-4));
  expect(result.current.index).toBe(0);
});

test('playing advances one frame per tick', () => {
  const { result } = renderHook(() => useFramePlayer(4));
  act(() => result.current.play());
  expect(result.current.playing).toBe(true);
  act(() => vi.advanceTimersByTime(800));
  expect(result.current.index).toBe(1);
  act(() => vi.advanceTimersByTime(800));
  expect(result.current.index).toBe(2);
});

test('playback stops automatically at the last frame', () => {
  const { result } = renderHook(() => useFramePlayer(2));
  act(() => result.current.play());
  act(() => vi.advanceTimersByTime(3200));
  expect(result.current.index).toBe(1);
  expect(result.current.playing).toBe(false);
});

test('speed scales the interval', () => {
  const { result } = renderHook(() => useFramePlayer(6));
  act(() => result.current.setSpeed(4));
  act(() => result.current.play());
  act(() => vi.advanceTimersByTime(200));
  expect(result.current.index).toBe(1);
});

test('shrinking frameCount clamps the current index', () => {
  const { result, rerender } = renderHook(({ n }) => useFramePlayer(n), {
    initialProps: { n: 10 },
  });
  act(() => result.current.last());
  expect(result.current.index).toBe(9);
  rerender({ n: 3 });
  expect(result.current.index).toBe(2);
});
