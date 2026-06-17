"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Canonical underline tab. New code should use this; the existing
 * 6 inline TabButton / PanelTab variants stay for now to avoid
 * subtle visual regressions during migration.
 *
 * Variants supported via composition:
 *   - Plain label                  →  <Tab>News</Tab>
 *   - Label + count chip           →  <Tab count={3}>News</Tab>
 *   - Label + leading icon         →  <Tab icon={Newspaper}>News</Tab>
 *   - WAI-ARIA tablist member      →  <Tab role="tab" controls="…">…</Tab>
 *   - Demo-runner target           →  <Tab demoId="news-tab">…</Tab>
 *
 * Active style is a 1px foreground line at the bottom inset-x-2 —
 * matches the look used by ChatPanel / PortfolioSheet / OrderBook
 * already. Pill-style tone variants (TopMoversPanel gainers/losers)
 * are a different pattern — those are filter chips, not tabs.
 */
export function Tab({
  active,
  onClick,
  children,
  count,
  icon: Icon,
  controls,
  demoId,
  className,
  ariaRole = "tab",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  icon?: LucideIcon;
  controls?: string;
  demoId?: string;
  className?: string;
  /** Most uses are real tab semantics (role=tab + aria-selected).
   *  A few callers want plain button-pressed semantics. */
  ariaRole?: "tab" | "button";
}) {
  const isTab = ariaRole === "tab";
  return (
    <button
      type="button"
      role={isTab ? "tab" : undefined}
      aria-selected={isTab ? active : undefined}
      aria-pressed={!isTab ? active : undefined}
      aria-controls={controls}
      data-demo={demoId}
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center gap-1.5 px-3 py-2.5 text-body font-medium transition-[color,scale] duration-150 ease-out active:scale-[0.96] focus-visible:bg-white/[0.04] focus-visible:outline-none",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {Icon && <Icon strokeWidth={1.75} className="size-3.5" aria-hidden />}
      <span>{children}</span>
      {count !== undefined && (
        <span className="tabular-nums text-muted-foreground">{count}</span>
      )}
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2 bottom-0 h-px bg-foreground"
        />
      )}
    </button>
  );
}
