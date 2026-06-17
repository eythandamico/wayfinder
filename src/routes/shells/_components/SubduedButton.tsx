"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Subdued action button — the unified treatment for secondary
 * affordances across the shell.
 *
 * Surface: `bg-surface-1` resting, `bg-surface-2` hover, white text,
 * no outline, no leading icon. Used for portfolio row actions
 * (Chart / TP-SL / Transfer / Swap / Send / Receive / Buy / Deposit),
 * the Jobs panel "Create a new job" footer, and the Activity SMS
 * opt-in footer.
 *
 * Sizing / width is left to consumers via `className` (cn merges
 * trailing classes via tailwind-merge, so `h-9 px-3` or `w-full py-2`
 * overrides cleanly).
 */
type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export const SubduedButton = forwardRef<HTMLButtonElement, Props>(
  function SubduedButton({ className, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center rounded-md bg-surface-2 text-body font-medium text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-3 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
