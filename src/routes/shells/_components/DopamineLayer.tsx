"use client";

import { useEffect, useState } from "react";
import {
  DOPAMINE_EVENT,
  type DopamineEventDetail,
} from "../_lib/dopamine";

type Instance = {
  key: string;
  file: string;
  x: number;
  y: number;
  size: number;
  rotate: number;
};

/** Compact stinger sizes — the old 560-820px range took over the whole
 *  viewport. Smaller cards feel like rewards, not interruptions. */
const MIN_SIZE = 220;
const MAX_SIZE = 300;
/** Bottom-left anchor inset — keeps the stinger comfortably clear of
 *  the panel edges. */
const EDGE_MARGIN = 20;
/** Vertical spacing between stacked instances when several fire close
 *  together. */
const STACK_GAP = 8;
const MAX_ROTATE = 8; // ± degrees, kept subtle

/**
 * Renders dopamine webm animations triggered via `triggerDopamine()`.
 *
 * Each instance:
 *   - lands at a random position inside the viewport (with edge margin)
 *   - randomized size between MIN_SIZE and MAX_SIZE
 *   - removes itself on `onEnded` (or after a timeout fallback)
 *
 * Multiple animations can stack — they all overlay above everything else
 * (z-[var(--z-dopamine)]) and are pointer-events: none so they never intercept clicks.
 */
export function DopamineLayer() {
  const [instances, setInstances] = useState<Instance[]>([]);

  useEffect(() => {
    const onTrigger = (e: Event) => {
      const detail = (e as CustomEvent<DopamineEventDetail>).detail;
      if (!detail) return;

      const size =
        Math.floor(Math.random() * (MAX_SIZE - MIN_SIZE)) + MIN_SIZE;
      const H = window.innerHeight;
      const rotate = (Math.random() * 2 - 1) * MAX_ROTATE;

      setInstances((prev) => {
        // Anchor at the bottom-left; stack vertically up when several
        // fire close together so they don't all sit on top of each
        // other. Newest is closest to the bottom.
        const stackIndex = prev.length;
        const x = EDGE_MARGIN;
        const y =
          H - EDGE_MARGIN - size - stackIndex * (size + STACK_GAP);
        const inst: Instance = {
          key: `${detail.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          file: detail.file,
          x,
          y,
          size,
          rotate,
        };
        return [...prev, inst];
      });
    };

    window.addEventListener(DOPAMINE_EVENT, onTrigger);
    return () => window.removeEventListener(DOPAMINE_EVENT, onTrigger);
  }, []);

  const remove = (key: string) =>
    setInstances((prev) => prev.filter((i) => i.key !== key));

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[var(--z-dopamine)] overflow-hidden"
    >
      {instances.map((inst) => (
        <video
          key={inst.key}
          src={inst.file}
          autoPlay
          muted
          playsInline
          // Fallback in case onEnded never fires (codec/loading edge cases).
          onEnded={() => remove(inst.key)}
          onError={() => remove(inst.key)}
          className="absolute object-contain"
          style={{
            left: inst.x,
            top: inst.y,
            width: inst.size,
            height: inst.size,
            transform: `rotate(${inst.rotate.toFixed(2)}deg)`,
          }}
        />
      ))}
    </div>
  );
}
