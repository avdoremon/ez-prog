import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        test: {
          name: { label: 'node', color: 'green' },
          environment: 'node',
          include: [
            'packages/viz-core/**/*.{test,spec}.{ts,tsx}',
            'scripts/**/*.{test,spec}.ts',
            'apps/web/**/*.{test,spec}.ts',
          ],
          // apps/web/e2e/*.spec.ts are Playwright tests, not vitest ones; the
          // glob above would otherwise match them and fail on the unknown
          // @playwright/test runner globals.
          exclude: ['**/node_modules/**', '**/dist/**', 'apps/web/e2e/**'],
          passWithNoTests: true,
        },
      },
      {
        plugins: [react()],
        test: {
          name: { label: 'jsdom', color: 'magenta' },
          environment: 'jsdom',
          // apps/web's React island components (e.g. VizIsland.tsx) need a DOM,
          // so their .tsx tests run here, not under the plain-node apps/web
          // project above (which only matches .ts).
          include: [
            'packages/viz-react/**/*.{test,spec}.{ts,tsx}',
            'apps/web/**/*.{test,spec}.tsx',
          ],
          setupFiles: ['./packages/viz-react/test-setup.ts'],
          passWithNoTests: true,
        },
      },
    ],
  },
});
