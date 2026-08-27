import { useEffect, useRef, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { runJs } from '../lib/runner/index.js';
import type { RunResult } from '../lib/runner/protocol.js';

export interface RunnableCodeProps {
  /** Only value today; widens when a Pyodide-backed runner lands (design spec §3). */
  lang: 'js';
  /** Initial editor content, from the MDX author. */
  source: string;
  /** Injectable for tests; defaults to the real runJs from lib/runner. */
  run?: (source: string) => Promise<RunResult>;
}

export default function RunnableCode({ source, run = runJs }: RunnableCodeProps) {
  const editorHostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const view = new EditorView({
      doc: source,
      extensions: [basicSetup, javascript(), EditorView.lineWrapping],
      parent: editorHostRef.current!,
    });
    viewRef.current = view;
    return () => view.destroy();
    // Reset (below) mutates the existing view directly instead of depending
    // on `source` here, so this effect is meant to run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRun() {
    setRunning(true);
    const currentSource = viewRef.current?.state.doc.toString() ?? source;
    const runResult = await run(currentSource);
    setResult(runResult);
    setRunning(false);
  }

  function handleReset() {
    const view = viewRef.current;
    if (view) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: source } });
    }
    setResult(null);
  }

  return (
    <div className="runnable-code">
      <div className="runnable-code__editor" ref={editorHostRef} />
      <noscript>
        <pre className="runnable-code__fallback">{source}</pre>
      </noscript>
      <div className="runnable-code__actions">
        <button type="button" onClick={() => void handleRun()} disabled={running}>
          {running ? 'Running…' : 'Run'}
        </button>
        <button type="button" onClick={handleReset} disabled={running}>Reset</button>
      </div>
      <div role="status" aria-live="polite" className="runnable-code__output">
        {result && <RunOutput result={result} />}
      </div>
    </div>
  );
}

function RunOutput({ result }: { result: RunResult }) {
  if (result.timedOut) {
    return (
      <p className="runnable-code__error">
        <span aria-hidden="true">⚠ </span>{result.error}
      </p>
    );
  }
  return (
    <>
      {result.output.map((line, i) => (
        <pre key={i} className="runnable-code__line">{line}</pre>
      ))}
      {result.returnValue !== undefined && (
        <pre className="runnable-code__return">{`=> ${result.returnValue}`}</pre>
      )}
      {result.error && (
        <p className="runnable-code__error">
          <span aria-hidden="true">⚠ </span>{result.error}
        </p>
      )}
    </>
  );
}
