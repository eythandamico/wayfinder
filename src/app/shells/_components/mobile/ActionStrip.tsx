"use client";

import { Briefcase, BookOpen, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Sheet = "trade" | "portfolio" | "orderbook";

export function ActionStrip({
  onOpen,
}: {
  onOpen: (sheet: Sheet) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 border-t border-white/[0.04] bg-muted/95 px-3 py-2">
      <ActionButton
        label="Trade"
        primary
        onClick={() => onOpen("trade")}
        icon={<TrendingUp strokeWidth={1.5} className="size-3.5" />}
      />
      <ActionButton
        label="Order book"
        onClick={() => onOpen("orderbook")}
        icon={<BookOpen strokeWidth={1.5} className="size-3.5" />}
      />
      <ActionButton
        label="Portfolio"
        onClick={() => onOpen("portfolio")}
        icon={<Briefcase strokeWidth={1.5} className="size-3.5" />}
      />
    </div>
  );
}

function ActionButton({
  label,
  primary,
  onClick,
  icon,
}: {
  label: string;
  primary?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-body font-medium transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
        primary
          ? "bg-primary/15 text-primary hover:bg-primary/20"
          : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
