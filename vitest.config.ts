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
          ],
          passWithNoTests: true,
        },
      },
      {
        plugins: [react()],
        test: {
          name: { label: 'jsdom', color: 'magenta' },
          environment: 'jsdom',
          include: ['packages/viz-react/**/*.{test,spec}.{ts,tsx}'],
          setupFiles: ['./packages/viz-react/test-setup.ts'],
          passWithNoTests: true,
        },
      },
    ],
  },
});
