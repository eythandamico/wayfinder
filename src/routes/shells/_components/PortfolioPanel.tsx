"use client";

import { useId, useRef, useState } from "react";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  Eye,
  EyeOff,
  MoreVertical,
} from "lucide-react";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/format";
import type { Wallet } from "../_types";
import { WALLETS } from "../_data/mocks";
import { useWalletConnection } from "../_state/shells-context";
import { AskAgentButton } from "./AskAgentAffordance";
import { SubduedButton } from "./SubduedButton";
import { CheckIcon, ChevronDownIcon } from "./icons";

const PERIODS = ["1D", "1W", "1M", "3M", "1Y", "All"] as const;
type Period = (typeof PERIODS)[number];

// Mocked account state — replace with real account data once the wallet API
// lands. Structure intentionally matches what the panel displays so wiring is
// a one-to-one swap.
export const MOCK_ACCOUNT = {
  balance: 26523.12,
  changeUsd: 201.82,
  changePct: 0.14,
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
  const [period, setPeriod] = useState<Period>("1D");
  const periodLayoutId = useId();
  const { connected, connect } = useWalletConnection();

  const isUp = MOCK_ACCOUNT.changeUsd >= 0;

  if (!connected) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex flex-col gap-1">
          <span className="text-display font-semibold leading-none tabular-nums text-foreground">
            $0.00
          </span>
          <span className="text-body text-muted-foreground text-pretty">
            Connect to fund your desk and start trading.
          </span>
        </div>
        <button
          type="button"
          onClick={connect}
          className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.96]"
        >
          Connect wallet
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Account header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/5 px-3 py-3">
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

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4">
        {/* Wallet-level Deposit / Withdraw — mirrors the side-panel
            portfolio sheet so the panel reads as a preview of the
            same surface. */}
        <div className="grid grid-cols-2 gap-1.5">
          <SubduedButton aria-label="Deposit to wallet" className="h-9 px-3">
            Deposit
          </SubduedButton>
          <button
            type="button"
            aria-label="Withdraw from wallet"
            className="group relative inline-flex h-9 items-center justify-center gap-1.5 overflow-hidden rounded-md bg-primary px-3 text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.97]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-white/40 to-transparent"
            />
            <span className="relative inline-flex items-center gap-1.5">
              <ArrowUpRight strokeWidth={2} className="size-3.5" aria-hidden />
              Withdraw
            </span>
          </button>
        </div>

        {/* Hero balance — mirrors PortfolioSheet's preview block. */}
        <div className="pt-5">
          <div className="flex items-center justify-between gap-3">
            <div className="font-heading text-display font-semibold leading-none tabular-nums text-foreground">
              {hidden ? "••••••" : USD.format(MOCK_ACCOUNT.balance)}
            </div>
            <AskAgentButton
              size="md"
              withHoverGlow
              payload={{
                kind: "portfolio",
                balance: MOCK_ACCOUNT.balance,
                changeUsd: MOCK_ACCOUNT.changeUsd,
                changePct: MOCK_ACCOUNT.changePct,
              }}
              ariaLabel="Ask agent about my book"
            />
          </div>
          <div
            className={cn(
              "mt-2 flex w-fit items-center gap-1.5 text-body tabular-nums",
              hidden
                ? "text-muted-foreground"
                : isUp
                  ? "text-primary"
                  : "text-tone-down",
            )}
          >
            {hidden ? (
              <span aria-hidden>•••</span>
            ) : (
              <>
                <span aria-hidden>{isUp ? "▲" : "▼"}</span>
                {isUp ? "+" : ""}
                {USD.format(MOCK_ACCOUNT.changeUsd)} (
                {MOCK_ACCOUNT.changePct.toFixed(2)}%)
              </>
            )}
            <span className="text-muted-foreground">
              · {period.toLowerCase()}
            </span>
          </div>

          {/* Sparkline */}
          <div className="mt-4">
            <Sparkline data={MOCK_ACCOUNT.sparkline} up={isUp} />
          </div>

          {/* Period selector — segmented control under the chart. */}
          <div className="mt-4 flex w-full items-center gap-1 rounded-md bg-surface-1 p-0.5">
            {PERIODS.map((p) => {
              const active = period === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "relative flex h-8 flex-1 items-center justify-center rounded-sm text-body tabular-nums transition-[color,scale] duration-150 ease-out active:scale-[0.96]",
                    active
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId={periodLayoutId}
                      aria-hidden
                      className="absolute inset-0 rounded-sm bg-surface-3"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 32,
                        mass: 0.6,
                      }}
                    />
                  )}
                  <span className="relative z-[1]">{p}</span>
                </button>
              );
            })}
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
        className="-mx-1.5 inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-surface-1"
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
          "absolute left-0 top-full z-30 mt-1 w-72 origin-top-left rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 p-1 shadow-2xl transition-[opacity,transform] duration-150 ease-[var(--ease-strong)]",
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
                "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-surface-1",
                isActive && "bg-surface-1",
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
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-body text-foreground transition-colors hover:bg-surface-1"
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

  // Last point as a percentage so the trailing dot can be positioned via CSS,
  // outside the SVG. Drawing it inside the stretched (preserveAspectRatio:
  // none) SVG turns circles into wide ovals.
  const last = data[data.length - 1];
  const lastYPct = (1 - (last - min) / range) * 100;

  return (
    <div
      className={cn(
        "relative h-16 w-full",
        up ? "text-primary" : "text-tone-down",
      )}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden
        className="h-full w-full"
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* Trailing dot — DOM-positioned so it stays a true circle regardless
          of the SVG's stretched aspect ratio. */}
      <span
        aria-hidden
        className="pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current shadow-[0_0_0_4px_currentColor] [box-shadow:0_0_0_4px_color-mix(in_oklch,currentColor_25%,transparent)]"
        style={{ left: "100%", top: `${lastYPct}%` }}
      />
    </div>
  );
}

/* ----- Bits ----- */

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
        "relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-1 hover:text-foreground active:scale-[0.96]",
        className,
      )}
    >
      {children}
    </button>
  );
}

