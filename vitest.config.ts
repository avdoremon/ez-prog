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
          ],
          passWithNoTests: true,
        },
      },
      {
        test: {
          name: { label: 'jsdom', color: 'magenta' },
          environment: 'jsdom',
          include: ['packages/viz-react/**/*.{test,spec}.{ts,tsx}'],
          passWithNoTests: true,
        },
      },
    ],
  },
});
