import { defineConfig, devices } from '@playwright/test';
import { PREVIEW_URL } from './e2e/preview-server.js';

/**
 * E2E runs against the real production build (`astro preview` serves `dist/`),
 * not the dev server: the no-JS and accessibility guarantees this suite
 * protects are properties of what ships, and dev-server output differs.
 * `pnpm build` must therefore have run first — CI orders it that way.
 *
 * The server is started in globalSetup rather than via `webServer` because
 * Astro 7's preview daemonizes; see e2e/preview-server.ts.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  use: { baseURL: PREVIEW_URL, trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
