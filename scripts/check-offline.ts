import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const EXTERNAL = /^(?:https?:)?\/\//i;

/**
 * Scans ASSET references only. Prose anchors (<a href>) are deliberately
 * ignored: IMPLEMENTATION_PLAN.md §5.4 requires outbound practice links.
 */
export function findExternalAssets(html: string): string[] {
  const found: string[] = [];

  const push = (url: string | undefined) => {
    if (url && EXTERNAL.test(url)) found.push(url);
  };

  for (const m of html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["']/gi)) push(m[1]);
  for (const m of html.matchAll(/<(?:script|img|source|video|audio)\b[^>]*\bsrc=["']([^"']+)["']/gi)) push(m[1]);
  for (const m of html.matchAll(/\burl\(\s*["']?([^"')]+)["']?\s*\)/gi)) push(m[1]);

  for (const m of html.matchAll(/\bsrcset=["']([^"']+)["']/gi)) {
    for (const candidate of m[1]!.split(',')) push(candidate.trim().split(/\s+/)[0]);
  }

  return found;
}

// Cross-platform CLI-entrypoint check: `file://${process.argv[1]}` breaks on
// Windows because argv[1] uses backslashes and isn't URL-encoded, so it never
// equals import.meta.url — the guard silently never fires. pathToFileURL()
// normalizes both sides correctly on every platform.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = 'apps/web/dist';
  const files = (await readdir(root, { recursive: true, withFileTypes: true }))
    .filter((d) => d.isFile() && (d.name.endsWith('.html') || d.name.endsWith('.css')))
    .map((d) => join(d.parentPath, d.name));

  let failures = 0;
  for (const file of files) {
    for (const url of findExternalAssets(await readFile(file, 'utf8'))) {
      console.error(`[external-asset] ${file}: ${url}`);
      failures++;
    }
  }
  if (failures > 0) {
    console.error(`\n${failures} external asset reference(s). All assets must be self-hosted.`);
    process.exit(1);
  }
  console.log('Offline check passed.');
}
