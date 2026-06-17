"use client";

import { useEffect, useState } from "react";
import {
  AtSign,
  Heart,
  MessageCircle,
  Newspaper,
  Repeat2,
} from "lucide-react";
import { Skeleton } from "@/components/ui";
import { MOCK_TWEETS, type Tweet } from "../_data/tweets-mock";
import type { NewsItem } from "@/api/news";
import { PanelTab, PanelTabBar } from "./PanelTabs";

type Tab = "news" | "social";

const TWITTER_CONNECT_KEY = "wf-shells-v3-twitter-connected";
const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/**
 * MediaPanel — News + Social tabs. News hits /api/news (server route
 * proxying CoinDesk RSS) and renders headlines as cards. Social shows
 * a "Connect X" empty state until the user "connects" — then the tab
 * flips to a curated mock feed (real X API read access is paywalled).
 */
export function MediaPanel() {
  const [tab, setTab] = useState<Tab>("news");
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PanelTabBar ariaLabel="News and social">
        <PanelTab
          active={tab === "news"}
          onClick={() => setTab("news")}
          label="News"
        />
        <PanelTab
          active={tab === "social"}
          onClick={() => setTab("social")}
          label="Social"
        />
      </PanelTabBar>

      {tab === "news" ? <NewsTab /> : <SocialTab />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab button                                                          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  News                                                                */
/* ------------------------------------------------------------------ */

function NewsTab() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/news")
      .then((r) => r.json() as Promise<{ items: NewsItem[]; error?: string }>)
      .then((data) => {
        if (cancelled) return;
        if (data.error) setError(data.error);
        setItems(data.items ?? []);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "fetch failed");
        setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (items === null) {
    // Skeleton rows mirror the news row layout (thumb + title + meta)
    // so the list doesn't lurch into shape when the feed lands.
    return (
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 border-b border-white/[0.05] px-3 py-3"
              aria-hidden
            >
              <Skeleton className="size-16 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-0.5">
                <Skeleton variant="line" className="w-full" />
                <Skeleton variant="line" className="w-4/5" />
                <Skeleton variant="line" className="h-2 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 text-center text-body text-muted-foreground">
        {error ? `News feed unavailable (${error}).` : "No news right now."}
      </div>
    );
  }

  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
      {items.map((n) => (
        <a
          key={n.id}
          href={n.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 border-b border-white/[0.05] px-3 py-3 transition-colors hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
        >
          <NewsThumb image={n.image} alt={n.title} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="line-clamp-2 text-body font-semibold text-foreground text-pretty">
              {n.title}
            </span>
            {n.summary && (
              <span className="line-clamp-2 text-caption text-muted-foreground text-pretty">
                {n.summary}
              </span>
            )}
            <span className="text-micro text-muted-foreground">
              {n.source} · {formatRelative(n.publishedAt)}
            </span>
          </div>
        </a>
      ))}
    </div>
  );
}

/** Square thumbnail for a news item. Graceful fallback when the RSS
 *  item didn't ship an image or the image errors. */
function NewsThumb({ image, alt }: { image: string | null; alt: string }) {
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

/* ------------------------------------------------------------------ */
/*  Social                                                              */
/* ------------------------------------------------------------------ */

function SocialTab() {
  // Persist connect state across remounts so the user doesn't have
  // to reconnect every time they switch tabs. Lazy init reads
  // localStorage once on mount — no useEffect needed.
  const [connected, setConnected] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(TWITTER_CONNECT_KEY) === "1";
  });

  const onConnect = () => {
    window.localStorage.setItem(TWITTER_CONNECT_KEY, "1");
    setConnected(true);
  };

  const onDisconnect = () => {
    window.localStorage.removeItem(TWITTER_CONNECT_KEY);
    setConnected(false);
  };

  if (!connected) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <AtSign strokeWidth={1.5} className="size-7 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <span className="text-body font-medium text-foreground">
            Connect X
          </span>
          <span className="text-caption text-muted-foreground text-pretty">
            Sign in to see your home timeline without leaving Wayfinder.
          </span>
        </div>
        <button
          type="button"
          onClick={onConnect}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-foreground px-4 text-body font-semibold text-background transition-[filter,scale] duration-150 ease-out hover:brightness-[1.05] active:scale-[0.97]"
        >
          <AtSign strokeWidth={2} className="size-4" aria-hidden />
          Connect X
        </button>
      </div>
    );
  }

  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-1.5 text-caption text-muted-foreground">
        <span>Connected as @you</span>
        <button
          type="button"
          onClick={onDisconnect}
          className="rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Disconnect
        </button>
      </div>
      {MOCK_TWEETS.map((t) => (
        <TweetRow key={t.id} tweet={t} />
      ))}
    </div>
  );
}

function TweetRow({ tweet }: { tweet: Tweet }) {
  return (
    <article className="flex gap-2.5 border-b border-white/[0.05] px-3 py-2.5">
      <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-surface-1">
        <img
          src={tweet.author.avatar}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline gap-1.5 text-caption">
          <span className="truncate font-semibold text-foreground">
            {tweet.author.name}
          </span>
          {tweet.author.verified && (
            <span aria-label="Verified" className="text-primary">
              ✓
            </span>
          )}
          <span className="truncate text-muted-foreground">
            @{tweet.author.handle}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground tabular-nums">
            {tweet.postedAt}
          </span>
        </div>
        <p className="text-body text-foreground text-pretty">{tweet.text}</p>
        {tweet.media && tweet.media.length > 0 && (
          <TweetMedia media={tweet.media} />
        )}
        <div className="mt-1 flex items-center gap-5 text-caption text-muted-foreground">
          <Metric Icon={MessageCircle} value={tweet.metrics.replies} />
          <Metric Icon={Repeat2} value={tweet.metrics.reposts} />
          <Metric Icon={Heart} value={tweet.metrics.likes} />
        </div>
      </div>
    </article>
  );
}

/** Inline media stack for a tweet. For now we just render one wide
 *  image (the X timeline UI groups multiples into a 2/3/4-cell mosaic —
 *  added later when we wire real data and need to handle multi-image
 *  attachments). */
function TweetMedia({
  media,
}: {
  media: NonNullable<Tweet["media"]>;
}) {
  const [errored, setErrored] = useState(false);
  const first = media[0];
  if (!first || errored) return null;
  return (
    <div className="relative mt-1 aspect-video w-full overflow-hidden rounded-lg bg-surface-1 ring-1 ring-inset ring-white/[0.06]">
      <img
        src={first.url}
        alt={first.alt ?? ""}
        className="absolute inset-0 size-full object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

function Metric({
  Icon,
  value,
}: {
  Icon: typeof Heart;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon strokeWidth={1.75} className="size-3.5" aria-hidden />
      <span className="tabular-nums">{COMPACT.format(value)}</span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Time helpers                                                        */
/* ------------------------------------------------------------------ */

const SECONDS_PER_MIN = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (diff < SECONDS_PER_MIN) return `${diff}s ago`;
  if (diff < SECONDS_PER_HOUR)
    return `${Math.round(diff / SECONDS_PER_MIN)}m ago`;
  if (diff < SECONDS_PER_DAY)
    return `${Math.round(diff / SECONDS_PER_HOUR)}h ago`;
  return `${Math.round(diff / SECONDS_PER_DAY)}d ago`;
}
