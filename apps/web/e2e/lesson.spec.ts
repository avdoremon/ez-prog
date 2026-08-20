import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = '/algorithms/binary-search/';

const ALL_LESSONS = [
  '/algorithms/binary-search/',
  '/algorithms/bubble-sort/',
  '/algorithms/insertion-sort/',
  '/algorithms/linear-search/',
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
