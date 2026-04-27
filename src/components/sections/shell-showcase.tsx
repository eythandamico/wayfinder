"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  ArrowUp,
  CandlestickChart as LucideCandlestick,
  ChevronDown,
  Compass,
  Infinity,
  Loader2,
  Lock,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { cn } from "@/lib/utils";

const PREVIEW_WALLET = "0xa1536Cf17e2bFE9B4C0b0C34dC8D4D8a58e8Eb3C2";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * A framed, partially-functional preview of the Shells app for the home page.
 * Entrance is a scroll-linked "laptop unfold": perspective rotateX + scale tied
 * to scroll progress, with panes staggering in at the tail. No pin, no scroll
 * hijack — the whole move resolves as the frame crosses the viewport.
 */
export function ShellShowcase() {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const auroraRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (reduce) return;

      const mm = gsap.matchMedia();

      mm.add("(min-width: 768px)", () => {
        gsap.set(frameRef.current, {
          transformPerspective: 1200,
          transformOrigin: "50% 95%",
          rotateX: 22,
          scale: 0.88,
          y: 70,
        });
        gsap.set(auroraRef.current, { opacity: 0.2 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 90%",
            end: "top 18%",
            scrub: 0.6,
          },
        });
        tl.to(
          frameRef.current,
          { rotateX: 0, scale: 1, y: 0, ease: "none" },
          0,
        ).to(auroraRef.current, { opacity: 0.65, ease: "none" }, 0);
      });

      mm.add("(max-width: 767px)", () => {
        gsap.from(frameRef.current, {
          opacity: 0,
          y: 28,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 85%",
          },
        });
      });
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-6xl">
      <div
        ref={auroraRef}
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(55% 60% at 50% 40%, color-mix(in oklch, var(--primary) 28%, transparent) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div
        ref={frameRef}
        className="relative overflow-hidden rounded-2xl bg-muted/90 ring-1 ring-white/[0.08] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] backdrop-blur-sm"
        style={{ willChange: "transform" }}
      >
        <BrowserChrome />
        <AppTopBar />
        <div className="grid h-[min(62vh,580px)] grid-cols-[1fr_0.42fr_0.5fr] gap-1 bg-background p-1">
          <div className="flex flex-col gap-1">
            <ChartPane />
            <PortfolioPane />
          </div>
          <div className="flex flex-col gap-1">
            <TradePane />
            <OrderBookPane />
          </div>
          <ChatPane />
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/*  Frame chrome                                               */
/* ---------------------------------------------------------- */

function BrowserChrome() {
  return (
    <div className="flex items-center gap-3 border-b border-white/5 bg-muted/80 px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-white/10" />
        <span className="size-2.5 rounded-full bg-white/10" />
        <span className="size-2.5 rounded-full bg-white/10" />
      </div>
      <div className="mx-auto inline-flex items-center gap-1.5 rounded-md bg-white/5 px-3 py-1 font-mono text-[10.5px] text-muted-foreground">
        <LockIcon />
        shells.wayfinder.ai
      </div>
      <div className="w-12" aria-hidden />
    </div>
  );
}

function AppTopBar() {
  const [q, setQ] = useState("");
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/5 px-3 py-2">
      <div className="flex items-center gap-2">
        <Image
          src="/brand/wayfinder-logomark.svg"
          alt="Wayfinder"
          width={96}
          height={22}
          className="h-5 w-auto opacity-95"
        />
        <ViewToggle active label="Trade" Icon={LucideCandlestick} />
        <ViewToggle label="Paths" Icon={Compass} />
      </div>
      <div className="relative w-[420px] max-w-full">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tokens or paths…"
          className="h-9 w-full rounded-lg bg-white/[0.08] pl-9 pr-12 text-[12.5px] text-foreground outline-none transition-colors duration-150 ease-out placeholder:text-muted-foreground/70 hover:bg-white/[0.12] focus-visible:bg-white/[0.12]"
        />
        <kbd className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">
          ⌘K
        </kbd>
      </div>
      <div className="flex items-center justify-end gap-2">
        <span className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/[0.08] px-3 text-muted-foreground">
          <InfinityIcon />
          <span className="text-[11.5px] tabular-nums text-foreground">
            12.4K<span className="text-muted-foreground"> / 100K</span>
          </span>
          <ChevronDownIcon className="size-3 text-muted-foreground" />
        </span>
        <span
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[11.5px] font-semibold"
          style={{
            background: "var(--wf-pro-gold)",
            color: "var(--wf-pro-indigo)",
          }}
        >
          <Sparkles strokeWidth={1.75} className="size-3" />
          Go Pro
        </span>
        <span className="h-5 w-px bg-white/10" aria-hidden />
        <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/[0.08] pl-1 pr-2">
          <span
            aria-hidden
            className="flex size-7 items-center justify-center overflow-hidden rounded-full"
          >
            <Jazzicon diameter={28} seed={jsNumberForAddress(PREVIEW_WALLET)} />
          </span>
          <ChevronDownIcon className="size-3 text-muted-foreground" />
        </span>
      </div>
    </div>
  );
}

function ViewToggle({
  active,
  label,
  Icon,
}: {
  active?: boolean;
  label: string;
  Icon: LucideIcon;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-medium transition-colors",
        active
          ? "bg-white/[0.10] text-foreground"
          : "text-muted-foreground",
      )}
    >
      <Icon strokeWidth={1.75} className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}

/* ---------------------------------------------------------- */
/*  Chart                                                       */
/* ---------------------------------------------------------- */

function ChartPane() {
  return (
    <div
      data-pane
      className="flex flex-1 flex-col overflow-hidden rounded-lg bg-muted"
    >
      <div className="flex items-center gap-3 px-3 pt-3 pb-2">
        <span className="inline-flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-white/[0.04]">
          <span
            aria-hidden
            className="flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-black"
            style={{ backgroundColor: "#f7931a" }}
          >
            ₿
          </span>
          <span className="font-heading text-[13px] font-semibold">
            BTC-USDC
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">40X</span>
          <ChevronDownIcon className="size-3 text-muted-foreground" />
        </span>
        <span className="h-4 w-px bg-white/10" aria-hidden />
        <div className="scroll-thin flex min-w-0 flex-1 items-center gap-4 overflow-x-auto">
          {[
            ["Price", "$75,739.5", true],
            ["Mark", "$75,750"],
            ["24H", "+1.38%", true],
            ["Vol", "$2.47B"],
          ].map(([label, value, tone]) => (
            <div key={label as string} className="flex shrink-0 flex-col gap-0.5">
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                {label}
              </span>
              <span
                className={cn(
                  "font-mono text-[11px] tabular-nums",
                  tone && "text-primary",
                )}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-md bg-background/40 p-0.5">
          {["1m", "5m", "1h", "1d"].map((t, i) => (
            <span
              key={t}
              className={cn(
                "rounded-sm px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
                i === 0
                  ? "bg-white/10 text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden px-3 pb-3">
        <CandlestickChart />
      </div>
    </div>
  );
}

function CandlestickChart() {
  // Pre-generated candle data — stable, seed-friendly, no network
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

  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 8, bottom: 20, left: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const lo = Math.min(...candles.map((c) => c[2]));
  const hi = Math.max(...candles.map((c) => c[1]));
  const range = hi - lo;

  const y = (v: number) =>
    padding.top + ((hi - v) / range) * innerH;
  const step = innerW / candles.length;
  const bodyW = Math.max(2, step * 0.62);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-hidden
    >
      {/* gridlines */}
      {[0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1={padding.left}
          x2={width - padding.right}
          y1={padding.top + innerH * p}
          y2={padding.top + innerH * p}
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={1}
          strokeDasharray="2 4"
        />
      ))}

      {candles.map((c, i) => {
        const [o, h, l, cl] = c;
        const bullish = cl >= o;
        const color = bullish ? "#8af0b0" : "#f07575";
        const x = padding.left + i * step + step / 2;
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={y(h)} y2={y(l)} stroke={color} strokeWidth={1} />
            <rect
              x={x - bodyW / 2}
              y={y(Math.max(o, cl))}
              width={bodyW}
              height={Math.max(1, Math.abs(y(cl) - y(o)))}
              fill={color}
              opacity={bullish ? 0.9 : 0.85}
            />
          </g>
        );
      })}

      {/* Current price marker */}
      <line
        x1={padding.left}
        x2={width - padding.right}
        y1={y(candles[candles.length - 1][3])}
        y2={y(candles[candles.length - 1][3])}
        stroke="rgba(138,240,176,0.35)"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
    </svg>
  );
}

/* ---------------------------------------------------------- */
/*  Portfolio                                                   */
/* ---------------------------------------------------------- */

function PortfolioPane() {
  return (
    <div
      data-pane
      className="flex h-[36%] shrink-0 flex-col overflow-hidden rounded-lg bg-muted px-4 py-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            Portfolio
          </span>
          <span className="font-heading text-[22px] font-semibold leading-none tabular-nums">
            $0.00
          </span>
          <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
            — $0.00 · 0.00% · 24H
          </span>
        </div>
        <span className="inline-flex items-center gap-2 font-mono text-[10px] tabular-nums text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
          0xa153…Eb3C2
        </span>
      </div>
      <div className="mt-3 flex flex-col">
        {[
          ["H", "Hyperliquid", 0],
          ["T", "Tokens", 0],
          ["P", "Polymarket", 0],
        ].map(([glyph, name, count]) => (
          <div
            key={name as string}
            className="flex items-center gap-2 border-t border-white/5 py-1.5 first:border-t-0"
          >
            <span className="flex size-5 items-center justify-center rounded-md bg-white/[0.06] font-mono text-[9.5px] font-semibold">
              {glyph}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-mono text-[9.5px] uppercase tracking-wider">
                {name}
              </span>
              <span className="font-mono text-[9px] text-muted-foreground">
                {count} positions
              </span>
            </div>
            <span className="font-mono text-[11px] tabular-nums">$0.00</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/*  Trade panel                                                 */
/* ---------------------------------------------------------- */

function TradePane() {
  const [side, setSide] = useState<"long" | "short">("long");
  const [pct, setPct] = useState(16);
  return (
    <div
      data-pane
      className="flex flex-1 flex-col gap-2 overflow-hidden rounded-lg bg-muted p-2.5"
    >
      <div className="grid grid-cols-3 divide-x divide-white/5 rounded-md bg-background/40 ring-1 ring-inset ring-white/5">
        {[
          ["Margin", "Cross"],
          ["Leverage", "40x"],
          ["Type", "Market"],
        ].map(([label, value], i) => (
          <div key={label as string} className="flex flex-col gap-0.5 px-2 py-1.5">
            <span className="font-mono text-[8.5px] uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <span
              className={cn(
                "text-[11px]",
                i === 1 ? "font-mono tabular-nums text-primary" : "text-foreground",
              )}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1 rounded-md bg-background/40 p-0.5 ring-1 ring-inset ring-white/5">
        <button
          type="button"
          onClick={() => setSide("long")}
          className={cn(
            "rounded-sm py-1.5 text-[12px] font-semibold transition-colors",
            side === "long"
              ? "bg-primary text-primary-foreground shadow-[inset_0_-1.5px_0_rgba(0,0,0,0.12)]"
              : "text-muted-foreground",
          )}
        >
          Long ▲
        </button>
        <button
          type="button"
          onClick={() => setSide("short")}
          className={cn(
            "rounded-sm py-1.5 text-[12px] font-semibold transition-colors",
            side === "short"
              ? "bg-tone-down text-black shadow-[inset_0_-1.5px_0_rgba(0,0,0,0.12)]"
              : "text-muted-foreground",
          )}
        >
          Short ▼
        </button>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">
          Size
        </span>
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
          ≈ $0.00
        </span>
      </div>
      <div className="flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1.5">
        <span
          aria-hidden
          className="flex size-3.5 items-center justify-center rounded-full text-[8px] font-bold text-black"
          style={{ backgroundColor: "#f7931a" }}
        >
          ₿
        </span>
        <span className="min-w-0 flex-1 font-mono text-[12px] text-foreground tabular-nums">
          0.00
        </span>
        <span className="rounded-sm bg-white/10 px-1.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-muted-foreground">
          Max
        </span>
        <span className="font-mono text-[9.5px] text-muted-foreground">BTC</span>
      </div>
      <div className="relative flex h-7 items-center overflow-hidden rounded-md bg-white/5">
        <div
          className="absolute inset-y-1 left-1 rounded-sm bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `calc(${pct}% - 0.5rem)` }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          aria-label="Size percentage"
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <span className="relative z-10 ml-auto pr-3 font-mono text-[10px] tabular-nums text-muted-foreground">
          {pct}%
        </span>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-1.5 text-[10.5px]">
        <span className="text-muted-foreground">Liquidation</span>
        <span className="font-mono tabular-nums text-foreground/80">—</span>
      </div>
      <button
        type="button"
        className={cn(
          "rounded-md py-2 text-[12px] font-semibold transition-[filter]",
          side === "long"
            ? "bg-primary text-primary-foreground hover:brightness-[1.04]"
            : "bg-tone-down text-black hover:brightness-[1.04]",
        )}
      >
        Place Market {side === "long" ? "Long" : "Short"} →
      </button>
    </div>
  );
}

/* ---------------------------------------------------------- */
/*  Order book                                                  */
/* ---------------------------------------------------------- */

function OrderBookPane() {
  const asks = [
    ["75782.0", "1.05"],
    ["75781.0", "2.17"],
    ["75780.0", "1.08"],
    ["75778.0", "2.96"],
    ["75775.0", "4.18"],
  ];
  const bids = [
    ["75766.0", "28.74"],
    ["75765.0", "2.98"],
    ["75762.0", "0.78"],
    ["75760.0", "3.60"],
    ["75758.0", "2.46"],
  ];
  return (
    <div
      data-pane
      className="flex h-[55%] shrink-0 flex-col overflow-hidden rounded-lg bg-muted"
    >
      <div className="flex border-b border-white/5 px-1">
        <span className="relative flex-1 py-1.5 text-center text-[11px] font-semibold text-foreground">
          Order Book
          <span className="absolute inset-x-3 bottom-0 h-px bg-foreground" />
        </span>
        <span className="flex-1 py-1.5 text-center text-[11px] text-muted-foreground">
          Trades
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-2 py-1">
        <div className="grid grid-cols-[1fr_1fr] gap-1 px-1 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-muted-foreground">
          <span>Price</span>
          <span className="text-right">Size</span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {asks.map(([p, s]) => (
            <div
              key={p}
              className="grid grid-cols-[1fr_1fr] gap-1 px-1 py-[1px] font-mono text-[10px] tabular-nums"
            >
              <span className="text-tone-down">{p}</span>
              <span className="text-right text-foreground/80">{s}</span>
            </div>
          ))}
          <div className="my-0.5 grid grid-cols-[1fr_auto] gap-1 border-y border-white/5 bg-white/[0.02] px-1 py-1 font-mono text-[10px] tabular-nums">
            <span className="font-semibold">75766.5</span>
            <span className="text-muted-foreground">0.13 BPS</span>
          </div>
          {bids.map(([p, s]) => (
            <div
              key={p}
              className="grid grid-cols-[1fr_1fr] gap-1 px-1 py-[1px] font-mono text-[10px] tabular-nums"
            >
              <span className="text-primary">{p}</span>
              <span className="text-right text-foreground/80">{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/*  Chat                                                        */
/* ---------------------------------------------------------- */

function ChatPane() {
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  const send = () => {
    if (!input.trim()) return;
    setThinking(true);
    setInput("");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setThinking(false), 3200);
  };

  return (
    <div
      data-pane
      className="flex flex-col overflow-hidden rounded-lg bg-muted"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-foreground">
          Greeting
          <ChevronDownIcon className="size-3 text-muted-foreground" />
        </span>
        <div className="flex items-center gap-0.5 text-muted-foreground">
          <span className="flex size-6 items-center justify-center rounded hover:bg-white/[0.05]">
            <PlusIcon />
          </span>
          <span className="flex size-6 items-center justify-center rounded hover:bg-white/[0.05]">
            <MoreIcon />
          </span>
        </div>
      </div>

      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-3">
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl bg-white/[0.06] px-3 py-2 text-[12px]">
            hey
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground/90">
            Hey! How can I help you today?
          </div>
          <span className="font-mono text-[9.5px] text-muted-foreground">
            kimi-k2.5 · 4.0s · 213 tokens
          </span>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-2xl bg-white/[0.06] px-3 py-2 text-[12px]">
            Suggest a BTC hedge with funding capture
          </div>
        </div>
        {thinking && (
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <Loader2
              aria-hidden
              strokeWidth={1.75}
              className="size-3 animate-spin text-primary"
              style={{ animationDuration: "900ms" }}
            />
            thinking…
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="flex flex-col rounded-xl bg-background/40 ring-1 ring-inset ring-white/5 focus-within:ring-white/15">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Plan, Build, / for commands, @ for context"
            rows={2}
            className="resize-none bg-transparent px-3 pt-2.5 pb-1.5 text-[12px] leading-[1.5] text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          <div className="flex items-center justify-between px-1.5 pb-1.5">
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/5 px-2.5 text-[11px]">
              <InfinityIcon />
              <span className="font-medium">Kimi K2.5</span>
              <ChevronDownIcon className="size-3 text-muted-foreground" />
            </span>
            <button
              type="button"
              onClick={send}
              aria-label="Send"
              className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-[filter] hover:brightness-[1.04]"
            >
              <ArrowUpIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/*  Inline icons (kept local to the showcase)                  */
/* ---------------------------------------------------------- */

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <ChevronDown
      strokeWidth={1.5}
      className={className ?? "size-3"}
      aria-hidden
    />
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <Search
      strokeWidth={1.5}
      className={className ?? "size-3.5"}
      aria-hidden
    />
  );
}

function InfinityIcon() {
  return (
    <Infinity
      strokeWidth={2}
      className="size-3.5 text-primary"
      aria-hidden
    />
  );
}

function LockIcon() {
  return (
    <Lock
      strokeWidth={1.5}
      className="size-3 text-muted-foreground/70"
      aria-hidden
    />
  );
}

function PlusIcon() {
  return <Plus strokeWidth={1.5} className="size-3.5" aria-hidden />;
}

function MoreIcon() {
  return <MoreVertical strokeWidth={1.5} className="size-3.5" aria-hidden />;
}

function ArrowUpIcon() {
  return <ArrowUp strokeWidth={2} className="size-3.5" aria-hidden />;
}
