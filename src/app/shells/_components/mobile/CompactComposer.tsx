"use client";

export function CompactComposer({ onActivate }: { onActivate: () => void }) {
  return (
    <div
      className="shrink-0 bg-muted/95 px-3 pt-2"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
    >
      <button
        type="button"
        onClick={onActivate}
        className="flex h-11 w-full items-center gap-2 rounded-full bg-white/5 px-4 text-left text-[13px] text-muted-foreground/80 transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/10 active:scale-[0.96]"
      >
        <span className="flex-1 truncate">Ask your agent…</span>
        <span
          aria-hidden
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-muted-foreground"
        >
          <MicIcon />
        </span>
      </button>
    </div>
  );
}

function MicIcon() {
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
      <rect x="6" y="2.5" width="4" height="7" rx="2" />
      <path d="M4 8.5A4 4 0 0 0 12 8.5" />
      <path d="M8 12.5V14" />
    </svg>
  );
}
