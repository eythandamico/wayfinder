"use client";

import { cn } from "@/lib/utils";

/**
 * Skeleton — loading placeholder. Three shapes cover ~all uses:
 *
 *   <Skeleton variant="rect" className="h-16 w-full" />   // card placeholder
 *   <Skeleton variant="circle" className="size-9" />      // avatar placeholder
 *   <Skeleton variant="line" className="w-24" />          // text line
 *
 * Tint is bumped to `bg-white/[0.06]` (matches the chip surface used
 * everywhere) so the pulse fades between visible and faint instead
 * of faint and invisible. Class overrides win, so consumers can dial
 * up (`bg-white/[0.08]` on darker surfaces) or dial down without
 * forking the primitive.
 *
 * Pulse animation respects `prefers-reduced-motion` via the global
 * @media block in globals.css.
 */
export type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "rect" | "circle" | "line";
};

export function Skeleton({
  className,
  variant = "rect",
  ...props
}: SkeletonProps) {
  return (
    <div
      role="presentation"
      aria-hidden
      className={cn(
        "animate-pulse bg-white/[0.06]",
        variant === "rect" && "rounded-md",
        variant === "circle" && "rounded-full",
        variant === "line" && "h-3 rounded",
        className,
      )}
      {...props}
    />
  );
}
