import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator } from '@playwright/test';

const LESSON = '/algorithms/binary-search/';

const ALL_LESSONS = [
  '/data-structures/array/',
  '/data-structures/stack/',
  '/data-structures/queue/',
  '/data-structures/hash-table/',
  '/data-structures/heap/',
  '/data-structures/linked-list/',
  '/data-structures/tree/',
  '/data-structures/bst/',
  '/data-structures/graph/',
  '/data-structures/trie/',
  '/algorithms/bfs/',
  '/algorithms/binary-search/',
  '/algorithms/dfs/',
  '/algorithms/dijkstra/',
  '/algorithms/dynamic-programming/',
  '/algorithms/bubble-sort/',
  '/algorithms/greedy/',
  '/algorithms/insertion-sort/',
  '/algorithms/linear-search/',
  '/algorithms/merge-sort/',
  '/algorithms/quick-sort/',
  '/algorithms/recursion/',
  '/algorithms/selection-sort/',
  '/algorithms/sliding-window/',
  '/algorithms/two-pointer/',
  '/complexity/amortized-analysis/',
  '/complexity/best-average-worst-case/',
  '/complexity/big-o/',
];

test('the player steps through frames', async ({ page }) => {
  await page.goto(LESSON);
  const note = page.getByTestId('note').first();
  const before = await note.textContent();
  await page.getByRole('button', { name: /next step/i }).first().click();
  expect(await note.textContent()).not.toBe(before);
});

test('prose renders with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(LESSON);
  await expect(
    page.getByRole('heading', { name: 'Binary Search', exact: true }),
  ).toBeVisible();
  await context.close();
});

for (const path of ALL_LESSONS) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await page.waitForSelector('[data-testid="note"]');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  /*
   * The Definition of Done requires a lesson to read well at 360px, and
   * nothing mechanical checked it: the code panel had no styles, so its
   * `white-space: pre` content pushed every lesson page sideways (bubble-sort
   * by 110px) without failing a single gate. Long content must scroll inside
   * its own container, never drag the document.
   */
  test(`${path} does not scroll horizontally at 360px`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto(path);
    await page.waitForSelector('[data-testid="note"]');
    const overflow = await page.evaluate(() => {
      const de = document.documentElement;
      return de.scrollWidth - de.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

for (const path of ALL_LESSONS) {
  /*
   * The visualization island grows from one line to ~700px when it hydrates.
   * Unreserved, that shoved each lesson's prose down for a 0.307 cumulative
   * layout shift — worth ~15 Lighthouse performance points and invisible to
   * every other gate. Google's "good" CLS threshold is 0.1.
   */
  test(`${path} does not shift layout while the visualization hydrates`, async ({ page }) => {
    await page.goto(path);
    await page.waitForSelector('[data-testid="note"]');
    const cls = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let total = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as (PerformanceEntry & {
              value: number;
              hadRecentInput: boolean;
            })[]) {
              if (!entry.hadRecentInput) total += entry.value;
            }
          }).observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => resolve(total), 1000);
        }),
    );
    expect(cls).toBeLessThan(0.1);
  });
}

const RUNNABLE_LESSONS: { path: string; expectedText: string }[] = [
  { path: '/data-structures/array/', expectedText: '=> [4,9,8,15,16,23,42]' },
  { path: '/algorithms/recursion/', expectedText: '120' },
];

/*
 * RunnableCode hydrates with client:visible (matching Viz.astro's pattern),
 * not client:load: the CodeMirror + worker bundle only loads once the
 * "Try it" block scrolls into view. That is invisible to a human — by the
 * time someone scrolls this far and reaches for Run, hydration is long done
 * — but Playwright's own actionability scroll-then-click happens on one
 * tick, faster than the intersection-observer → dynamic-import → mount
 * chain. A click fired at an unhydrated island lands on inert static HTML
 * with no listener yet attached, and is lost — no amount of waiting
 * afterwards recovers it, since Astro islands don't replay past DOM events.
 * scrollIntoViewIfNeeded() plus an explicit wait for `.cm-content` (which
 * only exists once CodeMirror has mounted) makes the hydration finish
 * before the real interaction begins.
 */
async function waitForRunnableCodeHydrated(runnable: Locator) {
  await runnable.scrollIntoViewIfNeeded();
  await expect(runnable.locator('.cm-content')).toBeVisible();
}

for (const { path, expectedText } of RUNNABLE_LESSONS) {
  test(`${path} Run produces the expected output`, async ({ page }) => {
    await page.goto(path);
    const runnable = page.locator('.runnable-code');
    await waitForRunnableCodeHydrated(runnable);
    await runnable.getByRole('button', { name: /^run$/i }).click();
    await expect(runnable.locator('.runnable-code__output')).toContainText(expectedText);
  });

  test(`${path} Reset clears the output panel`, async ({ page }) => {
    await page.goto(path);
    const runnable = page.locator('.runnable-code');
    await waitForRunnableCodeHydrated(runnable);
    await runnable.getByRole('button', { name: /^run$/i }).click();
    await expect(runnable.locator('.runnable-code__output')).toContainText(expectedText);
    await runnable.getByRole('button', { name: /^reset$/i }).click();
    await expect(runnable.locator('.runnable-code__output')).toBeEmpty();
  });
}

test('an infinite loop in RunnableCode times out with a helpful message, no crash', async ({ page }) => {
  await page.goto('/data-structures/array/');
  const runnable = page.locator('.runnable-code');
  await waitForRunnableCodeHydrated(runnable);
  await runnable.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('while (true) {}');
  await runnable.getByRole('button', { name: /^run$/i }).click();
  await expect(runnable.locator('.runnable-code__output')).toContainText(
    /timed out after 3s/i,
    { timeout: 6000 },
  );
});

test('Reset restores edited RunnableCode content back to the original source', async ({ page }) => {
  await page.goto('/data-structures/array/');
  const runnable = page.locator('.runnable-code');
  await waitForRunnableCodeHydrated(runnable);
  await runnable.locator('.cm-content').click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('const somethingElseEntirely = 1;');
  await expect(runnable.locator('.cm-content')).toContainText('somethingElseEntirely');

  await runnable.getByRole('button', { name: /^reset$/i }).click();

  await expect(runnable.locator('.cm-content')).not.toContainText('somethingElseEntirely');
  await expect(runnable.locator('.cm-content')).toContainText('insertInto');
});

/*
 * RunnableCode hydrates with client:visible (see waitForRunnableCodeHydrated
 * above), so a naive axe run — like the ALL_LESSONS loop above, which never
 * scrolls the page — never triggers hydration for a "Try it" block this far
 * down the lesson, and silently never examines it. These two tests scroll
 * the island into view first, closing that gate blindness for the pages that
 * actually ship RunnableCode.
 */
for (const { path } of RUNNABLE_LESSONS) {
  test(`${path} RunnableCode has no accessibility violations once hydrated`, async ({ page }) => {
    await page.goto(path);
    const runnable = page.locator('.runnable-code');
    await waitForRunnableCodeHydrated(runnable);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

/*
 * Same gate-blindness problem as the axe test above, applied to the CLS
 * budget: the ALL_LESSONS CLS loop measures for 1000ms without scrolling, so
 * it never triggers client:visible hydration for RunnableCode and the
 * `.js .runnable-code__editor { min-height }` reservation in viz.css has
 * never actually been checked against a real measurement. This test starts
 * the layout-shift observer before navigating away from the initial paint,
 * then scrolls the island into view and waits for it to hydrate (the same
 * point the reservation exists to protect against), then reads the
 * accumulated shift back out.
 */
for (const { path } of RUNNABLE_LESSONS) {
  test(`${path} does not shift layout while RunnableCode hydrates`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        })[]) {
          if (!entry.hadRecentInput) {
            (window as unknown as { __cls: number }).__cls += entry.value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });

    const runnable = page.locator('.runnable-code');
    await waitForRunnableCodeHydrated(runnable);
    // Give any shift triggered by hydration a moment to be recorded by the
    // observer before reading the total back out.
    await page.waitForTimeout(500);

    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(cls).toBeLessThan(0.1);
  });
}

test('a reader with JavaScript disabled gets no reserved blank space', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/algorithms/insertion-sort/');
  const height = await page.evaluate(
    () => document.querySelector('figure.viz')!.getBoundingClientRect().height,
  );
  expect(height).toBeLessThan(400);
  await context.close();
});

test('the 3D tree view is keyboard-operable and announces the focused node', async ({ page }) => {
  await page.goto('/data-structures/tree/');
  const nodeButtons = page.locator('.tree-view-3d__node-button');
  await expect(nodeButtons.first()).toBeVisible();

  const summary = page.locator('.tree-view-3d__summary');
  const beforeFocus = await summary.textContent();
  // tree-traversal's defaultInput is a 7-node tree (see
  // apps/web/src/viz/registry.ts and packages/viz-3d/src/sceneSummary.ts) --
  // the idle summary should read as such before any node is focused, not
  // just "changed" after.
  expect(beforeFocus).toContain('Binary tree, 7 nodes, 3 levels.');

  await nodeButtons.nth(1).focus();
  await expect(summary).not.toHaveText(beforeFocus ?? '');
  await expect(summary).toContainText(/^Node 1, value/);

  await page.keyboard.press('Tab');
  await expect(summary).toContainText(/^Node 2, value/);
});

test('/data-structures/tree/ does not shift layout while the 3D view hydrates', async ({ page }) => {
  await page.goto('/data-structures/tree/');
  // Anchors this test to a genuinely hydrated page: without this, a 3D
  // island that silently failed to hydrate at all would report zero shift
  // (nothing rendered, nothing moved) and pass the CLS budget vacuously.
  await expect(page.locator('.tree-view-3d__node-button').first()).toBeVisible();
  const cls = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          })[]) {
            if (!entry.hadRecentInput) total += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(total), 1500);
      }),
  );
  expect(cls).toBeLessThan(0.1);
});

test.describe('reduced motion', () => {
  // The brief's `test.use({ reducedMotion: 'reduce' })` is the top-level
  // option shape from older @playwright/test releases; this repo is pinned
  // to 1.62.1 (.npmrc exact-pins deps), whose `PlaywrightTestOptions` moved
  // this one under `contextOptions` (see node_modules/.pnpm/@playwright+test@1.62.1
  // -> playwright/types/test.d.ts, PlaywrightTestOptions.contextOptions doc
  // example). `astro check` fails ts(2353) on the flat form.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('focusing a node snaps the camera instead of animating it', async ({ page }) => {
    await page.goto('/data-structures/tree/');
    const nodeButtons = page.locator('.tree-view-3d__node-button');
    await nodeButtons.nth(3).focus();
    // No crash, no console error, and the live region still updates --
    // the actual snap-vs-tween behavior is internal to CameraRig and not
    // independently observable from outside the canvas; this test's job
    // is to prove the reduced-motion path doesn't break anything.
    await expect(page.locator('.tree-view-3d__summary')).toContainText(/^Node 3, value/);
  });
});

test('the 3D graph view is keyboard-operable and announces neighbours', async ({ page }) => {
  await page.goto('/algorithms/bfs/');
  const nodeButtons = page.locator('.graph-view-3d__node-button');
  await expect(nodeButtons.first()).toBeVisible();

  const summary = page.locator('.graph-view-3d__summary');
  await expect(summary).toContainText('Graph, 6 nodes, 6 edges.');

  await nodeButtons.nth(0).focus();
  const announcer = page.locator('.graph-view-3d__announcer');
  await expect(announcer).toContainText('Node 0, value 0, neighbours 1, 2.');

  await page.keyboard.press('Tab');
  await expect(announcer).toContainText('Node 1, value 1');
});

test('the 3D graph view labels weighted edges and announces them per neighbour', async ({ page }) => {
  await page.goto('/algorithms/dijkstra/');
  const nodeButtons = page.locator('.graph-view-3d__node-button');
  await expect(nodeButtons.first()).toBeVisible();

  const summary = page.locator('.graph-view-3d__summary');
  await expect(summary).toContainText('Graph, 6 nodes, 7 edges.');

  await nodeButtons.nth(0).focus();
  const announcer = page.locator('.graph-view-3d__announcer');
  await expect(announcer).toContainText(
    'Node 0, value 0, neighbours 1 (weight 2), 2 (weight 1), 4 (weight 9).',
  );
});

test('the 3D graph view switches to directed wording and renders arrowheads when the learner sets directed:true', async ({ page }) => {
  await page.goto('/data-structures/graph/');
  const nodeButtons = page.locator('.graph-view-3d__node-button');
  await expect(nodeButtons.first()).toBeVisible();

  const summary = page.locator('.graph-view-3d__summary');
  const announcer = page.locator('.graph-view-3d__announcer');
  await expect(summary).toContainText('Graph, 5 nodes, 4 edges.');
  await nodeButtons.nth(0).focus();
  await expect(announcer).toContainText('Node 0, value 0, neighbours 1, 2.');

  await page.getByText('Try your own input').click();
  const editor = page.locator('.viz-input-editor');
  await editor.locator('textarea').fill(JSON.stringify({
    values: [0, 1, 2, 3, 4],
    edges: [{ from: 0, to: 1 }, { from: 0, to: 2 }, { from: 1, to: 2 }, { from: 2, to: 3 }],
    directed: true,
  }));
  await editor.getByRole('button', { name: 'Run' }).click();

  // graphIntro's defaultInput ships directed: false, so this input-editor
  // round trip is the only way the directed formatting (marksForNode's
  // wording, the arrowhead <mesh> in GraphView3D.tsx) ever gets rendered --
  // designed during the pilot but, until this migration, never exercised.
  await expect(summary).toContainText('Graph, 5 nodes, 4 directed edges.');
  await nodeButtons.nth(0).focus();
  await expect(announcer).toContainText('Node 0, value 0, points at 1, 2.');
});

test('/algorithms/bfs/ does not shift layout while the 3D view hydrates', async ({ page }) => {
  await page.goto('/algorithms/bfs/');
  // Anchors this test to a genuinely hydrated page: without this, a 3D
  // island that silently failed to hydrate at all would report zero shift
  // (nothing rendered, nothing moved) and pass the CLS budget vacuously.
  await expect(page.locator('.graph-view-3d__node-button').first()).toBeVisible();
  const cls = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let total = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as (PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          })[]) {
            if (!entry.hadRecentInput) total += entry.value;
          }
        }).observe({ type: 'layout-shift', buffered: true });
        setTimeout(() => resolve(total), 1500);
      }),
  );
  expect(cls).toBeLessThan(0.1);
});

test.describe('reduced motion (graph)', () => {
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('focusing a graph node snaps the camera instead of animating it', async ({ page }) => {
    await page.goto('/algorithms/bfs/');
    const nodeButtons = page.locator('.graph-view-3d__node-button');
    await nodeButtons.nth(2).focus();
    await expect(page.locator('.graph-view-3d__announcer')).toContainText('Node 2, value 2');
  });
});

/*
 * The dark-scheme runs are the check that was missing. Starlight hardcodes
 * data-theme="dark" on <html> and switches its text to white, which against
 * this project's pinned light --paper background gave 1.08:1 contrast on
 * headings, summaries, pagination links and inline code — every page, JS on or
 * off. It survived because the axe runs above use Chromium's default light
 * scheme. tokens.css now forces Starlight's light palette unconditionally; if
 * that block is dropped or goes stale against a Starlight upgrade, these fail.
 */
test.describe('forced light palette', () => {
  test.use({ colorScheme: 'dark' });

  for (const path of ALL_LESSONS) {
    test(`${path} stays readable when the OS asks for dark`, async ({ page }) => {
      await page.goto(path);
      await page.waitForSelector('[data-testid="note"]');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test('no theme switcher is offered', async ({ page }) => {
    await page.goto('/algorithms/insertion-sort/');
    await expect(page.locator('starlight-theme-select')).toHaveCount(0);
  });
});

/*
 * The homepage shipped as the untouched Starlight scaffold ("Congrats on
 * setting up a new Starlight project!", links to starlight.astro.build) all
 * the way through Phase 0 — the site's front door, and no gate looked at it.
 * These tests cover it the way the lessons are covered, and would fail if the
 * scaffold copy ever came back.
 */
test.describe('homepage', () => {
  test('has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test('does not scroll horizontally at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('carries no scaffold copy and links to every shipped lesson', async ({ page }) => {
    await page.goto('/');
    const body = (await page.textContent('body')) ?? '';
    expect(body).not.toMatch(/Congrats on setting up|Starlight project|Update content/i);
    await expect(page.locator('a[href*="starlight.astro.build"]')).toHaveCount(0);

    for (const path of ALL_LESSONS) {
      await expect(page.locator(`a[href="${path}"]`).first()).toBeVisible();
    }
  });
});
