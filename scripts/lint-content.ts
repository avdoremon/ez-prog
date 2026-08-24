import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { collect, MAX_FRAMES, parseAnchors, type Frame, type VizAlgorithm } from '@cs/viz-core';
import { VIZ } from '../apps/web/src/viz/registry.js';

export interface LintError { rule: string; file: string; message: string }

const DSA_PREFIXES = ['data-structures/', 'algorithms/', 'complexity/'];
const WORD_LIMIT = 700;

/**
 * Maximum characters in a fenced code line.
 *
 * Not a style preference, and not a guess. Expressive Code renders each fence
 * as a `<pre>` that measures exactly 630px in the content column at the e2e
 * suite's 1280px viewport, in a monospace face whose character advance
 * measures 8.64px. So 72 characters fit, and the 73rd makes the `<pre>` scroll
 * sideways — a scrollable region with no keyboard access, which fails axe's
 * `scrollable-region-focusable` (wcag2a).
 *
 * 68 keeps margin below that 72, because the fallback font's metrics differ
 * from the web font's. That difference is also why the e2e suite caught this
 * only intermittently when an 84-character line shipped in the Dijkstra
 * lesson: whether the `<pre>` overflowed depended on whether the web font had
 * loaded by the time axe ran, so the same commit passed and failed
 * `pnpm test:e2e` on consecutive runs. This rule is the deterministic check.
 *
 * If the content column or the code font changes, re-derive rather than nudge:
 * floor(<pre> clientWidth / character advance), less margin.
 */
const CODE_LINE_LIMIT = 68;

/**
 * Windows' `readdir` returns backslash-separated paths (see `d.parentPath`
 * below), while lesson slugs and `prerequisites` frontmatter values are
 * always written with forward slashes (e.g. `/algorithms/binary-search`).
 * Every path derived from the filesystem is funneled through this before
 * comparison so rule 2 does not fire on every valid lesson on Windows.
 */
function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

/** Strips fenced code blocks so they do not count toward the prose limit. */
function stripCodeBlocks(body: string): string {
  return body.replace(/```[\s\S]*?```/g, '');
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Columns a line occupies once rendered. Tabs advance to the next 4-column
 * stop; raw `.length` would score one, and undercount the line that overflows.
 */
function displayWidth(line: string): number {
  let width = 0;
  for (const ch of line) width = ch === '\t' ? width + 4 - (width % 4) : width + 1;
  return width;
}

/**
 * Every fenced line wider than `limit`, with its 1-based line number in the
 * file as the author sees it — frontmatter included, so the number matches
 * what their editor shows. Fence markers themselves are never measured.
 */
function overlongCodeLines(raw: string, limit: number): { line: number; width: number }[] {
  const found: { line: number; width: number }[] = [];
  let inFence = false;
  raw.split(/\r?\n/).forEach((line, i) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (!inFence) return;
    const width = displayWidth(line);
    if (width > limit) found.push({ line: i + 1, width });
  });
  return found;
}

function untaggedCodeFences(body: string): number {
  const opens = body.match(/^```(\w*)/gm) ?? [];
  // Fences alternate open/close; only odd-indexed opens are real openers.
  return opens.filter((f, i) => i % 2 === 0 && f === '```').length;
}

/**
 * Shape rules 5-7 need from a viz registry entry. The real production `VIZ`
 * (apps/web/src/viz/registry.ts) satisfies it, and it is the default for
 * the `registry` parameter below. Tests inject their OWN registry object
 * with deliberately-broken entries instead of relying on any test-only
 * entries shipping inside this file: a lesson naming an id that only
 * "exists" in a test's private registry must still fail `viz-id-exists`
 * against the real one. See lint-content.test.ts.
 */
export interface ExecutableVizEntry {
  defaultInput: unknown;
  maxFrames?: number;
  load: () => Promise<{ default: VizAlgorithm<any, any> }>;
  code: () => Promise<{ default: Record<string, string> }>;
}

export type VizRegistry = Record<string, ExecutableVizEntry>;

export async function lintContent(
  root: string,
  registry: VizRegistry = VIZ,
): Promise<LintError[]> {
  const errors: LintError[] = [];
  // Starlight serves both .md and .mdx content pages; a prose-only lesson
  // is the natural case for plain .md. Filtering on .mdx alone left the
  // gate blind to every rule on any .md lesson -- discover both
  // extensions, and strip whichever one is present when deriving a slug.
  const CONTENT_EXTENSIONS = ['.mdx', '.md'];
  const files = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter((d) => d.isFile() && CONTENT_EXTENSIONS.some((ext) => d.name.endsWith(ext)))
    .map((d) => join(d.parentPath, d.name));

  const stripContentExtension = (name: string) =>
    CONTENT_EXTENSIONS.reduce((acc, ext) => (acc.endsWith(ext) ? acc.slice(0, -ext.length) : acc), name);
  const slugFor = (file: string) => `/${stripContentExtension(toPosix(relative(root, file)))}`;
  const slugs = new Set(files.map(slugFor));

  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    // Real YAML parse, not a hand-rolled regex: a regex that requires a
    // trailing "\n" after every "- item" line silently drops the LAST
    // frontmatter field whenever the closing "---" eats its newline first
    // (`prerequisites:` as the last field previously never matched at all).
    // YAML parsing has no such positional dependency.
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
    const front = (fm?.[1] ? (parseYaml(fm[1]) as Record<string, unknown>) : {}) ?? {};
    const body = raw.slice(fm?.[0].length ?? 0);
    const rel = toPosix(relative(root, file));

    const vizId = typeof front.viz === 'string' ? front.viz : undefined;

    // Rule 1
    if (DSA_PREFIXES.some((p) => rel.startsWith(p)) && !vizId) {
      errors.push({ rule: 'dsa-requires-viz', file: rel,
        message: `DSA lessons must declare a viz. Add "viz: <id>" to the frontmatter.` });
    }

    // Rule 2
    const prerequisites = Array.isArray(front.prerequisites) ? front.prerequisites : [];
    for (const item of prerequisites) {
      const slug = typeof item === 'string' ? item : undefined;
      if (slug && !slugs.has(slug.startsWith('/') ? slug : `/${slug}`)) {
        errors.push({ rule: 'prerequisite-exists', file: rel,
          message: `Prerequisite "${slug}" does not match any lesson slug.` });
      }
    }

    // Rule 3
    //
    // `template: splash` — the landing page — is exempt, and only it. The
    // 700-word budget is a *lesson* budget (IMPLEMENTATION_PLAN.md §12,
    // AUTHORING.md §7): it keeps a lesson readable in the <= 12 minutes its
    // own frontmatter promises. The landing page is not a lesson. It is a
    // card grid indexing every lesson that exists, so its length is set by
    // how many lessons have shipped, not by how much anyone wrote — and its
    // body is mostly JSX, where `<Card title="Binary Search" icon="magnifier">`
    // scores five "words" no reader ever reads.
    //
    // Applied there, the rule was a countdown rather than a quality gate:
    // the page sat at exactly 700 words once the 23rd lesson had added its
    // card, so the 24th broke the build on a file whose prose it had not
    // touched. The only way through would have been to delete unrelated
    // homepage copy to buy room for one more link — not what this rule is
    // for, and something every later lesson would have had to do again.
    const words = countWords(stripCodeBlocks(body));
    if (front.template !== 'splash' && words > WORD_LIMIT) {
      errors.push({ rule: 'prose-word-limit', file: rel,
        message: `Prose is ${words} words; the limit is ${WORD_LIMIT} (code blocks excluded).` });
    }

    // Rule 4
    if (untaggedCodeFences(body) > 0) {
      errors.push({ rule: 'code-block-language', file: rel,
        message: `A fenced code block does not declare its language.` });
    }

    // Rule 8
    for (const { line, width } of overlongCodeLines(raw, CODE_LINE_LIMIT)) {
      errors.push({ rule: 'code-line-length', file: rel,
        message: `Code line ${line} is ${width} characters; the limit is ${CODE_LINE_LIMIT}. ` +
                 `Longer lines make the rendered <pre> scroll sideways, which fails axe's ` +
                 `scrollable-region-focusable (wcag2a). Split the line.` });
    }

    // Rules 5-7
    if (vizId) {
      const entry: ExecutableVizEntry | undefined = registry[vizId];
      if (!entry) {
        errors.push({ rule: 'viz-id-exists', file: rel,
          message: `viz "${vizId}" is not in src/viz/registry.ts.` });
        continue;
      }

      const [algo, codeMod] = await Promise.all([entry.load(), entry.code()]);
      const { frames, truncated } = collect(
        algo.default(entry.defaultInput) as Generator<Frame<number[]>>,
        entry.maxFrames ?? MAX_FRAMES,
      );

      // Rule 7
      if (truncated) {
        errors.push({ rule: 'frame-budget', file: rel,
          message: `viz "${vizId}" exceeds its frame budget on its own defaultInput. ` +
                   `Lower defaultInput size or raise maxFrames.` });
      }

      // Rule 6
      const used = new Set(frames.map((f) => f.line).filter(Boolean) as string[]);
      for (const [lang, source] of Object.entries(codeMod.default)) {
        const { anchors } = parseAnchors(source);
        for (const anchor of used) {
          if (!(anchor in anchors)) {
            errors.push({ rule: 'anchor-coverage', file: rel,
              message: `viz "${vizId}" emits anchor ${anchor}, but the ${lang} sample ` +
                       `does not define it. Add "// @anchor ${anchor}".` });
          }
        }
      }
    }
  }
  return errors;
}

// `file://${process.argv[1]}` breaks as a "run directly" check on Windows:
// process.argv[1] is a backslash path ("G:\...\lint-content.ts") while
// import.meta.url is a percent-encoded forward-slash file URL
// ("file:///G:/.../lint-content.ts"), so the two never compare equal and
// this block would silently never run under `pnpm lint:content`.
// `pathToFileURL` normalizes both the same way url.pathToFileURL produces
// them, so the comparison holds on every platform.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = await lintContent('apps/web/src/content/docs');
  for (const e of errors) console.error(`[${e.rule}] ${e.file}: ${e.message}`);
  if (errors.length > 0) {
    console.error(`\n${errors.length} content error(s).`);
    process.exit(1);
  }
  console.log('Content lint passed.');
}
