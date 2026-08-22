# web

The Astro + Starlight site: lesson content, the visualization registry, and the
Playwright suite.

Commands are run from the repository root (`pnpm dev`, `pnpm build`,
`pnpm test:e2e`, …) — see the [root README](../../README.md) for the full list
of gates and the order to run them in.

## What lives here

```
src/content/docs/   the lessons (.mdx), one file per lesson
src/viz/            registry.ts + per-language, anchor-tagged code samples
src/components/     Viz.astro (no-JS fallback) and the VizIsland React island
src/styles/         design tokens and visualization styling
e2e/                Playwright: a11y, no-JS, 360px, layout stability
```

Renderers and the frame model are not here — they live in `packages/viz-react`
and `packages/viz-core`.

## Adding a lesson

Read [`docs/AUTHORING.md`](../../docs/AUTHORING.md). It covers the frontmatter
schema, the lesson shape, how to register a visualization, and the eight
`lint:content` rules that will fail you.

## Notes specific to this app

- The site renders one light palette by design; `src/styles/tokens.css` forces
  it regardless of `data-theme`, and the theme switcher is removed. See
  `docs/PHASE0-EXIT.md` if you are considering a dark theme.
- `astro preview` daemonizes in this Astro version, which is why the E2E suite
  starts it from `e2e/preview-server.ts` rather than Playwright's `webServer`.
