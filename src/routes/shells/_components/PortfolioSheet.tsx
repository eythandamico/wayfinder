"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { createPortal } from "react-dom";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  Infinity as InfinityLucide,
  LogOut,
  Plus,
  Repeat,
  Settings as SettingsIcon,
  RotateCcw,
  X,
  Zap,
} from "lucide-react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { cn } from "@/lib/utils";
import { formatTokens, shortAddress } from "@/lib/format";
import { useLayoutDispatch } from "../_layout/LayoutContext";
import { useFloatingPopover } from "../_hooks/useFloatingPopover";
import { usePlan } from "../_state/plan-context";
import { MOCK_USAGE, WALLETS } from "../_data/mocks";
import type { UsageData } from "../_types";
import {
  useDensity,
  usePortfolioSheet,
  type Density,
} from "../_state/shells-context";
import { AskAgentButton } from "./AskAgentAffordance";
import { SubduedButton } from "./SubduedButton";
import { MOCK_ACCOUNT } from "./PortfolioPanel";
import {
  TradingWalletDialog,
  type TradingWalletVenue,
} from "./TradingWalletDialog";
import { PositionList } from "./portfolio/PositionList";

/** Width of the side sheet when open, including the gutter on its
 *  right side. page.tsx uses this to compute the main element's right
 *  offset so the shell shrinks rather than the sheet overlaying.
 *  Single source of truth — change in one place. */
export const PORTFOLIO_SHEET_WIDTH = 480;

/** Inset on the top, right, and bottom so the sheet floats as a
 *  rounded panel matching the shell's chrome rhythm. The left edge
 *  stays flush against the shell so the two surfaces read as
 *  connected rather than as a floating window stranded over them. */
const SHEET_GUTTER = 12;
/** Conservative fallback used until the panel-grid top is measured.
 *  Real value comes from observing the panel grid's bounding box —
 *  MarketHeader height shifts with density and CommandSearchBar
 *  layout, so a hardcoded constant drifted out of alignment. */
const SHEET_TOP_FALLBACK = 84;

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const PERIODS = ["1D", "1W", "1M", "3M", "1Y", "All"] as const;
type Period = (typeof PERIODS)[number];

type Tab =
  | "perps"
  | "tokens"
  | "polymarket"
  | "activity"
  | "allocation";

/* ------------------------------------------------------------------ */
/*  Mock data — same shape as the old /portfolio page, slimmed down    */
/*  for a 400px column.                                                */
/* ------------------------------------------------------------------ */

const ALLOCATION = [
  { id: "hyperliquid", name: "Hyperliquid", value: 19056.92, color: "var(--primary)" },
  { id: "tokens", name: "Tokens", value: 9884.32, color: "#6ea8ff" },
  { id: "polymarket", name: "Polymarket", value: 6038.30, color: "#c084fc" },
  { id: "idle", name: "Idle cash", value: 1071.0, color: "#94a3b8" },
];

const ACTIVITY = [
  { id: "a1", kind: "buy", symbol: "BTC-PERP", amount: 4500, when: "12m ago" },
  { id: "a2", kind: "card", symbol: "AAPL", amount: 0, when: "1h ago", note: "Long thesis from loomdart" },
  { id: "a3", kind: "sell", symbol: "ETH-PERP", amount: 1200, when: "3h ago" },
  { id: "a4", kind: "deposit", symbol: "USDC", amount: 5000, when: "yesterday" },
];

/* ------------------------------------------------------------------ */
/*  Sheet — slides in from the right edge                              */
/* ------------------------------------------------------------------ */

/**
 * Side sheet that PUSHES the shell rather than overlaying it. Lives in
 * the layout (fixed to the right edge); the shell's <main> shrinks its
 * right offset by the same amount when this is open, so the panels
 * remain fully interactive and never get covered up.
 *
 * Closes via:
 *   - The Portfolio button in the top nav (toggle)
 *   - The × in the sheet header
 *   - Esc
 * Clicking elsewhere in the shell does NOT close — the sheet is a
 * persistent surface, not a modal.
 */
export function PortfolioSheet() {
  const { open, closePortfolio } = usePortfolioSheet();
  // Measure the panel-grid container's top edge instead of computing
  // it from MarketHeader-height assumptions. Density changes + the
  // marquee toggle both shift the panel grid down — measuring catches
  // every case automatically.
  const [sheetTop, setSheetTop] = useState(SHEET_TOP_FALLBACK);
  useEffect(() => {
    // Track teardown state so any in-flight callbacks (rAF retry,
    // ResizeObserver firing during cleanup) become no-ops instead of
    // setting state on an unmounted-or-mid-teardown component.
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let rafId = 0;

    const update = (el: HTMLElement) => {
      if (cancelled) return;
      setSheetTop(el.getBoundingClientRect().top);
    };

    const tryAttach = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>(
        "[data-panel-grid-top]",
      );
      if (!el) {
        // Panel grid not yet mounted (race with DesktopShell render).
        // Retry on the next frame. This handles app-boot ordering
        // without needing a MutationObserver on the whole body.
        rafId = requestAnimationFrame(tryAttach);
        return;
      }
      update(el);
      ro = new ResizeObserver(() => update(el));
      ro.observe(el);
      // Marquee toggle changes other elements' heights too — watch
      // the document body so any layout-shifting toggle gets picked up.
      ro.observe(document.body);
    };

    tryAttach();
    const onWindowResize = () => {
      const el = document.querySelector<HTMLElement>("[data-panel-grid-top]");
      if (el) update(el);
    };
    window.addEventListener("resize", onWindowResize);

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", onWindowResize);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePortfolio();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closePortfolio]);

  return (
    <>
      <aside
        aria-label="Portfolio"
        aria-hidden={!open}
        className="fixed z-30 flex flex-col overflow-hidden rounded-lg bg-surface-1 backdrop-blur-md ring-1 ring-inset ring-white/[0.06] transition-transform duration-300 ease-[var(--ease-drawer)]"
        style={{
          // Sit underneath the MarketHeader strip rather than over it,
          // so the top nav stays full-width and reachable when the
          // sheet is open. Top offset matches the panel-grid top edge
          // (p-3 main + MarketHeader ≈48 + mt-3 ≈ 72).
          top: sheetTop,
          right: SHEET_GUTTER,
          bottom: SHEET_GUTTER,
          width: PORTFOLIO_SHEET_WIDTH - SHEET_GUTTER,
          // Translate fully off-screen plus the right gutter so the
          // closing motion stays clean as it tucks behind the edge.
          transform: open
            ? "translateX(0)"
            : `translateX(${PORTFOLIO_SHEET_WIDTH}px)`,
        }}
        // Keep the closed sheet out of the tab order and screen reader.
        inert={!open}
      >
        <SheetContents onClose={closePortfolio} />
      </aside>
    </>
  );
}

/**
 * Sheet content router — stacks two stage-equivalent views (Main /
 * Settings) and slides between them with a 300ms transform animation.
 * Two views always rendered so leaving them mounted preserves scroll
 * position when the user navigates back.
 */
function SheetContents({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<"main" | "settings">("main");
  const [activeWallet, setActiveWallet] = useState(WALLETS[0]);

  return (
    <div className="relative h-full overflow-hidden">
      <div
        className={cn(
          "absolute inset-0 flex flex-col transition-transform duration-300 ease-[var(--ease-drawer)]",
          view === "main" ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={view !== "main"}
      >
        <MainView
          onOpenSettings={() => setView("settings")}
          activeWallet={activeWallet}
          setActiveWallet={setActiveWallet}
        />
      </div>
      <div
        className={cn(
          "absolute inset-0 flex flex-col transition-transform duration-300 ease-[var(--ease-drawer)]",
          view === "settings" ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={view !== "settings"}
      >
        <SettingsView
          onClose={onClose}
          onBack={() => setView("main")}
        />
      </div>
    </div>
  );
}

type WalletInstance = (typeof WALLETS)[number];

export function PortfolioMainView(props: {
  onOpenSettings: () => void;
  activeWallet: WalletInstance;
  setActiveWallet: (w: WalletInstance) => void;
}) {
  return <MainView {...props} />;
}

function MainView({
  onOpenSettings,
  activeWallet,
  setActiveWallet,
}: {
  onOpenSettings: () => void;
  activeWallet: WalletInstance;
  setActiveWallet: (w: WalletInstance) => void;
}) {
  const [period, setPeriod] = useState<Period>("1M");
  const periodLayoutId = useId();
  const [tab, setTab] = useState<Tab>("perps");
  const [copied, setCopied] = useState(false);
  const [balancesHidden, setBalancesHidden] = useState(false);
  // Trading-wallet transfer modal target — null when closed, "hyperliquid" /
  // "polymarket" when open against that venue.
  const [transferVenue, setTransferVenue] =
    useState<TradingWalletVenue | null>(null);

  const isUp = MOCK_ACCOUNT.changeUsd >= 0;
  const totalAllocated = ALLOCATION.reduce((acc, a) => acc + a.value, 0);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(activeWallet.address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      {/* Header: wallet selector + hide-balance + settings. The
       *  desktop sheet wrapping aside has its own close ×; the mobile
       *  BottomSheet has a drag handle + close button. MainView never
       *  renders its own close affordance. */}
      <div className="shrink-0 border-b border-white/[0.05] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <WalletSelector
            active={activeWallet}
            onSelect={setActiveWallet}
            copied={copied}
            onCopy={copyAddress}
          />
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              aria-label="Settings"
              onClick={onOpenSettings}
              className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-1 hover:text-foreground active:scale-[0.96]"
            >
              <SettingsIcon strokeWidth={1.75} className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {/* Wallet-level Deposit / Withdraw — sits right under the
            wallet identity row so the funding affordance is obvious.
            Diff #3 feedback was "hard to see and the spot is not
            super intuitive"; promoting these out of the 4-up Buy /
            Swap / Send / Receive grid clears that up. */}
        {/* Deposit and Withdraw are equal-weight account actions — both
         *  ride the subdued surface so neither flood-fills the row.
         *  The earlier mint-fill on Withdraw made it the loudest thing
         *  on the screen (especially on mobile where the pill grows to
         *  half the viewport) and read as the recommended action,
         *  which it isn't. */}
        <div className="grid grid-cols-2 gap-1.5 px-4 pt-4">
          <SubduedButton aria-label="Deposit to wallet" className="h-9 px-3">
            Deposit
          </SubduedButton>
          <SubduedButton aria-label="Withdraw from wallet" className="h-9 px-3 gap-1.5">
            <ArrowUpRight strokeWidth={2} className="size-3.5" aria-hidden />
            Withdraw
          </SubduedButton>
        </div>

        {/* Hero balance — value on its own line, change row stacked
            below. Wrapping each in a block element so the inline-
            flex change row sits on a new line under the balance. */}
        <div className="px-4 pt-5 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <div className="font-heading truncate text-display font-semibold leading-none tabular-nums text-foreground">
                {balancesHidden ? "••••••" : USD.format(MOCK_ACCOUNT.balance)}
              </div>
              {/* Inline hide-balance toggle — sits next to the
                  number so the affordance reads as "this controls
                  THIS value" rather than as panel chrome. */}
              <button
                type="button"
                aria-label={
                  balancesHidden ? "Show balances" : "Hide balances"
                }
                aria-pressed={balancesHidden}
                onClick={() => setBalancesHidden((v) => !v)}
                className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-1 hover:text-foreground active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                {balancesHidden ? (
                  <EyeOff strokeWidth={1.75} className="size-4" aria-hidden />
                ) : (
                  <Eye strokeWidth={1.75} className="size-4" aria-hidden />
                )}
              </button>
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
              balancesHidden
                ? "text-muted-foreground"
                : isUp
                  ? "text-primary"
                  : "text-tone-down",
            )}
          >
            {balancesHidden ? (
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
            <SheetSparkline data={MOCK_ACCOUNT.sparkline} up={isUp} />
          </div>

          {/* Period selector — full-width segmented control above the
              action buttons. Acts as a band that separates the
              chart/balance area from the trading actions. */}
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

        {/* Tab strip — sticky to the top of the scroll container. The
            container's overflow-y-auto already hides content above
            the viewport, so the strip doesn't need a backdrop-filter
            or its own background to obscure anything — adding either
            visibly lightens the strip relative to the surrounding
            sheet. Keep it transparent so it inherits the sheet's
            surface exactly; the border-b separates it from the list
            below. */}
        <div className="scroll-thin sticky top-0 z-10 flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/[0.05] px-4">
          <TabButton active={tab === "tokens"} onClick={() => setTab("tokens")}>
            Tokens
          </TabButton>
          <TabButton active={tab === "perps"} onClick={() => setTab("perps")}>
            Perps
          </TabButton>
          <TabButton
            active={tab === "polymarket"}
            onClick={() => setTab("polymarket")}
          >
            Polymarket
          </TabButton>
          <TabButton
            active={tab === "activity"}
            onClick={() => setTab("activity")}
          >
            Activity
          </TabButton>
          <TabButton
            active={tab === "allocation"}
            onClick={() => setTab("allocation")}
          >
            Allocation
          </TabButton>
        </div>

        {/* Tab content */}
        <div className="px-4 py-3">
          {tab === "tokens" && (
            <PositionList
              venue="Tokens"
              onTransfer={setTransferVenue}
              empty="No tokens yet."
            />
          )}
          {tab === "perps" && (
            <PositionList
              venue="Hyperliquid"
              onTransfer={setTransferVenue}
              empty="No open perps."
            />
          )}
          {tab === "polymarket" && (
            <PositionList
              venue="Polymarket"
              onTransfer={setTransferVenue}
              empty="No predictions yet."
            />
          )}
          {tab === "allocation" && (
            <AllocationView total={totalAllocated} />
          )}
          {tab === "activity" && <ActivityList />}
        </div>
      </div>

      {/* Session usage — pinned at the bottom of the sheet so it's
          always glanceable. Moved here from the top nav so usage
          lives alongside the wallet/account context it belongs with. */}
      <UsageFooter usage={MOCK_USAGE} />

      {/* Trading-wallet transfer dialog — opens when a Hyperliquid /
          Polymarket row's ⇄ chip is clicked. Mounted at MainView so
          the portal renders above the sheet. */}
      <TradingWalletDialog
        open={transferVenue !== null}
        venue={transferVenue}
        onOpenChange={(open) => !open && setTransferVenue(null)}
      />
    </>
  );
}

function UsageFooter({ usage }: { usage: UsageData }) {
  const [expanded, setExpanded] = useState(false);
  const { openPricing, plan, isPro } = usePlan();
  const tokenPct = (usage.tokens.used / usage.tokens.total) * 100;
  // Token usage drives the visual urgency. Below 70% the bar reads
  // as a calm primary; 70–90% it reads as "approaching"; above 90%
  // it reads as "about to gate."
  const tokenTone =
    tokenPct >= 90
      ? "bg-tone-down"
      : tokenPct >= 70
        ? "bg-primary/70"
        : "bg-primary";
  const tierLabel = plan === "pro" ? "PRO" : "FREE";
  return (
    <div className="shrink-0 border-t border-white/[0.05]">
      {/* Compact summary row — always visible. Tap to expand. The
          tier pill ("FREE" / "PRO") sits as a quiet identity badge
          rather than an upgrade nag; the real upgrade CTA lives in
          the expanded view. */}
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="usage-detail"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
      >
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]"
        />
        <span className="text-body text-muted-foreground">
          <span className="tabular-nums text-foreground">
            {usage.sessionDuration}
          </span>
          {" · "}
          <span className="tabular-nums text-foreground">
            {formatTokens(usage.tokens.used)}
          </span>
          <span className="text-muted-foreground/80">
            /{formatTokens(usage.tokens.total)}
          </span>
          {" · "}
          <span className="tabular-nums text-foreground">
            ${usage.costUsd.toFixed(2)}
          </span>
        </span>
        <span
          aria-hidden
          className="ml-auto inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-micro font-semibold uppercase tracking-[0.14em] text-muted-foreground"
        >
          {tierLabel}
        </span>
        <ChevronRight
          aria-hidden
          strokeWidth={1.75}
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-90",
          )}
        />
      </button>

      {/* Expanded detail. Single meter (tokens — the actual gate),
          honest value-prop rows for the upgrade, no decorative
          icons. CPU + RAM rows from the old design are gone — they
          weren't gates the user could act on. */}
      {expanded && (
        <div id="usage-detail" className="flex flex-col gap-3 px-4 pb-3 pt-1">
          {/* Sub-header — session status + estimated cost. */}
          <div className="flex items-center justify-between text-caption">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]"
              />
              <span className="tabular-nums text-foreground">
                {usage.sessionDuration}
              </span>
              {" · Active"}
            </span>
            <span className="text-muted-foreground">
              Est.{" "}
              <span className="tabular-nums text-foreground">
                ${usage.costUsd.toFixed(2)}
              </span>
            </span>
          </div>

          {/* Token meter — the only thing here that actually gates
              the user. Color shifts as usage approaches the cap. */}
          <div>
            <div className="flex items-center justify-between text-caption">
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <InfinityLucide
                  strokeWidth={1.75}
                  className="size-3.5 text-primary"
                  aria-hidden
                />
                Tokens
              </span>
              <span className="tabular-nums text-foreground">
                {formatTokens(usage.tokens.used)}
                <span className="text-muted-foreground/80">
                  {" / "}
                  {formatTokens(usage.tokens.total)}
                </span>
                {" · "}
                {tokenPct.toFixed(0)}%
              </span>
            </div>
            <div className="relative mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-500 ease-out",
                  tokenTone,
                )}
                style={{ width: `${Math.min(tokenPct, 100)}%` }}
              />
            </div>
          </div>

          {/* Top-up — secondary action, available to both tiers
              since credit top-ups are a la carte. Subdued bg so it
              doesn't compete with the Upgrade CTA below. */}
          <button
            type="button"
            onClick={() => openPricing("topup")}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-surface-2 text-body font-medium text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-3 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <Plus strokeWidth={2} className="size-3.5" aria-hidden />
            Top up LLM credits
          </button>

          {/* Free-tier upgrade pitch — two honest value-prop rows
              followed by the primary CTA. Both hidden on Pro since
              the user has already upgraded. */}
          {!isPro && (
            <>
              <div className="flex flex-col gap-2 pt-1">
                <span className="inline-flex items-center gap-2 text-caption text-muted-foreground">
                  <Clock
                    strokeWidth={1.75}
                    className="size-3.5 shrink-0 text-primary"
                    aria-hidden
                  />
                  Agents run 24/7 — while free tier sleeps
                </span>
                <span className="inline-flex items-center gap-2 text-caption text-muted-foreground">
                  <Zap
                    strokeWidth={1.75}
                    className="size-3.5 shrink-0 text-primary"
                    aria-hidden
                  />
                  100M credits included
                </span>
              </div>
              <button
                type="button"
                aria-label="Upgrade to Pro"
                onClick={() => openPricing("usage")}
                className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                Upgrade to Pro
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Header — wallet selector with copy address                         */
/* ------------------------------------------------------------------ */

function WalletSelector({
  active,
  onSelect,
  copied,
  onCopy,
}: {
  active: (typeof WALLETS)[number];
  onSelect: (w: (typeof WALLETS)[number]) => void;
  copied: boolean;
  onCopy: () => void;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // The portfolio sheet itself uses backdrop-blur, which means any
  // descendant with its own backdrop-blur silently renders without a
  // filter — Chrome/Safari only apply one backdrop-filter pass per
  // stacking context chain. Portaling the dropdown out to body lets
  // it sit in its own context so the blur looks the same as the
  // CommandBar, AddPanel menu, and trade-panel pickers.
  const POPOVER_WIDTH = 288;
  const POPOVER_MAX_HEIGHT = 420;
  const handleClose = useCallback(() => setOpen(false), []);
  const { wrapRef, popoverRef, pos } = useFloatingPopover({
    open,
    onClose: handleClose,
    triggerRef,
    width: POPOVER_WIDTH,
    maxHeight: POPOVER_MAX_HEIGHT,
    anchorRight: false,
  });
  return (
    <div ref={wrapRef} className="flex min-w-0 flex-1 flex-col">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="-mx-1.5 flex w-[calc(100%+0.75rem)] items-center gap-2.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-surface-1"
      >
        {/* Jazzicon avatar — same identity glyph used everywhere
            else the wallet appears (mobile top bar, wallet list
            row), kept in sync via jsNumberForAddress. Explicit
            flex + size match the text column's h-9 so the avatar
            and the name/address stack share a midline; the inline
            wrapper would otherwise pick up a baseline gap from the
            SVG's default vertical-align. */}
        <span
          aria-hidden
          className="flex size-[26px] shrink-0 items-center justify-center overflow-hidden rounded-full"
        >
          <Jazzicon
            diameter={26}
            seed={jsNumberForAddress(active.address)}
          />
        </span>
        {/* Name + address stack — both lines are part of the trigger,
            so clicking anywhere in the block opens the dropdown. The
            column matches the jazzicon's height and justify-centers
            its content so name + address sit on the avatar's midline
            regardless of the address-row's copy-icon height. */}
        <span className="flex h-9 min-w-0 flex-1 flex-col justify-center leading-tight">
          <span className="truncate text-body font-semibold text-foreground">
            {active.name}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="truncate text-caption tabular-nums text-muted-foreground">
              {shortAddress(active.address)}
            </span>
            {/* Copy is a span with role=button so it can live INSIDE
                the trigger button without nested-button HTML
                violation. stopPropagation prevents the click from
                also toggling the dropdown. */}
            <span
              role="button"
              tabIndex={0}
              aria-label="Copy wallet address"
              onClick={(e) => {
                e.stopPropagation();
                onCopy();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onCopy();
                }
              }}
              className="inline-flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              {copied ? (
                <Check
                  strokeWidth={2}
                  className="size-3 text-primary"
                  aria-hidden
                />
              ) : (
                <Copy
                  strokeWidth={1.75}
                  className="size-3 text-muted-foreground transition-colors"
                  aria-hidden
                />
              )}
            </span>
          </span>
        </span>
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={cn(
            "size-3 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        >
          <path
            d="M3 5l3 3 3-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown — connected wallet on top, agent wallets grouped
          below so the distinction reads at a glance. Portaled to
          document.body to escape the sheet's backdrop-filter, which
          would otherwise neutralise the dropdown's own blur. */}
      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            role="menu"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: POPOVER_WIDTH,
              maxHeight: POPOVER_MAX_HEIGHT,
              transformOrigin:
                pos.placement === "above" ? "bottom left" : "top left",
            }}
            className="z-[var(--z-modal-bg)] flex flex-col overflow-hidden rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 p-1 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="px-3 pt-1.5 pb-1 text-micro uppercase tracking-[0.16em] text-muted-foreground">
              Connected
            </div>
            {WALLETS.filter((w) => w.primary).map((w) => (
              <WalletMenuItem
                key={w.id}
                wallet={w}
                active={w.id === active.id}
                onSelect={() => {
                  onSelect(w);
                  setOpen(false);
                }}
              />
            ))}

            <div className="mt-1 border-t border-white/[0.05] px-3 pt-2 pb-1 text-micro uppercase tracking-[0.16em] text-muted-foreground">
              Agent wallets
            </div>
            {WALLETS.filter((w) => !w.primary).map((w) => (
              <WalletMenuItem
                key={w.id}
                wallet={w}
                active={w.id === active.id}
                onSelect={() => {
                  onSelect(w);
                  setOpen(false);
                }}
              />
            ))}

            <div className="my-1 h-px bg-surface-1" />
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-body text-foreground transition-colors hover:bg-surface-1"
            >
              <span>Spin up agent wallet</span>
              <Plus
                strokeWidth={1.75}
                className="size-3.5 text-muted-foreground"
              />
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}

function WalletMenuItem({
  wallet,
  active,
  onSelect,
}: {
  wallet: WalletInstance;
  active: boolean;
  onSelect: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(wallet.address);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-surface-1",
        active && "bg-surface-1",
      )}
    >
      {/* Jazzicon — same identity glyph + size as the trigger and
          the nav-bar wallet pill so the row reads as the same
          wallet, just listed. */}
      <span
        aria-hidden
        className="flex size-[26px] shrink-0 items-center justify-center overflow-hidden rounded-full"
      >
        <Jazzicon
          diameter={26}
          seed={jsNumberForAddress(wallet.address)}
        />
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-body text-foreground">
          {wallet.name}
        </span>
        <span className="truncate text-caption tabular-nums text-muted-foreground">
          {shortAddress(wallet.address)}
        </span>
      </span>
      {/* Inline copy affordance — role=button + stopPropagation so
          the copy click doesn't ALSO fire the row's wallet-switch
          onSelect. Matches the trigger's copy pattern. */}
      <span
        role="button"
        tabIndex={0}
        aria-label={`Copy ${wallet.name} address`}
        onClick={handleCopy}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCopy(e);
          }
        }}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        {copied ? (
          <Check
            strokeWidth={2}
            className="size-3.5 text-primary"
            aria-hidden
          />
        ) : (
          <Copy
            strokeWidth={1.75}
            className="size-3.5 text-muted-foreground transition-colors"
            aria-hidden
          />
        )}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Sparkline + tabs + content blocks                                  */
/* ------------------------------------------------------------------ */

function SheetSparkline({ data, up }: { data: number[]; up: boolean }) {
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
  const areaPoints = `0,${H} ${points} ${W},${H}`;

  return (
    <div
      className={cn(
        "relative h-24 w-full",
        up ? "text-primary" : "text-tone-down",
      )}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="sheet-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#sheet-area)" />
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
    </div>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative px-3 py-2.5 text-body font-medium transition-colors",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {active && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2 bottom-0 h-px bg-foreground"
        />
      )}
    </button>
  );
}


/* ------------------------------------------------------------------ */
/*  Settings view — second stage of the sheet's mini-router            */
/* ------------------------------------------------------------------ */

function SettingsView({
  onClose,
  onBack,
}: {
  onClose: () => void;
  onBack: () => void;
}) {
  // Settings only ever shows the user's connected (primary) wallet —
  // never the agent wallets. Agent wallets live in the WalletSelector
  // on the main portfolio view, where you can switch between them to
  // inspect their balances and activity.
  const connectedWallet =
    WALLETS.find((w) => w.primary) ?? WALLETS[0];
  // Toggles are local state until real preference persistence lands.
  const [hideBalances, setHideBalances] = useState(false);
  const [confirmOrders, setConfirmOrders] = useState(true);
  const [slippage, setSlippage] = useState<"0.1" | "0.5" | "1.0">("0.5");
  const [leverage, setLeverage] = useState<"1x" | "3x" | "5x">("3x");
  const [notifyFills, setNotifyFills] = useState(true);
  const [notifyAlerts, setNotifyAlerts] = useState(true);
  const [notifyMentions, setNotifyMentions] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [hidePnL, setHidePnL] = useState(false);
  const [anonymizeHandle, setAnonymizeHandle] = useState(false);

  const layoutDispatch = useLayoutDispatch();
  const resetLayout = () => layoutDispatch?.({ type: "resetLayout" });

  const openEtherscan = () =>
    window.open(
      `https://etherscan.io/address/${connectedWallet.address}`,
      "_blank",
    );

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(connectedWallet.address);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      {/* Header: ← Back / Settings / × */}
      <div className="shrink-0 border-b border-white/[0.05] px-2 pt-3 pb-3">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            aria-label="Back to portfolio"
            onClick={onBack}
            className="inline-flex h-9 items-center gap-1 rounded-md px-2 text-body text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-1 hover:text-foreground active:scale-[0.96]"
          >
            <ArrowLeft strokeWidth={1.75} className="size-4" aria-hidden />
            Back
          </button>
          <span className="text-body font-semibold text-foreground">
            Settings
          </span>
          <button
            type="button"
            aria-label="Close portfolio"
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-1 hover:text-foreground active:scale-[0.96]"
          >
            <X strokeWidth={1.75} className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {/* --- Wallet section ---------------------------------------- */}
        <Section label="Wallet">
          <ConnectedWalletCard
            wallet={connectedWallet}
            onCopy={copyAddress}
            onEtherscan={openEtherscan}
          />
          <SettingsRow
            label="Add wallet"
            description="Connect another address"
            onClick={() => {}}
            trailing={<ChevronRight strokeWidth={1.75} className="size-4" />}
          />
          <SettingsRow
            label="Disconnect"
            description="Sign out of this wallet"
            tone="danger"
            onClick={() => {}}
            trailing={<LogOut strokeWidth={1.75} className="size-4" />}
          />
        </Section>

        {/* --- Display section --------------------------------------- */}
        <Section label="Display">
          <DensitySetting />
          <SettingsRow
            label="Hide balances"
            description="Mask amounts with ••• until you tap"
            trailing={<Switch checked={hideBalances} onChange={setHideBalances} label="Hide balances" />}
          />
        </Section>

        {/* --- Trading section --------------------------------------- */}
        <Section label="Trading">
          <SettingsRow
            label="Confirm orders"
            description="Show a confirmation before submitting"
            trailing={<Switch checked={confirmOrders} onChange={setConfirmOrders} label="Confirm orders" />}
          />
          <SegmentedRow
            label="Default slippage"
            description="Max price drift you'll accept"
            value={slippage}
            options={[
              { value: "0.1", label: "0.1%" },
              { value: "0.5", label: "0.5%" },
              { value: "1.0", label: "1.0%" },
            ]}
            onChange={setSlippage}
          />
          <SegmentedRow
            label="Default leverage"
            description="Pre-fill the leverage slider"
            value={leverage}
            options={[
              { value: "1x", label: "1×" },
              { value: "3x", label: "3×" },
              { value: "5x", label: "5×" },
            ]}
            onChange={setLeverage}
          />
        </Section>

        {/* --- Notifications section --------------------------------- */}
        <Section label="Notifications">
          <SettingsRow
            label="Trade fills"
            description="Ping when an order fills"
            trailing={<Switch checked={notifyFills} onChange={setNotifyFills} label="Trade fills" />}
          />
          <SettingsRow
            label="Price alerts"
            description="Ping when alerts trigger"
            trailing={<Switch checked={notifyAlerts} onChange={setNotifyAlerts} label="Price alerts" />}
          />
          <SettingsRow
            label="Companion mentions"
            description="Ping when the companion @mentions you"
            trailing={<Switch checked={notifyMentions} onChange={setNotifyMentions} label="Companion mentions" />}
          />
          <SettingsRow
            label="Sound effects"
            description="Subtle audio on trade events"
            trailing={<Switch checked={soundEffects} onChange={setSoundEffects} label="Sound effects" />}
          />
        </Section>

        {/* --- Privacy section --------------------------------------- */}
        <Section label="Privacy">
          <SettingsRow
            label="Hide PnL"
            description="Replace dollar PnL with %"
            trailing={<Switch checked={hidePnL} onChange={setHidePnL} label="Hide PnL" />}
          />
          <SettingsRow
            label="Anonymize handle"
            description="Show as a random name in group chats"
            trailing={<Switch checked={anonymizeHandle} onChange={setAnonymizeHandle} label="Anonymize handle" />}
          />
        </Section>

        {/* --- Advanced section -------------------------------------- */}
        <Section label="Advanced">
          <SettingsRow
            label="Reset layout"
            description="Restore the default panel arrangement"
            onClick={resetLayout}
            trailing={<RotateCcw strokeWidth={1.75} className="size-4" />}
          />
        </Section>

        <div className="pb-4 pt-2 text-center text-micro uppercase tracking-[0.2em] text-muted-foreground">
          Wayfinder · v0.1
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings primitives                                                */
/* ------------------------------------------------------------------ */

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5">
      <div className="mb-1.5 px-1 text-micro uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="overflow-hidden rounded-lg">
        {children}
      </div>
    </section>
  );
}

function ConnectedWalletCard({
  wallet,
  onCopy,
  onEtherscan,
}: {
  wallet: WalletInstance;
  onCopy: () => void;
  onEtherscan: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    onCopy();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="flex items-center gap-3 border-b border-white/[0.05] bg-surface-1 px-3 py-3">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-inset ring-white/[0.10]"
      >
        <Jazzicon diameter={40} seed={jsNumberForAddress(wallet.address)} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium text-foreground">
          {wallet.name}
        </span>
        <span className="truncate text-body text-muted-foreground tabular-nums">
          {shortAddress(wallet.address)}
        </span>
      </div>
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy address"}
        onClick={handleCopy}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-1 hover:text-foreground active:scale-[0.96]"
      >
        <Copy
          strokeWidth={1.75}
          className={cn(
            "size-3.5 transition-colors",
            copied && "text-primary",
          )}
        />
      </button>
      <button
        type="button"
        aria-label="View on Etherscan"
        onClick={onEtherscan}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-1 hover:text-foreground active:scale-[0.96]"
      >
        <ExternalLink strokeWidth={1.75} className="size-3.5" />
      </button>
    </div>
  );
}

function SettingsRow({
  label,
  description,
  trailing,
  onClick,
  tone,
}: {
  label: string;
  description?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  tone?: "danger";
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "flex w-full items-center gap-3 border-b border-white/[0.05] px-3 py-3 text-left last:border-b-0 transition-colors",
        onClick && "hover:bg-surface-1",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "text-body",
            tone === "danger" ? "text-tone-down" : "text-foreground",
          )}
        >
          {label}
        </span>
        {description && (
          <span className="text-caption text-muted-foreground">
            {description}
          </span>
        )}
      </div>
      {trailing && (
        <span
          className={cn(
            "shrink-0",
            tone === "danger" ? "text-tone-down" : "text-muted-foreground",
          )}
        >
          {trailing}
        </span>
      )}
    </Tag>
  );
}

function SegmentedRow<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-white/[0.05] px-3 py-3 last:border-b-0">
      <div className="flex min-w-0 flex-col">
        <span className="text-body text-foreground">{label}</span>
        {description && (
          <span className="text-caption text-muted-foreground">
            {description}
          </span>
        )}
      </div>
      <div
        role="radiogroup"
        className="flex items-center gap-1 rounded-md bg-surface-1 p-0.5"
      >
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex h-7 flex-1 items-center justify-center rounded-sm text-body transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
                active
                  ? "bg-surface-3 font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DensitySetting() {
  const { density, setDensity } = useDensity();
  const options: { value: Density; label: string }[] = [
    { value: "small", label: "Compact" },
    { value: "medium", label: "Default" },
    { value: "large", label: "Roomy" },
  ];
  return (
    <SegmentedRow
      label="Display density"
      description="How tightly UI text and rows pack together"
      value={density}
      options={options}
      onChange={setDensity}
    />
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 ease-out",
        checked ? "bg-primary" : "bg-surface-4",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute size-4 rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-transform duration-150 ease-out",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab contents                                                       */
/* ------------------------------------------------------------------ */



function AllocationView({ total }: { total: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-1">
        {ALLOCATION.map((a) => (
          <span
            key={a.id}
            aria-hidden
            className="block h-full"
            style={{
              width: `${(a.value / total) * 100}%`,
              background: a.color,
            }}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {ALLOCATION.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between gap-3 py-1"
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ background: a.color }}
              />
              <span className="text-body text-foreground">{a.name}</span>
            </span>
            <span className="text-body tabular-nums text-foreground">
              {USD.format(a.value)}{" "}
              <span className="text-muted-foreground">
                · {((a.value / total) * 100).toFixed(1)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActivityList() {
  return (
    <ul className="flex flex-col gap-3">
      {ACTIVITY.map((a) => {
        const accent =
          a.kind === "buy" || a.kind === "deposit"
            ? "text-primary"
            : a.kind === "sell"
              ? "text-tone-down"
              : "text-muted-foreground";

        const Icon =
          a.kind === "buy"
            ? ArrowDownLeft
            : a.kind === "sell"
              ? ArrowUpRight
              : a.kind === "deposit"
                ? Plus
                : Repeat;

        return (
          <li key={a.id} className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-1"
            >
              <Icon strokeWidth={1.75} className={cn("size-3.5", accent)} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-body text-foreground">
                <span className="font-medium capitalize">{a.kind}</span>{" "}
                <span className="text-muted-foreground">·</span>{" "}
                <span className="font-medium">{a.symbol}</span>
                {a.amount > 0 && (
                  <span className="ml-1.5 text-muted-foreground tabular-nums">
                    {USD.format(a.amount)}
                  </span>
                )}
              </span>
              <span className="text-body text-muted-foreground">
                {a.note ?? a.when}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
