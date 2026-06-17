"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { MARKETS } from "../_data/mocks";
import { useActiveMarket } from "../_state/shells-context";
import type { PanelInstance } from "../_layout/types";
import type { Market } from "../_types";
import { AddTokenFooter } from "./AddTokenFooter";
import { TokenLogo } from "./TokenLogo";

const DEFAULT_TICKERS = ["btc", "eth", "sol", "hype", "xrp", "aave"] as const;
const SPARK_POINTS = 32;
const SPARK_W = 120;
const SPARK_H = 32;

/**
 * Mini Charts — a grid of compact sparkline cards. Each card shows the
 * token's last price + 24h sparkline + 24h %. Sparklines are pseudo-
 * random walks seeded off the ticker so the same coin always renders
 * the same wiggle; the trajectory's overall direction matches the
 * 24h % sign so the visual cue lines up with the number.
 *
 * The panel chrome (label, close ×) is rendered by PanelChrome above
 * this component, so the panel body opens directly into the grid —
 * no in-body title bar competing with the chrome title.
 */
export function MiniChartsPanel({ panel }: { panel: PanelInstance }) {
  const { setActiveMarket } = useActiveMarket();
  // Tickers are local state so the demo's "+ add" tile can mutate the
  // grid without a layout dispatcher action. Initial value seeds from
  // the panel config (set at create time) or the default starter list.
  const initialTickers = useMemo(
    () =>
      (panel.config?.tickers as string[] | undefined) ?? [...DEFAULT_TICKERS],
    [panel.config?.tickers],
  );
  const [tickers, setTickers] = useState<string[]>(initialTickers);

  const rows = useMemo(
    () =>
      tickers
        .map((id) => MARKETS.find((m) => m.id === id))
        .filter((m): m is Market => !!m),
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
      <div className="@container scroll-thin min-h-0 flex-1 overflow-y-auto p-2">
        <div className="grid grid-cols-1 gap-2 @[420px]:grid-cols-2 @[680px]:grid-cols-3">
          {rows.map((m) => (
            <MiniCard
              key={m.id}
              market={m}
              onSelect={() => setActiveMarket(m)}
            />
          ))}
        </div>
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

function MiniCard({
  market,
  onSelect,
}: {
  market: Market;
  onSelect: () => void;
}) {
  const pct = parseChangePct(market.change24h);
  const up = pct >= 0;
  const path = useMemo(
    () => sparklinePath(market.id, up),
    [market.id, up],
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      className="@container group flex flex-col gap-2 rounded-lg bg-white/[0.03] p-3 text-left ring-1 ring-inset ring-white/[0.06] transition-[background-color,scale] duration-150 ease-out hover:bg-surface-1 active:scale-[0.99]"
    >
      <div className="flex items-center gap-2">
        <TokenLogo
          symbol={market.symbol}
          char={market.iconChar}
          bg={market.iconBg}
          fg={market.iconFg ?? "#fff"}
          size={22}
        />
        <span className="truncate text-body font-medium text-foreground">
          {market.symbol.split("-")[0]}
        </span>
        <span
          className={cn(
            "ml-auto text-caption tabular-nums",
            up ? "text-primary" : "text-tone-down",
          )}
        >
          {pct >= 0 ? "+" : ""}
          {pct.toFixed(2)}%
        </span>
      </div>

      <svg
        viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
        preserveAspectRatio="none"
        className="hidden h-8 w-full @[140px]:block"
        aria-hidden
      >
        <path
          d={path}
          fill="none"
          stroke={up ? "var(--primary)" : "var(--tone-down, #ff6b6b)"}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>

      <div className="flex items-baseline justify-between">
        <span className="text-body tabular-nums text-foreground">
          {market.lastPrice}
        </span>
        <span className="text-micro text-muted-foreground">
          {market.volume}
        </span>
      </div>
    </button>
  );
}

/** "+2.36%" / "-0.98%" → 2.36 / -0.98 */
function parseChangePct(s: string): number {
  const n = parseFloat(s.replace(/[%+]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Seeded LCG so the same ticker always produces the same path —
 *  prevents jitter on every render. */
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Build a left→right SVG path. Drift matches the direction (up/down)
 *  so the sparkline's overall slope agrees with the 24h % sign. */
function sparklinePath(id: string, up: boolean): string {
  const rand = seeded(hashString(id));
  const drift = up ? 0.018 : -0.018;
  const values: number[] = [];
  let v = 0.5;
  for (let i = 0; i < SPARK_POINTS; i++) {
    const noise = (rand() - 0.5) * 0.18;
    v = Math.min(1, Math.max(0, v + noise + drift));
    values.push(v);
  }
  // Normalize to fill ~80% of the height so the line doesn't kiss
  // the card's top/bottom edges.
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(0.0001, max - min);
  const yPad = SPARK_H * 0.1;
  const usable = SPARK_H - yPad * 2;
  return values
    .map((val, i) => {
      const x = (i / (SPARK_POINTS - 1)) * SPARK_W;
      // Invert Y so a higher value = higher on screen.
      const y = SPARK_H - yPad - ((val - min) / span) * usable;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}
