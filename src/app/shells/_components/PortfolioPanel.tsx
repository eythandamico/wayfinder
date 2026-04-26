"use client";

import { useRef, useState } from "react";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/format";
import type { Wallet } from "../_types";
import { WALLETS } from "../_data/mocks";
import { CheckIcon, ChevronDownIcon, ClockIcon, CopyIcon, KeyIcon } from "./icons";

export function PortfolioPanel() {
  const [activeWallet, setActiveWallet] = useState<Wallet>(WALLETS[0]);
  const [copied, setCopied] = useState(false);

  const short = shortAddress(activeWallet.address);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(activeWallet.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-muted">
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4 pt-6">
        {/* Wallet zone — full width, 2 tight rows */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]"
              />
              <WalletDropdown
                active={activeWallet}
                onSelect={setActiveWallet}
              />
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              <SmallIconButton
                aria-label={copied ? "Address copied" : "Copy wallet address"}
                onClick={copyAddress}
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </SmallIconButton>
              <SmallIconButton aria-label="Export wallet">
                <KeyIcon />
              </SmallIconButton>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-body tabular-nums text-muted-foreground">
              {short}
            </span>
            <span
              aria-label="Session expires in 59 minutes 33 seconds"
              className="inline-flex items-center gap-1.5 text-body text-muted-foreground"
            >
              <ClockIcon />
              <span className="tabular-nums">Session · 59m 33s</span>
            </span>
          </div>
        </div>

        {/* Portfolio hero — full width, left-aligned column */}
        <div className="flex flex-col gap-1.5">
          <span className="text-body text-muted-foreground">
            Portfolio
          </span>
          <span className="text-display font-semibold leading-none tabular-nums text-foreground">
            $0.00
          </span>
          <span className="inline-flex items-center gap-1.5 text-body tabular-nums text-muted-foreground">
            <span aria-hidden className="text-body">—</span>
            $0.00
            <span aria-hidden>·</span>
            0.00%
            <span aria-hidden>·</span>
            24H
          </span>
        </div>

        {/* Positions */}
        <div className="flex flex-col gap-2">
          <SectionLabel label="Positions" />
          <div className="flex flex-col">
            <VenueRow
              glyph="H"
              name="Hyperliquid"
              count={0}
              value="$0.00"
              empty="No positions"
              cta="Open one"
            />
            <VenueRow
              glyph="T"
              name="Tokens"
              count={0}
              value="$0.00"
              empty="No tokens"
              cta="Deposit"
            />
            <VenueRow
              glyph="P"
              name="Polymarket"
              count={0}
              value="$0.00"
              empty="No predictions"
              cta="Explore markets"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function WalletDropdown({
  active,
  onSelect,
}: {
  active: Wallet;
  onSelect: (w: Wallet) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false), open);

  const label = `${active.name}${active.primary ? " primary wallet" : ""}`;

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="wallet-select-menu"
        aria-label={`Current wallet: ${label}. Switch wallet`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-body transition-colors hover:bg-white/[0.04]"
      >
        <span className="truncate">
          <span className="font-semibold text-foreground">{active.name}</span>
          {active.primary && (
            <span className="font-normal text-muted-foreground">
              {" "}
              primary wallet
            </span>
          )}
        </span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        id="wallet-select-menu"
        role="menu"
        aria-hidden={!open}
        className={cn(
          "absolute left-0 top-full z-20 mt-1 w-72 origin-top-left rounded-lg bg-background p-1 shadow-xl ring-1 ring-white/5 transition-[opacity,transform] duration-150 ease-[var(--ease-strong)]",
          open
            ? "opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 -translate-y-1 scale-[0.98]",
        )}
      >
        {WALLETS.map((w) => {
          const isActive = w.id === active.id;
          const shortAddr = shortAddress(w.address);
          return (
            <button
              key={w.id}
              type="button"
              role="menuitemradio"
              aria-checked={isActive}
              onClick={() => {
                onSelect(w);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-white/[0.05]",
                isActive && "bg-white/[0.04]",
              )}
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body text-foreground">
                  {w.name}
                  {w.primary && (
                    <span className="ml-1.5 text-body text-muted-foreground">
                      · primary
                    </span>
                  )}
                </span>
                <span className="text-body tabular-nums text-muted-foreground">
                  {shortAddr}
                </span>
              </span>
              {isActive && <CheckIcon />}
            </button>
          );
        })}
        <div className="h-px bg-white/5" />
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-body text-foreground transition-colors hover:bg-white/[0.05]"
        >
          <span>Add wallet</span>
          <span aria-hidden className="text-body text-muted-foreground">+</span>
        </button>
      </div>
    </div>
  );
}

function SmallIconButton({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "relative flex size-7 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/[0.05] hover:text-foreground active:scale-[0.96]",
        "before:absolute before:-inset-1 before:content-['']",
        className,
      )}
    >
      {children}
    </button>
  );
}

function VenueRow({
  glyph,
  name,
  count,
  value,
  empty,
  cta,
}: {
  glyph: string;
  name: string;
  count: number;
  value: string;
  empty: string;
  cta: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = `portfolio-${name.toLowerCase()}-items`;
  return (
    <div className="border-t border-white/5 first:border-t-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center gap-3 py-3 text-left"
      >
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-body font-semibold text-foreground transition-colors group-hover:bg-white/[0.09]"
        >
          {glyph}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-body text-foreground">
            {name}
          </span>
          <span className="text-body tabular-nums text-muted-foreground">
            {count} {count === 1 ? "position" : "positions"}
          </span>
        </div>
        <span className="text-body tabular-nums text-foreground">
          {value}
        </span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-3 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div
          id={panelId}
          className="flex items-center justify-between gap-3 pb-3 pl-10 pr-1"
        >
          <span className="text-body text-muted-foreground">{empty}</span>
          <button
            type="button"
            className="text-body text-primary transition-[filter] duration-150 ease-out hover:brightness-110"
          >
            {cta} →
          </button>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-body text-muted-foreground">
        {label}
      </span>
      <span aria-hidden className="h-px flex-1 bg-white/5" />
    </div>
  );
}
