"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { shortAddress } from "@/lib/format";
import { MOCK_USAGE, WALLET_ADDRESS } from "../_data/mocks";
import { ActivityFooterCta } from "./ActivityFooterCta";
import { BarDivider } from "./icons";
import {
  Bell,
  Bookmark,
  CandlestickChart,
  Check,
  Compass,
  Gauge,
  Layers,
  ArrowDownLeft,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Radio,
  RotateCcw,
  Sparkles,
  Trash2,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import {
  useDepositModal,
  useFriendsSheet,
  usePortfolioSheet,
  useViewMode,
  useWalletConnection,
  type ViewMode,
} from "../_state/shells-context";
import { useActivity } from "../_state/activity-context";
import { ActivityRow } from "./ActivityRow";
import { CommandSearchBar } from "./CommandBar";
import { WalletPill } from "./WalletPill";
import { MOCK_ACCOUNT } from "./PortfolioPanel";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import {
  useLayoutDispatch,
  useSavedLayouts,
} from "../_layout/LayoutContext";
import {
  PANEL_CATEGORIES,
  PANEL_TYPES,
  type PanelCategory,
} from "../_layout/registry";
import { PanelThumbnail } from "./PanelThumbnail";
import { ProTag } from "./ProTag";
import { WORKSPACE_PRESETS } from "../_layout/presets";
import { useWorkspaceChrome } from "../_state/shells-context";
import { usePlan } from "../_state/plan-context";
import { SearchIcon } from "./icons";

const kbdClass =
  "inline-flex h-5 items-center justify-center rounded bg-surface-3 min-w-[1.25rem] px-1 text-caption font-semibold uppercase tracking-wider text-white";
import { CreateChartDialog } from "./CreateChartDialog";
import type { CustomChartConfig } from "./CustomChartPanel";

export function MarketHeader() {
  // Top bar sits ABOVE the left + right rails. Brand mark and wallet
  // pill live here as the identity-and-account anchors of the shell;
  // workspace-shaping tools (add panel, layouts) sit alongside; the
  // search/command bar takes the center.
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-1">
      <div className="flex items-center gap-2">
        <Link
          to="/"
          aria-label="Wayfinder home"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-opacity duration-150 ease-out hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <img
            src="/brand/wayfinder-mark.svg"
            alt="Wayfinder"
            width={24}
            height={24}
            className="size-6"
          />
        </Link>
        <span className="mx-1 h-4 w-px bg-white/[0.08]" aria-hidden />
        <FriendsSheetTopBarToggle />
        <AddPanelMenu />
        <LayoutsMenu />
      </div>

      <div className="w-[560px] max-w-full justify-self-center">
        <CommandSearchBar />
      </div>

      <div className="flex items-center justify-end gap-2">
        <DepositGroup />
        <PortfolioTotalChip />
        <PortfolioSheetTopBarToggle />
        <WalletPill address={WALLET_ADDRESS} />
      </div>
    </div>
  );
}

/** Portfolio sheet expand/collapse — mirrors the Friends top-bar
 *  toggle on the opposite edge. Uses the right-pointing PanelRight
 *  icon variants so the direction reads naturally for the right
 *  sheet. Same active-state styling as Add / Layouts / Friends. */
function PortfolioSheetTopBarToggle() {
  const { open, togglePortfolio } = usePortfolioSheet();
  const Icon = open ? PanelRightClose : PanelRightOpen;
  return (
    <button
      type="button"
      aria-label={open ? "Collapse wallet" : "Expand wallet"}
      aria-expanded={open}
      onClick={togglePortfolio}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        open
          ? "bg-surface-3 text-foreground"
          : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <Icon strokeWidth={1.75} className="size-4" aria-hidden />
    </button>
  );
}

/** Compact portfolio total — same money as the hero balance inside
 *  the PortfolioSheet, surfaced in chrome so the number is always
 *  glanceable. Click opens the sheet for the full breakdown. */
function PortfolioTotalChip() {
  const { togglePortfolio } = usePortfolioSheet();
  const usd = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  return (
    <button
      type="button"
      onClick={togglePortfolio}
      aria-label={`Portfolio total ${usd.format(MOCK_ACCOUNT.balance)} USD. Open portfolio.`}
      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md px-2.5 text-body font-semibold tabular-nums text-foreground transition-[background-color] duration-150 ease-out hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      {usd.format(MOCK_ACCOUNT.balance)}
      <span className="font-normal text-muted-foreground">USD</span>
    </button>
  );
}

/** Top-bar Deposit cluster — opens the canonical 3-step Deposit
 *  modal. Before the user funds for the first time, an "Earn $5"
 *  segment sits flush on the left of the Deposit button and shares
 *  its border so the two read as one connected control. Once the
 *  reward is claimed, the Earn segment disappears and Deposit's
 *  rounding restores to a normal chip. */
function DepositGroup() {
  const { hasDeposited, openDeposit } = useDepositModal();
  if (hasDeposited) {
    return <DepositButton onClick={openDeposit} rounding="full" />;
  }
  return (
    <div className="inline-flex items-stretch">
      <button
        type="button"
        onClick={openDeposit}
        aria-label="Earn $5 in agent credit by making your first deposit"
        title="Deposit any amount and earn $5 of agent token credit"
        className="inline-flex h-8 shrink-0 items-center rounded-l-md bg-primary/15 px-2.5 text-body font-semibold text-primary transition-colors duration-150 ease-out hover:bg-primary/20 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        Earn $5
      </button>
      <DepositButton onClick={openDeposit} rounding="right" />
    </div>
  );
}

/** Deposit chip — solid surface-3 fill, rounding swaps based on
 *  whether the Earn $5 segment is sitting flush against it. */
function DepositButton({
  onClick,
  rounding,
}: {
  onClick: () => void;
  rounding: "full" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Deposit"
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 bg-surface-3 px-2.5 text-body font-medium text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-4 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        rounding === "full" ? "rounded-md" : "rounded-r-md",
      )}
    >
      <ArrowDownLeft strokeWidth={1.75} className="size-4" aria-hidden />
      Deposit
    </button>
  );
}

/** Top-bar trigger that mirrors the Friends rail item — opens/closes
 *  the friends side sheet. The icon swaps with the sheet's state
 *  (PanelLeftOpen when closed → "open it", PanelLeftClose when open →
 *  "close it") so the direction-of-action reads at a glance. */
function FriendsSheetTopBarToggle() {
  const { open, toggleFriends } = useFriendsSheet();
  const Icon = open ? PanelLeftClose : PanelLeftOpen;
  return (
    <button
      type="button"
      aria-label={open ? "Collapse friends" : "Expand friends"}
      aria-expanded={open}
      onClick={toggleFriends}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        open
          ? "bg-surface-3 text-foreground"
          : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <Icon strokeWidth={1.75} className="size-4" aria-hidden />
    </button>
  );
}

function AddPanelMenu() {
  const dispatch = useLayoutDispatch();
  const { isPro, openPricing } = usePlan();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PanelCategory | "all">("all");
  // CreateChartDialog lives inside the Add menu now — used to be its
  // own header button. The "Create chart" tile sits next to the
  // regular Chart tile in the markets section and opens this dialog.
  const [createChartOpen, setCreateChartOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const handleClose = () => {
    setOpen(false);
    setQuery("");
    setFilter("all");
  };
  useClickOutside(ref, handleClose, open);
  // Focus the search input when the menu opens.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const add = (type: (typeof PANEL_TYPES)[number]["type"]) => {
    // Date.now() inside a click handler is fine — the purity lint flags
    // this conservatively because it can't tell it's not render-time.
    const id = `${type}-${Date.now()}`;
    dispatch?.({ type: "addPanel", panel: { id, type } });
    handleClose();
  };

  const onPlotCustomChart = (config: CustomChartConfig) => {
    if (!dispatch) return;
     
    const id = `customChart-${Date.now()}`;
    dispatch({
      type: "addPanel",
      panel: {
        id,
        type: "customChart",
        config: {
          title: config.title,
          series: config.series,
          timeframe: config.timeframe,
        },
      },
    });
  };

  if (!dispatch) return null;

  // Filter the panel catalog by the active category chip + the search
  // query. Empty query + "all" shows everything grouped by category.
  const q = query.trim().toLowerCase();
  // Synthetic "Create chart" tile — shown in the markets section
  // when the current filter chip allows it and the query (if any)
  // matches "create" or "chart".
  const createChartVisible =
    (filter === "all" || filter === "markets") &&
    (!q || "create chart".includes(q));
  const filteredPanels = PANEL_TYPES.filter((p) => {
    if (filter !== "all" && p.category !== filter) return false;
    if (q && !p.label.toLowerCase().includes(q)) return false;
    return true;
  });
  // Group filtered panels by category in PANEL_CATEGORIES order so
  // section ordering stays predictable. Markets is kept visible when
  // the Create chart synthetic tile matches even if no real panels
  // in that category do (e.g. user searched "create").
  const groups = PANEL_CATEGORIES.map((cat) => ({
    cat,
    panels: filteredPanels.filter((p) => p.category === cat.id),
  })).filter(
    (g) =>
      g.panels.length > 0 || (g.cat.id === "markets" && createChartVisible),
  );

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="add-panel-menu"
        aria-label="Add panel"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-surface-3 px-2.5 text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-4 active:scale-[0.96]"
      >
        <Plus strokeWidth={2} className="size-4" aria-hidden />
        <span className="text-body font-medium">Add</span>
      </button>

      <div
        id="add-panel-menu"
        role="menu"
        aria-hidden={!open}
        className={cn(
          "absolute left-0 top-full z-40 mt-1 flex max-h-[min(80vh,720px)] w-[480px] origin-top-left flex-col overflow-hidden rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-2xl transition-[opacity,transform] duration-150 ease-out",
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
        )}
      >
        {/* Workspace chrome — compact 2×2 toggle grid, no descriptions.
            Cool flags users can flip without leaving the menu. */}
        <div className="shrink-0 p-2">
          <div className="px-2 pb-1.5 pt-0.5 text-micro uppercase tracking-[0.16em] text-muted-foreground">
            Workspace
          </div>
          <ChromeToggleGrid />
        </div>

        {/* Search row — filters everything below in real time. */}
        <div className="flex shrink-0 items-center gap-2 border-t border-white/[0.05] px-3 py-2">
          <SearchIcon />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search panels…"
            aria-label="Search panels"
            className="flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd aria-hidden className={kbdClass}>
            esc
          </kbd>
        </div>

        {/* Category filter chips — same pattern as the command bar. */}
        <div
          role="tablist"
          aria-label="Filter panels"
          className="scroll-thin flex shrink-0 items-center gap-1.5 overflow-x-auto border-t border-white/[0.05] px-3 py-2"
        >
          <FilterChip
            active={filter === "all"}
            label="All"
            onClick={() => setFilter("all")}
          />
          {PANEL_CATEGORIES.map((c) => (
            <FilterChip
              key={c.id}
              active={filter === c.id}
              label={c.label}
              onClick={() => setFilter(c.id)}
            />
          ))}
        </div>

        {/* Panel grid — 3 columns, grouped by category, no drill-in. */}
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          {groups.length === 0 ? (
            <div className="px-4 py-10 text-center text-body text-muted-foreground">
              No panels match{" "}
              <span className="text-foreground">&ldquo;{query}&rdquo;</span>
            </div>
          ) : (
            groups.map((g) => {
              // Where to drop the synthetic Create chart tile: right
              // after the regular Chart tile if it's visible, or at
              // the very start of the markets section if Chart was
              // filtered out but Create chart still matched.
              const showCreateHere =
                g.cat.id === "markets" && createChartVisible;
              const hasChart = g.panels.some((p) => p.type === "chart");
              const openCreateChart = () => {
                handleClose();
                // Defer so the menu close animation can start before
                // the dialog mounts on top of it.
                window.setTimeout(() => setCreateChartOpen(true), 0);
              };
              return (
                <section key={g.cat.id} className="px-2 pb-2">
                  <div className="sticky top-0 z-[1] bg-popover/85 px-2 pb-1 pt-2 text-micro uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-sm">
                    {g.cat.label}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {showCreateHere && !hasChart && (
                      <CreateChartTile onClick={openCreateChart} />
                    )}
                    {g.panels.map((p) => {
                      const locked = !!p.pro && !isPro;
                      const onTile = () => {
                        if (locked) {
                          handleClose();
                          openPricing(`panel:${p.type}`);
                          return;
                        }
                        add(p.type);
                      };
                      return (
                        <Fragment key={p.type}>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={onTile}
                            aria-label={
                              locked
                                ? `${p.label} (Pro). Click to upgrade.`
                                : `Add ${p.label} panel`
                            }
                            className="group/tile flex flex-col gap-1.5 rounded-md p-1.5 text-left transition-[background-color,scale] duration-150 ease-out hover:bg-surface-1 active:scale-[0.98]"
                          >
                            <div className="aspect-[12/7] w-full overflow-hidden rounded-md">
                              <PanelThumbnail
                                type={p.type}
                                className="h-full w-full"
                              />
                            </div>
                            <span className="flex items-center justify-between gap-1 px-1">
                              <span className="truncate text-caption font-medium text-foreground">
                                {p.label}
                              </span>
                              {locked ? (
                                <ProTag />
                              ) : (
                                <Plus
                                  strokeWidth={1.75}
                                  className="size-3 shrink-0 text-muted-foreground/60 transition-colors group-hover/tile:text-foreground"
                                  aria-hidden
                                />
                              )}
                            </span>
                          </button>
                          {p.type === "chart" && showCreateHere && (
                            <CreateChartTile onClick={openCreateChart} />
                          )}
                        </Fragment>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </div>
      <CreateChartDialog
        open={createChartOpen}
        onOpenChange={setCreateChartOpen}
        onPlot={onPlotCustomChart}
      />
    </div>
  );
}

/** Synthetic tile rendered next to the regular Chart tile in the Add
 *  Panel menu. Opens CreateChartDialog instead of dispatching addPanel.
 *  Uses the chart thumbnail with a primary-tinted plus badge so it
 *  reads as "Chart, but you configure it" without a new illustration. */
function CreateChartTile({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      aria-label="Create custom chart"
      className="group/tile flex flex-col gap-1.5 rounded-md p-1.5 text-left transition-[background-color,scale] duration-150 ease-out hover:bg-surface-1 active:scale-[0.98]"
    >
      <div className="relative aspect-[12/7] w-full overflow-hidden rounded-md">
        <PanelThumbnail type="chart" className="h-full w-full" />
        <span
          aria-hidden
          className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
        >
          <Plus strokeWidth={3} className="size-2.5" />
        </span>
      </div>
      <span className="flex items-center justify-between gap-1 px-1">
        <span className="truncate text-caption font-medium text-foreground">
          Create chart
        </span>
        <Plus
          strokeWidth={1.75}
          className="size-3 shrink-0 text-muted-foreground/60 transition-colors group-hover/tile:text-foreground"
          aria-hidden
        />
      </span>
    </button>
  );
}

/** Separate dropdown to the right of "Add panel" — surfaces curated
 *  presets, user-saved layouts, and the reset-to-default action. Lives
 *  in its own menu so the Add panel surface stays focused on the panel
 *  catalog. */
function LayoutsMenu() {
  const dispatch = useLayoutDispatch();
  const saved = useSavedLayouts();
  const [open, setOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  if (!dispatch) return null;

  const reset = () => {
    dispatch?.({ type: "resetLayout" });
    setOpen(false);
  };
  const loadLayout = (id: string) => {
    saved?.loadSavedLayout(id);
    setOpen(false);
  };
  const loadPreset = (presetId: string) => {
    const preset = WORKSPACE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    dispatch?.({ type: "replaceLayout", root: preset.layout });
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="layouts-menu"
        aria-label="Layouts"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-surface-3 px-2.5 text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-4 active:scale-[0.96]"
      >
        <Layers strokeWidth={1.75} className="size-4" aria-hidden />
        <span className="text-body font-medium">Layouts</span>
      </button>

      <div
        id="layouts-menu"
        role="menu"
        aria-hidden={!open}
        className={cn(
          "absolute left-0 top-full z-40 mt-1 max-h-[min(80vh,640px)] w-[340px] origin-top-left overflow-y-auto rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 p-2 shadow-2xl transition-[opacity,transform] duration-150 ease-out",
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
        )}
      >
        <div className="px-3 pb-1 pt-1 text-micro uppercase tracking-[0.16em] text-muted-foreground">
          Workspace presets
        </div>
        {WORKSPACE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            role="menuitem"
            onClick={() => loadPreset(preset.id)}
            className="flex w-full items-center rounded-md px-3 py-1.5 text-left text-body text-foreground transition-colors hover:bg-surface-1"
          >
            {preset.name}
          </button>
        ))}

        {saved && (
          <>
            <div className="my-1 h-px bg-surface-1" />
            <div className="flex items-center justify-between px-3 pb-1 pt-1.5">
              <span className="text-micro uppercase tracking-[0.16em] text-muted-foreground">
                Saved layouts
              </span>
              {saved.savedLayouts.length > 0 && (
                <span className="text-micro tabular-nums text-muted-foreground/70">
                  {saved.savedLayouts.length}
                </span>
              )}
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => setSaveDialogOpen(true)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-surface-1"
            >
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted-foreground"
              >
                <Bookmark strokeWidth={1.75} className="size-3.5" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-body text-foreground">
                  Save current layout
                </span>
                <span className="text-caption text-muted-foreground">
                  Snapshot this arrangement
                </span>
              </span>
            </button>
            {saved.savedLayouts.map((entry) => (
              <SavedLayoutRow
                key={entry.id}
                entry={entry}
                onLoad={() => loadLayout(entry.id)}
                onRequestDelete={() =>
                  setPendingDelete({ id: entry.id, name: entry.name })
                }
              />
            ))}
          </>
        )}

        <div className="my-1 h-px bg-surface-1" />
        <button
          type="button"
          role="menuitem"
          onClick={reset}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-body text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground"
        >
          <RotateCcw strokeWidth={1.75} className="size-3.5" aria-hidden />
          Reset to default layout
        </button>
      </div>

      <SaveLayoutDialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        defaultName={`Layout ${(saved?.savedLayouts.length ?? 0) + 1}`}
        onSave={(name) => {
          saved?.saveCurrentLayout(name);
          setSaveDialogOpen(false);
          setOpen(false);
        }}
      />

      <DeleteSavedLayoutDialog
        entry={pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          saved?.deleteSavedLayout(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function SavedLayoutRow({
  entry,
  onLoad,
  onRequestDelete,
}: {
  entry: import("../_layout/saved-layouts").SavedLayoutEntry;
  onLoad: () => void;
  onRequestDelete: () => void;
}) {
  return (
    <div className="group/saved relative flex items-center rounded-md hover:bg-surface-1">
      <button
        type="button"
        role="menuitem"
        onClick={onLoad}
        className="flex flex-1 items-center gap-3 px-3 py-2 text-left"
      >
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted-foreground"
        >
          <LayoutGrid strokeWidth={1.75} className="size-3.5" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-body text-foreground">
            {entry.name}
          </span>
          <span className="text-caption text-muted-foreground">
            Saved {formatSavedAgo(entry.savedAt)}
          </span>
        </span>
      </button>
      <button
        type="button"
        aria-label={`Delete ${entry.name}`}
        onClick={(e) => {
          e.stopPropagation();
          onRequestDelete();
        }}
        className="mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 opacity-0 transition-[background-color,color,opacity,scale] duration-150 ease-out group-hover/saved:opacity-100 hover:bg-surface-4 hover:text-tone-down focus-visible:opacity-100 active:scale-[0.96]"
      >
        <Trash2 strokeWidth={1.75} className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

function formatSavedAgo(ts: number): string {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

/**
 * Modal for naming a new saved layout. Base UI Dialog so the focus
 * trap / escape / outside-click behavior is correct without us
 * reinventing it. Pre-fills with "Layout N" so a user who just
 * wants to save fast can hit Enter.
 */
function SaveLayoutDialog({
  open,
  onClose,
  defaultName,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  defaultName: string;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(defaultName);
  useEffect(() => {
    // Re-prime the name when the dialog reopens so each save starts
    // from a fresh suggested name. (Not a derived render, so an
    // effect is correct here.)
    if (open) {
      setName(defaultName);
    }
  }, [open, defaultName]);

  return (
    <Dialog.Root open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[var(--z-modal-bg)] bg-background/70 backdrop-blur-[3px] transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 origin-center rounded-xl bg-card backdrop-blur-md p-4 ring-1 ring-inset ring-white/[0.06] shadow-2xl transition-[opacity,transform] duration-200 ease-[var(--ease-strong)] data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0">
          <Dialog.Title className="text-body font-semibold text-foreground">
            Save current layout
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-caption text-muted-foreground">
            Snapshot the panels + sizes you have right now. Load it back
            anytime from the Add Panel menu.
          </Dialog.Description>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = name.trim();
              if (!trimmed) return;
              onSave(trimmed);
            }}
            className="mt-3"
          >
            <input
              type="text"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              placeholder="Layout name"
              aria-label="Layout name"
              className="w-full rounded-md bg-surface-2 px-3 py-2 text-body text-foreground outline-none ring-1 ring-inset ring-white/[0.06] transition-[box-shadow] duration-150 ease-out focus-visible:ring-white/[0.10] placeholder:text-muted-foreground"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 items-center justify-center rounded-md px-3 text-body text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-1 hover:text-foreground active:scale-[0.96]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="inline-flex h-8 items-center justify-center rounded-md bg-primary/15 px-3 text-body font-semibold text-primary transition-[background-color,scale] duration-150 ease-out hover:bg-primary/25 active:scale-[0.96] disabled:cursor-default disabled:opacity-50"
              >
                Save layout
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Confirmation for deleting a saved layout. AlertDialog because the
 * action is destructive + irreversible (per UI baseline). Two-button
 * Cancel / Delete with the destructive choice color-locked to the
 * down-tone red.
 */
function DeleteSavedLayoutDialog({
  entry,
  onClose,
  onConfirm,
}: {
  entry: { id: string; name: string } | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root
      open={!!entry}
      onOpenChange={(o) => (o ? null : onClose())}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-[var(--z-modal-bg)] bg-background/70 backdrop-blur-[3px] transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 origin-center rounded-xl bg-card backdrop-blur-md p-4 ring-1 ring-inset ring-white/[0.06] shadow-2xl transition-[opacity,transform] duration-200 ease-[var(--ease-strong)] data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0">
          <AlertDialog.Title className="text-body font-semibold text-foreground">
            Delete this layout?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-1 text-caption text-muted-foreground">
            <span className="text-foreground">&ldquo;{entry?.name}&rdquo;</span> will
            be removed from your saved layouts. This can&apos;t be
            undone.
          </AlertDialog.Description>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center justify-center rounded-md px-3 text-body text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-1 hover:text-foreground active:scale-[0.96]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex h-8 items-center justify-center rounded-md bg-tone-down/15 px-3 text-body font-semibold text-tone-down transition-[background-color,scale] duration-150 ease-out hover:bg-tone-down/25 active:scale-[0.96]"
            >
              Delete
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/* ------------------------------------------------------------------ */
/*  (ActivityMenu + ConnectedPill have migrated to RightRail.tsx)      */
/* ------------------------------------------------------------------ */

/**
 * 2-column grid of workspace toggles. Each tile is a label + icon +
 * mini switch, no descriptions — the label is self-explanatory and
 * keeps the dropdown vertically compact. Cool flags users can flip
 * without leaving the menu.
 */
function ChromeToggleGrid() {
  const chrome = useWorkspaceChrome();
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <ChromeToggleTile
        label="Marquee tape"
        Icon={Radio}
        checked={chrome.marquee}
        onChange={chrome.setMarquee}
      />
      <ChromeToggleTile
        label="Sound effects"
        Icon={Volume2}
        checked={chrome.sound}
        onChange={chrome.setSound}
      />
      <ChromeToggleTile
        label="Reduce motion"
        Icon={Gauge}
        checked={chrome.reduceMotion}
        onChange={chrome.setReduceMotion}
      />
      <ChromeToggleTile
        label="Ambient aurora"
        Icon={Sparkles}
        checked={chrome.ambient}
        onChange={chrome.setAmbient}
      />
    </div>
  );
}

function ChromeToggleTile({
  label,
  Icon,
  checked,
  onChange,
}: {
  label: string;
  Icon: LucideIcon;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "group/toggle flex items-center gap-2 rounded-md px-2.5 py-2 text-left transition-colors",
        checked ? "bg-primary/[0.08]" : "bg-white/[0.03] hover:bg-surface-2",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
          checked
            ? "bg-primary/15 text-primary"
            : "bg-surface-1 text-muted-foreground",
        )}
      >
        <Icon strokeWidth={1.75} className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-caption font-medium text-foreground">
        {label}
      </span>
      <span
        className={cn(
          "inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors",
          checked ? "bg-primary" : "bg-surface-4",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "size-3 rounded-full bg-background shadow transition-transform",
            checked ? "translate-x-3" : "translate-x-0",
          )}
        />
      </span>
    </button>
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
