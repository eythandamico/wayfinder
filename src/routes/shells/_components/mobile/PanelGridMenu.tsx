"use client";

import { useRef, useState } from "react";
import { LayoutGrid, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import type { SwipePanel } from "./SwipePanelDeck";

type Props = {
  panels: SwipePanel[];
  activeIndex: number;
  /** Snap the deck to the given panel. Called from a tile tap. */
  onJump: (index: number) => void;
};

/**
 * Compact "all panels" popover anchored to a 4-grid icon in the
 * mobile indicator strip. Tap → a small floating menu drops down
 * showing every panel as a tile, plus a dashed "+" tile at the end
 * as the affordance for adding a new panel.
 *
 * Tiles are a 2-column grid for thumb reachability — a 3-column
 * grid would push the touch target under the 44px iOS minimum at
 * the mini-popover width (~288px).
 *
 * Add-tile behavior: stubbed for now. Mobile doesn't yet have the
 * desktop layout tree's panel registry wired up; tapping just
 * closes the menu. When mobile gains a real "add panel" surface
 * (mirroring AddPanelMenu on desktop), route the click there.
 */
export function PanelGridMenu({ panels, activeIndex, onJump }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setOpen(false), open);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="All panels"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-md text-muted-foreground",
          "transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
          open
            ? "bg-surface-3 text-foreground"
            : "hover:bg-surface-2 hover:text-foreground",
        )}
      >
        <LayoutGrid strokeWidth={1.75} className="size-5" aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute right-0 top-full z-40 mt-2 w-[18rem] rounded-xl bg-popover p-3",
            "ring-1 ring-inset ring-white/10 shadow-[0_18px_40px_-12px_rgba(0,0,0,0.75)]",
            "backdrop-blur-md",
          )}
        >
          <ul className="grid grid-cols-2 gap-2">
            {panels.map((p, i) => {
              const isActive = i === activeIndex;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onJump(i);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-lg px-2",
                      "transition-[background-color,color] duration-150 ease-out",
                      "ring-1 ring-inset",
                      isActive
                        ? "bg-surface-3 text-foreground ring-primary/30"
                        : "bg-surface-1 text-muted-foreground ring-white/[0.04] hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    <span className="text-base font-medium leading-none">
                      {p.label}
                    </span>
                    {isActive && (
                      <span
                        aria-hidden
                        className="h-1 w-4 rounded-full bg-primary"
                      />
                    )}
                  </button>
                </li>
              );
            })}
            {/* Add tile — dashed border signals "empty slot, tap to
             *  fill". Stubbed: tapping just closes the menu until a
             *  mobile add-panel surface lands. */}
            <li>
              <button
                type="button"
                role="menuitem"
                aria-label="Add panel"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex aspect-square w-full items-center justify-center rounded-lg",
                  "border border-dashed border-white/15 text-muted-foreground",
                  "transition-[color,border-color] duration-150 ease-out",
                  "hover:border-white/30 hover:text-foreground",
                )}
              >
                <Plus strokeWidth={1.75} className="size-5" aria-hidden />
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
