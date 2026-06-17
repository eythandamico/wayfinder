"use client";

import { useState } from "react";
import { Bookmark, ExternalLink, Filter, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { AskAgentButton } from "./AskAgentAffordance";

/**
 * News panel — a feed of market headlines with source attribution and
 * relative timestamps. Mocked content for now; the row + filter shape
 * is the same as what a live news API would produce.
 */

type Tag = "all" | "macro" | "crypto" | "equities" | "research";

type NewsItem = {
  id: string;
  headline: string;
  source: string;
  ago: string;
  tag: Exclude<Tag, "all">;
  /** Optional impact marker for the dot next to the timestamp. */
  impact?: "high" | "medium";
  /** Optional ticker affinity — shown as a chip after the headline. */
  tickers?: string[];
  /** Featured image. Production sources from the publisher's RSS
   *  `<media:content>` (see /api/news for the live equivalent); here
   *  we hardcode Unsplash thumbs on a subset to exercise the layout. */
  image?: string;
};

const ITEMS: NewsItem[] = [
  {
    id: "n1",
    headline: "Fed signals no December cut as core PCE prints hotter than consensus",
    source: "Bloomberg",
    ago: "4m",
    tag: "macro",
    impact: "high",
    image:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236e2?w=320&q=70",
  },
  {
    id: "n2",
    headline: "Hyperliquid Q4 volume crosses $1.4T, fees back to ATH",
    source: "The Block",
    ago: "18m",
    tag: "crypto",
    impact: "high",
    tickers: ["HYPE"],
    image:
      "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=320&q=70",
  },
  {
    id: "n3",
    headline: "Apple raises iPhone 18 Pro pricing in Europe by 7%",
    source: "Reuters",
    ago: "32m",
    tag: "equities",
    tickers: ["AAPL"],
  },
  {
    id: "n4",
    headline: "BlackRock files for spot SOL ETF — comment period opens Nov 4",
    source: "CoinDesk",
    ago: "1h",
    tag: "crypto",
    impact: "high",
    tickers: ["SOL"],
    image:
      "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=320&q=70",
  },
  {
    id: "n5",
    headline: "NVDA earnings preview — Capex guide is the only thing that matters",
    source: "Bespoke",
    ago: "1h",
    tag: "research",
    impact: "medium",
    tickers: ["NVDA"],
    image:
      "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=320&q=70",
  },
  {
    id: "n6",
    headline: "Tesla Cybertruck deliveries pull forward into Q4, channel inventory normalizes",
    source: "Electrek",
    ago: "2h",
    tag: "equities",
    tickers: ["TSLA"],
  },
  {
    id: "n7",
    headline: "Perp funding flips negative across majors — shorts crowded",
    source: "Velo",
    ago: "2h",
    tag: "crypto",
    tickers: ["BTC", "ETH"],
  },
  {
    id: "n8",
    headline: "PCE inflation report Q&A: Bostic open to cuts, Powell holds line",
    source: "WSJ",
    ago: "3h",
    tag: "macro",
  },
  {
    id: "n9",
    headline: "MSTR adds 8,440 BTC at avg $74,800 — funded via convertible notes",
    source: "MicroStrategy IR",
    ago: "4h",
    tag: "crypto",
    tickers: ["BTC", "MSTR"],
    image:
      "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=320&q=70",
  },
  {
    id: "n10",
    headline: "GS lifts S&P year-end target to 6,700 on softer landing thesis",
    source: "Goldman Sachs",
    ago: "5h",
    tag: "research",
  },
  {
    id: "n11",
    headline: "Polymarket volumes hit $4.2B in October, biggest month ever",
    source: "Polymarket",
    ago: "6h",
    tag: "crypto",
    image:
      "https://images.unsplash.com/photo-1551636898-47668aa61de2?w=320&q=70",
  },
  {
    id: "n12",
    headline: "Microsoft Azure run-rate clears $130B, AI services accelerating",
    source: "CNBC",
    ago: "7h",
    tag: "equities",
    tickers: ["MSFT"],
  },
];

const TAGS: { value: Tag; label: string }[] = [
  { value: "all", label: "All" },
  { value: "macro", label: "Macro" },
  { value: "crypto", label: "Crypto" },
  { value: "equities", label: "Equities" },
  { value: "research", label: "Research" },
];

export function NewsPanel() {
  const [tag, setTag] = useState<Tag>("all");
  const filtered =
    tag === "all" ? ITEMS : ITEMS.filter((item) => item.tag === tag);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.05] px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="text-body font-semibold text-foreground">News</span>
          <span className="text-body text-muted-foreground tabular-nums">
            {filtered.length}
          </span>
        </div>
        <button
          type="button"
          aria-label="Filter news"
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-1 hover:text-foreground active:scale-[0.96]"
        >
          <Filter strokeWidth={1.75} className="size-4" aria-hidden />
        </button>
      </div>

      {/* Tag filter strip — horizontally scrollable so tags never wrap */}
      <div className="scroll-thin scrollbar-hide flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/[0.05] px-2 py-2">
        {TAGS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTag(t.value)}
            className={cn(
              "rounded-full px-2.5 py-1 text-caption transition-[background-color,color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              tag === t.value
                ? "bg-surface-4 text-foreground"
                : "text-muted-foreground hover:bg-surface-1 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {filtered.map((item, i) => (
          <NewsRow key={item.id} item={item} first={i === 0} />
        ))}
      </ul>
    </div>
  );
}

function NewsRow({ item, first }: { item: NewsItem; first: boolean }) {
  return (
    <li
      className={cn(
        "flex gap-3 px-3 py-3 transition-colors hover:bg-surface-1",
        !first && "border-t border-white/[0.05]",
      )}
    >
      <NewsThumb image={item.image} alt={item.headline} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start gap-2">
          {item.impact && (
            <span
              aria-hidden
              className={cn(
                "mt-1.5 size-1.5 shrink-0 rounded-full",
                item.impact === "high"
                  ? "bg-primary shadow-[0_0_6px_var(--primary)]"
                  : "bg-muted-foreground",
              )}
            />
          )}
          <p className="flex-1 line-clamp-2 text-body font-semibold text-foreground text-pretty">
            {item.headline}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-caption text-muted-foreground">
            {item.source}
          </span>
          <span className="text-caption text-muted-foreground/70">·</span>
          <span className="text-caption tabular-nums text-muted-foreground/70">
            {item.ago}
          </span>
          {item.tickers && item.tickers.length > 0 && (
            <>
              <span className="text-caption text-muted-foreground/70">·</span>
              <div className="flex items-center gap-1">
                {item.tickers.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-surface-1 px-1.5 py-0.5 text-micro font-medium tabular-nums text-foreground"
                  >
                    ${t}
                  </span>
                ))}
              </div>
            </>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              aria-label="Save"
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-1 hover:text-foreground active:scale-[0.96]"
            >
              <Bookmark strokeWidth={1.75} className="size-3.5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Open"
              className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-1 hover:text-foreground active:scale-[0.96]"
            >
              <ExternalLink strokeWidth={1.75} className="size-3.5" aria-hidden />
            </button>
            <AskAgentButton
              size="sm"
              withHoverGlow
              payload={{
                kind: "news",
                item: {
                  id: item.id,
                  headline: item.headline,
                  source: item.source,
                  tickers: item.tickers,
                  impact: item.impact,
                },
              }}
              ariaLabel={`Ask agent about "${item.headline}"`}
            />
          </div>
        </div>
      </div>
    </li>
  );
}

/** Square thumbnail with a graceful fallback when an item has no image
 *  or the image errors. Matches the MediaPanel news thumb so the visual
 *  rhythm stays consistent between the two news surfaces. */
function NewsThumb({
  image,
  alt,
}: {
  image: string | undefined;
  alt: string;
}) {
  const [errored, setErrored] = useState(false);
  if (!image || errored) {
    return (
      <span
        aria-hidden
        className="grid size-16 shrink-0 place-items-center rounded-md bg-surface-1 text-muted-foreground ring-1 ring-inset ring-white/[0.06]"
      >
        <Newspaper className="size-5" strokeWidth={1.5} />
      </span>
    );
  }
  return (
    <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-surface-1 ring-1 ring-inset ring-white/[0.06]">
      <img
        src={image}
        alt={alt}
        className="absolute inset-0 size-full object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  );
}
