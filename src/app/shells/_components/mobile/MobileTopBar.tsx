"use client";

import { useRef, useState } from "react";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import Link from "next/link";
import Image from "next/image";
import {
  CandlestickChart,
  Compass,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { WALLET_ADDRESS } from "../../_data/mocks";
import {
  useDensity,
  useViewMode,
  type Density,
  type ViewMode,
} from "../../_state/shells-context";
import { CommandSearchIconButton } from "../CommandBar";
import { cn } from "@/lib/utils";

export function MobileTopBar() {
  const short = `${WALLET_ADDRESS.slice(0, 6)}…${WALLET_ADDRESS.slice(-4)}`;
  return (
    <div
      className="flex shrink-0 items-center justify-between gap-2 px-3"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
        paddingBottom: "0.5rem",
      }}
    >
      <div className="flex items-center gap-2">
        <Link
          href="/"
          aria-label="Wayfinder home"
          className="flex shrink-0 items-center rounded-md px-1 transition-opacity hover:opacity-80"
        >
          <Image
            src="/brand/wayfinder-icon-white.png"
            alt="Wayfinder"
            width={56}
            height={56}
            className="size-7"
            priority
          />
        </Link>
        <MobileViewModeToggle />
      </div>

      <div className="flex items-center gap-1.5">
        <span
          className="inline-flex size-8 items-center justify-center rounded-full bg-white/5 text-body tabular-nums text-foreground sm:size-auto sm:gap-1.5 sm:px-2.5"
          aria-label={`Wallet ${short}`}
          title={short}
        >
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]"
          />
          <span className="hidden sm:inline">{short}</span>
        </span>
        <CommandSearchIconButton />
        <MoreMenu />
      </div>
    </div>
  );
}

function MobileViewModeToggle() {
  const { viewMode, setViewMode } = useViewMode();
  return (
    <div className="flex items-center gap-0.5">
      <ToggleButton
        active={viewMode === "trading"}
        onClick={() => setViewMode("trading")}
        Icon={CandlestickChart}
        target="trading"
        label="Trade"
      />
      <ToggleButton
        active={viewMode === "explore"}
        onClick={() => setViewMode("explore")}
        Icon={Compass}
        target="explore"
        label="Paths"
      />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  Icon,
  target,
  label,
}: {
  active: boolean;
  onClick: () => void;
  Icon: LucideIcon;
  target: ViewMode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${label} view`}
      title={label}
      data-target={target}
      onClick={onClick}
      className={cn(
        "flex size-8 items-center justify-center rounded-md transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
        active
          ? "bg-white/[0.08] text-foreground"
          : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
      )}
    >
      <Icon strokeWidth={1.75} className="size-4" aria-hidden />
    </button>
  );
}

function MoreMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { density, setDensity } = useDensity();

  useClickOutside(ref, () => setOpen(false), open);

  const options: { value: Density; size: string }[] = [
    { value: "small", size: "text-[13px]" },
    { value: "medium", size: "text-[14px]" },
    { value: "large", size: "text-[16px]" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
      >
        <MoreHorizontal strokeWidth={1.5} className="size-4" aria-hidden />
      </button>
      <div
        role="menu"
        aria-hidden={!open}
        className={cn(
          "absolute right-0 top-full z-30 mt-1 w-56 origin-top-right rounded-lg bg-background p-2 shadow-xl ring-1 ring-white/5 transition-[opacity,transform] duration-150 ease-[var(--ease-strong)]",
          open
            ? "opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 -translate-y-1 scale-[0.98]",
        )}
      >
        <div className="px-1 pb-1.5 text-body text-muted-foreground">
          Display density
        </div>
        <div className="flex items-center gap-1 rounded-md bg-white/[0.04] p-0.5 ring-1 ring-inset ring-white/[0.04]">
          {options.map((opt) => {
            const active = density === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => setDensity(opt.value)}
                className={cn(
                  "flex h-8 flex-1 items-center justify-center rounded-sm font-semibold transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
                  opt.size,
                  active
                    ? "bg-white/[0.08] text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Aa
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
