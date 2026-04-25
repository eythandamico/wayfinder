"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button, PageSection, Reveal } from "@/components/ds";
import { cn } from "@/lib/utils";
import {
  PATH_KIND_LABELS,
  PATH_STATUS_LABELS,
  PATHS,
  PATHS_CATALOG_URL,
  type Path,
  type PathKind,
  type PathStatus,
} from "@/lib/paths";

type KindFilter = PathKind | "all";
type SortKey = "bonded" | "popular" | "yield" | "recent";

const KIND_ORDER: PathKind[] = [
  "strategy",
  "skill",
  "monitor",
  "policy",
  "script",
  "tool",
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "bonded", label: "Bonded first" },
  { value: "popular", label: "Most installs" },
  { value: "yield", label: "Highest yield" },
  { value: "recent", label: "Most active" },
];

const STATUS_ORDER: Record<PathStatus, number> = {
  bonded: 0,
  "pending-update": 1,
  probation: 2,
  unbonded: 3,
};

const SUGGESTIONS = [
  "delta-neutral",
  "momentum",
  "oracle",
  "polymarket",
  "telegram",
  "risk",
];

const CREATE_PATH_URL = "https://strategies-dev.wayfinder.ai/paths/create";

const PAGE_SIZE = 9;

export default function PathsPage() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [sort, setSort] = useState<SortKey>("bonded");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const gridRef = useRef<HTMLDivElement>(null);

  const kindCounts = useMemo(() => {
    return KIND_ORDER.reduce<Record<PathKind, number>>(
      (acc, k) => {
        acc[k] = PATHS.filter((p) => p.kind === k).length;
        return acc;
      },
      {} as Record<PathKind, number>,
    );
  }, []);

  const trending = useMemo(
    () =>
      [...PATHS]
        .sort((a, b) => b.weeklyInstalls - a.weeklyInstalls)
        .slice(0, 3),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = PATHS.filter((p) => kind === "all" || p.kind === kind).filter(
      (p) => {
        if (!q) return true;
        return (
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.author.toLowerCase().includes(q)
        );
      },
    );

    items = items.slice().sort((a, b) => {
      if (sort === "bonded") {
        const d = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        return d !== 0 ? d : b.installs - a.installs;
      }
      if (sort === "popular") return b.installs - a.installs;
      if (sort === "yield") {
        const ay = a.yieldPct ? parseFloat(a.yieldPct) : -Infinity;
        const by = b.yieldPct ? parseFloat(b.yieldPct) : -Infinity;
        return by - ay;
      }
      return b.weeklyInstalls - a.weeklyInstalls;
    });

    return items;
  }, [query, kind, sort]);

  const visible = filtered.slice(0, visibleCount);
  const canShowMore = visibleCount < filtered.length;

  const resetVisible = () => setVisibleCount(PAGE_SIZE);

  const runSuggestion = (term: string) => {
    setQuery(term);
    resetVisible();
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const filterByKind = (k: KindFilter) => {
    setKind(k);
    resetVisible();
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <SiteHeader />
      <main className="relative flex flex-1 flex-col pb-20">
        {/* Hero */}
        <PageSection
          pad="none"
          innerClassName="relative flex flex-col items-center gap-7 pt-16 pb-14 text-center md:pt-24 md:pb-20"
        >
          <Reveal y={24} delay={0.08}>
            <h1 className="max-w-4xl font-heading text-[clamp(2.25rem,4.8vw,4.25rem)] font-semibold leading-[1.05] text-balance">
              Paths built by the community.{" "}
              <span className="text-primary">Install in one click.</span>
            </h1>
          </Reveal>
          <Reveal y={16} delay={0.16}>
            <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
              Versioned, bondable strategies, skills, and tools — all on-chain.
              Trust signals surface first.
            </p>
          </Reveal>
          <Reveal y={12} delay={0.22} className="w-full">
            <div className="relative mx-auto w-full max-w-[800px]">
              <label htmlFor="paths-hero-search" className="sr-only">
                Search paths
              </label>
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5 13.5 13.5" />
              </svg>
              <input
                id="paths-hero-search"
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  resetVisible();
                }}
                placeholder="Search paths by name, tag, or author…"
                className="h-14 w-full rounded-full bg-white/5 pl-12 pr-4 text-[15px] text-foreground outline-none ring-1 ring-inset ring-white/[0.08] transition-[background-color,box-shadow] duration-150 ease-out placeholder:text-muted-foreground/70 hover:bg-white/[0.07] focus-visible:bg-white/[0.07] focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </div>
          </Reveal>
          <Reveal y={10} delay={0.28}>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                Try:
              </span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => runSuggestion(s)}
                  className="rounded-full bg-white/5 px-3 py-1 font-mono text-[11px] text-foreground/85 transition-colors duration-150 ease-out hover:bg-white/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {s}
                </button>
              ))}
            </div>
          </Reveal>
        </PageSection>

        <Hairline />

        {/* Trending */}
        <PageSection
          pad="none"
          className="bg-white/[0.02]"
          innerClassName="py-10 md:py-14"
        >
          <div className="flex items-end justify-between gap-4">
            <SectionTitle eyebrow="Most active" title="Trending this week" />
            <button
              type="button"
              onClick={() => filterByKind("all")}
              className="group/viewall inline-flex shrink-0 items-center gap-1 rounded-md font-mono text-[11px] uppercase tracking-wider text-primary transition-[filter] duration-150 ease-out hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              View all
              <span
                aria-hidden
                className="transition-transform duration-150 ease-out group-hover/viewall:translate-x-0.5"
              >
                →
              </span>
            </button>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {trending.map((p) => (
              <PathCard key={p.id} path={p} />
            ))}
          </div>
        </PageSection>

        <Hairline />

        {/* All paths */}
        <div ref={gridRef} aria-hidden className="scroll-mt-20" />
        <PageSection pad="none" innerClassName="py-10 md:py-14">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionTitle
                eyebrow="Directory"
                title={
                  kind === "all"
                    ? "All paths"
                    : `${PATH_KIND_LABELS[kind]} paths`
                }
              />
              <div className="flex items-center gap-2">
                <div className="relative">
                  <label htmlFor="paths-sort" className="sr-only">
                    Sort paths
                  </label>
                  <select
                    id="paths-sort"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    aria-label="Sort paths"
                    className="h-9 cursor-pointer appearance-none rounded-full bg-white/5 pl-3 pr-8 text-sm text-foreground outline-none transition-colors duration-150 ease-out hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option
                        key={o.value}
                        value={o.value}
                        className="bg-background"
                      >
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <svg
                    aria-hidden
                    viewBox="0 0 16 16"
                    className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 6L8 10L12 6" />
                  </svg>
                </div>
                <Button
                  size="sm"
                  render={
                    <Link
                      href={`${PATHS_CATALOG_URL}/new`}
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  }
                >
                  + Create path
                </Button>
              </div>
            </div>

            {/* Kind chips (quick reset / refilter) */}
            <div
              role="tablist"
              aria-label="Filter by kind"
              className="scroll-thin -mx-4 flex items-center gap-1.5 overflow-x-auto px-4"
            >
              <KindChip active={kind === "all"} onClick={() => filterByKind("all")}>
                All
                <span className="ml-1.5 font-mono text-[10px] tabular-nums text-muted-foreground/70">
                  {PATHS.length}
                </span>
              </KindChip>
              {KIND_ORDER.map((k) => (
                <KindChip
                  key={k}
                  active={kind === k}
                  onClick={() => filterByKind(k)}
                >
                  {PATH_KIND_LABELS[k]}
                  <span className="ml-1.5 font-mono text-[10px] tabular-nums text-muted-foreground/70">
                    {kindCounts[k]}
                  </span>
                </KindChip>
              ))}
            </div>

            {/* Grid */}
            <div>
              {visible.length === 0 ? (
                <EmptyState query={query} />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {visible.map((p) => (
                    <PathCard key={p.id} path={p} />
                  ))}
                </div>
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground tabular-nums">
                Showing {visible.length} of {filtered.length}
              </span>
              {canShowMore && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setVisibleCount((c) => c + PAGE_SIZE)
                  }
                >
                  Show more
                </Button>
              )}
            </div>
          </div>
        </PageSection>

        <Hairline />

        {/* Build your own — branded closing moment */}
        <div className="relative overflow-hidden">
          {/* Aurora keyart backdrop */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <Image
              src="/brand/keyart-01.png"
              alt=""
              fill
              sizes="100vw"
              className="object-cover opacity-15"
            />
            {/* Radial vignette — focus center, fade edges */}
            <div className="absolute inset-0 bg-[radial-gradient(55%_70%_at_50%_45%,transparent_0%,color-mix(in_oklch,var(--background)_70%,transparent)_55%,var(--background)_95%)]" />
            {/* Top + bottom fades seat the section against adjacent surfaces */}
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" />
          </div>

          <PageSection
            pad="none"
            innerClassName="relative flex flex-col items-center gap-5 py-20 text-center md:py-28"
          >
            <h2 className="max-w-2xl font-heading text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1.1] text-balance text-foreground">
              Ship your own path.{" "}
              <span className="text-primary">Earn PROMPT when it installs.</span>
            </h2>
            <p className="max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground md:text-base">
              Publish a strategy, skill, policy, or tool on-chain. Versioning,
              bonding, and rewards are handled by the protocol.
            </p>
            <Button
              size="default"
              className="mt-2 h-11 px-5"
              render={
                <Link
                  href={CREATE_PATH_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              Read docs ↗
            </Button>
          </PageSection>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/* ---------------------------------------------------------- */
/*  Section title                                              */
/* ---------------------------------------------------------- */

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {eyebrow}
      </span>
      <h2 className="font-heading text-2xl font-semibold leading-tight text-foreground md:text-[28px]">
        {title}
      </h2>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3v7" />
      <path d="M4.5 7.5 8 11l3.5-3.5" />
      <path d="M3 13h10" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3"
      fill="currentColor"
    >
      <path d="M8 1.5l1.95 3.95 4.35.63-3.15 3.07.74 4.33L8 11.43l-3.89 2.05.74-4.33L1.7 6.08l4.35-.63L8 1.5z" />
    </svg>
  );
}

function InstallsIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2.5v6.5" />
      <path d="M5 6.5 8 9l3-2.5" />
      <path d="M2.75 12h10.5" />
    </svg>
  );
}

function Hairline() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-6xl px-6">
      <div className="h-px w-full bg-white/[0.05]" />
    </div>
  );
}

/* ---------------------------------------------------------- */
/*  Kind chip (for the All paths quick filter row)             */
/* ---------------------------------------------------------- */

function KindChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "bg-primary/15 text-primary"
          : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
      )}
    >
      <span className="inline-flex items-center">{children}</span>
    </button>
  );
}

/* ---------------------------------------------------------- */
/*  PathCard                                                   */
/* ---------------------------------------------------------- */

function PathCard({ path }: { path: Path }) {
  const costLabel =
    path.cost === "0 PROMPT" ? "Install" : `Install · ${path.cost}`;

  return (
    <article className="group/card flex h-full flex-col gap-4 rounded-2xl bg-card/60 p-5 ring-1 ring-inset ring-white/[0.06] transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-px hover:bg-card/80 hover:ring-white/[0.12]">
      {/* Meta — kind + status */}
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {PATH_KIND_LABELS[path.kind]}
        </span>
        <StatusBadge status={path.status} />
      </div>

      {/* Title + author */}
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-lg font-semibold leading-tight text-foreground">
          {path.name}
        </h3>
        <span className="font-mono text-[11px] text-muted-foreground">
          {path.author}
        </span>
      </div>

      {/* Description — clamped so cards align */}
      <p className="line-clamp-2 text-pretty text-sm leading-relaxed text-muted-foreground">
        {path.description}
      </p>

      {/* Momentum + subdued CTA */}
      <div className="mt-auto flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
          {path.yieldPct && (
            <span className="font-mono text-[11px] uppercase tracking-wider tabular-nums text-primary">
              {path.yieldPct}
            </span>
          )}
          <span
            aria-label={`${path.stars} stars`}
            className="inline-flex items-center gap-1 font-mono text-[11.5px] tabular-nums"
          >
            <StarIcon />
            {path.stars.toLocaleString()}
          </span>
          <span
            aria-label={`${path.installs} installs`}
            className="inline-flex items-center gap-1 font-mono text-[11.5px] tabular-nums"
          >
            <InstallsIcon />
            {path.installs.toLocaleString()}
          </span>
        </div>
        <button
          type="button"
          aria-label={`Install ${path.name}`}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary/15 px-3 text-sm font-medium text-primary transition-colors duration-150 ease-out hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <span
            aria-hidden
            className="transition-transform duration-150 ease-out group-hover/card:translate-y-0.5"
          >
            <DownloadIcon />
          </span>
          {costLabel}
        </button>
      </div>
    </article>
  );
}

/* ---------------------------------------------------------- */
/*  Status badge                                               */
/* ---------------------------------------------------------- */

const STATUS_STYLES: Record<PathStatus, { bg: string; text: string; dot: string }> = {
  bonded: {
    bg: "bg-white/[0.06]",
    text: "text-muted-foreground",
    dot: "bg-primary shadow-[0_0_6px_var(--primary)]",
  },
  "pending-update": {
    bg: "bg-white/[0.06]",
    text: "text-muted-foreground",
    dot: "bg-amber-300",
  },
  unbonded: {
    bg: "bg-white/[0.06]",
    text: "text-muted-foreground/70",
    dot: "bg-muted-foreground/50",
  },
  probation: {
    bg: "bg-white/[0.06]",
    text: "text-muted-foreground",
    dot: "bg-[#f07575]",
  },
};

function StatusBadge({ status }: { status: PathStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
        s.bg,
        s.text,
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", s.dot)} />
      {PATH_STATUS_LABELS[status]}
    </span>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-card/40 px-6 py-16 text-center ring-1 ring-inset ring-white/[0.06]">
      <span className="font-heading text-xl font-semibold text-foreground">
        No paths match
      </span>
      <p className="max-w-md text-sm text-muted-foreground">
        {query ? (
          <>
            Nothing matched{" "}
            <span className="text-foreground">&ldquo;{query}&rdquo;</span>. Try a
            different keyword or clear the filters.
          </>
        ) : (
          <>Try a different filter combination.</>
        )}
      </p>
      <Button
        size="sm"
        variant="outline"
        render={
          <Link
            href={PATHS_CATALOG_URL}
            target="_blank"
            rel="noopener noreferrer"
          />
        }
      >
        Browse the full hub ↗
      </Button>
    </div>
  );
}
