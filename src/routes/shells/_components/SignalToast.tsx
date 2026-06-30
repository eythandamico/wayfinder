"use client";

import { useEffect, useState } from "react";
import Jazzicon from "react-jazzicon";
import { cn } from "@/lib/utils";
import { type SignalEvent, useSignalEvents } from "../_state/signals-context";
import { askAgent } from "../_lib/ask-agent";

/** Author ids in TradingCardAuthor are arbitrary strings (e.g.
 *  "kalos"), not hex addresses — so we can't feed them to
 *  jsNumberForAddress. This little hash matches the fallback used by
 *  ContactAvatar / the notifications menu so the same author renders
 *  the same jazzicon in every surface. */
function jazziconSeedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h * 31 + s.charCodeAt(i)) | 0) >>> 0;
  }
  return h;
}

/** Visible duration. Toasts auto-dismiss after this much elapsed. */
const TOAST_DURATION = 4500;
/** Max simultaneous toasts on screen. Newest renders on top of the
 *  stack, older ones below. */
const STACK_LIMIT = 3;

/**
 * Right-side stack of mini-cards that pops in when an idea fires.
 *
 * Mounted once at the page root. Subscribes to notify-flagged events
 * via the ideas context; each event becomes a toast that lives for
 * TOAST_DURATION then unmounts. Click → opens the full card sheet.
 *
 * The aurora-color flash + the chime fire on the same event, so the
 * toast lands inside the dopamine cascade rather than being a separate
 * channel — they all read as one moment.
 */
export function SignalToast() {
  const [stack, setStack] = useState<SignalEvent[]>([]);

  useSignalEvents((event) => {
    setStack((prev) => [event, ...prev].slice(0, STACK_LIMIT));
  });

  // Per-event lifetime: removing toasts by id keeps the stack stable
  // as new ones arrive (no shifting indices, no key collisions).
  useEffect(() => {
    if (stack.length === 0) return;
    const timers = stack.map((e) =>
      window.setTimeout(() => {
        setStack((prev) => prev.filter((x) => x.id !== e.id));
      }, TOAST_DURATION),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [stack]);

  return (
    <div
      aria-live="polite"
      aria-label="Trading idea notifications"
      className={cn(
        "pointer-events-none fixed z-50 flex gap-2",
        // Mobile: top-pinned full-width banner stack, newest on top.
        "inset-x-0 flex-col px-3 [top:calc(env(safe-area-inset-top)+0.75rem)]",
        // Desktop (md+): floating chip stack at bottom-left, newest
        // pops in at the bottom of the stack so the most recent toast
        // is the closest to the user's eye.
        "md:inset-x-auto md:bottom-6 md:left-6 md:top-auto md:flex-col-reverse md:px-0",
      )}
    >
      {stack.map((event) => (
        <ToastCard
          key={event.id}
          event={event}
          onOpen={() => {
            // Pivot the desk → ChatPanel.askAgent listener handles
            // the market switch + writes the user-side question +
            // streams the agent reply. No card sheet, no extra
            // window — the existing desk is the answer surface.
            askAgent({ kind: "signal", card: event.card });
            setStack((prev) => prev.filter((x) => x.id !== event.id));
          }}
          onDismiss={() =>
            setStack((prev) => prev.filter((x) => x.id !== event.id))
          }
        />
      ))}
    </div>
  );
}

function ToastCard({
  event,
  onOpen,
  onDismiss,
}: {
  event: SignalEvent;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const card = event.card;

  return (
    <span
      className={cn(
        // Mobile: slide down from the top as a full-width banner.
        // Desktop: slide in from the left as a floating chip (inline-
        // block so the dark radial halo can size against the chip,
        // not stretch full-width).
        "pointer-events-none animate-in fade-in ease-[var(--ease-strong)]",
        "block slide-in-from-top-4",
        "md:relative md:inline-block md:zoom-in-95 md:slide-in-from-top-0 md:slide-in-from-left-4",
      )}
      style={{ animationDuration: "300ms" }}
    >
      {/* Desktop-only dark radial halo behind the chip — softens
          whatever sits underneath so the toast pops off the page
          without needing a colored brand glow. The full-width
          mobile banner doesn't need it (and a giant radial behind
          a wide rect would look weird), so it's md:block only. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-8 -z-10 hidden rounded-[28px] md:block"
        style={{
          background:
            "radial-gradient(ellipse 60% 70% at 50% 50%, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.1) 70%, transparent 90%)",
        }}
      />
      <button
        type="button"
        onClick={onOpen}
        onAuxClick={onDismiss}
        aria-label={`Open ${card.author.name} signal on ${card.ticker}`}
        className={cn(
          // Clean dropdown surface — same DNA as the activity dropdown
          // and chat history menus: bg-popover + backdrop blur + inset
          // white ring + a single dark drop shadow.
          "pointer-events-auto group relative block w-full overflow-hidden rounded-lg bg-popover text-left backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-[0_16px_36px_-12px_rgba(0,0,0,0.6),0_4px_12px_-4px_rgba(0,0,0,0.4)] transition-[box-shadow,transform] duration-150 ease-out hover:ring-white/15",
          // Desktop chip-sized (340px) + hover lift; mobile is full
          // width (w-full above), no lift.
          "md:w-[340px] md:hover:-translate-y-px",
        )}
      >
      {/* Same anatomy as a NotificationRow — avatar + title row +
          body — just sized for a floating card. Keeps the inbox and
          the live arrival visually unified. */}
      <div className="flex items-start gap-3 px-3 py-2.5">
        <span
          aria-hidden
          className="relative mt-0.5 size-7 shrink-0 overflow-hidden rounded-full"
        >
          <Jazzicon
            diameter={28}
            seed={jazziconSeedFromString(card.author.id)}
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
          <div className="flex items-center gap-2">
            <span className="truncate text-body font-semibold text-foreground">
              {card.author.name} on {card.ticker}
            </span>
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full bg-primary"
            />
            <span className="ml-auto text-micro uppercase tracking-[0.12em] text-muted-foreground/70">
              now
            </span>
          </div>
          <p className="line-clamp-2 text-caption text-pretty text-muted-foreground">
            {card.thesis}
          </p>
        </div>
      </div>
      </button>
    </span>
  );
}
