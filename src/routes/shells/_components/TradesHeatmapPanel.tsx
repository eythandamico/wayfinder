"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  TradesHeatmapPanel — calendar grid of daily trading activity        */
/* ------------------------------------------------------------------ */

/**
 * GitHub-style activity grid. Each cell is one calendar day; rows are
 * weekdays (Sun → Sat); columns are weeks running left-to-right from
 * oldest to most recent. Two metric modes via the header toggle:
 *
 *   • PNL — diverging scale, red (loss) → neutral → mint (profit).
 *           Magnitude maps to opacity, sign maps to hue.
 *   • Trades — sequential scale, single-hue intensity (mint) keyed
 *              to trade count for the day.
 *
 * Mock data deterministically generated from a tiny PRNG so the
 * heatmap is stable on reload. Replace `generateMockDays` with the
 * real per-day aggregation once the trade-history feed lands.
 */

type Day = {
  date: Date;
  pnl: number; // signed dollars; 0 = no trades
  trades: number; // count; 0 = no trades
};

/** Total weeks rendered. ~20 weeks of context = a quarter and change,
 *  which fits cleanly in a typical panel width without scrolling. */
const TOTAL_WEEKS = 20;
const TOTAL_DAYS = TOTAL_WEEKS * 7;

type Metric = "pnl" | "trades";

export function TradesHeatmapPanel() {
  const [metric, setMetric] = useState<Metric>("pnl");
  const days = useMemo(() => generateMockDays(TOTAL_DAYS), []);

  // Group days into weeks (columns). The first column starts on the
  // Sunday of the week containing the oldest day, so partial weeks
  // get rendered with empty cells rather than misaligned ones.
  const weeks = useMemo(() => groupIntoWeeks(days), [days]);

  // Magnitude bounds for normalization. Using the 95th percentile
  // instead of the absolute max so a single outlier day doesn't
  // wash out the whole scale to one-tone.
  const { maxAbs, maxTrades } = useMemo(() => {
    const sorted = [...days].map((d) => Math.abs(d.pnl)).sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 1;
    const tradeMax = days.reduce((m, d) => Math.max(m, d.trades), 0) || 1;
    return { maxAbs: p95, maxTrades: tradeMax };
  }, [days]);

  // Month labels for the column header strip. Each entry is the
  // index of the first week-column that lands in that month, paired
  // with the abbreviated month label. We only emit a label when the
  // month changes — repeating "May May May" would be noise.
  const monthLabels = useMemo(() => {
    const labels: Array<{ colIdx: number; label: string }> = [];
    let lastMonth = -1;
    weeks.forEach((week, colIdx) => {
      const firstReal = week.find((d) => d !== null) as Day | undefined;
      if (!firstReal) return;
      const m = firstReal.date.getMonth();
      if (m !== lastMonth) {
        labels.push({ colIdx, label: MONTHS[m] });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4">
      {/* Metric toggle — segmented control. Lives inside the panel
       *  body rather than in the chrome's HeaderActions slot because
       *  sharing state with the chrome would mean lifting to a
       *  context. Body-local state is cleaner and the toggle reads
       *  fine where it is. */}
      <MetricToggle value={metric} onChange={setMetric} />

      {/* Month label strip — aligned to the same column grid as the
       *  cells below. The labels themselves sit at column starts via
       *  `gridColumnStart`; remaining slots are empty. */}
      <div
        className="grid gap-1 text-caption text-muted-foreground"
        style={{ gridTemplateColumns: `repeat(${TOTAL_WEEKS}, minmax(0, 1fr))` }}
        aria-hidden
      >
        {monthLabels.map(({ colIdx, label }) => (
          <span
            key={`${label}-${colIdx}`}
            style={{ gridColumnStart: colIdx + 1 }}
            className="truncate"
          >
            {label}
          </span>
        ))}
      </div>

      {/* The grid itself — 7 rows × TOTAL_WEEKS columns. */}
      <div
        role="img"
        aria-label={
          metric === "pnl"
            ? "Daily profit and loss heatmap"
            : "Daily trade count heatmap"
        }
        className="grid min-h-0 flex-1 gap-1"
        style={{ gridTemplateColumns: `repeat(${TOTAL_WEEKS}, minmax(0, 1fr))` }}
      >
        {weeks.map((week, colIdx) => (
          <div
            key={colIdx}
            className="grid grid-rows-7 gap-1"
            style={{ gridTemplateRows: "repeat(7, minmax(0, 1fr))" }}
          >
            {week.map((day, rowIdx) => (
              <Cell
                key={rowIdx}
                day={day}
                metric={metric}
                maxAbs={maxAbs}
                maxTrades={maxTrades}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend — diverging scale for PnL, sequential for trade count. */}
      <Legend metric={metric} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Metric toggle                                                      */
/* ------------------------------------------------------------------ */

function MetricToggle({
  value,
  onChange,
}: {
  value: Metric;
  onChange: (next: Metric) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Heatmap metric"
      className="inline-flex w-fit items-stretch overflow-hidden rounded-md bg-surface-2 p-0.5 text-caption"
    >
      <ToggleButton
        active={value === "pnl"}
        onClick={() => onChange("pnl")}
        label="Daily PnL"
      />
      <ToggleButton
        active={value === "trades"}
        onClick={() => onChange("trades")}
        label="Trade count"
      />
    </div>
  );
}

function ToggleButton({
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
        "inline-flex items-center rounded-sm px-2.5 py-1 font-medium transition-[background-color,color] duration-150 ease-out",
        active
          ? "bg-surface-3 text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Cell                                                               */
/* ------------------------------------------------------------------ */

function Cell({
  day,
  metric,
  maxAbs,
  maxTrades,
}: {
  day: Day | null;
  metric: Metric;
  maxAbs: number;
  maxTrades: number;
}) {
  if (!day) {
    return (
      <span aria-hidden className="block rounded-sm bg-transparent" />
    );
  }

  if (metric === "trades") {
    if (day.trades === 0) {
      return (
        <span
          title={`No trades · ${formatDate(day.date)}`}
          className="block rounded-sm bg-surface-2"
        />
      );
    }
    const intensity = Math.min(1, day.trades / maxTrades);
    return (
      <span
        title={`${day.trades} trade${day.trades === 1 ? "" : "s"} · ${formatDate(day.date)}`}
        className="block rounded-sm bg-primary"
        style={{ opacity: 0.25 + intensity * 0.75 }}
      />
    );
  }

  // PnL — diverging scale. Sign picks the hue, magnitude picks the
  // opacity. No-trade days fall back to a neutral surface so the
  // user can read the grid as "where activity happened" even at
  // a glance with no color knowledge.
  if (day.pnl === 0) {
    return (
      <span
        title={`No trades · ${formatDate(day.date)}`}
        className="block rounded-sm bg-surface-2"
      />
    );
  }

  const intensity = Math.min(1, Math.abs(day.pnl) / maxAbs);
  const color = day.pnl > 0 ? "bg-primary" : "bg-tone-down";
  const sign = day.pnl > 0 ? "+" : "−";
  const label = `${sign}$${Math.round(Math.abs(day.pnl)).toLocaleString()} · ${formatDate(day.date)}`;
  return (
    <span
      title={label}
      className={cn("block rounded-sm", color)}
      style={{ opacity: 0.2 + intensity * 0.8 }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Legend                                                             */
/* ------------------------------------------------------------------ */

function Legend({ metric }: { metric: Metric }) {
  if (metric === "trades") {
    return (
      <div className="flex items-center gap-2 text-caption text-muted-foreground">
        <span>Fewer</span>
        <div className="flex items-center gap-1">
          {[0.2, 0.4, 0.6, 0.8, 1.0].map((step) => (
            <span
              key={step}
              aria-hidden
              className="size-3 rounded-sm bg-primary"
              style={{ opacity: step }}
            />
          ))}
        </div>
        <span>More</span>
      </div>
    );
  }
  // Diverging legend: 5 loss steps, neutral mid, 5 profit steps.
  const steps = [1.0, 0.75, 0.5, 0.35, 0.2];
  return (
    <div className="flex items-center gap-2 text-caption text-muted-foreground">
      <span>Loss</span>
      <div className="flex items-center gap-1">
        {steps.map((step) => (
          <span
            key={`loss-${step}`}
            aria-hidden
            className="size-3 rounded-sm bg-tone-down"
            style={{ opacity: step }}
          />
        ))}
        <span aria-hidden className="size-3 rounded-sm bg-surface-2" />
        {[...steps].reverse().map((step) => (
          <span
            key={`gain-${step}`}
            aria-hidden
            className="size-3 rounded-sm bg-primary"
            style={{ opacity: step }}
          />
        ))}
      </div>
      <span>Profit</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data + helpers                                                     */
/* ------------------------------------------------------------------ */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Tiny seeded PRNG (Mulberry32). Keeps the heatmap deterministic
 *  across reloads so the design is stable to look at; swap for real
 *  data once the trade-history feed lands. */
function makeRng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function generateMockDays(count: number): Day[] {
  const rng = makeRng(0x57414946); // "WAYF"
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days: Day[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    // Roughly 60% of days have trades; the rest are zero.
    const active = rng() > 0.4;
    if (!active) {
      days.push({ date, pnl: 0, trades: 0 });
      continue;
    }
    // Net-positive expectancy bias — winners slightly outnumber
    // losers, so the grid leans mint without being saccharine.
    const winBias = rng() > 0.45;
    const magnitude = Math.round((rng() * rng()) * 4000 + 50);
    const pnl = winBias ? magnitude : -magnitude;
    const trades = 1 + Math.floor(rng() * 8);
    days.push({ date, pnl, trades });
  }
  return days;
}

/** Pack a flat list of days into columns of 7 (Sun→Sat). The first
 *  column is padded with nulls so the oldest day lands on its
 *  correct weekday, and the last column padded at the end so the
 *  grid stays rectangular. Always returns exactly TOTAL_WEEKS
 *  columns so the grid template doesn't shift size when data
 *  changes. */
function groupIntoWeeks(days: Day[]): Array<Array<Day | null>> {
  if (days.length === 0) return [];
  const first = days[0].date.getDay(); // 0=Sun
  const totalCells = first + days.length;
  const weeksNeeded = Math.ceil(totalCells / 7);
  const grid: Array<Array<Day | null>> = [];
  let idx = 0;
  for (let w = 0; w < weeksNeeded; w += 1) {
    const col: Array<Day | null> = [];
    for (let r = 0; r < 7; r += 1) {
      const cellIdx = w * 7 + r;
      if (cellIdx < first || idx >= days.length) {
        col.push(null);
      } else {
        col.push(days[idx]);
        idx += 1;
      }
    }
    grid.push(col);
  }
  while (grid.length < TOTAL_WEEKS) grid.unshift(new Array(7).fill(null));
  return grid.slice(-TOTAL_WEEKS);
}
