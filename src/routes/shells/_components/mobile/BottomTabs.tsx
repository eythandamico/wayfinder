"use client";

import { LineChart, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ShellTab = "agent" | "trade";

/**
 * Two-tab bottom nav: Agent and Trade. The shell's twin primaries.
 * Tab switching is instant (no swipe between, no shared transition)
 * — that's the whole point of the new architecture. Chart context
 * lives in ChartYoke above, shared by both tabs.
 *
 * Active state mirrors LeftRail's rail-button treatment (neutral
 * surface-3 fill, no mint-tint) so mobile and desktop chrome read
 * in the same active-state vocabulary.
 */
export function BottomTabs({
  active,
  onChange,
}: {
  active: ShellTab;
  onChange: (next: ShellTab) => void;
}) {
  return (
    <nav
      role="tablist"
      aria-label="Primary"
      className="flex shrink-0 items-stretch gap-1 border-t border-white/[0.05] bg-background px-2 pt-1"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.25rem)" }}
    >
      <TabButton
        active={active === "agent"}
        onClick={() => onChange("agent")}
        label="Agent"
        icon={MessageCircle}
      />
      <TabButton
        active={active === "trade"}
        onClick={() => onChange("trade")}
        label="Trade"
        icon={LineChart}
      />
    </nav>
  );
}

function TabButton({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: typeof MessageCircle;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-2 text-caption transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        active
          ? "bg-surface-3 text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon
        strokeWidth={active ? 2 : 1.75}
        className="size-5"
        aria-hidden
      />
      <span className="font-medium">{label}</span>
    </button>
  );
}
