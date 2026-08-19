import type { AnchorId, ParsedCode } from '@cs/viz-core';

/**
 * `role="region"` + `tabIndex={0}` are load-bearing, not decoration: the panel
 * scrolls horizontally on narrow screens (`.code-panel` in
 * apps/web/src/styles/viz.css), and a scrollable region that cannot receive
 * focus is unreachable for keyboard-only users — axe's
 * scrollable-region-focusable rule, WCAG 2.1.1. The region needs a name to be
 * announced, hence aria-label.
 */
export function CodePanel({ code, active }: { code: ParsedCode; active?: AnchorId }) {
  const activeLine = active ? code.anchors[active] : undefined;
  return (
    <pre className="code-panel" role="region" aria-label="Code sample" tabIndex={0}><code>
      {code.display.split('\n').map((line, i) => (
        <span key={i} className="code-panel__line"
              data-active={activeLine === i + 1 ? 'true' : undefined}>
          {line || ' '}{'\n'}
        </span>
      ))}
    </code></pre>
  );
}
