"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  Activity,
  Eye,
  Loader2,
  MoreVertical,
  Route,
  TrendingUp,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { PageSection, SectionHeader, StackCard } from "@/components/ds";
import { cn } from "@/lib/utils";

/* Shared iso treatment — perspective on the stage, rotateX/Z on the pane.
 * Animations on pane children compose cleanly (iso rotation lives on the
 * pane only). overflow-hidden on the art container clips edges. */
const ISO_STAGE: React.CSSProperties = {
  perspective: "1400px",
  perspectiveOrigin: "50% 30%",
  transformStyle: "preserve-3d",
};
const ISO_PANE: React.CSSProperties = {
  transform: "rotateX(22deg) rotateZ(-14deg)",
  transformStyle: "preserve-3d",
};

gsap.registerPlugin(useGSAP, ScrollTrigger);

export { SectionHeader };

type CardItem = {
  href: string;
  accent: "mint" | "amber" | "sky" | "violet";
  eyebrow: string;
  title: string;
  visual: ReactNode;
  footerIcon: ReactNode;
  footerText: string;
};

const cards: CardItem[] = [
  {
    href: "/shells",
    accent: "mint",
    eyebrow: "Agent-native",
    title: "Research, plan, and trade — in plain English.",
    visual: <ChatArt />,
    footerIcon: (
      <span aria-hidden className="font-mono text-[11px] text-primary">
        &gt;_
      </span>
    ),
    footerText: "Kimi K2.5 · K2 Thinking",
  },
  {
    href: "/shells",
    accent: "amber",
    eyebrow: "Every venue",
    title: "Perps, spot, onchain, prediction markets — one interface.",
    visual: <VenueArt />,
    footerIcon: (
      <span
        aria-hidden
        className="size-2 rounded-full bg-[var(--wf-accent-amber)]"
      />
    ),
    footerText: "HL · Onchain · Polymarket",
  },
  {
    href: "/shells",
    accent: "sky",
    eyebrow: "Unified portfolio",
    title: "Every position, every wallet, one view.",
    visual: <PortfolioArt />,
    footerIcon: <WalletGlyph />,
    footerText: "Multi-wallet · Multi-chain",
  },
  {
    href: "/paths",
    accent: "violet",
    eyebrow: "Strategy paths",
    title: "Install community-built strategies, let them run.",
    visual: <PathsArt />,
    footerIcon: <PathsGlyph />,
    footerText: "Catalog · SDK",
  },
];

export function Features() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(
    () => {
      const isDesktop =
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 768px)").matches;
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!isDesktop || reduce) return;

      const container = containerRef.current;
      const els = cardRefs.current.filter(
        (el): el is HTMLDivElement => Boolean(el),
      );
      if (!container || els.length < 2) return;

      const N = els.length;

      els.forEach((el, i) => {
        gsap.set(el, {
          y: i === 0 ? 0 : "100vh",
          scale: 1,
          filter: "blur(0px)",
          zIndex: i,
          force3D: true,
        });
      });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: container,
          start: "top top+=5rem",
          end: "bottom bottom",
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      const step = 1 / (N - 1);
      for (let i = 0; i < N - 1; i++) {
        const pos = i * step;

        // next card enters from below
        tl.to(els[i + 1], { y: 0, duration: step, ease: "none" }, pos);

        // every already-visible card pushes one level deeper
        for (let j = 0; j <= i; j++) {
          const depth = i - j; // 0 = just-receded, larger = deeper in stack
          tl.to(
            els[j],
            {
              scale: 0.94 - depth * 0.05,
              y: `${-(2 + depth * 2)}vh`,
              filter: `blur(${6 + depth * 2}px)`,
              duration: step,
              ease: "none",
            },
            pos,
          );
        }
      }
    },
    { scope: containerRef, dependencies: [] },
  );

  // Recompute ScrollTrigger positions after layout settles, on bfcache restore,
  // and after any late-loading content (fonts/images) would change heights.
  // Without this, back-navigation lands with stale start/end positions and the
  // timeline stays stuck at progress 0 (first card).
  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh(true);

    const raf = requestAnimationFrame(refresh);
    const t1 = window.setTimeout(refresh, 120);
    const t2 = window.setTimeout(refresh, 500);

    const onPageShow = () => {
      requestAnimationFrame(() => {
        refresh();
        requestAnimationFrame(refresh);
      });
    };
    window.addEventListener("pageshow", onPageShow);

    if (document.readyState !== "complete") {
      window.addEventListener("load", refresh, { once: true });
    }

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return (
    <PageSection>
      {/* Mobile + reduced-motion: header on top, normal vertical stack */}
      <div className="motion-safe:md:hidden">
        <SectionHeader align="center" title="Four ways Shells works for you." />
        <div className="mx-auto mt-16 flex w-full max-w-2xl flex-col gap-12">
          {cards.map((card) => (
            <StackCard key={card.eyebrow} {...card} />
          ))}
        </div>
      </div>

      {/* Desktop + motion-safe: header pinned with scroll-stack */}
      <div
        ref={containerRef}
        className="relative hidden motion-safe:md:block"
        style={{ height: "320vh" }}
      >
        <div className="sticky top-20 flex h-[calc(100vh-5rem)] flex-col overflow-hidden pt-8">
          <SectionHeader align="center" title="Four ways Shells works for you." />
          <div className="relative flex flex-1 items-center justify-center">
            <div className="relative aspect-[2/1] w-[min(92vw,1200px)] max-h-[62vh]">
              {cards.map((card, i) => (
                <div
                  key={card.eyebrow}
                  ref={(el) => {
                    cardRefs.current[i] = el;
                  }}
                  className="absolute inset-0"
                  style={{
                    transform: i === 0 ? undefined : "translateY(100vh)",
                    zIndex: i,
                  }}
                >
                  <StackCard {...card} layout="wide" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageSection>
  );
}

/* ------------------------------------------------------------------ */
/*  Card artwork — co-located with the section that owns them          */
/* ------------------------------------------------------------------ */

function ChatArt() {
  // Looping ellipsis on the agent's "thinking" line — feels alive without
  // animating layout properties.
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setDots((d) => (d + 1) % 4), 380);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-muted">
      <Aurora tone="mint" />

      <div
        style={ISO_STAGE}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          style={ISO_PANE}
          className="w-[78%] max-w-[420px] overflow-hidden rounded-2xl bg-background ring-1 ring-white/[0.08] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]"
        >
          {/* Tabs strip */}
          <div className="flex items-stretch border-b border-white/5">
            <span className="relative px-3 py-2 text-[11px] font-medium text-foreground">
              Agent <span className="ml-1 text-muted-foreground">3</span>
              <span
                aria-hidden
                className="absolute inset-x-2 bottom-0 h-px bg-foreground"
              />
            </span>
            <span className="px-3 py-2 text-[11px] font-medium text-muted-foreground">
              Paths <span className="ml-1">10</span>
            </span>
            <span className="px-3 py-2 text-[11px] font-medium text-muted-foreground">
              Jobs <span className="ml-1">5</span>
            </span>
          </div>

          {/* Body */}
          <div className="space-y-3 px-3.5 py-3.5">
            <div className="ml-auto max-w-[78%] rounded-2xl bg-white/[0.06] px-3 py-1.5 text-[11.5px]">
              Hedge my BTC longs with funding capture
            </div>
            <div className="space-y-1">
              <div className="text-[11.5px] leading-relaxed text-foreground/90">
                Short 0.4 BTC on HL Perps (funding +0.008%/h) against your
                spot. Net exposure flat, ~$19/day in funding{".".repeat(dots)}
              </div>
              <span className="text-[9.5px] text-muted-foreground">
                kimi-k2.5 · 3.2s · 284 tokens
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
              <Loader2
                aria-hidden
                strokeWidth={1.75}
                className="size-3 animate-spin text-primary"
                style={{ animationDuration: "900ms" }}
              />
              thinking
            </div>
          </div>

          {/* Composer preview */}
          <div className="border-t border-white/5 p-2.5">
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-1.5 text-[10.5px] text-muted-foreground">
              <span className="flex-1 truncate">
                Plan, Build, / for commands…
              </span>
              <span className="inline-flex items-center gap-1 text-foreground/80">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)] animate-pulse-soft"
                />
                Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VenueArt() {
  const rows = [
    {
      sym: "BTC-USDC",
      venue: "HL Perps",
      basePrice: 75739.5,
      icon: "₿",
      bg: "#f7931a",
      fg: "#000",
    },
    {
      sym: "ETH-USDC",
      venue: "HL Spot",
      basePrice: 2310.9,
      icon: "Ξ",
      bg: "#627eea",
      fg: "#fff",
    },
    {
      sym: "SOL/USDC",
      venue: "Onchain",
      basePrice: 85.36,
      icon: "S",
      bg: "#9945ff",
      fg: "#fff",
    },
    {
      sym: "Trump 2028",
      venue: "Polymarket",
      basePrice: 0.52,
      icon: "◆",
      bg: "#2f78c4",
      fg: "#fff",
    },
  ];

  // Pseudo-live prices: each row drifts on its own clock so the cards aren't
  // all flickering in sync.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-muted">
      <Aurora tone="amber" />

      <div
        style={ISO_STAGE}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div style={ISO_PANE} className="flex flex-col gap-2.5">
          {rows.map((r, i) => {
            // simple deterministic-ish price wobble
            const seed = (tick + i * 7) * 0.31;
            const drift = Math.sin(seed) * 0.018; // ±1.8%
            const price = r.basePrice * (1 + drift);
            const up = drift >= 0;
            return (
              <div
                key={r.sym}
                className="flex w-[300px] items-center gap-2.5 rounded-xl bg-background px-3 py-2.5 ring-1 ring-white/[0.08] shadow-[0_14px_28px_-16px_rgba(0,0,0,0.7)] animate-float-slow"
                style={{
                  animationDelay: `${i * 0.4}s`,
                  transform: `translateZ(${(rows.length - i) * 6}px)`,
                }}
              >
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ backgroundColor: r.bg, color: r.fg }}
                >
                  {r.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold leading-tight">
                    {r.sym}
                  </div>
                  <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">
                    {r.venue}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11.5px] tabular-nums">
                    {r.basePrice >= 100
                      ? `$${price.toLocaleString("en-US", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 1,
                        })}`
                      : `$${price.toFixed(2)}`}
                  </div>
                  <div
                    className={cn(
                      "text-[9.5px] tabular-nums",
                      up ? "text-primary" : "text-tone-down",
                    )}
                  >
                    {up ? "+" : ""}
                    {(drift * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PortfolioArt() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-muted">
      <Aurora tone="sky" />

      <div
        style={ISO_STAGE}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div
          style={ISO_PANE}
          className="w-[80%] max-w-[440px] overflow-hidden rounded-2xl bg-background ring-1 ring-white/[0.08] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]"
        >
          {/* Account header */}
          <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-5 rounded-full"
                style={{
                  background:
                    "conic-gradient(from 140deg at 50% 50%, #6ed7c8, #5a8de0, #c47fdb, #6ed7c8)",
                }}
              />
              <span className="text-[11px] font-medium">warm-seeking-fox</span>
            </span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Eye strokeWidth={1.5} className="size-3.5" aria-hidden />
              <MoreVertical strokeWidth={1.5} className="size-3.5" aria-hidden />
            </div>
          </div>

          {/* Hero */}
          <div className="flex items-start justify-between gap-3 px-3 pt-3">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[24px] font-semibold leading-none tabular-nums">
                $42,318.52
              </span>
              <span className="inline-flex items-baseline gap-1.5 text-[10.5px] tabular-nums text-primary">
                <span aria-hidden>▲</span>+$1,204.88 (2.93%)
                <span className="text-muted-foreground">today</span>
              </span>
            </div>
            <span className="rounded-md bg-white/[0.08] px-2.5 py-1 text-[10.5px] font-medium">
              Deposit
            </span>
          </div>

          {/* Sparkline */}
          <div className="px-3 pb-3 pt-3">
            <PortfolioArtSparkline />
          </div>
        </div>
      </div>
    </div>
  );
}

function PortfolioArtSparkline() {
  const data = [
    9.1, 9.4, 9.0, 9.6, 10.2, 10.5, 10.1, 11.0, 11.4, 11.0, 11.8, 12.4, 12.1,
    12.9, 13.6, 13.3, 14.1, 14.8, 15.4, 15.1, 16.2, 17.0, 17.6, 17.3, 18.4,
    19.2, 19.9, 19.5, 20.5, 21.4, 22.1, 21.8, 23.0, 24.0, 24.6, 25.2,
  ];
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const W = 100;
  const H = 32;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const last = data[data.length - 1];
  const lastYPct = (1 - (last - min) / range) * 100;

  return (
    <div className="relative h-12 w-full text-primary">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        aria-hidden
        className="h-full w-full"
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="animate-spark-trail"
        />
      </svg>
      <span
        aria-hidden
        className="pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current animate-pulse-soft shadow-[0_0_0_4px_color-mix(in_oklch,currentColor_25%,transparent)]"
        style={{ left: "100%", top: `${lastYPct}%` }}
      />
    </div>
  );
}

function PathsArt() {
  const paths: Array<{
    name: string;
    author: string;
    stars: string;
    installs: string;
    tone: "mint" | "violet" | "sky" | "amber";
    icon: LucideIcon;
  }> = [
    {
      name: "Delta-Neutral LP",
      author: "@lunar",
      stars: "4.8",
      installs: "3.2K",
      tone: "mint",
      icon: TrendingUp,
    },
    {
      name: "BTC Funding Capture",
      author: "@mercury",
      stars: "4.6",
      installs: "2.1K",
      tone: "violet",
      icon: Zap,
    },
    {
      name: "SOL Momentum Rotation",
      author: "@orbit",
      stars: "4.4",
      installs: "1.8K",
      tone: "sky",
      icon: Activity,
    },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden bg-muted">
      <Aurora tone="violet" />

      <div
        style={ISO_STAGE}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div style={ISO_PANE} className="flex flex-col gap-3">
          {paths.map((p, i) => {
            const Icon = p.icon;
            return (
              <div
                key={p.name}
                className="w-[300px] overflow-hidden rounded-2xl bg-background ring-1 ring-white/[0.08] shadow-[0_18px_36px_-20px_rgba(0,0,0,0.7)] animate-float-slow"
                style={{
                  animationDelay: `${i * 0.5}s`,
                  transform: `translateZ(${(paths.length - i) * 8}px)`,
                }}
              >
                {/* Procedural header — kind tint + glyph, mirrors PathCard */}
                <div
                  aria-hidden
                  className={cn(
                    "relative h-12 overflow-hidden border-b border-white/[0.04]",
                    TONE_BG[p.tone],
                  )}
                >
                  <Icon
                    strokeWidth={1.25}
                    className={cn(
                      "absolute -bottom-2 -right-2 size-12 opacity-30",
                      TONE_FG[p.tone],
                    )}
                  />
                </div>
                <div className="flex items-center gap-2.5 px-3 py-2">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[12px] font-semibold leading-tight">
                      {p.name}
                    </span>
                    <span className="text-[9.5px] text-muted-foreground">
                      {p.author} · ★ {p.stars} · {p.installs}
                    </span>
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded-md bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary ring-1 ring-inset ring-primary/20">
                    Install
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const TONE_BG: Record<"mint" | "violet" | "sky" | "amber", string> = {
  mint: "bg-[var(--wf-accent-mint-soft)]",
  violet: "bg-[var(--wf-accent-violet-soft)]",
  sky: "bg-[var(--wf-accent-sky-soft)]",
  amber: "bg-[var(--wf-accent-amber-soft)]",
};
const TONE_FG: Record<"mint" | "violet" | "sky" | "amber", string> = {
  mint: "text-[var(--wf-accent-mint)]",
  violet: "text-[var(--wf-accent-violet)]",
  sky: "text-[var(--wf-accent-sky)]",
  amber: "text-[var(--wf-accent-amber)]",
};

/* Shared aurora glow used behind every iso scene. */
function Aurora({ tone }: { tone: "mint" | "amber" | "sky" | "violet" }) {
  const color: Record<typeof tone, string> = {
    mint: "var(--primary)",
    amber: "var(--wf-accent-amber)",
    sky: "var(--wf-accent-sky)",
    violet: "var(--wf-accent-violet)",
  };
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-10"
      style={{
        background: `radial-gradient(55% 55% at 50% 50%, color-mix(in oklch, ${color[tone]} 28%, transparent) 0%, transparent 70%)`,
        filter: "blur(50px)",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Footer glyphs                                                       */
/* ------------------------------------------------------------------ */

function WalletGlyph() {
  return (
    <Wallet
      strokeWidth={1.6}
      className="size-3.5 text-[var(--wf-accent-sky)]"
      aria-hidden
    />
  );
}

function PathsGlyph() {
  return (
    <Route
      strokeWidth={1.6}
      className="size-3.5 text-[var(--wf-accent-violet)]"
      aria-hidden
    />
  );
}
