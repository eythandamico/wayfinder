"use client";

import { useRef } from "react";
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
  /** Fires after a successful submit. Used by MobileLayout to snap
   *  the swipe deck back to the Chat panel so the user sees the
   *  agent's reply without an extra swipe. */
  onAfterSubmit?: () => void;
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
export function MobileAgentComposer({ onAfterSubmit }: Props) {
  const { input, setInput } = useChatSession();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
