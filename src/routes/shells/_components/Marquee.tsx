"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  CircleDot,
  Flame,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  MarqueeItem,
  MarqueeResponse,
} from "@/api/marquee";

/**
 * Top-of-shell marquee — a continuously-scrolling tape of trader-
 * relevant cells: live token prices, breaking headlines, Polymarket
 * movers, the soonest sports game-lines, macro indicators, and an
 * upcoming-events strip.
 *
 * Pure CSS animation (see globals.css `.wf-marquee-track`) — no
 * JS-driven scroll position, so it stays smooth even when the rest
 * of the shell is busy. Hovering or tab-focusing into the tape pauses
 * the scroll so the user can read a cell.
 *
 * Refreshes the underlying data every 60s; the server route already
 * caches each upstream for its appropriate TTL so this is cheap.
 */

const REFRESH_INTERVAL_MS = 60_000;
/** Seconds of scroll time allocated per item — the loop duration is
 *  this × item count. Trader-tape pace: a cell crosses the visible
 *  panel in ~1.5s, so the rhythm reads as "live" rather than "static
 *  signage". Hovering pauses the whole track so the user can read a
 *  cell mid-stream. */
const SECONDS_PER_ITEM = 1.5;
const MIN_DURATION_SECONDS = 20;

/** Client-side fallback so the tape always animates even when the
 *  /api/marquee Function 404s (Pages routing issue) or every upstream
 *  fetch fails. Picks the same shapes the real API emits so the cells
 *  render with their normal styling. Order is interleaved by type. */
const FALLBACK_ITEMS: MarqueeItem[] = [
  { type: "token", id: "btc", symbol: "BTC", price: 67_842, change24h: 1.42 },
  { type: "macro", id: "dxy", label: "DXY", value: "104.32", change24h: -0.18 },
  { type: "token", id: "eth", symbol: "ETH", price: 3_421, change24h: -0.84 },
  { type: "indicator", id: "fng", label: "Fear & Greed", value: "62", tone: "primary" },
  { type: "token", id: "sol", symbol: "SOL", price: 168.42, change24h: 2.15 },
  { type: "macro", id: "us10y", label: "US10Y", value: "4.42%", change24h: 0.03 },
  { type: "token", id: "hype", symbol: "HYPE", price: 24.18, change24h: 5.73 },
  { type: "macro", id: "vix", label: "VIX", value: "14.2", change24h: 5.1 },
  { type: "event", id: "fomc", label: "FOMC", when: "Wed 2:00 PM ET" },
  { type: "macro", id: "wti", label: "WTI", value: "$78.40", change24h: -1.2 },
  { type: "event", id: "cpi", label: "CPI", when: "Thu 8:30 AM ET" },
  { type: "macro", id: "gold", label: "Gold", value: "$2,650", change24h: 0.4 },
];

export function Marquee() {
  // Start with the fallback so the tape animates immediately on mount;
  // the real /api/marquee fetch overwrites once it lands. If the API
  // returns empty (every upstream timed out), keep the fallback so the
  // tape never collapses to nothing.
  const [items, setItems] = useState<MarqueeItem[]>(FALLBACK_ITEMS);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/marquee");
        if (!res.ok) return; // 404 / 5xx → keep fallback
        const data = (await res.json()) as MarqueeResponse;
        if (cancelled) return;
        if (data.items && data.items.length > 0) {
          setItems(data.items);
        }
      } catch {
        // network / parse error — keep fallback running
      }
    };
    load();
    const id = window.setInterval(load, REFRESH_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const duration = useMemo(() => {
    const n = items.length;
    return Math.max(MIN_DURATION_SECONDS, n * SECONDS_PER_ITEM);
  }, [items]);

  return (
    <MarqueeShell>
      <div
        className="wf-marquee-track flex shrink-0 items-center gap-0"
        style={{ "--wf-marquee-duration": `${duration}s` } as React.CSSProperties}
      >
        {/* Render the cells twice so the linear translate from 0 → -50%
            loops without a visible seam. */}
        {[0, 1].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy === 1}
            className="flex shrink-0 items-center"
          >
            {items.map((item) => (
              <Cell key={`${copy}:${item.id}`} item={item} />
            ))}
          </div>
        ))}
      </div>
    </MarqueeShell>
  );
}

function MarqueeShell({
  children,
  isLoading,
}: {
  children?: React.ReactNode;
  isLoading?: boolean;
}) {
  return (
    <div
      role="region"
      aria-label="Live market tape"
      className="wf-marquee relative w-full shrink-0 overflow-hidden border-b border-white/[0.05] bg-background"
    >
      {/* Edge gradient masks so cells fade in/out at the edges rather
          than slamming into a hard cut. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent"
      />
      {isLoading ? (
        <div className="flex items-center gap-2 px-4 py-2 text-caption text-muted-foreground">
          Loading market tape…
        </div>
      ) : (
        children
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Per-type cell renderers                                              */
/* ------------------------------------------------------------------ */

function Cell({ item }: { item: MarqueeItem }) {
  switch (item.type) {
    case "token":
      return <TokenCell item={item} />;
    case "news":
      return <NewsCell item={item} />;
    case "polymarket":
      return <PolymarketCell item={item} />;
    case "sports":
      return <SportsCell item={item} />;
    case "macro":
      return <MacroCell item={item} />;
    case "indicator":
      return <IndicatorCell item={item} />;
    case "event":
      return <EventCell item={item} />;
  }
}

/** Shared row chrome — divider, padding, height. Centralizing here
 *  keeps cell variants visually consistent and easy to tweak. */
function CellShell({
  children,
  href,
}: {
  children: React.ReactNode;
  href?: string;
}) {
  const className =
    "inline-flex h-9 shrink-0 items-center gap-2 border-r border-white/[0.05] px-4 text-body tabular-nums focus-visible:outline-none focus-visible:bg-surface-1";
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(className, "transition-colors hover:bg-surface-1")}
      >
        {children}
      </a>
    );
  }
  return <div className={className}>{children}</div>;
}

function TokenCell({
  item,
}: {
  item: Extract<MarqueeItem, { type: "token" }>;
}) {
  const positive = item.change24h >= 0;
  return (
    <CellShell>
      <span className="font-semibold text-foreground">{item.symbol}</span>
      <span className="text-foreground">{formatPrice(item.price)}</span>
      <ChangeChip value={item.change24h} positive={positive} />
    </CellShell>
  );
}

function NewsCell({
  item,
}: {
  item: Extract<MarqueeItem, { type: "news" }>;
}) {
  return (
    <CellShell href={item.link}>
      <span
        aria-hidden
        className="inline-flex items-center gap-1 text-caption font-semibold uppercase tracking-wide text-tone-down"
      >
        <CircleDot className="size-2.5 animate-pulse" strokeWidth={3} />
        Breaking
      </span>
      <span className="max-w-[420px] truncate text-foreground">
        {item.headline}
      </span>
      <span className="text-caption text-muted-foreground">{item.source}</span>
    </CellShell>
  );
}

function PolymarketCell({
  item,
}: {
  item: Extract<MarqueeItem, { type: "polymarket" }>;
}) {
  const positive = item.change24h >= 0;
  return (
    <CellShell>
      <span className="inline-flex items-center gap-1 text-caption font-semibold uppercase tracking-wide text-primary">
        <TrendingUp className="size-3" strokeWidth={2.5} />
        Poly
      </span>
      <span className="max-w-[160px] truncate text-foreground">
        {item.label}
      </span>
      <span className="text-foreground">
        {Math.round(item.yesPrice * 100)}¢
      </span>
      <ChangeChip
        value={item.change24h * 100}
        positive={positive}
        unit="pt"
      />
    </CellShell>
  );
}

function SportsCell({
  item,
}: {
  item: Extract<MarqueeItem, { type: "sports" }>;
}) {
  return (
    <CellShell>
      <span className="inline-flex items-center gap-1 text-caption font-semibold uppercase tracking-wide text-muted-foreground">
        <Flame className="size-3" strokeWidth={2.5} />
        {item.league}
      </span>
      <span className="max-w-[200px] truncate text-foreground">
        {item.title}
      </span>
      <span className="text-muted-foreground">
        {formatStartsIn(item.startsInMs)}
      </span>
      {item.favorite && (
        <span className="text-foreground">
          {item.favorite.name} {Math.round(item.favorite.yesPrice * 100)}%
        </span>
      )}
    </CellShell>
  );
}

function MacroCell({
  item,
}: {
  item: Extract<MarqueeItem, { type: "macro" }>;
}) {
  const positive = (item.change24h ?? 0) >= 0;
  return (
    <CellShell>
      <span className="font-semibold text-foreground">{item.label}</span>
      <span className="text-foreground">{item.value}</span>
      {typeof item.change24h === "number" && (
        <ChangeChip value={item.change24h} positive={positive} />
      )}
    </CellShell>
  );
}

function IndicatorCell({
  item,
}: {
  item: Extract<MarqueeItem, { type: "indicator" }>;
}) {
  const toneClass =
    item.tone === "primary"
      ? "text-primary"
      : item.tone === "tone-down"
        ? "text-tone-down"
        : "text-foreground";
  return (
    <CellShell>
      <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
        {item.label}
      </span>
      <span className={cn("font-semibold", toneClass)}>{item.value}</span>
    </CellShell>
  );
}

function EventCell({
  item,
}: {
  item: Extract<MarqueeItem, { type: "event" }>;
}) {
  return (
    <CellShell>
      <CalendarDays
        className="size-3.5 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="text-foreground">{item.label}</span>
      <span className="text-muted-foreground">{item.when}</span>
    </CellShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Bits                                                                 */
/* ------------------------------------------------------------------ */

function ChangeChip({
  value,
  positive,
  unit = "%",
}: {
  value: number;
  positive: boolean;
  unit?: "%" | "pt";
}) {
  const abs = Math.abs(value);
  const label = unit === "%" ? `${abs.toFixed(2)}%` : `${abs.toFixed(0)}pt`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-caption font-medium",
        positive ? "text-primary" : "text-tone-down",
      )}
    >
      {positive ? (
        <ArrowUp className="size-3" strokeWidth={2.25} aria-hidden />
      ) : (
        <ArrowDown className="size-3" strokeWidth={2.25} aria-hidden />
      )}
      {label}
    </span>
  );
}

function formatPrice(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function formatStartsIn(ms: number): string {
  if (ms <= 0) return "Now";
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.round(hr / 24);
  return `${d}d`;
}

