# CS Learning Platform

An offline-capable computer science learning site: every lesson pairs prose with
an interactive visualization you step through frame by frame, on input you
choose, with the source highlighted alongside.

Phase 0 (the foundation) is complete. See [`docs/PHASE0-EXIT.md`](docs/PHASE0-EXIT.md)
for what passed its exit gate and what did not.

## Quick start

Requires Node 24 and pnpm 11 (pinned via `packageManager`).

```bash
pnpm install
pnpm dev            # Astro dev server
```

## The gates

Every one of these runs in CI (`.github/workflows/ci.yml`) and must pass before
a change lands. Run them in this order locally:

```bash
pnpm lint:content   # eight content rules (see docs/AUTHORING.md §6)
pnpm typecheck      # tsc -b across packages, then astro check
pnpm test           # vitest: unit, property, and conformance tests
pnpm build          # the real production build, to apps/web/dist
pnpm check:offline  # scans the build for external asset references
pnpm test:e2e       # Playwright: a11y, no-JS, 360px, layout stability
```

`check:offline` requires a prior `pnpm build` — it scans build output.
`test:e2e` serves that same output.

## Layout

```
apps/web/            Astro + Starlight site, lesson content, viz registry
  src/content/docs/  the lessons themselves
  src/viz/           registry + per-language code samples
  e2e/               Playwright suite
packages/viz-core/   framework-free model: Frame, snap, collect, generators
packages/viz-react/  React renderers, Player, transport hook
packages/viz-3d/     TreeView3D, a Three.js renderer loaded on demand for one lesson
scripts/             the content lint and offline-asset gates
docs/                authoring guide, exit-gate record, spikes
```

`viz-core` holds no React and `viz-react` holds no algorithms; a lesson reusing
an existing renderer never needs to modify a file that already exists under
`packages/`.

## Writing a lesson

[`docs/AUTHORING.md`](docs/AUTHORING.md) is the complete, stand-alone guide —
frontmatter, the lesson shape, adding a visualization end to end, every lint
rule, and the Definition of Done. It was written against the real source, and a
fourth lesson was built from it alone to prove it is sufficient.

The backlog of candidate lessons lives in
[`ROADMAP-CONTENT.md`](ROADMAP-CONTENT.md). Rows marked *engine change* need a
new renderer first and must be scoped separately — not folded into a content
change.

## Not built yet

The code runner, practice problems, and progress tracking are Phase 1
(`IMPLEMENTATION_PLAN.md` §11). A judge interface and a deterministic
`MockJudge` exist; no real execution backend is wired up, and the Judge0 spike
was deliberately not run — see [`docs/spikes/`](docs/spikes/).

When client-side grading does ship, this README must carry the correction in
the design spec §4.3: hidden tests are **not displayed by default**, which stops
casual answer-peeking, but they are **not secret** — their stdin reaches the
client and the comparison runs in client JavaScript. Real secrecy needs a
backend.
