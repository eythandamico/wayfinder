export type PathKind =
  | "strategy"
  | "skill"
  | "monitor"
  | "policy"
  | "script"
  | "tool";

export type PathStatus =
  | "bonded"
  | "pending-update"
  | "unbonded"
  | "probation";

/** Optional custom artwork supplied per path. When absent, surfaces
 *  fall back to a procedural kind-tone treatment. */
export type PathArtwork = {
  /** Wide hero image (16:9-ish). Used by the FeatureHero card on the
   *  Discover tab and the large editorial story cards. */
  hero?: string;
  /** Square emblem (1:1). Used in PathCards, chart rows, and any
   *  place a small identifying icon makes sense. */
  icon?: string;
  /** Optional editorial blurb the curators wrote for this path.
   *  Shown on FeatureHero / story cards above the description. */
  tagline?: string;
};

export type Path = {
  id: string;
  name: string;
  description: string;
  author: string; // "@username"
  kind: PathKind;
  version: string; // "v1.2.0"
  status: PathStatus;
  tags: string[];
  installs: number; // lifetime
  weeklyInstalls: number;
  stars: number; // community favorites / upvotes
  yieldPct?: string; // "+8.4%"
  ownerReward: string;
  communityReward: string;
  cost: string;
  /** Optional artwork bundle. Custom hero/icon images per path light
   *  up the FeatureHero, story cards, and PathCard mastheads. */
  artwork?: PathArtwork;
};

// PATHS_CATALOG_URL moved to @/lib/links so external URLs live in one place.
export { PATHS_CATALOG_URL } from "./links";

export const PATH_KIND_LABELS: Record<PathKind, string> = {
  strategy: "Strategy",
  skill: "Skill",
  monitor: "Monitor",
  policy: "Policy",
  script: "Script",
  tool: "Tool",
};

export const PATH_STATUS_LABELS: Record<PathStatus, string> = {
  bonded: "Bonded",
  "pending-update": "Pending update",
  unbonded: "Unbonded",
  probation: "Probation",
};

export const PATHS: Path[] = [
  {
    id: "spread-radar-reference",
    name: "Spread Radar Reference",
    description:
      "Clusters an asset universe, enumerates spread candidates, and surfaces a validated relative-value trade.",
    author: "@0xspreadlab",
    kind: "strategy",
    version: "v1.4.2",
    status: "bonded",
    tags: ["spread-radar", "relative-value"],
    installs: 148,
    weeklyInstalls: 34,
    stars: 62,
    yieldPct: "+8.4%",
    ownerReward: "0.2 PROMPT",
    communityReward: "0.1 PROMPT",
    cost: "0.2 PROMPT",
  },
  {
    id: "oil-macro-hedge",
    name: "Oil Macro Hedge",
    description:
      "Bearish oil via Polymarket WTI + ETH short on Hyperliquid, with monthly rollovers.",
    author: "@macromaximalist",
    kind: "strategy",
    version: "v0.9.1",
    status: "bonded",
    tags: ["polymarket", "macro"],
    installs: 62,
    weeklyInstalls: 20,
    stars: 24,
    yieldPct: "+5.4%",
    ownerReward: "1.5 PROMPT",
    communityReward: "0.5 PROMPT",
    cost: "2 PROMPT",
  },
  {
    id: "btc-momentum-trigger",
    name: "BTC Momentum Trigger",
    description:
      "Long BTC on 4h breakout of prior-week high; trails stop with ATR.",
    author: "@crypt0kuma",
    kind: "monitor",
    version: "v2.1.0",
    status: "bonded",
    tags: ["momentum", "btc"],
    installs: 412,
    weeklyInstalls: 142,
    stars: 218,
    yieldPct: "+12.1%",
    ownerReward: "0.7 PROMPT",
    communityReward: "0.3 PROMPT",
    cost: "1 PROMPT",
  },
  {
    id: "funding-farmer",
    name: "Funding Farmer",
    description:
      "Harvests positive funding across HL perps, delta-neutral against spot.",
    author: "@fundr",
    kind: "strategy",
    version: "v1.7.3",
    status: "bonded",
    tags: ["funding", "delta-neutral"],
    installs: 287,
    weeklyInstalls: 87,
    stars: 143,
    yieldPct: "+6.2%",
    ownerReward: "0.4 PROMPT",
    communityReward: "0.1 PROMPT",
    cost: "0.5 PROMPT",
  },
  {
    id: "liq-watch",
    name: "Liquidation Watcher",
    description:
      "Monitors liquidation clusters on BTC/ETH and alerts when position density crosses a threshold.",
    author: "@liqwatch",
    kind: "monitor",
    version: "v3.0.1",
    status: "bonded",
    tags: ["monitor", "risk"],
    installs: 512,
    weeklyInstalls: 194,
    stars: 297,
    yieldPct: "+2.1%",
    ownerReward: "0.1 PROMPT",
    communityReward: "0.05 PROMPT",
    cost: "0.1 PROMPT",
  },
  {
    id: "max-leverage-guard",
    name: "Max Leverage Guard",
    description:
      "Rejects orders above a configured leverage threshold. Enforces per-market caps.",
    author: "@guardian",
    kind: "policy",
    version: "v1.1.0",
    status: "bonded",
    tags: ["policy", "risk"],
    installs: 1204,
    weeklyInstalls: 310,
    stars: 611,
    ownerReward: "0 PROMPT",
    communityReward: "0 PROMPT",
    cost: "0 PROMPT",
  },
  {
    id: "tg-notifier",
    name: "Telegram Notifier",
    description:
      "Streams fills, alerts, and plan triggers to a Telegram channel of your choice.",
    author: "@tgbridge",
    kind: "tool",
    version: "v4.2.0",
    status: "bonded",
    tags: ["notification", "telegram"],
    installs: 2037,
    weeklyInstalls: 441,
    stars: 982,
    ownerReward: "0.05 PROMPT",
    communityReward: "0.02 PROMPT",
    cost: "0.05 PROMPT",
  },
  {
    id: "eth-basis-carry",
    name: "ETH Basis Carry",
    description:
      "Long ETH spot on Base, short ETH perp on Hyperliquid. Harvests basis until convergence.",
    author: "@basishunter",
    kind: "strategy",
    version: "v2.3.1",
    status: "pending-update",
    tags: ["basis", "delta-neutral"],
    installs: 183,
    weeklyInstalls: 45,
    stars: 76,
    yieldPct: "+4.8%",
    ownerReward: "0.3 PROMPT",
    communityReward: "0.1 PROMPT",
    cost: "0.5 PROMPT",
  },
  {
    id: "orderbook-imbalance",
    name: "Orderbook Imbalance",
    description:
      "Detects bid/ask imbalance events and produces entry signals for intraday mean-reversion.",
    author: "@microstructure",
    kind: "skill",
    version: "v1.0.3",
    status: "bonded",
    tags: ["microstructure", "signals"],
    installs: 88,
    weeklyInstalls: 22,
    stars: 41,
    ownerReward: "0.2 PROMPT",
    communityReward: "0.1 PROMPT",
    cost: "0.3 PROMPT",
  },
  {
    id: "pyth-oracle-guard",
    name: "Pyth Oracle Guard",
    description:
      "Checks oracle freshness and cross-venue deviation. Pauses agent if oracle is stale.",
    author: "@oracle",
    kind: "policy",
    version: "v1.2.2",
    status: "bonded",
    tags: ["oracle", "risk"],
    installs: 340,
    weeklyInstalls: 71,
    stars: 189,
    ownerReward: "0.05 PROMPT",
    communityReward: "0.025 PROMPT",
    cost: "0.1 PROMPT",
  },
  {
    id: "virtual-dn-test",
    name: "VIRTUAL DN Test Pack",
    description:
      "Test pack for on-chain publish + bond flow. Demonstrates the full Paths lifecycle.",
    author: "@wayfinder",
    kind: "strategy",
    version: "v0.2.0",
    status: "unbonded",
    tags: ["strategy", "delta-neutral"],
    installs: 4,
    weeklyInstalls: 0,
    stars: 1,
    yieldPct: "+1.4%",
    ownerReward: "0 PROMPT",
    communityReward: "0 PROMPT",
    cost: "0 PROMPT",
  },
  {
    id: "replay-exporter",
    name: "Session Replay Exporter",
    description:
      "Exports a trading session to a shareable, replayable artifact. Used by coaches and auditors.",
    author: "@replay",
    kind: "tool",
    version: "v0.6.0",
    status: "probation",
    tags: ["replay", "export"],
    installs: 12,
    weeklyInstalls: 2,
    stars: 3,
    ownerReward: "0 PROMPT",
    communityReward: "0 PROMPT",
    cost: "0.1 PROMPT",
  },
  /* ---------- Strategies ---------- */
  {
    id: "carry-cascade",
    name: "Carry Cascade",
    description:
      "Chains positive funding pairs across HL, dYdX, and Drift into a single rolling harvest.",
    author: "@cascadelab",
    kind: "strategy",
    version: "v1.0.2",
    status: "bonded",
    tags: ["funding", "perp", "delta-neutral"],
    installs: 154,
    weeklyInstalls: 38,
    stars: 92,
    yieldPct: "+9.7%",
    ownerReward: "0.6 PROMPT",
    communityReward: "0.2 PROMPT",
    cost: "0.8 PROMPT",
  },
  {
    id: "vol-premium-hunter",
    name: "Vol Premium Hunter",
    description:
      "Sells short-dated options when realized vol prints under implied; hedges with a perp delta.",
    author: "@volcraft",
    kind: "strategy",
    version: "v0.4.1",
    status: "pending-update",
    tags: ["vol", "options"],
    installs: 71,
    weeklyInstalls: 19,
    stars: 38,
    yieldPct: "+15.3%",
    ownerReward: "1 PROMPT",
    communityReward: "0.3 PROMPT",
    cost: "1.2 PROMPT",
  },
  {
    id: "mev-counter",
    name: "MEV Counter Edge",
    description:
      "Detects sandwich patterns on incoming swaps and reroutes through private mempool builders.",
    author: "@flashlooker",
    kind: "strategy",
    version: "v2.0.0",
    status: "bonded",
    tags: ["mev", "dex"],
    installs: 203,
    weeklyInstalls: 67,
    stars: 134,
    yieldPct: "+3.4%",
    ownerReward: "0.4 PROMPT",
    communityReward: "0.2 PROMPT",
    cost: "0.7 PROMPT",
  },
  /* ---------- Skills ---------- */
  {
    id: "sentiment-pulse",
    name: "Sentiment Pulse",
    description:
      "Pulls X sentiment scores for a watchlist and exposes them as agent-callable tools.",
    author: "@vibescore",
    kind: "skill",
    version: "v1.3.0",
    status: "bonded",
    tags: ["sentiment", "social"],
    installs: 432,
    weeklyInstalls: 88,
    stars: 215,
    ownerReward: "0.3 PROMPT",
    communityReward: "0.1 PROMPT",
    cost: "0.5 PROMPT",
  },
  {
    id: "onchain-sleuth",
    name: "Onchain Sleuth",
    description:
      "Traces wallet flows + derives positions across major chains. Returns a position summary on demand.",
    author: "@chainwalker",
    kind: "skill",
    version: "v2.0.5",
    status: "bonded",
    tags: ["onchain", "tracing"],
    installs: 318,
    weeklyInstalls: 54,
    stars: 167,
    ownerReward: "0.5 PROMPT",
    communityReward: "0.2 PROMPT",
    cost: "0.7 PROMPT",
  },
  {
    id: "liquidity-mapper",
    name: "Liquidity Mapper",
    description:
      "Aggregates DEX + CEX depth and produces a tradable size estimate for any pair.",
    author: "@depthseer",
    kind: "skill",
    version: "v1.1.0",
    status: "bonded",
    tags: ["liquidity", "execution"],
    installs: 167,
    weeklyInstalls: 41,
    stars: 89,
    ownerReward: "0.2 PROMPT",
    communityReward: "0.1 PROMPT",
    cost: "0.3 PROMPT",
  },
  {
    id: "risk-calc",
    name: "Position Size Calculator",
    description:
      "Computes contract size + R-multiple for a target risk budget given current account equity.",
    author: "@rstack",
    kind: "skill",
    version: "v1.0.0",
    status: "bonded",
    tags: ["risk", "sizing"],
    installs: 521,
    weeklyInstalls: 102,
    stars: 274,
    ownerReward: "0.1 PROMPT",
    communityReward: "0.05 PROMPT",
    cost: "0.1 PROMPT",
  },
  /* ---------- Monitors ---------- */
  {
    id: "whale-wake",
    name: "Whale Wake",
    description:
      "Pings when a tracked wallet moves over $1M of any liquid asset. Surfaces direction + venue.",
    author: "@krakenwatch",
    kind: "monitor",
    version: "v1.4.2",
    status: "bonded",
    tags: ["whale", "onchain"],
    installs: 612,
    weeklyInstalls: 137,
    stars: 380,
    ownerReward: "0.2 PROMPT",
    communityReward: "0.1 PROMPT",
    cost: "0.3 PROMPT",
  },
  {
    id: "funding-spike",
    name: "Funding Spike Alert",
    description:
      "Alerts when perp funding spreads diverge more than 3σ from the cross-venue mean.",
    author: "@fundr",
    kind: "monitor",
    version: "v1.0.1",
    status: "bonded",
    tags: ["funding", "perp"],
    installs: 224,
    weeklyInstalls: 56,
    stars: 121,
    yieldPct: "+3.8%",
    ownerReward: "0.15 PROMPT",
    communityReward: "0.05 PROMPT",
    cost: "0.2 PROMPT",
  },
  {
    id: "dex-volume",
    name: "DEX Volume Watcher",
    description:
      "Surfaces sustained volume regime changes on Hyperliquid + Uni v4 pools.",
    author: "@flowtracker",
    kind: "monitor",
    version: "v0.8.3",
    status: "pending-update",
    tags: ["volume", "dex"],
    installs: 78,
    weeklyInstalls: 24,
    stars: 41,
    ownerReward: "0.1 PROMPT",
    communityReward: "0.05 PROMPT",
    cost: "0.15 PROMPT",
  },
  {
    id: "stable-peg",
    name: "Stablecoin Peg Monitor",
    description:
      "Watches USDT/USDC/DAI off-peg events across top venues. Configurable threshold + venues.",
    author: "@pegwatcher",
    kind: "monitor",
    version: "v3.2.0",
    status: "bonded",
    tags: ["stablecoin", "risk"],
    installs: 904,
    weeklyInstalls: 192,
    stars: 461,
    ownerReward: "0.1 PROMPT",
    communityReward: "0.05 PROMPT",
    cost: "0.1 PROMPT",
  },
  /* ---------- Policies ---------- */
  {
    id: "cooldown",
    name: "Cooldown Enforcer",
    description:
      "Blocks new entries within N minutes of a closed trade. Per-symbol or global cooldown.",
    author: "@disciplined",
    kind: "policy",
    version: "v1.0.4",
    status: "bonded",
    tags: ["risk", "discipline"],
    installs: 372,
    weeklyInstalls: 81,
    stars: 184,
    ownerReward: "0 PROMPT",
    communityReward: "0 PROMPT",
    cost: "0 PROMPT",
  },
  {
    id: "sector-cap",
    name: "Sector Concentration Limit",
    description:
      "Caps total exposure per sector. Rejects orders that would breach the configured ceiling.",
    author: "@allocator",
    kind: "policy",
    version: "v0.7.0",
    status: "pending-update",
    tags: ["risk", "diversification"],
    installs: 156,
    weeklyInstalls: 32,
    stars: 79,
    ownerReward: "0 PROMPT",
    communityReward: "0 PROMPT",
    cost: "0 PROMPT",
  },
  {
    id: "drawdown-stop",
    name: "Daily Drawdown Stop",
    description:
      "Halts all trading after the session drops past a configured percentage loss.",
    author: "@sessionsafe",
    kind: "policy",
    version: "v2.1.1",
    status: "bonded",
    tags: ["risk", "session"],
    installs: 1043,
    weeklyInstalls: 247,
    stars: 552,
    ownerReward: "0 PROMPT",
    communityReward: "0 PROMPT",
    cost: "0 PROMPT",
  },
  {
    id: "token-allow",
    name: "Token Allowlist",
    description:
      "Restricts trades to a pre-approved set of tokens. Useful for compliance-bound desks.",
    author: "@compliance",
    kind: "policy",
    version: "v1.0.2",
    status: "bonded",
    tags: ["compliance", "allowlist"],
    installs: 198,
    weeklyInstalls: 41,
    stars: 92,
    ownerReward: "0 PROMPT",
    communityReward: "0 PROMPT",
    cost: "0 PROMPT",
  },
  /* ---------- Scripts ---------- */
  {
    id: "daily-digest",
    name: "Daily PnL Digest",
    description:
      "Emails a one-pager PnL summary at end-of-day. Breakdown by venue, side, and symbol.",
    author: "@digestbot",
    kind: "script",
    version: "v1.2.0",
    status: "bonded",
    tags: ["reporting", "email"],
    installs: 287,
    weeklyInstalls: 58,
    stars: 142,
    ownerReward: "0.05 PROMPT",
    communityReward: "0.02 PROMPT",
    cost: "0.05 PROMPT",
  },
  {
    id: "snapshot",
    name: "Position Snapshot",
    description:
      "Saves the current portfolio state to a versioned local JSON. Useful for forensics + rollback.",
    author: "@snapshotter",
    kind: "script",
    version: "v0.5.0",
    status: "bonded",
    tags: ["backup", "audit"],
    installs: 121,
    weeklyInstalls: 22,
    stars: 56,
    ownerReward: "0 PROMPT",
    communityReward: "0 PROMPT",
    cost: "0 PROMPT",
  },
  {
    id: "order-backfill",
    name: "Order Backfill",
    description:
      "Recreates missing order history by polling venue APIs + reconciling against fills.",
    author: "@gapclose",
    kind: "script",
    version: "v0.9.1",
    status: "pending-update",
    tags: ["reconcile", "history"],
    installs: 64,
    weeklyInstalls: 12,
    stars: 28,
    ownerReward: "0.05 PROMPT",
    communityReward: "0.02 PROMPT",
    cost: "0.1 PROMPT",
  },
  {
    id: "lot-tagger",
    name: "Tax Lot Tagger",
    description:
      "Tags fills with FIFO/LIFO/Spec-ID lot identifiers. Outputs Form 8949-ready CSV.",
    author: "@taxedge",
    kind: "script",
    version: "v1.0.0",
    status: "bonded",
    tags: ["tax", "lot-tracking"],
    installs: 412,
    weeklyInstalls: 73,
    stars: 198,
    ownerReward: "0.1 PROMPT",
    communityReward: "0.05 PROMPT",
    cost: "0.15 PROMPT",
  },
  /* ---------- Tools ---------- */
  {
    id: "chart-studio",
    name: "Chart Studio",
    description:
      "Drawable annotations layer on top of any chart panel. Persists across sessions.",
    author: "@penlines",
    kind: "tool",
    version: "v2.3.4",
    status: "bonded",
    tags: ["charting", "annotation"],
    installs: 1287,
    weeklyInstalls: 278,
    stars: 712,
    ownerReward: "0.05 PROMPT",
    communityReward: "0.02 PROMPT",
    cost: "0.1 PROMPT",
  },
  {
    id: "risk-heatmap",
    name: "Risk Heatmap",
    description:
      "Renders a correlation-weighted risk view across open positions. Highlights cluster exposure.",
    author: "@hotcorr",
    kind: "tool",
    version: "v1.5.0",
    status: "bonded",
    tags: ["risk", "viz"],
    installs: 446,
    weeklyInstalls: 92,
    stars: 218,
    ownerReward: "0.2 PROMPT",
    communityReward: "0.1 PROMPT",
    cost: "0.3 PROMPT",
  },
  {
    id: "key-vault",
    name: "API Key Vault",
    description:
      "Encrypted local store for venue credentials. Agent reads keys through a scoped interface.",
    author: "@vaultkeeper",
    kind: "tool",
    version: "v1.0.3",
    status: "bonded",
    tags: ["security", "credentials"],
    installs: 832,
    weeklyInstalls: 167,
    stars: 401,
    ownerReward: "0 PROMPT",
    communityReward: "0 PROMPT",
    cost: "0 PROMPT",
  },
];
