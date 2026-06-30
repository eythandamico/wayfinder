"use client";

import {
  Briefcase,
  CandlestickChart,
  Compass,
  HelpCircle,
  Repeat,
  Settings as SettingsIcon,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HELP_EVENT } from "../_hooks/useShellsKeyboard";
import { useViewMode } from "../_state/shells-context";
import { DEVTOOLS_TOGGLE_EVENT, useDevToolsAllowed } from "./DevTools";

/** Width of the persistent left rail. Mirrors the right rail so the
 *  shell reads symmetric. Used by page.tsx to offset the panel grid
 *  and by FriendsSheet to anchor itself to the rail's inner edge. */
export const LEFT_RAIL_WIDTH = 56;

/**
 * Persistent vertical navigation rail that sits BELOW the top bar
 * along the left edge of the content area. Holds top-level
 * navigation (Trade / Paths view modes, the Friends sheet toggle)
 * above a stretch spacer, then utility affordances (Settings,
 * Shortcuts) at the bottom.
 *
 * The rail is a flex child of `main` — it doesn't use fixed
 * positioning. Side sheets (FriendsSheet) slide out FROM its inner
 * edge using viewport-relative anchors.
 *
 * Settings opens the PortfolioSheet pre-routed to its Settings view
 * via a one-shot intent flag in shells-context.
 */
export function LeftRail() {
  return (
    <div
      role="navigation"
      aria-label="Primary"
      className="relative z-40 flex shrink-0 flex-col items-center gap-1 bg-background py-2"
      style={{ width: LEFT_RAIL_WIDTH }}
    >
      {/* Top group — primary navigation. Friends toggle lives in the
       *  top bar; no duplicate rail button. */}
      <ViewModeRailButton mode="trading" icon={CandlestickChart} label="Trade" />
      <ViewModeRailButton mode="explore" icon={Compass} label="Paths" />
      <ViewModeRailButton mode="loops" icon={Repeat} label="Loops" />
      <ViewModeRailButton mode="jobs" icon={Briefcase} label="Jobs" />

      {/* Spacer pushes the utility group to the bottom of the rail. */}
      <div className="flex-1" aria-hidden />

      {/* Bottom group — utilities. Dev sits above Settings (dev-only;
       *  see useDevToolsAllowed for the prod gate). */}
      <DevToolsRailButton />
      <SettingsRailButton />
      <HelpRailButton />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rail items                                                         */
/* ------------------------------------------------------------------ */

function ViewModeRailButton({
  mode,
  icon: Icon,
  label,
}: {
  mode: "trading" | "explore" | "loops" | "jobs" | "settings";
  icon: LucideIcon;
  label: string;
}) {
  const { viewMode, setViewMode } = useViewMode();
  const active = viewMode === mode;
  return (
    <RailButton
      icon={Icon}
      label={label}
      active={active}
      onClick={() => setViewMode(mode)}
    />
  );
}

function DevToolsRailButton() {
  // Gated by the same allowed check as the floating <DevTools /> FAB —
  // hidden in production builds that don't carry ?dev=1.
  const allowed = useDevToolsAllowed();
  if (!allowed) return null;
  return (
    <RailButton
      icon={Wrench}
      label="Dev options"
      onClick={() => {
        window.dispatchEvent(new CustomEvent(DEVTOOLS_TOGGLE_EVENT));
      }}
    />
  );
}

function SettingsRailButton() {
  return (
    <ViewModeRailButton
      mode="settings"
      icon={SettingsIcon}
      label="Settings"
    />
  );
}

function HelpRailButton() {
  return (
    <RailButton
      icon={HelpCircle}
      label="Keyboard shortcuts"
      onClick={() => {
        window.dispatchEvent(new CustomEvent(HELP_EVENT));
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Bits                                                               */
/* ------------------------------------------------------------------ */

/**
 * Generic rail button — square icon target with active fill, hover
 * tint, and an accessible label that doubles as a native tooltip
 * (browser-rendered title attribute). Keeping the title attribute
 * rather than building a custom tooltip primitive — the rail is
 * dense, the icons are familiar (lucide), and a native tooltip
 * keeps the layer count low.
 */
export function RailButton({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
  /** Optional dot indicator at the top-right of the icon — used for
   *  the unread-activity ping and the coming-soon Signals tag. */
  badge?: "primary" | "muted";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center rounded-md transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        active
          ? "bg-surface-3 text-foreground"
          : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <Icon strokeWidth={1.75} className="size-[18px]" aria-hidden />
      {badge && (
        <span
          aria-hidden
          className={cn(
            "absolute right-2 top-2 size-1.5 rounded-full",
            badge === "primary" &&
              "bg-primary shadow-[0_0_6px_var(--primary)]",
            badge === "muted" && "bg-muted-foreground/70",
          )}
        />
      )}
    </button>
  );
}
