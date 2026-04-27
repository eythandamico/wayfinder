"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
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

const STATUS_TONES: Record<PathStatus, string> = {
  bonded: "bg-primary/15 text-primary",
  "pending-update": "bg-white/[0.06] text-muted-foreground",
  probation: "bg-amber-300/15 text-amber-200",
  unbonded: "bg-tone-down/15 text-tone-down",
};

const PAGE_SIZE = 9;

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

  // Reset pagination whenever filters change. Derived-state idiom (React docs)
  // — set state during render, guarded by a previous-value check, instead of
  // useEffect which would lag a paint behind.
  const filterKey = `${query}|${kind}|${sort}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_SIZE);
  }

  const visible = filtered.slice(0, visibleCount);
  const canShowMore = visibleCount < filtered.length;

  return (
    <div
      id="shells-view-explore"
      role="tabpanel"
      aria-label="Paths catalog"
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-muted"
    >
      {/* Header — search + sort + filters */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-white/5 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={query} onChange={setQuery} />
          <SortDropdown value={sort} onChange={setSort} />
        </div>
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
      </div>

      {/* Body — grid of cards */}
      <div className="scroll-thin flex-1 overflow-y-auto px-5 py-4">
        {visible.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
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
              className="rounded-lg bg-white/[0.06] px-4 py-2 text-body text-muted-foreground ring-1 ring-inset ring-white/[0.08] transition-[background-color,color,box-shadow] duration-150 ease-out hover:bg-white/[0.09] hover:text-foreground hover:ring-white/[0.12]"
            >
              Show {Math.min(PAGE_SIZE, filtered.length - visibleCount)} more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative min-w-0 flex-1">
      <Search
        aria-hidden
        strokeWidth={1.75}
        className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        placeholder="Search paths, tags, authors…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search paths"
        className="h-[var(--ui-h-input)] w-full rounded-lg bg-white/[0.06] pl-9 pr-3.5 text-body text-foreground outline-none ring-1 ring-inset ring-white/[0.08] transition-[background-color,box-shadow] duration-150 ease-out placeholder:text-muted-foreground hover:bg-white/[0.09] hover:ring-white/[0.12] focus-visible:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-primary/50"
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

function PathCard({ path }: { path: Path }) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-lg bg-background/40 p-4 ring-1 ring-inset ring-white/[0.06] transition-[background-color,box-shadow] duration-150 ease-out hover:bg-background/60 hover:ring-white/[0.10]">
      <div className="flex items-center justify-between gap-2 text-body">
        <span className="text-muted-foreground">
          {PATH_KIND_LABELS[path.kind]}
        </span>
        <StatusBadge status={path.status} />
      </div>

      <div className="flex flex-col gap-0.5">
        <h3 className="text-body font-semibold text-foreground">{path.name}</h3>
        <span className="text-body text-muted-foreground">{path.author}</span>
      </div>

      <p className="line-clamp-2 text-body text-muted-foreground">
        {path.description}
      </p>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-body">
        <Stat label="Installs" value={path.installs.toLocaleString()} />
        {path.yieldPct && <Stat label="APY" value={path.yieldPct} />}
        <Stat label="Reward" value={path.ownerReward} />
      </div>

      {path.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {path.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-body text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        aria-label={`Install ${path.name}`}
        className="group/install relative mt-auto inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-primary py-2 text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.96]"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-white/40 to-transparent"
        />
        <span className="relative">
          {path.cost === "0 PROMPT" ? "Install" : `Install · ${path.cost}`}
        </span>
      </button>
    </article>
  );
}

function StatusBadge({ status }: { status: PathStatus }) {
  return (
    <span
      className={cn(
        "rounded-md px-1.5 py-0.5 text-body",
        STATUS_TONES[status],
      )}
    >
      {PATH_STATUS_LABELS[status]}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <p className="text-body text-foreground">No paths match.</p>
      <p className="max-w-xs text-body text-muted-foreground">
        Try clearing the filters or submit a new path to the catalog.
      </p>
      <Link
        href={CREATE_PATH_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 rounded-md bg-primary/15 px-3 py-1.5 text-body font-semibold text-primary ring-1 ring-inset ring-primary/20 transition-colors hover:bg-primary/20"
      >
        Submit a path ↗
      </Link>
    </div>
  );
}
