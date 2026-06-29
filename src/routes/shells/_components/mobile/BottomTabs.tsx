"use client";

import {
  Home,
  LayoutGrid,
  LineChart,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ShellTab = "home" | "friends" | "trade" | "portfolio" | "more";

/**
 * Four-tab bottom nav. Friends / Trade / Portfolio are the real
 * destinations the user goes between; More is the overflow page
 * for secondary destinations (Settings, Deposit, Pricing, Help)
 * — it replaces the v2 hamburger entirely.
 *
 * The agent is NOT a tab here — it's a floating composer pinned
 * above this bar that summons a chat takeover sheet from any tab.
 *
 * Active state uses neutral surface-3 fill (same vocabulary as
 * LeftRail's RailButton on desktop). No mint-tints, no rings.
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
      className="absolute inset-x-0 bottom-0 z-30 flex items-stretch gap-1 px-2 pt-2"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.625rem)" }}
    >
      <TabButton
        active={active === "home"}
        onClick={() => onChange("home")}
        label="Home"
        icon={Home}
      />
      <TabButton
        active={active === "friends"}
        onClick={() => onChange("friends")}
        label="Friends"
        icon={Users}
      />
      <TabButton
        active={active === "trade"}
        onClick={() => onChange("trade")}
        label="Trade"
        icon={LineChart}
      />
      <TabButton
        active={active === "portfolio"}
        onClick={() => onChange("portfolio")}
        label="Portfolio"
        icon={Wallet}
      />
      <TabButton
        active={active === "more"}
        onClick={() => onChange("more")}
        label="More"
        icon={LayoutGrid}
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
  icon: LucideIcon;
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
