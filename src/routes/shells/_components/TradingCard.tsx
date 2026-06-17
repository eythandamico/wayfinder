"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Newspaper,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MARKETS } from "../_data/mocks";
import type { TradingCard as TradingCardData } from "../_data/trading-cards";
import { TokenLogo } from "./TokenLogo";
import { useActiveMarket } from "../_state/shells-context";
import {
  DAILY_R_CAP,
  PILE_IN_R,
  useSignals,
} from "../_state/signals-context";

type Props = {
  card: TradingCardData;
  /** Kept for backwards-compat with existing call sites; the card has
   *  a single rendering now. */
  variant?: "compact" | "hero";
  onSelect?: () => void;
  /** When provided, renders a small ✕ in the top-right for dismissal. */
  onClose?: () => void;
  /** Fired when the user pile-ins. Parent uses this to drop a receipt
   *  message in chat, bump activity, etc. */
  onPileIn?: (card: TradingCardData) => void;
  className?: string;
};

/**
 * Default size for a one-tap Pile-In order. Expressed in R-units (a
 * fraction of your risk budget). Single source of truth so the card's
 * joined-state label and the receipt chip drop in chat agree on what
 * actually filled.
 */
export const PILE_IN_SIZE_R = "0.5R";

/**
 * Signal Card — the "ship-it" version of a trading signal. Optimized
 * for the deck above the composer: short, scannable, charged with the
 * direction color, and shareable as a screenshot.
 *
 * Hierarchy:
 *   1. Thesis        — the signal (largest text)
 *   2. Ticker chip   — what
 *   3. Author/time   — credibility (smallest)
 *   4. Pile-in       — the action (color-locked to direction)
 *
 * Direction is expressed through the SURFACE, not a label. A 1px
 * tinted ring + a soft corner glow in the sentiment color do the
 * "long vs short" reading at a glance. Tap the card to open the full
 * sheet (price tick, chart, reactions, etc. live there).
 */
export function TradingCard({
  card,
  onSelect,
  onClose,
  onPileIn,
  className,
}: Props) {
  const {
    events,
    openAuthor,
    pileInCardIds,
    todaysExposureR,
    recordPileIn,
  } = useSignals();
  const { setActiveMarket } = useActiveMarket();

  // Pile-in state is now sourced from the global ledger so auto-
  // mirrored fills + cross-component piles stay in sync. Local
  // count keeps a cosmetic "+1" feel after a manual click.
  const pileIned = pileInCardIds.has(card.id);
  const [pileInCount, setPileInCount] = useState(card.pileInCount ?? 0);
  const wouldBreachCap =
    !pileIned && todaysExposureR + PILE_IN_R > DAILY_R_CAP;

  const pileIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (pileIned || wouldBreachCap) return;
    recordPileIn({ cardId: card.id, ticker: card.ticker, sizeR: PILE_IN_R });
    setPileInCount((c) => c + 1);
    onPileIn?.(card);
  };

  const minutesAgo = Math.max(
    1,
    Math.round((Date.now() - card.createdAt) / 60000),
  );
  const ago =
    minutesAgo < 60 ? `${minutesAgo}m` : `${Math.round(minutesAgo / 60)}h`;

  // Live price + P/L. Open signals tick every TICK_MS with a small
  // sentiment-biased drift; closed/stopped/expired show the locked-in
  // closedPrice. P/L is (current − entry) / entry × side, so a bear-
  // direction signal going DOWN reads as a profit. The card surface
  // is direction-agnostic visually now; the P/L number is the only
  // place a winning vs losing signal shows up in color (universal
  // green-good / red-bad, not a "long/short" semantic).
  const status = card.status ?? "open";
  const entryPrice = card.entryPrice ?? card.price;
  const livePrice = useLivePrice(entryPrice, card.sentiment, status === "open");
  const currentPrice =
    status === "open" ? livePrice : (card.closedPrice ?? entryPrice);
  const side = card.sentiment === "bear" ? -1 : 1;
  const pnlPct = ((currentPrice - entryPrice) / entryPrice) * 100 * side;

  // Author's total signal count this session — pulled from the
  // signals context so the badge updates as the auto-fire generator
  // or the user themselves posts more. Falls back to 1 if context
  // isn't ready (mounting frame).
  const authorSignalCount = useMemo(() => {
    let n = 0;
    for (const e of events) {
      if (e.card.author.id === card.author.id) n++;
    }
    return Math.max(1, n);
  }, [events, card.author.id]);

  // Ticker tap → set active market so the chart panel + market
  // header re-anchor on this asset. Matches by symbol against the
  // mocks registry; falls back to no-op if the ticker isn't tradable.
  const onTickerTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const m = MARKETS.find((mk) => mk.symbol === card.ticker);
    if (m) setActiveMarket(m);
  };

  return (
    <article
      onClick={onSelect}
      className={cn(
        "group/card relative flex h-[148px] cursor-pointer flex-col overflow-hidden rounded-xl bg-card backdrop-blur-md p-3.5 transition-transform duration-150 ease-out hover:-translate-y-px",
        className,
      )}
    >
      {/* Soft corner glow — single signal-amber tone for every card.
          One unified visual identity; direction is no longer encoded
          on the surface, only in the P/L sign. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-signal blur-2xl opacity-[0.32]"
      />

      {/* Header — ticker + live P/L + close. Ticker is its own
          tap target: opens the chart panel for this asset. */}
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onTickerTap}
            aria-label={`Open ${card.ticker} chart`}
            className="-ml-0.5 inline-flex shrink-0 items-center gap-2 rounded-md px-0.5 py-px transition-[background-color,scale] duration-150 ease-out hover:bg-surface-2 active:scale-[0.97]"
          >
            <TokenLogo
              symbol={card.ticker}
              char={card.iconChar}
              bg={card.iconBg}
              fg={card.iconFg ?? "#fff"}
              size={22}
              kind={card.kind}
            />
            <span className="truncate text-body font-semibold tracking-wide text-foreground">
              {card.ticker}
            </span>
          </button>
          <span
            className={cn(
              "shrink-0 text-caption font-semibold tabular-nums leading-none",
              pnlPct >= 0 ? "text-primary" : "text-tone-down",
            )}
            aria-label={`${pnlPct >= 0 ? "Up" : "Down"} ${Math.abs(pnlPct).toFixed(2)} percent since posted`}
          >
            {pnlPct >= 0 ? "+" : ""}
            {pnlPct.toFixed(2)}%
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            aria-label={`Dismiss ${card.ticker} card`}
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="-mr-1 inline-flex size-5 items-center justify-center rounded-full text-muted-foreground/70 transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-4 hover:text-foreground active:scale-[0.96]"
          >
            <X strokeWidth={2} className="size-3" aria-hidden />
          </button>
        )}
      </div>

      {/* THESIS — the headline. Limited to two lines so the deck stays
          uniform; the full text lives in the sheet on tap. */}
      <p className="relative mt-2 line-clamp-2 text-body font-medium leading-snug text-foreground text-pretty">
        {card.thesis}
      </p>

      {/* Footer — source attribution (+ author signal count) and the
          actionable Pile-In side. */}
      <div className="relative mt-auto flex items-center justify-between gap-2">
        <SourceLine
          card={card}
          ago={ago}
          authorSignalCount={authorSignalCount}
          onOpenAuthor={(id) => openAuthor(id)}
        />
        <PileInButton
          ticker={card.ticker}
          count={pileInCount}
          joined={pileIned}
          capped={wouldBreachCap}
          onClick={pileIn}
        />
      </div>
    </article>
  );
}

/**
 * Small live-tick simulator. Drifts ±~0.3% per TICK_MS biased toward
 * the signal's direction so an open signal feels alive and the P/L
 * number moves. Stops ticking when `active` is false (closed signals
 * use their static closedPrice instead).
 */
const TICK_MS = 2500;
function useLivePrice(
  entry: number,
  sentiment: TradingCardData["sentiment"],
  active: boolean,
): number {
  const [price, setPrice] = useState(entry);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      const bias =
        sentiment === "bull" ? 0.06 : sentiment === "bear" ? -0.06 : 0;
      const drift = (Math.random() - 0.5 + bias) * 0.006;
      setPrice((p) => p * (1 + drift));
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [active, sentiment]);
  // Reset when the entry changes (e.g., user opens a different card).
  useEffect(() => {
    setPrice(entry);
  }, [entry]);
  return price;
}

/* ------------------------------------------------------------------------ */
/*  Helpers                                                                  */
/* ------------------------------------------------------------------------ */

/**
 * One-line source attribution. Three shapes:
 *
 *   chat (or undefined)  →  @author · #channel? · 12m
 *   news                 →  📰 Bloomberg · 12m
 *   agent                →  ✨ agentName · 12m
 *
 * The kind-icon does the heavy lifting visually so the user reads the
 * provenance at a glance without parsing the label text.
 */
function SourceLine({
  card,
  ago,
  authorSignalCount,
  onOpenAuthor,
}: {
  card: TradingCardData;
  ago: string;
  /** Total signals this author has published this session — drives
   *  the small reputation pill next to chat-sourced cards. */
  authorSignalCount: number;
  /** Tap handler for chat/agent attribution — opens AuthorSheet. */
  onOpenAuthor: (authorId: string) => void;
}) {
  const source = card.source;
  if (source?.kind === "news") {
    // News attribution is non-clickable — there's no author surface
    // to open, just the outlet.
    return (
      <span className="inline-flex min-w-0 items-center gap-1 truncate text-micro text-muted-foreground">
        <Newspaper
          strokeWidth={2}
          className="size-3 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="truncate text-muted-foreground">{source.outlet}</span>
        <span className="shrink-0">· {ago}</span>
      </span>
    );
  }
  if (source?.kind === "agent") {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenAuthor(card.author.id);
        }}
        className="inline-flex min-w-0 items-center gap-1 truncate text-micro text-muted-foreground transition-colors hover:text-foreground"
      >
        <Sparkles
          strokeWidth={2}
          className="size-3 shrink-0 text-primary"
          aria-hidden
        />
        <span className="truncate text-muted-foreground">
          {source.agentName ?? card.author.name}
        </span>
        <span className="shrink-0">· {ago}</span>
      </button>
    );
  }
  // Default = chat-sourced (author IS the source). Tap → AuthorSheet.
  const channel = source?.kind === "chat" ? source.channel : undefined;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpenAuthor(card.author.id);
      }}
      className="inline-flex min-w-0 items-center gap-1 truncate text-micro text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="truncate text-muted-foreground group-hover/sourceline:underline">
        @{card.author.name}
      </span>
      <span
        aria-label={`${authorSignalCount} signal${authorSignalCount === 1 ? "" : "s"} from this author`}
        className="shrink-0 rounded-full bg-surface-2 px-1.5 py-px text-[9px] tabular-nums text-muted-foreground"
      >
        {authorSignalCount}
      </span>
      {channel && <span className="shrink-0">· #{channel}</span>}
      <span className="shrink-0">· {ago}</span>
    </button>
  );
}

// Sentiment-keyed visual tones are intentionally NOT used by the
// card anymore. The card surface is direction-agnostic — every
// signal reads as a single mint-tinted card. Sentiment still lives
// on the data type because it influences sparkline direction and
// the P/L sign math (long winning = price up, short winning = price
// down). If we ever want directional cards again, the tone table
// below is the place to start. The leading underscore on the name
// tells the linter the unused-vars rule doesn't apply.
const _SENTIMENT_TONES_RETIRED = {
  bull: {
    arrow: ArrowUp,
    ring: "ring-primary/30",
    glowColor: "var(--primary)",
    pile: "bg-primary/15 text-primary hover:bg-primary/25",
    pileFilled: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/30",
    sideLabel: "Long" as const,
  },
  bear: {
    arrow: ArrowDown,
    ring: "ring-tone-down/30",
    glowColor: "var(--tone-down)",
    pile: "bg-tone-down/15 text-tone-down hover:bg-tone-down/25",
    pileFilled:
      "bg-tone-down/10 text-tone-down ring-1 ring-inset ring-tone-down/30",
    sideLabel: "Short" as const,
  },
  neutral: {
    arrow: ArrowUp,
    ring: "ring-white/[0.06]",
    glowColor: "transparent",
    pile: "bg-surface-3 text-foreground hover:bg-surface-4",
    pileFilled: "bg-surface-1 text-foreground ring-1 ring-inset ring-white/[0.10]",
    sideLabel: "Watch" as const,
  },
} satisfies Record<
  "bull" | "bear" | "neutral",
  {
    arrow: typeof ArrowUp;
    ring: string;
    glowColor: string;
    pile: string;
    pileFilled: string;
    sideLabel: string;
  }
>;

function PileInButton({
  ticker,
  count,
  joined,
  capped,
  onClick,
}: {
  ticker: string;
  count: number;
  joined: boolean;
  /** True when the next fill would breach DAILY_R_CAP. Button reads
   *  "Cap" + disabled, with a muted tone so it doesn't shout. */
  capped: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={joined || capped}
      aria-label={
        joined
          ? `Filled ${ticker} · ${PILE_IN_SIZE_R}`
          : capped
            ? `Daily risk cap reached on ${ticker}`
            : `Pile in on ${ticker} · ${PILE_IN_SIZE_R} · ${count} already in`
      }
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-caption font-semibold transition-[background-color,scale] duration-150 ease-out active:scale-[0.96] disabled:cursor-default",
        joined
          ? "bg-signal/10 text-signal ring-1 ring-inset ring-signal/30"
          : capped
            ? "bg-surface-1 text-muted-foreground"
            : "bg-signal/15 text-signal hover:bg-signal/25",
      )}
    >
      {joined ? (
        <>
          <Check strokeWidth={2} className="size-3" aria-hidden />
          <span>In</span>
          <span className="tabular-nums text-current/70">
            · {PILE_IN_SIZE_R}
          </span>
        </>
      ) : capped ? (
        <>
          <span>Cap reached</span>
        </>
      ) : (
        <>
          <TrendingUp strokeWidth={2} className="size-3" aria-hidden />
          <span>Pile in</span>
          <span className="tabular-nums text-current/70">· {count}</span>
        </>
      )}
    </button>
  );
}
