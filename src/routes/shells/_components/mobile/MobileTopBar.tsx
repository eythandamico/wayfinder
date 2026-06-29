"use client";

import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { WALLET_ADDRESS } from "../../_data/mocks";
import {
  useCommandBar,
  useDepositModal,
  usePortfolioSheet,
} from "../../_state/shells-context";
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
 * Thin top bar for the mobile agent surface.
 *
 * Mobile is agent-first — the user navigates the panel deck below
 * via swipe, not via this bar. Layout, left → right:
 *
 *   [hamburger]  [logo]  …  [Earn $5]  [$26K]  [search]  [wallet]
 *
 * The hamburger opens MobileMenuSheet (Friends / Settings / Deposit).
 * Portfolio total chip uses compact $26K formatting so the bar
 * stays scan-friendly on a 390px viewport. Search and wallet avatar
 * stay where they were.
 */
export function MobileTopBar({
  onOpenMenu,
}: {
  onOpenMenu: () => void;
}) {
  return (
    <header
      className="flex shrink-0 items-center gap-2 px-3"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
        paddingBottom: "0.5rem",
      }}
    >
      <HamburgerButton onClick={onOpenMenu} />
      <Link
        to="/"
        aria-label="Wayfinder home"
        className="flex shrink-0 items-center rounded-md transition-opacity hover:opacity-80"
      >
        <img
          src="/brand/wayfinder-mark.svg"
          alt="Wayfinder"
          width={28}
          height={28}
          className="size-7"
        />
      </Link>

      <div className="flex flex-1 items-center justify-end gap-1">
        <EarnFiveChipMobile />
        <PortfolioTotalChipMobile />
        <SearchButton />
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

/** Mobile-compact Earn $5 cue. Hides post-first-deposit. Uses the
 *  same mint-tinted treatment as the desktop chip so the reward
 *  vocabulary reads as the same control. */
function EarnFiveChipMobile() {
  const { hasDeposited, openDeposit } = useDepositModal();
  if (hasDeposited) return null;
  return (
    <button
      type="button"
      onClick={openDeposit}
      aria-label="Earn $5 in agent credit by making your first deposit"
      className="inline-flex h-8 shrink-0 items-center rounded-md bg-primary/15 px-2 text-caption font-semibold text-primary transition-colors duration-150 ease-out hover:bg-primary/20 active:scale-[0.96]"
    >
      Earn $5
    </button>
  );
}

/** Compact portfolio total — $26K instead of $26,523 so the bar
 *  stays readable on a 390px viewport. Click opens the same
 *  Portfolio sheet the wallet avatar opens. */
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

/** Wallet avatar — opens the rich Portfolio bottom sheet (the same
 *  drill-in the desktop ConnectedPill triggers). Mirrors the
 *  existing aria-expanded + focus ring states. */
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
