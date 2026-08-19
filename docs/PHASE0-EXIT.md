# Phase 0 exit gate — status

Walked on 2026-08-19 against the seven criteria in
`docs/superpowers/specs/2026-08-19-phase0-foundation-design.md` §7. Six pass;
one does not, and one passes with a caveat that matters more than the tick.

| # | Criterion | Status |
|---|---|---|
| 1 | Lesson 4 built from documentation alone, no `packages/` changes, time recorded | **Pass, with a caveat** |
| 2 | All reference lessons pass the Definition of Done mechanically in CI | **Pass** |
| 3 | The Judge0 question answered in writing | **Pass** |
| 4 | Lighthouse Performance ≥ 95 on a lesson page | **Pass** (95) |
| 5 | A lesson is readable with JavaScript disabled | **Pass** |
| 6 | `ROADMAP-CONTENT.md` frozen | **Pass** |
| 7 | Phase 1's lesson count set from the measured cost | **Not met** |

## 1. The fourth-lesson test — pass, with a caveat

`/algorithms/insertion-sort` was built from `docs/AUTHORING.md` alone in
**3 minutes 36 seconds**, adding only new files — no file that already existed
under `packages/` was edited for the content.

The caveat: the run was executed by an AI agent, not a person, so the elapsed
time is not the human authoring cost the schedule depends on. Full reasoning in
`ROADMAP-CONTENT.md`, "The measurement".

Exercising the lesson end to end surfaced four pre-existing engine defects that
affected all three previously shipped lessons and that no gate caught: an
unstyled code panel that scrolled every page sideways at 360px, a player that
did not restart on a new run, a 0.307 layout shift on island hydration, and a
site that was unreadable whenever the OS asked for dark mode. All four are
fixed, each with a regression test.

## 2. Definition of Done enforced mechanically — pass

`.github/workflows/ci.yml` runs `typecheck`, `test` (128 unit/conformance
tests), `build`, `lint:content` (seven content rules), `check:offline`, and a
20-test Playwright suite covering all four lessons: axe wcag2a/wcag2aa in both
the default and dark colour schemes, frame stepping, no-JS prose, no horizontal
scroll at 360px, and a 0.1 CLS budget.

Verified the gate bites rather than merely existing: deleting `viz:` from
`binary-search.mdx` fails `lint:content` with `[dsa-requires-viz]` and exit
code 1; reverting the `.code-panel` CSS fails the 360px test on all four
lessons.

**Not verified:** that the workflow itself runs green on GitHub. This
repository has no remote configured, so every gate was exercised locally with
the same commands the workflow invokes. The workflow's own syntax and runner
behaviour remain unproven until the first push.

## 3. Judge0 — pass

Answered in writing in `docs/spikes/2026-08-judge0-wsl2.md`: the spike was
**not run**, with prerequisites and fallbacks recorded. §7 accepts either
outcome provided it is written down.

## 4. Lighthouse — pass

Performance **95** on `/algorithms/insertion-sort/` (CLS 0, TBT 0ms). It was 79
before the layout-shift fix, and measures 95–97 across runs.

Measured against `astro preview`, which serves `dist/` without the compression
and cache headers production nginx will add (`IMPLEMENTATION_PLAN.md` §10), so
the real figure should be no worse. Other categories: Best Practices 100, SEO
100, Accessibility 100.

## 5. Readable with JavaScript disabled — pass

Covered by an e2e test: with JS disabled the heading and prose render, and the
`<noscript>` fallback names what the visualization would have shown. A second
test asserts the no-JS reader is not given the ~700px of blank space reserved
for the island when JS is on.

## 6. `ROADMAP-CONTENT.md` frozen — pass

Frozen as of this walk: insertion sort moved to Shipped, the measurement and the
engine gaps recorded, every other row left as backlog.

## 7. Phase 1's lesson count — NOT MET

This is the gate's stated real purpose, and it is the one item that fails.

The count cannot be set from a 3m36s agent run without making the schedule a
fiction. `IMPLEMENTATION_PLAN.md` §14's "~35 lessons" remains neither confirmed
nor refuted. **A human should author lesson 5 (selection sort — same renderer,
same shape) with a timer before Phase 1's scope is committed.**

## Resolved during the walk: dark-mode unreadability

**The site was unreadable with `prefers-color-scheme: dark`.** Starlight
hardcodes `data-theme="dark"` onto `<html>` and switches its text to white,
while `apps/web/src/styles/tokens.css` pinned the background to the light
`--paper`. The result was contrast ratios of 1.08–1.61 where WCAG AA requires
4.5, on every page, with JavaScript on or off. It predated this task and
escaped the gates because Playwright's axe runs use Chromium's default light
scheme; only Lighthouse's mobile run caught it.

Resolved by decision: this project has **one palette**, the light "Trace"
palette `IMPLEMENTATION_PLAN.md` §8 specifies, and no dark palette was ever
designed. Three changes make that real rather than aspirational:

- `tokens.css` re-declares Starlight's own light values under its dark
  selector, so the light palette applies unconditionally. The values are copied
  verbatim from `@astrojs/starlight@0.41.7/style/props.css`; dependencies are
  exact-pinned, so they cannot drift without a deliberate upgrade.
- Expressive Code is pinned to a single light code theme. It keeps its own
  theme pair, independent of the `--sl-color-*` variables, and was still
  painting dark syntax colours onto the now-light background (#c792ea on
  #edeef3, 2.07:1).
- The theme switcher is removed (`src/components/EmptyThemeSelect.astro`)
  rather than left as a control that changes nothing.

Lighthouse Accessibility went 97 → 100. The e2e suite gained a dark-scheme axe
run over all four lessons plus an assertion that no switcher is offered, so
this cannot regress silently. If a dark palette is ever designed, restore
Starlight's default `ThemeSelect` and drop the forced block in `tokens.css`.
