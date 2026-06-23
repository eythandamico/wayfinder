"use client";

import { Wallet } from "lucide-react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/format";
import { MOCK_USAGE } from "../_data/mocks";
import {
  usePortfolioSheet,
  useWalletConnection,
} from "../_state/shells-context";

/**
 * Wallet pill — jazzicon wrapped in a token-usage progress ring.
 * Click opens the portfolio side sheet; hover swaps the jazzicon for
 * the current token-usage percentage in the same circular slot.
 *
 * Lives in the top bar as the rightmost chrome element. Pre-connect
 * state renders a clear "Connect" CTA in its place. Extracted from
 * MarketHeader so the same pill can serve other shell variants
 * without duplicating the ring math.
 *
 * Ring math: r=16 stroke=2 puts the ring centered at the button's
 * edge with a 2px gap inside between the ring and the jazzicon, and
 * 1px of breathing room outside. SVG starts rotated −90° so progress
 * grows clockwise from 12 o'clock.
 */
export function WalletPill({ address }: { address: string }) {
  const { open, togglePortfolio } = usePortfolioSheet();
  const { connected, connect } = useWalletConnection();
  const short = shortAddress(address);

  if (!connected) {
    return (
      <button
        type="button"
        onClick={connect}
        aria-label="Connect wallet"
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Wallet strokeWidth={1.75} className="size-4" aria-hidden />
        Connect
      </button>
    );
  }

  const usage = MOCK_USAGE;
  const tokenPct = Math.min(
    100,
    (usage.tokens.used / usage.tokens.total) * 100,
  );
  const RING_RADIUS = 16;
  const RING_CIRC = 2 * Math.PI * RING_RADIUS;
  const dashLen = (tokenPct / 100) * RING_CIRC;

  return (
    <div className="group relative shrink-0">
      <button
        type="button"
        aria-label={`Wallet ${short}. Tokens used: ${Math.round(tokenPct)}%. Open portfolio.`}
        aria-expanded={open}
        data-demo="portfolio-toggle"
        onClick={togglePortfolio}
        className={cn(
          "relative inline-flex size-9 items-center justify-center rounded-full transition-[background-color,scale] duration-150 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
          open ? "bg-primary/10" : "hover:bg-surface-2",
        )}
      >
        <svg
          aria-hidden
          viewBox="0 0 36 36"
          className="pointer-events-none absolute inset-0 size-9 -rotate-90"
        >
          <circle
            cx="18"
            cy="18"
            r={RING_RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth={2}
          />
          <circle
            cx="18"
            cy="18"
            r={RING_RADIUS}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={`${dashLen} ${RING_CIRC}`}
            className="transition-[stroke-dasharray] duration-500 ease-out"
          />
        </svg>
        {/* Jazzicon cross-fades with the % label on hover — same slot,
         *  reads as the icon FLIPPING to a percentage, not a popover. */}
        <span
          aria-hidden
          className="relative flex size-[26px] items-center justify-center"
        >
          <span className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full opacity-100 transition-opacity duration-150 ease-out group-hover:opacity-0">
            <Jazzicon diameter={26} seed={jsNumberForAddress(address)} />
          </span>
          <span className="absolute inset-0 flex items-center justify-center text-micro font-semibold tabular-nums text-foreground opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100">
            {Math.round(tokenPct)}%
          </span>
        </span>
      </button>
    </div>
  );
}
