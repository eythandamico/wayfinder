import type {
  ChatMessage,
  Job,
  Market,
  MarketMetric,
  Model,
  Session,
  Timeframe,
  UsageData,
  Venue,
  Wallet,
} from "../_types";

export { PATHS, PATHS_CATALOG_URL } from "@/lib/paths";

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
    tvSymbol: "BINANCE:BTCUSDT",
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
    tvSymbol: "BINANCE:BTCUSDT",
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
    tvSymbol: "BINANCE:BTCUSDT",
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
    tvSymbol: "BINANCE:BTCUSDT",
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
    tvSymbol: "BINANCE:BTCUSDT",
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
    tvSymbol: "BINANCE:BTCUSDT",
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

export const NAV_SECTIONS = [
  { label: "Home", href: "/" },
  { label: "Shells", href: "/shells" },
  { label: "OpenClaw", href: "/openclaw" },
  { label: "Paths", href: "/paths" },
];

export const CURRENT_SECTION = "Shells";
export const WALLET_ADDRESS = "0xa1536Cf17e2bFE9B4C0b0C34dC8D4D8a58e8Eb3C2";

export const MARKET_METRICS: MarketMetric[] = [
  { label: "Price", value: "$75,739.5" },
  { label: "Mark", value: "$75,750" },
  { label: "Oracle", value: "$75,794" },
  { label: "24h", value: "+1.38%", tone: "positive" },
  { label: "24h Vol", value: "$2.47B" },
  { label: "Open Interest", value: "$1.99B" },
  { label: "Funding", value: "—" },
];

export const ASKS = [
  { price: "75782.0", size: "1.0536", total: "$79.8K" },
  { price: "75781.0", size: "2.16625", total: "$164.2K" },
  { price: "75780.0", size: "1.08779", total: "$82.4K" },
  { price: "75779.0", size: "2.27199", total: "$172.2K" },
  { price: "75778.0", size: "2.96346", total: "$224.6K" },
  { price: "75777.0", size: "0.30037", total: "$22.8K" },
  { price: "75776.0", size: "0.31562", total: "$23.9K" },
  { price: "75775.0", size: "4.17616", total: "$316.4K" },
  { price: "75774.0", size: "1.02283", total: "$77.5K" },
  { price: "75773.0", size: "0.02933", total: "$2.2K" },
  { price: "75772.0", size: "0.07387", total: "$5.6K" },
  { price: "75771.0", size: "2.78769", total: "$211.2K" },
];

export const BIDS = [
  { price: "75766.0", size: "28.7483", total: "$2.18M" },
  { price: "75765.0", size: "2.98518", total: "$226.2K" },
  { price: "75764.0", size: "0.6197", total: "$47.0K" },
  { price: "75763.0", size: "2.93655", total: "$222.5K" },
  { price: "75762.0", size: "0.7779", total: "$58.9K" },
  { price: "75761.0", size: "1.37037", total: "$103.8K" },
  { price: "75760.0", size: "3.59909", total: "$272.7K" },
  { price: "75759.0", size: "1.88698", total: "$143.0K" },
  { price: "75758.0", size: "2.46317", total: "$186.6K" },
  { price: "75757.0", size: "3.31719", total: "$251.3K" },
  { price: "75756.0", size: "6.626", total: "$502.0K" },
  { price: "75755.0", size: "1.30621", total: "$99.0K" },
];

export const SAMPLE_MESSAGES: ChatMessage[] = [
  { role: "user", text: "hey" },
  {
    role: "assistant",
    text: "Hey! How can I help you today?",
    meta: "kimi-k2.5 · 4.0s · 213 tokens",
  },
  { role: "user", text: "thunderbolts and lightning very very frightening" },
  {
    role: "assistant",
    text: "Galileo! Galileo! 🎸\nWhat can I help you with today?",
    meta: "kimi-k2.5 · 3.9s · 296 tokens",
  },
];

export const SAMPLE_SESSIONS: Session[] = [
  { id: "1", name: "Greeting", age: "3d" },
  { id: "2", name: "BTC hedge research", age: "1w" },
  { id: "3", name: "Delta-neutral pack review", age: "2w" },
];

export const SAMPLE_JOBS: Job[] = [
  {
    id: "j1",
    name: "BTC funding monitor",
    sessionId: "2",
    cadence: "every 15m",
    status: "active",
    lastRunAt: "4m ago",
    createdAt: "3d",
  },
  {
    id: "j2",
    name: "ETH delta rebalance",
    sessionId: "3",
    cadence: "every 4h",
    status: "active",
    lastRunAt: "2h ago",
    createdAt: "1w",
  },
  {
    id: "j3",
    name: "SOL momentum entry",
    sessionId: "2",
    cadence: "daily 9am",
    status: "paused",
    createdAt: "5d",
  },
  {
    id: "j4",
    name: "LP harvester",
    sessionId: "1",
    cadence: "hourly",
    status: "error",
    lastRunAt: "38m ago",
    createdAt: "1w",
  },
  {
    id: "j5",
    name: "Polymarket recap",
    sessionId: "3",
    cadence: "weekly",
    status: "active",
    lastRunAt: "3d ago",
    createdAt: "2w",
  },
];

export const MODEL_PROVIDER = "Wayfinder";
export const MODELS: Model[] = [
  { id: "kimi-k2.5", label: "Kimi K2.5" },
  { id: "kimi-k2-thinking", label: "Kimi K2 Thinking" },
];

export const WALLETS: Wallet[] = [
  {
    id: "w1",
    name: "warm-seeking-fox",
    address: "0xa1536Cf17e2bFE9B4C0b0C34dC8D4D8a58e8Eb3C2",
    primary: true,
  },
  {
    id: "w2",
    name: "quiet-mountain-bear",
    address: "0x7b3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f89a0b1c2",
  },
  {
    id: "w3",
    name: "cold-evening-wolf",
    address: "0x4f2e1a3b5c7d9e0f1a2b3c4d5e6f7a8b9c0d1e2f",
  },
];

export const MOCK_USAGE: UsageData = {
  sessionDuration: "12m",
  cpu: { percent: 18 },
  ram: { used: 1.2, total: 4.0 },
  tokens: { used: 12_400, total: 100_000 },
  costUsd: 0.06,
};
