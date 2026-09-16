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

// jsdom does not implement window.matchMedia at all. Every 3D renderer's
// usePrefersReducedMotion hook calls it unconditionally, and -- since
// every ArrayView lesson has now migrated to BarView3D (no plain-array
// lesson exists to route a jsdom test away from this dependency anymore,
// unlike the earlier fix in VizIsland.test.tsx's history) -- any test
// that renders a full lesson through VizIsland now exercises a 3D
// renderer regardless of which lesson id it picks. A minimal polyfill
// (matches: false, so tests run as if the OS has no reduced-motion
// preference) is simpler and more durable than special-casing lesson
// ids ever again.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
