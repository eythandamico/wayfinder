"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SubduedButton } from "../SubduedButton";
import { ConfirmDialog } from "@/components/ui";
import { MARKETS } from "../../_data/markets";
import { POSITIONS, type PositionRow } from "../../_data/positions";
import { useActiveMarket } from "../../_state/shells-context";
import { triggerDopamine } from "../../_lib/dopamine";
import {
  AskAgentAffordance,
  AskAgentSpacer,
} from "../AskAgentAffordance";
import type { TradingWalletVenue } from "../TradingWalletDialog";

/* ------------------------------------------------------------------ */
/*  Local formatters                                                    */
/* ------------------------------------------------------------------ */

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const compactUsd = (n: number) => COMPACT.format(n);

/* ------------------------------------------------------------------ */
/*  PositionList — venue-filtered tab body                              */
/* ------------------------------------------------------------------ */

/** Flat list of positions filtered by venue — backs the
 *  Perps / Tokens / Polymarket top-level tabs. Single-open accordion:
 *  opening row B collapses row A so only one drawer is ever visible. */
export function PositionList({
  venue,
  onTransfer,
  empty,
}: {
  venue: PositionRow["venue"];
  onTransfer: (venue: TradingWalletVenue) => void;
  empty: string;
}) {
  const rows = POSITIONS.filter((p) => p.venue === venue);
  const [openSymbol, setOpenSymbol] = useState<string | null>(null);
  if (rows.length === 0) {
    return (
      <div className="py-10 text-center text-body text-muted-foreground">
        {empty}
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-1">
      {rows.map((row) => (
        <PositionListItem
          key={row.symbol}
          row={row}
          onTransfer={onTransfer}
          open={openSymbol === row.symbol}
          onToggle={() =>
            setOpenSymbol((cur) => (cur === row.symbol ? null : row.symbol))
          }
        />
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/*  PositionListItem — row + drawer                                     */
/* ------------------------------------------------------------------ */

function PositionListItem({
  row,
  onTransfer,
  open: detailOpen,
  onToggle,
}: {
  row: PositionRow;
  onTransfer: (venue: TradingWalletVenue) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const closeId = row.symbol.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  // Track hover on the row so the ThinkingGlow behind the ask-agent
  // button can `active`-gate its render loop. State (not CSS-only
  // group-hover) because the glow's WebGL rAF needs an explicit
  // boolean to start/stop — paint-cost reasons.
  const [hovered, setHovered] = useState(false);
  // Local-only close. Persisted to localStorage so the row stays
  // closed when the sheet re-opens.
  const [closed, setClosed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return (
        window.localStorage
          .getItem("wf-shells-portfolio-closed")
          ?.split(",")
          .includes(closeId) ?? false
      );
    } catch {
      return false;
    }
  });
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const closePosition = () => {
    setConfirmCloseOpen(false);
    triggerDopamine("sell-green");
    setClosed(true);
    try {
      const key = "wf-shells-portfolio-closed";
      const cur = window.localStorage.getItem(key) ?? "";
      const set = new Set(cur.split(",").filter(Boolean));
      set.add(closeId);
      window.localStorage.setItem(key, Array.from(set).join(","));
    } catch {
      /* ignore */
    }
  };
  const transferVenue: TradingWalletVenue | null =
    row.venue === "Hyperliquid"
      ? "hyperliquid"
      : row.venue === "Polymarket"
        ? "polymarket"
        : null;
  const isPerp = row.kind === "perp";
  const marketLookupId = isPerp
    ? row.symbol.toLowerCase().replace(/-perp$/, "")
    : null;
  const matchingMarket = marketLookupId
    ? MARKETS.find((m) => m.id === marketLookupId)
    : null;
  const { setActiveMarket } = useActiveMarket();
  const openOnChart = () => {
    if (matchingMarket) setActiveMarket(matchingMarket);
  };
  const isUp = row.pnlPct >= 0;
  const hasPnl = row.pnlPct !== 0;
  const wantsSideChip = isPerp || row.kind === "prediction";
  const sideLabel = !wantsSideChip
    ? null
    : row.side === "long"
      ? "Long"
      : row.side === "short"
        ? "Short"
        : row.side === "yes"
          ? "Yes"
          : row.side === "no"
            ? "No"
            : null;
  const sidePositive = row.side === "long" || row.side === "yes";
  const sideNegative = row.side === "short" || row.side === "no";
  const pnlUsd = hasPnl ? (row.value * row.pnlPct) / (100 + row.pnlPct) : 0;
  const pnlTone = !hasPnl
    ? "text-muted-foreground"
    : isUp
      ? "text-primary"
      : "text-tone-down";
  const margin =
    isPerp && row.leverage ? row.value / row.leverage : null;
  const isSpotOrCash = row.kind === "spot" || row.kind === "cash";
  const subtitle = isPerp
    ? `${row.mode === "cross" ? "Cross" : "Isolated"} ${row.leverage}x${
        margin !== null
          ? ` · $${Math.round(margin).toLocaleString("en-US")} margin`
          : ""
      }`
    : isSpotOrCash
      ? row.symbol
      : row.kind === "prediction"
        ? [
            row.volume !== undefined
              ? `$${compactUsd(row.volume)} Vol`
              : null,
            row.expiresAt ?? null,
          ]
            .filter(Boolean)
            .join(" · ") || null
        : null;
  const rowTitle = isSpotOrCash && row.name ? row.name : row.symbol;
  const liqBuffer =
    isPerp && row.liq !== undefined && row.entry !== undefined
      ? Math.abs(((row.liq - row.entry) / row.entry) * 100)
      : null;
  const liqDanger = liqBuffer !== null && liqBuffer < 10;
  const accruedText =
    row.fundingAccruedUsd !== undefined
      ? `${row.fundingAccruedUsd >= 0 ? "+" : "−"}$${Math.abs(row.fundingAccruedUsd).toFixed(2)}`
      : null;
  const accruedTone =
    row.fundingAccruedUsd === undefined
      ? "text-muted-foreground"
      : row.fundingAccruedUsd >= 0
        ? "text-primary"
        : "text-tone-down";

  const rowBody = (
    <>
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-full text-caption font-semibold"
        style={{ background: row.bg, color: row.fg }}
      >
        {row.glyph}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-body font-medium text-foreground">
              {rowTitle}
            </span>
            {sideLabel && (
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-micro font-semibold uppercase tracking-wide",
                  sidePositive && "bg-primary/15 text-primary",
                  sideNegative && "bg-tone-down/15 text-tone-down",
                )}
              >
                {sideLabel}
              </span>
            )}
          </div>
          <span className="shrink-0 text-body font-semibold tabular-nums text-foreground">
            {USD.format(row.value)}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-body text-muted-foreground">
            {subtitle ?? ""}
          </span>
          {!hasPnl ? (
            <span className="shrink-0 text-body tabular-nums text-muted-foreground">
              —
            </span>
          ) : (
            <div className="flex shrink-0 items-baseline gap-1.5">
              <span className={cn("text-body tabular-nums", pnlTone)}>
                {isUp ? "+" : "−"}
                {Math.abs(row.pnlPct).toFixed(2)}%
              </span>
              <span className="text-body tabular-nums text-muted-foreground">
                {isUp ? "+" : "−"}$
                {Math.round(Math.abs(pnlUsd)).toLocaleString("en-US")}
              </span>
            </div>
          )}
        </div>
      </div>
      {/* Spacer pushes the right-side value + pnl numbers leftward
          on row hover, opening a slot for the Wayfinder button. */}
      <AskAgentSpacer visible={hovered} />
    </>
  );

  return (
    <li
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group/posrow relative flex flex-col overflow-hidden transition-[opacity,max-height,background-color,box-shadow] duration-300 ease-out",
        detailOpen && "rounded-lg bg-white/[0.03]",
        closed
          ? "pointer-events-none max-h-0 opacity-0"
          : "max-h-[640px] opacity-100",
      )}
    >
      {/* Header row + ask-agent affordance share a relative wrapper
          so the affordance anchors to the header's bounds, not the
          full <li>. Without this the affordance's `inset-y-0` spans
          the expanded drawer too — vertically centering the button
          in the middle of the open card. The wrapper pins it to the
          top-right whether the drawer is open or closed. */}
      <div className="relative">
        {!closed ? (
          <button
            type="button"
            aria-label={`Open ${row.symbol} options`}
            aria-expanded={detailOpen}
            data-demo={`expand-position-${closeId}`}
            onClick={onToggle}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors duration-150 ease-out",
              // Drive the row bg from the JS `hovered` state — not
              // CSS :hover — so the highlight persists when the
              // cursor moves off the row button onto the absolutely-
              // positioned ask-agent affordance (which lives inside
              // the <li> but outside this <button>).
              !detailOpen && hovered && "bg-surface-1",
            )}
          >
            {rowBody}
          </button>
        ) : (
          <div className="flex items-center gap-3 px-3 py-3">{rowBody}</div>
        )}

        {/* Ask-agent affordance — same shape language as the Gut
            Check button. Wayfinder icon button reveals on hover,
            with the ThinkingGlow blooming in from the right
            behind it. */}
        {!closed && (
          <AskAgentAffordance
            payload={{ kind: "position", row }}
            ariaLabel={`Ask agent about ${row.symbol}`}
            visible={hovered}
          />
        )}
      </div>

      {/* Inline drawer */}
      <div
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-strong)]",
          detailOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">
          <div className="px-3 pb-3">
            {isPerp && (
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-body tabular-nums">
                {row.entry !== undefined && (
                  <>
                    <dt className="text-muted-foreground">Entry</dt>
                    <dd className="text-right text-foreground">
                      $
                      {row.entry.toLocaleString("en-US", {
                        maximumFractionDigits: 2,
                      })}
                    </dd>
                  </>
                )}
                {row.size !== undefined && (
                  <>
                    <dt className="text-muted-foreground">Size</dt>
                    <dd className="text-right text-foreground">
                      {row.size}{" "}
                      <span className="text-muted-foreground">
                        {row.symbol.replace(/-PERP$/i, "")}
                      </span>
                    </dd>
                  </>
                )}
                {row.liq !== undefined && (
                  <>
                    <dt className="text-muted-foreground">Liq</dt>
                    <dd className="text-right">
                      <span
                        className={cn(
                          "text-foreground",
                          liqDanger && "text-tone-down",
                        )}
                      >
                        ${Math.round(row.liq).toLocaleString("en-US")}
                      </span>
                      {liqBuffer !== null && (
                        <span
                          className={cn(
                            "text-muted-foreground",
                            liqDanger && "text-tone-down/80",
                          )}
                        >
                          {" "}
                          · {liqBuffer.toFixed(0)}% buffer
                        </span>
                      )}
                    </dd>
                  </>
                )}
                {row.fundingApr && (
                  <>
                    <dt className="text-muted-foreground">Funding</dt>
                    <dd className="text-right">
                      <span className="text-foreground">
                        {row.fundingApr} APR
                      </span>
                      {accruedText && (
                        <span className={cn("ml-1", accruedTone)}>
                          · {accruedText}
                        </span>
                      )}
                    </dd>
                  </>
                )}
                <dt className="text-muted-foreground">TP / SL</dt>
                <dd className="text-right text-foreground">
                  {row.tpSl ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </dl>
            )}

            {/* Per-kind action buttons */}
            {isPerp && (
              <>
                <div className="mt-3 flex gap-1.5">
                  <SubduedButton
                    aria-label={`View ${row.symbol} on chart`}
                    data-demo={`chart-position-${closeId}`}
                    onClick={openOnChart}
                    disabled={!matchingMarket}
                    className="h-10 flex-1 px-2 font-semibold"
                  >
                    Chart
                  </SubduedButton>
                  <SubduedButton className="h-10 flex-1 px-2 font-semibold">
                    TP/SL
                  </SubduedButton>
                  <SubduedButton
                    aria-label={`Transfer to / from ${row.venue} trading wallet`}
                    onClick={() => transferVenue && onTransfer(transferVenue)}
                    disabled={!transferVenue}
                    className="h-10 flex-1 px-2 font-semibold"
                  >
                    Transfer
                  </SubduedButton>
                </div>

                <button
                  type="button"
                  aria-label={`Close ${row.symbol} position`}
                  data-demo={`close-position-${closeId}`}
                  onClick={() => setConfirmCloseOpen(true)}
                  className="mt-1.5 inline-flex h-10 w-full items-center justify-center rounded-md bg-tone-down px-2 text-body font-semibold text-[#0e1111] transition-[background-color,scale] duration-150 ease-out hover:bg-tone-down/90 active:scale-[0.98]"
                >
                  Close position
                </button>
              </>
            )}

            {row.kind === "spot" && (
              <div className="mt-3 flex gap-1.5">
                {matchingMarket && (
                  <SubduedButton
                    aria-label={`View ${row.symbol} on chart`}
                    onClick={openOnChart}
                    className="h-10 flex-1 px-2 font-semibold"
                  >
                    Chart
                  </SubduedButton>
                )}
                <SubduedButton className="h-10 flex-1 px-2 font-semibold">
                  Swap
                </SubduedButton>
                <SubduedButton className="h-10 flex-1 px-2 font-semibold">
                  Send
                </SubduedButton>
                <SubduedButton className="h-10 flex-1 px-2 font-semibold">
                  Receive
                </SubduedButton>
              </div>
            )}

            {row.kind === "cash" && (
              <div className="mt-3 flex gap-1.5">
                <SubduedButton className="h-10 flex-1 px-2 font-semibold">
                  Send
                </SubduedButton>
                <SubduedButton className="h-10 flex-1 px-2 font-semibold">
                  Receive
                </SubduedButton>
              </div>
            )}

            {row.kind === "prediction" && (
              <div className="mt-3 flex gap-1.5">
                <SubduedButton
                  aria-label={`View ${row.symbol} on Polymarket`}
                  className="h-10 flex-1 px-2 font-semibold"
                >
                  View
                </SubduedButton>
                <SubduedButton className="h-10 flex-1 px-2 font-semibold">
                  Buy
                </SubduedButton>
                <button
                  type="button"
                  aria-label={`Sell ${row.symbol} position`}
                  onClick={() => setConfirmCloseOpen(true)}
                  className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-tone-down px-2 text-body font-semibold text-[#0e1111] transition-[background-color,scale] duration-150 ease-out hover:bg-tone-down/90 active:scale-[0.96]"
                >
                  Sell
                </button>
              </div>
            )}

            {(isPerp || row.kind === "prediction") && (
              <ConfirmDialog
                open={confirmCloseOpen}
                onOpenChange={setConfirmCloseOpen}
                title={`${isPerp ? "Close" : "Sell"} ${row.symbol}?`}
                description={
                  isPerp
                    ? "Closing markets the position at the current price. This can't be undone."
                    : "Selling exits the position at the current market price. This can't be undone."
                }
                confirmLabel={
                  isPerp
                    ? `Yes, close ${row.symbol}`
                    : `Yes, sell ${row.symbol}`
                }
                onConfirm={closePosition}
                confirmDemoId={`confirm-close-position-${closeId}`}
              />
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
