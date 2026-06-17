"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";
import { useIsMobile } from "../_hooks/useIsMobile";
import { BottomSheet } from "./mobile/BottomSheet";

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

type Venue = "hyperliquid" | "polymarket";

const VENUE_COPY: Record<
  Venue,
  {
    label: string;
    asset: string;
    chain: string;
    blurb: string;
    walletAddress: string;
    walletBalance: number;
    sourceBalance: number;
  }
> = {
  hyperliquid: {
    label: "Hyperliquid",
    asset: "USDC",
    chain: "Arbitrum",
    blurb:
      "Bridges USDC from your wallet to your Hyperliquid trading account on Arbitrum. You pay Arbitrum gas.",
    walletAddress: "0x4d12a9b8…f08a",
    walletBalance: 20.94,
    sourceBalance: 142.58,
  },
  polymarket: {
    label: "Polymarket",
    asset: "PUSD",
    chain: "Polygon",
    blurb:
      "Moves PUSD from your wallet to the Polymarket trading wallet on Polygon. You pay Polygon gas.",
    walletAddress: "0x0238b7…6547",
    walletBalance: 8.01,
    sourceBalance: 6.42,
  },
};

/** Deposit / withdraw between the connected wallet and a venue
 *  trading account (Hyperliquid or Polymarket). Pure UI for now —
 *  the actual transfer wiring lands when on-chain plumbing ships.
 *
 *  Triggered from the ⇄ chip on the matching position row in the
 *  PortfolioSheet positions list. */
export function TradingWalletDialog({
  open,
  venue,
  onOpenChange,
  className,
}: {
  open: boolean;
  venue: Venue | null;
  onOpenChange: (open: boolean) => void;
  className?: string;
}) {
  // Local alias so the existing close-call sites read naturally.
  const onClose = () => onOpenChange(false);
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("0.00");
  // Pull the active venue copy from the map — if the dialog is closed
  // (venue === null) we still need _something_ to render so the
  // close transition doesn't NaN out the layout. Default to
  // hyperliquid; the popup is invisible at this point anyway.
  const cfg = VENUE_COPY[venue ?? "hyperliquid"];

  const sourceBalance =
    tab === "deposit" ? cfg.sourceBalance : cfg.walletBalance;
  const ctaLabel =
    tab === "deposit"
      ? `Deposit to ${cfg.label}`
      : `Withdraw from ${cfg.label}`;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(cfg.walletAddress);
    } catch {
      /* ignore — clipboard isn't always available */
    }
  };

  const isMobile = useIsMobile();

  // Body content is the same shape across both presentations — only
  // the wrapping chrome differs (centered Dialog on desktop, sheet on
  // mobile). Mobile uses BottomSheet's title bar; desktop renders its
  // own centered title.
  const body = (
    <div className={isMobile ? "px-4 pb-6" : ""}>
      {/* Deposit / Withdraw tab strip — matches TradePanel's
          TradeModeTabs exactly: rounded-lg container + rounded-md
          tabs (concentric: 8 = 6 + p-1 padding), mint primary on
          the active tab. */}
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-surface-1 p-1">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "deposit"}
              onClick={() => setTab("deposit")}
              className={cn(
                "h-8 rounded-md text-body font-medium transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
                tab === "deposit"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Deposit
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "withdraw"}
              onClick={() => setTab("withdraw")}
              className={cn(
                "h-8 rounded-md text-body font-medium transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
                tab === "withdraw"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Withdraw
            </button>
          </div>

          {/* Amount input — big number on its own line, balance under it. */}
          <div className="mt-4 rounded-xl bg-surface-1 p-4 ring-1 ring-inset ring-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-body text-muted-foreground">Amount</span>
              <button
                type="button"
                onClick={() => setAmount(sourceBalance.toFixed(2))}
                className="rounded-md bg-surface-2 px-2 py-0.5 text-caption font-semibold uppercase tracking-[0.06em] text-muted-foreground transition-colors hover:bg-surface-4 hover:text-foreground"
              >
                MAX
              </button>
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-3">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-label="Amount"
                className="min-w-0 flex-1 bg-transparent text-display font-semibold leading-none tabular-nums text-foreground outline-none"
              />
              <span className="text-body font-medium text-muted-foreground">
                {cfg.asset}
              </span>
            </div>
            <div className="mt-3 text-body text-muted-foreground">
              Balance{" "}
              <span className="tabular-nums text-foreground">
                {sourceBalance.toFixed(6)}
              </span>
            </div>
          </div>

          <p className="mt-4 text-body leading-relaxed text-muted-foreground">
            {cfg.blurb}
          </p>

          {/* Primary action */}
          <button
            type="button"
            className="group relative mt-6 inline-flex h-11 w-full items-center justify-center gap-1.5 overflow-hidden rounded-md bg-primary px-4 text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.98]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-white/40 to-transparent"
            />
            <span className="relative inline-flex items-center">
              {ctaLabel}
            </span>
          </button>

          {/* Trading wallet address footer */}
          <div className="mt-4 flex items-center justify-between gap-3 text-body">
            <span className="text-muted-foreground">
              Trading wallet{" "}
              <span className="tabular-nums text-foreground">
                {USD.format(cfg.walletBalance)}
              </span>{" "}
              {cfg.asset}
            </span>
            <button
              type="button"
              onClick={copyAddress}
              aria-label="Copy trading wallet address"
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-body tabular-nums text-muted-foreground transition-colors hover:bg-surface-1 hover:text-primary"
            >
              {cfg.walletAddress}
              <Copy strokeWidth={1.75} className="size-3.5" aria-hidden />
            </button>
          </div>
    </div>
  );

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={(o) => !o && onClose()}
        title={cfg.label}
        heightFraction={0.85}
        className={className}
      >
        {body}
      </BottomSheet>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[var(--z-modal-bg)] bg-background/70 backdrop-blur-[3px] transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 origin-center rounded-2xl bg-card backdrop-blur-md p-6 ring-1 ring-inset ring-white/[0.06] shadow-2xl transition-[opacity,transform] duration-200 ease-[var(--ease-strong)] data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0",
            className,
          )}
        >
          <Dialog.Title className="text-center text-title font-semibold text-foreground">
            {cfg.label}
          </Dialog.Title>
          {body}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export type TradingWalletVenue = Venue;
