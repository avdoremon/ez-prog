# Phase 0 exit gate — status

Walked on 2026-08-19 against the seven criteria in
`docs/superpowers/specs/2026-08-19-phase0-foundation-design.md` §7. Six pass;
one does not, and one passes with a caveat that matters more than the tick.

| # | Criterion | Status |
|---|---|---|
| 1 | Lesson 4 built from documentation alone, no `packages/` changes, time recorded | **Pass, with a caveat** |
| 2 | All reference lessons pass the Definition of Done mechanically in CI | **Pass** |
| 3 | The Judge0 question answered in writing | **Pass** |
| 4 | Lighthouse Performance ≥ 95 on a lesson page | **Pass** (97) |
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

Exercising the lesson end to end surfaced three pre-existing engine defects that
affected all three previously shipped lessons and that no gate caught: an
unstyled code panel that scrolled every page sideways at 360px, a player that
did not restart on a new run, and a 0.307 layout shift on island hydration. All
three are fixed, each with a regression test.

## 2. Definition of Done enforced mechanically — pass

`.github/workflows/ci.yml` runs `typecheck`, `test` (128 unit/conformance
tests), `build`, `lint:content` (seven content rules), `check:offline`, and a
15-test Playwright suite covering all four lessons: axe wcag2a/wcag2aa, frame
stepping, no-JS prose, no horizontal scroll at 360px, and a 0.1 CLS budget.

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

Performance **97** on `/algorithms/insertion-sort/` (FCP 1.5s, LCP 2.6s, TBT
0ms, CLS 0). It was 79 before the layout-shift fix.

Measured against `astro preview`, which serves `dist/` without the compression
and cache headers production nginx will add (`IMPLEMENTATION_PLAN.md` §10), so
the real figure should be no worse. Other categories: Best Practices 100, SEO
100, Accessibility 97 — see the open item below for that 97.

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

## Open defect, carried out of Phase 0

**The site is unreadable with `prefers-color-scheme: dark`.** Starlight sets
`data-theme="dark"` and switches its text to white while
`apps/web/src/styles/tokens.css` pins the background to the light `--paper`
unconditionally, giving contrast ratios of 1.08–1.61 where WCAG AA requires
4.5. It affects every page and predates this task.

It escaped the gates because Playwright's axe run uses Chromium's default light
scheme; Lighthouse's mobile run caught it. The fix is a design decision — author
a dark palette, or disable the theme switcher and commit to the single light
"Trace" palette `IMPLEMENTATION_PLAN.md` §8 specifies — so it is recorded here
rather than decided unilaterally. Whichever is chosen, add a dark-scheme axe run
to the e2e suite so it cannot regress silently again.
