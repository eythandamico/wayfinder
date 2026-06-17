"use client";

import { GripHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDragApi } from "./DragContext";
import { useLayoutDispatch } from "./LayoutContext";
import { PANEL_REGISTRY } from "./registry";
import type { LeafNode, PanelInstance } from "./types";

/**
 * Persistent chrome strip rendered above every leaf in the layout.
 *
 *   - Left:  panel label
 *   - Center: grip glyph (visual drag affordance — the whole bar is
 *             the drag handle)
 *   - Right: panel-specific actions, then close ×
 *
 * Always visible. During an in-flight drag, the strip drops pointer
 * events so drop-target hit-testing falls through to the leaf wrapper
 * underneath.
 */
export function PanelChrome({
  region,
  panel,
  children,
  actions,
}: {
  region: LeafNode;
  panel: PanelInstance;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const dispatch = useLayoutDispatch();
  const drag = useDragApi();
  const desc = PANEL_REGISTRY[panel.type];
  const label = desc?.label ?? panel.type;

  const onClose = () => {
    dispatch?.({
      type: "closePanel",
      regionId: region.id,
      panelId: panel.id,
    });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.beginDrag(e, {
      sourceRegionId: region.id,
      panelId: panel.id,
      label,
      iconType: panel.type,
    });
  };

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div
        onPointerDown={onPointerDown}
        // No aria-label / role="button" here. Drag is fundamentally a
        // pointer interaction — the spatial grab-and-place feel
        // doesn't translate to a keyboard equivalent worth shipping.
        // Previously claimed `aria-label="Drag X"` which made SR users
        // think this strip was interactive when it wasn't. The Close
        // button next to it is the keyboard-accessible panel control.
        data-drag-handle
        data-region-id={region.id}
        data-panel-id={panel.id}
        className={cn(
          // Bottom separation comes from a faint inset shadow instead of
          // a hard border-b, so the strip sits on the panel surface
          // without the 1px step that read as "rigid".
          "grid h-8 shrink-0 cursor-grab select-none touch-none grid-cols-[1fr_auto_1fr] items-center gap-2 px-2 text-muted-foreground shadow-[inset_0_-1px_0_rgba(255,255,255,0.03)] transition-colors duration-150 ease-out hover:bg-white/[0.02] active:cursor-grabbing",
          drag.state && "pointer-events-none",
        )}
      >
        {/* Left — panel label. Tracking + padding kept tight so multi-
            word labels ("Order Book") clear the centered grip without
            truncating at the default panel width. */}
        <span className="truncate pl-1 pr-1 text-caption font-medium uppercase tracking-[0.08em]">
          {label}
        </span>

        {/* Center — horizontal grip icon, the visual drag affordance. */}
        <GripHorizontal
          strokeWidth={1.75}
          className="size-3.5 text-muted-foreground/60"
          aria-hidden
        />

        {/* Right — panel-specific actions, then close × . */}
        <div
          className="flex items-center gap-1 justify-self-end"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {actions}
          <button
            type="button"
            aria-label={`Close ${label}`}
            onClick={onClose}
            className="relative inline-flex size-5 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-1 hover:text-foreground active:scale-[0.96] before:absolute before:-inset-2.5 before:content-[''] focus-visible:bg-surface-1 focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <X strokeWidth={2} className="size-3" aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
