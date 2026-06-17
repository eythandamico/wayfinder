/**
 * /api/media/oembed — title + author lookup for embed-friendly video
 * URLs. Currently only YouTube uses this (their oEmbed endpoint is
 * keyless and returns the title + channel name). Other platforms either
 * don't expose oEmbed (Kick, Twitch) or aren't worth one-off integrations
 * yet — those fall back to their channel/username as the label.
 *
 * Why proxy? YouTube's oEmbed doesn't send permissive CORS headers, so
 * a browser fetch will be rejected. Proxying server-side + caching for
 * a day keeps the experience smooth and saves bandwidth.
 */

type Env = Record<string, unknown>;

/** Titles rarely change; cache for a day so repeated panel mounts
 *  and source additions don't re-hit upstream. */
const REVALIDATE_SECONDS = 86_400;

type OEmbedResponse = {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  provider_name?: string;
};

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const target = url.searchParams.get("url")?.trim();
    if (!target) {
      return Response.json({ error: "missing url" }, { status: 400 });
    }

    // Whitelist YouTube — adding more providers means deciding whether
    // to fan out per-provider (each has different oEmbed quirks).
    const u = safeUrl(target);
    if (!u) return Response.json({ error: "invalid url" }, { status: 400 });
    const host = u.hostname.replace(/^www\./, "");
    if (host !== "youtube.com" && host !== "youtu.be" && host !== "m.youtube.com") {
      return Response.json({ error: "unsupported provider" }, { status: 400 });
    }

    const oembedUrl = new URL("https://www.youtube.com/oembed");
    oembedUrl.searchParams.set("url", target);
    oembedUrl.searchParams.set("format", "json");

    const res = await fetch(oembedUrl.toString(), {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: REVALIDATE_SECONDS, cacheEverything: true },
    });
    if (!res.ok) {
      // 401 from upstream typically means the video is private/removed —
      // surface a soft error so the caller can still add the source.
      return Response.json(
        { error: `Upstream ${res.status}` },
        { status: res.status === 404 ? 404 : 502 },
      );
    }

    const data = (await res.json()) as OEmbedResponse;
    return Response.json({
      title: data.title ?? null,
      author: data.author_name ?? null,
      thumbnail: data.thumbnail_url ?? null,
      provider: data.provider_name ?? null,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "fetch failed" },
      { status: 500 },
    );
  }
};

function safeUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    return null;
  }
}
