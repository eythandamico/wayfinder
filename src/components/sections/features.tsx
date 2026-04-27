"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  Download,
  Eye,
  MoreVertical,
  Route,
  Star,
  Wallet,
  Zap,
} from "lucide-react";
import { PageSection, SectionHeader, StackCard } from "@/components/ds";
import { cn } from "@/lib/utils";

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

/* Edge-fade mask — crops the panel so it reads as a slice of a real screen. */
const FADE_MASK =
  "linear-gradient(180deg, transparent 0%, #000 16%, #000 84%, transparent 100%)";

function ChatArt() {
  // Real ChatPanel slice — tab strip + one message exchange + composer.
  return (
    <div className="absolute inset-0 overflow-hidden bg-muted">
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-[min(86%,440px)] overflow-hidden rounded-2xl bg-background ring-1 ring-white/[0.08] shadow-[0_30px_70px_-25px_rgba(0,0,0,0.7)]"
          style={{ maskImage: FADE_MASK, WebkitMaskImage: FADE_MASK }}
        >
          {/* Tab strip — mirrors ChatPanel */}
          <div className="flex items-center gap-1 px-2 pt-1">
            <span className="relative px-3 py-3 text-[12px] font-medium text-foreground">
              Agent <span className="ml-1 text-muted-foreground">3</span>
              <span
                aria-hidden
                className="absolute inset-x-2 bottom-0 h-px bg-foreground"
              />
            </span>
            <span className="px-3 py-3 text-[12px] font-medium text-muted-foreground">
              Paths <span className="ml-1">10</span>
            </span>
            <span className="px-3 py-3 text-[12px] font-medium text-muted-foreground">
              Jobs <span className="ml-1">5</span>
            </span>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-4 px-4 py-4">
            <div className="flex justify-end">
              <div className="max-w-[70%] rounded-2xl bg-white/[0.06] px-4 py-2 text-[12.5px] text-foreground">
                Hedge my BTC longs with funding capture
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="text-[12.5px] leading-relaxed text-foreground">
                Short 0.4 BTC on HL Perps (funding +0.008%/h) against your
                spot. Net exposure flat, ~$19/day in funding.
              </div>
              <span className="text-[10.5px] text-muted-foreground">
                kimi-k2.5 · 3.2s · 284 tokens
              </span>
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-white/5 px-3 py-2.5">
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-[11.5px] text-muted-foreground">
              <span className="flex-1">Plan, build, / for commands…</span>
              <span className="inline-flex items-center gap-1.5 text-foreground/80">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]"
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
  // Real CommandBar slice — filter chips row + token rows.
  const chips = [
    { label: "All", active: false },
    { label: "HL Perps", active: true },
    { label: "HL Spot", active: false },
    { label: "Onchain", active: false },
    { label: "Polymarket", active: false },
    { label: "Paths", active: false },
  ];
  const rows: Array<{
    sym: string;
    venue: string;
    lev?: string;
    price: string;
    change: string;
    up: boolean;
    icon: string;
    iconBg: string;
    iconFg?: string;
    selected?: boolean;
  }> = [
    { sym: "BTC-USDC", venue: "HL Perps", lev: "100x", price: "$75,739.50", change: "+1.42%", up: true, icon: "₿", iconBg: "#f7931a", iconFg: "#000", selected: true },
    { sym: "ETH-USDC", venue: "HL Perps", lev: "50x", price: "$2,310.90", change: "+0.18%", up: true, icon: "Ξ", iconBg: "#627eea" },
    { sym: "SOL-USDC", venue: "HL Perps", lev: "20x", price: "$85.36", change: "−0.65%", up: false, icon: "S", iconBg: "#9945ff" },
    { sym: "HYPE-USD", venue: "HL Perps", lev: "10x", price: "$24.18", change: "+2.04%", up: true, icon: "H", iconBg: "var(--primary)", iconFg: "#000" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden bg-muted">
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-[min(86%,460px)] overflow-hidden rounded-2xl bg-background ring-1 ring-white/[0.08] shadow-[0_30px_70px_-25px_rgba(0,0,0,0.7)]"
          style={{ maskImage: FADE_MASK, WebkitMaskImage: FADE_MASK }}
        >
          {/* Filter chips — mirrors CommandBar VenueChip */}
          <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-2">
            {chips.map((c) => (
              <span
                key={c.label}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-[10.5px]",
                  c.active
                    ? "bg-primary/15 text-primary"
                    : "bg-white/[0.04] text-muted-foreground",
                )}
              >
                {c.label}
              </span>
            ))}
          </div>

          {/* Token rows — mirrors CommandBar TokenRow */}
          <div>
            {rows.map((r) => (
              <div
                key={r.sym}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5",
                  r.selected ? "bg-white/[0.06]" : undefined,
                )}
              >
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                  style={{ background: r.iconBg, color: r.iconFg ?? "#fff" }}
                >
                  {r.icon}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium">{r.sym}</span>
                    {r.lev && (
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9.5px] text-muted-foreground">
                        {r.lev}
                      </span>
                    )}
                  </div>
                  <span className="text-[10.5px] text-muted-foreground">
                    {r.venue}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="text-[11.5px] tabular-nums">{r.price}</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 text-[10px] tabular-nums",
                      r.up ? "text-primary" : "text-tone-down",
                    )}
                  >
                    <span aria-hidden>{r.up ? "▲" : "▼"}</span>
                    {r.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PortfolioArt() {
  // Real PortfolioPanel slice — Connected pill + Eye/More + hero + sparkline +
  // grouped venue rows.
  const venues: Array<{
    glyph: string;
    name: string;
    count: number;
    value: string;
  }> = [
    { glyph: "HL", name: "Hyperliquid", count: 3, value: "$28,420.10" },
    { glyph: "Ξ", name: "Onchain · Base", count: 2, value: "$8,894.40" },
    { glyph: "◆", name: "Polymarket", count: 1, value: "$5,004.02" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden bg-muted">
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-[min(86%,440px)] overflow-hidden rounded-2xl bg-background ring-1 ring-white/[0.08] shadow-[0_30px_70px_-25px_rgba(0,0,0,0.7)]"
          style={{ maskImage: FADE_MASK, WebkitMaskImage: FADE_MASK }}
        >
          {/* Account header — Connected pill (Jazzicon swap) + actions */}
          <div className="flex items-center justify-between gap-2 border-b border-white/5 px-3 py-3">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className="size-6 rounded-full"
                style={{
                  background:
                    "conic-gradient(from 140deg at 50% 50%, #6ed7c8, #5a8de0, #c47fdb, #6ed7c8)",
                }}
              />
              <span className="text-[12px] font-medium">warm-seeking-fox</span>
              <span aria-hidden className="text-muted-foreground">▾</span>
            </span>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Eye strokeWidth={1.5} className="size-4" aria-hidden />
              <MoreVertical strokeWidth={1.5} className="size-4" aria-hidden />
            </div>
          </div>

          {/* Hero */}
          <div className="flex items-start justify-between gap-3 px-3 pb-2 pt-3">
            <div className="flex flex-col gap-1">
              <span className="text-[26px] font-semibold leading-none tabular-nums">
                $42,318.52
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] tabular-nums text-primary">
                <span aria-hidden>▲</span>
                +$1,204.88 (2.93%)
                <span className="text-muted-foreground">today</span>
              </span>
            </div>
            <span className="rounded-md bg-white/[0.08] px-3 py-1.5 text-[11px] font-medium">
              Deposit
            </span>
          </div>

          {/* Sparkline */}
          <div className="px-3 pb-2 pt-2">
            <PortfolioArtSparkline />
          </div>

          {/* Venue rows — mirrors VenueRow accordion (collapsed) */}
          <div className="border-t border-white/5">
            {venues.map((v, i) => (
              <div
                key={v.name}
                className={cn(
                  "flex items-center gap-3 px-3 py-3",
                  i > 0 && "border-t border-white/5",
                )}
              >
                <span
                  aria-hidden
                  className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[11px] font-semibold"
                >
                  {v.glyph}
                </span>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-[11.5px] text-foreground">
                    {v.name}
                  </span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {v.count} {v.count === 1 ? "position" : "positions"}
                  </span>
                </div>
                <span className="text-[11.5px] tabular-nums">{v.value}</span>
              </div>
            ))}
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
    <div className="relative h-10 w-full text-primary">
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
        />
      </svg>
      <span
        aria-hidden
        className="pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current shadow-[0_0_0_4px_color-mix(in_oklch,currentColor_25%,transparent)]"
        style={{ left: "100%", top: `${lastYPct}%` }}
      />
    </div>
  );
}

function PathsArt() {
  // Real path card — mirrors ExplorePathsPanel article structure.
  const path = {
    name: "BTC Funding Capture",
    author: "@mercury",
    kind: "Funding capture",
    description:
      "Capture HL Perps funding while staying delta-neutral against spot. Auto-rolls every 8h.",
    yieldPct: "12.4% APY",
    stars: 4623,
    installs: 2118,
    cost: "Install · 0.05 ETH",
    tone: "violet" as const,
    icon: Zap,
  };
  const Icon = path.icon;

  return (
    <div className="absolute inset-0 overflow-hidden bg-muted">
      <div className="absolute inset-0 flex items-center justify-center">
        <article className="flex w-[min(76%,360px)] flex-col overflow-hidden rounded-2xl bg-card/60 ring-1 ring-inset ring-white/[0.08] shadow-[0_30px_70px_-25px_rgba(0,0,0,0.7)]">
          {/* Procedural header — kind tint + glyph */}
          <div
            aria-hidden
            className={cn(
              "relative h-24 overflow-hidden border-b border-white/[0.04]",
              TONE_BG[path.tone],
            )}
          >
            <Icon
              strokeWidth={1.25}
              className={cn(
                "absolute -bottom-3 -right-2 size-24 opacity-30",
                TONE_FG[path.tone],
              )}
            />
          </div>

          <div className="flex flex-col gap-3 p-4">
            {/* Meta — kind + status */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10.5px] text-muted-foreground">
                {path.kind}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">
                <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                Live
              </span>
            </div>

            {/* Title + author */}
            <div className="flex flex-col gap-0.5">
              <h3 className="text-[14px] font-semibold text-foreground">
                {path.name}
              </h3>
              <span className="text-[10.5px] text-muted-foreground">
                {path.author}
              </span>
            </div>

            {/* Description */}
            <p className="line-clamp-2 text-pretty text-[11px] leading-relaxed text-muted-foreground">
              {path.description}
            </p>

            {/* Stats + Install */}
            <div className="mt-1 flex items-center justify-between gap-3">
              <div className="flex items-center gap-x-3 text-muted-foreground">
                <span className="text-[10.5px] tabular-nums text-primary">
                  {path.yieldPct}
                </span>
                <span className="inline-flex items-center gap-1 text-[10.5px] tabular-nums">
                  <Star
                    strokeWidth={0}
                    fill="currentColor"
                    className="size-2.5"
                    aria-hidden
                  />
                  {path.stars.toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1 text-[10.5px] tabular-nums">
                  <Download
                    strokeWidth={1.6}
                    className="size-2.5"
                    aria-hidden
                  />
                  {path.installs.toLocaleString()}
                </span>
              </div>
              <span className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md bg-primary/15 px-3 text-[11px] font-medium text-primary">
                <Download
                  strokeWidth={1.75}
                  className="size-3"
                  aria-hidden
                />
                {path.cost}
              </span>
            </div>
          </div>
        </article>
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
