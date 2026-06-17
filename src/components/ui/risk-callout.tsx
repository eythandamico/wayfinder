"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, Info, ShieldAlert, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * RiskCallout — inline warning band for trading actions.
 *
 * Pro-aware tone (no "are you sure?" patronizing) but communicates
 * irreversibility, magnitude, and consequence. Three severity tiers:
 *
 *   info     — neutral note. Soft signal/blue.
 *              e.g. "Funding costs 0.0012%/hr on this position."
 *   caution  — heads-up. Mid-yellow / amber via tone-down/40.
 *              e.g. "5x leverage. Adverse moves amplify."
 *   danger   — explicit risk. Red. Reserved for liq proximity,
 *              25x+ leverage, large notional, etc.
 *              e.g. "25x leverage. A 4% adverse move liquidates."
 *
 * Pairs with ConfirmDialog for irreversibles — show callouts INLINE
 * as the user composes the order, then echo them in the confirm.
 */

const calloutVariants = cva(
  "flex items-start gap-2 rounded-md px-2.5 py-2 text-caption leading-snug",
  {
    variants: {
      severity: {
        info: "bg-signal/10 text-signal",
        caution: "bg-amber-500/10 text-amber-200",
        danger: "bg-tone-down/15 text-tone-down",
      },
    },
    defaultVariants: {
      severity: "caution",
    },
  },
);

const iconByDefault: Record<NonNullable<RiskCalloutProps["severity"]>, LucideIcon> = {
  info: Info,
  caution: AlertTriangle,
  danger: ShieldAlert,
};

export type RiskCalloutProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof calloutVariants> & {
    /** Override the default icon for the severity tier. */
    icon?: LucideIcon;
  };

export function RiskCallout({
  className,
  severity = "caution",
  icon,
  children,
  ...props
}: RiskCalloutProps) {
  const Icon = icon ?? iconByDefault[severity ?? "caution"];
  return (
    <div
      role="status"
      className={cn(calloutVariants({ severity }), className)}
      {...props}
    >
      <Icon strokeWidth={1.75} className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
