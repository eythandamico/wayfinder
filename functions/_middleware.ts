/**
 * SPA fallback middleware.
 *
 * Cloudflare Pages' `_redirects` rewrite (`/* /index.html 200`) is
 * silently rejected as an "infinite loop" by the parser, so direct
 * hits to client-side routes (e.g. /shells, /paths) 404 against the
 * static asset server. This middleware fires when no real asset
 * matches and the path is a SPA route — it serves /index.html so
 * React Router can resolve the route client-side.
 *
 * Asset hits (any path with a file extension) and /api/* requests
 * pass through untouched.
 */
type Env = { ASSETS: Fetcher };

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, next, env } = context;

  // Let the downstream handler chain run first — specific
  // functions/api/*.ts handlers and the static asset server.
  const response = await next();

  // Only fall through on 404. Real assets, /api/* functions, and any
  // error responses pass through to the caller unchanged.
  if (response.status !== 404) return response;

  const url = new URL(request.url);
  // /api/* 404s are real — don't shadow them with the SPA shell.
  if (url.pathname.startsWith("/api/")) return response;
  // Anything that looks like a file (has an extension) is a real
  // asset miss — return the 404 rather than masking it.
  if (/\.[a-z0-9]{2,5}$/i.test(url.pathname)) return response;

  // SPA route — serve the shell so React Router can handle it.
  const indexUrl = new URL("/index.html", url);
  return env.ASSETS.fetch(indexUrl);
};
