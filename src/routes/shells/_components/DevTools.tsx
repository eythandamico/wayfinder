"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Coins,
  Dices,
  Play,
  Radio,
  RotateCw,
  Sparkles,
  Square,
  Wrench,
  X,
} from "lucide-react";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { cn } from "@/lib/utils";
import { CASINO_OPEN_EVENT } from "../_lib/casino";
import { AGENT_POL_FIRE_EVENT } from "./AgentProofOfLife";
import { OPEN_MORNING_BRIEF_EVENT } from "../_lib/morning-brief";
import {
  DEMO_PLAY_EVENT,
  DEMO_STOP_EVENT,
  type DemoPlayDetail,
} from "../_lib/demo";
import { DEMO_SCRIPTS } from "../_lib/demo-scripts";
import {
  DOPAMINE_ANIMATIONS,
  triggerDopamine,
  type DopamineId,
} from "../_lib/dopamine";
import {
  getForceFirstRunProfile,
  getForceThinkingGlow,
  setForceFirstRunProfile,
  setForceThinkingGlow,
} from "../_lib/dev-flags";
import type { OpenerProfile } from "../_lib/opener";
import { usePlan } from "../_state/plan-context";

const KEYS: { key: string; label: string }[] = [
  { key: "wf-shells-v3-density", label: "Density" },
  { key: "wf-shells-v3-view-v1", label: "View mode" },
  { key: "wf-shells-v3-layout-tree-v1", label: "Panel layout" },
  { key: "wf-shells-v3-saved-layouts-v1", label: "Saved layouts" },
  { key: "wf-shells-v3-companion-activated", label: "Companion activation" },
  { key: "wf-shells-v3-mobile-companion-pos", label: "Mobile companion position" },
  { key: "wayfinder:pro-banner-dismissed-v2", label: "Upgrade banner" },
];

/**
 * Dev-only floating action button for /shells.
 *
 * Sits in the bottom-left next to the Next.js dev indicator and exposes
 * one-click resets for the localStorage keys that drive sticky UI state
 * (density, view mode, panel layout, saved layouts) plus the dopamine
 * webm triggers. Tree-shaken in production via the NODE_ENV guard.
 */
export function DevTools() {
  // Always available in dev. On production, gated behind `?dev=1` (sticky
  // for the session via sessionStorage so the flag survives navigation).
  const [allowed, setAllowed] = useState(
    import.meta.env.MODE !== "production",
  );

  useEffect(() => {
    if (import.meta.env.MODE !== "production") return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("dev") === "1") {
        window.sessionStorage.setItem("wf-shells-v3-dev", "1");
        setAllowed(true);
      } else if (window.sessionStorage.getItem("wf-shells-v3-dev") === "1") {
        setAllowed(true);
      }
    } catch {
      // sessionStorage blocked — fall back to query-param-only
      const params = new URLSearchParams(window.location.search);
      if (params.get("dev") === "1") setAllowed(true);
    }
  }, []);

  if (!allowed) return null;
  return <DevToolsInner />;
}

function DevToolsInner() {
  const [open, setOpen] = useState(false);
  const [confirmedLabel, setConfirmedLabel] = useState<string | null>(null);
  // When on, the next Play press also prompts for screen capture and
  // downloads the recording when the demo completes.
  const [recordOnPlay, setRecordOnPlay] = useState(false);
  // Hold the ThinkingGlow on permanently for design iteration.
  // Reads / writes via the dev-flags helper so subscribers (the
  // chat panel) update live. Lazy-init from storage.
  const [forceGlow, setForceGlowLocal] = useState(() =>
    typeof window === "undefined" ? false : getForceThinkingGlow(),
  );
  // Force a specific first-run profile for the opener so the three
  // variants (active / funded / fresh) are reachable from a single
  // browser without rewriting POSITIONS. `null` = use real detection.
  const [forceProfile, setForceProfileLocal] = useState<OpenerProfile | null>(
    () =>
      typeof window === "undefined" ? null : getForceFirstRunProfile(),
  );
  // Plan toggle — flips free <-> pro for design iteration. Reads /
  // writes the canonical plan-context so every gate sees the change
  // live. No localStorage poke here; the context handles persistence.
  const { plan, setPlan, openPricing } = usePlan();
  // Hidden while a recording is in progress so the captured video
  // doesn't include the wrench button. DemoOverlay dispatches the
  // wf:devtools:hide event with { hidden } around its recording
  // lifecycle.
  const [hidden, setHidden] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useClickOutside(rootRef, () => setOpen(false), open);

  useEffect(() => {
    const onHide = (e: Event) => {
      const detail = (e as CustomEvent<{ hidden: boolean }>).detail;
      setHidden(!!detail?.hidden);
      if (detail?.hidden) setOpen(false);
    };
    window.addEventListener("wf:devtools:hide", onHide as EventListener);
    return () =>
      window.removeEventListener("wf:devtools:hide", onHide as EventListener);
  }, []);

  const playDemo = (scriptId: string) => {
    const detail: DemoPlayDetail = { scriptId, record: recordOnPlay };
    window.dispatchEvent(
      new CustomEvent<DemoPlayDetail>(DEMO_PLAY_EVENT, { detail }),
    );
    setOpen(false);
  };

  const stopDemo = () => {
    window.dispatchEvent(new Event(DEMO_STOP_EVENT));
  };

  const flashConfirm = (label: string) => {
    setConfirmedLabel(label);
    window.setTimeout(() => setConfirmedLabel(null), 1400);
  };

  const reset = (key: string, label: string) => {
    try {
      window.localStorage.removeItem(key);
      flashConfirm(label);
    } catch {
      // storage unavailable, ignore
    }
  };

  const resetAll = () => {
    try {
      KEYS.forEach(({ key }) => window.localStorage.removeItem(key));
      flashConfirm("All keys");
    } catch {
      // ignore
    }
  };

  const reload = () => window.location.reload();

  if (hidden) return null;

  return (
    <div
      ref={rootRef}
      className="fixed left-4 top-1/2 z-50 -translate-y-1/2"
    >
      {open && (
        <div className="absolute left-11 top-1/2 max-h-[70vh] w-64 -translate-y-1/2 overflow-y-auto rounded-xl bg-card backdrop-blur-md p-1.5 ring-1 ring-white/[0.10] shadow-2xl animate-in fade-in slide-in-from-left-1 duration-150">
          <div className="flex items-center justify-between px-3 py-2 text-micro uppercase tracking-[0.18em] text-muted-foreground">
            <span>Dev tools</span>
            <span className="text-muted-foreground/60">/shells</span>
          </div>

          {/* Casino — opens the slot-spin modal. Always-on entry,
              no records / state, just for the dopamine moment. */}
          <div className="px-3 pb-1 pt-1 text-micro uppercase tracking-[0.18em] text-muted-foreground/70">
            Casino
          </div>
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event(CASINO_OPEN_EVENT));
                setOpen(false);
              }}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-caption text-muted-foreground transition-colors duration-150 ease-out hover:bg-surface-1 hover:text-foreground"
            >
              <Coins strokeWidth={1.75} className="size-3.5" aria-hidden />
              Free Pull
            </button>
          </div>

          <div className="my-1 h-px bg-surface-2" aria-hidden />

          {/* Chat — design helpers for the agent chat surface. */}
          <div className="px-3 pb-1 pt-1 text-micro uppercase tracking-[0.18em] text-muted-foreground/70">
            Chat
          </div>
          <label className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-caption text-muted-foreground transition-colors duration-150 ease-out hover:bg-surface-1 hover:text-foreground">
            <span className="inline-flex items-center gap-2">
              <Sparkles strokeWidth={1.75} className="size-3.5" aria-hidden />
              Hold thinking glow
            </span>
            <input
              type="checkbox"
              checked={forceGlow}
              onChange={(e) => {
                setForceGlowLocal(e.target.checked);
                setForceThinkingGlow(e.target.checked);
              }}
              className="accent-primary"
            />
          </label>

          {/* Force first-run profile — flips the opener between its
              active / funded / fresh variants. "Off" = use real
              detection (POSITIONS + balance). Changing this resets
              ChatPanel's fired-openers set so the new variant fires
              immediately on the next session render. */}
          <div className="px-3 pt-2 pb-1 text-micro uppercase tracking-[0.16em] text-muted-foreground/60">
            First-run profile
          </div>
          <div className="px-3 pb-2">
            <div className="grid grid-cols-4 gap-1">
              {(
                [
                  { value: null, label: "Off" },
                  { value: "active", label: "Active" },
                  { value: "funded", label: "Funded" },
                  { value: "fresh", label: "Fresh" },
                ] as const
              ).map((opt) => {
                const active = forceProfile === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setForceProfileLocal(opt.value);
                      setForceFirstRunProfile(opt.value);
                    }}
                    className={cn(
                      "rounded-md px-2 py-1 text-caption transition-colors",
                      active
                        ? "bg-primary/15 text-primary ring-1 ring-inset ring-primary/20"
                        : "bg-surface-1 text-muted-foreground hover:bg-surface-3 hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="my-1 h-px bg-surface-2" aria-hidden />

          {/* Plan — flip free <-> pro for testing gates. Also a
              shortcut to open the PricingModal directly. */}
          <div className="px-3 pb-1 pt-1 text-micro uppercase tracking-[0.18em] text-muted-foreground/70">
            Plan
          </div>
          <div className="px-3 pb-2">
            <div className="grid grid-cols-2 gap-1">
              {(["free", "pro"] as const).map((p) => {
                const active = plan === p;
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPlan(p)}
                    className={cn(
                      "rounded-md px-2 py-1 text-caption capitalize transition-colors",
                      active
                        ? "bg-primary/15 text-primary ring-1 ring-inset ring-primary/20"
                        : "bg-surface-1 text-muted-foreground hover:bg-surface-3 hover:text-foreground",
                    )}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                openPricing("manual");
                setOpen(false);
              }}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-md bg-surface-1 px-2 py-1 text-caption text-muted-foreground transition-colors hover:bg-surface-3 hover:text-foreground"
            >
              Open pricing modal
            </button>
          </div>

          <div className="my-1 h-px bg-surface-2" aria-hidden />

          {/* Signals — agent proof-of-life trigger. Auto-fires once
              per browser ~90s in; this button bypasses the gate so
              the cascade is reachable on demand for design + demo. */}
          <div className="px-3 pb-1 pt-1 text-micro uppercase tracking-[0.18em] text-muted-foreground/70">
            Signals
          </div>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new Event(AGENT_POL_FIRE_EVENT));
              setOpen(false);
            }}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-caption text-muted-foreground transition-colors duration-150 ease-out hover:bg-surface-1 hover:text-foreground"
          >
            <Radio strokeWidth={1.75} className="size-3.5" aria-hidden />
            Fire agent signal
          </button>
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new Event(OPEN_MORNING_BRIEF_EVENT));
              setOpen(false);
            }}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-caption text-muted-foreground transition-colors duration-150 ease-out hover:bg-surface-1 hover:text-foreground"
          >
            <Sparkles strokeWidth={1.75} className="size-3.5" aria-hidden />
            Open morning brief
          </button>

          <div className="my-1 h-px bg-surface-2" aria-hidden />

          {/* Demo runner — plays scripted UI sequences with a fake
              cursor, optionally captures the run to a webm. */}
          <div className="px-3 pb-1 pt-1 text-micro uppercase tracking-[0.18em] text-muted-foreground/70">
            Demo
          </div>
          <div className="flex flex-col">
            <label className="flex items-center justify-between gap-2 rounded-md px-3 py-2 text-caption text-muted-foreground transition-colors duration-150 ease-out hover:bg-surface-1 hover:text-foreground">
              <span>Record on play</span>
              <input
                type="checkbox"
                checked={recordOnPlay}
                onChange={(e) => setRecordOnPlay(e.target.checked)}
                className="accent-primary"
              />
            </label>
            {Object.entries(DEMO_SCRIPTS).map(([id, entry]) => {
              const empty = entry.steps.length === 0;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => playDemo(id)}
                  disabled={empty}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-left text-caption transition-colors duration-150 ease-out",
                    empty
                      ? "text-muted-foreground/50 cursor-not-allowed"
                      : "text-muted-foreground hover:bg-surface-1 hover:text-foreground",
                  )}
                >
                  <Play strokeWidth={1.75} className="size-3.5" aria-hidden />
                  <span className="flex-1 truncate">{entry.label}</span>
                  {empty && (
                    <span className="text-micro text-muted-foreground/70">
                      empty
                    </span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={stopDemo}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-caption text-muted-foreground transition-colors duration-150 ease-out hover:bg-surface-1 hover:text-foreground"
            >
              <Square strokeWidth={1.75} className="size-3.5" aria-hidden />
              Stop
            </button>
          </div>

          <div className="my-1 h-px bg-surface-2" aria-hidden />

          {/* Dopamine triggers */}
          <div className="px-3 pb-1 pt-1 text-micro uppercase tracking-[0.18em] text-muted-foreground/70">
            Dopamine
          </div>
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => triggerDopamine("random")}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-caption text-muted-foreground transition-colors duration-150 ease-out hover:bg-surface-1 hover:text-foreground"
            >
              <Dices strokeWidth={1.75} className="size-3.5" aria-hidden />
              Random
            </button>
            {DOPAMINE_ANIMATIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => triggerDopamine(id as DopamineId)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-caption text-muted-foreground transition-colors duration-150 ease-out hover:bg-surface-1 hover:text-foreground"
              >
                <Sparkles
                  strokeWidth={1.5}
                  className="size-3 text-muted-foreground"
                  aria-hidden
                />
                {label}
              </button>
            ))}
          </div>

          <div className="my-1 h-px bg-surface-2" aria-hidden />

          {/* Reset section */}
          <div className="px-3 pb-1 pt-1 text-micro uppercase tracking-[0.18em] text-muted-foreground/70">
            Reset
          </div>
          <div className="flex flex-col">
            {KEYS.map(({ key, label }) => {
              const isConfirmed = confirmedLabel === label;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => reset(key, label)}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-caption transition-colors duration-150 ease-out",
                    isConfirmed
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-surface-1 hover:text-foreground",
                  )}
                >
                  <span>Reset {label.toLowerCase()}</span>
                  {isConfirmed && (
                    <Check strokeWidth={2} className="size-3.5" aria-hidden />
                  )}
                </button>
              );
            })}
          </div>

          <div className="my-1 h-px bg-surface-2" aria-hidden />

          <button
            type="button"
            onClick={resetAll}
            className={cn(
              "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-caption transition-colors duration-150 ease-out",
              confirmedLabel === "All keys"
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-surface-1 hover:text-foreground",
            )}
          >
            <span>Reset all</span>
            {confirmedLabel === "All keys" && (
              <Check strokeWidth={2} className="size-3.5" aria-hidden />
            )}
          </button>

          <button
            type="button"
            onClick={reload}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-caption text-muted-foreground transition-colors duration-150 ease-out hover:bg-surface-1 hover:text-foreground"
          >
            <RotateCw strokeWidth={1.75} className="size-3.5" aria-hidden />
            Reload page
          </button>
        </div>
      )}

      <button
        type="button"
        aria-label={open ? "Close dev tools" : "Open dev tools"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-9 items-center justify-center rounded-full bg-card backdrop-blur-md text-foreground ring-1 ring-inset ring-white/[0.10] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.7)] transition-[transform,background-color] duration-150 ease-out hover:bg-card/80 active:scale-[0.96]"
      >
        {open ? (
          <X strokeWidth={1.75} className="size-4" aria-hidden />
        ) : (
          <Wrench strokeWidth={1.75} className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
