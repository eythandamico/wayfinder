"use client";

import { useMemo } from "react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PanelInstance } from "../_layout/types";

/** One line on a custom chart. Either fully-specified (metric + venue
 *  + asset) or partially-specified — the renderer treats missing
 *  fields as "the whole axis." */
export type ChartSeries = {
  metric: string;
  venue?: string;
  asset?: string;
};

/** Custom chart config produced by CreateChartDialog. */
export type CustomChartConfig = {
  /** Editorial label — what the chart is showing. */
  title: string;
  /** One or more series to plot. Single-entry arrays render as a
   *  single line; multi-entry arrays render as a stacked legend. */
  series: ChartSeries[];
  /** Timeframe key, e.g. "30D" / "90D" / "1Y". */
  timeframe: string;
};

/** Treat the panel.config as a CustomChartConfig if it has the right
 *  shape; otherwise fall back to a placeholder.
 *
 *  Accepts both the current { series: [...] } shape and the legacy
 *  { metric, venue } single-series shape so saved layouts created
 *  before multi-select still render. */
function readConfig(panel: PanelInstance | undefined): CustomChartConfig {
  const c = panel?.config;
  if (c && typeof c.title === "string" && typeof c.timeframe === "string") {
    // New shape — series array.
    if (Array.isArray(c.series) && c.series.length > 0) {
      const series = c.series
        .filter(
          (s): s is { metric: string; venue?: string; asset?: string } =>
            !!s && typeof s === "object" && typeof (s as { metric?: unknown }).metric === "string",
        )
        .map((s) => ({
          metric: s.metric,
          venue: typeof s.venue === "string" ? s.venue : undefined,
          asset: typeof s.asset === "string" ? s.asset : undefined,
        }));
      if (series.length > 0) {
        return { title: c.title, series, timeframe: c.timeframe };
      }
    }
    // Legacy shape — single series under { metric, venue }.
    if (typeof c.metric === "string") {
      return {
        title: c.title,
        series: [
          {
            metric: c.metric,
            venue: typeof c.venue === "string" ? c.venue : undefined,
          },
        ],
        timeframe: c.timeframe,
      };
    }
  }
  return {
    title: "Unconfigured chart",
    series: [{ metric: "—" }],
    timeframe: "30D",
  };
}

/** Deterministic mock time series so plotted charts have something
 *  visible without a real data source. Seed from the title so every
 *  chart's curve is unique but stable across renders. */
function mockSeries(seed: string, points = 48): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  let v = 50 + (Math.abs(h) % 30);
  const out: number[] = [];
  for (let i = 0; i < points; i++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    const noise = ((h % 1000) / 1000 - 0.5) * 6;
    v = Math.max(8, Math.min(98, v + noise + Math.sin(i / 6) * 0.6));
    out.push(v);
  }
  return out;
}

// Stable color palette for multi-series charts. Primary first (single
// series stays brand-on); rest rotate through the existing accent
// tokens so charts feel native to the rest of the shell.
const SERIES_COLORS = [
  "var(--primary)",
  "var(--wf-accent-sky, #38bdf8)",
  "var(--wf-accent-amber, #f59e0b)",
  "var(--wf-accent-violet, #a78bfa)",
  "var(--tone-down, #fb7185)",
  "#22d3ee",
  "#facc66",
  "#f472b6",
];

export function CustomChartPanel({ panel }: { panel?: PanelInstance }) {
  const cfg = readConfig(panel);
  const seriesData = useMemo(
    () =>
      cfg.series.map((s, i) => ({
        ...s,
        label: seriesLabel(s),
        color: SERIES_COLORS[i % SERIES_COLORS.length],
        values: mockSeries(`${cfg.title}|${s.metric}|${s.venue ?? ""}|${s.asset ?? ""}`),
      })),
    [cfg.title, cfg.series],
  );

  // Headline value: first series' delta. With multi-series the
  // headline becomes less meaningful, so we also surface the count.
  const primary = seriesData[0];
  const first = primary?.values[0] ?? 0;
  const last = primary?.values[primary.values.length - 1] ?? 0;
  const delta = last - first;
  const up = delta >= 0;
  const multi = seriesData.length > 1;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header: title + meta + last value (when single series) */}
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/[0.05] px-3 py-2.5">
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="inline-flex items-center gap-1.5 text-caption uppercase tracking-[0.14em] text-muted-foreground">
            <Activity strokeWidth={1.75} className="size-3" aria-hidden />
            {multi ? (
              <span>{seriesData.length} series</span>
            ) : (
              <>
                {primary?.metric}
                {primary?.venue && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{primary.venue}</span>
                  </>
                )}
              </>
            )}
          </span>
          <span className="mt-0.5 truncate text-body font-semibold text-foreground">
            {cfg.title}
          </span>
        </div>
        {!multi && (
          <div className="flex shrink-0 flex-col items-end leading-tight">
            <span className="text-title font-semibold tabular-nums text-foreground">
              {last.toFixed(2)}
            </span>
            <span
              className={cn(
                "text-body tabular-nums",
                up ? "text-primary" : "text-tone-down",
              )}
            >
              {up ? "+" : ""}
              {delta.toFixed(2)} · {cfg.timeframe}
            </span>
          </div>
        )}
        {multi && (
          <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
            {cfg.timeframe}
          </span>
        )}
      </div>
      {/* Legend — only when there's more than one series. Each chip
          shows the series' label tinted with its line color. */}
      {multi && (
        <div className="scroll-thin flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-white/[0.05] px-3 py-1.5">
          {seriesData.map((s) => (
            <span
              key={s.label}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-1 px-2 py-0.5 text-caption text-foreground"
            >
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      )}
      {/* Chart body */}
      <div className="flex-1 min-h-0 px-3 py-3">
        <ChartSvg series={seriesData} up={up} />
      </div>
    </div>
  );
}

function seriesLabel(s: ChartSeries): string {
  const parts: string[] = [s.metric];
  if (s.asset) parts.push(s.asset);
  if (s.venue) parts.push(s.venue);
  return parts.join(" · ");
}

function ChartSvg({
  series,
  up,
}: {
  series: Array<{ label: string; color: string; values: number[] }>;
  up: boolean;
}) {
  const w = 600;
  const h = 220;
  // Shared scale across all series so they're directly comparable.
  const allValues = series.flatMap((s) => s.values);
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const single = series.length === 1;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-hidden
    >
      <defs>
        {series.map((s, i) => {
          const fillId = `cust-fill-${i}`;
          return (
            <linearGradient key={fillId} id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={single ? 0.22 : 0.12} />
              <stop offset="100%" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          );
        })}
      </defs>
      {series.map((s, i) => {
        const pts = s.values
          .map((v, idx) => {
            const x = (idx / (s.values.length - 1)) * w;
            const y = h - ((v - min) / range) * (h - 8) - 4;
            return `${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ");
        const lastSegment = pts.split(" ").pop();
        const lastX = w;
        const lastY = parseFloat(lastSegment?.split(",")[1] ?? "0");
        // Only fill the area under single-series charts — stacked fills
        // produce muddy overlaps on multi-series.
        const showFill = single;
        const fillPath = `M 0,${h} L ${pts} L ${lastX.toFixed(1)},${h} Z`;
        return (
          <g key={s.label}>
            {showFill && <path d={fillPath} fill={`url(#cust-fill-${i})`} />}
            <polyline
              points={pts}
              fill="none"
              stroke={s.color}
              strokeWidth={single ? 2 : 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {single && (
              <circle cx={lastX} cy={lastY} r={3.5} fill={s.color} />
            )}
          </g>
        );
      })}
      {/* Suppress unused 'up' warning from the single-series fall-through */}
      {up && null}
    </svg>
  );
}
