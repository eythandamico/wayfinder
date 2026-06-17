"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { MARKETS } from "../_data/mocks";
import type { Market } from "../_types";
import {
  useActiveMarket,
  useSeededWatchlist,
} from "../_state/shells-context";
import type { PanelInstance } from "../_layout/types";
import { AddTokenFooter } from "./AddTokenFooter";
import { AskAgentAffordance, AskAgentSpacer } from "./AskAgentAffordance";
import { TokenLogo } from "./TokenLogo";

/** Default ticker set when a watchlist is added fresh from the
 *  Add menu — covers the major perps the user trades. */
const DEFAULT_TICKERS = ["btc", "eth", "sol", "hype", "xrp"] as const;

/**
 * Watchlist — flat list of tokens the user wants to glance at without
 * sorting by movement. Tap a row to make it the active market in the
 * chart/trade/orderbook. The ticker set is per-instance, stored in
 * `panel.config.tickers` so multiple watchlists can coexist (e.g. one
 * for majors, one for memes) when the layout supports it.
 */
export function WatchlistPanel({ panel }: { panel: PanelInstance }) {
  const { setActiveMarket } = useActiveMarket();
  const { seededTickers } = useSeededWatchlist();
  // Per-panel config wins; then the global seed (e.g. set by the
  // fresh-wallet interview); then DEFAULT_TICKERS as the catch-all.
  // Local state so the demo "+ add" row can append without a layout
  // dispatcher action — the panel chrome owns the panel title/close,
  // so the body opens directly into the rows.
  const initial = useMemo(
    () =>
      (panel.config?.tickers as string[] | undefined) ??
      seededTickers ?? [...DEFAULT_TICKERS],
    [panel.config?.tickers, seededTickers],
  );
  const [tickers, setTickers] = useState<string[]>(initial);

  const rows = useMemo(
    () =>
      tickers
        .map((id) => MARKETS.find((m) => m.id === id))
        .filter((m): m is (typeof MARKETS)[number] => !!m),
    [tickers],
  );

  const available = useMemo(
    () => MARKETS.filter((m) => !tickers.includes(m.id)),
    [tickers],
  );

  const addTicker = (id: string) => {
    setTickers((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-body text-muted-foreground">
            No tokens in this list.
          </div>
        ) : (
          rows.map((m) => (
            <WatchRow
              key={m.id}
              market={m}
              onSelect={() => setActiveMarket(m)}
            />
          ))
        )}
      </div>
      {available.length > 0 && (
        <AddTokenFooter
          available={available}
          onAdd={(m) => addTicker(m.id)}
        />
      )}
    </div>
  );
}

function parseChangePct(s: string): number {
  const n = parseFloat(s.replace(/[%+]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function WatchRow({
  market,
  onSelect,
}: {
  market: Market;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const pct = parseChangePct(market.change24h);
  const up = pct >= 0;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative border-b border-white/[0.05]"
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Open ${market.symbol} chart`}
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
      >
        <TokenLogo
          symbol={market.symbol}
          char={market.iconChar}
          bg={market.iconBg}
          fg={market.iconFg ?? "#fff"}
          size={26}
        />
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-body font-medium text-foreground">
            {market.symbol.split("-")[0]}
          </span>
          <span className="truncate text-caption text-muted-foreground">
            {market.symbol}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end leading-tight">
          <span className="text-body tabular-nums text-foreground">
            {market.lastPrice}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-caption tabular-nums",
              up ? "text-primary" : "text-tone-down",
            )}
          >
            {up ? (
              <ArrowUp strokeWidth={2.25} className="size-3" aria-hidden />
            ) : (
              <ArrowDown strokeWidth={2.25} className="size-3" aria-hidden />
            )}
            {pct >= 0 ? "+" : ""}
            {pct.toFixed(2)}%
          </span>
        </div>
        <AskAgentSpacer visible={hovered} />
      </button>
      <AskAgentAffordance
        payload={{ kind: "market", market }}
        ariaLabel={`Ask agent about ${market.symbol}`}
        visible={hovered}
      />
    </div>
  );
}
