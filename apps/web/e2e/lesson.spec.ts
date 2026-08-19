import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const LESSON = '/algorithms/binary-search/';

test('the player steps through frames', async ({ page }) => {
  await page.goto(LESSON);
  const note = page.getByTestId('note').first();
  const before = await note.textContent();
  await page.getByRole('button', { name: /next step/i }).first().click();
  expect(await note.textContent()).not.toBe(before);
});

test('the lesson has no accessibility violations', async ({ page }) => {
  await page.goto(LESSON);
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);
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
