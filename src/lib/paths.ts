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
];
