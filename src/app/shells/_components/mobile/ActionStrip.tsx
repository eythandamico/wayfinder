"use client";

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
        icon={<TradeIcon />}
      />
      <ActionButton
        label="Order book"
        onClick={() => onOpen("orderbook")}
        icon={<OrderBookIcon />}
      />
      <ActionButton
        label="Portfolio"
        onClick={() => onOpen("portfolio")}
        icon={<PortfolioIcon />}
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
        "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
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

function TradeIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11L7 7L10 10L14 5" />
      <path d="M14 5H10.5" />
      <path d="M14 5V8" />
    </svg>
  );
}

function OrderBookIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M3 4.5H13" />
      <path d="M3 8H10" />
      <path d="M3 11.5H12" />
    </svg>
  );
}

function PortfolioIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2.5" y="5" width="11" height="8" rx="1.5" />
      <path d="M5.5 5V3.5A1 1 0 0 1 6.5 2.5H9.5A1 1 0 0 1 10.5 3.5V5" />
    </svg>
  );
}
