import { useState } from 'react';
import { collect } from '@cs/viz-core';
import { binarySearch } from '@cs/viz-core/algorithms/binary-search';
import { ArrayView } from './renderers/ArrayView.js';

export function Player() {
  const { frames } = collect(
    binarySearch({ arr: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 23 }),
  );
  const [i, setI] = useState(0);
  const f = frames[i]!;
  return (
    <div>
      <ArrayView state={f.state} marks={f.marks} label="binary search array" />
      <p data-testid="note">{f.note}</p>
      <button onClick={() => setI((n) => Math.max(0, n - 1))}>Prev</button>
      <button onClick={() => setI(0)}>Reset</button>
      <button onClick={() => setI((n) => Math.min(frames.length - 1, n + 1))}>Next</button>
      <span data-testid="counter">{i + 1} / {frames.length}</span>
    </div>
  );
}
