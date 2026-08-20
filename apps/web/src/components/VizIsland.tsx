import { useEffect, useId, useState } from 'react';
import { collect, parseAnchors, type Frame, type ParsedCode } from '@cs/viz-core';
import { ArrayView, Player, TreeView, type Renderer } from '@cs/viz-react';
import { VIZ, type VizId } from '../viz/registry.js';

interface RunData {
  frames: Frame<number[]>[];
  truncated: boolean;
  code: ParsedCode;
  /**
   * Bumped on every Run/Reset and used as the <Player> key, so a new run
   * remounts the player and starts at frame 0 (AUTHORING.md §4.7). Without
   * it the player keeps whatever index the learner had stepped to, dropping
   * them into the middle of a run they never saw start.
   */
  runId: number;
}

// Registry entries name their renderer as a string so the registry stays
// serialisable data; this is the one place that maps a name to a component.
const RENDERERS: Record<'ArrayView' | 'TreeView', Renderer> = {
  ArrayView,
  TreeView,
};

function defaultInputText(defaultInput: unknown): string {
  return JSON.stringify(defaultInput, null, 2);
}

export default function VizIsland({ id }: { id: VizId }) {
  const entry = VIZ[id];
  const [data, setData] = useState<RunData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputText, setInputText] = useState(() => defaultInputText(entry.defaultInput));
  const [inputError, setInputError] = useState<string | null>(null);

  const textareaId = useId();
  const inputErrorId = useId();

  useEffect(() => {
    let cancelled = false;
    setInputText(defaultInputText(entry.defaultInput));
    setInputError(null);
    Promise.all([entry.load(), entry.code()])
      .then(([algo, codeMod]) => {
        if (cancelled) return;
        const { frames, truncated } = collect(
          algo.default(entry.defaultInput) as Generator<Frame<number[]>>,
          entry.maxFrames,
        );
        setData({ frames, truncated, code: parseAnchors(codeMod.default.js), runId: 0 });
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => { cancelled = true; };
  }, [id, entry]);

  async function runWith(input: unknown) {
    const { load } = entry;
    const algo = await load();
    const { frames, truncated } = collect(
      algo.default(input) as Generator<Frame<number[]>>,
      entry.maxFrames,
    );
    setData((prev) =>
      prev ? { ...prev, frames, truncated, runId: prev.runId + 1 } : prev);
  }

  async function handleRun() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(inputText);
    } catch (e: unknown) {
      setInputError(
        `That isn't valid JSON: ${e instanceof Error ? e.message : String(e)}`,
      );
      return;
    }

    const result = entry.inputSchema.safeParse(parsed);
    if (!result.success) {
      setInputError(
        result.error.issues.map((issue) => issue.message).join(' ') || 'Invalid input.',
      );
      return;
    }

    setInputError(null);
    await runWith(result.data);
  }

  async function handleReset() {
    setInputText(defaultInputText(entry.defaultInput));
    setInputError(null);
    await runWith(entry.defaultInput);
  }

  if (error) return <p role="alert">This visualization failed to load: {error}</p>;
  if (!data) return <p>Loading visualization…</p>;

  return (
    <>
      <Player key={data.runId} frames={data.frames} truncated={data.truncated}
              label={entry.label} code={data.code}
              renderer={RENDERERS[entry.renderer]} />

      <details className="viz-input-editor">
        <summary>Try your own input</summary>
        <div className="viz-input-editor__body">
          <label htmlFor={textareaId}>Input JSON for {entry.label}</label>
          <textarea
            id={textareaId}
            className="viz-input-editor__textarea"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            aria-describedby={inputError ? inputErrorId : undefined}
            spellCheck={false}
            rows={6}
          />
          {inputError && (
            <p id={inputErrorId} role="alert" className="viz-input-editor__error">
              <span aria-hidden="true">⚠ </span>
              {inputError}
            </p>
          )}
          <div className="viz-input-editor__actions">
            <button type="button" onClick={() => void handleRun()}>Run</button>
            <button type="button" onClick={() => void handleReset()}>Reset</button>
          </div>
        </div>
      </details>
    </>
  );
}
