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
  LayoutGrid,
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
  usePortfolioSheet,
  useViewMode,
  useWalletConnection,
  type ViewMode,
} from "../_state/shells-context";
import { useActivity } from "../_state/activity-context";
import { ActivityRow } from "./ActivityRow";
import { CommandSearchBar } from "./CommandBar";
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
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-2">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="flex shrink-0 items-center rounded-md px-1 transition-opacity hover:opacity-80"
          aria-label="Wayfinder home"
        >
          <img
            src="/brand/wayfinder-logomark.svg"
            alt="Wayfinder"
            width={141}
            height={32}
            className="h-6 w-auto"
          />
        </Link>

        <ViewModeToggle />
      </div>

      <div className="w-[560px] max-w-full justify-self-center">
        <CommandSearchBar />
      </div>

      <div className="flex items-center justify-end gap-2">
        <AddPanelMenu />
        <LayoutsMenu />
        <ActivityMenu />
        <BarDivider />
        <ConnectedPill address={WALLET_ADDRESS} />
      </div>
    </div>
  );
}

function ViewModeToggle() {
  const { viewMode, setViewMode } = useViewMode();
  return (
    <div className="flex items-center gap-1">
      <ViewModeButton
        active={viewMode === "trading"}
        onClick={() => setViewMode("trading")}
        label="Trade"
        target="trading"
        icon={CandlestickChart}
      />
      <ViewModeButton
        active={viewMode === "explore"}
        onClick={() => setViewMode("explore")}
        label="Paths"
        target="explore"
        icon={Compass}
      />
    </div>
  );
}

function ViewModeButton({
  active,
  onClick,
  label,
  target,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  target: ViewMode;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-target={target}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-body font-medium transition-[background-color,color,box-shadow,scale] duration-150 ease-out active:scale-[0.96]",
        active
          ? "bg-surface-4 text-foreground"
          : "text-foreground hover:bg-surface-2",
      )}
    >
      <Icon strokeWidth={1.75} className="size-4" aria-hidden />
      {label}
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
          "absolute right-0 top-full z-40 mt-1 flex max-h-[min(80vh,720px)] w-[480px] origin-top-right flex-col overflow-hidden rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-2xl transition-[opacity,transform] duration-150 ease-out",
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
          "absolute right-0 top-full z-40 mt-1 max-h-[min(80vh,640px)] w-[340px] origin-top-right overflow-y-auto rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 p-2 shadow-2xl transition-[opacity,transform] duration-150 ease-out",
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
/*  Activity                                                           */
/* ------------------------------------------------------------------ */

/**
 * Bell-icon dropdown sitting between the layouts menu and the wallet
 * pill in the top nav. Shares state with ActivityPanel via
 * useActivity() so marking an item read in either surface reflects in
 * the other. Has a header CTA that adds the Activity panel to the
 * layout, and a footer CTA that opens the phone-number modal for
 * live SMS updates.
 */
function ActivityMenu() {
  const [open, setOpen] = useState(false);
  const { items, unreadCount, markAllRead } = useActivity();
  const layoutDispatch = useLayoutDispatch();
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const openActivityPanel = () => {
    if (!layoutDispatch) return;
     
    const id = `activity-${Date.now()}`;
    layoutDispatch({
      type: "addPanelIfMissing",
      panel: { id, type: "activity" },
    });
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="activity-menu"
        aria-label={
          unreadCount > 0 ? `Activity, ${unreadCount} unread` : "Activity"
        }
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex size-8 items-center justify-center rounded-md bg-surface-3 text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-4 active:scale-[0.96]"
      >
        <Bell strokeWidth={1.75} className="size-4" aria-hidden />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute right-1 top-1 size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]"
          />
        )}
      </button>

      <div
        id="activity-menu"
        role="menu"
        // `inert` over `aria-hidden`: closing the menu can leave a
        // focus ring on the last clicked option (e.g. after the user
        // drilled into TradingCardSheet from a signal row), and
        // aria-hidden on an ancestor of a focused descendant is an
        // a11y violation. `inert` hides AND blocks focus.
        inert={!open}
        className={cn(
          "absolute right-0 top-full z-40 mt-1 flex max-h-[min(80vh,560px)] w-[380px] origin-top-right flex-col overflow-hidden rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-2xl transition-[opacity,transform] duration-150 ease-out",
          open
            ? "translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-[0.98] opacity-0",
        )}
      >
        {/* Header — title + unread badge, plus a CTA that drops an
            Activity panel into the layout for a persistent feed. */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.05] px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-body font-semibold text-foreground">
              Activity
            </span>
            {unreadCount > 0 && (
              <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary/15 px-1 text-micro font-semibold tabular-nums text-primary ring-1 ring-inset ring-primary/20">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {layoutDispatch && (
              <button
                type="button"
                onClick={openActivityPanel}
                className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-caption text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground"
              >
                <Plus strokeWidth={2} className="size-3" aria-hidden />
                Open panel
              </button>
            )}
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-caption text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check strokeWidth={2} className="size-3" aria-hidden />
              Mark all read
            </button>
          </div>
        </div>

        {/* List */}
        <div
          role="listbox"
          aria-label="Activity"
          className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto py-1"
        >
          {items.length === 0 ? (
            <div className="px-6 py-8 text-center text-body text-muted-foreground">
              You&rsquo;re all caught up.
            </div>
          ) : (
            items.map((it) => <ActivityRow key={it.id} item={it} />)
          )}
        </div>

        {/* Footer — SMS opt-in CTA. Mirrors the chat ComposerToast
            visual so the offer reads as the same affordance no matter
            where the user encounters it. Suppressed once opted in. */}
        <ActivityFooterCta onPick={() => setOpen(false)} />
      </div>
    </div>
  );
}

/**
 * Wallet pill — jazzicon wrapped in a token-usage progress ring.
 * Click opens the portfolio side sheet; hover reveals a popover with
 * the full CPU/RAM/Tokens/cost breakdown that used to live in the
 * old nav UsagePill.
 *
 * Ring math: r=16 stroke=2 puts the ring centered at the button's
 * edge with a 2px gap inside between the ring and the jazzicon, and
 * 1px of breathing room outside. SVG starts rotated −90° so progress
 * grows clockwise from 12 o'clock.
 */
function ConnectedPill({ address }: { address: string }) {
  const { open, togglePortfolio } = usePortfolioSheet();
  const { connected, connect } = useWalletConnection();
  const short = shortAddress(address);

  // Pre-connect: show a clear "Connect" CTA in the chrome.
  if (!connected) {
    return (
      <button
        type="button"
        onClick={connect}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
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
          "relative inline-flex size-9 items-center justify-center rounded-full transition-[background-color,scale] duration-150 ease-out active:scale-[0.96]",
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
        {/* Jazzicon (default) cross-fades with the % label (on hover).
            Both share the same circular slot so the swap reads as
            the icon FLIPPING to a percentage, not a popover. */}
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

/** Inline switch row for app-level chrome the user can opt into. Lives
 *  at the top of the add-panel menu so the toggle is discoverable
 *  alongside the regular panel catalog. */
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
