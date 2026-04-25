"use client";

import { Mic } from "lucide-react";

export function CompactComposer({ onActivate }: { onActivate: () => void }) {
  return (
    <div
      className="shrink-0 bg-muted/95 px-3 pt-2"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
    >
      <button
        type="button"
        onClick={onActivate}
        className="flex h-[var(--ui-h-input)] w-full items-center gap-2 rounded-full bg-white/5 px-4 text-left text-body text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/10 active:scale-[0.96]"
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
  );
}
