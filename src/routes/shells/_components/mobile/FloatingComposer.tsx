"use client";

import { useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Floating agent composer — pinned above the bottom tab bar, on
 * every tab. The agent stopped being a destination tab in this
 * mobile architecture; it's a tool you summon from anywhere.
 *
 *   ┌────────────────────────────────────────┐
 *   │ Ask Wayfinder…                       ↑ │  ← floats here
 *   └────────────────────────────────────────┘
 *
 * Visual treatment: card-like bg + shadow + backdrop blur so it
 * reads as ELEVATED above the tab body. Tapping ANYWHERE on the
 * bar — input, surrounding chrome, or the empty send button —
 * opens the chat takeover sheet (parent owns the open state).
 * Typing + sending opens the takeover with the message pre-sent.
 */
export function FloatingComposer({
  onEngage,
}: {
  /** Fires when the user taps the bar or sends a message — the
   *  parent (MobileShell) opens the ChatTakeoverSheet in response.
   *  The sheet's own composer takes over once it's open. */
  onEngage: (message?: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState("");

  const submit = () => {
    const text = draft.trim();
    // Fire the same MOBILE_AGENT_SUBMIT_EVENT ChatPanel listens for
    // BEFORE opening the takeover sheet — ChatPanel processes the
    // message into its transcript, so when the takeover mounts the
    // user sees their message already sent + the agent's reply
    // streaming. Without this they'd have to retype.
    if (text) {
      window.dispatchEvent(
        new CustomEvent("wf:agent:submit", { detail: { text } }),
      );
    }
    onEngage(text || undefined);
    setDraft("");
    inputRef.current?.blur();
  };

  /** Tap anywhere on the bar chrome (not the send button) opens the
   *  chat takeover. The input's own onFocus would also catch this
   *  via the browser's default focus-on-click, but wiring a click
   *  handler on the bar ensures even taps on the padding / chrome
   *  trigger the takeover — previously only the input area opened
   *  it, so tapping the bar's edges felt dead. */
  const openTakeover = () => {
    onEngage();
  };

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-3 z-30",
        // Floats just above the bottom tab bar — the tab bar's
        // height (~68px after the v3 padding bump) + safe-area
        // inset, plus extra breathing room so the composer reads
        // as separate from the nav, not glued to it.
        "[bottom:calc(env(safe-area-inset-bottom)+5.25rem)]",
      )}
    >
      <div
        role="button"
        tabIndex={-1}
        onClick={openTakeover}
        className={cn(
          "pointer-events-auto flex items-center gap-2 rounded-full bg-card/95 px-4 py-2 backdrop-blur-md",
          "shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6),0_2px_8px_-2px_rgba(0,0,0,0.4)]",
          "ring-1 ring-inset ring-white/[0.06] cursor-text",
        )}
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={openTakeover}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Ask Wayfinder…"
          aria-label="Ask the Wayfinder agent"
          className="min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={(e) => {
            // Stop the parent's openTakeover click handler from
            // double-firing when the user taps the send button.
            e.stopPropagation();
            submit();
          }}
          disabled={draft.trim().length === 0}
          aria-label="Send message"
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.94]",
            draft.trim().length === 0
              ? "bg-surface-3 text-muted-foreground"
              : "bg-primary text-primary-foreground hover:brightness-[1.04]",
          )}
        >
          <ArrowUp strokeWidth={2} className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
