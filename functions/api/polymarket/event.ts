/**
 * /api/polymarket/event — single-event detail view.
 *
 * Returns the *full* market list for one event (binary, categorical, or
 * sports). The list endpoints (sports/events) cap options/markets so the
 * grid stays cheap to render — this endpoint is for the detail panel,
 * which needs everything: all spread lines, all player props, every
 * categorical candidate.
 *
 * Caching: 30s revalidation matches the list endpoints so a user moving
 * between grid and detail sees consistent prices.
 */

type Env = Record<string, unknown>;

const POLYMARKET_API = "https://gamma-api.polymarket.com";
const REVALIDATE_SECONDS = 30;

/* ------------------------------------------------------------------ */
/*  Upstream — only the fields we read                                  */
/* ------------------------------------------------------------------ */

type GammaMarket = {
  id: string;
  question: string;
  groupItemTitle?: string;
  icon?: string;
  image?: string;
  outcomes: string;
  outcomePrices: string;
  /** JSON array — [yesTokenId, noTokenId] for the CLOB. */
  clobTokenIds?: string;
  oneDayPriceChange?: number | null;
  active: boolean;
  closed: boolean;
  volume24hr?: number;
  sportsMarketType?: string | null;
  line?: number;
};

type GammaTeam = {
  id: number;
  name: string;
  abbreviation: string;
  logo: string;
  color: string;
  record: string;
  ordering: "home" | "away";
  league: string;
};

type GammaEvent = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  image?: string;
  icon?: string;
  startTime?: string;
  endDate?: string;
  active: boolean;
  closed: boolean;
  volume?: number;
  volume24hr?: number;
  period?: string;
  teams?: GammaTeam[];
  markets?: GammaMarket[];
  tags?: Array<{ id: number; label: string; slug: string }>;
  eventMetadata?: {
    league?: string;
    tournament?: string;
    context_description?: string;
  };
};

/* ------------------------------------------------------------------ */
/*  Normalized — what the detail view consumes                           */
/* ------------------------------------------------------------------ */

export type DetailOutcome = {
  /** Display label — "Yes" / "No" / "Knicks" / "Over" / "Spain". */
  label: string;
  /** YES probability 0-1 for THIS specific outcome (not always the
   *  "first" — for "No" it's already inverted). */
  price: number;
  /** CLOB token id used for placing orders + pulling history. May be
   *  null if Polymarket didn't expose it. */
  clobTokenId: string | null;
};

export type DetailMarket = {
  id: string;
  question: string;
  /** Polymarket's grouping helper. Used as the row label when set —
   *  e.g. "Spread -2.5", "Over 216.5", "Spain". */
  groupItemTitle: string | null;
  icon: string | null;
  /** Spread/total line value (signed for spreads). */
  line: number | null;
  /** "moneyline" | "spreads" | "totals" | "first_half_*" | "points" |
   *  "assists" | "rebounds" | other. null when this isn't a sports
   *  game-line market. */
  sportsMarketType: string | null;
  volume24h: number;
  /** Signed 24h change on the YES (first) outcome. */
  priceChange24h: number;
  /** Always exactly two entries — the binary sides for this market. */
  outcomes: [DetailOutcome, DetailOutcome];
};

export type DetailTeam = {
  name: string;
  abbreviation: string;
  logo: string;
  color: string;
  record: string;
  ordering: "home" | "away";
};

export type NormalizedEventDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  /** Auto-generated game preview from Polymarket — surfaces as the
   *  "narrative" paragraph on sports detail pages. */
  context: string | null;
  image: string | null;
  endsAt: string | null;
  startTime: string | null;
  volume24h: number;
  totalVolume: number;
  tags: string[];
  league: string | null;
  shape: "sports" | "binary" | "categorical";
  // Sports-only
  teams?: DetailTeam[];
  state?: "upcoming" | "live" | "final";
  startsInMs?: number;
  // All sub-markets, original order preserved. Detail UI groups by
  // sportsMarketType (for sports) or treats each as a categorical
  // option (otherwise).
  markets: DetailMarket[];
};

/* ------------------------------------------------------------------ */
/*  Handler                                                              */
/* ------------------------------------------------------------------ */

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return Response.json({ error: "missing id" }, { status: 400 });
    }

    const apiUrl = `${POLYMARKET_API}/events?id=${encodeURIComponent(id)}`;
    const res = await fetch(apiUrl, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: REVALIDATE_SECONDS, cacheEverything: true },
    });
    if (!res.ok) {
      return Response.json(
        { error: `Upstream ${res.status}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as GammaEvent[];
    const event = data[0];
    if (!event) {
      return Response.json({ error: "not found" }, { status: 404 });
    }

    return Response.json({ event: normalizeEvent(event) });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "fetch failed" },
      { status: 500 },
    );
  }
};

/* ------------------------------------------------------------------ */
/*  Normalization                                                        */
/* ------------------------------------------------------------------ */

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

function normalizeEvent(e: GammaEvent): NormalizedEventDetail {
  const isSports = !!(e.teams && e.teams.length === 2);

  const markets: DetailMarket[] = (e.markets ?? [])
    .filter((m) => m.active && !m.closed)
    .map(normalizeMarket)
    .filter((m): m is DetailMarket => m !== null);

  const startTime = e.startTime ?? null;
  const startMs = startTime ? new Date(startTime).getTime() : NaN;
  const startsInMs = Number.isFinite(startMs) ? startMs - Date.now() : 0;

  let state: NormalizedEventDetail["state"];
  if (isSports) {
    if (e.period === "FT" || (e.period && /final|ended/i.test(e.period))) {
      state = "final";
    } else if (e.period && !["NS", "PRE", ""].includes(e.period)) {
      state = "live";
    } else if (startsInMs <= 0) {
      const hoursSinceStart = -startsInMs / 3_600_000;
      state = hoursSinceStart < 6 ? "live" : "final";
    } else {
      state = "upcoming";
    }
  }

  const leagueTag = e.tags?.find((t) => KNOWN_LEAGUES.includes(t.label));
  const league =
    leagueTag?.label ?? e.eventMetadata?.league ?? null;

  let shape: NormalizedEventDetail["shape"];
  if (isSports) {
    shape = "sports";
  } else if (markets.length === 1) {
    const firstOutcome = markets[0].outcomes[0]?.label.toLowerCase();
    shape = firstOutcome === "yes" ? "binary" : "categorical";
  } else {
    shape = "categorical";
  }

  return {
    id: e.id,
    slug: e.slug,
    title: e.title.trim(),
    description: e.description ?? null,
    context: e.eventMetadata?.context_description ?? null,
    image: e.image ?? e.icon ?? null,
    endsAt: e.endDate ?? null,
    startTime,
    volume24h: e.volume24hr ?? 0,
    totalVolume: e.volume ?? 0,
    tags: e.tags?.map((t) => t.label) ?? [],
    league,
    shape,
    ...(isSports
      ? {
          teams: e.teams?.map((t) => ({
            name: t.name,
            abbreviation: t.abbreviation,
            logo: t.logo,
            color: t.color,
            record: t.record,
            ordering: t.ordering,
          })),
          state,
          startsInMs,
        }
      : {}),
    markets,
  };
}

function normalizeMarket(m: GammaMarket): DetailMarket | null {
  let labels: string[];
  let prices: number[];
  let tokens: (string | null)[] = [null, null];
  try {
    labels = JSON.parse(m.outcomes);
    prices = (JSON.parse(m.outcomePrices) as string[]).map(Number);
    if (m.clobTokenIds) {
      tokens = JSON.parse(m.clobTokenIds) as (string | null)[];
    }
  } catch {
    return null;
  }
  if (!Array.isArray(labels) || labels.length !== 2) return null;
  if (!Array.isArray(prices) || prices.length !== 2) return null;
  if (!prices.every((p) => Number.isFinite(p))) return null;

  return {
    id: m.id,
    question: m.question,
    groupItemTitle: m.groupItemTitle ?? null,
    icon: m.icon ?? m.image ?? null,
    line: typeof m.line === "number" ? m.line : null,
    sportsMarketType: m.sportsMarketType ?? null,
    volume24h: m.volume24hr ?? 0,
    priceChange24h: m.oneDayPriceChange ?? 0,
    outcomes: [
      {
        label: labels[0],
        price: prices[0],
        clobTokenId: tokens[0] ?? null,
      },
      {
        label: labels[1],
        price: prices[1],
        clobTokenId: tokens[1] ?? null,
      },
    ],
  };
}
