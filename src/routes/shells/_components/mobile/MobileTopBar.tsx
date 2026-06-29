"use client";

import { Bell } from "lucide-react";
import {
  useCommandBar,
  useDepositModal,
} from "../../_state/shells-context";
import { useActivity } from "../../_state/activity-context";
import { SearchIcon } from "../icons";

/**
 * Top bar for the mobile shell v3.
 *
 *   [▢] [🔍]                       [🔔] [Earn $5]
 *
 * Left cluster: Wayfinder mark, then Search → CommandBar.
 * Right cluster: Activity bell, Earn $5 (hides post-first-deposit).
 *
 * The wallet avatar was here in earlier v3 iterations but the
 * Portfolio bottom-nav tab is the canonical path now — having both
 * was redundant.
 */
export function MobileTopBar() {
  return (
    <header
      className="flex shrink-0 items-center gap-1 px-3"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
        paddingBottom: "0.5rem",
      }}
    >
      <WayfinderMark />
      <SearchButton />

      <div className="flex flex-1 items-center justify-end gap-1">
        <ActivityButton />
        <EarnFiveChipMobile />
      </div>
    </header>
  );
}

function WayfinderMark() {
  return (
    <span
      aria-label="Wayfinder"
      className="flex size-9 shrink-0 items-center justify-center"
    >
      <img
        src="/brand/wayfinder-mark.svg"
        alt="Wayfinder"
        width={24}
        height={24}
        className="size-6"
      />
    </span>
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
      className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-2 hover:text-foreground active:scale-[0.96]"
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

