"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Timeframe } from "../_types";
import {
  MARKET_METRICS,
  TIMEFRAMES,
  TV_INTERVAL,
} from "../_data/mocks";
import { useActiveMarket, useCommandBar } from "../_state/shells-context";
import { BarDivider, ChevronDownIcon, ExternalLinkIcon } from "./icons";

export function ChartPanel({
  tfPosition = "header",
}: {
  /**
   * Where the timeframe pills render. "header" puts them in the top strip
   * (desktop default). "below" hides them from the header and renders a
   * dedicated row beneath the chart — useful on mobile where horizontal
   * room in the header is tight.
   */
  tfPosition?: "header" | "below";
} = {}) {
  const [tf, setTf] = useState<Timeframe>("1m");
  const { activeMarket: market } = useActiveMarket();
  const { openCommand } = useCommandBar();

  const timeframePills = (
    <div
      role="tablist"
      aria-label="Chart timeframe"
      className={cn(
        "flex items-center gap-0.5 rounded-lg bg-background/40 p-1",
        tfPosition === "header" ? "shrink-0" : "w-full",
      )}
    >
      {TIMEFRAMES.map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={tf === t}
          aria-label={`Timeframe ${t}`}
          onClick={() => setTf(t)}
          className={cn(
            "rounded-md px-[var(--ui-x-tight)] py-[var(--ui-y-tight)] text-body transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
            tfPosition === "below" && "flex-1",
            tf === t
              ? "bg-white/10 text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-muted">
      <div className="flex items-center gap-4 px-3 pt-3 pb-3">
        {/* Market selector + external */}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-label={`Change market. Current: ${market.symbol} ${market.leverage}`}
          onClick={openCommand}
          className="flex shrink-0 items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-white/[0.04]"
        >
          <span
            aria-hidden
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full font-bold",
              market.iconChar.length > 1
                ? "text-body"
                : "text-body",
            )}
            style={{
              backgroundColor: market.iconBg,
              color: market.iconFg ?? "#fff",
            }}
          >
            {market.iconChar}
          </span>
          <span aria-hidden className="text-body font-semibold">
            {market.symbol}
          </span>
          <span aria-hidden className="text-body text-muted-foreground">
            {market.leverage}
          </span>
          <ChevronDownIcon aria-hidden className="size-3 text-muted-foreground" />
        </button>
        <button
          type="button"
          aria-label="Open market externally"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
        >
          <ExternalLinkIcon />
        </button>

        <BarDivider />

        {/* Metrics — flex-1 so they take the middle, scrolls if cramped */}
        <div className="scroll-thin flex min-w-0 flex-1 items-center gap-5 overflow-x-auto">
          {MARKET_METRICS.map((m) => (
            <div key={m.label} className="flex shrink-0 flex-col gap-0.5">
              <span className="text-body text-muted-foreground">
                {m.label}
              </span>
              <span
                className={cn(
                  "text-body tabular-nums",
                  m.tone === "positive" && "text-primary",
                )}
                aria-label={
                  m.tone === "positive"
                    ? `${m.label}: up ${m.value}`
                    : undefined
                }
              >
                {m.value}
              </span>
            </div>
          ))}
        </div>

        {tfPosition === "header" && (
          <>
            <BarDivider />
            {timeframePills}
          </>
        )}
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-hidden px-3",
          tfPosition === "header" ? "pb-3" : "pb-2",
        )}
      >
        <TradingViewChart
          interval={TV_INTERVAL[tf]}
          symbol={market.tvSymbol}
        />
      </div>
      {tfPosition === "below" && (
        <div className="shrink-0 px-3 pb-3">{timeframePills}</div>
      )}
    </div>
  );
}

function TradingViewChart({
  interval,
  symbol,
}: {
  interval: string;
  symbol: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.innerHTML =
      '<div class="tradingview-widget-container__widget" style="height:100%;width:100%;"></div>';

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_top_toolbar: true,
      hide_legend: true,
      save_image: false,
      allow_symbol_change: false,
      backgroundColor: "#101818",
      gridColor: "rgba(255,255,255,0.04)",
    });

    host.appendChild(script);
  }, [interval, symbol]);

  return (
    <div
      ref={hostRef}
      className="tradingview-widget-container h-full w-full overflow-hidden rounded-md [&_iframe]:border-0 [&_iframe]:!h-[calc(100%+2px)] [&_iframe]:!w-[calc(100%+2px)] [&_iframe]:-m-px"
    />
  );
}
