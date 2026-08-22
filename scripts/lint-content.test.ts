import { expect, test } from 'vitest';
import type { Frame } from '@cs/viz-core';
import { lintContent, type VizRegistry } from './lint-content.js';

const fixture = (name: string) => `scripts/fixtures/${name}`;

/**
 * Test-only broken registries, injected explicitly into `lintContent` per
 * test rather than baked into lint-content.ts. Keeping them here (not in
 * the script) closes the hole a shipped fallback map would open: a lesson
 * naming an id that only "exists" in some fallback would slip past rule 5
 * (viz-id-exists) instead of failing it. These are never consulted unless
 * a test passes them explicitly, so the default registry a lesson is
 * checked against is always the real production one.
 */
const runawayRegistry: VizRegistry = {
  'runaway-generator': {
    defaultInput: undefined,
    // Small on purpose: the generator below truly never terminates, so the
    // cap must still be reached in a handful of iterations for a fast test.
    maxFrames: 5,
    load: async () => ({
      default: function* (): Generator<Frame> {
        for (;;) {
          yield { state: undefined, note: 'Looping forever.', line: 'LOOP' };
        }
      },
    }),
    code: async () => ({
      default: {
        js: '// @anchor LOOP\n',
        c: '// @anchor LOOP\n',
        py: '# @anchor LOOP\n',
        cpp: '// @anchor LOOP\n',
        java: '// @anchor LOOP\n',
      },
    }),
  },
};

const missingAnchorRegistry: VizRegistry = {
  'missing-anchor': {
    defaultInput: undefined,
    load: async () => ({
      default: function* (): Generator<Frame> {
        yield { state: undefined, note: 'Step A happens.', line: 'STEP_A' };
        yield { state: undefined, note: 'Step B happens.', line: 'STEP_B' };
      },
    }),
    code: async () => ({
      default: {
        js: '// @anchor STEP_A\n// @anchor STEP_B\n',
        // c intentionally omits STEP_B to trip anchor-coverage.
        c: '// @anchor STEP_A\n',
        py: '# @anchor STEP_A\n# @anchor STEP_B\n',
        cpp: '// @anchor STEP_A\n// @anchor STEP_B\n',
        java: '// @anchor STEP_A\n// @anchor STEP_B\n',
      },
    }),
  },
};

test('rule 1: a DSA lesson without a viz is rejected', async () => {
  const errors = await lintContent(fixture('no-viz'));
  expect(errors.map((e) => e.rule)).toContain('dsa-requires-viz');
});

test('rule 2: a prerequisite pointing at a missing slug is rejected', async () => {
  const errors = await lintContent(fixture('bad-prereq'));
  expect(errors.map((e) => e.rule)).toContain('prerequisite-exists');
});

// Regression test: scripts/fixtures/bad-prereq/lesson.mdx keeps
// `prerequisites:` as the LAST frontmatter field on purpose (see the
// comment in that fixture). A regex-based frontmatter parser silently
// dropped the last field because the closing "---" consumed its trailing
// newline first, so this fixture would previously report zero errors
// instead of `prerequisite-exists`. Parsing frontmatter as real YAML fixes
// this regardless of field order, and this test pins the fix.
test('rule 2: a missing prerequisite is still caught when it is the last frontmatter field', async () => {
  const errors = await lintContent(fixture('bad-prereq'));
  expect(errors.map((e) => e.rule)).toContain('prerequisite-exists');
});

// Companion to the regression test above: a VALID prerequisite as the last
// frontmatter field must not be reported either (no false positive from
// the same fix). See scripts/fixtures/clean/algorithms/next-lesson.mdx.
test('rule 2: a valid prerequisite as the last frontmatter field is not rejected', async () => {
  const errors = await lintContent(fixture('clean'));
  expect(errors.map((e) => e.rule)).not.toContain('prerequisite-exists');
});

test('rule 3: prose over 700 words is rejected', async () => {
  const errors = await lintContent(fixture('too-long'));
  expect(errors.map((e) => e.rule)).toContain('prose-word-limit');
});

test('rule 3: code blocks do NOT count toward the word limit', async () => {
  const errors = await lintContent(fixture('long-code-short-prose'));
  expect(errors.map((e) => e.rule)).not.toContain('prose-word-limit');
});

test('rule 4: a code block without a language is rejected', async () => {
  const errors = await lintContent(fixture('untagged-code'));
  expect(errors.map((e) => e.rule)).toContain('code-block-language');
});

test('rule 5: a viz id missing from the registry is rejected', async () => {
  const errors = await lintContent(fixture('unknown-viz'));
  expect(errors.map((e) => e.rule)).toContain('viz-id-exists');
});

// Regression test for the fallback-map bypass: `missing-anchor` and
// `runaway-generator` are real ids ONLY inside the private registries the
// rule 6/7 tests inject below. Checked against the default (real) registry,
// with no injected registry, they must still fail rule 5 -- there is no
// hidden map inside lint-content.ts that would let them slip through.
test('rule 5: an id that only exists in a test-injected registry is rejected under the default registry', async () => {
  const errorsForMissingAnchorId = await lintContent(fixture('missing-anchor'));
  expect(errorsForMissingAnchorId.map((e) => e.rule)).toContain('viz-id-exists');

  const errorsForRunawayId = await lintContent(fixture('runaway-generator'));
  expect(errorsForRunawayId.map((e) => e.rule)).toContain('viz-id-exists');
});

test('rule 6: an anchor missing from one language sample is rejected', async () => {
  const errors = await lintContent(fixture('missing-anchor'), missingAnchorRegistry);
  expect(errors.map((e) => e.rule)).toContain('anchor-coverage');
});

test('rule 7: a generator exceeding MAX_FRAMES on its default input is rejected', async () => {
  const errors = await lintContent(fixture('runaway-generator'), runawayRegistry);
  expect(errors.map((e) => e.rule)).toContain('frame-budget');
});

test('a clean lesson produces no errors', async () => {
  expect(await lintContent(fixture('clean'))).toEqual([]);
});

// Regression test for the file-discovery filter: the original code only
// matched `.mdx`, so a plain `.md` lesson (a natural choice for a
// prose-only page -- Starlight serves both extensions) silently skipped
// every one of the seven rules. scripts/fixtures/bad-prereq-md/lesson.md
// reuses prerequisite-exists -- the same rule that caught this in the
// real content directory during review -- to prove `.md` files are now
// discovered and linted exactly like `.mdx` files.
test('a .md lesson (not .mdx) is discovered and linted', async () => {
  const errors = await lintContent(fixture('bad-prereq-md'));
  expect(errors.map((e) => e.rule)).toContain('prerequisite-exists');
});

// scripts/fixtures/clean/notes.md sits alongside the .mdx lessons in the
// same clean fixture, so this also proves mixed .md/.mdx directories
// produce zero false positives once both extensions are discovered.
test('a clean lesson with both .md and .mdx files produces no errors', async () => {
  expect(await lintContent(fixture('clean'))).toEqual([]);
});

test('every error names a file and is human-readable', async () => {
  const errors = await lintContent(fixture('no-viz'));
  for (const e of errors) {
    expect(e.file).toBeTruthy();
    expect(e.message.length).toBeGreaterThan(10);
  }
});

/*
 * Rule 8 (code-line-length) exists because of a defect that shipped past a
 * green e2e run. A fenced line of 84 characters in the Dijkstra lesson made
 * Expressive Code's rendered <pre> horizontally scrollable, which fails axe's
 * `scrollable-region-focusable` (wcag2a): a scroll region no keyboard can
 * reach. The e2e suite DOES catch it -- but only intermittently, because
 * overflow depends on whether the web font has loaded when axe runs, so the
 * same commit passed and failed `pnpm test:e2e` on consecutive runs. These
 * tests make the check deterministic and cheap, at authoring time.
 */
test('rule 8: a fenced line wider than the rendered column is rejected', async () => {
  const errors = await lintContent(fixture('long-code-line'));
  expect(errors.map((e) => e.rule)).toContain('code-line-length');
});

test('rule 8: the message names the offending line and its width', async () => {
  const [error] = (await lintContent(fixture('long-code-line')))
    .filter((e) => e.rule === 'code-line-length');
  // An author who cannot see WHICH line is too long has to bisect the file by
  // hand, so the line number and both widths are part of the contract.
  expect(error?.message).toMatch(/line 11/);
  expect(error?.message).toMatch(/78/);
  expect(error?.message).toMatch(/68/);
});

// Boundary, pinned from the other side: scripts/fixtures/clean carries a
// fenced line of exactly 68 characters. At the limit must pass, or the rule
// would be off by one and reject conforming lessons.
test('rule 8: a line of exactly the limit is allowed', async () => {
  const errors = await lintContent(fixture('clean'));
  expect(errors.map((e) => e.rule)).not.toContain('code-line-length');
});

// The rule guards a rendering property, not a language one: a long line in a
// ```text block overflows the same <pre> and trips the same axe rule.
test('rule 8: an untagged-language fence is measured too', async () => {
  const errors = await lintContent(fixture('untagged-code'));
  expect(errors.map((e) => e.rule)).not.toContain('code-line-length');
});

// The real lessons must already satisfy the rule the moment it lands --
// otherwise this ships a red gate. The limit (68) was chosen from a browser
// measurement, not taste: see the derivation in lint-content.ts.
test('rule 8: every shipped lesson already satisfies the limit', async () => {
  const errors = await lintContent('apps/web/src/content/docs');
  expect(errors.filter((e) => e.rule === 'code-line-length')).toEqual([]);
});
