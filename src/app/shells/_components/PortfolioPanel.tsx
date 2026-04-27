"use client";

import { useRef, useState } from "react";
import { Eye, EyeOff, MoreVertical } from "lucide-react";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/format";
import type { Wallet } from "../_types";
import { WALLETS } from "../_data/mocks";
import { CheckIcon, ChevronDownIcon } from "./icons";

// Mocked account state — replace with real account data once the wallet API
// lands. Structure intentionally matches what the panel displays so wiring is
// a one-to-one swap.
const MOCK_ACCOUNT = {
  balance: 26523.12,
  changeUsd: 201.82,
  changePct: 0.14,
  buyingPower: 13320.36,
  optionsBuyingPower: 9283.1,
  sparkline: [
    9.1, 9.5, 9.2, 8.8, 9.4, 10.1, 9.8, 10.4, 10.9, 11.3, 11.0, 11.8, 12.4,
    12.0, 12.6, 13.4, 13.8, 13.2, 14.1, 14.9, 15.4, 15.0, 16.2, 17.1, 17.8,
    17.4, 18.6, 19.4, 20.3, 19.9, 20.8, 21.6, 22.5, 22.1, 23.4, 24.6, 25.3,
    25.9, 26.4, 26.5,
  ],
};

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function PortfolioPanel() {
  const [activeWallet, setActiveWallet] = useState<Wallet>(WALLETS[0]);
  const [hidden, setHidden] = useState(false);

  const isUp = MOCK_ACCOUNT.changeUsd >= 0;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-muted">
      {/* Account header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
        <WalletDropdown active={activeWallet} onSelect={setActiveWallet} />
        <div className="flex shrink-0 items-center gap-0.5">
          <SmallIconButton
            aria-label={hidden ? "Show balance" : "Hide balance"}
            aria-pressed={hidden}
            onClick={() => setHidden((v) => !v)}
          >
            {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </SmallIconButton>
          <SmallIconButton aria-label="Account options">
            <MoreVertical className="size-4" />
          </SmallIconButton>
        </div>
      </div>

      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
        {/* Hero: balance + change + Deposit */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-display font-semibold leading-none tabular-nums text-foreground">
              {hidden ? "••••••" : USD.format(MOCK_ACCOUNT.balance)}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-body tabular-nums",
                isUp ? "text-primary" : "text-tone-down",
              )}
            >
              <span aria-hidden>{isUp ? "▲" : "▼"}</span>
              {hidden
                ? "•••"
                : `${isUp ? "+" : ""}${USD.format(MOCK_ACCOUNT.changeUsd)} (${MOCK_ACCOUNT.changePct.toFixed(2)}%)`}
              <span className="text-muted-foreground">today</span>
            </span>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-md bg-white/[0.08] px-3 py-1.5 text-body font-medium text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-white/[0.12] active:scale-[0.96]"
          >
            Deposit
          </button>
        </div>

        {/* Sparkline */}
        <Sparkline data={MOCK_ACCOUNT.sparkline} up={isUp} />

        {/* Overview */}
        <div className="flex flex-col gap-2">
          <SectionLabel label="Overview" />
          <StatRow
            label="Buying power"
            value={hidden ? "••••" : USD.format(MOCK_ACCOUNT.buyingPower)}
          />
          <StatRow
            label="Options buying power"
            value={hidden ? "••••" : USD.format(MOCK_ACCOUNT.optionsBuyingPower)}
          />
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

/* ----- Wallet selector — sits in the account header ----- */

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

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="portfolio-wallet-menu"
        aria-label={`Active wallet: ${active.name}. Switch wallet`}
        onClick={() => setOpen((v) => !v)}
        className="-mx-1.5 inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-white/[0.05]"
      >
        <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
        <span className="truncate text-body font-medium text-foreground">
          {active.name}
        </span>
        {active.primary && (
          <span className="shrink-0 text-body text-muted-foreground">
            · primary
          </span>
        )}
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-3 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        id="portfolio-wallet-menu"
        role="menu"
        aria-hidden={!open}
        className={cn(
          "absolute left-0 top-full z-30 mt-1 w-72 origin-top-left rounded-lg bg-background p-1 shadow-2xl transition-[opacity,transform] duration-150 ease-[var(--ease-strong)]",
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
        <div className="my-1 h-px bg-white/5" />
        <button
          type="button"
          role="menuitem"
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-body text-foreground transition-colors hover:bg-white/[0.05]"
        >
          <span>Add wallet</span>
          <span aria-hidden className="text-body text-muted-foreground">
            +
          </span>
        </button>
      </div>
    </div>
  );
}

/* ----- Sparkline — viewBox-driven SVG polyline so it scales to its slot ----- */

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 100;
  const H = 32;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  // Last point for the trailing dot
  const last = data[data.length - 1];
  const lastX = W;
  const lastY = H - ((last - min) / range) * H;

  return (
    <div
      className={cn(
        "h-16 w-full",
        up ? "text-primary" : "text-tone-down",
      )}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden
        className="h-full w-full overflow-visible"
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={lastX}
          cy={lastY}
          r={2.5}
          fill="currentColor"
          opacity={0.9}
        />
        <circle
          cx={lastX}
          cy={lastY}
          r={6}
          fill="currentColor"
          opacity={0.18}
        />
      </svg>
    </div>
  );
}

/* ----- Bits ----- */

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-body">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
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
        "relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/[0.05] hover:text-foreground active:scale-[0.96]",
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
          <span className="text-body text-foreground">{name}</span>
          <span className="text-body tabular-nums text-muted-foreground">
            {count} {count === 1 ? "position" : "positions"}
          </span>
        </div>
        <span className="text-body tabular-nums text-foreground">{value}</span>
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
      <span className="text-body text-muted-foreground">{label}</span>
      <span aria-hidden className="h-px flex-1 bg-white/5" />
    </div>
  );
}
