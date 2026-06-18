"use client";

import { Fragment } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PanelThumbnail } from "../PanelThumbnail";
import {
  PANEL_CATEGORIES,
  PANEL_TYPES,
} from "../../_layout/registry";
import type { PanelType } from "../../_layout/types";
import { BottomSheet } from "./BottomSheet";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Panel types already present in the deck. Shown but visually
   *  marked as "Added" so the user knows what's in play. */
  presentTypes: ReadonlySet<PanelType>;
  /** Picked a panel — add it to the deck. */
  onPick: (type: PanelType) => void;
};

/**
 * Full-page panel catalog. Grouped by category (Markets / Insights
 * / Social / Extras) — same buckets as the desktop AddPanelMenu so
 * the surfaces stay consistent. Each tile renders the panel's SVG
 * thumbnail (PanelThumbnail) + label; tap to add to the deck.
 *
 * Panels already in the deck are shown but visually muted with an
 * "Added" tag. Picking an already-present panel re-adds it (each
 * deck slot is a fresh instance) — matches the desktop pattern.
 */
export function MobileAddPanelPicker({
  open,
  onOpenChange,
  presentTypes,
  onPick,
}: Props) {
  // Group registry entries by category, preserving category order
  // from PANEL_CATEGORIES. Empty categories fall away.
  const grouped = PANEL_CATEGORIES.map((cat) => ({
    cat,
    panels: PANEL_TYPES.filter((p) => p.category === cat.id),
  })).filter((g) => g.panels.length > 0);

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Add panel"
      heightFraction={0.92}
    >
      <div className="px-4 pb-6">
        <p className="pb-4 text-base leading-snug text-muted-foreground">
          Pick a panel to add to your swipe deck. Already-added panels can be
          added again as a fresh instance.
        </p>
        {grouped.map((group) => (
          <section key={group.cat.id} className="pb-5">
            <h3 className="pb-2 text-base font-semibold text-foreground">
              {group.cat.label}
            </h3>
            <ul className="grid grid-cols-2 gap-3">
              {group.panels.map((p) => {
                const isPresent = presentTypes.has(p.type);
                return (
                  <Fragment key={p.type}>
                    <li>
                      <button
                        type="button"
                        onClick={() => onPick(p.type)}
                        aria-label={`Add ${p.label} panel`}
                        className={cn(
                          "group/tile flex w-full flex-col gap-2 rounded-lg p-2 text-left",
                          "ring-1 ring-inset transition-[background-color,ring-color,scale] duration-150 ease-out",
                          "active:scale-[0.98]",
                          isPresent
                            ? "bg-surface-1/60 ring-white/[0.04] hover:bg-surface-2"
                            : "bg-surface-1 ring-white/[0.04] hover:bg-surface-2",
                        )}
                      >
                        <div
                          className={cn(
                            "aspect-[12/7] w-full overflow-hidden rounded-md",
                            isPresent && "opacity-70",
                          )}
                        >
                          <PanelThumbnail type={p.type} className="h-full w-full" />
                        </div>
                        <div className="flex items-center justify-between gap-1 px-1">
                          <span className="truncate text-base font-medium text-foreground">
                            {p.label}
                          </span>
                          {isPresent ? (
                            <span
                              className="shrink-0 rounded-full bg-surface-3 px-1.5 py-0.5 text-caption text-muted-foreground"
                              title="Already in your deck"
                            >
                              Added
                            </span>
                          ) : (
                            <Plus
                              strokeWidth={1.75}
                              className="size-4 shrink-0 text-muted-foreground/70 transition-colors group-hover/tile:text-foreground"
                              aria-hidden
                            />
                          )}
                        </div>
                      </button>
                    </li>
                  </Fragment>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </BottomSheet>
  );
}
