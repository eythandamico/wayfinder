"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { type LucideIcon } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

/**
 * IconButton — square icon-only button with hit-area extender.
 *
 *   <IconButton icon={X} aria-label="Close" />
 *   <IconButton icon={Settings} aria-label="Settings" variant="subtle" />
 *
 * Even the smallest size (xs = 24×24 visual) has a ::before pseudo-
 * element that extends the pointer target to ~40×40 so touch users
 * can hit it without hyper-precise pointing. The pseudo never paints
 * a visible style — purely a hit-test rectangle.
 *
 * aria-label is required on the type. Lint will catch missing labels.
 */
const iconButtonVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center rounded-md outline-none transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed before:absolute before:content-['']",
  {
    variants: {
      variant: {
        ghost:
          "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
        subtle:
          "bg-white/[0.04] text-foreground hover:bg-white/[0.08]",
        destructive:
          "text-muted-foreground hover:bg-tone-down/15 hover:text-tone-down",
        primary:
          "bg-primary/15 text-primary hover:bg-primary/25",
      },
      size: {
        // 24px visual, 40×40 hit area
        xs: "size-6 before:-inset-[8px] [&_svg]:size-3.5",
        // 28px visual, 40×40 hit area
        sm: "size-7 before:-inset-[6px] [&_svg]:size-4",
        // 32px visual, 40×40 hit area
        md: "size-8 before:-inset-1 [&_svg]:size-4",
        // 40px visual (already meets minimum)
        lg: "size-10 [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "md",
    },
  },
);

export type IconButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "type"
> &
  VariantProps<typeof iconButtonVariants> & {
    type?: "button" | "submit" | "reset";
    icon: LucideIcon;
    /** Required — icon-only buttons need a label for screen readers. */
    "aria-label": string;
  };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { className, variant, size, icon: Icon, type = "button", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(iconButtonVariants({ variant, size }), className)}
        {...props}
      >
        <Icon strokeWidth={1.75} aria-hidden />
      </button>
    );
  },
);

export { iconButtonVariants };
