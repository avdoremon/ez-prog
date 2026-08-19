import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { parseAnchors } from '@cs/viz-core';
import { CodePanel } from './CodePanel.js';

const code = parseAnchors(
  [
    'function demo(arr) {',
    '  const aVeryLongLineThatWillNotFitOnA360PixelWideScreenAtAll = arr; // @anchor INIT',
    '  return aVeryLongLineThatWillNotFitOnA360PixelWideScreenAtAll;',
    '}',
  ].join('\n'),
);

// The panel scrolls horizontally on narrow screens (see .code-panel in
// apps/web/src/styles/viz.css). A scrollable region that cannot be focused is
// unreachable for keyboard-only users — axe's scrollable-region-focusable
// (WCAG 2.1.1) — so the panel must be tabbable and carry an accessible name.
test('the code panel is keyboard-focusable', () => {
  render(<CodePanel code={code} />);
  expect(screen.getByRole('region', { name: /code/i })).toHaveAttribute('tabindex', '0');
});

test('the code panel has an accessible name', () => {
  render(<CodePanel code={code} />);
  expect(screen.getByRole('region', { name: /code/i })).toBeInTheDocument();
});

test('the active anchor line is marked', () => {
  const { container } = render(<CodePanel code={code} active="INIT" />);
  const active = container.querySelectorAll('[data-active="true"]');
  expect(active).toHaveLength(1);
  expect(active[0]!.textContent).toContain('aVeryLongLine');
});

test('anchor comments are stripped from the displayed source', () => {
  render(<CodePanel code={code} />);
  expect(screen.getByRole('region', { name: /code/i }).textContent).not.toContain('@anchor');
});
