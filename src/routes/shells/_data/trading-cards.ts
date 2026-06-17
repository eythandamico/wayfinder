/**
 * Trading-card data model.
 *
 * Each card is a *moment-bound artifact* — a snapshot of a trading signal
 * with the conversational context that birthed it. Cards float above the
 * chat composer while the topic is live, then expire when the topic
 * shifts.
 *
 * Underlying asset = tokenized equity or crypto on Hyperliquid.
 */

export type CardSentiment = "bull" | "bear" | "neutral";
export type CardVolatility = "calm" | "active" | "wild";
export type CardKind = "stock" | "crypto";

export type TradingCardAuthor = {
  id: string;
  name: string;
};

export type CardReaction = {
  emoji: string;
  count: number;
};

/**
 * Where the signal came from. Every card has a source — either a real
 * chat (friend / group / DM), a news outlet (RSS-ish surfacing), or
 * an agent flagging something. Downstream feeds (Activity, SignalToast)
 * use the source to split Personal (chat + agent) from Public (news).
 * When unset, the card defaults to a chat origin attributed to its
 * author.
 */
export type CardOrigin =
  | { kind: "chat"; channel?: string }
  | { kind: "news"; outlet: string }
  | { kind: "agent"; agentName?: string };

/**
 * Lifecycle state for a signal.
 *
 *   open     — currently live; P/L floats with the price
 *   closed   — taken off at a profit/loss; closedPrice + closedAt set
 *   stopped  — stopped out; closedPrice usually below entry for longs
 *   expired  — thesis-time window passed without a clean exit
 *
 * Open is the implicit default when this field is absent.
 */
export type CardStatus = "open" | "closed" | "stopped" | "expired";

export type TradingCard = {
  id: string;
  ticker: string;
  name: string;
  kind: CardKind;
  thesis: string;
  sentiment: CardSentiment;
  volatility: CardVolatility;
  price: number;
  change24h: number;
  sparkline: number[];
  edition: number;
  createdAt: number;
  author: TradingCardAuthor;
  /** Token glyph used as a fallback when the logo registry doesn't carry
   *  this ticker (most stocks). */
  iconChar: string;
  iconBg: string;
  iconFg?: string;
  /** Stacked emoji reactions from chat members. */
  reactions?: CardReaction[];
  /** Number of people who've piled into this trade. */
  pileInCount?: number;
  /** Where this signal originated. Optional — when absent, treat as
   *  chat-sourced and attribute to `author`. */
  source?: CardOrigin;
  /** Lifecycle state. Undefined = open. */
  status?: CardStatus;
  /** Locked-in entry price for P/L math. Falls back to `price` for
   *  legacy / mock cards that don't carry one. */
  entryPrice?: number;
  /** When closed/stopped/expired, the price at which the signal was
   *  resolved. P/L = (closedPrice − entryPrice) / entryPrice × side. */
  closedPrice?: number;
  closedAt?: number;
};

/**
 * Build a synthetic TradingCard from a ticker registry entry — used when
 * the user types `$AAPL` in the composer and sends it, materializing
 * a card inline in the chat thread.
 */
export function buildCardFromTicker(
  t: {
    ticker: string;
    name: string;
    kind: CardKind;
    price: number;
    change24h: number;
    iconChar: string;
    iconBg: string;
    iconFg?: string;
  },
  opts: {
    thesis?: string;
    author?: TradingCardAuthor;
  } = {},
): TradingCard {
  const sentiment: CardSentiment =
    t.change24h > 0.5 ? "bull" : t.change24h < -0.5 ? "bear" : "neutral";
  const volatility: CardVolatility =
    Math.abs(t.change24h) > 3 ? "wild" : Math.abs(t.change24h) > 1 ? "active" : "calm";
  const sparkline =
    sentiment === "bear"
      ? downTrend(32, t.price, t.price * 0.003)
      : upTrend(32, t.price, t.price * 0.003);
  return {
    id: `card-user-${t.ticker.toLowerCase()}-${Date.now()}`,
    ticker: t.ticker,
    name: t.name,
    kind: t.kind,
    thesis: opts.thesis?.trim() || `Watching $${t.ticker} — call sized in`,
    sentiment,
    volatility,
    price: t.price,
    change24h: t.change24h,
    sparkline,
    edition: 1,
    createdAt: Date.now(),
    author: opts.author ?? { id: "me", name: "you" },
    iconChar: t.iconChar,
    iconBg: t.iconBg,
    iconFg: t.iconFg,
    status: "open",
    entryPrice: t.price,
  };
}

const upTrend = (n: number, base: number, jitter = 0.4) =>
  Array.from({ length: n }, (_, i) => {
    const trend = base + (i / n) * base * 0.18;
    const noise = (Math.sin(i * 1.31) + Math.cos(i * 0.73)) * jitter;
    return trend + noise;
  });

const downTrend = (n: number, base: number, jitter = 0.4) =>
  Array.from({ length: n }, (_, i) => {
    const trend = base - (i / n) * base * 0.12;
    const noise = (Math.sin(i * 1.31) + Math.cos(i * 0.73)) * jitter;
    return trend + noise;
  });

/* ------------------------------------------------------------------ */
/*  Group-scoped sample cards                                          */
/*                                                                     */
/*  Each group's chat thread (see FriendChat) is tuned so the messages */
/*  reference these same tickers + theses. Cards are the on-screen     */
/*  ratification of what people are saying in the room.                */
/* ------------------------------------------------------------------ */

export const ALPHA_HUNTERS_CARDS: TradingCard[] = [
  {
    id: "card-aapl-ah-001",
    ticker: "AAPL",
    name: "Apple Inc.",
    kind: "stock",
    thesis: "Shorts about to cover into earnings — funding flipped negative on perps",
    sentiment: "bull",
    volatility: "active",
    price: 232.45,
    change24h: 2.84,
    sparkline: upTrend(32, 225, 0.6),
    edition: 1,
    createdAt: Date.now() - 1000 * 60 * 6,
    author: { id: "kalos", name: "loomdart" },
    iconChar: "A",
    iconBg: "#000",
    iconFg: "#fff",
  },
  {
    id: "card-tsla-ah-001",
    ticker: "TSLA",
    name: "Tesla Inc.",
    kind: "stock",
    thesis: "Cybertruck deliveries pulling forward — momentum bid into the open",
    sentiment: "bull",
    volatility: "wild",
    price: 412.18,
    change24h: 5.62,
    sparkline: upTrend(32, 388, 0.9),
    edition: 2,
    createdAt: Date.now() - 1000 * 60 * 2,
    author: { id: "bounty", name: "GCR" },
    iconChar: "T",
    iconBg: "#cc0000",
    iconFg: "#fff",
  },
  {
    id: "card-nvda-ah-001",
    ticker: "NVDA",
    name: "NVIDIA Corp.",
    kind: "stock",
    thesis: "Hyperscaler capex guidance softer — dataset compute cooling into print",
    sentiment: "bear",
    volatility: "active",
    price: 138.04,
    change24h: -3.12,
    sparkline: downTrend(32, 142, 0.5),
    edition: 1,
    createdAt: Date.now() - 1000 * 60 * 30,
    author: { id: "deuce", name: "DCFGod" },
    iconChar: "N",
    iconBg: "#76b900",
    iconFg: "#000",
  },
];

export const FUNDING_CAPTURE_CARDS: TradingCard[] = [
  {
    id: "card-btc-fc-001",
    ticker: "BTC",
    name: "Bitcoin",
    kind: "crypto",
    thesis: "Funding flipped negative — short the perp, long spot for clean basis",
    sentiment: "bull",
    volatility: "calm",
    price: 75739.5,
    change24h: 1.42,
    sparkline: upTrend(32, 74_500, 1.2),
    edition: 7,
    createdAt: Date.now() - 1000 * 60 * 14,
    author: { id: "ryzla", name: "0xfoobar" },
    iconChar: "₿",
    iconBg: "#f7931a",
    iconFg: "#000",
  },
  {
    id: "card-eth-fc-001",
    ticker: "ETH",
    name: "Ethereum",
    kind: "crypto",
    thesis: "Spreads compressing — wait for next funding window, otherwise neutral",
    sentiment: "neutral",
    volatility: "calm",
    price: 2310.9,
    change24h: 0.18,
    sparkline: upTrend(32, 2_295, 0.3),
    edition: 3,
    createdAt: Date.now() - 1000 * 60 * 22,
    author: { id: "kalos", name: "loomdart" },
    iconChar: "Ξ",
    iconBg: "#627eea",
    iconFg: "#fff",
  },
  {
    id: "card-hype-fc-001",
    ticker: "HYPE",
    name: "Hyperliquid",
    kind: "crypto",
    thesis: "Funding's flipped positive again — closing the perp short, taking the carry",
    sentiment: "bear",
    volatility: "wild",
    price: 24.18,
    change24h: -1.84,
    sparkline: downTrend(32, 24.5, 0.05),
    edition: 4,
    createdAt: Date.now() - 1000 * 60 * 9,
    author: { id: "jcrew", name: "wassie.eth" },
    iconChar: "H",
    iconBg: "var(--primary)",
    iconFg: "#000",
  },
];

/**
 * Map from group contact id → the cards floating in that chat.
 */
export const CARDS_BY_GROUP: Record<string, TradingCard[]> = {
  "alpha-hunters": ALPHA_HUNTERS_CARDS,
  "funding-capture": FUNDING_CAPTURE_CARDS,
};

/* ------------------------------------------------------------------ */
/*  Friend-scoped cards                                                */
/*                                                                     */
/*  Each friend has one card representing the trade idea they're       */
/*  currently bouncing in DMs. The 1:1 mock thread mirrors it.         */
/* ------------------------------------------------------------------ */

/**
 * Sparse on purpose — most DMs are just conversation; cards only appear
 * where the friend is actively bouncing a trade.
 */
export const CARDS_BY_FRIEND: Record<string, TradingCard[]> = {
  kalos: [
    {
      id: "card-aapl-kalos",
      ticker: "AAPL",
      name: "Apple Inc.",
      kind: "stock",
      thesis: "Earnings setup is too clean — long the run, hedging gamma with front-month vol",
      sentiment: "bull",
      volatility: "active",
      price: 232.45,
      change24h: 2.84,
      sparkline: upTrend(32, 225, 0.6),
      edition: 4,
      createdAt: Date.now() - 1000 * 60 * 11,
      author: { id: "kalos", name: "loomdart" },
      iconChar: "A",
      iconBg: "#000",
      iconFg: "#fff",
    },
  ],
  bounty: [
    {
      id: "card-nvda-bounty",
      ticker: "NVDA",
      name: "NVIDIA Corp.",
      kind: "stock",
      thesis: "Fading the print — capex guidance trims data-center growth, shorting into the rip",
      sentiment: "bear",
      volatility: "active",
      price: 138.04,
      change24h: -3.12,
      sparkline: downTrend(32, 142, 0.5),
      edition: 2,
      createdAt: Date.now() - 1000 * 60 * 25,
      author: { id: "bounty", name: "GCR" },
      iconChar: "N",
      iconBg: "#76b900",
      iconFg: "#000",
    },
  ],
  jcrew: [
    {
      id: "card-hype-jcrew",
      ticker: "HYPE",
      name: "Hyperliquid",
      kind: "crypto",
      thesis: "Funding inflection done — opening a small perp long, sized tight",
      sentiment: "bull",
      volatility: "active",
      price: 24.18,
      change24h: 1.18,
      sparkline: upTrend(32, 23.7, 0.06),
      edition: 1,
      createdAt: Date.now() - 1000 * 60 * 4,
      author: { id: "jcrew", name: "wassie.eth" },
      iconChar: "H",
      iconBg: "var(--primary)",
      iconFg: "#000",
    },
  ],
};

/** Legacy flat list — kept for any caller that hasn't migrated. */
export const SAMPLE_TRADING_CARDS: TradingCard[] = [
  ...ALPHA_HUNTERS_CARDS,
  ...FUNDING_CAPTURE_CARDS,
];

/* ------------------------------------------------------------------ */
/*  Seed reactions + pile-in counts on the sample data so the chat    */
/*  panel renders with social signal out of the box. Bullish cards    */
/*  skew rocket / fire; bearish skew skull; neutrals get brain.       */
/* ------------------------------------------------------------------ */

// Pile-in counter now represents real filled positions (one-tap order
// = one filled pile-in). Keeping seeded counts in single digits so the
// social signal reads plausibly rather than as vanity inflation.
const SEED_PILE_IN: Record<string, number> = {
  "card-aapl-ah-001": 3,
  "card-tsla-ah-001": 5,
  "card-nvda-ah-001": 2,
  "card-btc-fc-001": 3,
  "card-eth-fc-001": 1,
  "card-hype-fc-001": 2,
  "card-aapl-kalos": 2,
  "card-nvda-bounty": 3,
  "card-hype-jcrew": 3,
};

const REACTION_SETS: Record<CardSentiment, CardReaction[]> = {
  bull: [
    { emoji: "🚀", count: 8 },
    { emoji: "🔥", count: 3 },
  ],
  bear: [
    { emoji: "💀", count: 5 },
    { emoji: "👀", count: 2 },
  ],
  neutral: [
    { emoji: "🧠", count: 4 },
    { emoji: "👀", count: 1 },
  ],
};

for (const card of [
  ...ALPHA_HUNTERS_CARDS,
  ...FUNDING_CAPTURE_CARDS,
  ...Object.values(CARDS_BY_FRIEND).flat(),
]) {
  card.pileInCount = SEED_PILE_IN[card.id] ?? 0;
  card.reactions = REACTION_SETS[card.sentiment];
}
