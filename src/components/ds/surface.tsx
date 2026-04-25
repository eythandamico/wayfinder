import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Padding = "none" | "sm" | "md" | "lg" | "xl";
type Radius = "md" | "lg" | "xl" | "2xl" | "3xl";
type Tone = "card" | "raised" | "transparent";

const PADDINGS: Record<Padding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5 md:p-6",
  lg: "p-6 md:p-8",
  xl: "p-8 md:p-10",
};

const RADII: Record<Radius, string> = {
  md: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
  "2xl": "rounded-3xl",
  "3xl": "rounded-[2rem]",
};

const TONES: Record<Tone, string> = {
  card: "bg-card/60 ring-1 ring-inset ring-white/[0.06]",
  raised: "bg-card/80 ring-1 ring-inset ring-white/[0.08] shadow-[var(--wf-shadow-card)]",
  transparent: "",
};

type SurfaceProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  padding?: Padding;
  radius?: Radius;
  tone?: Tone;
  children?: ReactNode;
};

export function Surface({
  padding = "md",
  radius = "xl",
  tone = "card",
  className,
  children,
  ...rest
}: SurfaceProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden",
        RADII[radius],
        TONES[tone],
        PADDINGS[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
