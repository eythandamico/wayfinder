"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { Market, Venue } from "../_types";
import { MARKETS, VENUES } from "../_data/mocks";
import { SearchIcon } from "./icons";

export function MarketPicker({
  open,
  onClose,
  activeMarketId,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  activeMarketId: string;
  onSelect: (market: Market) => void;
}) {
  const [query, setQuery] = useState("");
  const [venue, setVenue] = useState<Venue>("hl-perps");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [rendered, setRendered] = useState(open);
  const [visible, setVisible] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // Staged enter/exit animation. setState inside the effect is intentional here —
  // we need a commit between `rendered=true` and `visible=true` for CSS transitions.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRendered(true);
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const id = window.setTimeout(() => setRendered(false), 200);
    return () => window.clearTimeout(id);
  }, [open]);

  // Reset search state + restore focus on open/close transitions.
  useEffect(() => {
    if (open) {
      prevFocusRef.current = document.activeElement as HTMLElement | null;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery("");
      setHighlightedIndex(0);
      const id = requestAnimationFrame(() => searchRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    // Return focus to the trigger when the modal closes
    const el = prevFocusRef.current;
    if (el && typeof el.focus === "function") {
      el.focus();
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return MARKETS.filter((m) => m.venue === venue).filter(
      (m) => !q || m.symbol.toLowerCase().includes(q),
    );
  }, [query, venue]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const m = filtered[highlightedIndex];
        if (m) onSelect(m);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, filtered, highlightedIndex, onClose, onSelect]);

  // Keep highlighted row in view when navigating via keyboard
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLButtonElement>(
      `[data-row-index="${highlightedIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, open]);

  if (!rendered || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-start justify-center bg-background/80 p-4 pt-[8vh] backdrop-blur-sm transition-opacity duration-200 ease-out",
        visible ? "opacity-100" : "opacity-0",
      )}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="market-picker-title"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex w-full max-w-[720px] origin-top flex-col overflow-hidden rounded-lg bg-card shadow-2xl ring-1 ring-white/5 transition-[opacity,transform] duration-200 ease-out",
          visible
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 -translate-y-2 scale-[0.98]",
        )}
      >
        <h2 id="market-picker-title" className="sr-only">
          Select a market
        </h2>

        {/* Search */}
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
          <SearchIcon />
          <label htmlFor="market-search" className="sr-only">
            Search markets
          </label>
          <input
            id="market-search"
            ref={searchRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="market-list"
            aria-autocomplete="list"
            aria-activedescendant={
              filtered[highlightedIndex]
                ? `market-option-${filtered[highlightedIndex].id}`
                : undefined
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightedIndex(0);
            }}
            placeholder="Search markets..."
            className="flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Venue tabs */}
        <div role="tablist" aria-label="Venue" className="flex items-center gap-1 border-b border-white/5 px-3">
          {VENUES.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={venue === v.id}
              onClick={() => {
                setVenue(v.id);
                setHighlightedIndex(0);
              }}
              className={cn(
                "relative px-3 py-[var(--ui-y)] text-body font-medium transition-colors",
                venue === v.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v.label}
              {venue === v.id && (
                <span aria-hidden className="absolute inset-x-3 -bottom-px h-px bg-foreground" />
              )}
            </button>
          ))}
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_120px_90px_120px] gap-4 border-b border-white/5 px-4 py-2 text-body text-muted-foreground">
          <span>Symbol</span>
          <span className="text-right">Last price</span>
          <span className="text-right">24H</span>
          <span className="text-right">Volume</span>
        </div>

        {/* List */}
        <div
          id="market-list"
          role="listbox"
          aria-label="Markets"
          ref={listRef}
          className="scroll-thin max-h-[480px] overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <div role="status" className="flex items-center justify-center py-12 text-body text-muted-foreground">
              No markets match {query ? `"${query}"` : "this venue"}
            </div>
          ) : (
            filtered.map((m, i) => (
              <button
                key={m.id}
                id={`market-option-${m.id}`}
                type="button"
                role="option"
                aria-selected={m.id === activeMarketId}
                data-row-index={i}
                onClick={() => onSelect(m)}
                onMouseEnter={() => setHighlightedIndex(i)}
                className={cn(
                  "grid w-full grid-cols-[1fr_120px_90px_120px] items-center gap-4 px-4 py-2.5 text-left transition-colors",
                  i === highlightedIndex && "bg-white/[0.04]",
                  m.id === activeMarketId && "bg-primary/[0.06]",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full font-bold",
                      m.iconChar.length > 1
                        ? "text-body"
                        : "text-body",
                    )}
                    style={{
                      backgroundColor: m.iconBg,
                      color: m.iconFg ?? "#fff",
                    }}
                  >
                    {m.iconChar}
                  </span>
                  <span className="truncate text-body text-foreground">
                    {m.symbol}
                  </span>
                  <span className="shrink-0 text-body text-muted-foreground">
                    {m.leverage}
                  </span>
                </div>
                <span className="text-right text-body tabular-nums text-foreground">
                  {m.lastPrice}
                </span>
                <span
                  aria-label={`24h change ${m.change24hTone === "positive" ? "up" : "down"} ${m.change24h}`}
                  className={cn(
                    "flex items-center justify-end gap-1 text-right text-body tabular-nums",
                    m.change24hTone === "positive"
                      ? "text-primary"
                      : "text-[#f07575]",
                  )}
                >
                  <span aria-hidden className="text-body">
                    {m.change24hTone === "positive" ? "▲" : "▼"}
                  </span>
                  {m.change24h}
                </span>
                <span className="text-right text-body tabular-nums text-muted-foreground">
                  {m.volume}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
