"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Code2,
  Download,
  Search,
  Shield,
  Star,
  TrendingUp,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { CREATE_PATH_URL } from "@/lib/links";
import {
  PATH_KIND_LABELS,
  PATH_STATUS_LABELS,
  PATHS,
  type Path,
  type PathKind,
  type PathStatus,
} from "@/lib/paths";
import { CheckIcon, ChevronDownIcon } from "./icons";

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

const KIND_TONES: Record<
  PathKind,
  { bg: string; tint: string; icon: LucideIcon; iconClass: string }
> = {
  strategy: {
    bg: "bg-[var(--wf-accent-mint-soft)]",
    tint: "from-[var(--wf-accent-mint)]/25",
    icon: TrendingUp,
    iconClass: "text-[var(--wf-accent-mint)]",
  },
  skill: {
    bg: "bg-[var(--wf-accent-violet-soft)]",
    tint: "from-[var(--wf-accent-violet)]/25",
    icon: Zap,
    iconClass: "text-[var(--wf-accent-violet)]",
  },
  monitor: {
    bg: "bg-[var(--wf-accent-sky-soft)]",
    tint: "from-[var(--wf-accent-sky)]/25",
    icon: Activity,
    iconClass: "text-[var(--wf-accent-sky)]",
  },
  policy: {
    bg: "bg-[var(--wf-accent-amber-soft)]",
    tint: "from-[var(--wf-accent-amber)]/25",
    icon: Shield,
    iconClass: "text-[var(--wf-accent-amber)]",
  },
  script: {
    bg: "bg-white/[0.05]",
    tint: "from-white/10",
    icon: Code2,
    iconClass: "text-muted-foreground",
  },
  tool: {
    bg: "bg-white/[0.05]",
    tint: "from-white/10",
    icon: Wrench,
    iconClass: "text-muted-foreground",
  },
};

const STATUS_STYLES: Record<
  PathStatus,
  { bg: string; text: string; dot: string }
> = {
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
    dot: "bg-tone-down",
  },
};

const PAGE_SIZE = 15; // 5 cols × 3 rows on a wide display
const TRENDING_COUNT = 8;

const GRID_COLS =
  "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3";

export function ExplorePathsPanel() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [sort, setSort] = useState<SortKey>("bonded");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const kindCounts = useMemo(() => {
    const acc: Record<PathKind, number> = {
      strategy: 0,
      skill: 0,
      monitor: 0,
      policy: 0,
      script: 0,
      tool: 0,
    };
    for (const p of PATHS) acc[p.kind] += 1;
    return acc;
  }, []);

  const trending = useMemo(
    () =>
      [...PATHS]
        .sort((a, b) => b.weeklyInstalls - a.weeklyInstalls)
        .slice(0, TRENDING_COUNT),
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

  // Reset pagination when filters change. Derived-state idiom (React docs):
  // set state during render, guarded by a previous-value check, instead of
  // useEffect which would lag a paint behind.
  const filterKey = `${query}|${kind}|${sort}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

  const visible = filtered.slice(0, visibleCount);
  const canShowMore = visibleCount < filtered.length;
  const isFiltering = kind !== "all" || query.trim() !== "";

  return (
    <div
      id="shells-view-explore"
      role="tabpanel"
      aria-label="Paths catalog"
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-muted"
    >
      <div className="scroll-thin flex-1 overflow-y-auto px-5 py-5">
        <section className="mb-7">
          <SectionLabel label="Trending now" />
          <TrendingCarousel paths={trending} />
        </section>

        <section>
          <SectionLabel
            label={isFiltering ? "Results" : "All paths"}
            count={filtered.length}
          />
          {/* Filter chips left; compact search + sort right. Scoped to this
             section, wraps on narrow widths. */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div
              role="tablist"
              aria-label="Filter by path kind"
              className="flex flex-wrap items-center gap-1.5"
            >
              <KindChip
                active={kind === "all"}
                onClick={() => setKind("all")}
                count={PATHS.length}
              >
                All
              </KindChip>
              {KIND_ORDER.map((k) => {
                const count = kindCounts[k];
                if (count === 0) return null;
                return (
                  <KindChip
                    key={k}
                    active={kind === k}
                    onClick={() => setKind(k)}
                    count={count}
                  >
                    {PATH_KIND_LABELS[k]}
                  </KindChip>
                );
              })}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <SearchInput value={query} onChange={setQuery} />
              <SortDropdown value={sort} onChange={setSort} />
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            <div className={GRID_COLS}>
              {visible.map((p) => (
                <PathCard key={p.id} path={p} />
              ))}
            </div>
          )}
          {canShowMore && (
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="rounded-lg bg-white/[0.06] px-4 py-2 text-sm text-muted-foreground ring-1 ring-inset ring-white/[0.08] transition-[background-color,color,box-shadow] duration-150 ease-out hover:bg-white/[0.09] hover:text-foreground hover:ring-white/[0.12]"
              >
                Show {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ----- Header controls ----- */

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative w-44">
      <Search
        aria-hidden
        strokeWidth={1.75}
        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        placeholder="Search…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search paths"
        className="h-[var(--ui-h-input)] w-full rounded-lg bg-white/[0.06] pl-8 pr-3 text-body text-foreground outline-none ring-1 ring-inset ring-white/[0.08] transition-[background-color,box-shadow] duration-150 ease-out placeholder:text-muted-foreground hover:bg-white/[0.09] hover:ring-white/[0.12] focus-visible:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-primary/50"
      />
    </div>
  );
}

function SortDropdown({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  const current = SORT_OPTIONS.find((o) => o.value === value) ?? SORT_OPTIONS[0];

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Sort: ${current.label}`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-[var(--ui-h-input)] items-center gap-2 rounded-lg bg-white/[0.06] px-3.5 text-body text-foreground ring-1 ring-inset ring-white/[0.08] transition-[background-color,color,box-shadow,scale] duration-150 ease-out hover:bg-white/[0.09] hover:ring-white/[0.12] active:scale-[0.96]"
      >
        <span className="text-muted-foreground">Sort</span>
        <span>{current.label}</span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-3 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        role="menu"
        aria-hidden={!open}
        className={cn(
          "absolute right-0 top-full z-20 mt-1 min-w-[200px] origin-top-right rounded-lg bg-background p-1 shadow-xl ring-1 ring-white/5 transition-[opacity,transform] duration-150 ease-[var(--ease-strong)]",
          open
            ? "opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 -translate-y-1 scale-[0.98]",
        )}
      >
        {SORT_OPTIONS.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-3 whitespace-nowrap rounded-md px-3 py-1.5 text-left text-body transition-colors",
                active ? "bg-primary/10" : "hover:bg-white/[0.04]",
              )}
            >
              <span className={active ? "text-primary" : "text-foreground"}>
                {opt.label}
              </span>
              {active && <CheckIcon />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function KindChip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-body transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
        active
          ? "bg-primary/15 text-primary"
          : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground",
      )}
    >
      <span>{children}</span>
      <span
        className={cn(
          "tabular-nums",
          active ? "text-primary/70" : "text-muted-foreground/70",
        )}
      >
        {count}
      </span>
    </button>
  );
}

/* ----- Trending carousel — same card width as grid, scrolls horizontally ----- */

function TrendingCarousel({ paths }: { paths: Path[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = () => {
    const el = scrollRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };

  // Sync edges on mount and whenever the carousel resizes (viewport changes,
  // panel resized, etc.). onScroll covers updates during user scrolling.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateEdges();
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: el.clientWidth * 0.85 * dir, behavior: "smooth" });
  };

  return (
    <div className="group/carousel relative">
      <div
        ref={scrollRef}
        onScroll={updateEdges}
        role="list"
        aria-label="Trending paths"
        className="scroll-thin -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2"
      >
        {paths.map((p) => (
          <div
            key={p.id}
            role="listitem"
            // Width matches the grid below at every breakpoint:
            //   1 col → full, 2 col → ~½, 3 col → ~⅓, 4 col → ~¼, 5 col → ~⅕
            // Math accounts for the 12px (gap-3) between cards.
            className="shrink-0 snap-start w-full sm:w-[calc((100%-12px)/2)] lg:w-[calc((100%-24px)/3)] xl:w-[calc((100%-36px)/4)] 2xl:w-[calc((100%-48px)/5)]"
          >
            <PathCard path={p} />
          </div>
        ))}
      </div>

      {/* Edge fades — only render on the side that has more to scroll */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-muted to-transparent transition-opacity duration-150",
          atStart && "opacity-0",
        )}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-muted to-transparent transition-opacity duration-150",
          atEnd && "opacity-0",
        )}
      />

      {/* Click-to-scroll chevrons — fade in on hover, disable at edges */}
      <CarouselButton
        side="left"
        disabled={atStart}
        onClick={() => scroll(-1)}
      />
      <CarouselButton
        side="right"
        disabled={atEnd}
        onClick={() => scroll(1)}
      />
    </div>
  );
}

function CarouselButton({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={`Scroll trending ${side}`}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "absolute top-1/2 z-20 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg ring-1 ring-inset ring-white/10 backdrop-blur transition-[opacity,background-color,scale] duration-150 ease-out hover:bg-background active:scale-[0.94] disabled:pointer-events-none",
        side === "left" ? "left-2" : "right-2",
        // Hidden by default; revealed on container hover or focus, only when
        // there's actually somewhere to scroll.
        "opacity-0 group-hover/carousel:opacity-100 focus-visible:opacity-100",
        disabled && "!opacity-0",
      )}
    >
      <Icon strokeWidth={1.75} className="size-4" aria-hidden />
    </button>
  );
}

/* ----- Section header (matches marketing /paths styling) ----- */

function SectionLabel({ label, count }: { label: string; count?: number }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
        {count !== undefined && (
          <span className="ml-2 tabular-nums text-foreground">{count}</span>
        )}
      </span>
      <span aria-hidden className="h-px flex-1 bg-white/[0.05]" />
    </div>
  );
}

/* ----- Card (mirrors marketing /paths card) ----- */

function PathCard({ path }: { path: Path }) {
  const costLabel =
    path.cost === "0 PROMPT" ? "Install" : `Install · ${path.cost}`;

  return (
    <article className="group/card flex h-full flex-col overflow-hidden rounded-2xl bg-card/60 ring-1 ring-inset ring-white/[0.06] transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-px hover:bg-card/80 hover:ring-white/[0.12]">
      <PathCardHeader kind={path.kind} />
      <div className="flex flex-1 flex-col gap-4 p-5">
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

        {/* Description */}
        <p className="line-clamp-2 text-pretty text-sm leading-relaxed text-muted-foreground">
          {path.description}
        </p>

        {/* Stats + CTA */}
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
              <Star
                strokeWidth={0}
                fill="currentColor"
                className="size-3"
                aria-hidden
              />
              {path.stars.toLocaleString()}
            </span>
            <span
              aria-label={`${path.installs} installs`}
              className="inline-flex items-center gap-1 font-mono text-[11.5px] tabular-nums"
            >
              <Download strokeWidth={1.6} className="size-3" aria-hidden />
              {path.installs.toLocaleString()}
            </span>
          </div>
          <button
            type="button"
            aria-label={`Install ${path.name}`}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary/15 px-3 text-sm font-medium text-primary transition-colors duration-150 ease-out hover:bg-primary/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Download
              strokeWidth={1.75}
              className="size-3.5 transition-transform duration-150 ease-out group-hover/card:translate-y-0.5"
              aria-hidden
            />
            {costLabel}
          </button>
        </div>
      </div>
    </article>
  );
}

/* Procedural header — colored tint + faded kind glyph. Avoids managing image
 * assets per path while still giving each card a recognizable visual. */
function PathCardHeader({ kind }: { kind: PathKind }) {
  const tone = KIND_TONES[kind];
  const Icon = tone.icon;
  return (
    <div
      aria-hidden
      className={cn(
        "relative h-24 overflow-hidden border-b border-white/[0.04]",
        tone.bg,
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br to-transparent opacity-80",
          tone.tint,
        )}
      />
      <Icon
        strokeWidth={1.25}
        className={cn(
          "absolute -bottom-3 -right-2 size-24 opacity-30 transition-transform duration-300 ease-out group-hover/card:scale-[1.06] group-hover/card:rotate-[2deg]",
          tone.iconClass,
        )}
      />
    </div>
  );
}

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
      <Link
        href={CREATE_PATH_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary/15 px-3 py-1.5 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/20 transition-colors hover:bg-primary/20"
      >
        Submit a path ↗
      </Link>
    </div>
  );
}
