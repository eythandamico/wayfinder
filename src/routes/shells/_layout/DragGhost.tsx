"use client";

import { GripVertical } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useDragApi } from "./DragContext";
import { PANEL_REGISTRY } from "./registry";

/**
 * Floating pill that follows the pointer during a drag. Lives at the
 * root so its position is in viewport coordinates and it can hover
 * over any panel without being clipped by parent overflow.
 *
 * The ghost moves through the same three lifecycle phases as the drag
 * state machine:
 *
 *   - dragging   — trails the cursor via a snappy spring, tilts a few
 *                  degrees based on horizontal velocity (physical feel)
 *   - landing    — morphs from cursor position into the landed leaf's
 *                  rect, scaling to fill it so the ghost reads as
 *                  "becoming" the placed panel
 *   - cancelling — springs back to source rect, then fades
 *
 * One DOM element animates through every phase so the user's eye
 * follows a single object across the entire gesture.
 */

const GHOST_OFFSET = 12;
/** Max tilt in degrees. Scales linearly with horizontal velocity until
 *  saturation. Keep small — past ~3° starts to feel cartoonish. */
const MAX_TILT_DEG = 2.4;
const TILT_PER_PX_MS = 0.15;

export function DragGhost() {
  const drag = useDragApi();
  // Respect prefers-reduced-motion: skip the spring tilts/morphs and
  // snap to position. The ghost itself still appears (it's necessary
  // interaction feedback during a drag), it just doesn't trail.
  const reduceMotion = useReducedMotion();
  if (!drag.state) return null;

  const phase = drag.state.phase;
  const desc = PANEL_REGISTRY[drag.state.iconType];
  const Icon = desc?.Icon ?? GripVertical;

  // Compute target animation per phase. Each one uses a tuned spring
  // to give it a distinct feel without ever cutting between values.
  let animate: Record<string, number> = {};
  let transition: object = {};

  if (phase === "dragging") {
    const tilt = Math.max(
      -MAX_TILT_DEG,
      Math.min(MAX_TILT_DEG, drag.state.velocityX * TILT_PER_PX_MS),
    );
    animate = {
      x: drag.state.pointerX + GHOST_OFFSET,
      y: drag.state.pointerY + GHOST_OFFSET,
      rotate: tilt,
      scale: 1,
      opacity: 1,
    };
    transition = {
      x: { type: "spring", stiffness: 900, damping: 45, mass: 0.5 },
      y: { type: "spring", stiffness: 900, damping: 45, mass: 0.5 },
      rotate: { type: "spring", stiffness: 220, damping: 22, mass: 0.6 },
      scale: { duration: 0.12, ease: [0.32, 0.72, 0, 1] },
    };
  } else if (phase === "landing" && drag.state.landingRect) {
    const r = drag.state.landingRect;
    animate = {
      x: r.x,
      y: r.y,
      rotate: 0,
      // Don't morph all the way to fill — keep slightly smaller so the
      // landed panel itself does the final reveal (scale-in via the
      // FLIP layout animation underneath).
      scale: 0.96,
      opacity: 0,
    };
    transition = {
      x: { type: "spring", stiffness: 500, damping: 40, mass: 0.6 },
      y: { type: "spring", stiffness: 500, damping: 40, mass: 0.6 },
      rotate: { duration: 0.18, ease: [0.32, 0.72, 0, 1] },
      scale: { duration: 0.22, ease: [0.32, 0.72, 0, 1] },
      opacity: { duration: 0.22, delay: 0.06, ease: "easeOut" },
    };
  } else if (phase === "cancelling") {
    // Arc back to source rect (or fade in place if rect unknown).
    const r = drag.state.sourceRect;
    animate = {
      x: r ? r.x + r.width / 2 - 40 : drag.state.pointerX,
      y: r ? r.y + 12 : drag.state.pointerY,
      rotate: 0,
      scale: 0.92,
      opacity: 0,
    };
    transition = {
      x: { type: "spring", stiffness: 380, damping: 36, mass: 0.6 },
      y: { type: "spring", stiffness: 380, damping: 36, mass: 0.6 },
      rotate: { duration: 0.18, ease: [0.32, 0.72, 0, 1] },
      scale: { duration: 0.2, ease: [0.32, 0.72, 0, 1] },
      opacity: { duration: 0.2, delay: 0.06, ease: "easeOut" },
    };
  }

  return (
    <motion.div
      aria-hidden
      // Start the ghost AT the pointer so the first frame doesn't
      // animate from (0,0). Initial values match the dragging-phase
      // target so motion treats arming as a hot start.
      initial={{
        x: drag.state.pointerX + GHOST_OFFSET,
        y: drag.state.pointerY + GHOST_OFFSET,
        rotate: 0,
        scale: 1,
        opacity: 1,
      }}
      animate={animate}
      transition={reduceMotion ? { duration: 0 } : transition}
      style={{ transformOrigin: "top left", willChange: "transform" }}
      className="pointer-events-none fixed left-0 top-0 z-50 inline-flex h-7 items-center gap-1.5 rounded-md bg-black/85 pl-1.5 pr-2.5 text-caption font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md ring-1 ring-inset ring-white/[0.10] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.75)]"
    >
      <Icon strokeWidth={1.75} className="size-3.5 text-white/65" aria-hidden />
      {drag.state.label}
    </motion.div>
  );
}
