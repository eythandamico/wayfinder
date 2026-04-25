import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Width = "sm" | "md" | "default" | "lg" | "full";
type Pad = "none" | "sm" | "default" | "lg" | "xl" | "hero";

const WIDTHS: Record<Width, string> = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  default: "max-w-6xl",
  lg: "max-w-7xl",
  full: "max-w-none",
};

const PADS: Record<Pad, string> = {
  none: "py-0",
  sm: "py-16 md:py-20",
  default: "py-28 md:py-36",
  lg: "py-28 md:py-40",
  xl: "py-32 md:py-44",
  hero: "pt-36 pb-44 md:pt-48 md:pb-56",
};

type PageSectionProps = Omit<ComponentPropsWithoutRef<"section">, "children"> & {
  width?: Width;
  pad?: Pad;
  as?: "section" | "div";
  children?: ReactNode;
  innerClassName?: string;
};

export function PageSection({
  width = "default",
  pad = "default",
  as: Tag = "section",
  className,
  innerClassName,
  children,
  ...rest
}: PageSectionProps) {
  return (
    <Tag className={className} {...rest}>
      <div className={cn("mx-auto w-full px-6", WIDTHS[width], PADS[pad], innerClassName)}>
        {children}
      </div>
    </Tag>
  );
}
