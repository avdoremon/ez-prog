import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// @testing-library/react's auto-cleanup relies on a global `afterEach`,
// which only exists when vitest's `test.globals` is enabled. This project
// does not enable globals, so register cleanup explicitly to avoid DOM
// leaking between tests within the same file.
afterEach(() => {
  cleanup();
});
