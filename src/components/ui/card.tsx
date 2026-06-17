"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Card — the dense trader card surface. Consolidates the 50+ inline
 * `rounded-lg bg-white/[0.03] ring-1 ring-inset ring-white/[0.05]`
 * literals scattered across panels.
 *
 *   <Card>…</Card>                       // static surface
 *   <Card variant="interactive" …>       // hoverable, pointer
 *   <Card variant="inset" padding="sm">  // nested sub-card, no ring
 *   <Card variant="outline">             // hollow — ring only, no fill
 *
 * Distinct from @/components/ds/Card which is the marketing-tier
 * rounded-2xl card used on /paths and landing pages.
 */
const cardVariants = cva(
  "rounded-lg transition-[background-color,box-shadow] duration-150 ease-out",
  {
    variants: {
      variant: {
        default: "bg-white/[0.03] ring-1 ring-inset ring-white/[0.05]",
        interactive:
          "cursor-pointer bg-white/[0.03] ring-1 ring-inset ring-white/[0.05] hover:bg-white/[0.05]",
        inset: "bg-white/[0.03]",
        outline: "ring-1 ring-inset ring-white/[0.05]",
        ghost: "",
      },
      padding: {
        none: "p-0",
        sm: "p-2",
        md: "p-3",
        lg: "p-4",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
    },
  },
);

export type CardProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardVariants>;

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant, padding, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  );
});

export { cardVariants };
