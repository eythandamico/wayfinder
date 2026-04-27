"use client";

import { useRef, useState } from "react";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import Link from "next/link";
import Image from "next/image";
import {
  CandlestickChart,
  Compass,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { WALLET_ADDRESS } from "../../_data/mocks";
import {
  useCommandBar,
  useDensity,
  useViewMode,
  type Density,
  type ViewMode,
} from "../../_state/shells-context";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { CheckIcon, CopyIcon, SearchIcon } from "../icons";
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
          href="/"
          aria-label="Wayfinder home"
          className="flex shrink-0 items-center rounded-md px-1 transition-opacity hover:opacity-80"
        >
          <Image
            src="/brand/wayfinder-icon-white.png"
            alt="Wayfinder"
            width={56}
            height={56}
            className="size-7"
            priority
          />
        </Link>
        <MobileViewModeToggle />
      </div>

      <div className="flex items-center gap-1">
        <SearchButton />
        <MoreMenu />
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
          ? "bg-white/[0.10] text-foreground"
          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
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
      className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-white/[0.04] hover:text-foreground"
    >
      <SearchIcon />
    </button>
  );
}

/* ----- Density / overflow menu ----- */

function MoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { density, setDensity } = useDensity();

  useClickOutside(ref, () => setOpen(false), open);

  const options: { value: Density; size: string }[] = [
    { value: "small", size: "text-[13px]" },
    { value: "medium", size: "text-[14px]" },
    { value: "large", size: "text-[16px]" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
      >
        <MoreHorizontal strokeWidth={1.5} className="size-4" aria-hidden />
      </button>
      <div
        role="menu"
        aria-hidden={!open}
        className={cn(
          "absolute right-0 top-full z-30 mt-1 w-56 origin-top-right rounded-lg bg-background p-2 shadow-2xl transition-[opacity,transform] duration-150 ease-[var(--ease-strong)]",
          open
            ? "opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 -translate-y-1 scale-[0.98]",
        )}
      >
        <div className="px-1 pb-1.5 text-body text-muted-foreground">
          Display density
        </div>
        <div className="flex items-center gap-1 rounded-md bg-white/[0.04] p-0.5">
          {options.map((opt) => {
            const active = density === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => setDensity(opt.value)}
                className={cn(
                  "flex h-8 flex-1 items-center justify-center rounded-sm font-semibold transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
                  opt.size,
                  active
                    ? "bg-white/[0.08] text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Aa
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ----- Wallet dropdown — far right ----- */

function WalletDropdown({ address }: { address: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false), open);

  const short = shortAddress(address);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Wallet: ${short}. Open menu`}
        title={short}
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center overflow-hidden rounded-full transition-[background-color,scale] duration-150 ease-out hover:opacity-80 active:scale-[0.96]"
      >
        <Jazzicon diameter={32} seed={jsNumberForAddress(address)} />
      </button>
      <div
        role="menu"
        aria-hidden={!open}
        className={cn(
          "absolute right-0 top-full z-30 mt-1 w-64 origin-top-right rounded-lg bg-background p-1 shadow-2xl transition-[opacity,transform] duration-150 ease-[var(--ease-strong)]",
          open
            ? "opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 -translate-y-1 scale-[0.98]",
        )}
      >
        <div className="flex flex-col gap-2 px-2 pb-1.5 pt-2">
          <span className="text-body text-muted-foreground">
            Connected wallet
          </span>
          <div className="flex items-center gap-2.5 rounded-md bg-white/[0.04] px-2.5 py-2">
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full"
            >
              <Jazzicon diameter={32} seed={jsNumberForAddress(address)} />
            </span>
            <span className="min-w-0 flex-1 truncate text-body tabular-nums text-foreground">
              {short}
            </span>
            <button
              type="button"
              aria-label={copied ? "Address copied" : "Copy address"}
              onClick={copy}
              className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
            >
              {copied ? <CheckIcon /> : <CopyIcon />}
            </button>
          </div>
        </div>
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-body text-foreground transition-colors hover:bg-white/[0.05]"
        >
          <span>Disconnect</span>
        </button>
      </div>
    </div>
  );
}
