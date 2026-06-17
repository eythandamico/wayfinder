/**
 * /api/news — proxies CoinDesk's public RSS feed so the MediaPanel
 * can fetch news client-side without running into CORS.
 *
 * The feed is XML; we do a tiny regex parse rather than pull in an
 * XML library — RSS shapes are stable and we only need 4 fields per
 * item. Output is normalised JSON the panel can render directly.
 *
 * Cached at the edge for 5 minutes — news doesn't churn faster than
 * that and we don't want to thrash the upstream.
 *
 * Edge runtime required for Cloudflare Pages deploys.
 */

type Env = Record<string, unknown>;

const FEED_URL = "https://www.coindesk.com/arc/outboundfeeds/rss/";
const CACHE_TTL_SECONDS = 300;

export type NewsItem = {
  id: string;
  title: string;
  link: string;
  /** ISO-8601 timestamp, or the raw pubDate if parsing fails. */
  publishedAt: string;
  /** Plain-text first ~280 chars of the description, HTML stripped. */
  summary: string;
  /** Featured image URL — CoinDesk ships these via `<media:content>`.
   *  null when the item didn't include one; the UI shows a placeholder. */
  image: string | null;
  source: "CoinDesk";
};

export const onRequestGet: PagesFunction<Env> = async () => {
  try {
    const res = await fetch(FEED_URL, {
      headers: { Accept: "application/rss+xml,application/xml,text/xml" },
      // Edge cache at the Cloudflare layer — equivalent to Next's
      // `next: { revalidate }` from the original route.
      cf: { cacheTtl: CACHE_TTL_SECONDS, cacheEverything: true },
    });
    if (!res.ok) {
      return Response.json(
        { items: [], error: `Upstream ${res.status}` },
        { status: 502 },
      );
    }
    const xml = await res.text();
    const items = parseRss(xml).slice(0, 30);
    return Response.json({ items });
  } catch (err) {
    return Response.json(
      { items: [], error: err instanceof Error ? err.message : "fetch failed" },
      { status: 500 },
    );
  }
};

/* ------------------------------------------------------------------ */
/*  RSS parsing                                                        */
/* ------------------------------------------------------------------ */

/** Pull the first match of /<tag>(.*?)<\/tag>/s out of a string,
 *  preferring CDATA contents when present. Returns trimmed text or "". */
function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return "";
  const raw = m[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return (cdata ? cdata[1] : raw).trim();
}

/** Strip HTML tags + collapse whitespace + truncate to ~280 chars. */
function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

/** Pull the featured image URL out of an RSS item block. Tries the
 *  three places feeds tend to put images, in priority order:
 *    1. <media:content url="…" medium="image"> — what CoinDesk uses.
 *    2. <enclosure url="…" type="image/…"> — older WordPress feeds.
 *    3. <img src="…"> inside the description CDATA — last resort. */
function extractImage(block: string): string | null {
  const mc = block.match(
    /<media:content\b[^>]*\burl=["']([^"']+)["'][^>]*>/i,
  );
  if (mc) return decodeXmlEntities(mc[1]);
  const en = block.match(
    /<enclosure\b[^>]*\burl=["']([^"']+)["'][^>]*\btype=["']image\//i,
  );
  if (en) return decodeXmlEntities(en[1]);
  const ig = block.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  if (ig) return decodeXmlEntities(ig[1]);
  return null;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseRss(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRe = /<item\b[\s\S]*?<\/item>/g;
  const matches = xml.match(itemRe) ?? [];
  for (const block of matches) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const desc = extractTag(block, "description");
    const pubDate = extractTag(block, "pubDate");
    if (!title) continue;
    let publishedAt = pubDate;
    const parsed = new Date(pubDate);
    if (!Number.isNaN(parsed.getTime())) publishedAt = parsed.toISOString();
    items.push({
      id: link || title,
      title: stripHtml(title),
      link,
      publishedAt,
      summary: stripHtml(desc),
      image: extractImage(block),
      source: "CoinDesk",
    });
  }
  return items;
}
