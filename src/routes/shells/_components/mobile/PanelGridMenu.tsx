"use client";

import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onOpen: () => void;
};

/**
 * 4-grid trigger button for the panel manager sheet. Lives at the
 * right edge of the mobile indicator strip. Tapping it raises the
 * MobilePanelDeckSheet (owned by MobileLayout) so the user can see
 * their open panels as thumbnails and add a new one.
 *
 * The button itself stays small and chrome-quiet — surface-on-hover
 * + active-press scale only. The sheet does the heavy visual work.
 */
export function PanelGridMenu({ onOpen }: Props) {
  return (
    <button
      type="button"
      aria-label="Manage panels"
      onClick={onOpen}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-md text-muted-foreground",
        "transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
        "hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <LayoutGrid strokeWidth={1.75} className="size-5" aria-hidden />
    </button>
  );
}
