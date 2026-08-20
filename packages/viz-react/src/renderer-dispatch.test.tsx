import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import type { Frame } from '@cs/viz-core';
import { Player } from './Player.js';
import { TreeView } from './renderers/TreeView.js';

const frames: Frame<number[]>[] = [
  { state: [42, 23, 16, 4, 8], note: 'Start.' },
];

// Every renderer takes the same props, so the Player can hold any of them
// without knowing which. This is what makes a new renderer a self-contained
// addition rather than a change to the Player.
test('the Player renders the renderer it is given', () => {
  render(
    <Player frames={frames} truncated={false} label="demo" renderer={TreeView} />,
  );
  expect(screen.getByRole('tree', { name: 'demo' })).toBeInTheDocument();
});

test('the Player still defaults to ArrayView when no renderer is named', () => {
  render(<Player frames={frames} truncated={false} label="demo" />);
  expect(screen.getByRole('list', { name: 'demo' })).toBeInTheDocument();
});
