"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "../_hooks/useIsMobile";
import { BottomSheet } from "./mobile/BottomSheet";
import {
  Activity,
  ArrowRight,
  Calendar,
  Gauge,
  HandCoins,
  Layers,
  LineChart as LineChartIcon,
  Percent,
  PiggyBank,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";
import { usePlan } from "../_state/plan-context";
import { SearchIcon } from "./icons";
import { ProTag } from "./ProTag";
import type { CustomChartConfig } from "./CustomChartPanel";

const kbdClass =
  "inline-flex h-5 items-center justify-center rounded bg-surface-3 min-w-[1.25rem] px-1 text-caption font-semibold uppercase tracking-wider text-white";

type Axis = "metric" | "venue" | "asset";
type Filter = "all" | "metric" | "venue" | "asset";

/* ------------------------------------------------------------------ */
/*  Visual identifiers per catalog row                                 */
/* ------------------------------------------------------------------ */

type Visual = { glyph: string; bg: string; fg?: string };

const ASSET_VISUALS: Record<string, Visual> = {
  USDC: { glyph: "$", bg: "#2775ca", fg: "#fff" },
  USDT: { glyph: "$", bg: "#26a17b", fg: "#fff" },
  USDe: { glyph: "$", bg: "#111", fg: "#fff" },
  DAI: { glyph: "◈", bg: "#f5ac37", fg: "#000" },
  sDAI: { glyph: "◈", bg: "#facc66", fg: "#000" },
  WETH: { glyph: "Ξ", bg: "#627eea", fg: "#fff" },
  stETH: { glyph: "Ξ", bg: "#00a3ff", fg: "#fff" },
  wstETH: { glyph: "Ξ", bg: "#00a3ff", fg: "#fff" },
  rETH: { glyph: "Ξ", bg: "#ff5c00", fg: "#fff" },
  WBTC: { glyph: "₿", bg: "#f09242", fg: "#000" },
  cbBTC: { glyph: "₿", bg: "#0052ff", fg: "#fff" },
  "BTC-PERP": { glyph: "₿", bg: "#f7931a", fg: "#000" },
  "ETH-PERP": { glyph: "Ξ", bg: "#627eea", fg: "#fff" },
  "SOL-PERP": { glyph: "S", bg: "#9945ff", fg: "#fff" },
  "HYPE-PERP": { glyph: "H", bg: "var(--primary)", fg: "#000" },
  "USDe-26DEC25": { glyph: "$", bg: "#111", fg: "#fff" },
  "sUSDe-26DEC25": { glyph: "$", bg: "#222", fg: "#fff" },
  "stETH-26DEC25": { glyph: "Ξ", bg: "#00a3ff", fg: "#fff" },
  "BTC funding": { glyph: "₿", bg: "#f7931a", fg: "#000" },
};

const VENUE_VISUALS: Record<string, Visual> = {
  morpho_ethereum: { glyph: "M", bg: "#5856d6", fg: "#fff" },
  morpho_base: { glyph: "M", bg: "#5856d6", fg: "#fff" },
  morpho_arbitrum: { glyph: "M", bg: "#5856d6", fg: "#fff" },
  aave_v3_ethereum: { glyph: "A", bg: "#a259ff", fg: "#fff" },
  aave_v3_base: { glyph: "A", bg: "#a259ff", fg: "#fff" },
  hyperliquid_perps: { glyph: "H", bg: "#22d3ee", fg: "#000" },
  pendle: { glyph: "P", bg: "#ec4899", fg: "#fff" },
  boros: { glyph: "B", bg: "#f59e0b", fg: "#000" },
};

const METRIC_ICONS: Record<string, LucideIcon> = {
  "Supply APY": Percent,
  "Borrow APR": Percent,
  Utilization: Gauge,
  TVL: Layers,
  "Funding rate": TrendingUp,
  "Open interest": Layers,
  "Mark price": LineChartIcon,
  "Implied APY": Calendar,
  "Underlying APY": Calendar,
  "Fixed rate": Calendar,
};

function AssetAvatar({ label, size = 22 }: { label: string; size?: number }) {
  const v = ASSET_VISUALS[label];
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full text-micro font-semibold"
      style={{
        width: size,
        height: size,
        background: v?.bg ?? "rgba(255,255,255,0.06)",
        color: v?.fg ?? "#fff",
      }}
    >
      {v?.glyph ?? label.charAt(0).toUpperCase()}
    </span>
  );
}

function VenueChip({ label, size = 22 }: { label: string; size?: number }) {
  const v = VENUE_VISUALS[label];
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-md text-micro font-semibold"
      style={{
        width: size,
        height: size,
        background: v?.bg ?? "rgba(255,255,255,0.06)",
        color: v?.fg ?? "#fff",
      }}
    >
      {v?.glyph ?? label.charAt(0).toUpperCase()}
    </span>
  );
}

function MetricIcon({ label, size = 22 }: { label: string; size?: number }) {
  const Icon = METRIC_ICONS[label] ?? Activity;
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted-foreground"
      style={{ width: size, height: size }}
    >
      <Icon strokeWidth={1.75} className="size-3.5" />
    </span>
  );
}

function AxisVisual({
  axis,
  label,
  size,
}: {
  axis: Axis;
  label: string;
  size?: number;
}) {
  if (axis === "asset") return <AssetAvatar label={label} size={size} />;
  if (axis === "venue") return <VenueChip label={label} size={size} />;
  return <MetricIcon label={label} size={size} />;
}

const TIMEFRAMES = ["30D", "90D", "1Y", "All"] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

/* ------------------------------------------------------------------ */
/*  Catalog                                                            */
/* ------------------------------------------------------------------ */

type CatalogEntry = {
  metric: string;
  venue: string;
  asset: string;
  /** Pro-only row. Free users see a gold PRO tag on the row;
   *  selecting it routes through requirePro("charts"). Use for
   *  quant analytics (Pendle implied/underlying APY, Boros fixed
   *  rate, Aave utilization) — leave basic price / funding / mark
   *  rows free so the activation funnel never trips a gate. */
  pro?: boolean;
};

/** Metrics that are considered analytical depth — they always
 *  resolve to pro=true regardless of venue. Funding/mark/price stay
 *  free across all venues so a free user can still build a basic
 *  perp chart. */
const PRO_METRICS = new Set<string>([
  "Implied APY",
  "Underlying APY",
  "Fixed rate",
  "Utilization",
]);

const CATALOG: CatalogEntry[] = [
  ...crossProduct(
    ["Supply APY", "Borrow APR", "Utilization", "TVL"],
    "morpho_ethereum",
    ["USDC", "USDT", "USDe", "DAI", "sDAI", "WETH", "wstETH", "WBTC"],
  ),
  ...crossProduct(
    ["Supply APY", "Borrow APR", "Utilization"],
    "morpho_base",
    ["USDC", "WETH", "cbBTC"],
  ),
  ...crossProduct(
    ["Supply APY", "Borrow APR"],
    "morpho_arbitrum",
    ["USDC", "WETH"],
  ),
  ...crossProduct(
    ["Supply APY", "Borrow APR", "Utilization"],
    "aave_v3_ethereum",
    ["USDC", "USDT", "DAI", "WETH", "wstETH", "WBTC"],
  ),
  ...crossProduct(
    ["Supply APY", "Borrow APR"],
    "aave_v3_base",
    ["USDC", "WETH"],
  ),
  ...crossProduct(
    ["Funding rate", "Open interest", "Mark price"],
    "hyperliquid_perps",
    ["BTC-PERP", "ETH-PERP", "SOL-PERP", "HYPE-PERP"],
  ),
  ...crossProduct(
    ["Implied APY", "Underlying APY"],
    "pendle",
    ["USDe-26DEC25", "sUSDe-26DEC25", "stETH-26DEC25"],
  ),
  ...crossProduct(["Fixed rate", "TVL"], "boros", ["BTC funding"]),
];

function crossProduct(
  metrics: string[],
  venue: string,
  assets: string[],
): CatalogEntry[] {
  const out: CatalogEntry[] = [];
  for (const m of metrics)
    for (const a of assets) {
      const pro = PRO_METRICS.has(m);
      out.push(pro ? { metric: m, venue, asset: a, pro: true } : { metric: m, venue, asset: a });
    }
  return out;
}

type StartingPoint = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  metric: string;
  venue: string;
  asset: string;
};

const STARTING_POINTS: StartingPoint[] = [
  {
    id: "usde-lending",
    label: "USDe lending",
    description: "Supply APY · Morpho Ethereum · USDe",
    // Lending = saving for yield.
    icon: PiggyBank,
    metric: "Supply APY",
    venue: "morpho_ethereum",
    asset: "USDe",
  },
  {
    id: "btc-funding",
    label: "BTC funding",
    description: "Funding rate · Hyperliquid · BTC-PERP",
    // Funding rate reads like a directional series.
    icon: TrendingUp,
    metric: "Funding rate",
    venue: "hyperliquid_perps",
    asset: "BTC-PERP",
  },
  {
    id: "steth-implied",
    label: "stETH implied",
    description: "Implied APY · Pendle · stETH-26DEC25",
    // Term-based instrument with a fixed expiry.
    icon: Calendar,
    metric: "Implied APY",
    venue: "pendle",
    asset: "stETH-26DEC25",
  },
  {
    id: "eth-borrow-aave",
    label: "ETH borrow on Aave",
    description: "Borrow APR · Aave v3 · WETH",
    // Borrowing — receiving capital against collateral.
    icon: HandCoins,
    metric: "Borrow APR",
    venue: "aave_v3_ethereum",
    asset: "WETH",
  },
];

/* ------------------------------------------------------------------ */
/*  Result derivation                                                  */
/* ------------------------------------------------------------------ */

type AxisSelections = {
  metric: string[];
  venue: string[];
  asset: string[];
};

/** Derive the visible option list for one axis. Multi-select means an
 *  option is shown if ANY of the other axes' selections produce a
 *  valid catalog entry (or all entries if an axis is empty). */
function deriveOptions(
  axis: Axis,
  selections: AxisSelections,
  query: string,
) {
  const q = query.trim().toLowerCase();
  const compatible = CATALOG.filter((e) => {
    if (
      axis !== "metric" &&
      selections.metric.length > 0 &&
      !selections.metric.includes(e.metric)
    )
      return false;
    if (
      axis !== "venue" &&
      selections.venue.length > 0 &&
      !selections.venue.includes(e.venue)
    )
      return false;
    if (
      axis !== "asset" &&
      selections.asset.length > 0 &&
      !selections.asset.includes(e.asset)
    )
      return false;
    if (q && !e[axis].toLowerCase().includes(q)) return false;
    return true;
  });
  const counts = new Map<string, number>();
  for (const e of compatible) {
    counts.set(e[axis], (counts.get(e[axis]) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ id: label, label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Expand the user's multi-axis selections into the actual list of
 *  series to plot. An empty axis means "every valid value for that
 *  axis given the others." Only series that exist in the catalog
 *  pass through — invalid cross-product combinations are filtered. */
function expandSeries(selections: AxisSelections) {
  const metrics =
    selections.metric.length > 0
      ? selections.metric
      : Array.from(new Set(CATALOG.map((e) => e.metric)));
  const venues =
    selections.venue.length > 0
      ? selections.venue
      : Array.from(new Set(CATALOG.map((e) => e.venue)));
  const assets =
    selections.asset.length > 0
      ? selections.asset
      : Array.from(new Set(CATALOG.map((e) => e.asset)));

  const valid = new Set(
    CATALOG.map((e) => `${e.metric}\u0000${e.venue}\u0000${e.asset}`),
  );
  const out: Array<{ metric: string; venue: string; asset: string }> = [];
  for (const m of metrics)
    for (const v of venues)
      for (const a of assets) {
        if (valid.has(`${m}\u0000${v}\u0000${a}`)) {
          out.push({ metric: m, venue: v, asset: a });
        }
      }
  return out;
}

/** Soft & hard caps on plotted series. The UI surfaces the soft-cap
 *  message as a hint; the hard cap disables the Plot button. */
const SOFT_SERIES_CAP = 6;
const HARD_SERIES_CAP = 20;

/* ------------------------------------------------------------------ */
/*  Dialog                                                             */
/* ------------------------------------------------------------------ */

type ResultItem =
  | { kind: "starting-point"; value: StartingPoint }
  | { kind: "metric" | "venue" | "asset"; id: string; label: string; count: number };

export function CreateChartDialog({
  open,
  onOpenChange,
  onPlot,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlot: (config: CustomChartConfig) => void;
  className?: string;
}) {
  const { isPro, openPricing } = usePlan();
  // Local alias so the existing close-call sites read naturally.
  const onClose = () => onOpenChange(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState(0);
  // Each axis is multi-select. Empty array = "any value" (wildcard).
  const [metrics, setMetrics] = useState<string[]>([]);
  const [venues, setVenues] = useState<string[]>([]);
  const [assets, setAssets] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>("30D");
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Reset on open.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setFilter("all");
    setSelected(0);
    setMetrics([]);
    setVenues([]);
    setAssets([]);
    setTimeframe("30D");
  }, [open]);

  // Focus the input on open.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const selections: AxisSelections = useMemo(
    () => ({ metric: metrics, venue: venues, asset: assets }),
    [metrics, venues, assets],
  );

  const metricOptions = useMemo(
    () => deriveOptions("metric", selections, query),
    [selections, query],
  );
  const venueOptions = useMemo(
    () => deriveOptions("venue", selections, query),
    [selections, query],
  );
  const assetOptions = useMemo(
    () => deriveOptions("asset", selections, query),
    [selections, query],
  );

  // Expanded series — what the chart will actually plot. Drives the
  // count + cap UX.
  const plannedSeries = useMemo(() => expandSeries(selections), [selections]);
  const seriesCount = plannedSeries.length;
  const overSoftCap = seriesCount > SOFT_SERIES_CAP;
  const overHardCap = seriesCount > HARD_SERIES_CAP;

  // Filter starting points by query — match on label + description.
  const filteredStartingPoints = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STARTING_POINTS;
    return STARTING_POINTS.filter((sp) =>
      `${sp.label} ${sp.description}`.toLowerCase().includes(q),
    );
  }, [query]);

  // Build the flattened result list. Starting points lead when no
  // filter is active and no selections exist (the "you probably want
  // one of these" fast path). When the user has picked one or more
  // axes the focus shifts to the remaining axes.
  const items: ResultItem[] = useMemo(() => {
    const out: ResultItem[] = [];
    const hasAnySelection =
      metrics.length > 0 || venues.length > 0 || assets.length > 0;
    const showStartingPoints =
      (filter === "all" || filter === "metric") && !hasAnySelection;
    if (showStartingPoints) {
      for (const sp of filteredStartingPoints)
        out.push({ kind: "starting-point", value: sp });
    }
    if (filter === "all" || filter === "metric") {
      for (const o of metricOptions)
        out.push({ kind: "metric", id: o.id, label: o.label, count: o.count });
    }
    if (filter === "all" || filter === "venue") {
      for (const o of venueOptions)
        out.push({ kind: "venue", id: o.id, label: o.label, count: o.count });
    }
    if (filter === "all" || filter === "asset") {
      for (const o of assetOptions)
        out.push({ kind: "asset", id: o.id, label: o.label, count: o.count });
    }
    return out;
  }, [
    filter,
    filteredStartingPoints,
    metricOptions,
    venueOptions,
    assetOptions,
    metrics,
    venues,
    assets,
  ]);

  // Reset the highlighted index whenever the visible list changes.
  useEffect(() => {
    if (!open) return;
    setSelected(0);
  }, [query, filter, metrics, venues, assets, open]);

  const applyStartingPoint = (sp: StartingPoint) => {
    // Starting points commit a single specific combination — replace
    // the multi-select arrays with single-item arrays so the user
    // can still add comparisons after picking a starting point.
    setMetrics([sp.metric]);
    setVenues([sp.venue]);
    setAssets([sp.asset]);
  };

  /** Toggle a single value within an axis's selections array. */
  const toggleSelection = (kind: Axis, id: string) => {
    const toggle = (cur: string[]) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    if (kind === "metric") setMetrics(toggle);
    if (kind === "venue") setVenues(toggle);
    if (kind === "asset") setAssets(toggle);
  };

  const activate = (item: ResultItem) => {
    if (item.kind === "starting-point") {
      applyStartingPoint(item.value);
      return;
    }
    // Pro metrics — Pendle / Boros / Aave-utilization style analytics.
    // Free users get the PricingModal; pro users select normally.
    // Basic price/funding/mark/borrow rows stay free so the entry
    // funnel never trips a gate.
    if (
      item.kind === "metric" &&
      PRO_METRICS.has(item.label) &&
      !isPro
    ) {
      openPricing("charts");
      return;
    }
    toggleSelection(item.kind, item.id);
  };

  // Title derives from the selections. Single combo gets the explicit
  // form; multi-series gets a short summary.
  const title = useMemo(() => {
    if (seriesCount === 0) return "";
    if (seriesCount === 1) {
      const s = plannedSeries[0];
      return [s.metric, s.asset, s.venue].filter(Boolean).join(" · ");
    }
    // Multi-series — name by what's most constrained.
    if (metrics.length === 1) {
      return `${metrics[0]} · ${seriesCount} series`;
    }
    if (assets.length === 1) {
      return `${assets[0]} · ${seriesCount} series`;
    }
    return `${seriesCount} series`;
  }, [plannedSeries, seriesCount, metrics, assets]);

  const canPlot = seriesCount > 0 && !overHardCap;

  const submit = () => {
    if (!canPlot) return;
    // Free-tier ceilings: 1 series at a time, 30D/90D timeframes
    // only. Anything richer routes through the canonical PricingModal
    // so the gate copy is consistent with the rest of the app.
    if (!isPro) {
      const usesProMetric = plannedSeries.some((s) =>
        PRO_METRICS.has(s.metric),
      );
      const usesProTimeframe = timeframe === "1Y" || timeframe === "All";
      if (seriesCount > 1 || usesProMetric || usesProTimeframe) {
        openPricing("charts");
        return;
      }
    }
    onPlot({
      title: title || "Custom chart",
      series: plannedSeries,
      timeframe,
    });
    onClose();
  };

  // Keyboard navigation — mirrors the command bar (up/down + enter).
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
        const item = items[selected];
        if (item) {
          e.preventDefault();
          activate(item);
        }
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        if (canPlot) {
          e.preventDefault();
          submit();
        }
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open, items, selected, canPlot]);

  // Scroll the selected row into view on highlight change.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-index="${selected}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selected, open]);

  const clearAll = () => {
    setMetrics([]);
    setVenues([]);
    setAssets([]);
    setQuery("");
    setFilter("all");
  };

  const body = (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Search input — exact command-bar styling. */}
      <div className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-3">
        <SearchIcon />
        <input
          ref={searchRef}
          type="text"
          role="combobox"
          aria-expanded
          aria-autocomplete="list"
          aria-controls="cc-results"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search metrics, venues, or assets…"
          aria-label="Search catalog"
          className="flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
        />
        <kbd aria-hidden className={kbdClass}>
          esc
        </kbd>
      </div>

      {/* Category filter chips — same pattern as command bar. */}
      <div
        role="tablist"
        aria-label="Filter catalog"
        className="scroll-thin flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-white/[0.05] px-3 py-2"
      >
        {(
          [
            { id: "all", label: "All" },
            { id: "metric", label: "Metrics" },
            { id: "venue", label: "Venues" },
            { id: "asset", label: "Assets" },
          ] as const
        ).map((c) => (
          <FilterChip
            key={c.id}
            active={filter === c.id}
            onClick={() => setFilter(c.id)}
            label={c.label}
          />
        ))}
      </div>

      {/* Results — capped scroll region matching command bar. */}
      <div
        id="cc-results"
        ref={listRef}
        role="listbox"
        aria-label="Catalog results"
        className="scroll-thin flex max-h-[440px] flex-col overflow-y-auto py-1.5"
      >
        {items.length === 0 ? (
          <EmptyState query={query} />
        ) : (
          items.map((item, i) => {
            const prev = items[i - 1];
            const showHeader = !prev || prev.kind !== item.kind;
            const id = `cc-${item.kind}-${itemKey(item)}`;
            const isSelected = i === selected;
            const isPicked =
              (item.kind === "metric" && metrics.includes(item.id)) ||
              (item.kind === "venue" && venues.includes(item.id)) ||
              (item.kind === "asset" && assets.includes(item.id));
            return (
              <Fragment key={id}>
                {showHeader && (
                  <div className="flex items-center gap-1.5 px-4 pb-1 pt-2 text-micro uppercase tracking-[0.14em] text-muted-foreground">
                    {sectionLabel(item.kind)}
                  </div>
                )}
                {item.kind === "starting-point" ? (
                  <StartingPointRow
                    id={id}
                    sp={item.value}
                    index={i}
                    selected={isSelected}
                    onHover={() => setSelected(i)}
                    onSelect={() => activate(item)}
                  />
                ) : (
                  <AxisRow
                    id={id}
                    axis={item.kind}
                    label={item.label}
                    count={item.count}
                    index={i}
                    selected={isSelected}
                    picked={isPicked}
                    pro={item.kind === "metric" && PRO_METRICS.has(item.label)}
                    onHover={() => setSelected(i)}
                    onSelect={() => activate(item)}
                  />
                )}
              </Fragment>
            );
          })
        )}
      </div>

      {/* Selection summary — chip strip for every picked item across
          all three axes. Click ✕ on a chip to remove just that one;
          "Clear all" wipes every axis. */}
      {(metrics.length > 0 || venues.length > 0 || assets.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.05] px-4 py-2.5">
          <span className="text-micro uppercase tracking-[0.14em] text-muted-foreground">
            Plotting
          </span>
          {metrics.map((m) => (
            <SelectionChip
              key={`m-${m}`}
              axis="metric"
              label={m}
              onRemove={() =>
                setMetrics((cur) => cur.filter((x) => x !== m))
              }
            />
          ))}
          {venues.map((v) => (
            <SelectionChip
              key={`v-${v}`}
              axis="venue"
              label={v}
              onRemove={() => setVenues((cur) => cur.filter((x) => x !== v))}
            />
          ))}
          {assets.map((a) => (
            <SelectionChip
              key={`a-${a}`}
              axis="asset"
              label={a}
              onRemove={() => setAssets((cur) => cur.filter((x) => x !== a))}
            />
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto inline-flex items-center gap-1 text-micro text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Soft-cap nudge — fires when the cross-product is getting
          dense. Hard cap renders inside the Plot button below. */}
      {overSoftCap && !overHardCap && (
        <div className="border-t border-amber-500/20 bg-amber-500/[0.06] px-4 py-2 text-caption text-amber-200/90">
          {seriesCount} series will plot — chart may be busy. Narrow a
          selection to focus.
        </div>
      )}
      {overHardCap && (
        <div className="border-t border-tone-down/20 bg-tone-down/[0.08] px-4 py-2 text-caption text-tone-down">
          {seriesCount} series exceeds the {HARD_SERIES_CAP}-line limit.
          Narrow a selection to plot.
        </div>
      )}

      {/* Footer — timeframe + Plot. */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.05] px-4 py-3">
        <TimeframeSelect value={timeframe} onChange={setTimeframe} />
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-caption text-muted-foreground sm:inline-flex">
            <kbd aria-hidden className={kbdClass}>
              ⌘
            </kbd>
            <kbd aria-hidden className={kbdClass}>
              ↵
            </kbd>
            Plot
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={!canPlot}
            className={cn(
              "group relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-md px-4 text-body font-semibold transition-[filter,scale] duration-150 ease-out active:scale-[0.97]",
              canPlot
                ? "bg-primary text-primary-foreground hover:brightness-[1.04]"
                : "bg-surface-2 text-muted-foreground cursor-not-allowed",
            )}
          >
            {canPlot && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-white/40 to-transparent"
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {plotButtonLabel(seriesCount, overHardCap)}
              <ArrowRight strokeWidth={2} className="size-3.5" aria-hidden />
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={(o) => !o && onClose()}
        title="Create chart"
        heightFraction={0.94}
        className={className}
      >
        {body}
      </BottomSheet>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[var(--z-modal-bg)] bg-background/45 backdrop-blur-md transition-opacity duration-300 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 top-[12vh] z-[var(--z-modal)] flex max-h-[min(76vh,640px)] w-[min(94vw,640px)] origin-top -translate-x-1/2 flex-col overflow-hidden rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-2xl transition-[opacity,transform,translate,scale] duration-300 ease-[var(--ease-strong)] data-[ending-style]:-translate-y-2 data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[starting-style]:-translate-y-2 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0",
            className,
          )}
        >
          <Dialog.Title className="sr-only">Create chart</Dialog.Title>
          {body}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  Rows                                                                */
/* ------------------------------------------------------------------ */

function StartingPointRow({
  id,
  sp,
  index,
  selected,
  onHover,
  onSelect,
}: {
  id: string;
  sp: StartingPoint;
  index: number;
  selected: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  const Icon = sp.icon;
  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-selected={selected}
      data-index={index}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors focus-visible:outline-none",
        selected ? "bg-surface-2" : "hover:bg-surface-1",
      )}
    >
      <span
        aria-hidden
        className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/15 text-primary"
      >
        <Icon strokeWidth={1.75} className="size-3.5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body text-foreground">{sp.label}</span>
        <span className="truncate text-caption text-muted-foreground">
          {sp.description}
        </span>
      </span>
      <ArrowRight
        strokeWidth={1.75}
        className="size-3.5 shrink-0 text-muted-foreground"
        aria-hidden
      />
    </button>
  );
}

function AxisRow({
  id,
  axis,
  label,
  count,
  index,
  selected,
  picked,
  pro,
  onHover,
  onSelect,
}: {
  id: string;
  axis: Axis;
  label: string;
  count: number;
  index: number;
  selected: boolean;
  picked: boolean;
  /** Renders a gold PRO tag next to the label. The catalog passes
   *  this through for metric rows that resolve to a pro-only entry.
   *  Selection is gated separately at the consumer (requirePro). */
  pro?: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-selected={selected}
      data-index={index}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-1.5 text-left transition-colors focus-visible:outline-none",
        selected && !picked && "bg-surface-2",
        picked && "bg-primary/10",
        !selected && !picked && "hover:bg-surface-1",
      )}
    >
      <AxisVisual axis={axis} label={label} />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-body",
          picked ? "font-semibold text-primary" : "text-foreground",
        )}
      >
        {label}
      </span>
      {pro && <ProTag size="sm" className="shrink-0" />}
      <span
        className={cn(
          "shrink-0 text-micro tabular-nums",
          picked ? "text-primary" : "text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Pieces                                                              */
/* ------------------------------------------------------------------ */

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-caption transition-colors duration-150 ease-out",
        active
          ? "bg-primary/15 text-primary"
          : "bg-surface-1 text-muted-foreground hover:bg-surface-3 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function SelectionChip({
  axis,
  label,
  onRemove,
}: {
  axis: Axis;
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-primary/15 pl-1 pr-1 text-primary">
      <AxisVisual axis={axis} label={label} size={18} />
      <span className="text-caption font-medium">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="relative ml-0.5 inline-flex size-4 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/25 before:absolute before:-inset-2.5 before:content-['']"
      >
        <X strokeWidth={2.25} className="size-3" aria-hidden />
      </button>
    </span>
  );
}

function TimeframeSelect({
  value,
  onChange,
}: {
  value: Timeframe;
  onChange: (v: Timeframe) => void;
}) {
  const { isPro, openPricing } = usePlan();
  return (
    <div className="flex items-center gap-1 rounded-md bg-surface-1 p-1">
      {TIMEFRAMES.map((tf) => {
        const proTf = tf === "1Y" || tf === "All";
        const locked = proTf && !isPro;
        return (
          <button
            key={tf}
            type="button"
            aria-pressed={value === tf}
            onClick={() => {
              // Long-history timeframes are Pro analytics depth. Free
              // users open the modal instead of selecting — the gate
              // also fires again on submit() as a safety net.
              if (locked) {
                openPricing("charts");
                return;
              }
              onChange(tf);
            }}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded px-2 text-body tabular-nums transition-[background-color,color] duration-150 ease-out",
              value === tf
                ? "bg-surface-3 font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tf}
            {proTf && <ProTag size="sm" />}
          </button>
        );
      })}
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-1 px-4 py-10 text-center text-body text-muted-foreground"
    >
      {query ? (
        <span>
          Nothing matches{" "}
          <span className="text-foreground">&ldquo;{query}&rdquo;</span>
        </span>
      ) : (
        <span>No options for this combination.</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function itemKey(item: ResultItem): string {
  if (item.kind === "starting-point") return item.value.id;
  return item.id;
}

function sectionLabel(kind: ResultItem["kind"]): string {
  switch (kind) {
    case "starting-point":
      return "Starting points";
    case "metric":
      return "Metric";
    case "venue":
      return "Venue";
    case "asset":
      return "Asset";
  }
}

function plotButtonLabel(count: number, overCap: boolean): string {
  if (overCap) return "Narrow selection";
  if (count === 0) return "Plot chart";
  if (count === 1) return "Plot chart";
  return `Plot ${count} series`;
}
