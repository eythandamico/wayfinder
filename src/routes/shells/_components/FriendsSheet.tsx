"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useFriendsSheet } from "../_state/shells-context";
import { FriendsPanel } from "./FriendsPanel";
import { LEFT_RAIL_WIDTH } from "./LeftRail";

/** Width of the friends sheet when open, including the gutter on its
 *  left side. page.tsx uses this to compute the panel-grid's left
 *  margin so the shell squeezes rather than the sheet overlaying.
 *  Mirrors PORTFOLIO_SHEET_WIDTH for visual symmetry when both
 *  sheets are open. */
export const FRIENDS_SHEET_WIDTH = 480;

/** Inset on the top, left, and bottom so the sheet floats as a
 *  rounded panel matching the shell's chrome rhythm. Mirrors the
 *  PortfolioSheet's gutter on the opposite edge. 8px keeps the same
 *  rhythm the rails and panel grid use. */
const SHEET_GUTTER = 8;
/** Fallback used until the panel-grid top is measured. Matches the
 *  PortfolioSheet fallback so both sides line up before measurement
 *  lands. */
const SHEET_TOP_FALLBACK = 84;

/**
 * Left-side mirror of PortfolioSheet — hosts the existing FriendsPanel
 * (tabs, friend rows, leaderboard, trader drill-in) inside a floating
 * side surface that PUSHES the shell rather than overlaying it. The
 * panel grid animates its left margin by the sheet's width when this
 * is open so the panels remain fully interactive.
 *
 * Closes via:
 *   - The sidebar-toggle button in MarketHeader (toggle)
 *   - Esc
 * Clicking elsewhere in the shell does NOT close — the sheet is a
 * persistent surface, not a modal.
 */
export function FriendsSheet() {
  const { open, closeFriends } = useFriendsSheet();
  // Measure the panel-grid container's top edge — density changes,
  // the marquee toggle, and command-search-bar layout all shift the
  // grid down. Same approach as PortfolioSheet so both sheets line up
  // perfectly along the top edge.
  const [sheetTop, setSheetTop] = useState(SHEET_TOP_FALLBACK);
  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let rafId = 0;

    const update = (el: HTMLElement) => {
      if (cancelled) return;
      setSheetTop(el.getBoundingClientRect().top);
    };

    const tryAttach = () => {
      if (cancelled) return;
      const el = document.querySelector<HTMLElement>("[data-panel-grid-top]");
      if (!el) {
        rafId = requestAnimationFrame(tryAttach);
        return;
      }
      update(el);
      ro = new ResizeObserver(() => update(el));
      ro.observe(el);
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
      if (e.key === "Escape") closeFriends();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeFriends]);

  return (
    <aside
      aria-label="Friends"
      aria-hidden={!open}
      className={cn(
        "fixed z-30 flex flex-col overflow-hidden rounded-lg bg-surface-1 backdrop-blur-md ring-1 ring-inset ring-white/[0.06] transition-transform duration-300 ease-[var(--ease-drawer)]",
      )}
      style={{
        top: sheetTop,
        // Anchor to the inner edge of the left rail. When closed, the
        // sheet translates left by its full footprint so it tucks
        // behind the rail (which has a higher z-index and covers it).
        left: LEFT_RAIL_WIDTH + SHEET_GUTTER,
        bottom: SHEET_GUTTER,
        width: FRIENDS_SHEET_WIDTH - SHEET_GUTTER,
        transform: open
          ? "translateX(0)"
          : `translateX(-${FRIENDS_SHEET_WIDTH}px)`,
      }}
      inert={!open}
    >
      <FriendsPanel />
    </aside>
  );
}
