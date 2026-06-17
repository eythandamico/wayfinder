"use client";

import { useEffect, useState } from "react";
import type { Market } from "../_types";

/**
 * Live 24hr ticker from Binance's public REST endpoint, polled every
 * `POLL_MS`. Returns the four price-derived fields the chart header
 * metric strip reads (lastPrice / change24h / change24hTone / volume)
 * so the header can mirror what TradingView's chart is actually
 * rendering instead of the static mock numbers baked into MARKETS.
 *
 * Mark / Oracle / OI / Funding are computed downstream by
 * `metricsForMarket` from these four fields, so wiring the source
 * propagates through every derived metric automatically.
 *
 * Scope: native crypto only (Binance hosts the TradingView feed too,
 * so prices match 1:1). Markets whose `tvSymbol` doesn't start with
 * `BINANCE:` — the `xyz:` tokenized commodities/equities — return
 * `null` and the caller keeps the static MARKETS values.
 */

const POLL_MS = 5_000;

export type LiveTicker = {
  lastPrice: string;
  change24h: string;
  change24hTone: "positive" | "negative";
  volume: string;
};

type BinanceTicker = {
  lastPrice: string;
  priceChangePercent: string;
  quoteVolume: string;
};

export function useLiveMarketTicker(market: Market): LiveTicker | null {
  const [ticker, setTicker] = useState<LiveTicker | null>(null);

  // Binance symbols look like "BINANCE:BTCUSDT" in our TradingView
  // catalog. Anything else (TVC, OANDA, FOREXCOM, …) bails to null
  // and the caller falls back to static MARKETS data.
  const binanceSymbol = market.tvSymbol.startsWith("BINANCE:")
    ? market.tvSymbol.slice("BINANCE:".length)
    : null;

  useEffect(() => {
    // Non-Binance markets short-circuit at the return statement below.
    // We don't reset state here — `binanceSymbol ? ticker : null` at
    // the bottom keeps the contract without a setState-in-effect.
    if (!binanceSymbol) return;

    let cancelled = false;

    const fetchTicker = async () => {
      try {
        const res = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as BinanceTicker;
        if (cancelled) return;

        const lastPriceNum = parseFloat(data.lastPrice);
        const pctNum = parseFloat(data.priceChangePercent);
        const volumeNum = parseFloat(data.quoteVolume);
        if (
          !Number.isFinite(lastPriceNum) ||
          !Number.isFinite(pctNum) ||
          !Number.isFinite(volumeNum)
        ) {
          return;
        }

        setTicker({
          lastPrice: formatPrice(lastPriceNum),
          change24h: `${pctNum >= 0 ? "+" : ""}${pctNum.toFixed(2)}%`,
          change24hTone: pctNum >= 0 ? "positive" : "negative",
          volume: formatCompactUsd(volumeNum),
        });
      } catch {
        // Network or parse error — keep the last known value so the
        // header doesn't blank out on a transient failure.
      }
    };

    fetchTicker();
    const id = window.setInterval(fetchTicker, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [binanceSymbol]);

  // Gate at the return so callers always see null for non-Binance
  // markets even if state was set during a prior Binance selection.
  return binanceSymbol ? ticker : null;
}

/** Matches the visual rhythm of the static MARKETS prices: thousands-
 *  grouped with one decimal for big numbers (BTC), three decimals for
 *  mid (SOL), four for sub-dollar (DOGE, FARTCOIN). */
function formatPrice(n: number): string {
  if (n >= 1000) {
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }
  if (n >= 1) {
    return n.toLocaleString("en-US", {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  }
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
}

function formatCompactUsd(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(0)}`;
}
