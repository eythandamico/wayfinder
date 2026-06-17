"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Flame,
  Forward,
  Link2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradingCard as TradingCardData } from "../_data/trading-cards";
import { TokenLogo } from "./TokenLogo";

type Props = {
  card: TradingCardData | null;
  onOpenChange: (open: boolean) => void;
};

/**
 * Fullscreen takeover for a trading card. Four-step job-to-be-done:
 * read the thesis → verify the call → decide direction & size →
 * execute. The hero handles the first two, the rail handles the last
 * two. Visual language matches the shell panels: bg-muted, ring-inset,
 * rounded-lg, primary as accent (never as background wash).
 */
export function TradingCardSheet({ card, onOpenChange }: Props) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [size, setSize] = useState(50);
  const [leverage, setLeverage] = useState<1 | 3 | 5 | 10>(3);
  const [piledIn, setPiledIn] = useState(false);

  if (!card) return null;

  const isUp = card.change24h >= 0;
  const sizeUsd = size * 10;
  const pileInCount = (card.pileInCount ?? 0) + (piledIn ? 1 : 0);

  return (
    <Dialog.Root open={!!card} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-[60] bg-black/70 backdrop-blur-md",
            "transition-opacity duration-300 ease-out",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-[70] flex h-[min(86vh,680px)] w-[min(94vw,960px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card backdrop-blur-md ring-1 ring-inset ring-white/[0.06] shadow-2xl",
            "transition-[opacity,transform] duration-300 ease-out",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.97]",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.97]",
          )}
        >
          {/* Header — eyebrow on the left, icon buttons on the right.
              Matches the chrome style used elsewhere in the shell so
              this sheet doesn't feel like a foreign UI. */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.05] px-4 py-2.5">
            <Dialog.Title className="inline-flex items-center gap-2 text-micro uppercase tracking-[0.18em] text-muted-foreground">
              Signal
              <span aria-hidden className="text-muted-foreground/50">·</span>
              <span className="tabular-nums">#{card.edition}</span>
            </Dialog.Title>
            <ShareActions card={card} />
          </div>

          {/* Body — two columns: read on the left, decide on the right. */}
          <div className="grid min-h-0 flex-1 grid-cols-[1fr_300px] overflow-hidden">
            {/* Left: hero + chart */}
            <div className="scroll-thin flex min-h-0 flex-col gap-4 overflow-y-auto p-4">
              <Hero card={card} isUp={isUp} />
              <ChartCard card={card} />
            </div>

            {/* Right: trade rail */}
            <aside className="flex min-h-0 flex-col gap-4 border-l border-white/[0.05] p-4">
              {/* Side */}
              <div className="grid grid-cols-2 gap-1 rounded-md bg-surface-1 p-0.5">
                {(["buy", "sell"] as const).map((s) => {
                  const active = s === side;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSide(s)}
                      className={cn(
                        "inline-flex h-9 items-center justify-center gap-1.5 rounded-sm text-body font-medium transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
                        active
                          ? s === "buy"
                            ? "bg-primary/15 text-primary"
                            : "bg-tone-down/15 text-tone-down"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {s === "buy" ? (
                        <ArrowUp
                          strokeWidth={1.75}
                          className="size-3.5"
                          aria-hidden
                        />
                      ) : (
                        <ArrowDown
                          strokeWidth={1.75}
                          className="size-3.5"
                          aria-hidden
                        />
                      )}
                      {s === "buy" ? "Long" : "Short"}
                    </button>
                  );
                })}
              </div>

              {/* Size slider */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-body text-muted-foreground">Size</span>
                  <span className="text-body font-semibold tabular-nums text-foreground">
                    ${sizeUsd.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-surface-3 accent-[var(--primary)]"
                  aria-label="Trade size"
                />
                <div className="flex items-center justify-between text-caption tabular-nums text-muted-foreground">
                  <span>$10</span>
                  <span>$1,000</span>
                </div>
              </div>

              {/* Leverage chips */}
              <div className="flex flex-col gap-1.5">
                <span className="text-body text-muted-foreground">
                  Leverage
                </span>
                <div className="grid grid-cols-4 gap-1 rounded-md bg-surface-1 p-0.5">
                  {([1, 3, 5, 10] as const).map((lev) => {
                    const active = leverage === lev;
                    return (
                      <button
                        key={lev}
                        type="button"
                        onClick={() => setLeverage(lev)}
                        className={cn(
                          "h-7 rounded-sm text-body tabular-nums transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
                          active
                            ? "bg-surface-3 font-semibold text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {lev}×
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Read-only stats */}
              <div className="grid grid-cols-2 gap-3 rounded-md bg-surface-1 px-3 py-2.5">
                <Stat label="Funding" value="+0.008%/h" tone="primary" />
                <Stat label="Spread" value="$0.04" />
                <Stat label="Slippage" value="0.04%" />
                <Stat
                  label="Notional"
                  value={`$${(sizeUsd * leverage).toLocaleString()}`}
                />
              </div>

              {/* CTA — primary action lives at the bottom of the rail */}
              <button
                type="button"
                className={cn(
                  "mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-md font-semibold transition-[filter,scale] duration-150 ease-out hover:brightness-110 active:scale-[0.96]",
                  side === "buy"
                    ? "bg-primary text-primary-foreground"
                    : "bg-tone-down text-background",
                )}
              >
                {side === "buy" ? "Buy" : "Sell"} {card.ticker} · $
                {sizeUsd.toLocaleString()}
              </button>

              {/* Social commit — secondary action, doesn't compete with
                  the primary CTA but still surfaces the pile-in social
                  layer for users who want to signal without trading. */}
              <button
                type="button"
                onClick={() => setPiledIn((v) => !v)}
                className={cn(
                  "inline-flex h-9 items-center justify-center gap-1.5 rounded-md text-body font-medium transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
                  piledIn
                    ? "bg-primary/15 text-primary ring-1 ring-inset ring-primary/30"
                    : "bg-surface-1 text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <Sparkles
                  strokeWidth={1.75}
                  className="size-3.5"
                  aria-hidden
                />
                {piledIn ? "Piled in" : "Pile in"}
                <span className="text-muted-foreground/70 tabular-nums">
                  · {pileInCount}
                </span>
              </button>
            </aside>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero — identity + price + thesis quote + provenance + social row  */
/* ------------------------------------------------------------------ */

function Hero({ card, isUp }: { card: TradingCardData; isUp: boolean }) {
  // Date.now during render is intentional — this sheet is a transient
  // overlay and the "ago" string only needs to be accurate at open
  // time; the purity rule's stability concern doesn't apply here.
  const minutesAgo = Math.max(1, Math.round((Date.now() - card.createdAt) / 60000));
  const ago =
    minutesAgo < 60
      ? `${minutesAgo}m ago`
      : `${Math.round(minutesAgo / 60)}h ago`;

  return (
    <div className="rounded-lg bg-surface-1">
      <div className="flex flex-col gap-3 p-4">
        {/* Identity row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <TokenLogo
              symbol={card.ticker}
              char={card.iconChar}
              bg={card.iconBg}
              fg={card.iconFg ?? "#fff"}
              size={36}
              kind={card.kind}
            />
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-heading text-title font-semibold leading-none text-foreground">
                {card.ticker}
              </span>
              <span className="truncate text-body text-muted-foreground">
                {card.name}
              </span>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-surface-1 px-2 py-0.5 text-micro font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {card.kind === "stock" ? "Stock · HL" : "Crypto · HL"}
          </span>
        </div>

        {/* Price row */}
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-display font-semibold leading-none tabular-nums text-foreground">
            $
            {card.price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-body tabular-nums",
              isUp ? "text-primary" : "text-tone-down",
            )}
          >
            <span aria-hidden>{isUp ? "▲" : "▼"}</span>
            {Math.abs(card.change24h).toFixed(2)}%
            <span className="text-muted-foreground">· 24h</span>
          </span>
        </div>

        {/* Thesis — the idea in plain prose. One source of truth. */}
        <p className="text-body text-foreground text-pretty">
          {card.thesis}
        </p>

        {/* Provenance + social row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
          <span className="text-body text-muted-foreground">
            <span className="text-foreground">@{card.author.name}</span> ·{" "}
            {ago}
          </span>
          <span aria-hidden className="h-3 w-px bg-surface-4" />
          <div className="flex items-center gap-1">
            {(card.reactions ?? []).map((r) => (
              <span
                key={r.emoji}
                className="inline-flex items-center gap-1 rounded-full bg-surface-1 px-1.5 py-0.5 text-caption tabular-nums text-foreground"
              >
                <span aria-hidden>{r.emoji}</span>
                {r.count}
              </span>
            ))}
            <button
              type="button"
              aria-label="Add reaction"
              className="inline-flex size-5 items-center justify-center rounded-full bg-surface-1 text-muted-foreground transition-colors duration-150 hover:bg-surface-3 hover:text-foreground"
            >
              <Plus strokeWidth={2} className="size-3" aria-hidden />
            </button>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 text-body text-muted-foreground tabular-nums">
            <Flame strokeWidth={1.75} className="size-3.5" aria-hidden />
            {card.pileInCount ?? 0} piled in
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart card — single source of truth for the trend                  */
/* ------------------------------------------------------------------ */

function ChartCard({ card }: { card: TradingCardData }) {
  return (
    <div className="relative flex min-h-[240px] flex-1 flex-col overflow-hidden rounded-lg bg-surface-1">
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.05] px-3 py-2">
        <span className="text-micro uppercase tracking-[0.16em] text-muted-foreground">
          {card.ticker}/USDC · Hyperliquid
        </span>
        <div className="flex items-center gap-3 text-caption tabular-nums text-muted-foreground">
          <span>
            Vol 24h{" "}
            <span className="text-foreground">
              $
              {(card.price * 21_400).toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}
            </span>
          </span>
          <span>
            OI{" "}
            <span className="text-foreground">
              $
              {(card.price * 8_120).toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}
            </span>
          </span>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <ChartPlaceholder data={card.sparkline} sentiment={card.sentiment} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bits                                                               */
/* ------------------------------------------------------------------ */

function HeaderIconButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-1 hover:text-foreground active:scale-[0.96]"
    >
      {children}
    </button>
  );
}

/**
 * Forward + Copy-Link controls in the sheet header.
 *
 *   Forward → navigator.share() with the card's thesis and URL.
 *             On desktop browsers that don't implement share, falls
 *             back to the copy-link path.
 *   Copy    → writes the URL to the clipboard. Icon swaps to a check
 *             for 1.2s for feedback.
 *
 * URL is a public-route placeholder (wayfinder.ai/s/<ticker>/<id>).
 * The route itself doesn't exist yet — Phase 3 ships the share
 * affordance and the URL shape so links can start spreading;
 * standing up the public landing page is its own ticket.
 */
function ShareActions({ card }: { card: TradingCardData }) {
  const [copied, setCopied] = useState(false);

  const shareUrl = `https://wayfinder.ai/s/${card.ticker.toLowerCase()}/${card.id}`;
  const shareTitle = `${card.ticker} — ${card.author.name} on Wayfinder`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard unavailable — silent no-op */
    }
  };

  const forward = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: shareTitle,
          text: card.thesis,
          url: shareUrl,
        });
        return;
      } catch {
        /* user dismissed — fall through to copy */
      }
    }
    void copyLink();
  };

  return (
    <div className="flex items-center gap-0.5">
      <HeaderIconButton aria-label="Forward signal" onClick={forward}>
        <Forward strokeWidth={1.75} className="size-3.5" aria-hidden />
      </HeaderIconButton>
      <HeaderIconButton
        aria-label={copied ? "Link copied" : "Copy link"}
        onClick={copyLink}
      >
        {copied ? (
          <Check
            strokeWidth={2}
            className="size-3.5 text-primary"
            aria-hidden
          />
        ) : (
          <Link2 strokeWidth={1.75} className="size-3.5" aria-hidden />
        )}
      </HeaderIconButton>
      <Dialog.Close
        aria-label="Close"
        className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-1 hover:text-foreground active:scale-[0.96]"
      >
        <X strokeWidth={1.75} className="size-3.5" aria-hidden />
      </Dialog.Close>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "primary";
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-body tabular-nums",
          tone === "primary" ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ChartPlaceholder({
  data,
  sentiment,
}: {
  data: number[];
  sentiment: TradingCardData["sentiment"];
}) {
  const accent =
    sentiment === "bull"
      ? "var(--primary)"
      : sentiment === "bear"
        ? "var(--tone-down)"
        : "var(--muted-foreground)";
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 800;
  const H = 240;
  const padding = 16;
  const pts = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (W - padding * 2);
      const y = padding + (1 - (v - min) / range) * (H - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `M ${padding},${H} L ${pts.split(" ").join(" L ")} L ${W - padding},${H} Z`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="card-sheet-chart-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((p) => (
        <line
          key={p}
          x1={padding}
          x2={W - padding}
          y1={padding + (H - 2 * padding) * p}
          y2={padding + (H - 2 * padding) * p}
          stroke="rgba(255,255,255,0.04)"
        />
      ))}
      <path d={area} fill="url(#card-sheet-chart-area)" />
      <polyline
        points={pts}
        fill="none"
        stroke={accent}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
