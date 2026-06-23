"use client";

import { useRef, useState } from "react";
import { Bell, Radio, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { useActivity } from "../_state/activity-context";
import { useLayoutDispatch } from "../_layout/LayoutContext";
import { usePlan } from "../_state/plan-context";
import { ActivityRow } from "./ActivityRow";
import { ActivityFooterCta } from "./ActivityFooterCta";
import { RailButton } from "./LeftRail";

/** Width of the persistent right rail. Mirrors LEFT_RAIL_WIDTH so the
 *  shell reads symmetric. Used by page.tsx to offset the panel grid
 *  and by PortfolioSheet to anchor itself to the rail's inner edge. */
export const RIGHT_RAIL_WIDTH = 56;

/**
 * Persistent vertical rail that sits BELOW the top bar along the
 * right edge of the content area. Top group surfaces ambient account
 * state (notifications, signals); bottom group holds the
 * Plan/Pricing affordance.
 *
 * The wallet pill itself lives in the top bar — see WalletPill.tsx.
 *
 * Signals is intentionally inert today — the panel surface was
 * deleted, and the future replacement is a node-graph of signal
 * sources. The rail item carries the slot so the future build has
 * an obvious home; clicking shows a small "coming soon" popover.
 */
export function RightRail() {
  return (
    <div
      role="navigation"
      aria-label="Account"
      className="relative z-40 flex shrink-0 flex-col items-center gap-1 bg-background py-2"
      style={{ width: RIGHT_RAIL_WIDTH }}
    >
      <RailActivityButton />
      <RailSignalsButton />

      <div className="flex-1" aria-hidden />

      <RailPlanButton />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Activity / notifications — bell + leftward popover                 */
/* ------------------------------------------------------------------ */

function RailActivityButton() {
  const [open, setOpen] = useState(false);
  const { items, unreadCount, markAllRead } = useActivity();
  const layoutDispatch = useLayoutDispatch();
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const openActivityPanel = () => {
    if (!layoutDispatch) return;
    const id = `activity-${Date.now()}`;
    layoutDispatch({
      type: "addPanelIfMissing",
      panel: { id, type: "activity" },
    });
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <RailButton
        icon={Bell}
        label={
          unreadCount > 0 ? `Activity, ${unreadCount} unread` : "Activity"
        }
        active={open}
        onClick={() => setOpen((v) => !v)}
        badge={unreadCount > 0 ? "primary" : undefined}
      />

      {/* Popover opens to the LEFT of the rail (right-aligned to the
       *  rail's inner edge) so it stays inside the viewport. Same
       *  width + max-height as the old top-bar dropdown. */}
      <div
        role="menu"
        inert={!open}
        className={cn(
          "absolute right-full top-0 z-50 mr-2 flex max-h-[min(80vh,560px)] w-[380px] origin-top-right flex-col overflow-hidden rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-2xl transition-[opacity,transform] duration-150 ease-out",
          open
            ? "translate-x-0 scale-100 opacity-100"
            : "pointer-events-none translate-x-1 scale-[0.98] opacity-0",
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.05] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-body font-semibold text-foreground">
              Activity
            </span>
            {unreadCount > 0 && (
              <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary/15 px-1 text-micro font-semibold tabular-nums text-primary ring-1 ring-inset ring-primary/20">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {layoutDispatch && (
              <button
                type="button"
                onClick={openActivityPanel}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-caption text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground"
              >
                Open panel
              </button>
            )}
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-caption text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark all read
            </button>
          </div>
        </div>

        <div
          role="listbox"
          aria-label="Activity"
          className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto py-1"
        >
          {items.length === 0 ? (
            <div className="px-6 py-8 text-center text-body text-muted-foreground">
              You&rsquo;re all caught up.
            </div>
          ) : (
            items.map((it) => <ActivityRow key={it.id} item={it} />)
          )}
        </div>

        <ActivityFooterCta onPick={() => setOpen(false)} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Signals — coming-soon placeholder                                  */
/* ------------------------------------------------------------------ */

/**
 * The Signals surface is being rebuilt as a node-graph of signal
 * sources (per the project memo). For now the rail carries the slot
 * so when the new surface lands it has an obvious home; clicking
 * surfaces a tiny popover explaining the gap.
 */
function RailSignalsButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative shrink-0">
      <RailButton
        icon={Radio}
        label="Signals (coming soon)"
        active={open}
        onClick={() => setOpen((v) => !v)}
        badge="muted"
      />
      <div
        role="dialog"
        aria-label="Signals coming soon"
        inert={!open}
        className={cn(
          "absolute right-full top-0 z-50 mr-2 w-64 origin-top-right rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 px-3 py-3 shadow-2xl transition-[opacity,transform] duration-150 ease-out",
          open
            ? "translate-x-0 scale-100 opacity-100"
            : "pointer-events-none translate-x-1 scale-[0.98] opacity-0",
        )}
      >
        <div className="text-body font-semibold text-foreground">
          Signals — coming soon
        </div>
        <p className="mt-1 text-caption text-muted-foreground">
          A node-graph of your signal sources, replacing the old card
          stack. Sources, filters, and the alerts they fire all live on
          one canvas you can rewire.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Plan / Pricing                                                     */
/* ------------------------------------------------------------------ */

function RailPlanButton() {
  const { isPro, openPricing } = usePlan();
  const Icon: LucideIcon = Sparkles;
  return (
    <RailButton
      icon={Icon}
      label={isPro ? "Wayfinder Pro" : "Upgrade to Pro"}
      active={isPro}
      onClick={() => openPricing("manual")}
    />
  );
}
