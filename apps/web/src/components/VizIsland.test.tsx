import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import VizIsland from './VizIsland.js';
import { VIZ } from '../viz/registry.js';

// The disclosure is a native <details>/<summary>. It has no implicit ARIA
// role recognised by aria-query (the role table @testing-library/dom relies
// on), so it is queried by its accessible text rather than getByRole.
async function openEditor(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByText(/try your own input/i));
}

// userEvent.type() interprets literal `{`/`}` as special-key syntax, which
// breaks on real JSON text -- paste() inserts the string verbatim instead.
async function replaceInput(user: ReturnType<typeof userEvent.setup>, text: string) {
  const textarea = screen.getByLabelText(/input json/i);
  await user.click(textarea);
  await user.clear(textarea);
  await user.paste(text);
  return textarea;
}

test('the default run shows the registry defaultInput before any edit', async () => {
  render(<VizIsland id="binary-search" />);
  expect(await screen.findByText(/searching for 23/i)).toBeInTheDocument();
});

test('editing the input and running produces a different frame sequence than the default', async () => {
  const user = userEvent.setup();
  render(<VizIsland id="binary-search" />);
  await screen.findByText(/searching for 23/i);

  await openEditor(user);
  await replaceInput(
    user,
    JSON.stringify({ arr: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 91 }),
  );
  await user.click(screen.getByRole('button', { name: /^run$/i }));

  expect(await screen.findByText(/searching for 91/i)).toBeInTheDocument();
  expect(screen.queryByText(/searching for 23/i)).not.toBeInTheDocument();
});

test('invalid input shows an inline message and leaves the previous frames rendered', async () => {
  const user = userEvent.setup();
  render(<VizIsland id="bubble-sort" />);
  await screen.findByText(/sorting 6 values/i);

  await openEditor(user);
  const tooLong = Array.from({ length: 25 }, (_, i) => i); // schema max is 24
  await replaceInput(user, JSON.stringify({ arr: tooLong }));
  await user.click(screen.getByRole('button', { name: /^run$/i }));

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(/\S/);
  // Previous frames are untouched -- default input's first frame is still shown.
  expect(screen.getByText(/sorting 6 values/i)).toBeInTheDocument();
});

test('malformed JSON shows an inline message and does not crash', async () => {
  const user = userEvent.setup();
  render(<VizIsland id="bubble-sort" />);
  await screen.findByText(/sorting 6 values/i);

  await openEditor(user);
  await replaceInput(user, '{ this is not json');
  await user.click(screen.getByRole('button', { name: /^run$/i }));

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(/\S/);
  expect(screen.getByText(/sorting 6 values/i)).toBeInTheDocument();
});

test('Reset restores the default input text and default frames', async () => {
  const user = userEvent.setup();
  render(<VizIsland id="binary-search" />);
  await screen.findByText(/searching for 23/i);

  await openEditor(user);
  await replaceInput(
    user,
    JSON.stringify({ arr: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 91 }),
  );
  await user.click(screen.getByRole('button', { name: /^run$/i }));
  await screen.findByText(/searching for 91/i);

  await user.click(screen.getByRole('button', { name: /^reset$/i }));

  await waitFor(() => {
    expect((screen.getByLabelText(/input json/i) as HTMLTextAreaElement).value).toBe(
      JSON.stringify(VIZ['binary-search'].defaultInput, null, 2),
    );
  });
  expect(await screen.findByText(/searching for 23/i)).toBeInTheDocument();
});

test('the validation message is associated with the textarea via aria-describedby', async () => {
  const user = userEvent.setup();
  render(<VizIsland id="bubble-sort" />);
  await screen.findByText(/sorting 6 values/i);

  await openEditor(user);
  const textarea = await replaceInput(user, 'not json at all');
  await user.click(screen.getByRole('button', { name: /^run$/i }));

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveAttribute('id');
  const describedBy = textarea.getAttribute('aria-describedby');
  expect(describedBy).toBe(alert.getAttribute('id'));
});

test('a large learner input still triggers the frame-cap truncation notice', async () => {
  const user = userEvent.setup();
  render(<VizIsland id="bubble-sort" />);
  await screen.findByText(/sorting 6 values/i);

  await openEditor(user);
  // Worst case for bubble sort: fully descending, at the schema's max length (24).
  const worstCase = Array.from({ length: 24 }, (_, i) => 24 - i);
  await replaceInput(user, JSON.stringify({ arr: worstCase }));
  await user.click(screen.getByRole('button', { name: /^run$/i }));

  const status = await screen.findByRole('status');
  expect(status).toHaveTextContent(/stopped early/i);
});

// AUTHORING.md §4.7 documents that a successful Run "shows the new run from
// frame 0". Before this test the player kept whatever index the learner had
// stepped to, so running new input dropped them into the middle of a run they
// had not watched start.
test('Run restarts the player at frame 0 of the new run', async () => {
  const user = userEvent.setup();
  render(<VizIsland id="binary-search" />);
  await screen.findByText(/searching for 23/i);

  await user.click(screen.getByRole('button', { name: /next step/i }));
  expect(screen.queryByText('1 / 8')).not.toBeInTheDocument();

  await openEditor(user);
  await replaceInput(user, JSON.stringify({ arr: [1, 2, 3], target: 3 }));
  await user.click(screen.getByRole('button', { name: /^run$/i }));

  await waitFor(() => {
    expect(screen.getByText(/searching for 3/i)).toBeInTheDocument();
  });
  // The counter reads "1 / n" only when the player is sitting on frame 0.
  expect(screen.getByText(/^1 \/ \d+$/)).toBeInTheDocument();
});

test('Reset restarts the player at frame 0 of the default run', async () => {
  const user = userEvent.setup();
  render(<VizIsland id="binary-search" />);
  await screen.findByText(/searching for 23/i);

  await user.click(screen.getByRole('button', { name: /next step/i }));
  await openEditor(user);
  await user.click(screen.getByRole('button', { name: /^reset$/i }));

  await waitFor(() => {
    expect(screen.getByText(/^1 \/ \d+$/)).toBeInTheDocument();
  });
});
