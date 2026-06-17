"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, type LucideIcon } from "lucide-react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Trader Button — the canonical button primitive for /shells.
 *
 * Coexists with @/components/ds/button (marketing-tier) — that one is
 * rounded-full and shadow-heavy for landing pages. This one is dense,
 * aurora-aware, and tuned for the data-grid panels.
 *
 *   <Button variant="primary" size="md">Place Market Long</Button>
 *   <Button variant="destructive" leadingIcon={X}>Close position</Button>
 *   <Button variant="ghost" loading>Saving…</Button>
 *
 * All variants bake in:
 *   - focus-visible:ring-2 ring-primary/60 ring-offset-2 (a11y baseline)
 *   - active:scale-[0.96] (tactile press feedback)
 *   - disabled: cursor-not-allowed + opacity-50 + pointer-events-none
 *   - rounded-md, transition-[background-color,color,filter,scale] 150ms ease-out
 *
 * Loading mode keeps the button at fixed width — content fades to 60%
 * opacity and a spinner appears in the leading slot. The button auto-
 * disables so the user can't double-trigger an async action.
 */
const buttonVariants = cva(
  "group/btn relative inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium select-none outline-none transition-[background-color,color,filter,scale] duration-150 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:brightness-[1.04]",
        secondary:
          "bg-white/[0.08] text-foreground hover:bg-white/[0.12]",
        ghost:
          "text-foreground hover:bg-white/[0.06]",
        // Solid red — used for irreversible actions (Close / Sell /
        // Delete). Dark text on red bg for legibility (`#0e1111`).
        destructive:
          "bg-tone-down text-[#0e1111] hover:bg-tone-down/90",
        // Soft destructive — used for the secondary delete affordance
        // inside menus, where the solid red would be too loud.
        "destructive-subtle":
          "bg-tone-down/10 text-tone-down ring-1 ring-inset ring-tone-down/25 hover:bg-tone-down/20",
        outline:
          "bg-transparent text-foreground ring-1 ring-inset ring-white/[0.10] hover:bg-white/[0.05]",
      },
      size: {
        sm: "h-7 px-2.5 text-caption [&_svg]:size-3.5",
        md: "h-9 px-3 text-body [&_svg]:size-4",
        lg: "h-12 px-4 text-body [&_svg]:size-4",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
      fullWidth: false,
    },
  },
);

export type ButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "type"
> &
  VariantProps<typeof buttonVariants> & {
    /** Override the default `type="button"` (e.g. `"submit"` in forms). */
    type?: "button" | "submit" | "reset";
    /** Lucide icon rendered before the label. */
    leadingIcon?: LucideIcon;
    /** Lucide icon rendered after the label. */
    trailingIcon?: LucideIcon;
    /** Async-action affordance — replaces the leading icon with a
     *  spinner and disables the button. */
    loading?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    fullWidth,
    leadingIcon: Leading,
    trailingIcon: Trailing,
    loading,
    children,
    disabled,
    type = "button",
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" aria-hidden />
      ) : (
        Leading && <Leading strokeWidth={1.75} aria-hidden />
      )}
      {children && (
        <span className={loading ? "opacity-60" : undefined}>{children}</span>
      )}
      {!loading && Trailing && <Trailing strokeWidth={1.75} aria-hidden />}
    </button>
  );
});

export { buttonVariants };
