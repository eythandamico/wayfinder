"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatPanel } from "../ChatPanel";

/**
 * Full-screen agent chat — opens when the floating composer is
 * engaged (focus or send). Resurrected after the v2 "Agent tab"
 * pattern was scrapped: agent is no longer a destination tab, it's
 * a tool you summon from anywhere via the floating composer, and
 * THIS sheet is where that summon expands.
 *
 * Drag handle at the top edge gives the user a tap-to-dismiss
 * affordance separate from the × button. ChatPanel renders inside
 * with its own composer + thread.
 */
export function ChatTakeoverSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm",
            "transition-opacity duration-200 ease-out",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <Dialog.Popup
          initialFocus={false}
          finalFocus={false}
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden rounded-t-2xl bg-card",
            "shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.65)]",
            "transition-transform duration-300 ease-[var(--ease-drawer)]",
            "data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
            // Leaves a sliver at the top so backdrop tap stays
            // reachable. Respects the notch via env(safe-area).
            "[height:calc(100dvh-env(safe-area-inset-top)-1.5rem)]",
          )}
        >
          <div className="flex shrink-0 items-center justify-center pt-2.5 pb-1.5">
            <span aria-hidden className="h-1 w-10 rounded-full bg-white/15" />
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-1">
            <Dialog.Title className="text-body font-semibold text-foreground">
              Agent
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close chat"
              className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-4 hover:text-foreground active:scale-[0.96]"
            >
              <X strokeWidth={1.75} className="size-3.5" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            {/* Full ChatPanel with its own composer — the user's
             *  message survives the takeover transition because
             *  composer state lives in chat-context, not in any
             *  per-component useState. */}
            <ChatPanel embedded />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
