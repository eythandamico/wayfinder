"use client";

import { useRef, useState } from "react";
import {
  BookOpen,
  Briefcase,
  LayoutGrid,
  LineChart,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/lib/hooks/useClickOutside";

type Sheet = "trade" | "orderbook";

export function BottomBar({
  onOpenSheet,
  onOpenChat,
  onOpenCharts,
  onOpenPortfolio,
  onOpenTrade,
}: {
  onOpenSheet: (s: Sheet) => void;
  onOpenChat: () => void;
  onOpenCharts: () => void;
  onOpenPortfolio: () => void;
  onOpenTrade: () => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useClickOutside(wrapperRef, () => setActionsOpen(false), actionsOpen);

  const choose = (s: Sheet) => {
    setActionsOpen(false);
    onOpenSheet(s);
  };

  return (
    <>
      {/* Backdrop + drawer only mount when open, so they can't flash visible
          on first paint while the closed-state classes settle. animate-in
          handles the enter; exit is instant which is fine for a tap-to-open
          mobile menu. */}
      {actionsOpen && (
        <div
          aria-hidden
          onClick={() => setActionsOpen(false)}
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
        />
      )}

      <div
        ref={wrapperRef}
        className="relative z-50 shrink-0 px-3 pt-3"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
        }}
      >
        {actionsOpen && (
          <div
            role="menu"
            className="absolute inset-x-3 bottom-full mb-2 flex flex-col gap-1 rounded-2xl bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 p-1.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 ease-[var(--ease-strong)]"
          >
            <ActionRow
              label="Order book"
              icon={<BookOpen strokeWidth={1.5} className="size-5" />}
              onClick={() => choose("orderbook")}
            />
            <ActionRow
              label="Portfolio"
              icon={<Briefcase strokeWidth={1.5} className="size-5" />}
              onClick={() => {
                setActionsOpen(false);
                onOpenPortfolio();
              }}
            />
            <ActionRow
              label="Charts"
              icon={<LineChart strokeWidth={1.5} className="size-5" />}
              onClick={() => {
                setActionsOpen(false);
                onOpenCharts();
              }}
            />
          </div>
        )}

        {/* Main row: leading actions trigger, full-width composer */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={actionsOpen ? "Close actions" : "Open actions"}
            aria-expanded={actionsOpen}
            onClick={() => setActionsOpen((v) => !v)}
            className={cn(
              "flex h-[var(--ui-h-input)] w-[var(--ui-h-input)] shrink-0 items-center justify-center rounded-full transition-[background-color,color,scale] duration-200 ease-out active:scale-[0.96]",
              actionsOpen
                ? "bg-primary/15 text-primary"
                : "bg-surface-2 text-muted-foreground hover:bg-surface-4 hover:text-foreground",
            )}
          >
            {actionsOpen ? (
              <X strokeWidth={1.75} className="size-5" />
            ) : (
              <LayoutGrid strokeWidth={1.75} className="size-5" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenTrade}
            aria-label="Open trade ticket"
            className="group relative inline-flex h-[var(--ui-h-input)] shrink-0 items-center gap-1.5 overflow-hidden rounded-full bg-primary px-3.5 text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.96]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-white/40 to-transparent"
            />
            <TrendingUp strokeWidth={2} className="size-4" aria-hidden />
            Trade
          </button>

          <button
            type="button"
            onClick={onOpenChat}
            data-demo="mobile-open-chat"
            className="flex h-[var(--ui-h-input)] flex-1 items-center gap-2 rounded-full bg-white/5 px-4 text-left text-body text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/10 active:scale-[0.96]"
          >
            <span className="flex-1 truncate">Ask your agent…</span>
            {/* Agent status — primary = ready. The shape of this slot is where
               'Thinking…' or an error pill will live once chat is wired. */}
            <span
              aria-label="Agent active"
              className="flex shrink-0 items-center gap-1.5 text-body"
            >
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]"
              />
              Active
            </span>
          </button>
        </div>
      </div>
    </>
  );
}

function ActionRow({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-body text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-2 active:scale-[0.98]"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-2">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
