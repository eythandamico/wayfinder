"use client";

import { useRef, useState } from "react";
import {
  BookOpen,
  Briefcase,
  LayoutGrid,
  TrendingUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/lib/hooks/useClickOutside";

type Sheet = "trade" | "portfolio" | "orderbook";

export function BottomBar({
  onOpenSheet,
  onOpenChat,
}: {
  onOpenSheet: (s: Sheet) => void;
  onOpenChat: () => void;
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
      {/* Backdrop — covers the rest of the screen when the actions drawer is
          open. Blurs + dims the chart underneath so the menu reads as the
          focused element. Tap anywhere on the backdrop to dismiss. */}
      <div
        aria-hidden
        onClick={() => setActionsOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity duration-200 ease-out",
          actionsOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <div
        ref={wrapperRef}
        className="relative z-50 shrink-0 px-3 pt-3"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
        }}
      >
        {/* Action drawer — floats above the main row when open. Vertical list. */}
        <div
          role="menu"
          aria-hidden={!actionsOpen}
          className={cn(
            "absolute inset-x-3 bottom-full mb-2 flex flex-col gap-1 rounded-2xl bg-background p-1.5 shadow-2xl transition-[opacity,transform] duration-200 ease-[var(--ease-strong)]",
            actionsOpen
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-2 opacity-0",
          )}
        >
          <ActionRow
            label="Trade"
            icon={<TrendingUp strokeWidth={1.5} className="size-5" />}
            onClick={() => choose("trade")}
          />
          <ActionRow
            label="Order book"
            icon={<BookOpen strokeWidth={1.5} className="size-5" />}
            onClick={() => choose("orderbook")}
          />
          <ActionRow
            label="Portfolio"
            icon={<Briefcase strokeWidth={1.5} className="size-5" />}
            onClick={() => choose("portfolio")}
          />
        </div>

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
                : "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.10] hover:text-foreground",
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
            onClick={onOpenChat}
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
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-body text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-white/[0.06] active:scale-[0.98]"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06]">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
