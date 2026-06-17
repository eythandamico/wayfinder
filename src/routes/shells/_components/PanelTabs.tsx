"use client";

import { cn } from "@/lib/utils";

/**
 * Shared tab strip for panels — matches the Agent / Paths / Jobs bar
 * in ChatPanel. Active tab uses foreground text + a 1px underline;
 * inactive tabs fade to muted with a hover-restore. One bar pattern
 * across every panel keeps the shell coherent.
 */
export function PanelTabBar({
  ariaLabel,
  actions,
  children,
}: {
  ariaLabel: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-stretch border-b border-white/[0.05]">
      <div role="tablist" aria-label={ariaLabel} className="flex px-2">
        {children}
      </div>
      {actions && (
        <div className="ml-auto flex shrink-0 items-center gap-1 px-2">
          {actions}
        </div>
      )}
    </div>
  );
}

export function PanelTab({
  active,
  onClick,
  label,
  count,
  controls,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  controls?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={cn(
        "relative px-4 py-3 text-body font-medium transition-[color,scale] duration-150 ease-out active:scale-[0.96]",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {count !== undefined && (
        <span className="ml-1.5 tabular-nums text-muted-foreground">
          {count}
        </span>
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
