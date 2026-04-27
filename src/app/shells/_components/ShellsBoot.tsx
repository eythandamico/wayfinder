"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const STAGES = [
  "Spinning up your instance",
  "Connecting to markets",
  "Loading paths",
] as const;

const STAGE_MS = 500;

/**
 * Bootup screen for /shells — sits above the app and fades out once
 * `dismissed` is true. Sequence: ~1.5s of cycling status messages with the
 * brand icon breathing, then the parent flips dismissed and the screen
 * fades out while the app fades in underneath.
 */
export function ShellsBoot({ dismissed }: { dismissed: boolean }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const ids = STAGES.map((_, i) =>
      i === 0 ? null : window.setTimeout(() => setStage(i), STAGE_MS * i),
    ).filter((x): x is number => x !== null);
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, []);

  return (
    <div
      aria-hidden={dismissed}
      role="status"
      aria-live="polite"
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ease-out",
        dismissed ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      {/* Aurora glow — primary-tinted radial behind the icon */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(35% 40% at 50% 45%, color-mix(in oklch, var(--primary) 22%, transparent) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative flex flex-col items-center gap-7">
        <Image
          src="/brand/wayfinder-icon-white.png"
          alt="Wayfinder"
          width={120}
          height={120}
          className="size-20 animate-breathe"
          priority
        />

        {/* Status row — fixed-height container so the swap doesn't shift
            anything underneath, and keyed span so each stage gets its own
            mount + enter animation. */}
        <div className="relative flex h-5 items-center justify-center">
          <span
            key={stage}
            className="inline-flex items-center gap-2 text-body text-muted-foreground animate-in fade-in slide-in-from-bottom-0.5 duration-400 ease-out"
          >
            {STAGES[stage]}
            <DotsLoader />
          </span>
        </div>
      </div>
    </div>
  );
}

function DotsLoader() {
  return (
    <span aria-hidden className="inline-flex items-center gap-1">
      <span
        className="size-1 animate-boot-dot rounded-full bg-current"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="size-1 animate-boot-dot rounded-full bg-current"
        style={{ animationDelay: "180ms" }}
      />
      <span
        className="size-1 animate-boot-dot rounded-full bg-current"
        style={{ animationDelay: "360ms" }}
      />
    </span>
  );
}
