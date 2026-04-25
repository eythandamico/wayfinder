export type Venue = "hl-perps" | "hl-spot" | "onchain" | "polymarket";

export type Market = {
  id: string;
  symbol: string;
  tvSymbol: string;
  venue: Venue;
  iconChar: string;
  iconBg: string;
  iconFg?: string;
  leverage: string;
  lastPrice: string;
  change24h: string;
  change24hTone: "positive" | "negative";
  volume: string;
};

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export type ChatMessage =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; meta: string };

export type Session = {
  id: string;
  name: string;
  age: string;
};

export type Job = {
  id: string;
  name: string;
  sessionId: string;
  cadence: string;
  status: "active" | "paused" | "error";
  lastRunAt?: string;
  createdAt: string;
};

export type Model = {
  id: string;
  label: string;
};

export type UsageData = {
  sessionDuration: string;
  cpu: { percent: number };
  ram: { used: number; total: number };
  tokens: { used: number; total: number };
  costUsd: number;
};

export type MarketMetric = {
  label: string;
  value: string;
  tone?: "positive";
};

export type Wallet = {
  id: string;
  name: string;
  address: string;
  primary?: boolean;
};

export type { Path } from "@/lib/paths";
