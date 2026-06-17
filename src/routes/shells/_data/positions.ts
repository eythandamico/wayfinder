/** Shared positions mock data used by the rich PortfolioSheet
 *  (rows + sub-tabs) and the simpler PortfolioPanel (counts +
 *  collapsible venue groups). Promoting this out of either component
 *  avoids a circular import — PortfolioSheet already pulls
 *  MOCK_ACCOUNT from PortfolioPanel. */

/** Position row. Perps carry the full perp metadata (mode + leverage,
 *  entry, funding rate + accrued + APR, liquidation price, optional
 *  TP/SL). Spot + prediction rows keep the simpler shape. */
export type PositionRow = {
  symbol: string;
  /** Long-form display name (e.g. "Solana"). Spot tokens use this as
   *  the row title with `symbol` shown as a ticker subtitle. */
  name?: string;
  venue: PositionVenue;
  side: "long" | "short" | "yes" | "no" | "—";
  value: number;
  pnlPct: number;
  glyph: string;
  bg: string;
  fg: string;
  kind: "perp" | "spot" | "prediction" | "cash";
  size?: number;
  mode?: "cross" | "isolated";
  leverage?: number;
  entry?: number;
  /** Hourly funding rate as a signed % string, e.g. "+0.0006%/h" */
  fundingRate?: string;
  /** Accrued funding PnL in USD (signed). */
  fundingAccruedUsd?: number;
  /** Annualized funding APR as a signed % string, e.g. "+5.47%" */
  fundingApr?: string;
  liq?: number;
  tpSl?: string | null;
  /** Polymarket market 24h volume in USD. Surfaces on prediction
   *  rows so the subtitle slot carries useful context. */
  volume?: number;
  /** Polymarket market expiration / resolution date, short form
   *  (e.g. "Jan 2028"). Pairs with volume in the row subtitle. */
  expiresAt?: string;
};

export type PositionVenue = "Hyperliquid" | "Tokens" | "Polymarket" | "Cash";

export const POSITIONS: PositionRow[] = [
  {
    symbol: "BTC-PERP",
    venue: "Hyperliquid",
    kind: "perp",
    side: "long",
    size: 0.092,
    mode: "cross",
    leverage: 2,
    entry: 148_312,
    value: 13602.4,
    pnlPct: 3.19,
    fundingRate: "+0.0006%/h",
    fundingAccruedUsd: -1.04,
    fundingApr: "+5.47%",
    liq: 78250,
    tpSl: null,
    glyph: "₿",
    bg: "#f7931a",
    fg: "#000",
  },
  {
    symbol: "ETH-PERP",
    venue: "Hyperliquid",
    kind: "perp",
    side: "short",
    size: 0.34,
    mode: "isolated",
    leverage: 5,
    entry: 3590.4,
    value: 1218.05,
    pnlPct: -3.34,
    fundingRate: "-0.0019%/h",
    fundingAccruedUsd: 0.42,
    fundingApr: "-16.86%",
    liq: 4380.12,
    tpSl: null,
    glyph: "Ξ",
    bg: "#627eea",
    fg: "#fff",
  },
  {
    symbol: "SOL-PERP",
    venue: "Hyperliquid",
    kind: "perp",
    side: "long",
    size: 28.4,
    mode: "cross",
    leverage: 3,
    entry: 82.16,
    value: 2424.42,
    pnlPct: 1.18,
    fundingRate: "+0.0011%/h",
    fundingAccruedUsd: -0.62,
    fundingApr: "+9.64%",
    liq: 41.05,
    tpSl: null,
    glyph: "S",
    bg: "#9945ff",
    fg: "#fff",
  },
  {
    symbol: "HYPE-PERP",
    venue: "Hyperliquid",
    kind: "perp",
    side: "long",
    size: 44.5,
    mode: "isolated",
    leverage: 10,
    entry: 39.92,
    // Demo position is the hero of the close-position scene —
    // value reflects a 50% gain on a $1,776 entry.
    value: 2665.0,
    pnlPct: 50.0,
    fundingRate: "-0.0004%/h",
    fundingAccruedUsd: 0.18,
    fundingApr: "-3.50%",
    liq: 36.4,
    tpSl: "TP 46 / SL 37",
    glyph: "∞",
    bg: "#0e1111",
    fg: "#8af0b0",
  },
  {
    symbol: "SOL",
    name: "Solana",
    venue: "Tokens",
    kind: "spot",
    side: "long",
    value: 3880.8,
    pnlPct: 4.98,
    glyph: "S",
    bg: "#9945ff",
    fg: "#fff",
  },
  {
    symbol: "HYPE",
    name: "Hyperliquid",
    venue: "Tokens",
    kind: "spot",
    side: "long",
    value: 3480.5,
    pnlPct: 1.19,
    glyph: "H",
    bg: "var(--primary)",
    fg: "#000",
  },
  {
    symbol: "WETH",
    name: "Wrapped Ether",
    venue: "Tokens",
    kind: "spot",
    side: "long",
    value: 2104.7,
    pnlPct: -0.42,
    glyph: "Ξ",
    bg: "#627eea",
    fg: "#fff",
  },
  {
    symbol: "PEPE",
    name: "Pepe",
    venue: "Tokens",
    kind: "spot",
    side: "long",
    value: 418.32,
    pnlPct: 12.4,
    glyph: "🐸",
    bg: "#3d9970",
    fg: "#000",
  },
  {
    symbol: "USDC",
    name: "Idle USD",
    venue: "Tokens",
    kind: "cash",
    side: "—",
    value: 1071.0,
    pnlPct: 0,
    glyph: "$",
    bg: "#2775ca",
    fg: "#fff",
  },
  {
    symbol: "Trump wins 2028",
    venue: "Polymarket",
    kind: "prediction",
    side: "yes",
    value: 3210.49,
    pnlPct: 2.69,
    volume: 184_200_000,
    expiresAt: "Jan 2029",
    glyph: "P",
    bg: "#2775ca",
    fg: "#fff",
  },
  {
    symbol: "BTC > $150k by EOY",
    venue: "Polymarket",
    kind: "prediction",
    side: "yes",
    value: 1845.2,
    pnlPct: 18.7,
    volume: 12_400_000,
    expiresAt: "Dec 2026",
    glyph: "₿",
    bg: "#f7931a",
    fg: "#000",
  },
  {
    symbol: "Fed cuts in June",
    venue: "Polymarket",
    kind: "prediction",
    side: "no",
    value: 982.61,
    pnlPct: -4.1,
    volume: 5_120_000,
    expiresAt: "Jun 2026",
    glyph: "F",
    bg: "#1f6feb",
    fg: "#fff",
  },
];

export const POSITION_VENUES = [
  "Hyperliquid",
  "Tokens",
  "Polymarket",
] as const satisfies readonly PositionVenue[];

export function positionsByVenue(venue: PositionVenue): PositionRow[] {
  return POSITIONS.filter((p) => p.venue === venue);
}

export function venueTotal(venue: PositionVenue): number {
  return positionsByVenue(venue).reduce((sum, p) => sum + p.value, 0);
}
