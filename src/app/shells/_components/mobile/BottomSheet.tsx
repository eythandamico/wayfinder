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
            "pb-[env(safe-area-inset-bottom)]",
            "transition-transform duration-300 ease-out",
            "data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
            className,
          )}
          style={{ maxHeight: `${heightFraction * 100}dvh` }}
        >
          <div className="flex shrink-0 items-center justify-center pt-2.5 pb-2">
            <span
              aria-hidden
              className="h-1 w-10 rounded-full bg-white/15"
            />
          </div>
          {title ? (
            <Dialog.Title className="shrink-0 px-4 pb-2 text-sm font-semibold text-foreground">
              {title}
            </Dialog.Title>
          ) : (
            <Dialog.Title className="sr-only">Panel</Dialog.Title>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
