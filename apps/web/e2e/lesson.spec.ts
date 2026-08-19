import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = '/algorithms/binary-search/';

const ALL_LESSONS = [
  '/algorithms/binary-search/',
  '/algorithms/bubble-sort/',
  '/algorithms/insertion-sort/',
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
