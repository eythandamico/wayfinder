/**
 * Market catalog + derived helpers (metric strip, synthetic
 * orderbook). Lives in its own module so chart / trade / orderbook
 * panels don't have to pull in chat sessions, jobs, wallets, etc.
 *
 * Surface re-exported via mocks.ts for back-compat with any caller
 * still importing from `_data/mocks`.
 */
import type {
  Market,
  MarketMetric,
  Timeframe,
  Venue,
} from "../_types";

export const VENUES: { id: Venue; label: string }[] = [
  { id: "hl-perps", label: "HL Perps" },
  { id: "hl-spot", label: "HL Spot" },
  { id: "onchain", label: "Onchain Spot" },
  { id: "polymarket", label: "Polymarket" },
];

export const MARKETS: Market[] = [
  {
    id: "btc",
    symbol: "BTC-USDC",
    tvSymbol: "BINANCE:BTCUSDT",
    venue: "hl-perps",
    iconChar: "₿",
    iconBg: "#f7931a",
    iconFg: "#000",
    leverage: "40X",
    lastPrice: "75,729.5",
    change24h: "+2.36%",
    change24hTone: "positive",
    volume: "$2.18B",
  },
  {
    id: "eth",
    symbol: "ETH-USDC",
    tvSymbol: "BINANCE:ETHUSDT",
    venue: "hl-perps",
    iconChar: "Ξ",
    iconBg: "#627eea",
    leverage: "25X",
    lastPrice: "2,310.9",
    change24h: "+2.08%",
    change24hTone: "positive",
    volume: "$1.06B",
  },
  {
    id: "xyz-cl",
    symbol: "xyz:CL-USDC",
    tvSymbol: "TVC:USOIL",
    venue: "hl-perps",
    iconChar: "XYZ",
    iconBg: "#8b9100",
    leverage: "20X",
    lastPrice: "86.554",
    change24h: "-1.64%",
    change24hTone: "negative",
    volume: "$790.20M",
  },
  {
    id: "xyz-brent",
    symbol: "xyz:BRENTOIL-USDC",
    tvSymbol: "TVC:UKOIL",
    venue: "hl-perps",
    iconChar: "XYZ",
    iconBg: "#1aa396",
    leverage: "20X",
    lastPrice: "89.948",
    change24h: "-0.98%",
    change24hTone: "negative",
    volume: "$316.15M",
  },
  {
    id: "xyz-sp500",
    symbol: "xyz:SP500-USDC",
    tvSymbol: "FOREXCOM:SPXUSD",
    venue: "hl-perps",
    iconChar: "XYZ",
    iconBg: "#3b4ba9",
    leverage: "50X",
    lastPrice: "7,118.35",
    change24h: "+0.72%",
    change24hTone: "positive",
    volume: "$301.21M",
  },
  {
    id: "hype",
    symbol: "HYPE-USDC",
    tvSymbol: "BINANCE:HYPEUSDT",
    venue: "hl-perps",
    iconChar: "∞",
    iconBg: "#0e1111",
    iconFg: "#8af0b0",
    leverage: "10X",
    lastPrice: "40.718",
    change24h: "-0.55%",
    change24hTone: "negative",
    volume: "$279.90M",
  },
  {
    id: "sol",
    symbol: "SOL-USDC",
    tvSymbol: "BINANCE:SOLUSDT",
    venue: "hl-perps",
    iconChar: "S",
    iconBg: "#9945ff",
    leverage: "20X",
    lastPrice: "85.367",
    change24h: "+2.20%",
    change24hTone: "positive",
    volume: "$167.54M",
  },
  {
    id: "xrp",
    symbol: "XRP-USDC",
    tvSymbol: "BINANCE:XRPUSDT",
    venue: "hl-perps",
    iconChar: "X",
    iconBg: "#23292f",
    leverage: "20X",
    lastPrice: "1.422",
    change24h: "+1.79%",
    change24hTone: "positive",
    volume: "$67.01M",
  },
  {
    id: "aave",
    symbol: "AAVE-USDC",
    tvSymbol: "BINANCE:AAVEUSDT",
    venue: "hl-perps",
    iconChar: "A",
    iconBg: "#9658de",
    leverage: "10X",
    lastPrice: "91.114",
    change24h: "+1.36%",
    change24hTone: "positive",
    volume: "$54.61M",
  },
  {
    id: "xyz-gold",
    symbol: "xyz:GOLD-USDC",
    tvSymbol: "OANDA:XAUUSD",
    venue: "hl-perps",
    iconChar: "XYZ",
    iconBg: "#2f78c4",
    leverage: "25X",
    lastPrice: "4,825.55",
    change24h: "+1.05%",
    change24hTone: "positive",
    volume: "$39.62M",
  },
  {
    id: "zec",
    symbol: "ZEC-USDC",
    tvSymbol: "BINANCE:ZECUSDT",
    venue: "hl-perps",
    iconChar: "Z",
    iconBg: "#f4b728",
    iconFg: "#000",
    leverage: "10X",
    lastPrice: "312.225",
    change24h: "+3.41%",
    change24hTone: "positive",
    volume: "$32.03M",
  },
  {
    id: "fartcoin",
    symbol: "FARTCOIN-USDC",
    tvSymbol: "MEXC:FARTCOINUSDT",
    venue: "hl-perps",
    iconChar: "FAR",
    iconBg: "#7ba03d",
    leverage: "10X",
    lastPrice: "0.2021",
    change24h: "+5.11%",
    change24hTone: "positive",
    volume: "$18.23M",
  },
];

export const TIMEFRAMES: readonly Timeframe[] = [
  "1m",
  "5m",
  "15m",
  "1h",
  "4h",
  "1d",
] as const;

export const TV_INTERVAL: Record<Timeframe, string> = {
  "1m": "1",
  "5m": "5",
  "15m": "15",
  "1h": "60",
  "4h": "240",
  "1d": "D",
};

/** Default-tier metrics — kept around for legacy callers that don't
 *  yet pass a market in. New code should call `metricsForMarket` so
 *  the strip mirrors whichever asset the chart is showing. */
export const MARKET_METRICS: MarketMetric[] = [
  { label: "Price", value: "$75,739.5" },
  { label: "Mark", value: "$75,750" },
  { label: "Oracle", value: "$75,794" },
  { label: "24h", value: "+1.38%", tone: "positive" },
  { label: "24h Vol", value: "$2.47B" },
  { label: "Open Interest", value: "$1.99B" },
  { label: "Funding", value: "—" },
];

/* ------------------------------------------------------------------ */
/*  Derived market metrics                                              */
/* ------------------------------------------------------------------ */

function applyDelta(priceStr: string, pct: number): string {
  const compact = priceStr.replace(/,/g, "");
  const n = parseFloat(compact);
  if (!Number.isFinite(n)) return priceStr;
  const decimals = compact.includes(".") ? compact.split(".")[1].length : 0;
  const next = n * (1 + pct / 100);
  return next.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function scaleVolume(vol: string, factor: number): string {
  const m = vol.match(/^(\$?)([\d.]+)([BMK]?)$/);
  if (!m) return vol;
  const [, prefix, num, unit] = m;
  const next = parseFloat(num) * factor;
  const fixed = next.toFixed(2).replace(/\.?0+$/, "");
  return `${prefix}${fixed}${unit}`;
}

/** Per-market metrics strip for the chart header. Derives Price /
 *  Mark / Oracle / 24h / 24h Vol / OI / Funding from the market's
 *  own fields so each chart's strip mirrors the asset it's showing. */
export function metricsForMarket(market: Market): MarketMetric[] {
  const isXyz = market.id.startsWith("xyz-");
  const fundingValue = isXyz
    ? "—"
    : market.change24hTone === "positive"
      ? "+0.0012%"
      : "-0.0008%";
  return [
    { label: "Price", value: `$${market.lastPrice}` },
    { label: "Mark", value: `$${applyDelta(market.lastPrice, 0.012)}` },
    { label: "Oracle", value: `$${applyDelta(market.lastPrice, 0.083)}` },
    {
      label: "24h",
      value: market.change24h,
      tone: market.change24hTone === "positive" ? "positive" : undefined,
    },
    { label: "24h Vol", value: market.volume },
    { label: "Open Interest", value: scaleVolume(market.volume, 0.85) },
    { label: "Funding", value: fundingValue },
  ];
}

/* ------------------------------------------------------------------ */
/*  Synthetic orderbook                                                 */
/* ------------------------------------------------------------------ */

export type OrderRow = {
  price: string;
  size: string;
  total: string;
  /** Cumulative size up to and including this level — used to render
   *  the depth-bar background. Normalized 0–1 against the side's max. */
  depth: number;
};

export type OrderBookSnapshot = {
  asks: OrderRow[];
  bids: OrderRow[];
  mid: string;
  spreadBps: string;
};

/** Deterministic-but-asset-aware orderbook generator. Same market id
 *  always produces the same shape so swapping the chart's market gives
 *  a stable, distinct book per asset instead of the old BTC clone. */
export function orderBookFor(market: Market): OrderBookSnapshot {
  const midNum = parseFloat(market.lastPrice.replace(/,/g, ""));
  if (!Number.isFinite(midNum)) {
    return { asks: [], bids: [], mid: market.lastPrice, spreadBps: "—" };
  }
  // Tick size scaled to the asset — BTC = ~1 USD, HYPE = ~0.01, etc.
  const tickFromMagnitude = Math.max(
    midNum * 0.0000132,
    Math.pow(10, Math.floor(Math.log10(midNum)) - 4),
  );
  const decimals = market.lastPrice.includes(".")
    ? market.lastPrice.split(".")[1].length
    : 0;
  const fmtPrice = (n: number) =>
    n.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  const rand = obSeed(market.id);
  const sizeMagnitude = 100_000 / midNum;
  const buildLevels = (count: number, dir: 1 | -1): OrderRow[] => {
    const rows: OrderRow[] = [];
    let cum = 0;
    for (let i = 0; i < count; i++) {
      const price = midNum + dir * tickFromMagnitude * (i + 1);
      const size = sizeMagnitude * (0.3 + rand() * 4.2);
      cum += size;
      const totalUsd = size * price;
      rows.push({
        price: fmtPrice(price),
        size: size.toFixed(decimals > 2 ? decimals : 4),
        total: compactUsd(totalUsd),
        depth: 0,
      });
    }
    const max = cum || 1;
    let running = 0;
    for (const r of rows) {
      running += parseFloat(r.size);
      r.depth = Math.min(
        1,
        running / parseFloat(rows[rows.length - 1].size) / count +
          (running / max) * 0.4,
      );
    }
    return dir === 1 ? rows.reverse() : rows;
  };
  const asks = buildLevels(12, 1);
  const bids = buildLevels(12, -1);
  const inAsk = midNum + tickFromMagnitude;
  const inBid = midNum - tickFromMagnitude;
  const spreadBps = (((inAsk - inBid) / midNum) * 10_000).toFixed(2);
  return {
    asks,
    bids,
    mid: fmtPrice(midNum),
    spreadBps: `${spreadBps} BPS`,
  };
}

function compactUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function obSeed(id: string) {
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) | 0;
  if (s < 0) s = -s;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Legacy named exports — kept around for any caller that hasn't
 *  switched to `orderBookFor`. Generated from BTC so the shape
 *  matches the original mocks. */
const BTC_SNAPSHOT = orderBookFor(
  MARKETS.find((m) => m.id === "btc") ?? MARKETS[0],
);
export const ASKS = BTC_SNAPSHOT.asks;
export const BIDS = BTC_SNAPSHOT.bids;
