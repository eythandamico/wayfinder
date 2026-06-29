"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveMarketTicker } from "../_hooks/useLiveMarketTicker";
import { AskAgentButton } from "./AskAgentAffordance";
import { TokenLogo } from "./TokenLogo";

const PLOT_SUPPORT_EVENT = "wf:demo:plot-chart";

type SupportLine = {
  title: string;
  price?: string;
  /** Vertical position of the line as a 0–100 percent from the top of
   *  the chart area. The TradingView iframe isn't programmatically
   *  introspectable, so demos eyeball a y position. */
  yPct?: number;
};
import type { PanelInstance } from "../_layout/types";
import { MARKETS, metricsForMarket } from "../_data/mocks";
import {
  useActiveMarket,
  useChartMarkets,
  useCommandBar,
  useMainChart,
  useMarketPickerTarget,
} from "../_state/shells-context";
import { BarDivider, ChevronDownIcon } from "./icons";

export function ChartPanel({
  panel,
  tfPosition = "header",
}: {
  /**
   * Optional panel instance. Without it (e.g. the mobile single-chart
   * mount) the chart behaves as the main — it mirrors activeMarket
   * and changing its market updates the global selection.
   */
  panel?: PanelInstance;
  /**
   * Where the timeframe pills render. "header" puts them in the top strip
   * (desktop default). "below" hides them from the header and renders a
   * dedicated row beneath the chart — useful on mobile where horizontal
   * room in the header is tight.
   */
  tfPosition?: "header" | "below";
} = {}) {
  const { activeMarket } = useActiveMarket();
  const { openCommand } = useCommandBar();
  const { mainChartId } = useMainChart();
  const { chartMarkets } = useChartMarkets();
  const { setTarget: setMarketPickerTarget } = useMarketPickerTarget();

  // Main chart binds to the global activeMarket so the trade panel +
  // order book follow it. Non-main charts read from chartMarkets so
  // each chart can show a different asset. Charts mounted without a
  // panel id (legacy / mobile single-chart) always behave as main.
  const panelId = panel?.id;
  const isMain = panelId ? mainChartId === panelId : true;
  const overrideId = panelId && !isMain ? chartMarkets[panelId] : undefined;
  const market = isMain
    ? activeMarket
    : (overrideId && MARKETS.find((m) => m.id === overrideId)) || activeMarket;

  // Open the CommandBar's market picker. The routing target tells
  // CommandBar.onSelect whether to update the global activeMarket
  // (main chart) or just this chart's per-instance override.
  const openMarketPicker = () => {
    setMarketPickerTarget(isMain ? null : (panelId ?? null));
    openCommand();
  };

  // Live 24hr ticker from Binance — keeps the metric strip in sync
  // with the TradingView chart underneath. Native crypto markets get
  // live numbers; xyz: synthetics (TVC/OANDA-fed) fall back to the
  // static MARKETS values.
  const liveTicker = useLiveMarketTicker(market);
  const displayMarket = useMemo(
    () =>
      liveTicker
        ? {
            ...market,
            lastPrice: liveTicker.lastPrice,
            change24h: liveTicker.change24h,
            change24hTone: liveTicker.change24hTone,
            volume: liveTicker.volume,
          }
        : market,
    [market, liveTicker],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-4 px-3 pt-3 pb-3">
        {/* On mobile (tfPosition="below") the chart is one of the
            panels in the swipe deck — the deck's title strip is the
            persistent market affordance, so we skip the market
            selector + external link here and let metrics take the
            full row. */}
        {tfPosition === "header" && (
          <>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-label={`Change market. Current: ${market.symbol} ${market.leverage}`}
              onClick={openMarketPicker}
              className="flex shrink-0 items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-surface-1"
            >
              <TokenLogo
                symbol={market.symbol}
                char={market.iconChar}
                bg={market.iconBg}
                fg={market.iconFg ?? "#fff"}
                size={24}
              />
              <span aria-hidden className="text-body font-semibold">
                {market.symbol}
              </span>
              <span aria-hidden className="text-body text-muted-foreground">
                {market.leverage}
              </span>
              <ChevronDownIcon aria-hidden className="size-3 text-muted-foreground" />
            </button>
            {/* Crown lives in the panel chrome strip now (via
                ChartPanelHeaderActions below + the layout registry).
                It used to sit here next to the market picker, but
                that put two unrelated affordances — "change asset"
                and "make this the main chart" — on the same row. The
                chrome strip is the better home: it's the panel-level
                action zone alongside Close. */}
            <BarDivider />
          </>
        )}

        {/* Metrics — flex-1 so they take the middle, scrolls if cramped
            (scrollbar hidden — the underline you see on overflow is
            distracting on dense headers) */}
        <div className="scroll-none flex min-w-0 flex-1 items-center gap-5 overflow-x-auto">
          {metricsForMarket(displayMarket).map((m) => (
            <div key={m.label} className="flex shrink-0 flex-col gap-0.5">
              <span className="text-caption text-muted-foreground">
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

        {/* Ask agent — pivots the chat panel to a contextual read of
            this market, citing price + 24h move + venue. Lives at the
            right edge of the header so it reads as the panel-level
            "ask about what you're looking at" affordance rather than
            sitting next to the asset picker. */}
        {tfPosition === "header" && (
          <AskAgentButton
            size="md"
            payload={{ kind: "market", market }}
            ariaLabel={`Ask agent about ${market.symbol}`}
          />
        )}
      </div>
      <div
        className={cn(
          "relative min-h-0 flex-1 overflow-hidden px-3",
          tfPosition === "header" ? "pb-3" : "pb-2",
        )}
      >
        <TradingViewChart symbol={market.tvSymbol} />
        <SupportOverlay />
      </div>
    </div>
  );
}

/**
 * Header-strip actions for the chart panel — rendered by PanelChrome
 * via the layout registry's HeaderActions hook. Currently just the
 * link icon (chart ↔ trade panel binding toggle), but the same slot
 * is where any future chart-level affordance would land. Mirrors the
 * same useMainChart / useChartMarkets / useActiveMarket state
 * ChartPanel itself reads so toggling here keeps the chart and the
 * trade panel in sync.
 *
 * The link metaphor names the actual relationship (chart and trade
 * panel are tethered) rather than a hierarchy claim — there's no
 * "main" chart from the user's perspective, just "the chart I'm
 * trading against." TradePanelHeaderActions renders the same icon
 * subdued as a passive read-out so both ends of the link are
 * legible at a glance.
 */
export function ChartPanelHeaderActions({ panel }: { panel: PanelInstance }) {
  const { activeMarket, setActiveMarket } = useActiveMarket();
  const { mainChartId, setMainChartId } = useMainChart();
  const { chartMarkets } = useChartMarkets();

  const panelId = panel.id;
  const isLinked = mainChartId === panelId;
  const overrideId = !isLinked ? chartMarkets[panelId] : undefined;
  const market = isLinked
    ? activeMarket
    : (overrideId && MARKETS.find((m) => m.id === overrideId)) || activeMarket;

  const onToggleLink = () => {
    if (!isLinked) setActiveMarket(market);
    setMainChartId(isLinked ? null : panelId);
  };

  return (
    <button
      type="button"
      onClick={onToggleLink}
      aria-pressed={isLinked}
      aria-label={
        isLinked
          ? `Linked to trade panel · ${market.symbol}. Click to unlink.`
          : "Link this chart to the trade panel"
      }
      title={
        isLinked
          ? `Linked to trade panel · ${market.symbol}`
          : "Link to trade panel"
      }
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-md transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        isLinked
          ? "text-primary hover:bg-primary/10"
          : "text-muted-foreground/60 hover:bg-surface-1 hover:text-foreground",
      )}
    >
      <Link2 strokeWidth={1.75} className="size-3" aria-hidden />
    </button>
  );
}

// TradingView's embed script logs a handful of messages we can't
// suppress from outside its iframe. We swallow ONLY these exact
// strings so the Next.js dev tools issue overlay stays useful and
// real errors don't get hidden:
//   - "Cannot listen to the event from the provided iframe" —
//     fires every mount; their script attaches a listener to the
//     iframe contentWindow before the browsing context is ready.
//   - "Support.IncidentsModel" / "support-portal-problems" —
//     their support widget fetches an internal URL that 403s in
//     embedded contexts; both the fetch error and fallback warning
//     are emitted.
// Patch is idempotent so HMR re-runs don't stack wrappers.
const TV_NOISE_PATTERNS = [
  "Cannot listen to the event from the provided iframe",
  "Support.IncidentsModel",
  "support-portal-problems",
];
function installConsoleFilter() {
  if (typeof window === "undefined") return;
  const w = window as typeof window & { __wfTvFilter?: true };
  if (w.__wfTvFilter) return;
  w.__wfTvFilter = true;
  const wrap = (orig: (...a: unknown[]) => void) =>
    (...args: unknown[]) => {
      const first = typeof args[0] === "string" ? args[0] : "";
      if (TV_NOISE_PATTERNS.some((p) => first.includes(p))) return;
      orig.apply(console, args);
    };
  console.error = wrap(console.error.bind(console));
  console.warn = wrap(console.warn.bind(console));
}

function TradingViewChart({ symbol }: { symbol: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  // Brief gap between iframe teardown and new render — shimmer
  // overlay covers it so the chart pane doesn't flash black on swap.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const currentKey = symbol;
  const loading = loadedKey !== currentKey;

  useEffect(() => {
    installConsoleFilter();
    const host = hostRef.current;
    if (!host) return;

    host.innerHTML =
      '<div class="tradingview-widget-container__widget" style="height:100%;width:100%;"></div>';

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    // TradingView's top toolbar handles interval/style/indicators.
    // Side rail is hidden so only the top strip is visible — the
    // toolbar bg is locked to TradingView's stock dark gray (no embed
    // option recolors it), to be replaced with the paid Charting
    // Library later for proper theming.
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "60",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_side_toolbar: true,
      save_image: false,
      allow_symbol_change: false,
      details: false,
      hotlist: false,
      calendar: false,
      withdateranges: false,
      backgroundColor: "#19191B",
      gridColor: "rgba(255,255,255,0.04)",
    });

    host.appendChild(script);
    const t = window.setTimeout(() => setLoadedKey(currentKey), 700);
    return () => window.clearTimeout(t);
  }, [symbol, currentKey]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={hostRef}
        className="tradingview-widget-container h-full w-full overflow-hidden rounded-md bg-[#19191B] [&_iframe]:block [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0"
      />
      {loading && (
        <div
          aria-hidden
          // Match the chart bg (#19191B) so the overlay reads as a
          // clean dimming, not a tint.
          className="pointer-events-none absolute inset-0 rounded-md bg-[#19191B]/65 transition-opacity duration-200 ease-out"
        >
          <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-white/[0.03] to-transparent" />
        </div>
      )}
    </div>
  );
}

/** Overlay layer rendered on top of the TradingView chart for demo
 *  purposes. The runner dispatches a wf:demo:plot-chart event with a
 *  title + optional price + y-position; we draw a dashed horizontal
 *  line + a label badge to fake an analyst-plotted support line. The
 *  TradingView iframe is opaque to the host page so we can't compute
 *  the true price→pixel mapping — y is eyeballed via the script's
 *  yPct (default 62%). */
function SupportOverlay() {
  const [line, setLine] = useState<SupportLine | null>(null);

  useEffect(() => {
    const onPlot = (e: Event) => {
      const detail = (e as CustomEvent<SupportLine>).detail;
      if (!detail) return;
      setLine(detail);
    };
    const onClear = () => setLine(null);
    window.addEventListener(PLOT_SUPPORT_EVENT, onPlot as EventListener);
    window.addEventListener("wf:demo:clear-plot", onClear);
    return () => {
      window.removeEventListener(PLOT_SUPPORT_EVENT, onPlot as EventListener);
      window.removeEventListener("wf:demo:clear-plot", onClear);
    };
  }, []);

  if (!line) return null;
  const top = `${line.yPct ?? 62}%`;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 animate-in fade-in duration-500"
    >
      {/* Dashed line spanning the chart width, just inside the
          horizontal padding the parent already provides. */}
      <div
        className="absolute left-3 right-3"
        style={{ top, height: 0 }}
      >
        <div
          className="h-px w-full"
          style={{
            background:
              "repeating-linear-gradient(to right, var(--primary) 0 6px, transparent 6px 12px)",
            boxShadow:
              "0 0 8px 0 color-mix(in oklch, var(--primary) 70%, transparent)",
          }}
        />
      </div>
      {/* Label pinned to the line on the left edge. */}
      <div
        className="absolute left-4 -translate-y-1/2 animate-in fade-in slide-in-from-left-1 duration-500"
        style={{ top }}
      >
        <span
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2 py-0.5 text-micro font-semibold uppercase tracking-[0.12em] text-primary-foreground shadow-[0_4px_12px_-2px_rgba(0,0,0,0.5)]"
        >
          {line.title}
          {line.price && (
            <span className="font-mono normal-case tracking-normal">
              · {line.price}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
