"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

/**
 * TextInput — the trader text-input primitive. Wraps a native
 * <input> in a container that owns the visual chrome (background,
 * focus ring, leading/trailing slots) so all inputs across the
 * shells stay consistent.
 *
 *   <TextInput placeholder="Search markets…" />
 *   <TextInput leading={<Search …/>} placeholder="…" />
 *   <TextInput trailing={<Max />} size="lg" />
 *   <TextInput error placeholder="…" />
 *
 * The container uses :focus-within so the ring activates whether the
 * input itself or any nested interactive (a leading icon button, the
 * trailing Max button) holds focus.
 */
const containerVariants = cva(
  "group/input flex items-center gap-2.5 rounded-lg transition-[background-color,box-shadow] duration-150 ease-out focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-offset-0",
  {
    variants: {
      variant: {
        default:
          "bg-white/[0.05] hover:bg-white/[0.07] focus-within:bg-white/[0.07]",
        inline:
          "bg-transparent hover:bg-white/[0.04] focus-within:bg-white/[0.05]",
        outline:
          "bg-transparent ring-1 ring-inset ring-white/[0.10] hover:ring-white/[0.15] focus-within:ring-primary/50",
      },
      size: {
        sm: "h-8 px-2.5",
        md: "h-10 px-3",
        lg: "h-12 px-3.5",
      },
      error: {
        true: "!ring-2 !ring-tone-down/50 focus-within:!ring-tone-down/60",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      error: false,
    },
  },
);

export type TextInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> &
  VariantProps<typeof containerVariants> & {
    /** Slot rendered before the input — typically an icon. */
    leading?: React.ReactNode;
    /** Slot rendered after the input — typically an icon or small
     *  button (Max, clear, send). */
    trailing?: React.ReactNode;
    /** Forwarded to the container so callers can style the wrapper
     *  width / margins without un-defaulting the inner input. */
    containerClassName?: string;
  };

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput(
    {
      className,
      containerClassName,
      variant,
      size,
      error,
      leading,
      trailing,
      ...inputProps
    },
    ref,
  ) {
    return (
      <div
        className={cn(
          containerVariants({ variant, size, error }),
          containerClassName,
        )}
      >
        {leading && (
          <span className="shrink-0 text-muted-foreground" aria-hidden>
            {leading}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            "min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground/60 tabular-nums",
            className,
          )}
          {...inputProps}
        />
        {trailing && <span className="shrink-0">{trailing}</span>}
      </div>
    );
  },
);
