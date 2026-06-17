/**
 * Mini ticker registry for the composer's `$TICKER` preview chip and the
 * `/buy`-style slash commands. Anything in here lights up as soon as the
 * user types `$AAPL`, `$BTC`, etc. in any chat composer.
 *
 * Mocked numbers — real data wiring would replace this lookup.
 */

import type { CardKind } from "./trading-cards";

export type TickerData = {
  ticker: string;
  name: string;
  kind: CardKind;
  price: number;
  change24h: number;
  iconChar: string;
  iconBg: string;
  iconFg?: string;
};

export const TICKERS: Record<string, TickerData> = {
  AAPL: { ticker: "AAPL", name: "Apple Inc.", kind: "stock", price: 232.45, change24h: 2.84, iconChar: "A", iconBg: "#000", iconFg: "#fff" },
  TSLA: { ticker: "TSLA", name: "Tesla Inc.", kind: "stock", price: 412.18, change24h: 5.62, iconChar: "T", iconBg: "#cc0000", iconFg: "#fff" },
  NVDA: { ticker: "NVDA", name: "NVIDIA Corp.", kind: "stock", price: 138.04, change24h: -3.12, iconChar: "N", iconBg: "#76b900", iconFg: "#000" },
  MSFT: { ticker: "MSFT", name: "Microsoft Corp.", kind: "stock", price: 419.5, change24h: 0.42, iconChar: "M", iconBg: "#0078d4", iconFg: "#fff" },
  GOOGL: { ticker: "GOOGL", name: "Alphabet Inc.", kind: "stock", price: 168.4, change24h: 1.12, iconChar: "G", iconBg: "#4285f4", iconFg: "#fff" },
  META: { ticker: "META", name: "Meta Platforms", kind: "stock", price: 542.2, change24h: 1.78, iconChar: "M", iconBg: "#0866ff", iconFg: "#fff" },
  AMZN: { ticker: "AMZN", name: "Amazon.com", kind: "stock", price: 184.6, change24h: 0.92, iconChar: "A", iconBg: "#ff9900", iconFg: "#000" },
  BTC: { ticker: "BTC", name: "Bitcoin", kind: "crypto", price: 75739.5, change24h: 1.42, iconChar: "₿", iconBg: "#f7931a", iconFg: "#000" },
  ETH: { ticker: "ETH", name: "Ethereum", kind: "crypto", price: 2310.9, change24h: 0.18, iconChar: "Ξ", iconBg: "#627eea", iconFg: "#fff" },
  SOL: { ticker: "SOL", name: "Solana", kind: "crypto", price: 92.4, change24h: 4.18, iconChar: "S", iconBg: "#9945ff", iconFg: "#fff" },
  HYPE: { ticker: "HYPE", name: "Hyperliquid", kind: "crypto", price: 24.18, change24h: 1.18, iconChar: "H", iconBg: "var(--primary)", iconFg: "#000" },
  DOGE: { ticker: "DOGE", name: "Dogecoin", kind: "crypto", price: 0.142, change24h: -0.84, iconChar: "Ð", iconBg: "#c2a633", iconFg: "#000" },
};

/** Parse the first `$TICKER` reference in a draft string, if any. */
export function extractTicker(text: string): TickerData | null {
  const m = text.match(/\$([A-Z]{1,6})\b/i);
  if (!m) return null;
  return TICKERS[m[1].toUpperCase()] ?? null;
}

/* ------------------------------------------------------------------ */
/*  Slash commands                                                     */
/* ------------------------------------------------------------------ */

export type SlashCommand = {
  id: string;
  prefix: string;
  label: string;
  hint: string;
};

export const SLASH_COMMANDS: SlashCommand[] = [
  { id: "buy", prefix: "/buy", label: "Buy", hint: "$TICKER size · long position" },
  { id: "sell", prefix: "/sell", label: "Sell", hint: "$TICKER size · short position" },
  { id: "card", prefix: "/card", label: "Card", hint: "$TICKER bullish/bearish thesis" },
  { id: "chart", prefix: "/chart", label: "Chart", hint: "$TICKER · open chart" },
  { id: "watch", prefix: "/watch", label: "Watch", hint: "$TICKER · monitor for alerts" },
  { id: "close", prefix: "/close", label: "Close", hint: "$TICKER · close position" },
];

/** Slash-command suggestions for a given draft. Empty if the draft doesn't
 *  start with `/`. */
export function matchSlashCommands(text: string): SlashCommand[] {
  if (!text.startsWith("/")) return [];
  const head = text.split(/\s+/)[0]?.toLowerCase() ?? "";
  return SLASH_COMMANDS.filter((c) => c.prefix.startsWith(head));
}
