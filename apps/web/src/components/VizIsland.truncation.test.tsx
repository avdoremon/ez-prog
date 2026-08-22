import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { z } from 'zod';

/**
 * The frame-cap truncation notice used to be covered by running `bubble-sort`
 * on 24 reversed values, which overflowed its 400-frame budget. That input is
 * no longer valid: `apps/web/src/viz/frame-budget.test.ts` now asserts that
 * **no** registry entry can truncate on anything its own `inputSchema`
 * accepts, and the sorts were bounded to 16 to make that true.
 *
 * So the notice is deliberately unreachable through any shipped lesson, and
 * covering it with a real entry is no longer possible — any entry that could
 * satisfy this test would be a bug in that entry. It stays covered because
 * `collect()` caps every run regardless of the schema, and a misconfigured
 * entry added later must still degrade into a visible notice rather than a
 * silently short run.
 *
 * Hence a synthetic entry, in its own file so the registry mock does not leak
 * into VizIsland.test.tsx, which exercises the real entries.
 */
vi.mock('../viz/registry.js', () => ({
  VIZ: {
    'over-budget': {
      renderer: 'ArrayView',
      label: 'Synthetic entry whose generator outruns its own frame budget',
      defaultInput: { steps: 50 },
      maxFrames: 5,
      inputSchema: z.object({ steps: z.number().int().min(1).max(100) }),
      load: async () => ({
        default: function* ({ steps }: { steps: number }) {
          for (let i = 0; i < steps; i++) {
            yield { state: [i], note: `Step ${i + 1} of ${steps}.` };
          }
        },
      }),
      code: async () => ({
        default: {
          js: 'const step = 1;', c: 'int step = 1;', py: 'step = 1',
          cpp: 'int step = 1;', java: 'int step = 1;',
        },
      }),
    },
  },
}));

const VizIsland = (await import('./VizIsland.js')).default;

test('a run that outruns its frame budget shows the truncation notice', async () => {
  render(<VizIsland id={'over-budget' as never} />);

  // The run is capped at 5 frames out of 50, so the learner must be told the
  // visualization is not the whole story rather than left thinking it ended.
  const status = await screen.findByRole('status');
  expect(status).toHaveTextContent(/stopped early/i);
});
