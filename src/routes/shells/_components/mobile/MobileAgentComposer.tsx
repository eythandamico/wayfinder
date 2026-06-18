"use client";

import { useEffect, useRef } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatSession } from "../../_state/chat-context";

/** Dispatched by the mobile composer; ChatPanel listens for it and
 *  routes the payload through its existing `startThinking` pipeline
 *  (transcript append + agent reply). Lets us keep the composer
 *  decoupled from ChatPanel's local state without lifting all the
 *  streaming/thinking machinery into context. */
export const MOBILE_AGENT_SUBMIT_EVENT = "wf:agent:submit";

type Props = {
  /** Fires after a successful submit. Today MobileLayout uses this
   *  to ensure the chat takeover sheet is open so the user sees the
   *  agent's reply land. */
  onAfterSubmit?: () => void;
  /** Fires when the user engages with the input (focus OR click).
   *  MobileLayout uses this to open the chat takeover sheet. Both
   *  events feed it because a real mobile tap fires focus, but
   *  programmatic/test clicks may only fire click. */
  onEngage?: () => void;
  /** Whether the chat takeover sheet is currently open. When this
   *  flips from false → true, the composer reclaims focus on the
   *  next tick because Base UI's Dialog autofocuses its own close
   *  button on open, stealing focus from this input. */
  chatOpen?: boolean;
};

/**
 * Reduced agent composer for mobile.
 *
 * Persistent across every panel in the swipe deck — agent input is
 * the focal action of the app and should always be one tap away.
 *
 * Deliberately leaner than the desktop ChatPanel composer: no model
 * picker, no chat-mode toggle, no attach, no voice, no history. Just
 * a single text field and a send button (plus a tiny "Active" dot so
 * the user can tell the agent is wired up). Power features stay on
 * the Chat panel when the user explicitly swipes to it.
 */
export function MobileAgentComposer({
  onAfterSubmit,
  onEngage,
  chatOpen,
}: Props) {
  const { input, setInput } = useChatSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reclaim focus after the chat sheet opens. Base UI's Dialog moves
  // focus to its first focusable child (the close button) on mount,
  // and that runs asynchronously after the open transition, so a
  // requestAnimationFrame is too early. A small setTimeout outlasts
  // Base UI's focus dance and lets us land focus on the textarea so
  // the user's typing cursor never moves.
  useEffect(() => {
    if (!chatOpen) return;
    const t = window.setTimeout(() => {
      textareaRef.current?.focus({ preventScroll: true });
    }, 80);
    return () => window.clearTimeout(t);
  }, [chatOpen]);

  const submit = () => {
    const v = input.trim();
    if (!v) return;
    window.dispatchEvent(
      new CustomEvent(MOBILE_AGENT_SUBMIT_EVENT, { detail: v }),
    );
    setInput("");
    onAfterSubmit?.();
    // Re-focus so the user can keep typing without re-tapping.
    textareaRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter inserts a newline. Matches the desktop
    // ChatComposer convention so muscle memory carries between
    // viewports.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const canSend = input.trim().length > 0;

  return (
    <div
      className="flex shrink-0 items-end gap-2 border-t border-white/[0.05] bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/85"
      style={{
        paddingTop: "0.625rem",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 0.625rem)",
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-surface-1 px-3 py-2 ring-1 ring-inset ring-white/[0.04] focus-within:ring-white/[0.10]">
        <span
          aria-label="Agent active"
          title="Agent active"
          className="size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]"
        />
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onEngage}
          onClick={onEngage}
          rows={1}
          // 64dvh keeps very long drafts from pushing the deck out of
          // view; the textarea grows from one row up to that ceiling.
          className="max-h-[64dvh] min-w-0 flex-1 resize-none bg-transparent text-body leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60"
          placeholder="Ask your agent…"
          aria-label="Ask your agent"
        />
      </div>
      <button
        type="button"
        onClick={submit}
        disabled={!canSend}
        aria-label="Send message"
        className={cn(
          "inline-flex size-10 shrink-0 items-center justify-center rounded-lg transition-[background-color,scale,opacity] duration-150 ease-out active:scale-[0.96] disabled:cursor-not-allowed",
          canSend
            ? "bg-primary text-primary-foreground hover:brightness-[1.04]"
            : "bg-surface-2 text-muted-foreground opacity-60",
        )}
      >
        <ArrowUp strokeWidth={2.25} className="size-4" aria-hidden />
      </button>
    </div>
  );
}
