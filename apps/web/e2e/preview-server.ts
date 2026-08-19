import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Astro 7's `astro preview` daemonizes: it prints the URL and exits 0 while the
 * server keeps running in the background. Playwright's `webServer` option
 * requires a command that stays in the foreground, and reads that immediate
 * exit as "process exited early". So the preview server is started and stopped
 * here instead, via Playwright's globalSetup/globalTeardown hooks.
 *
 * Using the real `astro preview` (rather than a hand-rolled static server)
 * keeps the E2E suite pointed at exactly what production serves.
 */
const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const PREVIEW_PORT = 4321;
export const PREVIEW_URL = `http://localhost:${PREVIEW_PORT}`;

// A shell is unavoidable here (on Windows `pnpm` is a .cmd, which Node refuses
// to spawn directly), so this uses execSync with a single command string. Every
// argument is a module-local constant — no caller input reaches it.
function astro(...args: string[]): void {
  execSync(['pnpm', 'exec', 'astro', 'preview', ...args].join(' '), {
    cwd: webRoot,
    stdio: 'inherit',
  });
}

async function waitForReady(timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(PREVIEW_URL);
      if (res.ok) return;
      lastError = new Error(`preview responded ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(
    `Preview server did not become ready at ${PREVIEW_URL} within ${timeoutMs}ms. ` +
      `Did you run "pnpm build" first? Last error: ${String(lastError)}`,
  );
}

export async function startPreview(): Promise<void> {
  // Stop first: a stale daemon from an earlier run would otherwise serve an
  // old dist/ and the suite would silently test yesterday's build.
  stopPreview();
  astro('--port', String(PREVIEW_PORT));
  await waitForReady();
}

export function stopPreview(): void {
  try {
    astro('stop');
  } catch {
    // Nothing running is the normal case, and `stop` exits non-zero for it.
  }
}
