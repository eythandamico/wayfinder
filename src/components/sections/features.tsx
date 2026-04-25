"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Loader2, Route, Wallet } from "lucide-react";
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

function ChatArt() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-muted">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10"
        style={{
          background:
            "radial-gradient(55% 55% at 70% 85%, color-mix(in oklch, var(--primary) 28%, transparent) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div className="relative flex h-full flex-col gap-4 p-8 md:p-10">
        <div className="ml-auto max-w-[82%] rounded-2xl bg-white/[0.06] px-3.5 py-2 text-[13px]">
          Hedge my BTC longs with funding capture
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="text-[13px] leading-relaxed text-foreground/90">
            Short 0.4 BTC on HL Perps (funding +0.008%/h) against your 0.6
            spot. Net exposure stays flat, you collect ~$19/day in funding.
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            kimi-k2.5 · 3.2s · 284 tokens
          </span>
        </div>
        <div className="mt-auto inline-flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2
            aria-hidden
            strokeWidth={1.75}
            className="size-3 animate-spin text-primary"
            style={{ animationDuration: "900ms" }}
          />
          thinking…
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
      price: "$75,739.5",
      change: "+2.36%",
      tone: "mint" as const,
      icon: "₿",
      bg: "#f7931a",
      fg: "#000",
    },
    {
      sym: "ETH-USDC",
      venue: "HL Spot",
      price: "$2,310.9",
      change: "+2.08%",
      tone: "mint" as const,
      icon: "Ξ",
      bg: "#627eea",
      fg: "#fff",
    },
    {
      sym: "SOL/USDC",
      venue: "Onchain",
      price: "$85.36",
      change: "+2.20%",
      tone: "mint" as const,
      icon: "S",
      bg: "#9945ff",
      fg: "#fff",
    },
    {
      sym: "Trump 2028",
      venue: "Polymarket",
      price: "$0.52",
      change: "-0.98%",
      tone: "red" as const,
      icon: "◆",
      bg: "#2f78c4",
      fg: "#fff",
    },
  ];
  return (
    <div className="absolute inset-0 flex flex-col justify-center bg-muted p-8 md:p-10">
      {rows.map((r, i) => (
        <div
          key={r.sym}
          className={cn(
            "flex items-center gap-3 py-2.5",
            i > 0 && "border-t border-white/[0.04]",
          )}
        >
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-full text-[11px] font-bold"
            style={{ backgroundColor: r.bg, color: r.fg }}
          >
            {r.icon}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold">{r.sym}</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {r.venue}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-[12px] tabular-nums">{r.price}</div>
            <div
              className={cn(
                "font-mono text-[10px] tabular-nums",
                r.tone === "mint" ? "text-primary" : "text-[#f07575]",
              )}
            >
              {r.change}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PortfolioArt() {
  const rows: Array<[string, string, string, string]> = [
    ["H", "Hyperliquid", "$24,102.11", "12 positions"],
    ["T", "Tokens", "$12,804.77", "6 positions"],
    ["P", "Polymarket", "$5,411.64", "4 positions"],
  ];
  return (
    <div className="absolute inset-0 flex flex-col bg-muted p-8 md:p-10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Portfolio
          </span>
          <span className="font-heading text-[26px] font-semibold leading-none tabular-nums">
            $42,318.52
          </span>
          <span className="font-mono text-[11px] tabular-nums text-primary">
            + $1,204.88 · +2.93% · 24H
          </span>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 font-mono text-[10px] tabular-nums text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
          warm-seeking-fox
        </span>
      </div>
      <div className="mt-5 flex flex-col">
        {rows.map(([glyph, name, value, meta], i) => (
          <div
            key={name}
            className={cn(
              "flex items-center gap-3 py-2.5",
              i > 0 && "border-t border-white/[0.04]",
            )}
          >
            <span className="flex size-6 items-center justify-center rounded-md bg-white/[0.06] font-mono text-[10px] font-semibold">
              {glyph}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[12px] font-medium">{name}</span>
              <span className="font-mono text-[9.5px] text-muted-foreground">
                {meta}
              </span>
            </div>
            <span className="font-mono text-[12px] tabular-nums">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PathsArt() {
  const paths = [
    {
      name: "Delta-Neutral LP",
      author: "@lunar",
      stars: "4.8",
      installs: "3.2K",
      bg: "#1aa396",
    },
    {
      name: "BTC Funding Capture",
      author: "@mercury",
      stars: "4.6",
      installs: "2.1K",
      bg: "#f7931a",
    },
    {
      name: "SOL Momentum Rotation",
      author: "@orbit",
      stars: "4.4",
      installs: "1.8K",
      bg: "#9945ff",
    },
  ];
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2.5 bg-muted p-8 md:p-10">
      {paths.map((p) => (
        <div
          key={p.name}
          className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.05]"
        >
          <span
            aria-hidden
            className="size-9 shrink-0 rounded-lg"
            style={{
              background: `linear-gradient(135deg, ${p.bg}, color-mix(in oklch, ${p.bg} 40%, black))`,
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold">{p.name}</div>
            <div className="font-mono text-[10px] text-muted-foreground">
              {p.author} · ★ {p.stars} · {p.installs} installs
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center rounded-full bg-primary/15 px-3 py-1 text-[11px] font-semibold text-primary ring-1 ring-inset ring-primary/20">
            Install
          </span>
        </div>
      ))}
    </div>
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
