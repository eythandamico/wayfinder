"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import type { Market } from "../_types";
import { useFloatingPopover } from "../_hooks/useFloatingPopover";
import { SubduedButton } from "./SubduedButton";
import { TokenLogo } from "./TokenLogo";

const POPOVER_MAX_HEIGHT = 360;
const POPOVER_MIN_WIDTH = 260;

/**
 * Shared "Add token" footer used by Watchlist and Mini Charts. The
 * SubduedButton matches the Jobs / Activity panel footers; tapping it
 * opens a portal'd search popover keyed off the same pattern as the
 * trade panel's denom picker — search row at top, scrollable token
 * list below, click-outside + Esc to close, Enter to add the top
 * match.
 *
 * Portal'd via useFloatingPopover so the popover can escape narrow
 * panels (mini charts can be quite small). Width is read from the
 * trigger button on each open so the popover reads as the button's
 * extension rather than a free-floating chip.
 */
export function AddTokenFooter({
  available,
  onAdd,
  label = "Add token",
}: {
  available: Market[];
  onAdd: (market: Market) => void;
  /** Optional override for the trigger label — defaults to "Add token". */
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [triggerWidth, setTriggerWidth] = useState(POPOVER_MIN_WIDTH);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const close = () => setOpen(false);

  const { wrapRef, popoverRef, pos } = useFloatingPopover({
    open,
    onClose: close,
    triggerRef,
    width: triggerWidth,
    maxHeight: POPOVER_MAX_HEIGHT,
    // Left-align so the popover hugs the SubduedButton below it — the
    // button + popover read as one stacked surface, not the right-
    // anchored pill pattern the trade panel uses.
    anchorRight: false,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return available;
    return available.filter((m) => {
      const ticker = m.symbol.split("-")[0]?.toLowerCase() ?? "";
      return ticker.includes(q) || m.symbol.toLowerCase().includes(q);
    });
  }, [available, query]);

  // Focus the search input when the popover opens; reset query when it
  // closes so the next open starts clean.
  useEffect(() => {
    if (!open) {
      const id = window.setTimeout(() => setQuery(""), 150);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  // Snap the popover width to the trigger BEFORE opening so the first
  // measure inside useFloatingPopover lands at the correct width — no
  // first-frame jump.
  const toggleOpen = () => {
    if (!open && triggerRef.current) {
      const width = Math.max(
        POPOVER_MIN_WIDTH,
        triggerRef.current.getBoundingClientRect().width,
      );
      setTriggerWidth(width);
    }
    setOpen((v) => !v);
  };

  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      onAdd(filtered[0]);
      close();
    }
  };

  return (
    <div
      ref={wrapRef}
      className="relative shrink-0 border-t border-white/[0.05] p-2"
    >
      <SubduedButton
        ref={triggerRef}
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="w-full px-3 py-2"
      >
        {label}
      </SubduedButton>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Search tokens"
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: triggerWidth,
              maxHeight: POPOVER_MAX_HEIGHT,
              transformOrigin:
                pos.placement === "above" ? "bottom left" : "top left",
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
                onKeyDown={onSearchKey}
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
                  <span className="text-foreground">&ldquo;{query}&rdquo;</span>
                </div>
              ) : (
                filtered.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      onAdd(m);
                      close();
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-1"
                  >
                    <TokenLogo
                      symbol={m.symbol}
                      char={m.iconChar}
                      bg={m.iconBg}
                      fg={m.iconFg ?? "#fff"}
                      size={28}
                    />
                    <span className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span className="truncate text-body font-medium text-foreground">
                        {m.symbol.split("-")[0]}
                      </span>
                      <span className="truncate text-caption text-muted-foreground">
                        {m.symbol.replace("-", " / ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
                      {m.lastPrice}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
