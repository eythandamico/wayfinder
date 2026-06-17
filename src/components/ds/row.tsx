import type { ElementType, ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Gap = "none" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
type Align = "start" | "center" | "end" | "stretch" | "baseline";
type Justify = "start" | "center" | "end" | "between" | "around";

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
  baseline: "items-baseline",
};

const JUSTIFIES: Record<Justify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
};

type RowOwnProps<E extends ElementType> = {
  as?: E;
  gap?: Gap;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
  className?: string;
  children?: ReactNode;
};

type RowProps<E extends ElementType> = RowOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof RowOwnProps<E>>;

export function Row<E extends ElementType = "div">({
  as,
  gap = "md",
  align = "center",
  justify = "start",
  wrap = false,
  className,
  children,
  ...rest
}: RowProps<E>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag
      className={cn(
        "flex",
        GAPS[gap],
        ALIGNS[align],
        JUSTIFIES[justify],
        wrap && "flex-wrap",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
