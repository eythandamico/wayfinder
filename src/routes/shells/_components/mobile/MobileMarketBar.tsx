"use client";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MARKETS } from "../../_data/mocks";
import {
  useActiveMarket,
  useCommandBar,
} from "../../_state/shells-context";
import { useLiveMarketTicker } from "../../_hooks/useLiveMarketTicker";
import { TokenLogo } from "../TokenLogo";

/** Active-market badge that sits between the MobileTopBar and the
 *  chart. Tap the badge to open the command bar (market picker);
 *  tap ←/→ to cycle through MARKETS without leaving the chart.
 *
 *  Matches the desktop TradePanel.ActiveMarketHeader pattern so the
 *  market identity is one explicit affordance across both viewports
 *  instead of being implicit in the chart panel. */
export function MobileMarketBar() {
  const { activeMarket, setActiveMarket } = useActiveMarket();
  const { openCommand } = useCommandBar();

  const cycle = (dir: 1 | -1) => {
    const idx = MARKETS.findIndex((m) => m.id === activeMarket.id);
    const next = MARKETS[(idx + dir + MARKETS.length) % MARKETS.length];
    if (next) setActiveMarket(next);
  };

  // Same live-Binance source the desktop chart-header stats row uses,
  // so the badge price tracks the chart instead of drifting against
  // the static MARKETS mock. Falls back to the mock for non-Binance
  // markets (xyz: tokenized commodities/equities).
  const live = useLiveMarketTicker(activeMarket);
  const lastPrice = live?.lastPrice ?? activeMarket.lastPrice;
  const change24h = live?.change24h ?? activeMarket.change24h;
  const change24hTone = live?.change24hTone ?? activeMarket.change24hTone;

  const changeTone =
    change24hTone === "positive"
      ? "text-primary"
      : change24hTone === "negative"
        ? "text-tone-down"
        : "text-muted-foreground";

  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-white/[0.05] px-2 py-1.5">
      <button
        type="button"
        onClick={openCommand}
        aria-label={`Active market: ${activeMarket.symbol}. Open market picker.`}
        className="group flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-150 ease-out hover:bg-surface-1"
      >
        <TokenLogo
          symbol={activeMarket.symbol}
          char={activeMarket.iconChar}
          bg={activeMarket.iconBg}
          fg={activeMarket.iconFg ?? "#fff"}
          size={24}
        />
        <span className="truncate text-body font-semibold text-foreground">
          {activeMarket.symbol}
        </span>
        <ChevronDown
          aria-hidden
          strokeWidth={1.75}
          className="size-3 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
        />
        <span className="ml-auto flex shrink-0 items-baseline gap-1.5 text-body tabular-nums">
          <span className="text-foreground">{lastPrice}</span>
          <span className={cn("text-caption", changeTone)}>
            {change24h}
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-label="Previous market"
        onClick={() => cycle(-1)}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-2 hover:text-foreground active:scale-[0.96]"
      >
        <ChevronLeft strokeWidth={1.75} className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Next market"
        onClick={() => cycle(1)}
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-2 hover:text-foreground active:scale-[0.96]"
      >
        <ChevronRight strokeWidth={1.75} className="size-4" aria-hidden />
      </button>
    </div>
  );
}
