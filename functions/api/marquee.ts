/**
 * /api/marquee — top-of-shell ticker tape aggregator.
 *
 * Fans out to several upstreams in parallel and merges the responses
 * into a single interleaved feed the client can render directly. The
 * route is the single point of contact for the marquee component so
 * (a) the client makes one network call instead of ~6, and (b) every
 * upstream gets edge-cached for its appropriate TTL.
 *
 * Sources:
 *   - CoinGecko  → live token prices for BTC/ETH/SOL/HYPE
 *   - Alternative.me → crypto Fear & Greed index
 *   - Polymarket gamma → top 24h movers (any category) + the soonest
 *     game-line markets
 *   - CoinDesk RSS → latest breaking headlines
 *   - Hardcoded macro + economic-calendar entries (real-time DXY /
 *     CPI feeds are paid)
 *
 * Partial failures are absorbed silently — the marquee should still
 * render even if one upstream is down.
 */

type Env = Record<string, unknown>;

const REVALIDATE_FAST = 30;
const REVALIDATE_SLOW = 300;

/* ------------------------------------------------------------------ */
/*  Public item shape                                                   */
/* ------------------------------------------------------------------ */

export type MarqueeItem =
  | {
      type: "token";
      id: string;
      symbol: string;
      price: number;
      change24h: number;
    }
  | {
      type: "news";
      id: string;
      headline: string;
      source: string;
      link: string;
    }
  | {
      type: "polymarket";
      id: string;
      label: string;
      /** YES probability 0-1. */
      yesPrice: number;
      /** Signed 24h delta on the YES side. */
      change24h: number;
      eventTitle: string;
    }
  | {
      type: "sports";
      id: string;
      league: string;
      title: string;
      /** Milliseconds until tip-off (negative if started). */
      startsInMs: number;
      /** Favorite team + its YES probability, for the inline odds chip. */
      favorite: { name: string; yesPrice: number } | null;
    }
  | {
      type: "macro";
      id: string;
      label: string;
      value: string;
      change24h?: number;
    }
  | {
      type: "indicator";
      id: string;
      label: string;
      value: string;
      /** Optional qualitative tone — drives color in the cell. */
      tone?: "primary" | "tone-down" | "neutral";
    }
  | {
      type: "event";
      id: string;
      label: string;
      when: string;
    };

export type MarqueeResponse = {
  items: MarqueeItem[];
};

/* ------------------------------------------------------------------ */
/*  Hardcoded buckets — macro feeds + economic calendar are paid,      */
/*  these placeholders keep the rhythm honest until we wire real ones. */
/* ------------------------------------------------------------------ */

const MOCK_MACRO: MarqueeItem[] = [
  { type: "macro", id: "dxy", label: "DXY", value: "104.32", change24h: -0.18 },
  {
    type: "macro",
    id: "us10y",
    label: "US10Y",
    value: "4.42%",
    change24h: 0.03,
  },
  { type: "macro", id: "vix", label: "VIX", value: "14.2", change24h: 5.1 },
  {
    type: "macro",
    id: "wti",
    label: "WTI",
    value: "$78.40",
    change24h: -1.2,
  },
  {
    type: "macro",
    id: "gold",
    label: "Gold",
    value: "$2,650",
    change24h: 0.4,
  },
];

const UPCOMING_EVENTS: MarqueeItem[] = [
  { type: "event", id: "fomc", label: "FOMC", when: "Wed 2:00 PM ET" },
  { type: "event", id: "cpi", label: "CPI", when: "Thu 8:30 AM ET" },
  { type: "event", id: "nvda", label: "NVDA earnings", when: "After close" },
];

/* ------------------------------------------------------------------ */
/*  Handler                                                              */
/* ------------------------------------------------------------------ */

export const onRequestGet: PagesFunction<Env> = async () => {
  const [tokens, fng, polymarket, sports, news] = await Promise.all([
    safe(fetchTokens),
    safe(fetchFearGreed),
    safe(fetchPolymarketMovers),
    safe(fetchUpcomingSports),
    safe(fetchNews),
  ]);

  // Round-robin merge so the user sees a varied stream rather than
  // "all 5 tokens, then all 3 news, then …". The order within each
  // bucket is preserved (we already prioritized inside each fetcher).
  const items = interleave([
    tokens,
    polymarket,
    news,
    fng,
    MOCK_MACRO,
    sports,
    UPCOMING_EVENTS,
  ]);

  return Response.json({ items } satisfies MarqueeResponse);
};

async function safe<T>(fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn();
  } catch {
    return [];
  }
}

function interleave<T>(buckets: T[][]): T[] {
  const max = Math.max(0, ...buckets.map((b) => b.length));
  const out: T[] = [];
  for (let i = 0; i < max; i++) {
    for (const b of buckets) {
      if (i < b.length) out.push(b[i]);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Tokens — CoinGecko `simple/price`                                  */
/* ------------------------------------------------------------------ */

const COIN_GECKO_IDS = ["bitcoin", "ethereum", "solana", "hyperliquid"];
const COIN_GECKO_SYMBOLS: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  hyperliquid: "HYPE",
};

async function fetchTokens(): Promise<MarqueeItem[]> {
  const url = new URL("https://api.coingecko.com/api/v3/simple/price");
  url.searchParams.set("ids", COIN_GECKO_IDS.join(","));
  url.searchParams.set("vs_currencies", "usd");
  url.searchParams.set("include_24hr_change", "true");
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cf: { cacheTtl: REVALIDATE_FAST, cacheEverything: true },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Record<
    string,
    { usd?: number; usd_24h_change?: number }
  >;
  return COIN_GECKO_IDS.map((id) => {
    const entry = data[id];
    if (!entry || typeof entry.usd !== "number") return null;
    return {
      type: "token" as const,
      id,
      symbol: COIN_GECKO_SYMBOLS[id] ?? id.toUpperCase(),
      price: entry.usd,
      change24h: entry.usd_24h_change ?? 0,
    };
  }).filter((t): t is Extract<MarqueeItem, { type: "token" }> => t !== null);
}

/* ------------------------------------------------------------------ */
/*  Fear & Greed — Alternative.me                                      */
/* ------------------------------------------------------------------ */

async function fetchFearGreed(): Promise<MarqueeItem[]> {
  const res = await fetch("https://api.alternative.me/fng/?limit=1", {
    headers: { Accept: "application/json" },
    cf: { cacheTtl: REVALIDATE_SLOW, cacheEverything: true },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    data?: Array<{ value: string; value_classification: string }>;
  };
  const point = data.data?.[0];
  if (!point) return [];
  const n = Number(point.value);
  if (!Number.isFinite(n)) return [];
  const tone: "primary" | "tone-down" | "neutral" =
    n >= 60 ? "primary" : n <= 40 ? "tone-down" : "neutral";
  return [
    {
      type: "indicator",
      id: "fng",
      label: "Fear & Greed",
      value: `${n} · ${point.value_classification}`,
      tone,
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  Polymarket movers — top 3 by |24h change| across all events        */
/* ------------------------------------------------------------------ */

type GammaMarket = {
  question: string;
  groupItemTitle?: string;
  outcomes: string;
  outcomePrices: string;
  oneDayPriceChange?: number | null;
  active: boolean;
  closed: boolean;
  sportsMarketType?: string | null;
};

type GammaEvent = {
  id: string;
  title: string;
  active: boolean;
  closed: boolean;
  markets?: GammaMarket[];
};

async function fetchPolymarketMovers(): Promise<MarqueeItem[]> {
  const url = new URL("https://gamma-api.polymarket.com/events");
  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");
  url.searchParams.set("limit", "100");
  url.searchParams.set("order", "volume24hr");
  url.searchParams.set("ascending", "false");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cf: { cacheTtl: REVALIDATE_FAST, cacheEverything: true },
  });
  if (!res.ok) return [];
  const events = (await res.json()) as GammaEvent[];

  type Candidate = {
    eventId: string;
    eventTitle: string;
    label: string;
    yesPrice: number;
    change: number;
  };
  const candidates: Candidate[] = [];
  for (const ev of events as Array<GammaEvent & { teams?: Array<unknown> }>) {
    if (ev.teams && ev.teams.length === 2) continue; // game-lines handled separately
    for (const m of ev.markets ?? []) {
      if (!m.active || m.closed) continue;
      const change = m.oneDayPriceChange;
      if (typeof change !== "number" || Math.abs(change) < 0.01) continue;
      let yes = 0;
      try {
        const prices = (JSON.parse(m.outcomePrices) as string[]).map(Number);
        yes = prices[0];
      } catch {
        continue;
      }
      if (!Number.isFinite(yes)) continue;
      const label = m.groupItemTitle?.trim() || m.question;
      candidates.push({
        eventId: ev.id,
        eventTitle: ev.title,
        label,
        yesPrice: yes,
        change,
      });
    }
  }
  candidates.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  return candidates.slice(0, 4).map((c, i) => ({
    type: "polymarket" as const,
    id: `poly-${c.eventId}-${i}`,
    label: c.label,
    yesPrice: c.yesPrice,
    change24h: c.change,
    eventTitle: c.eventTitle,
  }));
}

/* ------------------------------------------------------------------ */
/*  Sports — next 2 game-line events that haven't started              */
/* ------------------------------------------------------------------ */

type GammaSportsEvent = GammaEvent & {
  startTime?: string;
  teams?: Array<{
    name: string;
    abbreviation: string;
    ordering: "home" | "away";
    league: string;
  }>;
  tags?: Array<{ label: string }>;
};

const KNOWN_LEAGUES = new Set([
  "NBA",
  "NFL",
  "MLB",
  "NHL",
  "EPL",
  "UFC",
  "Soccer",
  "Tennis",
  "Formula 1",
  "Boxing",
  "Esports",
]);

async function fetchUpcomingSports(): Promise<MarqueeItem[]> {
  const url = new URL("https://gamma-api.polymarket.com/events");
  url.searchParams.set("active", "true");
  url.searchParams.set("closed", "false");
  url.searchParams.set("limit", "60");
  url.searchParams.set("order", "volume24hr");
  url.searchParams.set("ascending", "false");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cf: { cacheTtl: REVALIDATE_FAST, cacheEverything: true },
  });
  if (!res.ok) return [];
  const events = (await res.json()) as GammaSportsEvent[];

  type Row = {
    id: string;
    league: string;
    title: string;
    startsInMs: number;
    favorite: { name: string; yesPrice: number } | null;
  };

  const rows: Row[] = [];
  for (const ev of events) {
    if (!ev.teams || ev.teams.length !== 2) continue;
    if (!ev.startTime) continue;
    const startMs = new Date(ev.startTime).getTime();
    if (!Number.isFinite(startMs)) continue;
    const startsInMs = startMs - Date.now();
    if (startsInMs <= 0) continue; // skip live / final
    // Find moneyline + extract favorite. Sports events bundle dozens
    // of sub-markets (spreads, totals, props) — the moneyline is the
    // single binary "who wins" with two team-name outcomes.
    const moneyline = ev.markets?.find(
      (m) => m.active && !m.closed && m.sportsMarketType === "moneyline",
    );
    let favorite: { name: string; yesPrice: number } | null = null;
    if (moneyline) {
      try {
        const labels = JSON.parse(moneyline.outcomes) as string[];
        const prices = (JSON.parse(moneyline.outcomePrices) as string[]).map(
          Number,
        );
        // Only show a favorite when the moneyline's labels match the
        // two teams' names. Some sports (soccer especially) ship a
        // "Will X win?" Yes/No moneyline that reads awkwardly in a tape.
        const teamNames = ev.teams?.map((t) => t.name) ?? [];
        const labelsMatchTeams =
          labels.length === 2 &&
          labels.every((l) => teamNames.includes(l));
        if (labelsMatchTeams && prices.length === 2) {
          const favIdx = prices[0] >= prices[1] ? 0 : 1;
          favorite = { name: labels[favIdx], yesPrice: prices[favIdx] };
        }
      } catch {
        /* skip favorite */
      }
    }
    const leagueTag = ev.tags?.find((t) => KNOWN_LEAGUES.has(t.label));
    rows.push({
      id: ev.id,
      league: leagueTag?.label ?? "Sports",
      title: ev.title,
      startsInMs,
      favorite,
    });
  }

  rows.sort((a, b) => a.startsInMs - b.startsInMs);
  return rows.slice(0, 3).map(
    (r): MarqueeItem => ({
      type: "sports",
      id: `sport-${r.id}`,
      league: r.league,
      title: r.title,
      startsInMs: r.startsInMs,
      favorite: r.favorite,
    }),
  );
}

/* ------------------------------------------------------------------ */
/*  News — pull CoinDesk RSS directly                                  */
/* ------------------------------------------------------------------ */

async function fetchNews(): Promise<MarqueeItem[]> {
  const res = await fetch(
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    {
      headers: {
        Accept: "application/rss+xml,application/xml,text/xml",
      },
      cf: { cacheTtl: REVALIDATE_SLOW, cacheEverything: true },
    },
  );
  if (!res.ok) return [];
  const xml = await res.text();
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/g) ?? [];
  const items: MarqueeItem[] = [];
  for (const block of blocks.slice(0, 4)) {
    const title = extractTag(block, "title");
    const link = extractTag(block, "link");
    if (!title) continue;
    items.push({
      type: "news",
      id: `news-${link || title}`,
      headline: title,
      source: "CoinDesk",
      link,
    });
  }
  return items;
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
