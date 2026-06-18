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
 * Full-screen chat takeover for mobile.
 *
 * The persistent composer at the bottom of MobileLayout is the trigger:
 * focusing or sending from it opens this sheet. The sheet covers the
 * viewport from the safe-area-top down to the composer's top edge, so
 * the composer remains visible and functional underneath — the user
 * can keep typing and the agent reply lands in the chat above.
 *
 * Why a custom sheet rather than the BottomSheet primitive: this one
 * needs `bottom` to be the composer's top edge (not the screen
 * bottom), and a slightly different chrome (drag handle + Agent title
 * + close ×) without the BottomSheet's interior padding for the
 * composer-less use case.
 */
export function ChatTakeoverSheet({ open, onOpenChange }: Props) {
  return (
    // `modal={false}` is critical: the persistent composer lives
    // OUTSIDE this dialog, and a focus trap would yank focus into
    // the popup the moment the sheet opens — breaking the user's
    // typing flow. The non-modal mode also lets the composer remain
    // interactive underneath the sheet without the dialog inerting
    // it. We still wire Escape to close via onKeyDown below.
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
          // Disable Base UI's initial focus management — the
          // persistent composer that triggers this sheet lives
          // outside the popup, and Base UI's default behavior of
          // focusing the first tabbable child (the close ×) would
          // yank focus away mid-typing. With this off, the keyboard
          // stays open on the composer and the user types
          // continuously through the open transition.
          initialFocus={false}
          // Similarly, don't restore focus to the trigger on close —
          // the composer never lost focus, so there's nothing to
          // restore. Avoids an extra re-focus event on dismiss.
          finalFocus={false}
          className={cn(
            "fixed inset-x-0 top-0 z-40 flex flex-col overflow-hidden rounded-b-2xl bg-muted",
            "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.65)]",
            "transition-transform duration-300 ease-[var(--ease-drawer)]",
            "data-[starting-style]:-translate-y-full data-[ending-style]:-translate-y-full",
            // Reserves the composer's slot at the bottom of the
            // viewport — the CSS variable is set by MobileLayout via
            // a ResizeObserver on the composer wrapper.
            "[bottom:var(--mobile-composer-h,4rem)]",
            "pt-[env(safe-area-inset-top)]",
          )}
        >
          {/* Drag handle — purely a visual affordance; closing happens
              via the × button, backdrop tap, or Escape. */}
          <div className="flex shrink-0 items-center justify-center pt-2.5 pb-1.5">
            <span
              aria-hidden
              className="h-1 w-10 rounded-full bg-white/15"
            />
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2">
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
            {/* embedded: ChatPanel's local composer is suppressed —
                the global persistent composer in MobileLayout (which
                still sits below this sheet, visible and functional)
                owns the send affordance. Submitting from there
                continues to route through the wf:agent:submit event
                ChatPanel listens for. */}
            <ChatPanel embedded />
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
