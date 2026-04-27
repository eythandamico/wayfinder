"use client";

import Image from "next/image";
import {
  ArrowUp,
  CandlestickChart as LucideCandlestick,
  ChevronDown,
  Compass,
  LayoutGrid,
  Plus,
  Search,
} from "lucide-react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { cn } from "@/lib/utils";

const PREVIEW_WALLET = "0xa1536Cf17e2bFE9B4C0b0C34dC8D4D8a58e8Eb3C2";

/**
 * Mobile-shaped preview of the Shells app — top bar / chart / bottom action
 * row / agent composer. Mirrors the real /shells mobile layout. Sized to feel
 * phone-like (max-w-[380px]).
 */
export function MobileShellShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-[380px]">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(55% 60% at 50% 40%, color-mix(in oklch, var(--primary) 28%, transparent) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div
        className="relative overflow-hidden rounded-[2rem] bg-background p-1.5 ring-1 ring-white/[0.08] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]"
      >
        <div className="flex h-[600px] flex-col overflow-hidden rounded-[1.6rem] bg-background">
          <MobileTopBar />
          <div className="min-h-0 flex-1 overflow-hidden p-1.5">
            <MobileChartPane />
          </div>
          <MobileBottomActions />
          <MobileAgentBar />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/*  Top bar                                                     */
/* ---------------------------------------------------------- */

function MobileTopBar() {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
      <div className="flex items-center gap-2">
        <Image
          src="/brand/wayfinder-icon-white.png"
          alt="Wayfinder"
          width={28}
          height={28}
          className="size-7"
        />
        <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.04] p-0.5">
          <span className="inline-flex h-7 items-center gap-1 rounded-md bg-white/[0.10] px-2 text-[11.5px] font-medium text-foreground">
            <LucideCandlestick strokeWidth={1.75} className="size-3" aria-hidden />
            Trade
          </span>
          <span className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11.5px] font-medium text-muted-foreground">
            <Compass strokeWidth={1.75} className="size-3" aria-hidden />
            Paths
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-white/[0.06]">
          <Search strokeWidth={1.5} className="size-3.5 text-muted-foreground" aria-hidden />
        </span>
        <span
          aria-hidden
          className="flex size-9 items-center justify-center overflow-hidden rounded-full ring-1 ring-white/[0.08]"
        >
          <Jazzicon diameter={36} seed={jsNumberForAddress(PREVIEW_WALLET)} />
        </span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/*  Chart pane (with market header)                            */
/* ---------------------------------------------------------- */

function MobileChartPane() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl bg-muted">
      {/* Market header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-black"
            style={{ backgroundColor: "#f7931a" }}
          >
            ₿
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 font-heading text-[12.5px] font-semibold leading-none">
              BTC-USDC
              <ChevronDown strokeWidth={1.5} className="size-3 text-muted-foreground" aria-hidden />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              HL Perps · 40x
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-mono text-[14px] font-semibold leading-none tabular-nums">
            $75,739.5
          </span>
          <span className="font-mono text-[10px] tabular-nums text-primary">
            ▲ +1.38%
          </span>
        </div>
      </div>

      {/* Timeframe row */}
      <div className="flex shrink-0 items-center gap-1 border-b border-white/5 px-2 py-1.5">
        {["1m", "5m", "15m", "1h", "4h", "1d"].map((t) => (
          <span
            key={t}
            className={cn(
              "rounded-sm px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
              t === "1h"
                ? "bg-white/[0.10] text-foreground"
                : "text-muted-foreground",
            )}
          >
            {t}
          </span>
        ))}
      </div>

      {/* Candles */}
      <div className="relative min-h-0 flex-1 overflow-hidden p-2">
        <MiniCandles />
      </div>
    </div>
  );
}

function MiniCandles() {
  // Compact candle set for the mobile preview — same up-trend feel as the
  // desktop chart, fewer candles to read well at small width.
  const candles = [
    [60, 70, 55, 68],
    [68, 72, 65, 70],
    [70, 75, 68, 66],
    [66, 68, 58, 60],
    [60, 64, 55, 62],
    [62, 72, 60, 71],
    [71, 78, 69, 76],
    [76, 80, 73, 74],
    [74, 77, 68, 70],
    [70, 73, 65, 72],
    [72, 85, 70, 83],
    [83, 88, 81, 85],
    [85, 90, 82, 83],
    [83, 86, 78, 80],
    [80, 83, 74, 76],
    [76, 80, 72, 79],
    [79, 84, 77, 82],
    [82, 87, 79, 85],
    [85, 89, 83, 88],
    [88, 92, 85, 90],
    [90, 95, 87, 93],
    [93, 96, 89, 91],
    [91, 94, 85, 87],
    [87, 90, 82, 84],
    [84, 88, 80, 86],
    [86, 92, 84, 90],
    [90, 96, 88, 94],
    [94, 100, 92, 98],
  ] as const;

  const W = 360;
  const H = 200;
  const padding = { top: 12, right: 4, bottom: 12, left: 4 };
  const innerW = W - padding.left - padding.right;
  const innerH = H - padding.top - padding.bottom;

  const lo = Math.min(...candles.map((c) => c[2]));
  const hi = Math.max(...candles.map((c) => c[1]));
  const range = hi - lo;
  const y = (v: number) => padding.top + ((hi - v) / range) * innerH;
  const step = innerW / candles.length;
  const bodyW = Math.max(2, step * 0.6);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-hidden
    >
      {[0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1={padding.left}
          x2={W - padding.right}
          y1={padding.top + innerH * p}
          y2={padding.top + innerH * p}
          stroke="rgba(255,255,255,0.04)"
        />
      ))}
      {candles.map((c, i) => {
        const [open, high, low, close] = c;
        const up = close >= open;
        const cx = padding.left + step * (i + 0.5);
        const yHigh = y(high);
        const yLow = y(low);
        const yOpen = y(open);
        const yClose = y(close);
        const fill = up ? "var(--primary)" : "var(--tone-down)";
        const top = Math.min(yOpen, yClose);
        const bodyH = Math.max(1, Math.abs(yOpen - yClose));
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={yHigh} y2={yLow} stroke={fill} strokeWidth={1} />
            <rect
              x={cx - bodyW / 2}
              y={top}
              width={bodyW}
              height={bodyH}
              fill={fill}
              opacity={0.92}
            />
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------------------------------------------------- */
/*  Bottom action row — Trade / Order book / Portfolio + Grid */
/* ---------------------------------------------------------- */

function MobileBottomActions() {
  return (
    <div className="flex shrink-0 items-center gap-1.5 border-t border-white/5 px-3 py-2">
      {[
        { label: "Trade", active: true },
        { label: "Order book" },
        { label: "Portfolio" },
      ].map((b) => (
        <span
          key={b.label}
          className={cn(
            "inline-flex h-8 flex-1 items-center justify-center rounded-lg text-[11.5px] font-medium",
            b.active
              ? "bg-white/[0.08] text-foreground"
              : "text-muted-foreground",
          )}
        >
          {b.label}
        </span>
      ))}
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
        <LayoutGrid strokeWidth={1.6} className="size-3.5 text-muted-foreground" aria-hidden />
      </span>
    </div>
  );
}

/* ---------------------------------------------------------- */
/*  Agent composer at the bottom                                */
/* ---------------------------------------------------------- */

function MobileAgentBar() {
  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-white/5 px-3 py-2.5">
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-white/[0.06]">
        <Plus strokeWidth={1.6} className="size-3.5 text-muted-foreground" aria-hidden />
      </span>
      <div className="flex h-9 flex-1 items-center gap-2 rounded-full bg-white/[0.04] px-3 text-[12.5px] text-muted-foreground">
        <span className="flex-1 truncate">Plan, build, / for commands…</span>
        <span className="inline-flex items-center gap-1 text-[10.5px] text-foreground/80">
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]"
          />
          Active
        </span>
      </div>
      <span
        className="inline-flex size-8 items-center justify-center rounded-full"
        style={{ background: "var(--primary)" }}
      >
        <ArrowUp strokeWidth={2} className="size-3.5 text-black" aria-hidden />
      </span>
    </div>
  );
}
