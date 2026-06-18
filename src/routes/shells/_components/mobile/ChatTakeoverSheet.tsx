"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatPanel } from "../ChatPanel";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Full-takeover agent chat sheet for mobile.
 *
 * Sliding behavior: the sheet rises from the bottom of the viewport
 * — same direction the persistent mini composer sits, so visually it
 * reads as the input "growing up" into a full chat surface. The
 * mini composer fades behind the sheet as it rises; on close the
 * sheet drops back down and the mini composer reappears in place.
 *
 * Composer behavior: inside the sheet we render the full ChatPanel
 * with its native composer (model picker, chat mode toggle, attach,
 * voice). That's the "morph" — collapsed = the reduced bar, expanded
 * = the full desktop-tier composer at the bottom of the sheet.
 *
 * Focus management: Base UI's default `initialFocus` and `finalFocus`
 * are both disabled. The full composer inside ChatPanel auto-focuses
 * its own textarea via its existing logic; we don't want Base UI
 * yanking focus to the close × before that happens.
 */
export function ChatTakeoverSheet({ open, onOpenChange }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-30 bg-black/55 backdrop-blur-sm",
            "transition-opacity duration-200 ease-out",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <Dialog.Popup
          initialFocus={false}
          finalFocus={false}
          className={cn(
            "fixed inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden rounded-t-2xl bg-muted",
            "shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.65)]",
            "transition-transform duration-300 ease-[var(--ease-drawer)]",
            "data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
            // Leaves a sliver at the top so the user has a visible
            // backdrop tap target. Respects the iOS notch / dynamic
            // island via env(safe-area-inset-top).
            "[height:calc(100dvh-env(safe-area-inset-top)-1.5rem)]",
          )}
        >
          {/* Drag handle — purely visual; close via × button,
              backdrop tap, or Escape. */}
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
            {/* Full ChatPanel — composer included. This is the
                "morphed" form of the mini composer below: collapsed
                state shows the reduced bar at the screen bottom;
                expanded state is the full desktop-tier composer
                pinned to the bottom of this sheet with chat history
                above it. */}
            <ChatPanel />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
