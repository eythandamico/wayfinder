"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PanelThumbnail } from "../PanelThumbnail";
import { PANEL_REGISTRY } from "../../_layout/registry";
import type { PanelInstance } from "../../_layout/types";
import { BottomSheet } from "./BottomSheet";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panels: PanelInstance[];
  activeIndex: number;
  /** Snap the deck to the given panel and close the sheet. */
  onJump: (index: number) => void;
  /** Open the add-panel picker. */
  onAddTile: () => void;
};

/**
 * Full-page sheet that shows the swipe deck as a grid of panel
 * thumbnails — the SVG diagrams from the desktop AddPanelMenu — so
 * the user can see what each panel actually looks like before
 * jumping to it. The last tile is a dashed-border + that opens the
 * add-panel picker so the deck can be customized in-place.
 *
 * This is the "manage your panels" surface — show what you have
 * open, jump between them, add new ones. Removal will live here too
 * once the gesture lands.
 */
export function MobilePanelDeckSheet({
  open,
  onOpenChange,
  panels,
  activeIndex,
  onJump,
  onAddTile,
}: Props) {
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title="Your panels" heightFraction={0.92}>
      <div className="px-4 pb-6">
        <p className="pb-4 text-base leading-snug text-muted-foreground">
          Panels you can swipe through. Tap to jump to one, or add a new panel
          to the deck.
        </p>
        <ul className="grid grid-cols-2 gap-3">
          {panels.map((panel, i) => {
            const descriptor = PANEL_REGISTRY[panel.type];
            const label = descriptor?.label ?? panel.type;
            const isActive = i === activeIndex;
            return (
              <li key={panel.id}>
                <button
                  type="button"
                  onClick={() => onJump(i)}
                  className={cn(
                    "group/tile flex w-full flex-col gap-2 rounded-lg p-2 text-left",
                    "ring-1 ring-inset transition-[background-color,ring-color] duration-150 ease-out",
                    "active:scale-[0.98]",
                    isActive
                      ? "bg-surface-2 ring-primary/40"
                      : "bg-surface-1 ring-white/[0.04] hover:bg-surface-2",
                  )}
                >
                  <div className="aspect-[12/7] w-full overflow-hidden rounded-md">
                    {descriptor ? (
                      <PanelThumbnail
                        type={panel.type}
                        className="h-full w-full"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-md bg-surface-2 text-caption text-muted-foreground">
                        {label}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1 px-1">
                    <span className="truncate text-base font-medium text-foreground">
                      {label}
                    </span>
                    {isActive && (
                      <span
                        aria-hidden
                        title="Currently visible"
                        className="size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]"
                      />
                    )}
                  </div>
                </button>
              </li>
            );
          })}
          {/* Add tile — opens the panel picker. Dashed border reads
           *  as "empty slot, tap to fill". */}
          <li>
            <button
              type="button"
              onClick={onAddTile}
              aria-label="Add panel to deck"
              className={cn(
                "group/tile flex aspect-[12/7] w-full items-center justify-center rounded-lg",
                "border border-dashed border-white/15 text-muted-foreground",
                "transition-[color,border-color,scale] duration-150 ease-out",
                "hover:border-white/30 hover:text-foreground active:scale-[0.98]",
                // Tile is intentionally just the thumbnail aspect — no
                // bottom label row — since the icon already names it.
                "mt-0",
              )}
            >
              <Plus strokeWidth={1.75} className="size-6" aria-hidden />
            </button>
          </li>
        </ul>
      </div>
    </BottomSheet>
  );
}
