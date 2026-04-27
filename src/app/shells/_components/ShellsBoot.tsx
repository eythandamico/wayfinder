"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Each stage's `end` is the cumulative ms at which it transitions to done.
 */
const STAGES = [
  { label: "allocating runtime", end: 340 },
  { label: "connecting hyperliquid", end: 720 },
  { label: "connecting onchain rpc", end: 1020 },
  { label: "syncing paths registry", end: 1380 },
] as const;

const TOTAL_MS = STAGES[STAGES.length - 1].end + 120;
const BAR_WIDTH = 20;

const SPINNER = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";

const INSTANCE_ID = "wf-a8f3-7c2d";
const REGION = "us-east-1";

export function ShellsBoot({
  dismissed,
  onComplete,
}: {
  dismissed: boolean;
  onComplete?: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [spin, setSpin] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    let done = false;
    const tick = () => {
      const t = performance.now() - start;
      setElapsed(Math.min(t, TOTAL_MS));
      if (t < TOTAL_MS) {
        raf = requestAnimationFrame(tick);
      } else if (!done) {
        done = true;
        onComplete?.();
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onComplete]);

  useEffect(() => {
    const id = window.setInterval(
      () => setSpin((f) => (f + 1) % SPINNER.length),
      80,
    );
    return () => window.clearInterval(id);
  }, []);

  const progress = Math.min(elapsed / TOTAL_MS, 1);
  const filled = Math.floor(progress * BAR_WIDTH);
  const pct = Math.floor(progress * 100);

  // Current stage = first one whose end hasn't been reached. -1 once done.
  const currentIdx = STAGES.findIndex((s) => elapsed < s.end);
  const isDone = currentIdx === -1;
  const currentLabel = isDone ? "ready" : STAGES[currentIdx].label;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={dismissed}
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ease-out",
        dismissed ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(35% 40% at 50% 35%, color-mix(in oklch, var(--primary) 20%, transparent) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative flex flex-col items-center gap-8">
        <Image
          src="/brand/wayfinder-icon-white.png"
          alt="Wayfinder"
          width={96}
          height={96}
          className="size-12 animate-breathe"
          priority
        />

        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>{INSTANCE_ID}</span>
          <span aria-hidden className="size-1 rounded-full bg-muted-foreground/40" />
          <span>{REGION}</span>
        </div>

        <div className="flex w-[280px] flex-col gap-2 font-mono text-[12px]">
          {/* Step label (left) + percentage (right) */}
          <div className="flex items-center justify-between gap-4 text-foreground">
            <span
              key={currentLabel}
              className="inline-flex items-center gap-2 animate-in fade-in slide-in-from-bottom-0.5 duration-300 ease-out"
            >
              <span
                aria-hidden
                className={cn(
                  "inline-block w-3 text-center text-primary",
                  isDone && "tabular-nums",
                )}
              >
                {isDone ? "✓" : SPINNER[spin]}
              </span>
              <span>{currentLabel}</span>
            </span>
            <span
              aria-label={`${pct} percent`}
              className="tabular-nums"
            >
              {String(pct).padStart(3, "\u00a0")}%
            </span>
          </div>

          {/* ASCII progress bar — small cells with explicit gap */}
          <div
            aria-hidden
            className="flex items-center gap-2 text-[11px] leading-none"
          >
            <span className="text-muted-foreground/50">[</span>
            <div className="flex items-center gap-1">
              {Array.from({ length: BAR_WIDTH }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    i < filled ? "text-primary" : "text-muted-foreground/25",
                  )}
                >
                  {i < filled ? "▰" : "▱"}
                </span>
              ))}
            </div>
            <span className="text-muted-foreground/50">]</span>
          </div>
        </div>
      </div>
    </div>
  );
}
