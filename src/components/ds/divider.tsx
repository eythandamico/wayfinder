import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type Spacing = "none" | "sm" | "md" | "lg";

const SPACINGS: Record<Spacing, string> = {
  none: "my-0",
  sm: "my-3",
  md: "my-6",
  lg: "my-12",
};

type DividerProps = ComponentPropsWithoutRef<"hr"> & {
  spacing?: Spacing;
};

export function Divider({ spacing = "md", className, ...rest }: DividerProps) {
  return (
    <hr
      className={cn("border-0 border-t border-border", SPACINGS[spacing], className)}
      {...rest}
    />
  );
}
