"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

/**
 * Shared mechanics for portal'd popovers — trigger position math
 * (with auto flip above/below the trigger), resize/scroll
 * recomputation while open, and click-outside detection that knows
 * about BOTH the trigger wrapper AND the portal'd popover so an
 * inner click doesn't close the popover before the inner onClick
 * lands.
 *
 * Caller is responsible for the actual JSX: attach `wrapRef` to the
 * div around the trigger, `popoverRef` to the portal'd popover root,
 * and read `pos` to position the popover (`null` until first
 * measure). Pass the trigger element ref in via `triggerRef`.
 *
 * Used by the trade panel's size-input denomination picker and the
 * swap ticket's From/To token pickers — both want identical floating
 * behavior, neither wants to reinvent the wheel.
 */

type Placement = "above" | "below";

export type FloatingPos = {
  top: number;
  left: number;
  placement: Placement;
};

export type UseFloatingPopoverArgs = {
  open: boolean;
  /** Called when an outside click is detected. */
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  width: number;
  maxHeight: number;
  /** When true (default), the popover's right edge aligns with the
   *  trigger's right edge — natural for picker pills sitting at the
   *  right of an input row. Set false to align left edges instead. */
  anchorRight?: boolean;
};

export type UseFloatingPopoverResult = {
  wrapRef: RefObject<HTMLDivElement | null>;
  popoverRef: RefObject<HTMLDivElement | null>;
  pos: FloatingPos | null;
};

export function useFloatingPopover({
  open,
  onClose,
  triggerRef,
  width,
  maxHeight,
  anchorRight = true,
}: UseFloatingPopoverArgs): UseFloatingPopoverResult {
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<FloatingPos | null>(null);

  // Memoized so changes to width / maxHeight / anchorRight propagate
  // through the effect deps below, instead of being silently
  // captured by a stale closure. Previously this was an inline
  // function and the deps were [open] — which meant if the caller
  // changed the desired width mid-open, the popover kept measuring
  // against the OLD width.
  const recompute = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;
    // Flip above when there isn't enough room below AND above has
    // more — keeps the popover on-screen in tight panels.
    const placeAbove =
      spaceBelow < maxHeight + 24 && spaceAbove > spaceBelow;
    const top = placeAbove
      ? rect.top - 8 - maxHeight
      : rect.bottom + 8;
    const desiredLeft = anchorRight ? rect.right - width : rect.left;
    const left = Math.min(
      Math.max(8, desiredLeft),
      window.innerWidth - width - 8,
    );
    setPos({ top, left, placement: placeAbove ? "above" : "below" });
  }, [triggerRef, width, maxHeight, anchorRight]);

  // useLayoutEffect is purpose-built for measure-then-set-state
  // (synchronous setState here doesn't cascade like it does in
  // useEffect). Previously this wrapped the work in `setTimeout(...,0)`
  // microtask hops which created an ordering risk under rapid
  // open/close toggles — the clear-microtask could land AFTER the
  // recompute-microtask, leaving pos null when it should be set.
  // Synchronous is both simpler and ordering-safe.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    recompute();
  }, [open, recompute]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => recompute();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, recompute]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose]);

  return { wrapRef, popoverRef, pos };
}
