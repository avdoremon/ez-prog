import type { AnchorId } from './types.js';

const ANCHOR_RE = /\s*(?:\/\/|#)\s*@anchor\s+([A-Z][A-Z0-9_]*)\s*$/;

export interface ParsedCode {
  /** Source with @anchor comments removed, for display. */
  display: string;
  /** One-indexed line number for each anchor. */
  anchors: Record<AnchorId, number>;
}

export function parseAnchors(source: string): ParsedCode {
  const anchors: Record<AnchorId, number> = {};
  const lines = source.split('\n');

  const display = lines.map((line, idx) => {
    const match = ANCHOR_RE.exec(line);
    if (!match) return line;
    const id = match[1]!;
    if (id in anchors) {
      throw new Error(`parseAnchors: duplicate anchor ${id} on line ${idx + 1}`);
    }
    anchors[id] = idx + 1;
    return line.slice(0, match.index);
  });

  return { display: display.join('\n'), anchors };
}
