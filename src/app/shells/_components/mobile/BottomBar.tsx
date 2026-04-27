"use client";

import { useRef, useState } from "react";
import { BookOpen, Briefcase, Mic, Plus, TrendingUp } from "lucide-react";
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
    <div
      ref={wrapperRef}
      className="relative shrink-0 px-3 pt-3"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
      }}
    >
      {/* Action drawer — floats above the main row when open. Absolute so the
          chart underneath isn't pushed when the user toggles. */}
      <div
        role="menu"
        aria-hidden={!actionsOpen}
        className={cn(
          "absolute inset-x-3 bottom-full mb-2 grid grid-cols-3 gap-2 rounded-2xl bg-background p-2 shadow-2xl ring-1 ring-white/[0.06] transition-[opacity,transform] duration-200 ease-[var(--ease-strong)]",
          actionsOpen
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0",
        )}
      >
        <ActionCard
          label="Trade"
          icon={<TrendingUp strokeWidth={1.5} className="size-5" />}
          onClick={() => choose("trade")}
        />
        <ActionCard
          label="Order book"
          icon={<BookOpen strokeWidth={1.5} className="size-5" />}
          onClick={() => choose("orderbook")}
        />
        <ActionCard
          label="Portfolio"
          icon={<Briefcase strokeWidth={1.5} className="size-5" />}
          onClick={() => choose("portfolio")}
        />
      </div>

      {/* Main row: leading + button, full-width composer, trailing mic */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={actionsOpen ? "Close actions" : "Open actions"}
          aria-expanded={actionsOpen}
          onClick={() => setActionsOpen((v) => !v)}
          className={cn(
            "flex h-[var(--ui-h-input)] w-[var(--ui-h-input)] shrink-0 items-center justify-center rounded-full transition-[background-color,color,rotate,scale] duration-200 ease-out active:scale-[0.96]",
            actionsOpen
              ? "rotate-45 bg-primary/15 text-primary"
              : "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.10] hover:text-foreground",
          )}
        >
          <Plus strokeWidth={1.75} className="size-5" />
        </button>

        <button
          type="button"
          onClick={onOpenChat}
          className="flex h-[var(--ui-h-input)] flex-1 items-center gap-2 rounded-full bg-white/5 px-4 text-left text-body text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/10 active:scale-[0.96]"
        >
          <span className="flex-1 truncate">Ask your agent…</span>
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-muted-foreground"
          >
            <Mic strokeWidth={1.5} className="size-3.5" />
          </span>
        </button>
      </div>
    </div>
  );
}

function ActionCard({
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
      className="flex flex-col items-center gap-2 rounded-xl bg-white/[0.04] p-3 text-body text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-white/[0.08] active:scale-[0.96]"
    >
      <span className="flex size-10 items-center justify-center rounded-full bg-white/[0.08]">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
