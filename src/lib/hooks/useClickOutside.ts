import { useEffect, type RefObject } from "react";

/**
 * Fires `handler` when a mousedown happens outside `ref`'s element.
 *
 * Pass `enabled` (defaults to `true`) to gate the listener — typically the
 * `open` state of the popover, so the listener only runs when there's
 * something to close.
 */
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  enabled: boolean = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const listener = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler();
      }
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler, enabled]);
}
