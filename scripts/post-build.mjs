/**
 * Post-build step — emit a copy of dist/index.html at every legacy
 * Next.js route path that's still pinned in Cloudflare's edge cache.
 *
 * Why: the previous next-on-pages deploy generated static HTML at
 * paths like /shells with a 7-day public s-maxage. The edge cached
 * those responses and keeps serving them even after we ship Vite
 * deploys, because the new build doesn't write a file at the same
 * path so CF doesn't invalidate the cache entry. By emitting a real
 * file at each legacy path here, the new deploy replaces the cached
 * asset → edge re-fetches → fresh SPA shell served → React Router
 * picks up the route client-side.
 *
 * Each emitted file IS the SPA shell (a copy of dist/index.html),
 * so it includes the wf-build marker, the SW-unregister script, and
 * the bootstrap that loads /src/main.tsx. The browser hits the shell
 * exactly once at the legacy path; subsequent client-side nav stays
 * in the SPA.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const DIST = resolve(import.meta.dirname, "..", "dist");

// Routes the SPA owns that were also Next.js static pages in the
// previous deploy. Add entries here if the edge keeps serving an
// old build at any other path.
const LEGACY_PATHS = ["shells"];

const shellHtml = await readFile(resolve(DIST, "index.html"), "utf8");

for (const path of LEGACY_PATHS) {
  const target = resolve(DIST, path, "index.html");
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, shellHtml, "utf8");
  console.log(`post-build: wrote SPA shell to dist/${path}/index.html`);
}
