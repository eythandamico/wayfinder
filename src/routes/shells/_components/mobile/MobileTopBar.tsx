"use client";

import { useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  CandlestickChart,
  Compass,
  Menu,
  Repeat,
  Users,
} from "lucide-react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { WALLET_ADDRESS } from "../../_data/mocks";
import {
  useCommandBar,
  useDepositModal,
  useFriendsSheet,
  usePortfolioSheet,
  useViewMode,
  type ViewMode,
} from "../../_state/shells-context";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { useActivity } from "../../_state/activity-context";
import { MOCK_ACCOUNT } from "../PortfolioPanel";
import { SearchIcon } from "../icons";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

const USD_COMPACT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * Top bar for the mobile shell v2.
 *
 *   [☰] [Trade ▾] · · · [👥] [🔔] [Earn $5] [$26K] [avatar]
 *
 * - Hamburger opens MobileMenuSheet
 * - View-mode pill switches Trade / Paths / Loops via useViewMode
 * - Friends + Activity get promoted to top-bar quick-access (no
 *   buried-in-drawer trap)
 * - Earn $5 hides post-first-deposit
 * - Portfolio chip is the compact $26K format; click opens
 *   portfolio sheet (same target as the wallet avatar)
 */
export function MobileTopBar({
  onOpenMenu,
}: {
  onOpenMenu: () => void;
}) {
  return (
    <header
      className="flex shrink-0 items-center gap-1 px-3"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
        paddingBottom: "0.5rem",
      }}
    >
      <HamburgerButton onClick={onOpenMenu} />
      <ViewModePill />

      <div className="flex flex-1 items-center justify-end gap-1">
        <FriendsButton />
        <ActivityButton />
        <SearchButton />
        <EarnFiveChipMobile />
        <PortfolioTotalChipMobile />
        <WalletAvatar address={WALLET_ADDRESS} />
      </div>
    </header>
  );
}

function HamburgerButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Open menu"
      onClick={onClick}
      className="flex size-9 shrink-0 items-center justify-center rounded-md text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-2 active:scale-[0.96]"
    >
      <Menu strokeWidth={1.75} className="size-5" aria-hidden />
    </button>
  );
}

/** View-mode pill — replaces the desktop LeftRail's Trade / Paths /
 *  Loops switcher. Tap opens a small dropdown of mode options;
 *  selecting one calls setViewMode. Compact label so the bar stays
 *  scan-friendly. */
const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  trading: "Trade",
  explore: "Paths",
  loops: "Loops",
  settings: "Settings",
};

const VIEW_MODE_ICONS = {
  trading: CandlestickChart,
  explore: Compass,
  loops: Repeat,
};

function ViewModePill() {
  const { viewMode, setViewMode } = useViewMode();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useClickOutside(wrapRef, () => setOpen(false), open);

  // Settings mode shouldn't be reachable from this pill — that's
  // the drawer's job. Restrict the pill to workspace modes.
  const workspaceMode = viewMode === "settings" ? "trading" : viewMode;
  const label = VIEW_MODE_LABELS[workspaceMode];

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch view mode"
        aria-expanded={open}
        className="inline-flex h-9 shrink-0 items-center gap-1 rounded-md px-2 text-body font-medium text-foreground transition-[background-color] duration-150 ease-out hover:bg-surface-2"
      >
        {label}
        <ChevronDown
          strokeWidth={1.75}
          className="size-3.5 text-muted-foreground"
          aria-hidden
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-40 mt-1 w-36 overflow-hidden rounded-lg bg-popover backdrop-blur-md p-1 shadow-2xl ring-1 ring-inset ring-white/10"
        >
          {(["trading", "explore", "loops"] as const).map((mode) => {
            const Icon = VIEW_MODE_ICONS[mode];
            const active = mode === workspaceMode;
            return (
              <button
                key={mode}
                type="button"
                role="menuitem"
                onClick={() => {
                  setViewMode(mode);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-body transition-colors",
                  active
                    ? "bg-surface-3 text-foreground"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <Icon
                  strokeWidth={1.75}
                  className="size-4 shrink-0"
                  aria-hidden
                />
                {VIEW_MODE_LABELS[mode]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FriendsButton() {
  const { open, toggleFriends } = useFriendsSheet();
  return (
    <button
      type="button"
      onClick={toggleFriends}
      aria-label={open ? "Close friends" : "Open friends"}
      aria-expanded={open}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md transition-[background-color,color] duration-150 ease-out",
        open
          ? "bg-surface-3 text-foreground"
          : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <Users strokeWidth={1.75} className="size-5" aria-hidden />
    </button>
  );
}

function ActivityButton() {
  const { unreadCount } = useActivity();
  return (
    <button
      type="button"
      aria-label={
        unreadCount > 0 ? `Activity, ${unreadCount} unread` : "Activity"
      }
      className="relative flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-surface-2 hover:text-foreground"
    >
      <Bell strokeWidth={1.75} className="size-5" aria-hidden />
      {unreadCount > 0 && (
        <span
          aria-hidden
          className="absolute right-2 top-2 size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]"
        />
      )}
    </button>
  );
}

function SearchButton() {
  const { openCommand } = useCommandBar();
  return (
    <button
      type="button"
      aria-label="Search tokens and paths"
      onClick={openCommand}
      data-demo="command-trigger"
      className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-2 hover:text-foreground active:scale-[0.96]"
    >
      <SearchIcon />
    </button>
  );
}

function EarnFiveChipMobile() {
  const { hasDeposited, openDeposit } = useDepositModal();
  if (hasDeposited) return null;
  return (
    <button
      type="button"
      onClick={openDeposit}
      aria-label="Earn $5 in agent credit"
      className="inline-flex h-8 shrink-0 items-center rounded-md bg-primary/15 px-2 text-caption font-semibold text-primary transition-colors duration-150 ease-out hover:bg-primary/20 active:scale-[0.96]"
    >
      Earn $5
    </button>
  );
}

function PortfolioTotalChipMobile() {
  const { togglePortfolio } = usePortfolioSheet();
  return (
    <button
      type="button"
      onClick={togglePortfolio}
      aria-label={`Portfolio total ${USD_COMPACT.format(MOCK_ACCOUNT.balance)}. Open portfolio.`}
      className="inline-flex h-8 shrink-0 items-center rounded-md px-2 text-body font-semibold tabular-nums text-foreground transition-[background-color] duration-150 ease-out hover:bg-surface-2"
    >
      {USD_COMPACT.format(MOCK_ACCOUNT.balance)}
    </button>
  );
}

function WalletAvatar({ address }: { address: string }) {
  const { open, togglePortfolio } = usePortfolioSheet();
  const short = shortAddress(address);
  return (
    <button
      type="button"
      aria-label={`Wallet: ${short}. Open portfolio.`}
      aria-expanded={open}
      title={short}
      onClick={togglePortfolio}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full transition-[background-color,scale] duration-150 ease-out active:scale-[0.96]",
        open ? "ring-2 ring-primary/30" : "hover:opacity-80",
      )}
    >
      <Jazzicon diameter={32} seed={jsNumberForAddress(address)} />
    </button>
  );
}

