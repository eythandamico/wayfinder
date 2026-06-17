"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BASE_PRIZE,
  CASINO_OPEN_EVENT,
  CASINO_SYMBOLS,
  spin,
  type CasinoSymbol,
  type Outcome,
  type SpinResult,
} from "../_lib/casino";
import { triggerDopamine } from "../_lib/dopamine";

const CELL_HEIGHT = 88;
const REEL_WIDTH = 88;
const STRIP_LENGTH = 26;
// Staggered stop times — each reel lands ~700ms after the previous.
// Total reveal ~2.7s, long enough for the breath-hold beat on the
// third reel, short enough not to drag.
const REEL_DURATIONS = [1400, 2050, 2700] as const;
const REVEAL_LAG = 220;

const EASE = "cubic-bezier(0.04, 0.84, 0.2, 1)";

type Phase = "idle" | "spinning" | "revealed";

/** Casino slot-machine modal. Listens for the `wf:casino:open`
 *  CustomEvent on window — DevTools (or any other surface) can
 *  dispatch it to bring up the modal. Self-contained otherwise. */
export function CasinoModal() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<SpinResult | null>(null);
  // spinId increments per pull and is used as the React key on each
  // reel so the strip remounts fresh on every spin.
  const [spinId, setSpinId] = useState(0);
  const revealTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setPhase("idle");
      setResult(null);
    };
    window.addEventListener(CASINO_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CASINO_OPEN_EVENT, onOpen);
  }, []);

  useEffect(
    () => () => {
      if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    },
    [],
  );

  const pull = () => {
    if (phase === "spinning") return;
    const r = spin();
    setResult(r);
    setSpinId((id) => id + 1);
    setPhase("spinning");
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    revealTimerRef.current = window.setTimeout(() => {
      setPhase("revealed");
      if (r.outcome === "jackpot") {
        triggerDopamine("free-casino-pull");
      }
    }, REEL_DURATIONS[2] + REVEAL_LAG);
  };

  const close = () => {
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    setOpen(false);
    // Reset state lazily after the close transition so the modal
    // doesn't flash the previous result on re-open.
    window.setTimeout(() => {
      setPhase("idle");
      setResult(null);
    }, 250);
  };

  const isJackpot = phase === "revealed" && result?.outcome === "jackpot";

  return (
    <Dialog.Root open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[var(--z-modal-bg)] bg-background/70 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[min(94vw,420px)] -translate-x-1/2 -translate-y-1/2 origin-center overflow-hidden rounded-2xl bg-card backdrop-blur-md p-0 ring-1 ring-inset ring-white/[0.06] shadow-2xl transition-[opacity,transform] duration-200 ease-[var(--ease-strong)] data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0",
          )}
        >
          {/* Mint pulse on jackpot — a brief radial glow that lifts the
              whole modal when the third reel lands. */}
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 ease-out",
              isJackpot && "opacity-100",
            )}
            style={{
              background:
                "radial-gradient(70% 60% at 50% 45%, color-mix(in oklch, var(--primary) 28%, transparent) 0%, transparent 70%)",
            }}
          />

          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-2 hover:text-foreground active:scale-[0.96]"
          >
            <X strokeWidth={1.75} className="size-4" aria-hidden />
          </button>

          <div className="relative flex flex-col items-center gap-5 px-6 pb-6 pt-7 text-center">
            <Header phase={phase} outcome={result?.outcome} />

            {/* Reels */}
            <div className="relative">
              {/* Pay line — subtle horizontal accent across the
                  middle of the reels. Stronger on jackpot. */}
              <div
                aria-hidden
                className={cn(
                  "pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px -translate-y-1/2 transition-colors duration-500",
                  isJackpot ? "bg-primary/70 shadow-[0_0_8px_var(--primary)]" : "bg-surface-2",
                )}
              />
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                  <Reel
                    key={`${spinId}-${i}`}
                    target={result?.symbols[i] ?? CASINO_SYMBOLS[0]}
                    duration={REEL_DURATIONS[i]}
                    enabled={phase !== "idle"}
                    highlight={isJackpot}
                  />
                ))}
              </div>
            </div>

            <PrizeReveal result={result} phase={phase} />

            <button
              type="button"
              onClick={phase === "spinning" ? undefined : pull}
              disabled={phase === "spinning"}
              className={cn(
                "group/cta relative inline-flex h-10 w-full items-center justify-center gap-2 overflow-hidden rounded-md px-5 text-body font-semibold transition-[filter,scale] duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed",
                phase === "spinning"
                  ? "bg-surface-2 text-muted-foreground"
                  : isJackpot
                    ? "bg-primary text-primary-foreground hover:brightness-[1.04]"
                    : "bg-surface-4 text-foreground hover:bg-surface-4",
              )}
            >
              {phase !== "spinning" && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-white/40 to-transparent"
                />
              )}
              <span className="relative">
                {ctaLabel(phase, result)}
              </span>
            </button>

            <p className="text-caption text-muted-foreground">
              Pull odds: 3-of-a-kind pays {BASE_PRIZE}× the symbol multiplier.
            </p>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Header({ phase, outcome }: { phase: Phase; outcome?: Outcome }) {
  let eyebrow = "Free Pull";
  let title = "Pull the lever";

  if (phase === "spinning") {
    title = "Spinning…";
  } else if (phase === "revealed") {
    if (outcome === "jackpot") {
      eyebrow = "Jackpot";
      title = "Three in a row.";
    } else if (outcome === "near-miss") {
      eyebrow = "So close";
      title = "Almost had it.";
    } else {
      eyebrow = "No match";
      title = "Better luck next pull.";
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={cn(
          "font-mono text-micro uppercase tracking-[0.22em] transition-colors duration-300",
          outcome === "jackpot" && phase === "revealed"
            ? "text-primary"
            : "text-muted-foreground",
        )}
      >
        {eyebrow}
      </span>
      <h2 className="font-heading text-balance text-title font-semibold leading-tight text-foreground">
        {title}
      </h2>
    </div>
  );
}

function PrizeReveal({
  result,
  phase,
}: {
  result: SpinResult | null;
  phase: Phase;
}) {
  // Smooth count-up from 0 to the final prize over ~800ms when the
  // jackpot resolves. We tween via RAF and only call setState from
  // inside the RAF callback — never synchronously in the effect
  // body — so the no-set-state-in-effect lint rule stays happy.
  const [displayUsd, setDisplayUsd] = useState(0);
  const isJackpot =
    phase === "revealed" && !!result && result.outcome === "jackpot";
  const prizeUsd = isJackpot ? (result?.prizeUsd ?? 0) : 0;
  useEffect(() => {
    if (!isJackpot) {
      // Schedule the reset asynchronously so it doesn't fire
      // synchronously during commit.
      const id = requestAnimationFrame(() => setDisplayUsd(0));
      return () => cancelAnimationFrame(id);
    }
    const startedAt = performance.now();
    const duration = 800;
    let frameId = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - startedAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayUsd(Math.round(prizeUsd * eased));
      if (t < 1) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isJackpot, prizeUsd]);

  if (phase !== "revealed" || !result) {
    return <div className="h-8" aria-hidden />;
  }

  if (result.outcome === "jackpot") {
    const sym = result.symbols[0];
    return (
      <div className="flex h-8 items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
        <Sparkles
          strokeWidth={2}
          className="size-4 text-primary"
          aria-hidden
        />
        <span className="text-title font-semibold tabular-nums text-primary">
          +${displayUsd.toLocaleString("en-US")}
        </span>
        <span className="text-body font-medium text-muted-foreground">
          in {sym.label}
        </span>
      </div>
    );
  }

  return (
    <p className="flex h-8 items-center justify-center text-body text-muted-foreground animate-in fade-in duration-300">
      {result.outcome === "near-miss"
        ? "Two of three — pull again to chase it."
        : "House keeps it. Pull again."}
    </p>
  );
}

function ctaLabel(phase: Phase, result: SpinResult | null): string {
  if (phase === "idle") return "Pull the lever";
  if (phase === "spinning") return "Spinning…";
  if (!result) return "Pull again";
  if (result.outcome === "jackpot")
    return `Claim $${result.prizeUsd.toLocaleString("en-US")}`;
  if (result.outcome === "near-miss") return "So close. Pull again.";
  return "Pull again";
}

/* ------------------------------------------------------------------ */
/*  Reel — a single column of scrolling symbols                        */
/* ------------------------------------------------------------------ */

function Reel({
  target,
  duration,
  enabled,
  highlight,
}: {
  target: CasinoSymbol;
  duration: number;
  enabled: boolean;
  highlight: boolean;
}) {
  // Strip is generated once per reel mount (parent passes a fresh
  // key per spin so this remounts). Lazy state initializer is the
  // sanctioned escape hatch for one-shot impure computation —
  // useMemo would trip the no-Math.random-in-render rule even
  // though semantically it's the same thing here.
  const [strip] = useState<CasinoSymbol[]>(() => {
    const out: CasinoSymbol[] = [];
    for (let i = 0; i < STRIP_LENGTH - 1; i++) {
      out.push(
        CASINO_SYMBOLS[Math.floor(Math.random() * CASINO_SYMBOLS.length)],
      );
    }
    // Drop the target in 2-3 spots mid-strip so it's visible while
    // spinning, before the final land.
    out[Math.floor(STRIP_LENGTH * 0.35)] = target;
    out[Math.floor(STRIP_LENGTH * 0.7)] = target;
    out[STRIP_LENGTH - 1] = target;
    return out;
  });

  // The reel window shows ONE cell. We want the target (last cell)
  // centered. So the strip needs to slide up by (STRIP_LENGTH - 1)
  // cells worth of height.
  const finalOffset = -(STRIP_LENGTH - 1) * CELL_HEIGHT;

  // Two-phase animation:
  //   1) initial render: offset 0, no transition
  //   2) next frame: offset = finalOffset, with transition
  // This works because enabled flips true the same render the
  // component first mounts (parent sets phase to "spinning" then
  // re-keys). We start at 0 and let the transition take over via a
  // useEffect that flips a local flag on the next frame.
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const id = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(id);
  }, [enabled]);

  const offset = animated ? finalOffset : 0;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-black/60 ring-1 ring-inset transition-[box-shadow,ring-color] duration-500",
        highlight
          ? "ring-primary/60 shadow-[0_0_24px_-2px_color-mix(in_oklch,var(--primary)_45%,transparent)]"
          : "ring-white/[0.06]",
      )}
      style={{ height: CELL_HEIGHT, width: REEL_WIDTH }}
    >
      <div
        className="flex flex-col items-center"
        style={{
          transform: `translateY(${offset}px)`,
          transition: animated
            ? `transform ${duration}ms ${EASE}`
            : "none",
        }}
      >
        {strip.map((sym, i) => (
          <ReelCell key={i} symbol={sym} />
        ))}
      </div>
      {/* Top + bottom fade so cells feel set into the housing. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-black/80 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-black/80 to-transparent"
      />
    </div>
  );
}

function ReelCell({ symbol }: { symbol: CasinoSymbol }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ height: CELL_HEIGHT, width: REEL_WIDTH }}
    >
      <img
        src={symbol.src}
        alt={symbol.label}
        width={64}
        height={64}
        className="size-[68px] object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
      />
    </div>
  );
}
