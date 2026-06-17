/**
 * Resolves a Path to an Unsplash photo URL and redirects the client
 * `<img>` to it. Keeps the API key server-side; the browser only ever
 * sees `images.unsplash.com` CDN URLs.
 *
 * Cached in-memory per (id + size). For a dev preview this is
 * sufficient — a Map per server process keeps Unsplash's 50/hr quota
 * intact after the first warm-up.
 *
 * Env: UNSPLASH_ACCESS_KEY (add to .env.local)
 */

interface Env {
  UNSPLASH_ACCESS_KEY?: string;
}

type Kind = "strategy" | "skill" | "monitor" | "policy" | "script" | "tool";

const KIND_QUERY: Record<Kind, string> = {
  strategy: "abstract finance gradient",
  skill: "abstract neural network",
  monitor: "abstract data dashboard",
  policy: "abstract geometric shield",
  script: "abstract code terminal",
  tool: "abstract metallic tools",
};

// Per-kind accent (hue, hex) — mirrors the DS accent palette so generated
// fallback art reads as the same design language as the rest of the app.
const KIND_TINT: Record<Kind, { from: string; to: string }> = {
  strategy: { from: "#1d3d2e", to: "#5fd3a3" },
  skill: { from: "#2a1e3f", to: "#a78bfa" },
  monitor: { from: "#0f2a3a", to: "#7dd3fc" },
  policy: { from: "#3a2a10", to: "#fbbf24" },
  script: { from: "#1f2937", to: "#94a3b8" },
  tool: { from: "#1f2937", to: "#cbd5e1" },
};

// Per-process memoization. Keyed by `${id}:${w}x${h}` so the same path
// always resolves to the same photo at a given size.
const cache = new Map<string, string>();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const sp = new URL(request.url).searchParams;
  const id = sp.get("id");
  const kind = sp.get("kind") as Kind | null;
  const w = Number(sp.get("w") ?? 1280);
  const h = Number(sp.get("h") ?? 720);

  if (!id || !kind) {
    return new Response("missing id or kind", { status: 400 });
  }

  const cacheKey = `${id}:${w}x${h}`;
  const cached = cache.get(cacheKey);
  if (cached) return Response.redirect(cached, 302);

  const accessKey = env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return generatedSvg(id, kind, w, h);
  }

  const query = KIND_QUERY[kind] ?? "abstract";
  const seed = hashSeed(id);
  // page 1-5 buys variety without burning quota on deep pagination.
  const page = (seed % 5) + 1;

  const searchUrl =
    `https://api.unsplash.com/search/photos` +
    `?query=${encodeURIComponent(query)}` +
    `&page=${page}` +
    `&per_page=12` +
    `&orientation=landscape` +
    `&content_filter=high`;

  let res: Response;
  try {
    res = await fetch(searchUrl, {
      headers: { Authorization: `Client-ID ${accessKey}` },
      // Don't aggressively re-fetch — the cache Map handles repeats.
      cache: "force-cache",
    });
  } catch {
    return new Response("upstream fetch failed", { status: 502 });
  }

  if (!res.ok) {
    return new Response(`unsplash ${res.status}`, { status: 502 });
  }

  const data = (await res.json()) as {
    results?: Array<{ urls?: { raw?: string } }>;
  };
  const results = data.results ?? [];
  if (results.length === 0) {
    return new Response("no results", { status: 404 });
  }

  const pick = results[seed % results.length];
  const raw = pick?.urls?.raw;
  if (!raw) return new Response("no url", { status: 500 });

  // Unsplash CDN supports w/h/fit/q params on the raw URL.
  const finalUrl = `${raw}&w=${w}&h=${h}&fit=crop&q=80&auto=format`;
  cache.set(cacheKey, finalUrl);

  return Response.redirect(finalUrl, 302);
};

// Inline SVG fallback so the route never 500s when the Unsplash key is
// absent (local dev without `.env.local`, preview deploys without secrets).
// Deterministic per id+kind — same path always renders the same gradient.
function generatedSvg(id: string, kind: Kind, w: number, h: number): Response {
  const seed = hashSeed(id);
  const tint = KIND_TINT[kind] ?? KIND_TINT.tool;
  const angle = (seed % 360);
  const cx = 20 + (seed % 60);
  const cy = 20 + ((seed >> 3) % 60);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">` +
    `<defs>` +
    `<linearGradient id="g" gradientTransform="rotate(${angle})">` +
    `<stop offset="0%" stop-color="${tint.from}"/>` +
    `<stop offset="100%" stop-color="${tint.to}"/>` +
    `</linearGradient>` +
    `<radialGradient id="r" cx="${cx}%" cy="${cy}%" r="60%">` +
    `<stop offset="0%" stop-color="${tint.to}" stop-opacity="0.55"/>` +
    `<stop offset="100%" stop-color="${tint.from}" stop-opacity="0"/>` +
    `</radialGradient>` +
    `</defs>` +
    `<rect width="100%" height="100%" fill="url(#g)"/>` +
    `<rect width="100%" height="100%" fill="url(#r)"/>` +
    `</svg>`;
  return new Response(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml",
      "cache-control": "public, max-age=3600, immutable",
    },
  });
}
