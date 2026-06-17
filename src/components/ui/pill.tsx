"use client";

import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Pill — small tagged label. Used for category chips, side labels
 * (LONG/SHORT/YES/NO), counts, and other badge-style markers.
 *
 *   <Pill tone="primary" size="sm" uppercase>LONG</Pill>
 *   <Pill tone="signal">New</Pill>
 *   <Pill tone="muted">{count}</Pill>
 *
 * Distinct from a Button — Pills are non-interactive by default.
 * Wrap in a button if you need a clickable filter chip.
 */
const pillVariants = cva(
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-medium",
  {
    variants: {
      tone: {
        neutral: "bg-white/[0.08] text-foreground",
        muted: "bg-white/[0.04] text-muted-foreground",
        primary: "bg-primary/15 text-primary",
        "tone-down": "bg-tone-down/15 text-tone-down",
        signal: "bg-signal/15 text-signal",
      },
      size: {
        sm: "h-5 rounded px-1.5 text-micro",
        md: "h-6 rounded-md px-2 text-caption",
      },
      uppercase: {
        true: "uppercase tracking-wide font-semibold",
        false: "",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "md",
      uppercase: false,
    },
  },
);

export type PillProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof pillVariants>;

export function Pill({
  className,
  tone,
  size,
  uppercase,
  ...props
}: PillProps) {
  return (
    <span
      className={cn(pillVariants({ tone, size, uppercase }), className)}
      {...props}
    />
  );
}

export { pillVariants };
