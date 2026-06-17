"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Thin draggable divider that sits between two flex children. Uses
 * pointer capture so drags survive the cursor passing over iframes
 * (TradingView) or any element that would otherwise eat events.
 *
 *   - orientation="horizontal" — a vertical line, drags left/right
 *     (used between columns)
 *   - orientation="vertical" — a horizontal line, drags up/down
 *     (used between rows)
 *
 * Visual: the bar fades to transparent at both ends via a mask gradient,
 * so the seam doesn't slam into the panel corners. A radial "glow" spot
 * follows the cursor along the bar's long axis, brightening the region
 * the user is pointing at. The spot fades in on hover, stays on during
 * drag (tracking pointer-capture position), and fades out on leave.
 */

const EDGE_MASK_HORIZONTAL =
  "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)";
const EDGE_MASK_VERTICAL =
  "linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)";

export function ResizeHandle({
  orientation,
  onDrag,
  splitId,
  gapIndex,
}: {
  orientation: "horizontal" | "vertical";
  onDrag: (deltaPx: number) => void;
  /** Identifies the parent split + this gap's position in it so the
   *  drag system can offer this seam as a "drop between siblings" target.
   *  Optional for backwards-compat; when missing the handle still works
   *  for resize but won't participate in gap-drops. */
  splitId?: string;
  gapIndex?: number;
}) {
  const draggingRef = useRef(false);
  const lastPosRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Push cursor-position percentage into a CSS variable directly on the
  // DOM node — keeps the radial-gradient center tracking the pointer
  // without triggering a React re-render on every mousemove.
  const writeCursorPos = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = handleRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (orientation === "horizontal") {
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty("--cursor-pos", `${y}%`);
    } else {
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      el.style.setProperty("--cursor-pos", `${x}%`);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;
    draggingRef.current = true;
    setIsActive(true);
    setIsDragging(true);
    writeCursorPos(e);
    lastPosRef.current =
      orientation === "horizontal" ? e.clientX : e.clientY;
    document.body.style.cursor =
      orientation === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    // Always keep the radial center current — both during hover and
    // during pointer-captured drag (the handle moves with the panel
    // edge as the resize commits, so the cursor's offset within it
    // stays meaningful).
    writeCursorPos(e);
    if (!draggingRef.current) return;
    const cur = orientation === "horizontal" ? e.clientX : e.clientY;
    const delta = cur - lastPosRef.current;
    lastPosRef.current = cur;
    if (delta !== 0) onDrag(delta);
  };

  const stop = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsActive(false);
    setIsDragging(false);
    if (pointerIdRef.current !== null) {
      try {
        e.currentTarget.releasePointerCapture(pointerIdRef.current);
      } catch {
        // capture may already be released
      }
      pointerIdRef.current = null;
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  const onPointerEnter = () => setIsActive(true);
  const onPointerLeave = () => {
    // Don't drop the active state mid-drag — pointer-capture means we
    // can leave the visual bar but still be resizing.
    if (!draggingRef.current) setIsActive(false);
  };

  const edgeMask =
    orientation === "horizontal" ? EDGE_MASK_HORIZONTAL : EDGE_MASK_VERTICAL;
  // Hover glow is neutral white; active drag picks up the brand color
  // via the --primary token so the seam visibly "commits" while resizing.
  const glowColor = isDragging
    ? "color-mix(in oklch, var(--primary) 70%, transparent)"
    : "rgba(255,255,255,0.22)";
  const radialGradient =
    orientation === "horizontal"
      ? `radial-gradient(circle 160px at 50% var(--cursor-pos, 50%), ${glowColor}, transparent 80%)`
      : `radial-gradient(circle 160px at var(--cursor-pos, 50%) 50%, ${glowColor}, transparent 80%)`;

  return (
    <div
      ref={handleRef}
      role="separator"
      aria-orientation={
        orientation === "horizontal" ? "vertical" : "horizontal"
      }
      // data-* read by DragContext.hitTest during a panel drag so the
      // seam itself is a valid drop target ("insert between siblings").
      data-resize-handle
      data-split-id={splitId}
      data-gap-index={gapIndex}
      data-orientation={orientation}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      className={cn(
        "group/handle relative shrink-0 touch-none select-none",
        orientation === "horizontal"
          ? "w-1.5 cursor-col-resize"
          : "h-1.5 cursor-row-resize",
      )}
    >
      {/* Wider invisible hit area to make grabbing the thin line easier */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0",
          orientation === "horizontal" ? "-mx-1" : "-my-1",
        )}
      />

      {/* Cursor-tracking radial glow — only visible on hover/drag.
          No always-on seam: the 4px gap between panels is the divider,
          and the glow only appears when the user reaches for it. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-200 ease-out",
          isActive ? "opacity-100" : "opacity-0",
        )}
        style={{
          backgroundImage: radialGradient,
          maskImage: edgeMask,
          WebkitMaskImage: edgeMask,
        }}
      />
    </div>
  );
}
