"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChartPanel } from "../ChartPanel";

/** Snap heights for the persistent chart yoke. 0 collapses to a
 *  zero-height pill; 120 is the compact strip the shell shows at
 *  rest; 360 is the focused-trading expanded view. The yoke lives
 *  ABOVE both tabs so symbol context never resets when the user
 *  toggles between Agent and Trade. */
const SNAP_HEIGHTS: readonly number[] = [0, 120, 360];
const DEFAULT_HEIGHT = 120;

/**
 * Persistent chart strip that sits above the tab body in the
 * mobile shell. Drag the bottom edge to resize; releases snap to
 * the nearest of {0, 120, 360}px. A double-tap on the handle
 * toggles between collapsed (0) and default (120).
 *
 * The yoke is the workspace's symbol context — it doesn't belong
 * to Agent or Trade; both tabs share it.
 */
export function ChartYoke() {
  const [height, setHeight] = useState<number>(DEFAULT_HEIGHT);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const dragRef = useRef<{
    startY: number;
    startHeight: number;
    pointerId: number;
  } | null>(null);

  const liveHeight = dragHeight ?? height;
  const collapsed = liveHeight < 30;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") {
      // Mouse users get the toggle button — drag's only worth it
      // on touch where the affordance is implicit.
    }
    dragRef.current = {
      startY: e.clientY,
      startHeight: height,
      pointerId: e.pointerId,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragHeight(height);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragRef.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const dy = e.clientY - s.startY;
    const next = Math.max(0, Math.min(420, s.startHeight + dy));
    setDragHeight(next);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragRef.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const target = snapTo(dragHeight ?? height);
    dragRef.current = null;
    setHeight(target);
    setDragHeight(null);
  };

  const toggle = () => {
    setHeight((h) => (h === 0 ? DEFAULT_HEIGHT : 0));
  };

  return (
    <div
      aria-label="Chart"
      className={cn(
        "relative shrink-0 overflow-hidden border-b border-white/[0.05] bg-background",
        // Animate height changes when NOT mid-drag — drag is 1:1 with
        // the finger, snap-back is animated.
        dragHeight === null &&
          "transition-[height] duration-200 ease-[var(--ease-drawer)]",
      )}
      style={{ height: liveHeight }}
    >
      {/* Chart body — only mounts when the yoke is open enough to
       *  read. Avoids the cost of rendering a tradingview iframe at
       *  0px and the visual flash when expanding from collapsed. */}
      {liveHeight > 24 && (
        <div className="absolute inset-x-0 top-0 bottom-6 overflow-hidden">
          <ChartPanel tfPosition="header" />
        </div>
      )}

      {/* Collapsed-state pill — slim row with a chevron that
       *  expands the yoke. Replaces the chart body when liveHeight
       *  is too small to show anything useful. */}
      {collapsed && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Expand chart"
          className="absolute inset-x-0 top-0 flex h-6 items-center justify-center text-caption text-muted-foreground"
        >
          <ChevronDown strokeWidth={1.75} className="size-3.5" aria-hidden />
          <span className="ml-1.5">Chart</span>
        </button>
      )}

      {/* Drag handle — sits at the bottom edge, gives the user the
       *  implicit affordance + an explicit tap target for
       *  collapse/expand. */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={toggle}
        className="absolute inset-x-0 bottom-0 z-[1] flex h-6 cursor-row-resize touch-none select-none items-center justify-center active:cursor-grabbing"
      >
        <span
          aria-hidden
          className={cn(
            "h-1 rounded-full bg-white/15 transition-[width,background-color]",
            // Wider + brighter handle when collapsed so the
            // affordance reads as "I can be expanded" rather than
            // an inert separator.
            collapsed ? "w-12 bg-white/25" : "w-10",
          )}
        />
        {/* When fully expanded, swap the chevron-down for chevron-up
         *  so the affordance reads as "drag down to shrink". */}
        {liveHeight > 240 && (
          <ChevronUp
            strokeWidth={1.75}
            className="ml-2 size-3.5 text-muted-foreground"
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}

/** Snap to the nearest entry in SNAP_HEIGHTS. Used on pointer-up
 *  after a drag — the user always lands on one of the three
 *  detents rather than freezing the yoke at an awkward height. */
function snapTo(h: number): number {
  let best = SNAP_HEIGHTS[0];
  let bestDist = Math.abs(h - best);
  for (const candidate of SNAP_HEIGHTS) {
    const d = Math.abs(h - candidate);
    if (d < bestDist) {
      best = candidate;
      bestDist = d;
    }
  }
  return best;
}
