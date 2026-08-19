import type { AnchorId, ParsedCode } from '@cs/viz-core';

export function CodePanel({ code, active }: { code: ParsedCode; active?: AnchorId }) {
  const activeLine = active ? code.anchors[active] : undefined;
  return (
    <pre className="code-panel"><code>
      {code.display.split('\n').map((line, i) => (
        <span key={i} className="code-panel__line"
              data-active={activeLine === i + 1 ? 'true' : undefined}>
          {line || ' '}{'\n'}
        </span>
      ))}
    </code></pre>
  );
}
