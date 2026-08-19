import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import type { Frame } from '@cs/viz-core';
import { Player } from './Player.js';

const frames: Frame<number[]>[] = [
  { state: [3, 1], note: 'Start.', vars: { i: 0 } },
  { state: [1, 3], note: 'Swapped.', vars: { i: 1 },
    marks: [{ kind: 'swap', at: { t: 'range', from: 0, to: 1 } }] },
];

test('shows the first frame note and position on mount', () => {
  render(<Player frames={frames} truncated={false} label="demo" />);
  expect(screen.getByText('Start.')).toBeInTheDocument();
  expect(screen.getByText('1 / 2')).toBeInTheDocument();
});

test('the next button advances the frame', async () => {
  const user = userEvent.setup();
  render(<Player frames={frames} truncated={false} label="demo" />);
  await user.click(screen.getByRole('button', { name: /next step/i }));
  expect(screen.getByText('Swapped.')).toBeInTheDocument();
});

test('arrow keys step through frames', async () => {
  const user = userEvent.setup();
  render(<Player frames={frames} truncated={false} label="demo" />);
  await user.click(screen.getByRole('group', { name: /playback/i }));
  await user.keyboard('{ArrowRight}');
  expect(screen.getByText('Swapped.')).toBeInTheDocument();
  await user.keyboard('{ArrowLeft}');
  expect(screen.getByText('Start.')).toBeInTheDocument();
});

test('Home and End jump to the ends', async () => {
  const user = userEvent.setup();
  render(<Player frames={frames} truncated={false} label="demo" />);
  await user.click(screen.getByRole('group', { name: /playback/i }));
  await user.keyboard('{End}');
  expect(screen.getByText('2 / 2')).toBeInTheDocument();
  await user.keyboard('{Home}');
  expect(screen.getByText('1 / 2')).toBeInTheDocument();
});

test('the vars panel shows the current frame variables', async () => {
  const user = userEvent.setup();
  render(<Player frames={frames} truncated={false} label="demo" />);
  expect(screen.getByRole('row', { name: /i 0/ })).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /next step/i }));
  expect(screen.getByRole('row', { name: /i 1/ })).toBeInTheDocument();
});

test('the rail is a slider bound to the frame index', async () => {
  const user = userEvent.setup();
  render(<Player frames={frames} truncated={false} label="demo" />);
  const rail = screen.getByRole('slider', { name: /step/i });
  // jest-dom reports a NUMBER for range inputs, not a string.
  expect(rail).toHaveValue(0);
  expect(rail).toHaveAttribute('aria-valuetext', 'Step 1 of 2');
  await user.click(screen.getByRole('button', { name: /next step/i }));
  expect(rail).toHaveValue(1);
});

test('a truncation warning appears only when truncated', () => {
  const { rerender } = render(<Player frames={frames} truncated={false} label="demo" />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  rerender(<Player frames={frames} truncated label="demo" />);
  expect(screen.getByRole('status')).toHaveTextContent(/stopped early/i);
});

test('the note region is a live region for screen readers', () => {
  render(<Player frames={frames} truncated={false} label="demo" />);
  expect(screen.getByTestId('note')).toHaveAttribute('aria-live', 'polite');
});
