/**
 * /api/polymarket/sports — proxies and normalizes Polymarket's
 * gamma-api event feed for sports game-line markets.
 *
 * Why proxy? Three reasons:
 *   1. Sidesteps any future CORS surprise from the upstream.
 *   2. Lets us cache for 30s at the edge so the panel doesn't hammer
 *      Polymarket on every panel mount / market switch.
 *   3. Reshapes the verbose Polymarket payload (each event has 100+
 *      sub-markets including spreads, totals, alt lines, halftime
 *      props) down to just what the SportsCard needs.
 *
 * Edge runtime so Cloudflare Pages can deploy this route.
 */

type Env = Record<string, unknown>;

const POLYMARKET_API = "https://gamma-api.polymarket.com";
const REVALIDATE_SECONDS = 30;

/* ------------------------------------------------------------------ */
/*  Upstream shape — only the fields we actually consume                */
/* ------------------------------------------------------------------ */

type PolymarketTeam = {
  id: number;
  name: string;
  abbreviation: string;
  logo: string;
  color: string;
  record: string;
  ordering: "home" | "away";
  league: string;
};

type PolymarketMarket = {
  id: string;
  question: string;
  /** JSON-encoded array like '["Spurs", "Knicks"]' */
  outcomes: string;
  /** JSON-encoded array like '["0.465", "0.535"]' (each 0-1). */
  outcomePrices: string;
  /** Signed decimal — +0.01 = +1¢ on YES side over last 24h. */
  oneDayPriceChange?: number;
  /** "moneyline" / "spread" / "total" / "1st_half_moneyline" / … */
  sportsMarketType?: string;
  active: boolean;
  closed: boolean;
  volume24hr?: number;
};

type PolymarketEvent = {
  id: string;
  title: string;
  startTime?: string;
  endDate?: string;
  image?: string;
  active: boolean;
  closed: boolean;
  volume24hr?: number;
  volume?: number;
  /** "NS" (not started), "IP" (in progress?), "FT" (final time)
   *  observed on game-line events. May be other codes for esports. */
  period?: string;
  teams?: PolymarketTeam[];
  markets?: PolymarketMarket[];
  tags?: Array<{ id: number; label: string; slug: string }>;
  eventMetadata?: {
    league?: string;
    tournament?: string;
    context_description?: string;
  };
};

/* ------------------------------------------------------------------ */
/*  Normalized output — what the panel consumes                          */
/* ------------------------------------------------------------------ */

export type NormalizedTeam = {
  name: string;
  abbreviation: string;
  logo: string;
  color: string;
  record: string;
  /** "home" / "away" — Polymarket-assigned. */
  ordering: "home" | "away";
};

export type NormalizedOutcome = {
  /** Matches one of the team names so the card can pair them up. */
  label: string;
  /** YES price 0-1 (≈ implied probability for binary moneylines). */
  yesPrice: number;
  /** Signed change in YES price over the last 24h. */
  priceChange24h: number;
};

export type NormalizedSportsEvent = {
  id: string;
  title: string;
  league: string;
  /** Game lifecycle as inferred from `period` + `startTime`. */
  state: "upcoming" | "live" | "final";
  startTime: string;
  /** Milliseconds until tip-off — negative once started. */
  startsInMs: number;
  volume24h: number;
  totalVolume: number;
  image: string | null;
  teams: NormalizedTeam[];
  outcomes: NormalizedOutcome[];
  /** Auto-generated game preview from Polymarket. ~1 paragraph. */
  narrative?: string;
};

/* ------------------------------------------------------------------ */
/*  Handler                                                              */
/* ------------------------------------------------------------------ */

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const limit = Math.min(50, Number(url.searchParams.get("limit") ?? "20"));

    const apiUrl = new URL(`${POLYMARKET_API}/events`);
    apiUrl.searchParams.set("active", "true");
    apiUrl.searchParams.set("closed", "false");
    apiUrl.searchParams.set("limit", "100");
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
      .filter(isSportsGameLine)
      .map(normalizeEvent)
      .filter((e): e is NormalizedSportsEvent => e !== null)
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
/*  Filters + normalization                                              */
/* ------------------------------------------------------------------ */

/** Game-line events have exactly two teams attached. Excludes
 *  futures (championship winner, season MVP) which carry a team
 *  list of many entries, and esports series which don't have the
 *  same scoreboard shape. */
function isSportsGameLine(e: PolymarketEvent): boolean {
  if (!e.teams || e.teams.length !== 2) return false;
  if (!e.markets || e.markets.length === 0) return false;
  if (!e.tags?.some((t) => t.label === "Sports")) return false;
  return true;
}

function normalizeEvent(e: PolymarketEvent): NormalizedSportsEvent | null {
  if (!e.teams || e.teams.length !== 2 || !e.markets) return null;

  // Pick the moneyline market. Polymarket events bundle dozens of
  // alt markets (spreads, totals, halftime, individual player stats)
  // — only the moneyline matches the team-row card layout.
  const moneyline = e.markets.find(
    (m) => m.active && !m.closed && m.sportsMarketType === "moneyline",
  );
  if (!moneyline) return null;

  let labels: string[];
  let prices: number[];
  try {
    labels = JSON.parse(moneyline.outcomes);
    prices = JSON.parse(moneyline.outcomePrices).map(Number);
  } catch {
    return null;
  }
  if (labels.length !== prices.length || labels.length < 2) return null;

  const priceChange24h = moneyline.oneDayPriceChange ?? 0;
  const outcomes: NormalizedOutcome[] = labels.map((label, i) => ({
    label,
    yesPrice: Number.isFinite(prices[i]) ? prices[i] : 0,
    // Polymarket ships a single oneDayPriceChange per market — the
    // first outcome moves by +X and the inverse outcome moves by -X.
    priceChange24h: i === 0 ? priceChange24h : -priceChange24h,
  }));

  const startTime = e.startTime ?? e.endDate ?? new Date().toISOString();
  const startMs = new Date(startTime).getTime();
  const startsInMs = Number.isFinite(startMs)
    ? startMs - Date.now()
    : 0;

  // Game state — `period` is the authoritative field but Polymarket
  // only seems to flip it for active resolution. Fall back to time
  // arithmetic: started > 6h ago = final, otherwise live.
  let state: NormalizedSportsEvent["state"] = "upcoming";
  if (e.period === "FT" || (e.period && /final|ended/i.test(e.period))) {
    state = "final";
  } else if (e.period && !["NS", "PRE", ""].includes(e.period)) {
    state = "live";
  } else if (startsInMs <= 0) {
    const hoursSinceStart = -startsInMs / 3_600_000;
    state = hoursSinceStart < 6 ? "live" : "final";
  }

  // League label — prefer a recognised league tag over the
  // free-form eventMetadata.league string. Tag order varies, so
  // we explicitly bias toward the major leagues.
  const KNOWN_LEAGUES = [
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
  ];
  const leagueTag = e.tags?.find((t) => KNOWN_LEAGUES.includes(t.label));
  const league = leagueTag?.label ?? e.eventMetadata?.league ?? "Sports";

  return {
    id: e.id,
    title: e.title,
    league,
    state,
    startTime,
    startsInMs,
    volume24h: e.volume24hr ?? 0,
    totalVolume: e.volume ?? 0,
    image: e.image ?? null,
    teams: e.teams.map((t) => ({
      name: t.name,
      abbreviation: t.abbreviation,
      logo: t.logo,
      color: t.color,
      record: t.record,
      ordering: t.ordering,
    })),
    outcomes,
    narrative: e.eventMetadata?.context_description,
  };
}
