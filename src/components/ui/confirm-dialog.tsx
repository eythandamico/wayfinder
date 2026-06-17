"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";

import { cn } from "@/lib/utils";
import { Button } from "./button";

/**
 * ConfirmDialog — pre-styled, brand-consistent wrapper around Base UI
 * AlertDialog. Eliminates the ~50-line boilerplate block that
 * currently repeats across perp Close, prediction Sell, layout
 * Delete, etc.
 *
 *   <ConfirmDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     title="Close ETH-PERP?"
 *     description="Closing markets the position at the current price. This can't be undone."
 *     confirmLabel="Yes, close ETH-PERP"
 *     onConfirm={closePosition}
 *   />
 *
 * Variant defaults to `destructive` because that's the dominant use.
 * Switch to `primary` for confirms that aren't reversing/deleting
 * something (rare).
 *
 * Convention: confirmLabel should echo the target ("Yes, close ETH-PERP")
 * so the destructive step is visibly distinct from the row button that
 * opened the dialog.
 */
export type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "destructive" | "primary";
  onConfirm: () => void;
  /** Optional data-demo selector on the confirm button so demos can
   *  target it programmatically. */
  confirmDemoId?: string;
  /** Extra classes forwarded to the AlertDialog.Popup. Lets a consumer
   *  override width / padding for the rare dialog that needs more room. */
  className?: string;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "destructive",
  onConfirm,
  confirmDemoId,
  className,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-[80] bg-background/70 backdrop-blur-[3px] transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <AlertDialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-[81] w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2 origin-center rounded-xl bg-card backdrop-blur-md p-4 ring-1 ring-inset ring-white/[0.08] shadow-2xl transition-[opacity,transform] duration-200 ease-[var(--ease-strong)] data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0",
            className,
          )}
        >
          <AlertDialog.Title className="text-body font-semibold text-foreground">
            {title}
          </AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="mt-1 text-caption text-muted-foreground">
              {description}
            </AlertDialog.Description>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={variant}
              size="sm"
              onClick={onConfirm}
              data-demo={confirmDemoId}
            >
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
