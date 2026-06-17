"use client";

import { useEffect } from "react";

import { useCommandBar } from "../_state/shells-context";

/**
 * Page-root keyboard layer for /shells. Mounts a single window
 * keydown listener that:
 *
 *   - Ignores events targeting <input>, <textarea>, or contenteditable
 *     so the user can still type in the chat composer / size input.
 *   - Routes single-key shortcuts to the right context.
 *
 * Single-key shortcuts (no modifier):
 *
 *   b      → set trade side to Long
 *   s      → set trade side to Short
 *   ?      → open shortcut help overlay
 *
 * Mod-key shortcuts (⌘ / Ctrl):
 *
 *   ⌘K     → toggle command bar
 *
 * Components subscribe to side changes via the custom event
 * `wf:shells:trade-side` so this hook stays decoupled from
 * specific panels. The help overlay subscribes to `wf:shells:help`.
 */

export const TRADE_SIDE_EVENT = "wf:shells:trade-side";
export const HELP_EVENT = "wf:shells:help";

export function useShellsKeyboard() {
  const { toggleCommand } = useCommandBar();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Skip if user is typing somewhere or composing IME.
      const target = e.target as HTMLElement | null;
      if (e.isComposing || e.defaultPrevented) return;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          // Allow ⌘K to still work inside inputs.
          if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) {
            return;
          }
        }
      }

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // ⌘K — command bar toggle. Already handled by CommandBar's
      // own listener, but we re-handle here so the hook can own the
      // shortcut table in one place. Calling toggle twice would race;
      // CommandBar's listener uses preventDefault so this branch is
      // effectively a fallback.
      if (mod && key === "k") {
        e.preventDefault();
        toggleCommand();
        return;
      }

      // Single-key shortcuts — only if no modifier (avoid grabbing
      // browser ⌘B, ⌘S, etc.).
      if (mod || e.altKey) return;

      if (key === "b") {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent(TRADE_SIDE_EVENT, { detail: { side: "long" } }),
        );
        return;
      }
      if (key === "s") {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent(TRADE_SIDE_EVENT, { detail: { side: "short" } }),
        );
        return;
      }
      // `?` on US keyboards is shift+/. Don't require shift since some
      // layouts route it differently.
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(HELP_EVENT));
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCommand]);
}
