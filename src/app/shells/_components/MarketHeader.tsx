"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
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
import { CommandSearchBar } from "./CommandBar";

export function MarketHeader() {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg bg-muted px-3 py-2">
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

function formatTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

function UsagePill({ usage }: { usage: UsageData }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

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
        className="inline-flex h-9 items-center gap-2 rounded-full bg-white/5 px-3 text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/10 hover:text-foreground active:scale-[0.96]"
      >
        <InfinityIcon />
        <span aria-hidden className="font-mono text-[12px] tabular-nums text-foreground">
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
          <span className="text-sm font-semibold text-foreground">
            Session usage
          </span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground tabular-nums">
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

        <div className="mt-3 flex items-center justify-between border-t border-white/5 px-1 pt-3 text-sm">
          <span className="text-muted-foreground">Estimated cost</span>
          <span className="font-mono tabular-nums text-foreground">
            ${usage.costUsd.toFixed(2)}
          </span>
        </div>

        <div className="mt-2 flex flex-col gap-0.5">
          <button type="button" role="menuitem" className="flex items-center justify-between rounded-md px-1 py-1.5 text-sm text-foreground/85 transition-colors hover:bg-white/[0.05]">
            <span>View detailed usage</span>
            <ExternalLinkIcon />
          </button>
          <button type="button" role="menuitem" className="flex items-center justify-between rounded-md px-1 py-1.5 text-sm text-foreground/85 transition-colors hover:bg-white/[0.05]">
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
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-[filter,scale] duration-150 ease-out hover:brightness-110 active:scale-[0.96]"
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
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3.5"
      fill="currentColor"
    >
      <path d="M8 1.2L9.35 6.05L14.2 8L9.35 9.95L8 14.8L6.65 9.95L1.8 8L6.65 6.05Z" />
    </svg>
  );
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
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-foreground">
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

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="app-menu"
        aria-label={`Navigate sections (current: ${current})`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.04]"
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
                "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-white/[0.05]",
                isActive && "bg-white/[0.04] text-foreground",
                !isActive && "text-foreground/85",
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

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const short = `${address.slice(0, 6)}…${address.slice(-4)}`;

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
        className="inline-flex h-9 items-center gap-2 rounded-full bg-white/5 px-3 text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/10 hover:text-foreground active:scale-[0.96]"
      >
        <span aria-hidden className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
        <span aria-hidden className="font-mono text-[12px] tabular-nums text-foreground">
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
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            Connected
          </div>
          <div className="mt-1 font-mono text-[12px] tabular-nums text-foreground">
            {short}
          </div>
        </div>
        <div className="h-px bg-white/5" />
        <button
          type="button"
          role="menuitem"
          onClick={copy}
          className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-foreground/85 transition-colors hover:bg-white/[0.05]"
        >
          <span>{copied ? "Copied" : "Copy address"}</span>
          <CopyIcon />
        </button>
        <button type="button" role="menuitem" className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-foreground/85 transition-colors hover:bg-white/[0.05]">
          <span>View on Etherscan</span>
          <ExternalLinkIcon />
        </button>
        <div className="h-px bg-white/5" />
        <button type="button" role="menuitem" className="flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-[#f07575] transition-colors hover:bg-[#f07575]/10">
          Disconnect
        </button>
      </div>
    </div>
  );
}
