"use client";

import { Link } from "react-router-dom";
import {
  CandlestickChart,
  Compass,
  type LucideIcon,
} from "lucide-react";
import { WALLET_ADDRESS } from "../../_data/mocks";
import {
  useCommandBar,
  usePortfolioSheet,
  useViewMode,
  type ViewMode,
} from "../../_state/shells-context";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { SearchIcon } from "../icons";
import { shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

export function MobileTopBar() {
  return (
    <div
      className="flex shrink-0 items-center justify-between gap-2 px-3"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)",
        paddingBottom: "0.75rem",
      }}
    >
      <div className="flex items-center gap-2">
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
        <MobileViewModeToggle />
      </div>

      <div className="flex items-center gap-1">
        <SearchButton />
        <WalletDropdown address={WALLET_ADDRESS} />
      </div>
    </div>
  );
}

/* ----- View mode toggle (icon + label) ----- */

function MobileViewModeToggle() {
  const { viewMode, setViewMode } = useViewMode();
  return (
    <div className="flex items-center gap-1">
      <ToggleButton
        active={viewMode === "trading"}
        onClick={() => setViewMode("trading")}
        Icon={CandlestickChart}
        target="trading"
        label="Trade"
      />
      <ToggleButton
        active={viewMode === "explore"}
        onClick={() => setViewMode("explore")}
        Icon={Compass}
        target="explore"
        label="Paths"
      />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  Icon,
  target,
  label,
}: {
  active: boolean;
  onClick: () => void;
  Icon: LucideIcon;
  target: ViewMode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-target={target}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-body font-medium transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
        active
          ? "bg-surface-4 text-foreground"
          : "text-muted-foreground hover:bg-surface-1 hover:text-foreground",
      )}
    >
      <Icon strokeWidth={1.75} className="size-4" aria-hidden />
      {label}
    </button>
  );
}

/* ----- Search trigger ----- */

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

/* ----- Wallet avatar — opens the rich Portfolio bottom sheet,
   same as the desktop ConnectedPill toggles the side panel.
   Copy address / Etherscan / Density / Disconnect now live inside
   that sheet's settings drill-in so this button has one clear job. */

function WalletDropdown({ address }: { address: string }) {
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

/* ----- Density picker — same Aa/Aa/Aa segmented row as desktop ----- */

