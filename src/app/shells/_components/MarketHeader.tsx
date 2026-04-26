"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { formatTokens, shortAddress } from "@/lib/format";
import type { UsageData } from "../_types";
import {
  CURRENT_SECTION,
  MOCK_USAGE,
  NAV_SECTIONS,
  WALLET_ADDRESS,
} from "../_data/mocks";
import {
  BarDivider,
  ChevronDownIcon,
  CopyIcon,
  CpuIcon,
  DriveIcon,
  ExternalLinkIcon,
  InfinityIcon,
} from "./icons";
import { Sparkles } from "lucide-react";
import { useDensity, type Density } from "../_state/shells-context";
import { CommandSearchBar } from "./CommandBar";

export function MarketHeader() {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-3 py-4">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="flex shrink-0 items-center rounded-md px-1 transition-opacity hover:opacity-80"
          aria-label="Wayfinder home"
        >
          <Image
            src="/brand/wayfinder-logomark.svg"
            alt="Wayfinder"
            width={141}
            height={32}
            className="h-6 w-auto"
            priority
          />
        </Link>

        <AppMenu current={CURRENT_SECTION} />
      </div>

      <div className="w-[560px] max-w-full justify-self-center">
        <CommandSearchBar />
      </div>

      <div className="flex items-center justify-end gap-3">
        <UsagePill usage={MOCK_USAGE} />
        <GoProButton />
        <BarDivider />
        <ConnectedPill address={WALLET_ADDRESS} />
      </div>
    </div>
  );
}

function UsagePill({ usage }: { usage: UsageData }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false), open);

  const cpuPct = usage.cpu.percent;
  const ramPct = (usage.ram.used / usage.ram.total) * 100;
  const tokenPct = (usage.tokens.used / usage.tokens.total) * 100;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="usage-menu"
        aria-label={`Session usage: ${formatTokens(usage.tokens.used)} of ${formatTokens(usage.tokens.total)} tokens used`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-[var(--ui-h-input)] items-center gap-2.5 rounded-lg bg-white/[0.06] px-3.5 text-muted-foreground ring-1 ring-inset ring-white/[0.08] transition-[background-color,color,box-shadow,scale] duration-150 ease-out hover:bg-white/[0.09] hover:text-foreground hover:ring-white/[0.12] active:scale-[0.96]"
      >
        <InfinityIcon />
        <span aria-hidden className="text-body tabular-nums text-foreground">
          {formatTokens(usage.tokens.used)}
          <span className="text-muted-foreground">
            {" / "}
            {formatTokens(usage.tokens.total)}
          </span>
        </span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-3 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      <div
        id="usage-menu"
        role="menu"
        aria-hidden={!open}
        className={cn(
          "absolute right-0 top-full z-30 mt-1 w-80 origin-top-right rounded-lg bg-background p-3 shadow-xl ring-1 ring-white/5 transition-[opacity,transform] duration-150 ease-out",
          open
            ? "opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 -translate-y-1 scale-[0.98]",
        )}
      >
        <div className="flex items-center justify-between px-1 pb-3">
          <span className="text-body font-semibold text-foreground">
            Session usage
          </span>
          <span className="inline-flex items-center gap-1.5 text-body text-muted-foreground tabular-nums">
            <span aria-hidden className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
            {usage.sessionDuration} · Active
          </span>
        </div>

        <div className="flex flex-col gap-3 px-1">
          <UsageMetricRow
            icon={<CpuIcon />}
            label="CPU"
            percent={cpuPct}
            value={`${cpuPct}%`}
          />
          <UsageMetricRow
            icon={<DriveIcon />}
            label="RAM"
            percent={ramPct}
            value={`${usage.ram.used.toFixed(1)} GB`}
          />
          <UsageMetricRow
            icon={<InfinityIcon />}
            label="Tokens"
            percent={tokenPct}
            value={`${formatTokens(usage.tokens.used)} / ${formatTokens(usage.tokens.total)}`}
          />
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-white/5 px-1 pt-3 text-body">
          <span className="text-muted-foreground">Estimated cost</span>
          <span className="tabular-nums text-foreground">
            ${usage.costUsd.toFixed(2)}
          </span>
        </div>

        <div className="mt-2 flex flex-col gap-0.5">
          <button type="button" role="menuitem" className="flex items-center justify-between rounded-md px-1 py-1.5 text-body text-foreground transition-colors hover:bg-white/[0.05]">
            <span>View detailed usage</span>
            <ExternalLinkIcon />
          </button>
          <button type="button" role="menuitem" className="flex items-center justify-between rounded-md px-1 py-1.5 text-body text-foreground transition-colors hover:bg-white/[0.05]">
            <span>Manage limits</span>
            <ExternalLinkIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

function GoProButton() {
  return (
    <button
      type="button"
      aria-label="Upgrade to Pro"
      className="inline-flex h-[var(--ui-h-input)] shrink-0 items-center gap-2 rounded-lg px-3.5 text-body font-semibold transition-[filter,scale] duration-150 ease-out hover:brightness-110 active:scale-[0.96]"
      style={{
        background: "var(--wf-pro-gold)",
        color: "var(--wf-pro-indigo)",
      }}
    >
      <SparkleIcon />
      Go Pro
    </button>
  );
}

function SparkleIcon() {
  return <Sparkles strokeWidth={1.75} className="size-3.5" aria-hidden />;
}

function UsageMetricRow({
  icon,
  label,
  percent,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  percent: number;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-body text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="text-body tabular-nums text-foreground">
          {value}
        </span>
      </div>
      <div className="relative h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

function AppMenu({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="app-menu"
        aria-label={`Navigate sections (current: ${current})`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-[var(--ui-h-input)] items-center gap-2 rounded-lg bg-white/[0.06] px-3.5 text-body font-medium text-foreground ring-1 ring-inset ring-white/[0.08] transition-[background-color,color,box-shadow,scale] duration-150 ease-out hover:bg-white/[0.09] hover:ring-white/[0.12] active:scale-[0.96]"
      >
        {current}
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-3 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        id="app-menu"
        role="menu"
        aria-hidden={!open}
        className={cn(
          "absolute left-0 top-full z-30 mt-1 w-52 origin-top-left rounded-lg bg-background p-1 shadow-xl ring-1 ring-white/5 transition-[opacity,transform] duration-150 ease-[var(--ease-strong)]",
          open
            ? "opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 -translate-y-1 scale-[0.98]",
        )}
      >
        {NAV_SECTIONS.map((s) => {
          const isActive = s.label === current;
          return (
            <Link
              key={s.href}
              href={s.href}
              role="menuitem"
              aria-current={isActive ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-body transition-colors hover:bg-white/[0.05]",
                isActive && "bg-white/[0.04] text-foreground",
                !isActive && "text-foreground",
              )}
            >
              <span>{s.label}</span>
              {isActive && (
                <span aria-hidden className="size-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ConnectedPill({ address }: { address: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false), open);

  const short = shortAddress(address);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="wallet-menu"
        aria-label={`Wallet connected: ${short}`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-[var(--ui-h-input)] items-center gap-2.5 rounded-lg bg-white/[0.06] px-3.5 text-muted-foreground ring-1 ring-inset ring-white/[0.08] transition-[background-color,color,box-shadow,scale] duration-150 ease-out hover:bg-white/[0.09] hover:text-foreground hover:ring-white/[0.12] active:scale-[0.96]"
      >
        <span aria-hidden className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
        <span aria-hidden className="text-body tabular-nums text-foreground">
          {short}
        </span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-3 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        id="wallet-menu"
        role="menu"
        aria-hidden={!open}
        className={cn(
          "absolute right-0 top-full z-30 mt-1 w-64 origin-top-right rounded-lg bg-background p-1 shadow-xl ring-1 ring-white/5 transition-[opacity,transform] duration-150 ease-out",
          open
            ? "opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 -translate-y-1 scale-[0.98]",
        )}
      >
        <div className="px-3 py-2">
          <div className="text-body text-muted-foreground">
            Connected
          </div>
          <div className="mt-1 text-body tabular-nums text-foreground">
            {short}
          </div>
        </div>
        <div className="h-px bg-white/5" />
        <button
          type="button"
          role="menuitem"
          onClick={copy}
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-body text-foreground transition-colors hover:bg-white/[0.05]"
        >
          <span>{copied ? "Copied" : "Copy address"}</span>
          <CopyIcon />
        </button>
        <button type="button" role="menuitem" className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-body text-foreground transition-colors hover:bg-white/[0.05]">
          <span>View on Etherscan</span>
          <ExternalLinkIcon />
        </button>
        <div className="h-px bg-white/5" />
        <DensityRow />
        <div className="h-px bg-white/5" />
        <button type="button" role="menuitem" className="flex w-full items-center rounded-md px-3 py-2 text-left text-body text-tone-down transition-colors hover:bg-tone-down/10">
          Disconnect
        </button>
      </div>
    </div>
  );
}

function DensityRow() {
  const { density, setDensity } = useDensity();
  const options: { value: Density; label: string; size: string }[] = [
    { value: "small", label: "Small", size: "text-[13px]" },
    { value: "medium", label: "Medium", size: "text-[14px]" },
    { value: "large", label: "Large", size: "text-[16px]" },
  ];
  return (
    <div className="px-2 py-1.5">
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
                "flex h-7 flex-1 items-center justify-center rounded-sm font-semibold transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
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
  );
}
