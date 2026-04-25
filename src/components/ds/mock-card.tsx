import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type MockCardProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  children: ReactNode;
};

/**
 * A flat mockup card — no border, just a dark background and a deep
 * drop-shadow. Designed to be absolutely positioned inside a StackCard
 * so it can bleed past the parent's edges. Uses `rounded-2xl`; child
 * elements inside a `p-4`+ MockCard should use `rounded-sm` to satisfy
 * the concentric-radius rule.
 */
export function MockCard({ className, children, ...rest }: MockCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-background/95 p-4 shadow-[var(--wf-shadow-mockup)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
