/**
 * /api/command-bar — fans out to live data sources so the CommandBar
 * palette can search tokens, prediction markets, and news in a single
 * round-trip.
 *
 * Sources:
 *   - CoinGecko `simple/price` for live USD + 24h % on the markets the
 *     trade panel supports (BTC, ETH, SOL, HYPE).
 *   - Polymarket gamma-api `/events` for prediction markets (filtered
 *     by query against title + tag labels).
 *   - CoinDesk RSS for breaking-news headlines (with their featured
 *     `<media:content>` images).
 *
 * Each upstream caches independently with its own TTL (token prices
 * tick fastest, news churns slowest) so the merged response stays
 * fresh where it needs to and lazy where it can.
 *
 * Partial upstream failures are swallowed silently — the command bar
 * still renders what it got.
 */

type Env = Record<string, unknown>;

const REVALIDATE_TOKENS = 20;
const REVALIDATE_POLYMARKET = 60;
const REVALIDATE_NEWS = 300;
const MAX_TOKENS = 6;
const MAX_MARKETS = 8;
const MAX_NEWS = 6;

/* ------------------------------------------------------------------ */
/*  Public response shape                                                */
/* ------------------------------------------------------------------ */

export type CommandBarToken = {
  id: string;
  /** Market id used by the shells-context active-market state — maps
   *  to one of the entries in `MARKETS` in `_data/mocks.ts`. */
  marketId: string;
  symbol: string;
  name: string;
  /** USD price as a number — formatted client-side so we can apply
   *  locale + tabular-nums consistently with the rest of the app. */
  price: number;
  /** Signed 24h change percentage (e.g., 1.5 for +1.5%). */
  change24h: number;
};

export type CommandBarMarket = {
  id: string;
  title: string;
  slug: string;
  image: string | null;
  /** Highest-probability outcome label for the event. null when the
   *  event ships no sub-markets (rare). */
  topOption: { label: string; price: number } | null;
  volume24h: number;
};

export type CommandBarNewsItem = {
  id: string;
  headline: string;
  source: string;
  link: string;
  publishedAt: string;
  image: string | null;
};

export type CommandBarResponse = {
  tokens: CommandBarToken[];
  markets: CommandBarMarket[];
  news: CommandBarNewsItem[];
};

/* ------------------------------------------------------------------ */
/*  Token catalog — mirrors the MARKETS table in _data/mocks.ts          */
/* ------------------------------------------------------------------ */

/** CoinGecko id → local Market id. The local id is what shells-context
 *  uses to look up the full Market shape (iconChar, iconBg, tvSymbol)
 *  on the client. Symbols + names are copied here so the result rows
 *  render without a second lookup. */
const TOKEN_CATALOG = [
  { cgId: "bitcoin", marketId: "btc", symbol: "BTC", name: "Bitcoin" },
  { cgId: "ethereum", marketId: "eth", symbol: "ETH", name: "Ethereum" },
  { cgId: "solana", marketId: "sol", symbol: "SOL", name: "Solana" },
  { cgId: "hyperliquid", marketId: "hype", symbol: "HYPE", name: "Hyperliquid" },
  { cgId: "ripple", marketId: "xrp", symbol: "XRP", name: "XRP" },
  { cgId: "dogecoin", marketId: "doge", symbol: "DOGE", name: "Dogecoin" },
  { cgId: "chainlink", marketId: "link", symbol: "LINK", name: "Chainlink" },
  { cgId: "arbitrum", marketId: "arb", symbol: "ARB", name: "Arbitrum" },
] as const;

/* ------------------------------------------------------------------ */
/*  Handler                                                              */
/* ------------------------------------------------------------------ */

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const [tokens, markets, news] = await Promise.all([
    safe(() => fetchTokens(q)),
    safe(() => fetchPolymarket(q)),
    safe(() => fetchNews(q)),
  ]);

  return Response.json({
    tokens,
    markets,
    news,
  } satisfies CommandBarResponse);
};

async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Tokens — CoinGecko simple/price                                      */
/* ------------------------------------------------------------------ */

async function fetchTokens(q: string): Promise<CommandBarToken[]> {
  const url = new URL("https://api.coingecko.com/api/v3/simple/price");
  url.searchParams.set("ids", TOKEN_CATALOG.map((t) => t.cgId).join(","));
  url.searchParams.set("vs_currencies", "usd");
  url.searchParams.set("include_24hr_change", "true");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cf: { cacheTtl: REVALIDATE_TOKENS, cacheEverything: true },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Record<
    string,
    { usd?: number; usd_24h_change?: number }
  >;

  const enriched: CommandBarToken[] = [];
  for (const entry of TOKEN_CATALOG) {
    const live = data[entry.cgId];
    if (!live || typeof live.usd !== "number") continue;
    enriched.push({
      id: entry.cgId,
      marketId: entry.marketId,
      symbol: entry.symbol,
      name: entry.name,
      price: live.usd,
      change24h: live.usd_24h_change ?? 0,
    });
  }

  if (!q) return enriched.slice(0, MAX_TOKENS);

  // Match on symbol, name, or CoinGecko id.
  return enriched
    .filter((t) => {
      const haystack = `${t.symbol} ${t.name} ${t.id}`.toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, MAX_TOKENS);
}

/* ------------------------------------------------------------------ */
/*  Polymarket — gamma-api events                                        */
/* ------------------------------------------------------------------ */

type GammaEvent = {
  id: string;
  slug: string;
  title: string;
  image?: string;
  volume24hr?: number;
  active: boolean;
  closed: boolean;
  tags?: Array<{ label: string }>;
  markets?: Array<{
    active: boolean;
    closed: boolean;
    outcomes: string;
    outcomePrices: string;
    groupItemTitle?: string;
    question: string;
  }>;
};

async function fetchPolymarket(q: string): Promise<CommandBarMarket[]> {
  const url = new URL("https://gamma-api.polymarket.com/events");
  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");
  url.searchParams.set("limit", "200");
  url.searchParams.set("order", "volume24hr");
  url.searchParams.set("ascending", "false");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cf: { cacheTtl: REVALIDATE_POLYMARKET, cacheEverything: true },
  });
  if (!res.ok) return [];
  const events = (await res.json()) as GammaEvent[];

  const filtered = events.filter((ev) => {
    if (!ev.slug || !ev.title) return false;
    if (!q) return true;
    const titleMatch = ev.title.toLowerCase().includes(q);
    const tagMatch = (ev.tags ?? []).some((t) =>
      t.label.toLowerCase().includes(q),
    );
    return titleMatch || tagMatch;
  });

  return filtered.slice(0, MAX_MARKETS).map((ev) => {
    // Pick the top option by yesPrice from this event's sub-markets.
    let topOption: { label: string; price: number } | null = null;
    let bestPrice = -1;
    for (const m of ev.markets ?? []) {
      if (!m.active || m.closed) continue;
      try {
        const labels = JSON.parse(m.outcomes) as string[];
        const prices = (JSON.parse(m.outcomePrices) as string[]).map(Number);
        const idx = prices[0] >= (prices[1] ?? 0) ? 0 : 1;
        const price = prices[idx];
        if (!Number.isFinite(price)) continue;
        if (price > bestPrice) {
          const label = m.groupItemTitle?.trim() || labels[idx] || "Yes";
          topOption = { label, price };
          bestPrice = price;
        }
      } catch {
        /* skip */
      }
    }

    return {
      id: ev.id,
      title: ev.title.trim(),
      slug: ev.slug,
      image: ev.image ?? null,
      topOption,
      volume24h: ev.volume24hr ?? 0,
    } satisfies CommandBarMarket;
  });
}

/* ------------------------------------------------------------------ */
/*  News — CoinDesk RSS                                                  */
/* ------------------------------------------------------------------ */

async function fetchNews(q: string): Promise<CommandBarNewsItem[]> {
  const res = await fetch(
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    {
      headers: {
        Accept: "application/rss+xml,application/xml,text/xml",
      },
      cf: { cacheTtl: REVALIDATE_NEWS, cacheEverything: true },
    },
  );
  if (!res.ok) return [];
  const xml = await res.text();
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/g) ?? [];

  const items: CommandBarNewsItem[] = [];
  for (const block of blocks) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate");
    if (!title) continue;
    const image = extractImage(block);
    const publishedAt = parsePubDate(pubDate);
    items.push({
      id: `news-${link || title}`,
      headline: title,
      source: "CoinDesk",
      link,
      publishedAt,
      image,
    });
  }

  const filtered = q
    ? items.filter((it) => it.headline.toLowerCase().includes(q))
    : items;
  return filtered.slice(0, MAX_NEWS);
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = xml.match(re);
  if (!m) return "";
  const raw = m[1].trim();
  const cdata = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return (cdata ? cdata[1] : raw)
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function extractImage(block: string): string | null {
  const mc = block.match(
    /<media:content\b[^>]*\burl=["']([^"']+)["'][^>]*>/i,
  );
  if (mc) return decodeXmlEntities(mc[1]);
  const en = block.match(
    /<enclosure\b[^>]*\burl=["']([^"']+)["'][^>]*\btype=["']image\//i,
  );
  if (en) return decodeXmlEntities(en[1]);
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

function parsePubDate(s: string): string {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toISOString();
}
