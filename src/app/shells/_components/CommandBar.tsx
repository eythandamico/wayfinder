"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { Market, Path } from "../_types";
import { MARKETS, PATHS, PATHS_CATALOG_URL } from "../_data/mocks";
import { useActiveMarket, useCommandBar } from "../_state/shells-context";
import { SearchIcon } from "./icons";

export function CommandSearchBar() {
  const { openCommand } = useCommandBar();
  return (
    <div className="relative w-full max-w-[560px]">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label="Search tokens and paths"
        onClick={openCommand}
        className="inline-flex h-9 w-full items-center gap-2 rounded-full bg-white/5 px-3 text-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-white/10 hover:text-foreground"
      >
        <SearchIcon />
        <span className="flex-1 truncate text-left text-[13px]">
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
  const { openCommand } = useCommandBar();
  return (
    <button
      type="button"
      aria-label="Search tokens and paths"
      onClick={openCommand}
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
    >
      <SearchIcon />
    </button>
  );
}

type ResultItem =
  | { kind: "token"; value: Market }
  | { kind: "path"; value: Path };

const kbdClass =
  "inline-flex items-center justify-center rounded bg-white/[0.08] min-w-[1.25rem] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground";

export function CommandBar() {
  const { open, closeCommand, toggleCommand } = useCommandBar();
  const [rendered, setRendered] = useState(false);
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const { setActiveMarket } = useActiveMarket();

  const closeCmd = () => closeCommand();

  // Reset query + selection whenever the palette opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
    }
  }, [open]);

  // Mount / visibility lifecycle for enter/exit animation
  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      setRendered(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const id = window.setTimeout(() => setRendered(false), 200);
    return () => window.clearTimeout(id);
  }, [open]);

  // Focus search input when palette is visible; restore focus on close
  useEffect(() => {
    if (!visible) return;
    const id = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [visible]);

  useEffect(() => {
    if (open) return;
    const el = prevFocusRef.current;
    if (el && typeof el.focus === "function") el.focus();
  }, [open]);

  // Global ⌘K toggle
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

  const { tokens, paths } = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return { tokens: MARKETS.slice(0, 6), paths: PATHS };
    return {
      tokens: MARKETS.filter((m) =>
        (m.symbol + " " + m.venue).toLowerCase().includes(q),
      ),
      paths: PATHS.filter((p) =>
        (p.name + " " + p.description + " " + p.tags.join(" "))
          .toLowerCase()
          .includes(q),
      ),
    };
  }, [query]);

  const items: ResultItem[] = useMemo(
    () => [
      ...tokens.map((t) => ({ kind: "token" as const, value: t })),
      ...paths.map((p) => ({ kind: "path" as const, value: p })),
    ],
    [tokens, paths],
  );

  // Reset selection when results change
  useEffect(() => {
    if (!open) return;
    setSelected(0);
  }, [query, open]);

  const activate = (item: ResultItem) => {
    if (item.kind === "token") setActiveMarket(item.value);
    // path install: stubbed — close and defer to real handler
    closeCmd();
  };

  // Palette keyboard nav — capture phase so we intercept input arrow keys
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeCmd();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, items, selected]);

  // Keep selected row in view
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

  return (
    <>
      {rendered &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={cn(
              "fixed inset-0 z-50 flex items-start justify-center bg-background/75 px-4 pt-[12vh] backdrop-blur-lg transition-opacity duration-200 ease-out",
              visible ? "opacity-100" : "opacity-0",
            )}
            onClick={closeCmd}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Command search"
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "flex w-full max-w-[720px] origin-top flex-col overflow-hidden rounded-xl bg-background shadow-2xl ring-1 ring-white/10 transition-[opacity,transform] duration-200 ease-out",
                visible
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 -translate-y-2 scale-[0.98]",
              )}
            >
              {/* Search */}
              <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3.5">
                <SearchIcon />
                <label htmlFor="command-search" className="sr-only">
                  Search tokens or paths
                </label>
                <input
                  id="command-search"
                  ref={searchRef}
                  type="text"
                  role="combobox"
                  aria-expanded="true"
                  aria-autocomplete="list"
                  aria-controls="command-results"
                  aria-activedescendant={activeId}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tokens, tags, or path names…"
                  tabIndex={open ? 0 : -1}
                  className="flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/70"
                />
                <kbd aria-hidden className={kbdClass}>
                  esc
                </kbd>
              </div>

              {/* Results */}
              <div
                id="command-results"
                ref={listRef}
                role="listbox"
                aria-label="Results"
                className="scroll-thin flex max-h-[min(520px,60vh)] flex-col overflow-y-auto py-1"
              >
                {items.length === 0 ? (
                  <div
                    role="status"
                    className="flex flex-col items-center gap-2 px-4 py-14 text-center text-[13px] text-muted-foreground"
                  >
                    <span>
                      Nothing matches{" "}
                      <span className="text-foreground">&ldquo;{query}&rdquo;</span>
                    </span>
                    <a
                      href={PATHS_CATALOG_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] uppercase tracking-wider text-primary transition-[filter] hover:brightness-110"
                    >
                      Browse all paths →
                    </a>
                  </div>
                ) : (
                  items.map((item, i) => {
                    const prev = items[i - 1];
                    const showHeader = !prev || prev.kind !== item.kind;
                    const id = `cmd-${item.kind}-${item.value.id}`;
                    const isSelected = i === selected;
                    return (
                      <Fragment key={id}>
                        {showHeader && (
                          <div className="px-4 pb-1 pt-3 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                            {item.kind === "token"
                              ? query
                                ? "Tokens"
                                : "Featured tokens"
                              : query
                                ? "Paths"
                                : "Featured paths"}
                          </div>
                        )}
                        {item.kind === "token" ? (
                          <TokenRow
                            id={id}
                            market={item.value}
                            index={i}
                            selected={isSelected}
                            onHover={() => setSelected(i)}
                            onSelect={() => activate(item)}
                          />
                        ) : (
                          <PathRow
                            id={id}
                            path={item.value}
                            index={i}
                            selected={isSelected}
                            onHover={() => setSelected(i)}
                            onInstall={() => activate(item)}
                          />
                        )}
                      </Fragment>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-white/5 px-4 py-2.5">
                <div className="flex items-center gap-4 text-[10px] uppercase tracking-wider text-muted-foreground">
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
                <a
                  href={PATHS_CATALOG_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] uppercase tracking-wider text-primary transition-[filter] hover:brightness-110"
                >
                  View all on strategies.wayfinder.ai ↗
                </a>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function TokenRow({
  id,
  market,
  index,
  selected,
  onSelect,
  onHover,
}: {
  id: string;
  market: Market;
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
      onClick={onSelect}
      onMouseEnter={onHover}
      aria-label={`Load ${market.symbol}`}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:outline-none",
        selected ? "bg-white/[0.06]" : "hover:bg-white/[0.04]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full font-bold",
          market.iconChar.length > 1 ? "text-[10px]" : "text-[13px]",
        )}
        style={{
          backgroundColor: market.iconBg,
          color: market.iconFg ?? "#fff",
        }}
      >
        {market.iconChar}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-foreground">
            {market.symbol}
          </span>
          <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {market.leverage}
          </span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          HL Perps
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-[13px] tabular-nums text-foreground">
          {market.lastPrice}
        </span>
        <span
          aria-label={`24h change ${market.change24hTone === "positive" ? "up" : "down"} ${market.change24h}`}
          className={cn(
            "inline-flex items-center gap-0.5 text-[11px] tabular-nums",
            market.change24hTone === "positive"
              ? "text-primary"
              : "text-[#f07575]",
          )}
        >
          <span aria-hidden className="text-[10px]">
            {market.change24hTone === "positive" ? "▲" : "▼"}
          </span>
          {market.change24h}
        </span>
      </div>
    </button>
  );
}

function PathRow({
  id,
  path,
  index,
  selected,
  onInstall,
  onHover,
}: {
  id: string;
  path: Path;
  index: number;
  selected: boolean;
  onInstall: () => void;
  onHover: () => void;
}) {
  const initial = path.name.charAt(0);
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      data-index={index}
      onMouseEnter={onHover}
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 transition-colors",
        selected ? "bg-white/[0.06]" : "hover:bg-white/[0.04]",
      )}
    >
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[13px] font-semibold text-foreground/90"
      >
        {initial}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13px] font-medium text-foreground">
            {path.name}
          </span>
          {path.tags.slice(0, 1).map((t) => (
            <span
              key={t}
              className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
        <span className="truncate text-[12px] text-muted-foreground">
          {path.description}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden flex-col items-end gap-0.5 md:flex">
          <span className="text-[11px] tabular-nums text-foreground/80">
            {path.cost}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {path.installs} installs
          </span>
        </div>
        <button
          type="button"
          onClick={onInstall}
          aria-label={`Install ${path.name}`}
          className="rounded-md bg-primary/15 px-3 py-1 text-[10px] uppercase tracking-wider text-primary transition-colors hover:bg-primary/25 focus-visible:bg-primary/25 focus-visible:outline-none"
        >
          Install
        </button>
      </div>
    </div>
  );
}
