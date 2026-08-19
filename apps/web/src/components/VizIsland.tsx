import { useEffect, useState } from 'react';
import { collect, parseAnchors, type Frame, type ParsedCode } from '@cs/viz-core';
import { Player } from '@cs/viz-react';
import { VIZ, type VizId } from '../viz/registry.js';

export default function VizIsland({ id }: { id: VizId }) {
  const entry = VIZ[id];
  const [data, setData] = useState<
    { frames: Frame<number[]>[]; truncated: boolean; code: ParsedCode } | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([entry.load(), entry.code()])
      .then(([algo, codeMod]) => {
        if (cancelled) return;
        const { frames, truncated } = collect(
          algo.default(entry.defaultInput) as Generator<Frame<number[]>>,
          entry.maxFrames,
        );
        setData({ frames, truncated, code: parseAnchors(codeMod.default.js) });
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => { cancelled = true; };
  }, [id, entry]);

  if (error) return <p role="alert">This visualization failed to load: {error}</p>;
  if (!data) return <p>Loading visualization…</p>;

  return (
    <Player frames={data.frames} truncated={data.truncated}
            label={entry.label} code={data.code} />
  );
}
