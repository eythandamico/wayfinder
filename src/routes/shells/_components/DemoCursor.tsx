"use client";

import type { CursorState } from "../_lib/demo";
import { useIsMobile } from "../_hooks/useIsMobile";

/** Floating arrow cursor used by the demo runner. Position is driven
 *  by `transform: translate3d` and animated via CSS transition whose
 *  duration is set per-hop by the runner. The click `ping` is a ring
 *  that pulses for ~380ms when the runner toggles `clicking`.
 *  On mobile the arrow itself is hidden — real users don't see a
 *  pointer on touch, so we only show the tap ping. */
export function DemoCursor({ state }: { state: CursorState }) {
  const isMobile = useIsMobile();
  // Offset by half the cursor's logical size so coordinates point at
  // the arrow's hotspot (top-left of the chevron) rather than its
  // visual center.
  const hotspotOffsetX = 4;
  const hotspotOffsetY = 4;
  return (
    <div
      aria-hidden
      style={{
        transform: `translate3d(${state.x - hotspotOffsetX}px, ${state.y - hotspotOffsetY}px, 0)`,
        opacity: state.visible ? 1 : 0,
        transition:
          state.durationMs > 0
            ? `transform ${state.durationMs}ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms ease-out`
            : "opacity 220ms ease-out",
      }}
      className="pointer-events-none fixed left-0 top-0 z-[var(--z-cursor-overlay)] will-change-transform"
    >
      {!isMobile && (
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]"
        >
          <path
            d="M3 2 L3 17 L7 13 L10 20 L12 19 L9 12 L15 12 Z"
            fill="white"
            stroke="black"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {state.clicking && (
        <>
          <span
            aria-hidden
            className="absolute left-0 top-0 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 animate-ping"
          />
          <span
            aria-hidden
            className="absolute left-0 top-0 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary"
          />
        </>
      )}
    </div>
  );
}
