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
  const files = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter((d) => d.isFile() && d.name.endsWith('.mdx'))
    .map((d) => join(d.parentPath, d.name));

  const slugFor = (file: string) => `/${toPosix(relative(root, file)).replace(/\.mdx$/, '')}`;
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
    const words = countWords(stripCodeBlocks(body));
    if (words > WORD_LIMIT) {
      errors.push({ rule: 'prose-word-limit', file: rel,
        message: `Prose is ${words} words; the limit is ${WORD_LIMIT} (code blocks excluded).` });
    }

    // Rule 4
    if (untaggedCodeFences(body) > 0) {
      errors.push({ rule: 'code-block-language', file: rel,
        message: `A fenced code block does not declare its language.` });
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
