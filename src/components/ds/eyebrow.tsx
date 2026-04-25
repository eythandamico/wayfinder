import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { ACCENT_STYLES, type Accent } from "./accent";

type EyebrowProps = Omit<ComponentPropsWithoutRef<"span">, "children"> & {
  accent?: Accent | "muted";
  children: React.ReactNode;
};

/**
 * Mono, uppercase, wide-tracked kicker used above titles and inside
 * mockup headers. Default accent color is muted; set `accent="mint"`
 * (etc.) to colorize.
 */
export function Eyebrow({
  accent = "muted",
  className,
  children,
  ...rest
}: EyebrowProps) {
  const color =
    accent === "muted" ? "text-muted-foreground" : ACCENT_STYLES[accent].text;
  return (
    <span
      className={cn(
        "font-mono text-[11px] uppercase tracking-[0.22em]",
        color,
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
