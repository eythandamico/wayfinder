"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, MessageCircle, Repeat, UserPlus, X } from "lucide-react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { cn } from "@/lib/utils";
import { CONTACTS } from "../_data/contacts";
import {
  SAMPLE_TRADING_CARDS,
  type TradingCard as TradingCardData,
} from "../_data/trading-cards";
import { ContactAvatar } from "./ContactAvatar";
import { TradingCard } from "./TradingCard";
import { TradingCardSheet } from "./TradingCardSheet";
import {
  DAILY_R_CAP,
  useSignals,
} from "../_state/signals-context";

/**
 * Author profile sheet — opens when a user taps `@author` on a
 * signal card. Shows the author's identity, follow toggle, signal
 * count, and their recent signals. Mounted once at the page root;
 * driven by `openAuthorId` in signals-context.
 *
 * Modal pattern (centered overlay + backdrop, escape to close)
 * rather than a side-sheet, since this is a brief drill-in from any
 * surface in the app — chat threads, the Activity feed, toasts. Stays
 * lightweight; the full "trader profile" page with win-rate, P/L
 * history, and copy-trade controls is a Phase 3 surface.
 */
export function AuthorSheet() {
  const {
    openAuthorId,
    closeAuthor,
    events,
    isFollowing,
    toggleFollow,
    isAutoMirroring,
    toggleAutoMirror,
    todaysExposureR,
  } = useSignals();
  const [openCard, setOpenCard] = useState<TradingCardData | null>(null);

  // Mount/visibility two-phase so opacity + transform animate on
  // both enter AND exit.
  const [rendered, setRendered] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (openAuthorId) {
      setRendered(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const id = window.setTimeout(() => setRendered(false), 200);
    return () => window.clearTimeout(id);
  }, [openAuthorId]);

  // Escape closes.
  useEffect(() => {
    if (!openAuthorId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAuthor();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openAuthorId, closeAuthor]);

  // Build the author's signal list: live events + seed sample cards.
  // Dedupe by id. Sorted newest first.
  const { authorName, signals, signalCount } = useMemo(() => {
    if (!openAuthorId)
      return { authorName: "", signals: [], signalCount: 0 } as const;
    const liveByAuthor = events
      .filter((e) => e.card.author.id === openAuthorId)
      .map((e) => e.card);
    const seedByAuthor = SAMPLE_TRADING_CARDS.filter(
      (c) => c.author.id === openAuthorId,
    );
    const seen = new Set<string>();
    const all: TradingCardData[] = [];
    for (const c of [...liveByAuthor, ...seedByAuthor]) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      all.push(c);
    }
    all.sort((a, b) => b.createdAt - a.createdAt);
    const name =
      all[0]?.author.name ??
      CONTACTS.find((c) => c.id === openAuthorId)?.name ??
      openAuthorId;
    return {
      authorName: name,
      signals: all,
      signalCount: all.length,
    } as const;
  }, [openAuthorId, events]);

  if (!rendered || typeof document === "undefined" || !openAuthorId) return null;

  const following = isFollowing(openAuthorId);
  const mirroring = isAutoMirroring(openAuthorId);
  const contact = CONTACTS.find((c) => c.id === openAuthorId);
  const exposurePct = Math.min(100, (todaysExposureR / DAILY_R_CAP) * 100);

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={closeAuthor}
        className={cn(
          "fixed inset-0 z-[60] bg-background/70 backdrop-blur-[3px] transition-opacity duration-200 ease-out",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${authorName} profile`}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "fixed left-1/2 top-1/2 z-[70] flex max-h-[80vh] w-[min(92vw,480px)] -translate-x-1/2 -translate-y-1/2 origin-center flex-col overflow-hidden rounded-2xl bg-card backdrop-blur-md ring-1 ring-inset ring-white/[0.06] shadow-2xl transition-[opacity,transform] duration-200 ease-[var(--ease-strong)]",
          visible
            ? "opacity-100 scale-100"
            : "pointer-events-none opacity-0 scale-[0.97]",
        )}
      >
        {/* Header — avatar, name, signal-count chip, close */}
        <div className="relative shrink-0 border-b border-white/[0.05] px-5 pb-4 pt-5">
          <button
            type="button"
            aria-label="Close author profile"
            onClick={closeAuthor}
            className="absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-2 hover:text-foreground active:scale-[0.96]"
          >
            <X strokeWidth={2} className="size-4" aria-hidden />
          </button>

          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center overflow-hidden rounded-full">
              {contact ? (
                <ContactAvatar contact={contact} size={48} />
              ) : (
                <Jazzicon
                  diameter={48}
                  seed={jsNumberForAddress(openAuthorId)}
                />
              )}
            </span>
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="text-micro uppercase tracking-[0.14em] text-muted-foreground">
                Signal author
              </span>
              <span className="truncate text-title font-semibold text-foreground">
                @{authorName}
              </span>
              <span className="mt-0.5 text-caption text-muted-foreground tabular-nums">
                {signalCount} signal{signalCount === 1 ? "" : "s"}
                {/* Win-rate placeholder — surface when closed-signal
                    tracking lands in Phase 3. */}
              </span>
            </div>
          </div>

          {/* Actions: Follow + DM */}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => toggleFollow(openAuthorId)}
              aria-pressed={following}
              className={cn(
                "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md text-body font-medium transition-[background-color,scale] duration-150 ease-out active:scale-[0.97]",
                following
                  ? "bg-signal/15 text-signal ring-1 ring-inset ring-signal/30 hover:bg-signal/20"
                  : "bg-surface-3 text-foreground hover:bg-surface-4",
              )}
            >
              {following ? (
                <>
                  <Check strokeWidth={2.25} className="size-4" aria-hidden />
                  Following
                </>
              ) : (
                <>
                  <UserPlus strokeWidth={2} className="size-4" aria-hidden />
                  Follow
                </>
              )}
            </button>
            {contact && (
              <button
                type="button"
                aria-label="Message"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-surface-2 px-3 text-body text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-4 active:scale-[0.97]"
              >
                <MessageCircle
                  strokeWidth={2}
                  className="size-4"
                  aria-hidden
                />
                Message
              </button>
            )}
          </div>

          {/* Auto-mirror row — only visible when following. Toggling
              on means every future signal from this author auto-
              records a pile-in (gated by the daily R cap). */}
          {following && (
            <button
              type="button"
              onClick={() => toggleAutoMirror(openAuthorId)}
              aria-pressed={mirroring}
              className={cn(
                "mt-2 flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-[background-color] duration-150 ease-out",
                mirroring
                  ? "bg-signal/10 ring-1 ring-inset ring-signal/25 hover:bg-signal/15"
                  : "bg-surface-1 hover:bg-surface-3",
              )}
            >
              <span className="flex items-center gap-2">
                <Repeat
                  strokeWidth={2}
                  className={cn(
                    "size-4 shrink-0",
                    mirroring ? "text-signal" : "text-muted-foreground",
                  )}
                  aria-hidden
                />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="text-body font-medium text-foreground">
                    Auto-pile-in
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {mirroring
                      ? `Mirroring · 0.5R per signal, ${DAILY_R_CAP}R/day cap`
                      : `Mirror future signals automatically · ${DAILY_R_CAP}R/day cap`}
                  </span>
                </span>
              </span>
              <span
                aria-hidden
                className={cn(
                  "relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 ease-out",
                  mirroring ? "bg-signal" : "bg-surface-4",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 size-4 rounded-full bg-foreground shadow transition-[left] duration-150 ease-out",
                    mirroring ? "left-[18px]" : "left-0.5",
                  )}
                />
              </span>
            </button>
          )}

          {/* Today's R bar — small persistent reminder of how close
              the user is to the daily cap. Visible whenever there's
              any exposure today. */}
          {todaysExposureR > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-caption text-muted-foreground">
                <span>Today&apos;s exposure</span>
                <span className="tabular-nums text-foreground">
                  {todaysExposureR.toFixed(1)}R / {DAILY_R_CAP}R
                </span>
              </div>
              <div className="relative mt-1 h-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-signal transition-[width] duration-500 ease-out"
                  style={{ width: `${exposurePct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Signal list */}
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {signals.length === 0 ? (
            <p className="px-2 py-8 text-center text-body text-muted-foreground">
              No signals from @{authorName} yet.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {signals.map((card) => (
                <TradingCard
                  key={card.id}
                  card={card}
                  onSelect={() => setOpenCard(card)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <TradingCardSheet
        card={openCard}
        onOpenChange={(open) => !open && setOpenCard(null)}
      />
    </>,
    document.body,
  );
}
