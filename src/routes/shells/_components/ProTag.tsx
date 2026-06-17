"use client";

import { cn } from "@/lib/utils";

/**
 * Single shared "PRO" tag used across the app — catalog rows,
 * panel tiles, the locked model row, anywhere a feature needs to
 * announce itself as Pro-only.
 *
 * Uses the brand mint (`--primary`) as the Pro accent. The
 * "Pro = the agent at full power" framing means the tier shares
 * the brand color rather than competing with it via a different
 * hue (the previous gold).
 *
 * Solid primary fill with the primary-foreground text gives the
 * tag the same visual weight as the canonical primary button —
 * reads as "this is THE brand mark, claimed."
 */
export function ProTag({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      aria-label="Pro"
      className={cn(
        // rounded-[3px] keeps a deliberate corner (not a pill) at the
        // sizes the chip appears at. Tracking removed — uppercase +
        // tracking visually shifts the glyphs left because the last
        // letter's trailing space adds to the right edge; without it
        // the padding reads as actually even on both sides.
        "inline-flex select-none items-center justify-center rounded-[3px] bg-primary font-bold uppercase text-primary-foreground",
        size === "sm"
          ? "px-1 py-px text-micro leading-none"
          : "px-1.5 py-0.5 text-caption leading-none",
        className,
      )}
    >
      Pro
    </span>
  );
}
