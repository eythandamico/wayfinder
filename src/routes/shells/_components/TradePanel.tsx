"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { ArrowDownUp, Check, Link2, Loader2, Search, Vote, X } from "lucide-react";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { cn } from "@/lib/utils";
import { AskAgentButton } from "./AskAgentAffordance";
import { MARKETS } from "../_data/markets";
import type { Market } from "../_types";
import { useFloatingPopover } from "../_hooks/useFloatingPopover";
import { useLayoutDispatch } from "../_layout/LayoutContext";
import {
  useActiveMarket,
  useMainChart,
  usePredictionTicket,
  useWalletConnection,
  type PredictionTarget,
} from "../_state/shells-context";
import { TRADE_SIDE_EVENT } from "../_hooks/useShellsKeyboard";
import { CheckIcon, ChevronDownIcon } from "./icons";
import {
  GUT_CHECK_EVENT,
  type GutCheckSnapshot,
} from "../_lib/gut-check";
import { ThinkingGlow } from "./ThinkingGlow";
import { TokenLogo } from "./TokenLogo";

const MARGIN_OPTIONS = ["Cross", "Isolated"] as const;
const ORDER_TYPE_OPTIONS = ["Market", "Limit", "Stop Market", "Stop Limit"] as const;
const LEVERAGE_MIN = 1;
const LEVERAGE_MAX = 50;

type MarginOption = (typeof MARGIN_OPTIONS)[number];
type OrderTypeOption = (typeof ORDER_TYPE_OPTIONS)[number];

/** Mock open positions keyed by market id. When the active market has
 *  a position here AND the user picks the opposite side on the ticket,
 *  the panel switches to "Reduce {dir}" mode — Position + Closeable
 *  stats, Reduce-only caption, mint CTA. Production would source
 *  this from the actual positions feed. */
type MockPosition = {
  side: "long" | "short";
  size: number;
  ticker: string;
};
const MOCK_POSITIONS: Record<string, MockPosition> = {
  btc: { side: "short", size: 0.092, ticker: "BTC" },
  eth: { side: "short", size: 0.34, ticker: "ETH" },
};

type TradeMode = "perp" | "prediction" | "swap";

export function TradePanel() {
  const [mode, setMode] = useState<TradeMode>("perp");
  const { activeMarket, setActiveMarket } = useActiveMarket();
  const { connected, connect } = useWalletConnection();
  const [side, setSide] = useState<"long" | "short">("long");
  const [size, setSize] = useState("0.00");
  const [pct, setPct] = useState(0);
  const [margin, setMargin] = useState<MarginOption>("Cross");
  const [leverage, setLeverage] = useState<number>(40);
  const [orderType, setOrderType] = useState<OrderTypeOption>("Market");
  // Asset picker for the size input — switch between the market's
  // base asset (BTC, ETH, …) and USD notional. Click-outside lives
  // inside SizeInputWithDenom now so it can see both the trigger
  // wrapper and the portal'd popover (a single ref couldn't).
  const [sizeDenom, setSizeDenom] = useState<"asset" | "usd">("asset");
  const [denomOpen, setDenomOpen] = useState(false);
  // Trade-side "analysing" state — the panel's ThinkingGlow rises
  // while the agent is checking the trade. Mirrors the chat panel's
  // ~1.8s analysis window so both surfaces fade together.
  const [analyzing, setAnalyzing] = useState(false);
  const analyzingTimer = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (analyzingTimer.current) window.clearTimeout(analyzingTimer.current);
    };
  }, []);

  // Risk summary appears once the user expresses an order — empty rows would
  // otherwise eat ~80px of vertical space on short viewports.
  const hasIntent = pct > 0 || parseFloat(size) > 0;

  // Listen for `b` / `s` keyboard shortcuts.
  useEffect(() => {
    const onSideEvent = (e: Event) => {
      const detail = (e as CustomEvent<{ side: "long" | "short" }>).detail;
      if (detail?.side === "long" || detail?.side === "short") {
        setSide(detail.side);
      }
    };
    window.addEventListener(TRADE_SIDE_EVENT, onSideEvent);
    return () => window.removeEventListener(TRADE_SIDE_EVENT, onSideEvent);
  }, []);

  // Polymarket integration — when the user clicks an outcome on
  // the PolymarketPanel, ShellsContext.predictionTarget gets set.
  // Auto-switch the ticket into Prediction mode so the click feels
  // immediate: clicking "Switzerland 1¢" → ticket pops into focus
  // already populated.
  const { target: predictionTarget } = usePredictionTicket();
  const predictionKey = predictionTarget
    ? `${predictionTarget.eventId}::${predictionTarget.optionLabel ?? ""}::${predictionTarget.initialSide}`
    : null;
  useEffect(() => {
    if (predictionKey && mode !== "prediction") {
      setMode("prediction");
    }
    // Only re-run when the loaded market changes — not when the user
    // manually flips mode after the fact.
  }, [predictionKey]);

  // Reduce-mode kicks in when the active market has a position whose
  // side is opposite the ticket's selected side. Picking the same
  // side as the position falls through to a normal add-to-position
  // (open) flow.
  const position = MOCK_POSITIONS[activeMarket.id] ?? null;
  const isReducing = position !== null && position.side !== side;
  // Remaining contract size if the user submitted at the current %.
  const sliceSize = position ? (position.size * pct) / 100 : 0;
  const remaining = position ? Math.max(0, position.size - sliceSize) : 0;
  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <TradeModeTabs mode={mode} onChange={setMode} />

      {/* Gut Check glow — mini ThinkingGlow living on the panel
          background, confined to the bottom-right corner so it
          haloes the Gut Check button. `sides="right"` switches the
          shader to an L-shape (bottom edge + right rise only)
          instead of the chat panel's U-shape. Only activates in
          perp mode where the Gut Check button is mounted — the
          ThinkingGlow handles the grow-in/grow-out motion off
          `active`, so it shrinks back into the corner when the
          user switches to prediction or swap. */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 z-0 h-1/2 w-2/3"
      >
        <ThinkingGlow
          active={mode === "perp" && hasIntent && connected}
          heightClass="h-full"
          sides="right"
        />
      </div>


      {mode === "prediction" ? (
        <PredictionTicket target={predictionTarget} />
      ) : mode === "swap" ? (
        <SwapTicket />
      ) : (
      <>
      {/* Header — side toggle leads the panel. Margin + Order Type
          chips used to live here but they're rarely changed; they
          now sit just above the CTA so the top of the panel goes
          straight to the decision the user is actually making. */}
      <div className="relative z-[1] shrink-0 px-3 pt-3">
        <div
          role="group"
          aria-label="Trade side"
          className="grid grid-cols-2 gap-1 rounded-lg bg-surface-1 p-1"
        >
          <SideButton
            active={side === "long"}
            onClick={() => setSide("long")}
            label="Long"
            direction="up"
            demoId="trade-side-long"
          />
          <SideButton
            active={side === "short"}
            onClick={() => setSide("short")}
            label="Short"
            direction="down"
            demoId="trade-side-short"
          />
        </div>
      </div>

      {/* Body — stats + size + risk; only this region scrolls when cramped */}
      <div className="scroll-thin relative z-[1] flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
        {isReducing && position ? (
          // Reduce mode — one dynamic line that reads "what's there
          // now → what's left after this slice". The arrow + after
          // value only appear once the slider engages so 0% doesn't
          // produce two copies of the same number. At 100% the
          // after-value becomes "Flat" so the user sees the outcome
          // explicitly rather than "0.000 left".
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-body">
            <span className="inline-flex items-baseline gap-1.5">
              <span className="text-muted-foreground">Open</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  position.side === "long" ? "text-primary" : "text-tone-down",
                )}
              >
                {position.side === "long" ? "Long" : "Short"}{" "}
                {position.size.toFixed(3)}
              </span>
            </span>
            {pct > 0 && (
              <span className="inline-flex items-baseline gap-1.5 text-muted-foreground">
                <span aria-hidden>→</span>
                <span className="font-medium tabular-nums text-foreground">
                  {pct >= 100 ? "Flat" : `${remaining.toFixed(3)} left`}
                </span>
              </span>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-body">
            <span className="inline-flex items-baseline gap-1.5">
              <span className="text-muted-foreground">Available</span>
              <span className="tabular-nums text-foreground">$0.00</span>
              <span className="text-muted-foreground">USDC</span>
            </span>
            <span className="inline-flex items-baseline gap-1.5">
              <span className="text-muted-foreground">Open</span>
              <span className="tabular-nums text-foreground">
                {position
                  ? `${position.side === "long" ? "Long" : "Short"} ${position.size}`
                  : "None"}
              </span>
              {!position && (
                <span className="text-muted-foreground">
                  0 {activeMarket.iconChar === "₿" ? "BTC" : activeMarket.symbol.split("-")[0]}
                </span>
              )}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="trade-size"
              className="text-body text-muted-foreground"
            >
              Size
            </label>
            <span
              aria-hidden
              className="text-body tabular-nums text-muted-foreground"
            >
              ≈ $0.00
            </span>
          </div>
          <SizeInputWithDenom
            size={size}
            onSize={setSize}
            denom={sizeDenom}
            onDenom={setSizeDenom}
            open={denomOpen}
            onOpen={setDenomOpen}
            activeMarket={activeMarket}
            onPickMarket={setActiveMarket}
          />

          <SliderValueRow
            id="size-slider"
            value={pct}
            min={0}
            max={100}
            step={1}
            onChange={setPct}
            ariaLabel="Position size percentage"
            suffix="%"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-body text-muted-foreground">Leverage</span>
          <SliderValueRow
            id="leverage-slider"
            value={leverage}
            min={LEVERAGE_MIN}
            max={LEVERAGE_MAX}
            step={1}
            onChange={setLeverage}
            ariaLabel="Leverage"
            suffix="x"
            accent
          />
        </div>

        {/* Removed:
              - Liquidation / Order Value / Margin row (always "—")
              - Leverage-tier risk callout
            Both responsibilities move to the Gut Check — the agent
            surfaces leverage risk and order-value math in context,
            with full color/tone treatment, so we no longer need
            the static visualisation here. */}
      </div>

      {/* Footer — Margin + Order Type chips ride just above the CTA
          (set-once config grouped with "send" controls rather than
          dominating the top of the panel). Then the Place / Reduce
          CTA, with the Gut Check button to the right when the
          ticket has intent. */}
      <div className="relative z-[1] flex shrink-0 flex-col gap-2 px-3 pb-3">
        <div className="flex items-center gap-1.5">
          <CompactSettingChip
            label={margin}
            ariaLabel="Margin mode"
            options={[...MARGIN_OPTIONS]}
            onChange={(v) => setMargin(v as MarginOption)}
          />
          <CompactSettingChip
            label={orderType}
            ariaLabel="Order type"
            options={[...ORDER_TYPE_OPTIONS]}
            onChange={(v) => setOrderType(v as OrderTypeOption)}
          />
        </div>
        <div className="flex items-stretch gap-2">
        {connected ? (
          <button
            type="button"
            data-demo="trade-place"
            disabled={!hasIntent}
            className={cn(
              "group relative inline-flex h-12 flex-1 items-center justify-center overflow-hidden rounded-lg text-body font-semibold transition-[filter,background-color,color,scale] duration-150 ease-out enabled:hover:brightness-[1.04] enabled:active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-disabled",
              hasIntent &&
                (isReducing
                  ? "bg-primary text-primary-foreground"
                  : side === "long"
                    ? "bg-primary text-primary-foreground"
                    : "bg-tone-down text-tone-down-foreground"),
            )}
          >
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-white/40 to-transparent",
                !hasIntent && "opacity-0",
              )}
            />
            <span className="relative inline-flex items-center justify-center">
              {isReducing && position
                ? `Reduce ${position.side === "long" ? "Long" : "Short"}`
                : `Place Market ${side === "long" ? "Long" : "Short"}`}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={connect}
            className="group relative inline-flex h-12 flex-1 items-center justify-center overflow-hidden rounded-lg bg-primary text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.96]"
          >
            Connect to trade
          </button>
        )}

        {hasIntent && connected && (
          <GutCheckButton
            analyzing={analyzing}
            onCheck={() => {
              const snapshot: GutCheckSnapshot = {
                side,
                size,
                pct,
                leverage,
                margin,
                orderType,
                marketSymbol: activeMarket.symbol.split("-")[0],
                marketDisplay: activeMarket.symbol,
                isReducing,
                positionSide: position?.side,
                positionSize: position?.size,
              };
              window.dispatchEvent(
                new CustomEvent<GutCheckSnapshot>(GUT_CHECK_EVENT, {
                  detail: snapshot,
                }),
              );
              setAnalyzing(true);
              if (analyzingTimer.current)
                window.clearTimeout(analyzingTimer.current);
              analyzingTimer.current = window.setTimeout(() => {
                setAnalyzing(false);
                analyzingTimer.current = null;
              }, 1800);
            }}
          />
        )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}

function TradeModeTabs({
  mode,
  onChange,
}: {
  mode: TradeMode;
  onChange: (m: TradeMode) => void;
}) {
  const items: { id: TradeMode; label: string }[] = [
    { id: "perp", label: "Perp" },
    { id: "prediction", label: "Prediction" },
    { id: "swap", label: "Swap" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Order kind"
      className="relative mx-3 mt-3 grid shrink-0 grid-cols-3 gap-1 rounded-md bg-surface-1 p-0.5"
    >
      {items.map((it) => {
        const active = mode === it.id;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={cn(
              "relative flex h-8 items-center justify-center rounded-sm text-body transition-[color,scale] duration-150 ease-out active:scale-[0.96]",
              active
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {/* Single shared indicator — FLIP-animated between
                buttons via layoutId. The bg-surface-3 pill slides
                under the new active tab instead of crossfading. */}
            {active && (
              <motion.span
                layoutId="trade-mode-active"
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
            <span className="relative z-[1]">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Prediction ticket — wired to PolymarketPanel via ShellsContext      */
/* ------------------------------------------------------------------ */

const QUICK_AMOUNTS = [5, 25, 100, 500] as const;
const SUBMIT_DELAY_MS = 700;

type TicketStatus =
  | { phase: "idle" }
  | { phase: "placing" }
  | { phase: "placed"; fill: PredictionFill };

type PredictionFill = {
  side: "yes" | "no";
  /** Effective fill price 0-1. */
  price: number;
  /** Number of shares purchased. */
  shares: number;
  /** USD spent. */
  usd: number;
  /** Snapshot of the option label so the receipt persists after the
   *  user navigates to a different market. */
  optionLabel: string;
  placedAt: number;
};

/** Prediction-market ticket. Driven by ShellsContext.predictionTarget —
 *  populated when the user clicks an outcome on the PolymarketPanel.
 *
 *  Lifecycle: empty → loaded (idle) → placing → placed (receipt). The
 *  "placed" state shows shares/payout/profit, then offers a one-tap
 *  reset back to idle to trade another size. Selecting a new market
 *  resets the entire ticket. */
function PredictionTicket({ target }: { target: PredictionTarget | null }) {
  const { clearTarget } = usePredictionTicket();
  const { connected, connect } = useWalletConnection();
  const layoutDispatch = useLayoutDispatch();

  // Adds a Polymarket panel to the layout so the user can browse +
  // pick a market without leaving the trade flow. Uses the
  // "ifMissing" variant so repeat clicks don't stack duplicate
  // panels — if one's already in the workspace, the dispatch is a
  // no-op and the existing panel keeps its market list.
  const addPolymarketPanel = () => {
    if (!layoutDispatch) return;
     
    const id = `polymarket-${Date.now()}`;
    layoutDispatch({
      type: "addPanelIfMissing",
      panel: { id, type: "polymarket" },
    });
  };

  const [side, setSide] = useState<"yes" | "no">(target?.initialSide ?? "yes");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<TicketStatus>({ phase: "idle" });

  // Reset amount + status when the loaded market or option changes —
  // keyed on eventId+optionLabel so toggling Yes/No within the ticket
  // doesn't clobber a typed amount. (Side syncing is handled by the
  // second effect below so re-picking the same market with a different
  // side from the panel still flips the ticket.)
  const marketKey = target
    ? `${target.eventId}::${target.optionLabel ?? ""}`
    : null;
  useEffect(() => {
    setAmount("");
    setStatus({ phase: "idle" });
  }, [marketKey]);

  // Sync side from the target on every panel click. We key on the
  // target object identity (not just initialSide) so re-clicking the
  // same button after the user manually flipped sides inside the ticket
  // still snaps back to the panel's pick.
  useEffect(() => {
    if (target) setSide(target.initialSide);
  }, [target]);

  if (!target) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10 text-center">
        <div className="flex max-w-[260px] flex-col items-center gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-body font-medium text-foreground">
              Pick a market to start
            </p>
            <p className="text-caption text-muted-foreground">
              Click any outcome in the Polymarket panel to load it here.
            </p>
          </div>
          {layoutDispatch && (
            <button
              type="button"
              onClick={addPolymarketPanel}
              className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-caption font-medium text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-4 active:scale-[0.96]"
            >
              <Vote aria-hidden className="size-3.5" strokeWidth={2} />
              Open Polymarket panel
            </button>
          )}
        </div>
      </div>
    );
  }

  const yesPrice = clamp01(target.yesPrice);
  const noPrice = clamp01(1 - target.yesPrice);
  const price = side === "yes" ? yesPrice : noPrice;
  const usd = Math.max(0, parseFloat(amount) || 0);
  const shares = usd > 0 && price > 0 ? usd / price : 0;
  const payout = shares; // each share resolves to $1 if correct
  const profit = payout - usd;

  const submit = () => {
    if (status.phase !== "idle" || usd <= 0) return;
    setStatus({ phase: "placing" });
    window.setTimeout(() => {
      setStatus({
        phase: "placed",
        fill: {
          side,
          price,
          shares,
          usd,
          optionLabel: target.optionLabel ?? (side === "yes" ? "Yes" : "No"),
          placedAt: Date.now(),
        },
      });
    }, SUBMIT_DELAY_MS);
  };

  return (
    <>
      {/* Loaded-market header — thumbnail + question + option, with a
          dismiss affordance so the user can clear the ticket. */}
      <div className="mx-3 mt-3 flex shrink-0 items-start gap-2.5 rounded-lg bg-surface-1 p-3">
        <PredictionThumb target={target} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="line-clamp-2 text-body font-medium leading-tight text-foreground text-pretty">
            {target.eventTitle}
          </p>
          {target.optionLabel && (
            <p className="truncate text-caption text-muted-foreground">
              On{" "}
              <span className="text-foreground">{target.optionLabel}</span>
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Clear ticket"
          onClick={clearTarget}
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <X className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>

      {/* Yes / No side selector with live prices. */}
      <div className="mt-3 shrink-0 px-3">
        <div
          role="group"
          aria-label="Prediction side"
          className="grid grid-cols-2 gap-1 rounded-lg bg-surface-1 p-1"
        >
          <button
            type="button"
            aria-pressed={side === "yes"}
            disabled={status.phase !== "idle"}
            onClick={() => setSide("yes")}
            className={cn(
              "flex h-10 items-center justify-center gap-1.5 rounded-md text-body font-semibold transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96] disabled:opacity-50",
              side === "yes"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            Yes
            <span className="tabular-nums">{centsLabel(yesPrice)}</span>
          </button>
          <button
            type="button"
            aria-pressed={side === "no"}
            disabled={status.phase !== "idle"}
            onClick={() => setSide("no")}
            className={cn(
              "flex h-10 items-center justify-center gap-1.5 rounded-md text-body font-semibold transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96] disabled:opacity-50",
              side === "no"
                ? "bg-tone-down text-tone-down-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            No
            <span className="tabular-nums">{centsLabel(noPrice)}</span>
          </button>
        </div>
      </div>

      {status.phase === "placed" ? (
        <PredictionReceipt
          fill={status.fill}
          onReset={() => {
            setAmount("");
            setStatus({ phase: "idle" });
          }}
        />
      ) : (
        <>
          {/* Body — amount + quick chips + summary */}
          <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="prediction-amount"
                  className="text-body text-muted-foreground"
                >
                  Amount
                </label>
                {shares > 0 && (
                  <span className="text-caption tabular-nums text-muted-foreground">
                    {formatShares(shares)} shares
                  </span>
                )}
              </div>
              <div className="flex h-12 items-center gap-2.5 rounded-lg bg-white/5 px-3.5 transition-[background-color,box-shadow] duration-150 ease-out focus-within:bg-white/[0.07] focus-within:ring-2 focus-within:ring-primary/30">
                <span aria-hidden className="text-body text-muted-foreground">
                  $
                </span>
                <input
                  id="prediction-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) =>
                    setAmount(sanitizeAmount(e.target.value))
                  }
                  disabled={status.phase !== "idle"}
                  className="min-w-0 flex-1 bg-transparent text-body tabular-nums text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
                />
                <span aria-hidden className="text-body text-muted-foreground">
                  USDC
                </span>
              </div>
              <div className="flex items-center gap-1">
                {QUICK_AMOUNTS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={status.phase !== "idle"}
                    onClick={() => setAmount(String(v))}
                    className="h-7 flex-1 rounded-md bg-surface-1 text-caption font-medium tabular-nums text-muted-foreground transition-colors hover:bg-surface-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-50"
                  >
                    ${v}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary — only renders when the user has expressed an
                amount. Below 0 we skip to keep the panel quiet. */}
            {usd > 0 && (
              <div className="flex flex-col gap-1.5 rounded-lg bg-white/[0.03] p-3 text-body">
                <SummaryRow
                  label="Avg price"
                  value={centsLabel(price)}
                />
                <SummaryRow
                  label="Shares"
                  value={`${formatShares(shares)} ${side.toUpperCase()}`}
                />
                <SummaryRow
                  label="Max payout"
                  value={`$${formatUsd(payout)}`}
                />
                <SummaryRow
                  label="Profit if correct"
                  value={`+$${formatUsd(profit)}`}
                  tone="primary"
                />
              </div>
            )}
          </div>

          {/* Footer — Buy CTA / Connect-to-trade fallback */}
          <div className="shrink-0 px-3 pb-3">
            {!connected ? (
              <button
                type="button"
                onClick={connect}
                className="group relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-lg bg-primary text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.96]"
              >
                Connect to trade prediction
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={status.phase !== "idle" || usd <= 0}
                aria-busy={status.phase === "placing"}
                className={cn(
                  "group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-lg text-body font-semibold transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50",
                  side === "yes"
                    ? "bg-primary text-primary-foreground"
                    : "bg-tone-down text-tone-down-foreground",
                )}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-white/40 to-transparent"
                />
                {status.phase === "placing" ? (
                  <>
                    <Loader2
                      className="size-4 animate-spin"
                      strokeWidth={2.25}
                      aria-hidden
                    />
                    <span className="relative">Placing order…</span>
                  </>
                ) : (
                  <span className="relative">
                    {usd > 0
                      ? `Buy ${side === "yes" ? "Yes" : "No"} · $${formatUsd(usd)}`
                      : `Buy ${side === "yes" ? "Yes" : "No"}`}
                  </span>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}

function PredictionThumb({ target }: { target: PredictionTarget }) {
  const [errored, setErrored] = useState(false);
  const src = target.optionIcon ?? target.eventImage;
  if (!src || errored) {
    return (
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-2 text-body font-semibold text-muted-foreground ring-1 ring-inset ring-white/[0.06]"
      >
        {(target.optionLabel ?? target.eventTitle).slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-surface-1 ring-1 ring-inset ring-white/[0.06]">
      <img
        src={src}
        alt=""
        className="absolute inset-0 size-full object-cover"
        onError={() => setErrored(true)}
      />
    </span>
  );
}

function PredictionReceipt({
  fill,
  onReset,
}: {
  fill: PredictionFill;
  onReset: () => void;
}) {
  const profit = fill.shares - fill.usd;
  return (
    <>
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
        <div className="flex flex-col items-center gap-2 rounded-lg bg-primary/10 p-4 text-center ring-1 ring-inset ring-primary/20">
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground"
          >
            <Check className="size-5" strokeWidth={2.5} />
          </span>
          <p className="text-body font-semibold text-foreground">
            Order filled
          </p>
          <p className="text-caption text-muted-foreground">
            {formatShares(fill.shares)} {fill.side === "yes" ? "YES" : "NO"} ·{" "}
            {fill.optionLabel}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 rounded-lg bg-white/[0.03] p-3 text-body">
          <SummaryRow label="Spent" value={`$${formatUsd(fill.usd)}`} />
          <SummaryRow
            label="Avg price"
            value={centsLabel(fill.price)}
          />
          <SummaryRow
            label="Payout if correct"
            value={`$${formatUsd(fill.shares)}`}
          />
          <SummaryRow
            label="Profit"
            value={`+$${formatUsd(profit)}`}
            tone="primary"
          />
        </div>
      </div>
      <div className="shrink-0 px-3 pb-3">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-lg bg-surface-2 text-body font-semibold text-foreground transition-[filter,scale] duration-150 ease-out hover:bg-surface-4 active:scale-[0.96]"
        >
          Trade another
        </button>
      </div>
    </>
  );
}

function SummaryRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          tone === "primary" ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* Helpers — kept local so the math is co-located with the ticket. */
function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
function centsLabel(p: number): string {
  // Polymarket displays sub-1¢ prices as fractions; we round to the
  // nearest cent for the ticket since fractions of a cent are noise
  // for a UI that's already simulating fills.
  const c = Math.round(clamp01(p) * 100);
  return `${c}¢`;
}
function formatShares(n: number): string {
  if (n >= 1000) return n.toFixed(0);
  if (n >= 10) return n.toFixed(1);
  return n.toFixed(2);
}
function formatUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 10000) return n.toFixed(0);
  return n.toFixed(2);
}
function sanitizeAmount(v: string): string {
  // Only digits + at most one decimal; max 8 chars to keep the input
  // visually tidy without truncating real bets.
  const cleaned = v.replace(/[^\d.]/g, "");
  const firstDot = cleaned.indexOf(".");
  const out =
    firstDot === -1
      ? cleaned
      : cleaned.slice(0, firstDot + 1) +
        cleaned.slice(firstDot + 1).replace(/\./g, "");
  return out.slice(0, 10);
}

/* -------------------------------------------------------------- */
/*  Swap ticket                                                   */
/* -------------------------------------------------------------- */

/** Tokens you can swap. USDC is the implicit stable counterparty;
 *  everything else is a base asset borrowed from the perp/spot
 *  market catalog (BTC, ETH, ...). The discriminated union keeps
 *  the picker, formatters, and rate math from having to special-case
 *  USDC at every call site. */
type SwapToken =
  | { kind: "usdc" }
  | { kind: "market"; market: Market };

const USDC_TOKEN: SwapToken = { kind: "usdc" };

/** Mock wallet balances keyed by token id. Real implementation reads
 *  from the wallet positions feed. */
const MOCK_BALANCES: Record<string, number> = {
  usdc: 1250.0,
  btc: 0.0148,
  eth: 0.42,
  sol: 12.5,
};

function swapTokenId(t: SwapToken): string {
  return t.kind === "usdc" ? "usdc" : t.market.id;
}
function swapTokenSymbol(t: SwapToken): string {
  return t.kind === "usdc" ? "USDC" : t.market.symbol.split("-")[0];
}
function swapTokenName(t: SwapToken): string {
  return t.kind === "usdc" ? "USD Coin" : t.market.symbol.replace("-", " / ");
}
function swapTokenIcon(t: SwapToken): {
  char: string;
  bg: string;
  fg: string;
} {
  if (t.kind === "usdc") return { char: "$", bg: "#2775ca", fg: "#fff" };
  return {
    char: t.market.iconChar,
    bg: t.market.iconBg,
    fg: t.market.iconFg ?? "#fff",
  };
}
function swapTokenPrice(t: SwapToken): number {
  if (t.kind === "usdc") return 1;
  const n = parseFloat(t.market.lastPrice.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function swapTokenBalance(t: SwapToken): number {
  return MOCK_BALANCES[swapTokenId(t)] ?? 0;
}
function swapTokensEqual(a: SwapToken, b: SwapToken): boolean {
  return swapTokenId(a) === swapTokenId(b);
}

/** Adaptive decimal formatting — high-value tokens get fewer
 *  decimals (BTC at 75k → 2dp), low-value tokens more (sub-cent
 *  ratios need 8dp to be readable). */
function fmtSwapAmount(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0";
  const abs = Math.abs(n);
  const decimals =
    abs >= 1000 ? 2 : abs >= 1 ? 4 : abs >= 0.01 ? 6 : 8;
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}
function fmtUsd(n: number): string {
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Token swap ticket — proper From/To selectors with portal'd token
 *  pickers, mock balances + Max, live rate, slippage, dynamic CTA.
 *  Mock UI; production wires to whatever DEX router. */
function SwapTicket() {
  const defaultTo: SwapToken = useMemo(() => {
    const m = MARKETS.find((x) => x.id === "btc") ?? MARKETS[0];
    return { kind: "market", market: m };
  }, []);
  const [from, setFrom] = useState<SwapToken>(USDC_TOKEN);
  const [to, setTo] = useState<SwapToken>(defaultTo);
  const [fromAmount, setFromAmount] = useState("");

  const fromPrice = swapTokenPrice(from);
  const toPrice = swapTokenPrice(to);
  const fromNum = parseFloat(fromAmount) || 0;
  const fromUsd = fromNum * fromPrice;
  const toNum = toPrice > 0 ? fromUsd / toPrice : 0;
  const toAmount = fromNum > 0 && toNum > 0 ? fmtSwapAmount(toNum) : "";

  const rate = toPrice > 0 && fromPrice > 0 ? fromPrice / toPrice : 0;
  const rateLabel =
    rate > 0
      ? `1 ${swapTokenSymbol(from)} = ${fmtSwapAmount(rate)} ${swapTokenSymbol(to)}`
      : "—";

  const fromBal = swapTokenBalance(from);
  const toBal = swapTokenBalance(to);
  const insufficient = fromNum > 0 && fromNum > fromBal;
  const sameToken = swapTokensEqual(from, to);
  const canSwap = fromNum > 0 && !insufficient && !sameToken;

  const flip = () => {
    setFrom(to);
    setTo(from);
    setFromAmount(toNum > 0 ? String(toNum) : "");
  };

  // Picking a token that's already on the other side flips them so
  // we never end up with From == To (which would zero out the swap).
  const pickFrom = (t: SwapToken) => {
    if (swapTokensEqual(t, to)) setTo(from);
    setFrom(t);
  };
  const pickTo = (t: SwapToken) => {
    if (swapTokensEqual(t, from)) setFrom(to);
    setTo(t);
  };

  const setMax = () => {
    if (fromBal > 0) setFromAmount(String(fromBal));
  };

  const ctaLabel = sameToken
    ? "Pick a different token"
    : fromNum === 0
      ? "Enter an amount"
      : insufficient
        ? `Insufficient ${swapTokenSymbol(from)}`
        : `Swap ${swapTokenSymbol(from)} → ${swapTokenSymbol(to)}`;

  return (
    <>
      <div className="relative flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pt-3">
        <SwapField
          label="From"
          token={from}
          onPickToken={pickFrom}
          amount={fromAmount}
          onAmount={setFromAmount}
          usd={fromUsd}
          balance={fromBal}
          onMax={setMax}
          insufficient={insufficient}
        />
        {/* Flip — sits between the two cards so the relationship reads
            visually. -my-3 lets the button overlap the cards slightly
            and stays clear of the layout flow. */}
        <div className="relative z-[1] -my-3 flex h-6 items-center justify-center">
          <button
            type="button"
            onClick={flip}
            aria-label="Flip swap direction"
            className="inline-flex size-9 items-center justify-center rounded-lg bg-popover text-muted-foreground ring-1 ring-inset ring-white/10 backdrop-blur-md transition-[background-color,color,scale] duration-150 ease-out hover:text-foreground active:scale-[0.92]"
          >
            <ArrowDownUp aria-hidden className="size-4" />
          </button>
        </div>
        <SwapField
          label="To"
          token={to}
          onPickToken={pickTo}
          amount={toAmount}
          readOnly
          placeholder="0"
          usd={fromUsd}
          balance={toBal}
        />

        {/* Trade context — rate + slippage as a small detail block.
            Kept tight; the CTA below is the focal point. */}
        <div className="mt-3 flex flex-col gap-1.5 rounded-lg px-1 py-1 text-body">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">Rate</span>
            <span className="tabular-nums text-foreground">{rateLabel}</span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">Slippage</span>
            <span className="tabular-nums text-foreground">0.5%</span>
          </div>
        </div>
      </div>
      <div className="shrink-0 px-3 pb-3">
        <button
          type="button"
          disabled={!canSwap}
          className={cn(
            "group relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-lg text-body font-semibold transition-[filter,scale] duration-150 ease-out",
            canSwap
              ? "bg-primary text-primary-foreground hover:brightness-[1.04] active:scale-[0.96]"
              : "cursor-not-allowed bg-surface-2 text-muted-foreground",
          )}
        >
          {canSwap && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-white/40 to-transparent"
            />
          )}
          <span className="relative inline-flex items-center justify-center">
            {ctaLabel}
          </span>
        </button>
      </div>
    </>
  );
}

function SwapField({
  label,
  token,
  onPickToken,
  amount,
  onAmount,
  readOnly,
  usd,
  balance,
  onMax,
  insufficient,
  placeholder = "0",
}: {
  label: string;
  token: SwapToken;
  onPickToken: (t: SwapToken) => void;
  amount: string;
  onAmount?: (v: string) => void;
  readOnly?: boolean;
  usd: number;
  balance: number;
  onMax?: () => void;
  insufficient?: boolean;
  placeholder?: string;
}) {
  const ticker = swapTokenSymbol(token);
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface-1 p-3">
      <div className="flex items-baseline justify-between text-caption text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{fmtUsd(usd)}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={amount}
          onChange={(e) => onAmount?.(e.target.value)}
          readOnly={readOnly}
          aria-label={`${label} amount`}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-display font-semibold tabular-nums outline-none placeholder:text-muted-foreground",
            insufficient ? "text-tone-down" : "text-foreground",
          )}
        />
        <TokenPickerButton token={token} onPick={onPickToken} />
      </div>
      <div className="flex items-baseline justify-between text-caption">
        <span className="text-muted-foreground">
          Balance{" "}
          <span className="tabular-nums text-foreground">
            {fmtSwapAmount(balance)}
          </span>{" "}
          {ticker}
        </span>
        {onMax && balance > 0 && (
          <button
            type="button"
            onClick={onMax}
            className="rounded-md bg-surface-3 px-2 py-0.5 text-caption font-medium text-foreground transition-colors hover:bg-surface-4"
          >
            Max
          </button>
        )}
      </div>
    </div>
  );
}

/** Standalone token picker pill — same visual + behaviour as the
 *  SizeInputWithDenom picker but self-contained so it can drop in
 *  next to any input. Portal'd popover with search + scrollable
 *  list of USDC + every market base asset. */
function TokenPickerButton({
  token,
  onPick,
}: {
  token: SwapToken;
  onPick: (t: SwapToken) => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const POPOVER_WIDTH = 320;
  const POPOVER_MAX_HEIGHT = 360;

  const handleClose = useCallback(() => setOpen(false), []);
  const { wrapRef, popoverRef, pos } = useFloatingPopover({
    open,
    onClose: handleClose,
    triggerRef,
    width: POPOVER_WIDTH,
    maxHeight: POPOVER_MAX_HEIGHT,
  });

  const icon = swapTokenIcon(token);
  const ticker = swapTokenSymbol(token);

  const tokens: SwapToken[] = useMemo(
    () => [
      USDC_TOKEN,
      ...MARKETS.map((m) => ({ kind: "market" as const, market: m })),
    ],
    [],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter(
      (t) =>
        swapTokenSymbol(t).toLowerCase().includes(q) ||
        swapTokenName(t).toLowerCase().includes(q),
    );
  }, [tokens, query]);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => searchRef.current?.focus(), 10);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setQuery(""), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const select = (t: SwapToken) => {
    onPick(t);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Token: ${ticker}. Click to change.`}
        onClick={() => setOpen(!open)}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-surface-3 pl-1 pr-2.5 text-foreground transition-colors hover:bg-surface-4"
      >
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-body font-semibold"
          style={{ backgroundColor: icon.bg, color: icon.fg }}
        >
          {icon.char}
        </span>
        <span className="text-caption font-semibold">{ticker}</span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-3 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Select token"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: POPOVER_WIDTH,
              maxHeight: POPOVER_MAX_HEIGHT,
              transformOrigin:
                pos.placement === "above" ? "bottom right" : "top right",
            }}
            className="z-[var(--z-modal-bg)] flex flex-col overflow-hidden rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.05] px-3 py-2.5">
              <Search
                aria-hidden
                strokeWidth={1.75}
                className="size-3.5 text-muted-foreground"
              />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tokens…"
                aria-label="Search tokens"
                className="min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div
              role="listbox"
              className="scroll-thin flex flex-col overflow-y-auto py-1"
            >
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-body text-muted-foreground">
                  No tokens match{" "}
                  <span className="text-foreground">
                    &ldquo;{query}&rdquo;
                  </span>
                </div>
              ) : (
                filtered.map((t) => {
                  const isActive = swapTokensEqual(t, token);
                  const ic = swapTokenIcon(t);
                  const sym = swapTokenSymbol(t);
                  const sub = swapTokenName(t);
                  const bal = swapTokenBalance(t);
                  return (
                    <button
                      key={swapTokenId(t)}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => select(t)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                        isActive
                          ? "bg-primary/10"
                          : "hover:bg-surface-1",
                      )}
                    >
                      <span
                        aria-hidden
                        className="flex size-8 shrink-0 items-center justify-center rounded-full text-body font-semibold"
                        style={{ backgroundColor: ic.bg, color: ic.fg }}
                      >
                        {ic.char}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col leading-tight">
                        <span
                          className={cn(
                            "truncate text-body",
                            isActive
                              ? "font-semibold text-primary"
                              : "font-medium text-foreground",
                          )}
                        >
                          {sym}
                        </span>
                        <span className="truncate text-caption text-muted-foreground">
                          {sub}
                        </span>
                      </span>
                      {bal > 0 && (
                        <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
                          {fmtSwapAmount(bal)}
                        </span>
                      )}
                      {isActive && <CheckIcon />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/**
 * Size input with a token picker on the right. The pill on the
 * right opens a portal'd popover with search + scrollable token
 * list — USD as a denomination escape hatch, plus every market in
 * the catalog. Picking a market that isn't the active one swaps
 * the active market via the parent-provided setter.
 *
 * Portal-mounted so the popover positions in viewport coordinates
 * and can never be clipped by the trade panel's scroll body or
 * obscured by the footer's Place button. Position flips above the
 * trigger when there's more room above than below.
 */
function SizeInputWithDenom({
  size,
  onSize,
  denom,
  onDenom,
  open,
  onOpen,
  activeMarket,
  onPickMarket,
}: {
  size: string;
  onSize: (v: string) => void;
  denom: "asset" | "usd";
  onDenom: (v: "asset" | "usd") => void;
  open: boolean;
  onOpen: (v: boolean) => void;
  activeMarket: Market;
  onPickMarket: (m: Market) => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const POPOVER_WIDTH = 320;
  const POPOVER_MAX_HEIGHT = 360;

  // Stable onClose ref so the popover hook's mousedown effect
  // doesn't rebind every render.
  const handleClose = useCallback(() => onOpen(false), [onOpen]);
  const { wrapRef, popoverRef, pos } = useFloatingPopover({
    open,
    onClose: handleClose,
    triggerRef,
    width: POPOVER_WIDTH,
    maxHeight: POPOVER_MAX_HEIGHT,
  });

  // The "currently selected" pill state. USD when denom === "usd";
  // otherwise the active market's base ticker.
  const assetTicker = activeMarket.symbol.split("-")[0];
  const activeLabel = denom === "usd" ? "USD" : assetTicker;

  // Token universe — USD denomination + every catalog market.
  type TokenRow =
    | { kind: "usd" }
    | { kind: "market"; market: Market };
  const tokens: TokenRow[] = useMemo(
    () => [
      { kind: "usd" } as TokenRow,
      ...MARKETS.map((m) => ({ kind: "market" as const, market: m })),
    ],
    [],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter((t) => {
      if (t.kind === "usd") return "usd".includes(q) || "dollar".includes(q);
      const sym = t.market.symbol.toLowerCase();
      return sym.includes(q);
    });
  }, [tokens, query]);

  // Focus search when picker opens; reset query when it closes.
  // Both setters deferred via setTimeout so we never call setState
  // synchronously inside the effect body.
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => searchRef.current?.focus(), 10);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setQuery(""), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const selectToken = (t: TokenRow) => {
    if (t.kind === "usd") {
      onDenom("usd");
    } else {
      if (t.market.id !== activeMarket.id) onPickMarket(t.market);
      onDenom("asset");
    }
    onOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      {/* Input row — no left icon; the picker pill carries asset
          identity exclusively. Max is demoted to a compact chip
          tucked inside the input. */}
      <div className="flex h-12 items-center gap-2 rounded-lg bg-white/5 pl-3.5 pr-1.5 transition-[background-color,box-shadow] duration-150 ease-out hover:bg-white/[0.07] focus-within:bg-white/[0.07] focus-within:ring-2 focus-within:ring-primary/60">
        <input
          id="trade-size"
          type="text"
          inputMode="decimal"
          value={size}
          onChange={(e) => onSize(e.target.value)}
          data-demo="trade-size-input"
          placeholder="0.00"
          className="min-w-0 flex-1 bg-transparent text-body text-foreground outline-none tabular-nums placeholder:text-muted-foreground"
        />
        <button
          type="button"
          aria-label="Set max size"
          className="shrink-0 rounded-md bg-surface-3 px-2 py-0.5 text-caption font-medium text-muted-foreground transition-colors hover:bg-surface-4 hover:text-foreground"
        >
          Max
        </button>
        {/* Picker pill — promoted with icon + label + chevron. */}
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`Token: ${activeLabel}. Click to change.`}
          onClick={() => onOpen(!open)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-surface-3 pl-1 pr-2.5 text-foreground transition-colors hover:bg-surface-4"
        >
          {denom === "usd" ? (
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-full text-body font-semibold"
              style={{ backgroundColor: "#22c55e", color: "#000" }}
            >
              $
            </span>
          ) : (
            <TokenLogo
              symbol={activeMarket.symbol}
              char={activeMarket.iconChar}
              bg={activeMarket.iconBg}
              fg={activeMarket.iconFg ?? "#fff"}
              size={28}
            />
          )}
          <span className="text-caption font-semibold">{activeLabel}</span>
          <ChevronDownIcon
            aria-hidden
            className={cn(
              "size-3 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* Portal'd popover — viewport-positioned, can't be clipped.
          popoverRef lets the close-on-outside-click effect tell the
          difference between "click on a token row inside me" and
          "click on something else entirely." */}
      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Select token"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: POPOVER_WIDTH,
              maxHeight: POPOVER_MAX_HEIGHT,
              transformOrigin:
                pos.placement === "above" ? "bottom right" : "top right",
            }}
            className="z-[var(--z-modal-bg)] flex flex-col overflow-hidden rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Search row */}
            <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.05] px-3 py-2.5">
              <Search
                aria-hidden
                strokeWidth={1.75}
                className="size-3.5 text-muted-foreground"
              />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tokens…"
                aria-label="Search tokens"
                className="min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            {/* Token list */}
            <div
              role="listbox"
              className="scroll-thin flex flex-col overflow-y-auto py-1"
            >
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-body text-muted-foreground">
                  No tokens match{" "}
                  <span className="text-foreground">
                    &ldquo;{query}&rdquo;
                  </span>
                </div>
              ) : (
                filtered.map((t, i) => {
                  const isActive =
                    (t.kind === "usd" && denom === "usd") ||
                    (t.kind === "market" &&
                      denom === "asset" &&
                      t.market.id === activeMarket.id);
                  const label =
                    t.kind === "usd" ? "USD" : t.market.symbol.split("-")[0];
                  const sub =
                    t.kind === "usd"
                      ? "Dollar notional"
                      : t.market.symbol.replace("-", " / ");
                  const priceLabel =
                    t.kind === "market" ? t.market.lastPrice : null;
                  return (
                    <button
                      key={t.kind === "usd" ? "usd" : t.market.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      data-index={i}
                      onClick={() => selectToken(t)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                        isActive ? "bg-primary/10" : "hover:bg-surface-1",
                      )}
                    >
                      {t.kind === "usd" ? (
                        <span
                          aria-hidden
                          className="flex size-8 shrink-0 items-center justify-center rounded-full text-body font-semibold"
                          style={{ backgroundColor: "#22c55e", color: "#000" }}
                        >
                          $
                        </span>
                      ) : (
                        <TokenLogo
                          symbol={t.market.symbol}
                          char={t.market.iconChar}
                          bg={t.market.iconBg}
                          fg={t.market.iconFg ?? "#fff"}
                          size={32}
                        />
                      )}
                      <span className="flex min-w-0 flex-1 flex-col leading-tight">
                        <span
                          className={cn(
                            "truncate text-body",
                            isActive
                              ? "font-semibold text-primary"
                              : "font-medium text-foreground",
                          )}
                        >
                          {label}
                        </span>
                        <span className="truncate text-caption text-muted-foreground">
                          {sub}
                        </span>
                      </span>
                      {priceLabel && (
                        <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
                          {priceLabel}
                        </span>
                      )}
                      {isActive && <CheckIcon />}
                    </button>
                  );
                })
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/**
 * Slider + value chip — fill-bar slider on the left, current value in
 * a chip on the right. Used for size % and leverage so they read as a
 * matched pair instead of two unrelated controls.
 */
function SliderValueRow({
  id,
  value,
  min,
  max,
  step,
  onChange,
  ariaLabel,
  suffix,
  accent,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  ariaLabel: string;
  suffix: string;
  accent?: boolean;
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={id}
        className="relative flex h-9 flex-1 items-center rounded-lg bg-white/5 px-1 transition-colors hover:bg-white/[0.07] focus-within:bg-white/[0.07] focus-within:ring-2 focus-within:ring-primary/30"
      >
        <div className="relative h-7 flex-1 overflow-hidden rounded-md">
          <div
            aria-hidden
            className="absolute inset-y-0 left-0 rounded-md bg-primary transition-[width] duration-150 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <input
          id={id}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={ariaLabel}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <span
        aria-hidden
        className={cn(
          "inline-flex h-9 min-w-[64px] shrink-0 items-center justify-center rounded-lg bg-white/5 px-3 text-body tabular-nums",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
        <span className="ml-1 text-muted-foreground">{suffix}</span>
      </span>
    </div>
  );
}

function SideButton({
  active,
  onClick,
  label,
  direction,
  demoId,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  direction: "up" | "down";
  demoId?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      data-demo={demoId}
      className={cn(
        "relative flex items-center justify-center gap-1.5 rounded-md py-2 text-body font-semibold transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
        active
          ? direction === "up"
            ? "bg-primary text-primary-foreground"
            : "bg-tone-down text-tone-down-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span
        aria-hidden
        className={cn(
          "inline-block text-body transition-opacity",
          active ? "opacity-90" : "opacity-50",
        )}
      >
        {direction === "up" ? "▲" : "▼"}
      </span>
    </button>
  );
}

/**
 * Gut Check trigger — large brand Wayfinder button to the right of
 * the main CTA. Uses the shared AskAgentButton at size="lg" so it
 * reads as the same affordance the user sees in panel headers and
 * row hovers — same glass + breathing glow + shimmer — just scaled
 * up. The analyzing state adds an outer mint+blue halo via a
 * sibling glow span (separate from the button's own boxShadow so
 * the two don't collide).
 */
function GutCheckButton({
  onCheck,
  analyzing,
}: {
  onCheck: () => void;
  analyzing: boolean;
}) {
  return (
    <span className="relative inline-flex shrink-0">
      {analyzing && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg shadow-[0_0_30px_-2px_color-mix(in_oklch,var(--primary)_55%,transparent),0_0_56px_-8px_color-mix(in_oklch,#60a5fa_45%,transparent)]"
        />
      )}
      <AskAgentButton
        size="lg"
        onClick={onCheck}
        ariaLabel="Gut check this trade with the Wayfinder agent"
        buttonProps={{
          "aria-busy": analyzing,
          "data-demo": "gut-check",
        }}
      />
    </span>
  );
}

/**
 * Compact pill-style dropdown chip used for the Margin Mode + Order
 * Type strip at the top of the trade panel. Shows just the current
 * value + a chevron — labels would double the vertical footprint of
 * settings that are rarely changed.
 */
function CompactSettingChip({
  label,
  ariaLabel,
  options,
  onChange,
}: {
  label: string;
  ariaLabel: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);
  const menuId = `chip-${ariaLabel.toLowerCase().replace(/\s+/g, "-")}-menu`;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${ariaLabel}: ${label}`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-7 items-center gap-1 rounded-md bg-surface-1 px-2.5 text-caption font-medium text-foreground transition-colors hover:bg-surface-3"
      >
        <span className="truncate">{label}</span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-3 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        id={menuId}
        role="menu"
        aria-hidden={!open}
        // Opens upward — these chips now live just above the CTA at
        // the bottom of the trade panel, where downward openings get
        // clipped by the panel's overflow-hidden. Origin flipped to
        // bottom-left so the open animation lifts out of the chip.
        className={cn(
          "absolute left-0 bottom-full z-30 mb-1 min-w-[140px] origin-bottom-left rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 p-1 shadow-2xl transition-[opacity,transform] duration-150 ease-out",
          open
            ? "opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 translate-y-1 scale-[0.98]",
        )}
      >
        {options.map((opt) => {
          const active = opt === label;
          return (
            <button
              key={opt}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-md px-3 py-1.5 text-left text-body transition-colors",
                active ? "bg-primary/10" : "hover:bg-surface-1",
              )}
            >
              <span className={active ? "text-primary" : "text-foreground"}>
                {opt}
              </span>
              {active && <CheckIcon />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Header-strip read-out for the trade panel — rendered by PanelChrome
 * via the layout registry's HeaderActions hook. Mirrors the chart's
 * link icon as a passive indicator so both ends of the chart ↔ trade
 * binding are visible at a glance.
 *
 * Only renders when a chart is currently linked (mainChartId !== null).
 * Subdued styling so it doesn't compete with the chart's clickable
 * version — this side is read-only; users unlink from the chart
 * chrome, not from here.
 */
export function TradePanelHeaderActions() {
  const { mainChartId } = useMainChart();
  const { activeMarket } = useActiveMarket();
  if (!mainChartId) return null;
  return (
    <span
      aria-label={`Linked to chart · ${activeMarket.symbol}`}
      title={`Linked to chart · ${activeMarket.symbol}`}
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground/60"
    >
      <Link2 strokeWidth={1.75} className="size-3" aria-hidden />
    </span>
  );
}

