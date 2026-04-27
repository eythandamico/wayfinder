"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { label: "allocating runtime", duration: 320 },
  { label: "connecting hyperliquid", duration: 380 },
  { label: "connecting onchain rpc", duration: 300 },
  { label: "syncing paths registry", duration: 360 },
] as const;

const INSTANCE_ID = "wf-a8f3-7c2d";
const REGION = "us-east-1";

/**
 * Bootup screen for /shells styled like a server spin-up. Fakes the cycle
 * of allocating compute + connecting venues + syncing data, with a small
 * boot-log block under the brand mark. Calls onComplete once all stages
 * finish so the parent can flip booted and start the app fade-in.
 */
export function ShellsBoot({
  dismissed,
  onComplete,
}: {
  dismissed: boolean;
  onComplete?: () => void;
}) {
  const [done, setDone] = useState(0);

  useEffect(() => {
    let cumulative = 0;
    const ids: number[] = [];
    STAGES.forEach((stage, i) => {
      cumulative += stage.duration;
      ids.push(window.setTimeout(() => setDone(i + 1), cumulative));
    });
    // Hold on the completed state for a beat before signaling complete,
    // so the user sees every line check off rather than instantly fading.
    ids.push(window.setTimeout(() => onComplete?.(), cumulative + 250));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [onComplete]);

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
      {/* Aurora — primary-tinted radial behind the icon */}
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
          className="size-14 animate-breathe"
          priority
        />

        {/* Instance metadata */}
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>{INSTANCE_ID}</span>
          <span aria-hidden className="size-1 rounded-full bg-muted-foreground/40" />
          <span>{REGION}</span>
        </div>

        {/* Boot log */}
        <div className="flex w-[280px] flex-col gap-1.5 font-mono text-[12px]">
          {STAGES.map((stage, i) => (
            <BootLine
              key={stage.label}
              label={stage.label}
              status={
                done > i ? "done" : done === i ? "running" : "pending"
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BootLine({
  label,
  status,
}: {
  label: string;
  status: "pending" | "running" | "done";
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 transition-[color,opacity] duration-300 ease-out",
        status === "pending" && "text-muted-foreground/40",
        status === "running" && "text-foreground",
        status === "done" && "text-muted-foreground",
      )}
    >
      <span className="inline-flex items-baseline gap-2">
        <span aria-hidden className="text-muted-foreground/50">
          ›
        </span>
        <span className="tabular-nums">{label}</span>
      </span>
      <span aria-hidden className="flex size-3 items-center justify-center">
        {status === "done" ? (
          <Check strokeWidth={2.5} className="size-3 text-primary" />
        ) : status === "running" ? (
          <Loader2 strokeWidth={2} className="size-3 animate-spin text-primary" />
        ) : (
          <span className="size-1 rounded-full bg-muted-foreground/30" />
        )}
      </span>
    </div>
  );
}
