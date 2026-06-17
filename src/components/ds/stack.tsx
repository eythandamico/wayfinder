import type { ElementType, ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Gap = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
type Align = "start" | "center" | "end" | "stretch";

const GAPS: Record<Gap, string> = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-10",
  "2xl": "gap-14",
};

const ALIGNS: Record<Align, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

type StackOwnProps<E extends ElementType> = {
  as?: E;
  gap?: Gap;
  align?: Align;
  className?: string;
  children?: ReactNode;
};

type StackProps<E extends ElementType> = StackOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof StackOwnProps<E>>;

export function Stack<E extends ElementType = "div">({
  as,
  gap = "md",
  align,
  className,
  children,
  ...rest
}: StackProps<E>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      className={cn("flex flex-col", GAPS[gap], align && ALIGNS[align], className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
