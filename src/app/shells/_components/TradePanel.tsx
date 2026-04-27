"use client";

import { useRef, useState } from "react";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon } from "./icons";

const MARGIN_OPTIONS = ["Cross", "Isolated"] as const;
const LEVERAGE_OPTIONS = [
  "1x",
  "2x",
  "5x",
  "10x",
  "20x",
  "25x",
  "40x",
  "50x",
] as const;
const ORDER_TYPE_OPTIONS = ["Market", "Limit", "Stop Market", "Stop Limit"] as const;

type MarginOption = (typeof MARGIN_OPTIONS)[number];
type LeverageOption = (typeof LEVERAGE_OPTIONS)[number];
type OrderTypeOption = (typeof ORDER_TYPE_OPTIONS)[number];

export function TradePanel() {
  const [side, setSide] = useState<"long" | "short">("long");
  const [size, setSize] = useState("0.00");
  const [pct, setPct] = useState(0);
  const [margin, setMargin] = useState<MarginOption>("Cross");
  const [leverage, setLeverage] = useState<LeverageOption>("40x");
  const [orderType, setOrderType] = useState<OrderTypeOption>("Market");

  // Risk summary appears once the user expresses an order — empty rows would
  // otherwise eat ~80px of vertical space on short viewports.
  const hasIntent = pct > 0 || parseFloat(size) > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-muted">
      {/* Header — params + side toggle pinned at top */}
      <div className="flex shrink-0 flex-col gap-3 px-3 pt-3">
        <div className="grid grid-cols-3 divide-x divide-white/5 rounded-lg bg-background/60">
          <ParamDropdown
            label="Margin"
            value={margin}
            options={[...MARGIN_OPTIONS]}
            onChange={(v) => setMargin(v as MarginOption)}
            rounded="l"
          />
          <ParamDropdown
            label="Leverage"
            value={leverage}
            options={[...LEVERAGE_OPTIONS]}
            onChange={(v) => setLeverage(v as LeverageOption)}
            accent
          />
          <ParamDropdown
            label="Type"
            value={orderType}
            options={[...ORDER_TYPE_OPTIONS]}
            onChange={(v) => setOrderType(v as OrderTypeOption)}
            rounded="r"
            align="end"
          />
        </div>

        <div
          role="group"
          aria-label="Trade side"
          className="grid grid-cols-2 gap-1 rounded-lg bg-background/60 p-1"
        >
          <SideButton
            active={side === "long"}
            onClick={() => setSide("long")}
            label="Long"
            direction="up"
          />
          <SideButton
            active={side === "short"}
            onClick={() => setSide("short")}
            label="Short"
            direction="down"
          />
        </div>
      </div>

      {/* Body — stats + size + risk; only this region scrolls when cramped */}
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-body">
          <span className="inline-flex items-baseline gap-1.5">
            <span className="text-muted-foreground">Available</span>
            <span className="tabular-nums text-foreground">$0.00</span>
            <span className="text-muted-foreground">USDC</span>
          </span>
          <span className="inline-flex items-baseline gap-1.5">
            <span className="text-muted-foreground">Position</span>
            <span className="tabular-nums text-foreground">None</span>
            <span className="text-muted-foreground">0 BTC</span>
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="trade-size"
              className="text-body text-muted-foreground"
            >
              Size
            </label>
            <span
              aria-hidden
              className="text-body tabular-nums text-muted-foreground"
            >
              ≈ $0.00
            </span>
          </div>
          <div className="flex h-12 items-center gap-2.5 rounded-lg bg-white/5 px-3.5 transition-[background-color,box-shadow] duration-150 ease-out hover:bg-white/[0.07] focus-within:bg-white/[0.07] focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-offset-0">
            <span
              aria-hidden
              className="flex size-5 shrink-0 items-center justify-center rounded-full text-body font-bold text-black"
              style={{ backgroundColor: "#f7931a" }}
            >
              ₿
            </span>
            <input
              id="trade-size"
              type="text"
              inputMode="decimal"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-body text-foreground outline-none tabular-nums"
            />
            <button
              type="button"
              aria-label="Set max size"
              className="rounded-md bg-white/10 px-2 py-0.5 text-body text-muted-foreground transition-colors hover:bg-white/[0.15] hover:text-foreground focus-visible:bg-white/[0.15] focus-visible:text-foreground focus-visible:outline-none"
            >
              Max
            </button>
            <span aria-hidden className="text-body text-muted-foreground">
              BTC
            </span>
          </div>

          <label
            htmlFor="size-slider"
            className="relative flex h-9 items-center gap-3 rounded-lg bg-white/5 pl-1 pr-3 transition-colors hover:bg-white/[0.07] focus-within:bg-white/[0.07] focus-within:ring-2 focus-within:ring-primary/50"
          >
            <div className="relative h-7 flex-1 overflow-hidden rounded-md">
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 rounded-md bg-primary transition-[width] duration-150 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span
              aria-hidden
              className="shrink-0 text-body tabular-nums text-muted-foreground"
            >
              {pct}%
            </span>
            <input
              id="size-slider"
              type="range"
              min="0"
              max="100"
              value={pct}
              onChange={(e) => setPct(Number(e.target.value))}
              aria-label="Position size percentage"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </div>

        {hasIntent && (
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-body">
            <span className="inline-flex items-baseline gap-1.5">
              <span className="text-muted-foreground">Liquidation</span>
              <span className="tabular-nums text-foreground">—</span>
            </span>
            <span className="inline-flex items-baseline gap-1.5">
              <span className="text-muted-foreground">Order Value</span>
              <span className="tabular-nums text-foreground">—</span>
            </span>
            <span className="inline-flex items-baseline gap-1.5">
              <span className="text-muted-foreground">Margin</span>
              <span className="tabular-nums text-foreground">—</span>
            </span>
          </div>
        )}
      </div>

      {/* Footer — Place CTA pinned at bottom */}
      <div className="shrink-0 px-3 pb-3">
        <button
          type="button"
          className={cn(
            "group relative w-full overflow-hidden rounded-lg py-3 text-body font-semibold transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.96]",
            side === "long"
              ? "bg-primary text-primary-foreground"
              : "bg-tone-down text-black",
          )}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-white/40 to-transparent"
          />
          <span className="relative inline-flex items-center justify-center gap-1.5">
            Place Market {side === "long" ? "Long" : "Short"}
            <span
              aria-hidden
              className="inline-block transition-transform duration-150 ease-out group-hover:translate-x-0.5"
            >
              →
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}

function ParamDropdown({
  label,
  value,
  options,
  onChange,
  accent,
  align = "start",
  rounded = "none",
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  accent?: boolean;
  align?: "start" | "end";
  rounded?: "l" | "r" | "none";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = `param-${label.toLowerCase()}-menu`;

  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${label}: ${value}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-center gap-1.5 px-3 py-2 transition-colors hover:bg-white/[0.04]",
          rounded === "l" && "rounded-l-lg",
          rounded === "r" && "rounded-r-lg",
        )}
      >
        <span
          className={cn(
            "truncate text-body",
            accent ? "tabular-nums text-primary" : "text-foreground",
          )}
        >
          {value}
        </span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-3 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        id={menuId}
        role="menu"
        aria-hidden={!open}
        className={cn(
          "absolute top-full z-20 mt-1 min-w-full origin-top rounded-lg bg-background p-1 shadow-xl ring-1 ring-white/5 transition-[opacity,transform] duration-150 ease-out",
          align === "end" ? "right-0" : "left-0",
          open
            ? "opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 -translate-y-1 scale-[0.98]",
        )}
      >
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-md px-3 py-1.5 text-left text-body transition-colors",
                active ? "bg-primary/10" : "hover:bg-white/[0.04]",
              )}
            >
              <span className={active ? "text-primary" : "text-foreground"}>
                {opt}
              </span>
              {active && <CheckIcon />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SideButton({
  active,
  onClick,
  label,
  direction,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  direction: "up" | "down";
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative flex items-center justify-center gap-1.5 rounded-md py-2 text-body font-semibold transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
        active
          ? cn(
              direction === "up"
                ? "bg-primary text-primary-foreground"
                : "bg-tone-down text-black",
              "shadow-[inset_0_-2px_0_rgba(0,0,0,0.12)]",
            )
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      <span
        aria-hidden
        className={cn(
          "inline-block text-body transition-opacity",
          active ? "opacity-90" : "opacity-50",
        )}
      >
        {direction === "up" ? "▲" : "▼"}
      </span>
    </button>
  );
}

