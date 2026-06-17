"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useDragApi } from "./DragContext";
import type { DropEdge } from "./types";

/**
 * Drop indicator. Renders one of two distinct components based on
 * drop kind — each owns its own motion instance so springs only run
 * between same-kind targets (gap → gap slides along the gutters;
 * edge → edge tweens across panels). Switching kinds unmounts the old
 * preview and mounts the new one, which commits the new shape
 * instantly. No more "edge slab springing down into a gutter line."
 *
 *   edge → half-panel slab, softly tinted. The slab predicts the new
 *          panel's size because the resulting size IS the slab.
 *   gap  → a thin glowing line at the gutter itself. The user is
 *          hovering a seam; light the seam.
 *
 * The dragged panel's name lives on the ghost only. No label chip on
 * the preview — would be redundant noise.
 *
 * A breathing pulse arms after 150ms of stable hover — the "I see
 * your intent, you can release" beat.
 */
type Rect = { top: number; left: number; width: number; height: number };

const PULSE_DELAY_MS = 150;
const GAP_LINE_THICKNESS = 4;

export function DropPreview() {
  const drag = useDragApi();
  const [pulsing, setPulsing] = useState(false);

  // Pulse arms after the user has hovered the same target for a
  // moment. Resets immediately when the hovered target changes.
  useEffect(() => {
    const hovered = drag.state?.hovered;
    if (!hovered) {
      const off = window.setTimeout(() => setPulsing(false), 0);
      return () => window.clearTimeout(off);
    }
    const off = window.setTimeout(() => setPulsing(false), 0);
    const on = window.setTimeout(() => setPulsing(true), PULSE_DELAY_MS);
    return () => {
      window.clearTimeout(off);
      window.clearTimeout(on);
    };
  }, [drag.state?.hovered]);

  if (!drag.state || drag.state.phase !== "dragging" || !drag.state.hovered) {
    return null;
  }
  const hovered = drag.state.hovered;
  if (hovered.kind === "edge") {
    return <EdgePreview hoveredRegionId={hovered.regionId} edge={hovered.edge} pulsing={pulsing} />;
  }
  return (
    <GapPreview
      splitId={hovered.splitId}
      insertIndex={hovered.insertIndex}
      orientation={hovered.orientation}
      pulsing={pulsing}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Edge — half-panel slab                                             */
/* ------------------------------------------------------------------ */

function EdgePreview({
  hoveredRegionId,
  edge,
  pulsing,
}: {
  hoveredRegionId: string;
  edge: DropEdge;
  pulsing: boolean;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    const el = document.querySelector<HTMLElement>(
      `[data-leaf-id="${cssEscape(hoveredRegionId)}"]`,
    );
    if (!el) {
      setRect(null);
      return;
    }
    setRect(computeEdgePreview(el.getBoundingClientRect(), edge));
  }, [hoveredRegionId, edge]);

  if (!rect) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-40 rounded-lg bg-primary/[0.10] ring-2 ring-inset ring-primary"
      initial={false}
      animate={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        opacity: pulsing ? 1 : 0.85,
      }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              top: { type: "spring", stiffness: 600, damping: 42 },
              left: { type: "spring", stiffness: 600, damping: 42 },
              width: { type: "spring", stiffness: 600, damping: 42 },
              height: { type: "spring", stiffness: 600, damping: 42 },
              opacity: pulsing
                ? { duration: 0.9, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
                : { duration: 0.15 },
            }
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Gap — thin glowing line at the seam                                */
/* ------------------------------------------------------------------ */

function GapPreview({
  splitId,
  insertIndex,
  orientation,
  pulsing,
}: {
  splitId: string;
  insertIndex: number;
  orientation: "horizontal" | "vertical";
  pulsing: boolean;
}) {
  const [rect, setRect] = useState<Rect | null>(null);
  const reduceMotion = useReducedMotion();

  useLayoutEffect(() => {
    const splitEl = document.querySelector<HTMLElement>(
      `[data-split-id="${cssEscape(splitId)}"]`,
    );
    if (!splitEl) {
      setRect(null);
      return;
    }
    const handleEl = splitEl.querySelector<HTMLElement>(
      `[data-resize-handle][data-gap-index="${insertIndex}"][data-split-id="${cssEscape(splitId)}"]`,
    );
    setRect(
      computeGapPreview(
        splitEl.getBoundingClientRect(),
        handleEl ? handleEl.getBoundingClientRect() : null,
        orientation,
        insertIndex,
      ),
    );
  }, [splitId, insertIndex, orientation]);

  if (!rect) return null;
  return (
    <motion.div
      aria-hidden
      // Inline width/height (instead of animate) so the gap line
      // dimensions are fixed at render time. Only top/left/opacity
      // animate when sliding between gutters of the same split.
      style={{ width: rect.width, height: rect.height }}
      className="pointer-events-none fixed z-40 rounded-full bg-primary shadow-[0_0_12px_color-mix(in_oklch,var(--primary)_60%,transparent)]"
      initial={false}
      animate={{
        top: rect.top,
        left: rect.left,
        opacity: pulsing ? 1 : 0.85,
      }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              top: { type: "spring", stiffness: 600, damping: 42 },
              left: { type: "spring", stiffness: 600, damping: 42 },
              opacity: pulsing
                ? { duration: 0.9, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
                : { duration: 0.15 },
            }
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Geometry                                                           */
/* ------------------------------------------------------------------ */

function computeEdgePreview(target: DOMRect, edge: DropEdge): Rect {
  switch (edge) {
    case "left":
      return { top: target.top, left: target.left, width: target.width / 2, height: target.height };
    case "right":
      return { top: target.top, left: target.left + target.width / 2, width: target.width / 2, height: target.height };
    case "top":
      return { top: target.top, left: target.left, width: target.width, height: target.height / 2 };
    case "bottom":
      return { top: target.top + target.height / 2, left: target.left, width: target.width, height: target.height / 2 };
  }
}

/** Gap = glow the gutter itself. No size prediction — panels
 *  rebalance, so the line just signals "this seam is the target." */
function computeGapPreview(
  split: DOMRect,
  handle: DOMRect | null,
  orientation: "horizontal" | "vertical",
  insertIndex: number,
): Rect {
  if (orientation === "horizontal") {
    const seamX = handle
      ? handle.left + handle.width / 2
      : insertIndex === 0
        ? split.left
        : split.right;
    return {
      top: split.top,
      left: seamX - GAP_LINE_THICKNESS / 2,
      width: GAP_LINE_THICKNESS,
      height: split.height,
    };
  }
  const seamY = handle
    ? handle.top + handle.height / 2
    : insertIndex === 0
      ? split.top
      : split.bottom;
  return {
    top: seamY - GAP_LINE_THICKNESS / 2,
    left: split.left,
    width: split.width,
    height: GAP_LINE_THICKNESS,
  };
}

function cssEscape(s: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(s);
  }
  return s;
}
