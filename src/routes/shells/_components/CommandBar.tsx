"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ExternalLink,
  Layers,
  Loader2,
  Radio,
  RotateCcw,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui";
import { MARKETS } from "../_data/mocks";
import {
  useActiveMarket,
  useChartMarkets,
  useCommandBar,
  useMarketPickerTarget,
  useMarquee,
  useWalletConnection,
} from "../_state/shells-context";
import { useLayoutDispatch } from "../_layout/LayoutContext";
import { WORKSPACE_PRESETS } from "../_layout/presets";
import type {
  CommandBarMarket,
  CommandBarNewsItem,
  CommandBarResponse,
  CommandBarToken,
} from "@/api/command-bar";

/** Synchronously clears any pending chart-picker target before
 *  opening the palette so the next open always defaults to "global"
 *  unless a chart sets a target *after* this. */
function useGlobalCommandOpener() {
  const { openCommand } = useCommandBar();
  const { setTarget } = useMarketPickerTarget();
  return () => {
    setTarget(null);
    openCommand();
  };
}
import { SearchIcon } from "./icons";
import { TokenLogo } from "./TokenLogo";

const kbdClass =
  "inline-flex h-5 items-center justify-center rounded bg-surface-3 min-w-[1.25rem] px-1 text-caption font-semibold uppercase tracking-wider text-white";

type Filter = "all" | "tokens" | "markets" | "news" | "actions";

/** Workspace action — the verbs the command bar can invoke directly.
 *  Mostly thin wrappers around hooks the rest of the app already
 *  consumes (layout dispatch, wallet, marquee toggle). */
type CommandAction = {
  id: string;
  label: string;
  description: string;
  /** Optional keyword string for matching beyond the visible label. */
  keywords?: string;
  /** Lucide icon for the row leading slot. */
  icon: React.ComponentType<{
    className?: string;
    strokeWidth?: number;
    "aria-hidden"?: boolean;
  }>;
  /** Optional shortcut chip rendered on the trailing edge. */
  shortcut?: string;
  run: () => void;
};

type ResultItem =
  | { kind: "token"; value: CommandBarToken }
  | { kind: "market"; value: CommandBarMarket }
  | { kind: "news"; value: CommandBarNewsItem }
  | { kind: "action"; value: CommandAction };

/* ------------------------------------------------------------------ */
/*  Static trigger — sits in MarketHeader                              */
/* ------------------------------------------------------------------ */

export function CommandSearchBar() {
  // Globally-opened palette — always routes selections to the
  // activeMarket (and from there to whichever chart is the main).
  const openGlobal = useGlobalCommandOpener();
  return (
    <div className="relative w-full max-w-[560px]">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label="Search tokens and paths"
        onClick={openGlobal}
        data-demo="command-trigger"
        className="inline-flex h-[var(--ui-h-input)] w-full items-center gap-2.5 rounded-lg bg-surface-3 px-3.5 text-foreground transition-[background-color] duration-150 ease-out hover:bg-surface-4"
      >
        <SearchIcon />
        <span className="flex-1 truncate text-left text-body text-muted-foreground">
          Search tokens or paths…
        </span>
        <kbd aria-hidden className={cn(kbdClass, "hidden sm:inline-flex")}>
          ⌘K
        </kbd>
      </button>
    </div>
  );
}

export function CommandSearchIconButton() {
  const openGlobal = useGlobalCommandOpener();
  return (
    <button
      type="button"
      aria-label="Search tokens and paths"
      onClick={openGlobal}
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground"
    >
      <SearchIcon />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Page-root controller — owns ⌘K + renders the centered palette      */
/* ------------------------------------------------------------------ */

export function CommandBar() {
  const { open, closeCommand, toggleCommand } = useCommandBar();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleCommand();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggleCommand]);

  return <CommandPalette open={open} closeCommand={closeCommand} />;
}

/* ------------------------------------------------------------------ */
/*  CommandPalette — the centered modal                                */
/*                                                                     */
/*  Vertically centered in the viewport, ~520px wide, results capped   */
/*  at 320px so the whole palette stays a compact card rather than     */
/*  sprawling to the screen edges. Two-phase rendered/visible pattern  */
/*  for enter + exit animation. Esc closes; arrow keys + enter         */
/*  navigate + activate; click outside dismisses.                      */
/* ------------------------------------------------------------------ */

function CommandPalette({
  open,
  closeCommand,
}: {
  open: boolean;
  closeCommand: () => void;
}) {
  const [rendered, setRendered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const { setActiveMarket } = useActiveMarket();
  const { target: marketPickerTarget, setTarget: setMarketPickerTarget } =
    useMarketPickerTarget();
  const { setChartMarket } = useChartMarkets();

  // Reset query/filter/selection whenever the palette opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setFilter("all");
      setSelected(0);
    }
  }, [open]);

  // Two-phase mount/visibility so both enter and exit transitions
  // run. DOUBLE rAF: a single rAF can land the mount + visible flip
  // in the same paint under React 19's commit semantics, leaving the
  // browser with no "from" state to animate. The outer rAF yields
  // control so the browser paints the mount; the inner fires the
  // visible flip on the frame after that paint.
  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      setRendered(true);
      let id2 = 0;
      const id1 = requestAnimationFrame(() => {
        id2 = requestAnimationFrame(() => setVisible(true));
      });
      return () => {
        cancelAnimationFrame(id1);
        if (id2) cancelAnimationFrame(id2);
      };
    }
    setVisible(false);
    const id = window.setTimeout(() => setRendered(false), 280);
    return () => window.clearTimeout(id);
  }, [open]);

  // Focus the input after the open transition starts.
  useEffect(() => {
    if (!visible) return;
    const id = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [visible]);

  // Restore focus to the previously-focused element after close.
  useEffect(() => {
    if (open) return;
    const el = prevFocusRef.current;
    if (el && typeof el.focus === "function") el.focus();
  }, [open]);

  // Live data from /api/command-bar (tokens + Polymarket + news).
  // Debounced inside the hook so each keystroke doesn't fire a fetch.
  const data = useCommandBarData(query, open);

  // Workspace actions — built fresh per open so the labels reflect
  // current state (wallet connect status, marquee toggle direction).
  const layoutDispatch = useLayoutDispatch();
  const { enabled: marqueeEnabled, setEnabled: setMarqueeEnabled } = useMarquee();
  const { connected, connect, disconnect } = useWalletConnection();

  const actions: CommandAction[] = useMemo(() => {
    const list: CommandAction[] = [];
    list.push({
      id: "marquee-toggle",
      label: marqueeEnabled ? "Hide marquee tape" : "Show marquee tape",
      description: "Top-of-shell live ticker",
      keywords: "tape ticker marquee toggle",
      icon: Radio,
      run: () => setMarqueeEnabled(!marqueeEnabled),
    });
    list.push({
      id: "wallet-toggle",
      label: connected ? "Disconnect wallet" : "Connect wallet",
      description: connected ? "Sign out of the trading wallet" : "Mock wallet connect",
      keywords: "wallet connect disconnect",
      icon: Wallet,
      run: () => (connected ? disconnect() : connect()),
    });
    if (layoutDispatch) {
      for (const preset of WORKSPACE_PRESETS) {
        list.push({
          id: `preset-${preset.id}`,
          label: `Load: ${preset.name}`,
          description: preset.description,
          keywords: `preset layout workspace ${preset.name}`,
          icon: Layers,
          run: () =>
            layoutDispatch({ type: "replaceLayout", root: preset.layout }),
        });
      }
      list.push({
        id: "layout-reset",
        label: "Reset to default layout",
        description: "Discard the current arrangement",
        keywords: "reset default layout workspace",
        icon: RotateCcw,
        run: () => layoutDispatch({ type: "resetLayout" }),
      });
    }
    return list;
  }, [
    marqueeEnabled,
    setMarqueeEnabled,
    connected,
    connect,
    disconnect,
    layoutDispatch,
  ]);

  // Filter actions by query — they're hardcoded so we just match
  // client-side (label + keywords).
  const filteredActions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) =>
      `${a.label} ${a.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [actions, query]);

  // Build the flattened result list in display order, respecting the
  // currently-active filter chip.
  const items: ResultItem[] = useMemo(() => {
    const out: ResultItem[] = [];
    if (filter === "all" || filter === "actions") {
      for (const a of filteredActions) out.push({ kind: "action", value: a });
    }
    if (filter === "all" || filter === "tokens") {
      for (const t of data.tokens) out.push({ kind: "token", value: t });
    }
    if (filter === "all" || filter === "markets") {
      for (const m of data.markets) out.push({ kind: "market", value: m });
    }
    if (filter === "all" || filter === "news") {
      for (const n of data.news) out.push({ kind: "news", value: n });
    }
    return out;
  }, [filter, filteredActions, data.tokens, data.markets, data.news]);

  useEffect(() => {
    if (!open) return;
    setSelected(0);
  }, [query, filter, open]);

  // Clear the chart-picker routing hint whenever the palette closes
  // so an aborted picker doesn't leak its target into the next
  // unrelated opening (e.g. opening CommandBar from the top nav).
  useEffect(() => {
    if (open) return;
    setMarketPickerTarget(null);
  }, [open, setMarketPickerTarget]);

  const activate = useCallback(
    (item: ResultItem) => {
      if (item.kind === "token") {
        // Map the live-data token back to its local Market entry —
        // the rest of the app expects the full Market shape (tvSymbol,
        // iconChar, etc.) when active-market changes. If the live
        // token has no matching local Market we silently skip.
        const market = MARKETS.find((m) => m.id === item.value.marketId);
        if (market) {
          if (marketPickerTarget) {
            setChartMarket(marketPickerTarget, market.id);
          } else {
            setActiveMarket(market);
          }
        }
        setMarketPickerTarget(null);
      } else if (item.kind === "market") {
        window.open(
          `https://polymarket.com/event/${item.value.slug}`,
          "_blank",
          "noopener,noreferrer",
        );
      } else if (item.kind === "news") {
        if (item.value.link) {
          window.open(item.value.link, "_blank", "noopener,noreferrer");
        }
      } else if (item.kind === "action") {
        item.value.run();
      }
      closeCommand();
    },
    [
      setActiveMarket,
      closeCommand,
      marketPickerTarget,
      setChartMarket,
      setMarketPickerTarget,
    ],
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeCommand();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = items[selected];
        if (item) activate(item);
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [open, items, selected, activate, closeCommand]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-index="${selected}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selected, open]);

  const activeItem = items[selected];
  const activeId = activeItem
    ? `cmd-${activeItem.kind}-${activeItem.value.id}`
    : undefined;

  if (!rendered || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-center bg-background/45 px-4 pt-[12vh] backdrop-blur-md transition-opacity duration-300 ease-out",
        visible ? "opacity-100" : "opacity-0",
      )}
      onClick={closeCommand}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command search"
        onClick={(e) => e.stopPropagation()}
        // Inline transition rather than a Tailwind utility — Tailwind
        // v4 emits translate-y-X / scale-X as standalone CSS properties
        // (`translate` and `scale`), so a `transition-[opacity,transform]`
        // class wouldn't cover them and the values would jump. Listing
        // them explicitly here guarantees they tween.
        style={{
          transition: [
            "opacity 260ms cubic-bezier(0.23, 1, 0.32, 1)",
            "translate 260ms cubic-bezier(0.23, 1, 0.32, 1)",
            "scale 260ms cubic-bezier(0.23, 1, 0.32, 1)",
            "transform 260ms cubic-bezier(0.23, 1, 0.32, 1)",
          ].join(", "),
          willChange: "transform, opacity",
        }}
        className={cn(
          // Top-anchored: the wrapper uses items-start + pt-[12vh] so
          // the popup's TOP edge stays planted as the results list
          // shrinks/grows. The bottom moves; the input row doesn't.
          // origin-top on the enter animation keeps the open feeling
          // "drop down from the search input" rather than "bloom from
          // the middle".
          "flex w-full max-w-[640px] origin-top flex-col overflow-hidden rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-2xl",
          visible
            ? "translate-y-0 scale-100 opacity-100"
            : "-translate-y-2 scale-[0.97] opacity-0",
        )}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-3">
          <SearchIcon />
          <input
            ref={searchRef}
            type="text"
            role="combobox"
            aria-expanded
            aria-autocomplete="list"
            aria-controls="cmd-results"
            aria-activedescendant={activeId}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tokens, markets, news, or actions…"
            className="flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Search across tokens, markets, news, and actions"
          />
          {data.loading && (
            <Loader2
              className="size-3.5 animate-spin text-muted-foreground"
              strokeWidth={2}
              aria-hidden
            />
          )}
          <kbd aria-hidden className={kbdClass}>
            esc
          </kbd>
        </div>

        {/* Category filters — narrow the result list to a single
            source. Defaults to All. */}
        <div
          role="tablist"
          aria-label="Filter results"
          className="scroll-thin flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-white/[0.05] px-3 py-2"
        >
          {(
            [
              { id: "all", label: "All" },
              { id: "tokens", label: "Tokens" },
              { id: "markets", label: "Markets" },
              { id: "news", label: "News" },
              { id: "actions", label: "Actions" },
            ] as const
          ).map((c) => (
            <FilterChip
              key={c.id}
              active={filter === c.id}
              onClick={() => setFilter(c.id)}
              label={c.label}
            />
          ))}
        </div>

        {/* Results — capped at 440px; longer lists scroll inside
            this region. */}
        <div
          id="cmd-results"
          ref={listRef}
          role="listbox"
          aria-label="Results"
          className="scroll-thin flex max-h-[440px] flex-col overflow-y-auto py-1.5"
        >
          {items.length === 0 ? (
            <EmptyState query={query} loading={data.loading} />
          ) : (
            <>
              {items.map((item, i) => {
                const prev = items[i - 1];
                const showHeader = !prev || prev.kind !== item.kind;
                const id = `cmd-${item.kind}-${item.value.id}`;
                const isSelected = i === selected;
                return (
                  <Fragment key={id}>
                    {showHeader && (
                      <div className="px-4 pb-1 pt-2 text-micro uppercase tracking-[0.14em] text-muted-foreground">
                        {sectionLabel(item.kind, query)}
                      </div>
                    )}
                    {item.kind === "token" ? (
                      <TokenRow
                        id={id}
                        token={item.value}
                        index={i}
                        selected={isSelected}
                        onHover={() => setSelected(i)}
                        onSelect={() => activate(item)}
                      />
                    ) : item.kind === "market" ? (
                      <MarketRow
                        id={id}
                        market={item.value}
                        index={i}
                        selected={isSelected}
                        onHover={() => setSelected(i)}
                        onSelect={() => activate(item)}
                      />
                    ) : item.kind === "news" ? (
                      <NewsRow
                        id={id}
                        news={item.value}
                        index={i}
                        selected={isSelected}
                        onHover={() => setSelected(i)}
                        onSelect={() => activate(item)}
                      />
                    ) : (
                      <ActionRow
                        id={id}
                        action={item.value}
                        index={i}
                        selected={isSelected}
                        onHover={() => setSelected(i)}
                        onSelect={() => activate(item)}
                      />
                    )}
                  </Fragment>
                );
              })}
              {/* Section-level skeletons for async data that hasn't
                  landed yet. The local actions render synchronously,
                  so without these the palette is short on first open
                  and visibly jumps in height when tokens/markets/news
                  arrive a moment later. */}
              {data.loading &&
                (filter === "all" || filter === "tokens") &&
                data.tokens.length === 0 && (
                  <LoadingSection
                    label={sectionLabel("token", query)}
                    rows={4}
                  />
                )}
              {data.loading &&
                (filter === "all" || filter === "markets") &&
                data.markets.length === 0 && (
                  <LoadingSection
                    label={sectionLabel("market", query)}
                    rows={3}
                  />
                )}
              {data.loading &&
                (filter === "all" || filter === "news") &&
                data.news.length === 0 && (
                  <LoadingSection
                    label={sectionLabel("news", query)}
                    rows={3}
                  />
                )}
            </>
          )}
        </div>

        {/* Footer — tight nav hints */}
        <div className="flex items-center justify-between border-t border-white/[0.05] px-4 py-2 text-caption text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <kbd aria-hidden className={kbdClass}>
              ↑
            </kbd>
            <kbd aria-hidden className={kbdClass}>
              ↓
            </kbd>
            Navigate
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd aria-hidden className={kbdClass}>
              ↵
            </kbd>
            Select
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                              */
/* ------------------------------------------------------------------ */

/** Section-level skeleton for an async result type (tokens / markets
 *  / news) that hasn't returned yet. Renders the same section header
 *  style + N skeleton rows shaped like a real result row (circle
 *  icon + two text lines + meta) so the palette holds its size
 *  while the fetch finishes. */
function LoadingSection({ label, rows }: { label: string; rows: number }) {
  return (
    <>
      <div className="px-4 pb-1 pt-2 text-micro uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex w-full items-center gap-3 px-4 py-2"
          aria-hidden
        >
          <Skeleton variant="circle" className="size-7 shrink-0" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton variant="line" className="w-1/3" />
            <Skeleton variant="line" className="h-2 w-2/3" />
          </div>
          <Skeleton variant="line" className="h-2 w-10 shrink-0" />
        </div>
      ))}
    </>
  );
}

function EmptyState({
  query,
  loading,
}: {
  query: string;
  loading: boolean;
}) {
  if (loading) {
    // Skeleton rows mirror the result-row layout (icon + two text
    // lines + meta) so when results land the layout doesn't lurch.
    return (
      <div
        role="status"
        aria-label="Searching"
        className="flex flex-col gap-0.5 px-1.5 py-1.5"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-md px-2.5 py-2"
          >
            <Skeleton variant="circle" className="size-8 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton variant="line" className="w-1/2" />
              <Skeleton variant="line" className="h-2 w-3/4" />
            </div>
            <Skeleton variant="line" className="h-2 w-12 shrink-0" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-1 px-4 py-10 text-center text-body text-muted-foreground"
    >
      {query ? (
        <span>
          Nothing matches{" "}
          <span className="text-foreground">&ldquo;{query}&rdquo;</span>
        </span>
      ) : (
        <span>No results.</span>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-2.5 py-0.5 text-caption transition-colors duration-150 ease-out",
        active
          ? "bg-primary/15 text-primary"
          : "bg-surface-1 text-muted-foreground hover:bg-surface-3 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Row renderers                                                        */
/* ------------------------------------------------------------------ */

function TokenRow({
  id,
  token,
  index,
  selected,
  onSelect,
  onHover,
}: {
  id: string;
  token: CommandBarToken;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  // Reuse the local Market entry's icon style so the palette row
  // matches whatever the trade panel + market header render. Falls
  // back to a plain initial when the token isn't in our catalog.
  const market = MARKETS.find((m) => m.id === token.marketId);
  const positive = token.change24h >= 0;
  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-selected={selected}
      data-index={index}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      onMouseEnter={onHover}
      aria-label={`Load ${token.symbol}`}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors focus-visible:outline-none",
        selected ? "bg-surface-2" : "hover:bg-surface-1",
      )}
    >
      {market ? (
        <TokenLogo
          symbol={market.symbol}
          char={market.iconChar}
          bg={market.iconBg}
          fg={market.iconFg ?? "#fff"}
          size={28}
        />
      ) : (
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-caption font-semibold text-foreground"
        >
          {token.symbol.charAt(0)}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
        <div className="flex items-center gap-2">
          <span className="truncate text-body font-medium text-foreground">
            {token.symbol}
          </span>
          <span className="shrink-0 truncate text-caption text-muted-foreground">
            {token.name}
          </span>
        </div>
        <span className="text-caption text-muted-foreground">
          {market ? "HL Perps" : "Spot"}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 leading-tight">
        <span className="text-body tabular-nums text-foreground">
          {formatTokenPrice(token.price)}
        </span>
        <span
          aria-label={`24h change ${positive ? "up" : "down"} ${Math.abs(token.change24h).toFixed(2)}%`}
          className={cn(
            "inline-flex items-center gap-0.5 text-caption tabular-nums",
            positive ? "text-primary" : "text-tone-down",
          )}
        >
          <span aria-hidden>{positive ? "▲" : "▼"}</span>
          {Math.abs(token.change24h).toFixed(2)}%
        </span>
      </div>
    </button>
  );
}

function MarketRow({
  id,
  market,
  index,
  selected,
  onSelect,
  onHover,
}: {
  id: string;
  market: CommandBarMarket;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-selected={selected}
      data-index={index}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      onMouseEnter={onHover}
      aria-label={`Open ${market.title} on Polymarket`}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors focus-visible:outline-none",
        selected ? "bg-surface-2" : "hover:bg-surface-1",
      )}
    >
      <ResultThumb image={market.image} alt={market.title} fallback="market" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
        <span className="line-clamp-1 text-body font-medium text-foreground">
          {market.title}
        </span>
        <span className="truncate text-caption text-muted-foreground">
          {market.topOption ? (
            <>
              <span className="text-foreground">{market.topOption.label}</span>
              {" · "}
              {Math.round(market.topOption.price * 100)}¢
            </>
          ) : (
            "Polymarket"
          )}
        </span>
      </div>
      <ExternalLink
        className="size-3.5 shrink-0 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden
      />
    </button>
  );
}

function NewsRow({
  id,
  news,
  index,
  selected,
  onSelect,
  onHover,
}: {
  id: string;
  news: CommandBarNewsItem;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-selected={selected}
      data-index={index}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      onMouseEnter={onHover}
      aria-label={`Open: ${news.headline}`}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors focus-visible:outline-none",
        selected ? "bg-surface-2" : "hover:bg-surface-1",
      )}
    >
      <ResultThumb image={news.image} alt={news.headline} fallback="news" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
        <span className="line-clamp-1 text-body font-medium text-foreground">
          {news.headline}
        </span>
        <span className="truncate text-caption text-muted-foreground">
          {news.source} · {formatRelative(news.publishedAt)}
        </span>
      </div>
      <ExternalLink
        className="size-3.5 shrink-0 text-muted-foreground"
        strokeWidth={1.75}
        aria-hidden
      />
    </button>
  );
}

function ActionRow({
  id,
  action,
  index,
  selected,
  onSelect,
  onHover,
}: {
  id: string;
  action: CommandAction;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const Icon = action.icon;
  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-selected={selected}
      data-index={index}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onSelect}
      onMouseEnter={onHover}
      aria-label={action.label}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors focus-visible:outline-none",
        selected ? "bg-surface-2" : "hover:bg-surface-1",
      )}
    >
      <span
        aria-hidden
        className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-2 text-muted-foreground"
      >
        <Icon className="size-3.5" strokeWidth={1.75} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
        <span className="truncate text-body font-medium text-foreground">
          {action.label}
        </span>
        <span className="truncate text-caption text-muted-foreground">
          {action.description}
        </span>
      </div>
      {action.shortcut && (
        <kbd aria-hidden className={kbdClass}>
          {action.shortcut}
        </kbd>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Thumbnail (markets + news) with graceful fallback                    */
/* ------------------------------------------------------------------ */

function ResultThumb({
  image,
  alt,
  fallback,
}: {
  image: string | null;
  alt: string;
  fallback: "market" | "news";
}) {
  const [errored, setErrored] = useState(false);
  if (!image || errored) {
    return (
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-1 text-caption text-muted-foreground ring-1 ring-inset ring-white/[0.06]"
      >
        {fallback === "market" ? "M" : "N"}
      </span>
    );
  }
  return (
    <div className="relative size-9 shrink-0 overflow-hidden rounded-md bg-surface-1 ring-1 ring-inset ring-white/[0.06]">
      <img
        src={image}
        alt={alt}
        className="absolute inset-0 size-full object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Live-data hook + helpers                                             */
/* ------------------------------------------------------------------ */

type SearchState = {
  tokens: CommandBarToken[];
  markets: CommandBarMarket[];
  news: CommandBarNewsItem[];
  loading: boolean;
};

const EMPTY_STATE: SearchState = {
  tokens: [],
  markets: [],
  news: [],
  loading: false,
};

/** Debounced fetch into /api/command-bar. Fires the initial default
 *  request as soon as the palette opens (no query), then re-fetches
 *  ~250ms after the user stops typing. Concurrent calls are cancelled
 *  via a per-request flag so a slow earlier response can't overwrite
 *  the newest result. */
function useCommandBarData(query: string, open: boolean): SearchState {
  const [state, setState] = useState<SearchState>(EMPTY_STATE);

  useEffect(() => {
    if (!open) {
      setState(EMPTY_STATE);
      return;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/command-bar?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as CommandBarResponse;
        setState({
          tokens: data.tokens ?? [],
          markets: data.markets ?? [],
          news: data.news ?? [],
          loading: false,
        });
      } catch (err) {
        // The abort signal firing during the request is the expected
        // path when the user types a new query (the prior in-flight
        // request gets cancelled). That's not a real failure — bail
        // silently, the next request will populate state.
        if (controller.signal.aborted) return;
        // Real failure (network, parse, server 500). Log it so dev
        // can see it, and clear `loading` so the UI doesn't stay in
        // the spinner state forever. Keep the previous result lists
        // in place so the user sees stale data rather than an empty
        // panel — better UX than blanking out on transient errors.
        if (import.meta.env.MODE !== "production") {
          console.error("[command-bar] search failed:", err);
        }
        setState((s) => ({ ...s, loading: false }));
      }
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, open]);

  return state;
}

function sectionLabel(kind: ResultItem["kind"], query: string): string {
  const hasQuery = !!query.trim();
  switch (kind) {
    case "action":
      return "Actions";
    case "token":
      return hasQuery ? "Tokens" : "Trending tokens";
    case "market":
      return hasQuery ? "Polymarket" : "Top Polymarket";
    case "news":
      return hasQuery ? "News" : "Breaking news";
  }
}

function formatTokenPrice(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`;
  return `${Math.round(diffSec / 86400)}d ago`;
}
