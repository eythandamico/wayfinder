"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Each stage's `end` is the cumulative ms at which it transitions to done.
 * Stage durations therefore = end[i] - end[i-1] (or end[0] for the first).
 */
const STAGES = [
  { label: "allocating runtime", end: 340 },
  { label: "connecting hyperliquid", end: 720 },
  { label: "connecting onchain rpc", end: 1020 },
  { label: "syncing paths registry", end: 1380 },
] as const;

const TOTAL_MS = STAGES[STAGES.length - 1].end + 120;
const BAR_WIDTH = 24;

const SPINNER = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";

const INSTANCE_ID = "wf-a8f3-7c2d";
const REGION = "us-east-1";

/**
 * Bootup screen for /shells styled like a server cold-start. A monospace
 * boot log with an ASCII progress bar that fills smoothly via rAF, a CLI-style
 * braille spinner on the in-flight stage, and per-stage timings shown after
 * each step completes. Calls onComplete once 100% lands.
 */
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

  // CLI braille spinner — independent ticker so it spins regardless of rAF.
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

      <div className="relative flex flex-col items-center gap-7">
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

        {/* ASCII progress bar */}
        <div
          aria-label={`${pct} percent loaded`}
          className="flex items-center gap-3 font-mono text-[12px]"
        >
          <span className="text-muted-foreground/50">[</span>
          <span className="tabular-nums">
            <span className="text-primary">
              {"█".repeat(filled)}
            </span>
            <span className="text-muted-foreground/25">
              {"░".repeat(BAR_WIDTH - filled)}
            </span>
          </span>
          <span className="text-muted-foreground/50">]</span>
          <span className="tabular-nums text-foreground">
            {String(pct).padStart(3, "\u00a0")}%
          </span>
        </div>

        {/* Boot log — one row per stage, status derived from elapsed */}
        <div className="flex w-[300px] flex-col gap-1.5 font-mono text-[12px]">
          {STAGES.map((stage, i) => {
            const startMs = i === 0 ? 0 : STAGES[i - 1].end;
            const status =
              elapsed >= stage.end
                ? "done"
                : elapsed >= startMs
                  ? "running"
                  : "pending";
            const stageMs = stage.end - startMs;
            return (
              <BootLine
                key={stage.label}
                label={stage.label}
                status={status}
                stageMs={stageMs}
                spinFrame={SPINNER[spin]}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BootLine({
  label,
  status,
  stageMs,
  spinFrame,
}: {
  label: string;
  status: "pending" | "running" | "done";
  stageMs: number;
  spinFrame: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 transition-[color,opacity] duration-300 ease-out",
        status === "pending" && "text-muted-foreground/35",
        status === "running" && "text-foreground",
        status === "done" && "text-muted-foreground",
      )}
    >
      <span className="inline-flex items-baseline gap-2">
        <span aria-hidden className="text-muted-foreground/50">
          ›
        </span>
        <span>{label}</span>
      </span>
      <span
        aria-hidden
        className="inline-flex min-w-[3.5rem] items-center justify-end gap-1.5 tabular-nums"
      >
        {status === "done" ? (
          <>
            <span className="text-primary">✓</span>
            <span className="text-muted-foreground/70">
              {stageMs}ms
            </span>
          </>
        ) : status === "running" ? (
          <span className="text-primary">{spinFrame}</span>
        ) : (
          <span className="text-muted-foreground/30">·</span>
        )}
      </span>
    </div>
  );
}
