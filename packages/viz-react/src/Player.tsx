import { useCallback } from 'react';
import type { Frame, ParsedCode } from '@cs/viz-core';
import { ArrayView } from './renderers/ArrayView.js';
import { CodePanel } from './CodePanel.js';
import { FrameRail } from './FrameRail.js';
import { useFramePlayer } from './useFramePlayer.js';
import { VarsPanel } from './VarsPanel.js';

const SPEEDS = [0.5, 1, 2, 4];

export interface PlayerProps {
  frames: Frame<number[]>[];
  truncated: boolean;
  label: string;
  code?: ParsedCode;
}

export function Player({ frames, truncated, label, code }: PlayerProps) {
  const p = useFramePlayer(frames.length);
  const frame = frames[p.index]!;

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const actions: Record<string, () => void> = {
        ArrowRight: p.next, ArrowLeft: p.prev,
        Home: p.first, End: p.last,
        ' ': p.toggle, r: p.first, R: p.first,
      };
      const action = actions[e.key];
      if (!action) return;
      e.preventDefault();
      action();
    },
    [p],
  );

  return (
    <div className="player" onKeyDown={onKeyDown}>
      <ArrayView state={frame.state} marks={frame.marks} label={label} />

      {code && <CodePanel code={code} active={frame.line} />}

      <p className="player__note" data-testid="note" aria-live="polite">{frame.note}</p>
      <VarsPanel vars={frame.vars} />

      {truncated && (
        <p role="status" className="player__warning">
          This run stopped early at the step limit. Try a smaller input.
        </p>
      )}

      <div role="group" aria-label="Playback controls" tabIndex={0} className="player__controls">
        <button onClick={p.first} disabled={p.atStart} aria-label="First step">⏮</button>
        <button onClick={p.prev} disabled={p.atStart} aria-label="Previous step">◀</button>
        <button onClick={p.toggle} aria-label={p.playing ? 'Pause' : 'Play'}>
          {p.playing ? '⏸' : '▶'}
        </button>
        <button onClick={p.next} disabled={p.atEnd} aria-label="Next step">▶|</button>
        <button onClick={p.last} disabled={p.atEnd} aria-label="Last step">⏭</button>

        <FrameRail index={p.index} count={frames.length} onSeek={p.seek} />
        <span className="player__counter">{p.index + 1} / {frames.length}</span>

        <label>
          <span className="visually-hidden">Speed</span>
          <select value={p.speed} onChange={(e) => p.setSpeed(Number(e.target.value))}>
            {SPEEDS.map((s) => <option key={s} value={s}>{s}×</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
