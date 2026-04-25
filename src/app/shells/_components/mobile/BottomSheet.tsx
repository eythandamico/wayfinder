"use client";

import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /** Max height of the sheet content area, as viewport fraction. Defaults to 90%. */
  heightFraction?: number;
  children: ReactNode;
  className?: string;
};

/**
 * Bottom sheet primitive for mobile. Backed by Base UI's Dialog for focus
 * trapping, Escape, and backdrop click. Content slides up from the bottom
 * and scrolls internally. Safe-area-inset-bottom is respected so the
 * interior never runs under the home indicator.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  heightFraction = 0.9,
  children,
  className,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-40 bg-black/55 backdrop-blur-sm",
            "transition-opacity duration-200 ease-out",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <Dialog.Popup
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-2xl bg-muted shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.65)]",
            "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
            "transition-transform duration-300 ease-[var(--ease-drawer)]",
            "data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
            className,
          )}
          style={{
            height: `${heightFraction * 100}dvh`,
            maxHeight: `${heightFraction * 100}dvh`,
          }}
        >
          <div className="flex shrink-0 items-center justify-center pt-2.5 pb-2">
            <span
              aria-hidden
              className="h-1 w-10 rounded-full bg-white/15"
            />
          </div>
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2">
            {title ? (
              <Dialog.Title className="text-[13px] font-semibold text-foreground">
                {title}
              </Dialog.Title>
            ) : (
              <Dialog.Title className="sr-only">Panel</Dialog.Title>
            )}
            <Dialog.Close
              aria-label="Close"
              className={cn(
                "ml-auto flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/[0.10] hover:text-foreground active:scale-[0.96]",
              )}
            >
              <CloseIcon />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CloseIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
    >
      <path d="M4 4L12 12" />
      <path d="M12 4L4 12" />
    </svg>
  );
}
