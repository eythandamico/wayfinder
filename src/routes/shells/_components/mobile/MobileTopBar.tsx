"use client";

import { Link } from "react-router-dom";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { WALLET_ADDRESS } from "../../_data/mocks";
import { useCommandBar, usePortfolioSheet } from "../../_state/shells-context";
import { SearchIcon } from "../icons";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Thin top bar for the mobile agent surface.
 *
 * Mobile is agent-first — there's no Trade/Paths route toggle here
 * because the user navigates by swiping the panel deck below. The
 * bar holds the brand mark on the left, and three quick affordances
 * on the right (search, portfolio drill-in, wallet avatar).
 */
export function MobileTopBar() {
  return (
    <header
      className="flex shrink-0 items-center justify-between gap-2 px-3"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 0.625rem)",
        paddingBottom: "0.5rem",
      }}
    >
      <Link
        to="/"
        aria-label="Wayfinder home"
        className="flex shrink-0 items-center rounded-md px-1 transition-opacity hover:opacity-80"
      >
        <img
          src="/brand/wayfinder-icon-white.png"
          alt="Wayfinder"
          width={56}
          height={56}
          className="size-7"
        />
      </Link>

      <div className="flex items-center gap-1">
        <SearchButton />
        <WalletAvatar address={WALLET_ADDRESS} />
      </div>
    </header>
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
      className="flex size-9 items-center justify-center rounded-md bg-surface-2 text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-4 hover:text-foreground active:scale-[0.96]"
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
