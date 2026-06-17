/**
 * /api/polymarket/events — generic proxy + normalizer for Polymarket's
 * gamma-api event feed. Covers every non-sports market shape:
 *
 *   - "binary"      → 1 sub-market with Yes/No outcomes
 *                     (e.g. "Will the Iranian regime fall by June 30?")
 *   - "categorical" → many sub-markets, each a binary Yes/No on one
 *                     option (e.g. "Republican Nominee 2028" → 128
 *                     candidates each priced 0-1).
 *
 * Sports game-line events are handled by a sibling route — the team
 * scoreboard shape is different enough to deserve its own type.
 *
 * Caching: we always hit the same upstream URL (top events by 24h
 * volume) and filter by tag client-side in the route. That way Next's
 * edge cache holds one entry that serves every tab for 30s.
 */

type Env = Record<string, unknown>;

const POLYMARKET_API = "https://gamma-api.polymarket.com";
const REVALIDATE_SECONDS = 30;
const UPSTREAM_POOL_SIZE = 200;

/* ------------------------------------------------------------------ */
/*  Upstream shape — fields we consume                                  */
/* ------------------------------------------------------------------ */

type PolymarketMarket = {
  id: string;
  question: string;
  /** Short option label for categorical markets ("Spain", "Newsom"). */
  groupItemTitle?: string;
  icon?: string;
  image?: string;
  outcomes: string;
  outcomePrices: string;
  oneDayPriceChange?: number | null;
  active: boolean;
  closed: boolean;
  volume24hr?: number;
};

type PolymarketEvent = {
  id: string;
  title: string;
  image?: string;
  icon?: string;
  endDate?: string;
  startTime?: string;
  active: boolean;
  closed: boolean;
  volume?: number;
  volume24hr?: number;
  /** Sports events carry a `teams` array — we use this to skip them
   *  here, since they get a richer scoreboard treatment via the
   *  sports route. */
  teams?: Array<{ id: number }>;
  tags?: Array<{ id: number; label: string; slug: string }>;
};

/* ------------------------------------------------------------------ */
/*  Normalized output                                                   */
/* ------------------------------------------------------------------ */

export type NormalizedOption = {
  /** Short label for ranked-list display ("Spain", "Gavin Newsom"). */
  label: string;
  /** Sub-market icon if Polymarket attached one — usually a tiny PNG. */
  icon: string | null;
  /** YES probability, 0-1. */
  yesPrice: number;
  /** Signed change in YES price over last 24h. */
  priceChange24h: number;
};

export type NormalizedEvent = {
  id: string;
  title: string;
  image: string | null;
  endsAt: string | null;
  volume24h: number;
  totalVolume: number;
  tags: string[];
  shape: "binary" | "categorical";
  /** Present when shape === "binary". */
  binary?: {
    yesPrice: number;
    priceChange24h: number;
  };
  /** Present when shape === "categorical" — ranked top-first by yesPrice. */
  options?: NormalizedOption[];
  /** Number of additional options beyond the ones returned (for
   *  "+ N more" affordance on long categoricals). */
  remainingOptions?: number;
};

/* ------------------------------------------------------------------ */
/*  Handler                                                              */
/* ------------------------------------------------------------------ */

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const tag = url.searchParams.get("tag")?.trim() || null;
    const limit = Math.min(60, Number(url.searchParams.get("limit") ?? "24"));
    const optionCap = Math.min(
      8,
      Math.max(2, Number(url.searchParams.get("options") ?? "5")),
    );

    const apiUrl = new URL(`${POLYMARKET_API}/events`);
    apiUrl.searchParams.set("active", "true");
    apiUrl.searchParams.set("closed", "false");
    apiUrl.searchParams.set("limit", String(UPSTREAM_POOL_SIZE));
    apiUrl.searchParams.set("order", "volume24hr");
    apiUrl.searchParams.set("ascending", "false");

    const res = await fetch(apiUrl.toString(), {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: REVALIDATE_SECONDS, cacheEverything: true },
    });
    if (!res.ok) {
      return Response.json(
        { events: [], error: `Upstream ${res.status}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as PolymarketEvent[];

    const normalized = data
      // Skip sports game-line events — sports route owns those.
      .filter((e) => !(e.teams && e.teams.length === 2))
      // Apply tag filter when present, otherwise return trending pool.
      .filter((e) =>
        tag ? e.tags?.some((t) => t.label === tag) : true,
      )
      .map((e) => normalizeEvent(e, optionCap))
      .filter((e): e is NormalizedEvent => e !== null)
      .slice(0, limit);

    return Response.json({ events: normalized });
  } catch (err) {
    return Response.json(
      {
        events: [],
        error: err instanceof Error ? err.message : "fetch failed",
      },
      { status: 500 },
    );
  }
};

/* ------------------------------------------------------------------ */
/*  Normalization                                                        */
/* ------------------------------------------------------------------ */

function normalizeEvent(
  e: PolymarketEvent & { markets?: PolymarketMarket[] },
  optionCap: number,
): NormalizedEvent | null {
  const liveMarkets = (e.markets ?? []).filter((m) => m.active && !m.closed);
  if (liveMarkets.length === 0) return null;

  const base = {
    id: e.id,
    title: e.title,
    image: e.image ?? e.icon ?? null,
    endsAt: e.endDate ?? null,
    volume24h: e.volume24hr ?? 0,
    totalVolume: e.volume ?? 0,
    tags: e.tags?.map((t) => t.label) ?? [],
  };

  // Binary: a single market with Yes/No outcomes. Polymarket labels the
  // outcomes literally as "Yes"/"No" — anything else (e.g. team names)
  // is categorical-by-other-means and we treat as multi-option.
  if (liveMarkets.length === 1) {
    const m = liveMarkets[0];
    const parsed = parseOutcomePair(m);
    if (parsed && parsed.labels[0]?.toLowerCase() === "yes") {
      return {
        ...base,
        shape: "binary",
        binary: {
          yesPrice: parsed.prices[0],
          priceChange24h: m.oneDayPriceChange ?? 0,
        },
      };
    }
  }

  // Categorical: each sub-market contributes one option (its Yes price).
  // Rank by yesPrice descending so the favorite leads.
  const options = liveMarkets
    .map<NormalizedOption | null>((m) => {
      const parsed = parseOutcomePair(m);
      if (!parsed) return null;
      const label =
        m.groupItemTitle?.trim() ||
        // Fallback: derive from question by stripping "Will X win/be …".
        deriveLabelFromQuestion(m.question);
      return {
        label,
        icon: m.icon ?? m.image ?? null,
        yesPrice: parsed.prices[0],
        priceChange24h: m.oneDayPriceChange ?? 0,
      };
    })
    .filter((o): o is NormalizedOption => o !== null)
    .sort((a, b) => b.yesPrice - a.yesPrice);

  if (options.length === 0) return null;

  const top = options.slice(0, optionCap);
  return {
    ...base,
    shape: "categorical",
    options: top,
    remainingOptions: Math.max(0, options.length - top.length),
  };
}

function parseOutcomePair(
  m: PolymarketMarket,
): { labels: string[]; prices: number[] } | null {
  try {
    const labels = JSON.parse(m.outcomes) as string[];
    const prices = (JSON.parse(m.outcomePrices) as string[]).map(Number);
    if (!Array.isArray(labels) || !Array.isArray(prices)) return null;
    if (labels.length !== prices.length || labels.length < 2) return null;
    if (!prices.every((p) => Number.isFinite(p))) return null;
    return { labels, prices };
  } catch {
    return null;
  }
}

/** When a sub-market lacks `groupItemTitle`, fall back to scraping the
 *  question. Polymarket phrases these as "Will <Subject> …?" so we
 *  pull the subject from between "Will " and the next verb. */
function deriveLabelFromQuestion(q: string): string {
  const m = q.match(/^Will\s+(.+?)\s+(win|be|hit|reach|become|happen|close)/i);
  if (m) return m[1];
  return q.length > 28 ? q.slice(0, 28) + "…" : q;
}
