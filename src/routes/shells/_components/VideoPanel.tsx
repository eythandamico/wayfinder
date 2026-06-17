"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Star,
  Video,
  VideoOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "wf-shells-v3-companion-activated";

/**
 * Promo video panel above the ChatPanel in the right column.
 * Plays muted + looped, only while in viewport.
 *
 * v2: starts grayscale + dimmed behind a Pro paywall. The lockup is a
 * three-element stack (lock chip / title / CTA) on a radial vignette
 * with a warm gold spotlight pooling toward the button. Clicking
 * "Activate" reveals the colored video and persists to localStorage.
 */
export function VideoPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activated, setActivated] = useState(false);
  // "Activated" unlocks the companion (paywall cleared). "In call" is a
  // separate ephemeral state — the user has to tap the green Start-call
  // button to actually begin the session. End-call brings them back to
  // the Start-call screen, not the paywall.
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);

  // Note: v3 intentionally does NOT hydrate activation from
  // localStorage — the companion always starts locked so the demo
  // can drive the unlock moment from the paywall every time. The
  // STORAGE_KEY is still written on activate() so other surfaces
  // could read it within the same session if needed.

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0 },
    );
    observer.observe(video);

    const onVisibility = () => {
      if (document.hidden) video.pause();
      else void video.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const activate = () => {
    setActivated(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
  };

  const startCall = () => setInCall(true);
  const endCall = () => {
    setInCall(false);
    setMuted(false);
    setCameraOn(true);
  };

  return (
    <div className="relative h-full overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
        className={cn(
          "h-full w-full object-cover transition-[filter] duration-700 ease-out",
          activated
            ? "grayscale-0 brightness-100"
            : "grayscale brightness-[0.55]",
        )}
      >
        <source src="/media/wayfinder-promo.mp4" type="video/mp4" />
      </video>

      {/* Paywall overlay */}
      <div
        aria-hidden={activated}
        className={cn(
          "absolute inset-0 transition-opacity duration-500 ease-out",
          activated ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        {/* Vignette — slightly heavier in the middle so the centered
            lockup stays legible against any frame of the underlying
            video. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 70% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.55) 100%)",
          }}
        />

        {/* Shimmer sweep across the whole overlay — diagonal pale
            highlight that loops every 3s. The paywall wrapper already
            has overflow-hidden so the band stays clipped to the
            panel rect. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-shimmer"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
          }}
        />

        {/* Lockup — centered, matches the app's heading + primary
            CTA conventions. */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-5 text-center">
          <div className="flex flex-col items-center gap-1">
            <h3 className="font-heading text-balance text-title font-semibold leading-tight text-foreground">
              Unlock your Pro.
            </h3>
            <p className="text-balance text-body text-muted-foreground">
              Reads tape with you. Watches funding while you sleep.
            </p>
          </div>

          <button
            type="button"
            onClick={activate}
            disabled={activated}
            aria-label="Take the call (Wayfinder Pro)"
            data-demo="companion-activate"
            className="group/cta relative inline-flex h-9 items-center gap-1.5 overflow-hidden rounded-md bg-primary px-3.5 text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.96]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-white/40 to-transparent"
            />
            <span className="relative">Take the call</span>
          </button>
        </div>
      </div>

      {/* Pre-call screen — visible after activation but before the user
          taps the green Start-call button. */}
      {activated && !inCall && (
        <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center">
          <button
            type="button"
            aria-label="Start call with companion"
            onClick={startCall}
            className="relative inline-flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground ring-1 ring-inset ring-white/20 shadow-[0_12px_28px_-8px_color-mix(in_oklch,var(--primary)_70%,transparent)] transition-[background-color,scale] duration-150 ease-out hover:brightness-110 active:scale-[0.96]"
          >
            <span
              aria-hidden
              className="absolute -inset-2 rounded-full animate-pulse-soft"
              style={{
                background:
                  "radial-gradient(60% 60% at 50% 50%, color-mix(in oklch, var(--primary) 60%, transparent) 0%, transparent 70%)",
                filter: "blur(8px)",
              }}
            />
            <Phone strokeWidth={2} className="relative size-4" aria-hidden />
          </button>
        </div>
      )}

      {/* In-call HUD — level chip (top left), usage chip (top right),
          call controls (bottom). */}
      {activated && inCall && (
        <>
          <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full bg-black/70 py-1.5 pl-2 pr-3 backdrop-blur-md ring-1 ring-inset ring-white/[0.10] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)]">
            <span
              aria-hidden
              className="relative inline-flex size-5 items-center justify-center rounded-full"
              style={{
                background:
                  "radial-gradient(70% 70% at 50% 50%, color-mix(in oklch, var(--wf-pro-gold) 80%, transparent) 0%, color-mix(in oklch, var(--wf-pro-gold) 35%, transparent) 70%, transparent 100%)",
              }}
            >
              <Star
                strokeWidth={2}
                fill="var(--wf-pro-indigo)"
                className="size-3"
                style={{ color: "var(--wf-pro-indigo)" }}
                aria-hidden
              />
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-micro uppercase tracking-wider text-white/65">
                Lv
              </span>
              <span className="text-caption font-semibold text-white tabular-nums">
                12
              </span>
              <span
                aria-hidden
                className="relative h-1 w-10 overflow-hidden rounded-full bg-surface-4"
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: "47%",
                    background: "var(--wf-pro-gold)",
                    boxShadow:
                      "0 0 6px color-mix(in oklch, var(--wf-pro-gold) 70%, transparent)",
                  }}
                />
              </span>
            </div>
          </div>

          <div className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 backdrop-blur-md ring-1 ring-inset ring-white/[0.10] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.6)]">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)] animate-pulse-soft"
            />
            <span className="text-caption font-semibold text-white tabular-nums">
              12.4K
            </span>
            <span className="text-caption text-white/55">/</span>
            <span className="text-caption text-white/80 tabular-nums">
              100K
            </span>
            <span className="ml-0.5 text-micro uppercase tracking-wider text-white/65">
              tokens
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-2">
            <CallButton
              label={muted ? "Unmute" : "Mute"}
              active={!muted}
              onClick={() => setMuted((v) => !v)}
            >
              {muted ? (
                <MicOff strokeWidth={1.75} className="size-4" aria-hidden />
              ) : (
                <Mic strokeWidth={1.75} className="size-4" aria-hidden />
              )}
            </CallButton>
            <CallButton
              label={cameraOn ? "Hide camera" : "Show camera"}
              active={cameraOn}
              onClick={() => setCameraOn((v) => !v)}
            >
              {cameraOn ? (
                <Video strokeWidth={1.75} className="size-4" aria-hidden />
              ) : (
                <VideoOff strokeWidth={1.75} className="size-4" aria-hidden />
              )}
            </CallButton>
            <CallButton label="End call" tone="danger" onClick={endCall}>
              <PhoneOff strokeWidth={2} className="size-4" aria-hidden />
            </CallButton>
          </div>
        </>
      )}
    </div>
  );
}

function CallButton({
  children,
  label,
  active = true,
  tone,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  tone?: "danger";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex size-11 items-center justify-center rounded-full backdrop-blur-md ring-1 ring-inset transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
        tone === "danger"
          ? "bg-tone-down text-background ring-white/20 shadow-[0_12px_28px_-8px_color-mix(in_oklch,var(--tone-down)_70%,transparent)] hover:brightness-110"
          : active
            ? "bg-black/70 text-white ring-white/[0.10] shadow-[0_10px_24px_-8px_rgba(0,0,0,0.7)] hover:bg-black/85"
            : "bg-white/25 text-foreground ring-white/[0.10] shadow-[0_10px_24px_-8px_rgba(0,0,0,0.7)] hover:bg-white/35",
      )}
    >
      {children}
    </button>
  );
}
