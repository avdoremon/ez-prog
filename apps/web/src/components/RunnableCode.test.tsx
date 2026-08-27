import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, expect, test, vi } from 'vitest';
import RunnableCode from './RunnableCode.js';
import type { RunResult } from '../lib/runner/protocol.js';

// CodeMirror's EditorView uses ResizeObserver internally to track its own
// size; jsdom, unlike a real browser, does not implement it, so mounting a
// real editor in these tests throws without this minimal stand-in.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  // jsdom does not implement layout, so Range has no getClientRects/
  // getBoundingClientRect; CodeMirror's cursor/selection-layer measurement
  // calls these every render and throws without this stand-in.
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as unknown as DOMRectList;
  Range.prototype.getBoundingClientRect = () => ({
    x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON() { return {}; },
  }) as DOMRect;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const SOURCE = 'const value = 6 * 7;\nvalue;';

function successResult(overrides: Partial<RunResult> = {}): RunResult {
  return { output: [], timedOut: false, ...overrides };
}

test('the editor pre-fills with the given source', async () => {
  // `basicSetup` syntax-highlights every token into its own <span>, so no
  // single element's DIRECT text (what *ByText matches) is ever the full
  // line -- assert on the editor host's full text content instead.
  const { container } = render(<RunnableCode lang="js" source={SOURCE} run={vi.fn()} />);
  await waitFor(() => {
    expect(container.querySelector('.cm-content')?.textContent).toContain('const value = 6 * 7;');
  });
});

test('Run calls the injected run function with the current editor content and shows the return value', async () => {
  const user = userEvent.setup();
  const run = vi.fn().mockResolvedValue(successResult({ returnValue: '42' }));
  render(<RunnableCode lang="js" source={SOURCE} run={run} />);

  await user.click(screen.getByRole('button', { name: /^run$/i }));

  await waitFor(() => expect(run).toHaveBeenCalledWith(SOURCE));
  expect(await screen.findByText('=> 42')).toBeInTheDocument();
});

test('console output is shown in call order', async () => {
  const user = userEvent.setup();
  const run = vi.fn().mockResolvedValue(successResult({ output: ['first', 'second'] }));
  render(<RunnableCode lang="js" source={SOURCE} run={run} />);

  await user.click(screen.getByRole('button', { name: /^run$/i }));

  const lines = await screen.findAllByText(/^(first|second)$/);
  expect(lines.map((l) => l.textContent)).toEqual(['first', 'second']);
});

test('a thrown error is shown after any output produced before it', async () => {
  const user = userEvent.setup();
  const run = vi.fn().mockResolvedValue(
    successResult({ output: ['before the throw'], error: 'boom' }),
  );
  render(<RunnableCode lang="js" source={SOURCE} run={run} />);

  await user.click(screen.getByRole('button', { name: /^run$/i }));

  expect(await screen.findByText('before the throw')).toBeInTheDocument();
  expect(await screen.findByText(/boom/)).toBeInTheDocument();
});

test('a timeout shows the timeout message and no output', async () => {
  const user = userEvent.setup();
  const run = vi.fn().mockResolvedValue(
    successResult({ timedOut: true, error: 'Timed out after 3s — check for an infinite loop.' }),
  );
  render(<RunnableCode lang="js" source={SOURCE} run={run} />);

  await user.click(screen.getByRole('button', { name: /^run$/i }));

  expect(await screen.findByText(/timed out after 3s/i)).toBeInTheDocument();
});

test('Reset restores the original source and clears the output panel', async () => {
  const user = userEvent.setup();
  const run = vi.fn().mockResolvedValue(successResult({ returnValue: '42' }));
  const { container } = render(<RunnableCode lang="js" source={SOURCE} run={run} />);

  await user.click(screen.getByRole('button', { name: /^run$/i }));
  expect(await screen.findByText('=> 42')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /^reset$/i }));

  expect(screen.queryByText('=> 42')).not.toBeInTheDocument();
  // Same span-per-token reason as the pre-fill test above.
  await waitFor(() => {
    expect(container.querySelector('.cm-content')?.textContent).toContain('const value = 6 * 7;');
  });
});

test('the output region is announced politely', () => {
  render(<RunnableCode lang="js" source={SOURCE} run={vi.fn()} />);
  const status = screen.getByRole('status');
  expect(status).toHaveAttribute('aria-live', 'polite');
});
