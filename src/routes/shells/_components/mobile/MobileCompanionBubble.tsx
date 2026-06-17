"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { VideoPanel } from "../VideoPanel";

const POS_KEY = "wf-shells-v3-mobile-companion-pos";
const BUBBLE = 96;
const EDGE_PAD = 12;
const TAP_THRESHOLD = 6;

type Pos = { x: number; y: number };

/** Draggable Companion FAB for mobile. Replaces the desktop panel —
 *  mobile users get a 64px circle that plays the companion video as
 *  its content. Drag to re-position (snaps to the nearest edge on
 *  release); tap (movement under 6px) expands into a floating
 *  fullscreen-ish card holding the VideoPanel. Position is persisted
 *  to localStorage so it survives reloads. */
export function MobileCompanionBubble() {
  const [pos, setPos] = useState<Pos | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    let initial: Pos | null = null;
    try {
      const raw = window.localStorage.getItem(POS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Pos;
        if (
          typeof parsed?.x === "number" &&
          typeof parsed?.y === "number"
        ) {
          initial = parsed;
        }
      }
    } catch {
      /* storage unavailable */
    }
    if (!initial) {
      initial = {
        x: window.innerWidth - BUBBLE - EDGE_PAD,
        y: Math.max(EDGE_PAD, window.innerHeight - BUBBLE - 140),
      };
    }
    setPos(initial);
  }, []);

  const clamp = (p: Pos): Pos => {
    const maxX = window.innerWidth - BUBBLE - EDGE_PAD;
    const maxY = window.innerHeight - BUBBLE - EDGE_PAD;
    return {
      x: Math.max(EDGE_PAD, Math.min(p.x, maxX)),
      y: Math.max(EDGE_PAD, Math.min(p.y, maxY)),
    };
  };

  const snap = (p: Pos): Pos => {
    const midX = window.innerWidth / 2;
    const snapX =
      p.x + BUBBLE / 2 < midX
        ? EDGE_PAD
        : window.innerWidth - BUBBLE - EDGE_PAD;
    return clamp({ x: snapX, y: p.y });
  };

  const persist = (p: Pos) => {
    try {
      window.localStorage.setItem(POS_KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: pos.x,
      initialY: pos.y,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragRef.current;
    if (!state) return;
    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    if (!state.moved && Math.hypot(dx, dy) > TAP_THRESHOLD) {
      state.moved = true;
      setDragging(true);
    }
    if (state.moved) {
      setPos(clamp({ x: state.initialX + dx, y: state.initialY + dy }));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragRef.current;
    if (!state) return;
    dragRef.current = null;
    if (state.moved) {
      setPos((prev) => {
        if (!prev) return prev;
        const snapped = snap(prev);
        persist(snapped);
        return snapped;
      });
      setDragging(false);
    } else {
      setExpanded(true);
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  if (!pos) return null;

  return (
    <>
      {!expanded && (
        <button
          type="button"
          aria-label="Open companion"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            left: pos.x,
            top: pos.y,
            width: BUBBLE,
            height: BUBBLE,
            touchAction: "none",
          }}
          className={cn(
            "fixed z-[55] overflow-hidden rounded-full bg-black shadow-[0_14px_28px_-8px_rgba(0,0,0,0.7)] ring-1 ring-inset ring-white/[0.10]",
            dragging
              ? "scale-105 transition-none"
              : "transition-[transform,left,top] duration-200 ease-out active:scale-[0.96]",
          )}
        >
          <video
            src="/media/wayfinder-promo.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden
            className="size-full object-cover"
          />
          {/* Soft outer halo so the bubble lifts off dark surfaces. */}
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-1 -z-10 rounded-full"
            style={{
              background:
                "radial-gradient(60% 60% at 50% 50%, color-mix(in oklch, var(--primary) 35%, transparent) 0%, transparent 70%)",
              filter: "blur(10px)",
            }}
          />
        </button>
      )}
      {expanded && (
        <div
          role="dialog"
          aria-label="Companion"
          className="fixed inset-x-3 z-[60] flex flex-col overflow-hidden rounded-2xl bg-card backdrop-blur-md shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)] ring-1 ring-inset ring-white/[0.10] animate-in fade-in zoom-in-95 duration-200 ease-[var(--ease-strong)]"
          style={{
            top: "calc(env(safe-area-inset-top) + 0.75rem)",
            bottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
          }}
        >
          <button
            type="button"
            aria-label="Collapse companion"
            onClick={() => setExpanded(false)}
            className="absolute right-3 top-3 z-10 inline-flex size-9 items-center justify-center rounded-full bg-black/55 text-white ring-1 ring-inset ring-white/[0.10] backdrop-blur-md transition-[background-color,scale] duration-150 ease-out hover:bg-black/75 active:scale-[0.96]"
          >
            <X strokeWidth={1.75} className="size-4" aria-hidden />
          </button>
          <div className="h-full w-full">
            <VideoPanel />
          </div>
        </div>
      )}
    </>
  );
}
