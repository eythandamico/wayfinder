"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Coins,
  Download,
  Info,
  Search,
  Share2,
  Shield,
  Star,
  TrendingUp,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PATH_KIND_LABELS,
  PATH_STATUS_LABELS,
  PATHS,
  type Path,
  type PathKind,
  type PathStatus,
} from "@/lib/paths";
import { pathHeroUrl } from "@/lib/path-artwork";
import { useChatSession } from "../_state/chat-context";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const KIND_DESCRIPTIONS: Record<PathKind, string> = {
  strategy: "Automated trading strategies tuned for any market.",
  skill: "Reusable capabilities your agent can call mid-conversation.",
  monitor: "Real-time alerts on markets, positions, and signals.",
  policy: "Risk guards and execution rules that keep you in bounds.",
  script: "One-shot snippets and small workflow automations.",
  tool: "Utilities your other paths can wire together.",
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
    bg: "bg-surface-1",
    tint: "from-white/[0.10]",
    icon: Code2,
    iconClass: "text-muted-foreground",
  },
  tool: {
    bg: "bg-surface-1",
    tint: "from-white/[0.10]",
    icon: Wrench,
    iconClass: "text-muted-foreground",
  },
};

const CATEGORY_GRID_DISCOVER = "grid grid-cols-2 sm:grid-cols-4 gap-3";

/* ------------------------------------------------------------------ */
/*  Main panel — owns tab state, threads to sub-views                  */
/* ------------------------------------------------------------------ */

export function ExplorePathsPanel() {
  const [tab, setTab] = useState<"discover" | "library">("discover");
  const [selectedKind, setSelectedKind] = useState<PathKind | null>(null);
  const [selectedPath, setSelectedPath] = useState<Path | null>(null);
  const { paths: installedPaths } = useChatSession();

  // Switching tabs clears any in-flight drill-in so the user lands on
  // the tab's own root view, not someone else's PathDetail. selectedPath
  // is rendered the same way in both tabs' branches below, so the back
  // chevron naturally returns to whichever tab was active.
  const goToTab = (next: "discover" | "library") => {
    setTab(next);
    setSelectedPath(null);
    setSelectedKind(null);
  };

  return (
    <div
      id="shells-view-explore"
      role="tabpanel"
      aria-label="Paths catalog"
      className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-surface-1 ring-1 ring-inset ring-white/[0.06]"
    >
      <div className="scroll-thin flex-1 overflow-y-auto">
        {/* Sticky tab strip — full panel width with a backdrop blur
            so scrolling content fades behind it instead of butting up
            against an opaque header. Tab buttons themselves align with
            the max-w-5xl content cap below. */}
        <div className="sticky top-0 z-10 border-b border-white/[0.05] bg-surface-1/85 backdrop-blur">
          <div className="mx-auto max-w-5xl px-6 sm:px-10 lg:px-12">
            <div role="tablist" aria-label="Paths views" className="flex items-center gap-1">
              <PathsTabButton
                active={tab === "discover"}
                onClick={() => goToTab("discover")}
              >
                Discover
              </PathsTabButton>
              <PathsTabButton
                active={tab === "library"}
                onClick={() => goToTab("library")}
                count={installedPaths.length}
              >
                Library
              </PathsTabButton>
            </div>
          </div>
        </div>

        <div className="px-6 pb-10 pt-8 sm:px-10 lg:px-12">
          {/* Cap reading width at ~1024px and center within the panel.
              Same comfortable ceiling Stripe / Linear / Notion docs
              settle on — listing + category views stop sprawling on
              ultrawides and the detail view's own max-w-5xl becomes a
              no-op under this wrapper. */}
          <div className="mx-auto w-full max-w-5xl">
            {selectedPath ? (
              <PathDetail
                path={selectedPath}
                onBack={() => setSelectedPath(null)}
              />
            ) : tab === "library" ? (
              <LibraryView
                onSelectPath={setSelectedPath}
                onSwitchToDiscover={() => goToTab("discover")}
              />
            ) : selectedKind ? (
              <CategoryView
                kind={selectedKind}
                onBack={() => setSelectedKind(null)}
                onSelectPath={setSelectedPath}
              />
            ) : (
              <DiscoverView
                onSelectKind={setSelectedKind}
                onSelectPath={setSelectedPath}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab strip                                                          */
/* ------------------------------------------------------------------ */

function PathsTabButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative px-3 py-3 text-body font-medium transition-[color,scale] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.96]",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        {typeof count === "number" && (
          <span className="tabular-nums text-muted-foreground">
            · {count}
          </span>
        )}
      </span>
      {active && (
        <span aria-hidden className="absolute inset-x-3 -bottom-px h-px bg-foreground" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Library — installed paths management surface                       */
/* ------------------------------------------------------------------ */

/**
 * The Library tab body. Dense list, not a grid — installed paths are
 * functional inventory the user manages, not browsable merchandise.
 * Row click opens PathDetail; the trailing Uninstall icon removes the
 * path from the user's collection. Search filters by name or author.
 *
 * Pause/Resume + last-used metadata were considered but cut for v1
 * because the Path type doesn't carry the backing fields yet
 * (`status` here is the bonded/curve life-cycle, not active/paused).
 * Add when the data model grows.
 */
function LibraryView({
  onSelectPath,
  onSwitchToDiscover,
}: {
  onSelectPath: (p: Path) => void;
  onSwitchToDiscover: () => void;
}) {
  const { paths, setPaths } = useChatSession();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return paths;
    return paths.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.author.toLowerCase().includes(q),
    );
  }, [paths, query]);

  const uninstall = (id: string) =>
    setPaths((prev) => prev.filter((p) => p.id !== id));

  if (paths.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-center">
        <p className="text-body text-foreground">
          No paths installed yet.
        </p>
        <button
          type="button"
          onClick={onSwitchToDiscover}
          className="text-body font-semibold text-foreground underline-offset-2 transition-colors duration-150 ease-out hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Browse Discover →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <LibrarySearchInput value={query} onChange={setQuery} />
      {filtered.length === 0 ? (
        <p className="px-3 py-10 text-center text-body text-muted-foreground">
          No installed paths match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/[0.04]">
          {filtered.map((p) => (
            <InstalledRow
              key={p.id}
              path={p}
              onOpen={() => onSelectPath(p)}
              onUninstall={() => uninstall(p.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function LibrarySearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md bg-surface-2 px-3 py-2 text-body text-foreground">
      <Search
        aria-hidden
        strokeWidth={1.75}
        className="size-4 shrink-0 text-muted-foreground"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search your library"
        aria-label="Search your installed paths"
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
        >
          <X strokeWidth={1.75} className="size-3.5" aria-hidden />
        </button>
      )}
    </label>
  );
}

function InstalledRow({
  path,
  onOpen,
  onUninstall,
}: {
  path: Path;
  onOpen: () => void;
  onUninstall: () => void;
}) {
  const tone = KIND_TONES[path.kind];
  const KindIcon = tone.icon;
  return (
    <li className="group relative flex items-center gap-3 px-2 py-3 transition-colors hover:bg-surface-2">
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${path.name}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:rounded-md"
      >
        <span
          aria-hidden
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md",
            tone.bg,
          )}
        >
          <KindIcon
            strokeWidth={1.75}
            className={cn("size-4", tone.iconClass)}
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <div className="flex items-center gap-2">
            <span className="truncate text-body font-medium text-foreground">
              {path.name}
            </span>
            <span className="shrink-0 rounded bg-surface-3 px-1.5 py-0.5 text-micro uppercase tracking-[0.1em] text-muted-foreground">
              {PATH_KIND_LABELS[path.kind]}
            </span>
          </div>
          <span className="truncate text-caption text-muted-foreground tabular-nums">
            {path.author} · v{path.version}
          </span>
        </div>
      </button>
      <button
        type="button"
        onClick={onUninstall}
        aria-label={`Uninstall ${path.name}`}
        title="Uninstall"
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-[opacity,background-color,color] duration-150 ease-out hover:bg-surface-3 hover:text-foreground focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 group-hover:opacity-100"
      >
        <X strokeWidth={1.75} className="size-4" aria-hidden />
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  Path detail screen — breadcrumb + title + tabs + meta + sidebar    */
/* ------------------------------------------------------------------ */

function PathDetail({
  path,
  onBack,
}: {
  path: Path;
  onBack: () => void;
}) {
  return (
    // Center the body and cap it on large screens. max-w-5xl (1024px)
    // is the comfortable content+sidebar ceiling — same column width
    // Stripe / Linear / Notion docs settle on for product detail
    // pages. Sidebar back to a more breathable 320px so the main
    // column stays around a 65-75ch reading width.
    <div className="mx-auto w-full max-w-5xl">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-body font-medium text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
      >
        <ArrowLeft strokeWidth={1.75} className="size-4" aria-hidden />
        Back
      </button>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)] lg:gap-10">
        {/* ---------- Main column ---------- */}
        <div className="flex min-w-0 flex-col gap-8">
          {/* Breadcrumb row */}
          <div className="flex flex-wrap items-center gap-3 text-body">
            <span className="text-muted-foreground">Paths</span>
            <span className="text-muted-foreground">/</span>
            <span className="truncate text-primary">{path.name}</span>
            <StatusVersionChip status={path.status} version={path.version} />
          </div>

          {/* Title + description + author */}
          <div className="flex min-w-0 flex-col gap-3">
            <h2 className="text-balance font-heading text-display font-semibold leading-tight text-foreground">
              {path.name}
            </h2>
            <p className="max-w-3xl text-pretty text-body leading-relaxed text-muted-foreground">
              {path.description}
            </p>
            <p className="text-body text-muted-foreground">
              by{" "}
              <span className="text-foreground">{path.author}</span>
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            <TagChip>{PATH_KIND_LABELS[path.kind]}</TagChip>
            {path.tags.map((t) => (
              <TagChip key={t}>{t}</TagChip>
            ))}
          </div>

          {/* Tab strip — decorative until each tab has real content */}
          <div className="flex items-center gap-1 border-b border-white/[0.05]">
            <DetailTab active label="Overview" />
            <DetailTab label="Install" />
            <DetailTab label="Files & Versions" />
          </div>

          {/* Live applet row */}
          <div className="flex items-center justify-between rounded-xl bg-white/[0.03] p-4 ring-1 ring-inset ring-white/[0.06]">
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="text-body font-semibold text-foreground">
                Live applet
              </span>
              <span className="text-body text-muted-foreground tabular-nums">
                v{path.version}
              </span>
            </div>
            <ChevronDown
              strokeWidth={1.75}
              className="size-4 text-muted-foreground"
              aria-hidden
            />
          </div>

          {/* Kind card */}
          <div className="rounded-xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.06]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <h4 className="text-title font-semibold lowercase text-foreground">
                  {PATH_KIND_LABELS[path.kind]}
                </h4>
                <p className="text-body text-muted-foreground">
                  {KIND_DESCRIPTIONS[path.kind]}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-1.5 text-body text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
              >
                <Info strokeWidth={1.75} className="size-4" aria-hidden />
                About types
              </button>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailMetricCell label="Export targets" value="Available" />
              <DetailMetricCell label="Collections" value="0" />
            </div>
          </div>

          {/* Creator */}
          <div className="rounded-xl bg-white/[0.03] p-5 ring-1 ring-inset ring-white/[0.06]">
            <div className="font-mono text-caption uppercase tracking-[0.18em] text-muted-foreground">
              Creator
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="truncate text-body text-foreground">
                {path.author}
              </span>
              <button
                type="button"
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-surface-2 px-3 text-body font-medium text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-4 active:scale-[0.96]"
              >
                Follow
              </button>
            </div>
          </div>
        </div>

        {/* ---------- Sidebar ---------- */}
        <aside className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-col overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06]">
            {/* Card-top header strip — generative path artwork at a
                trimmed 16/7 aspect so it reads as a header for the
                Install action below, not a full hero. */}
            <div className="relative aspect-[16/7] w-full overflow-hidden">
              <GenerativeBanner path={path} width={520} height={228} />
            </div>
            <div className="flex flex-col gap-5 p-5">
              <div className="flex flex-col gap-2">
              <button
                type="button"
                className="group relative inline-flex h-11 w-full items-center justify-center overflow-hidden rounded-md bg-primary text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.98]"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-white/40 to-transparent"
                />
                <span className="relative">Install this path</span>
              </button>
              <p className="text-center text-body tabular-nums text-muted-foreground">
                {path.installs.toLocaleString()} installs so far
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <SidebarAction icon={Share2} label="Share" />
              <SidebarAction icon={Coins} label="Stake" />
            </div>
            <div className="h-px bg-surface-1" />
            <dl className="flex flex-col gap-3">
              <DetailStat label="Owner bond" value={path.ownerReward} />
              <DetailStat label="Community stake" value={path.communityReward} />
              <DetailStat label="Bonded live version" value={path.version} />
              <DetailStat
                label="Yield"
                value={path.yieldPct ?? "—"}
                accent={!!path.yieldPct}
              />
            </dl>
            </div>
          </div>
          <button
            type="button"
            aria-label="Download bundle"
            className="inline-flex size-9 items-center justify-center rounded-md bg-surface-1 text-muted-foreground ring-1 ring-inset ring-white/[0.06] transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-3 hover:text-foreground active:scale-[0.96]"
          >
            <Download strokeWidth={1.75} className="size-4" aria-hidden />
          </button>
        </aside>
      </div>
    </div>
  );
}

function StatusVersionChip({
  status,
  version,
}: {
  status: PathStatus;
  version: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-2.5 py-1 text-body">
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          status === "bonded"
            ? "bg-primary shadow-[0_0_6px_var(--primary)]"
            : status === "pending-update"
              ? "bg-amber-300"
              : status === "probation"
                ? "bg-tone-down"
                : "bg-muted-foreground/50",
        )}
      />
      <span className="text-foreground">{PATH_STATUS_LABELS[status]}</span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground tabular-nums">v{version}</span>
    </span>
  );
}

function TagChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface-1 px-3 py-1 text-body text-muted-foreground">
      {children}
    </span>
  );
}

function DetailTab({ active = false, label }: { active?: boolean; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "relative px-3 py-2.5 text-body font-medium transition-colors duration-150 ease-out",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-3 bottom-0 h-px bg-primary"
        />
      )}
    </button>
  );
}

function DetailMetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-1 p-3 ring-1 ring-inset ring-white/[0.06]">
      <div className="text-body text-muted-foreground">{label}</div>
      <div className="mt-1 text-body font-semibold text-foreground">{value}</div>
    </div>
  );
}

function SidebarAction({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-surface-1 text-body text-foreground ring-1 ring-inset ring-white/[0.06] transition-[background-color,scale] duration-150 ease-out hover:bg-surface-3 active:scale-[0.97]"
    >
      <Icon strokeWidth={1.75} className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}

function DetailStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-body text-muted-foreground underline-offset-4 decoration-dotted">
        {label}
      </dt>
      <dd
        className={cn(
          "text-body tabular-nums",
          accent ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Discover view — hero + categories preview + popular preview        */
/* ------------------------------------------------------------------ */

function DiscoverView({
  onSelectKind,
  onSelectPath,
}: {
  onSelectKind: (k: PathKind) => void;
  onSelectPath: (p: Path) => void;
}) {
  const kindCounts = useKindCounts();
  const featured = useMemo(() => {
    // Editorial pool — top bonded paths by stars, one per carousel
    // slide. Deterministic so the page is stable on reload.
    const bonded = PATHS.filter((p) => p.status === "bonded");
    return [...bonded].sort((a, b) => b.stars - a.stars).slice(0, 5);
  }, []);
  const featuredIds = useMemo(
    () => new Set(featured.map((p) => p.id)),
    [featured],
  );
  const chartColumns = useMemo(() => {
    const pool = PATHS.filter((p) => !featuredIds.has(p.id));
    return [
      {
        id: "weekly",
        title: "Top this week",
        paths: [...pool]
          .sort((a, b) => b.weeklyInstalls - a.weeklyInstalls)
          .slice(0, 5),
      },
      {
        id: "yield",
        // Yield is a different axis than the featured carousel (which is
        // editorial / star-based). High-yield paths often overlap with the
        // featured set, so exclude-featured here would gut the column —
        // pull from the full PATHS pool instead.
        title: "Highest yield",
        paths: [...PATHS]
          .filter((p) => !!p.yieldPct)
          .sort(
            (a, b) => parseFloat(b.yieldPct ?? "0") - parseFloat(a.yieldPct ?? "0"),
          )
          .slice(0, 5),
      },
    ];
  }, [featuredIds]);

  const categoryKinds: PathKind[] = [
    "strategy",
    "skill",
    "monitor",
    "policy",
  ];

  return (
    <>
      <section className="relative pb-16">
        <FeatureCarousel paths={featured} onSelectPath={onSelectPath} />
      </section>

      <div className="mt-14">
        <TopChartGroup columns={chartColumns} onSelectPath={onSelectPath} />
      </div>

      <SectionHeader title="Categories" />
      <div className={CATEGORY_GRID_DISCOVER}>
        {categoryKinds.map((k) => (
          <CategoryCard
            key={k}
            kind={k}
            count={kindCounts[k]}
            onSelect={() => onSelectKind(k)}
          />
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Featured hero — single editorial PATH with artwork slot            */
/* ------------------------------------------------------------------ */

/** App Store-style "Featured" card. Left side carries the editorial
 *  copy (eyebrow, name, author, tagline, Install + stats), right side
 *  reserves a wide artwork slot.
 *
 *  When path.artwork.hero is set we render that image full-bleed.
 *  When it's missing we fall back to a kind-tone gradient with a
 *  giant low-alpha kind glyph — so the slot reads as intentional
 *  branding, not "image coming soon". */
/** Auto-rotating carousel that shows pairs of featured paths. Cycles
 *  to the next pair every CAROUSEL_INTERVAL_MS, pauses on hover, and
 *  respects prefers-reduced-motion (auto-advance off, dots still work). */
const CAROUSEL_INTERVAL_MS = 7000;

function FeatureCarousel({
  paths,
  onSelectPath,
}: {
  paths: Path[];
  onSelectPath: (p: Path) => void;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (paused || reducedMotion || paths.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % paths.length);
    }, CAROUSEL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paused, reducedMotion, paths.length]);

  if (paths.length === 0) return null;
  if (paths.length === 1) {
    return (
      <FeatureHero
        path={paths[0]}
        onSelect={() => onSelectPath(paths[0])}
      />
    );
  }

  const goPrev = () => setIndex((i) => (i - 1 + paths.length) % paths.length);
  const goNext = () => setIndex((i) => (i + 1) % paths.length);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
    }
  };

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured paths"
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKeyDown}
      className="group/carousel rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {/* Slide takes the full content width — arrows hang into the
       *  panel's outer padding gutter via absolute positioning so the
       *  card stays the same width as the rest of the page. Arrows
       *  hide below md where the gutter is too tight to host them
       *  cleanly; users still have dots + touch swipe. */}
      <div className="relative">
        <div className="overflow-hidden rounded-2xl">
          <div
            className="flex transition-transform duration-500 ease-[var(--ease-strong,cubic-bezier(0.2,0,0,1))]"
            style={{ transform: `translateX(-${index * 100}%)` }}
            aria-live="off"
          >
            {paths.map((p, i) => (
              <div
                key={p.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${i + 1} of ${paths.length}`}
                aria-hidden={i !== index}
                className="w-full shrink-0"
              >
                <FeatureHero
                  path={p}
                  onSelect={() => onSelectPath(p)}
                />
              </div>
            ))}
          </div>
        </div>
        <CarouselArrow side="left" onClick={goPrev} />
        <CarouselArrow side="right" onClick={goNext} />
      </div>
      <div className="mt-5 flex justify-center gap-2">
        {paths.map((p, i) => (
          <button
            key={p.id}
            type="button"
            aria-label={`Show slide ${i + 1}`}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            className={cn(
              "h-2 rounded-full transition-[width,background-color] duration-300 ease-out",
              i === index
                ? "w-8 bg-foreground"
                : "w-2 bg-foreground/25 hover:bg-foreground/55",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Circular prev/next button that fades in on carousel hover or focus. */
function CarouselArrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={`${side === "left" ? "Previous" : "Next"} slide`}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface-2 text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-3 active:scale-[0.96] md:inline-flex",
        side === "left" ? "-left-14" : "-right-14",
      )}
    >
      <Icon strokeWidth={2} className="size-4" aria-hidden />
    </button>
  );
}

function useReducedMotion() {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefers(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefers(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return prefers;
}

function FeatureHero({
  path,
  onSelect,
}: {
  path: Path;
  onSelect: () => void;
}) {
  const tone = KIND_TONES[path.kind];
  const eyebrowKind = PATH_KIND_LABELS[path.kind].toUpperCase();
  const tagline = path.artwork?.tagline ?? path.description;
  return (
    <section className="group/feature relative overflow-hidden rounded-2xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] transition-[background-color,box-shadow] duration-200 ease-out hover:bg-surface-1 hover:ring-white/[0.10]">
      <div className="grid grid-cols-1 items-stretch sm:grid-cols-[1fr_minmax(0,40%)]">
        <div className="flex min-w-0 flex-col justify-between gap-6 p-6 sm:p-7">
          <div className="flex min-w-0 flex-col gap-3">
            <span
              className={cn(
                "font-mono text-caption uppercase tracking-[0.22em]",
                tone.iconClass,
              )}
            >
              Featured · {eyebrowKind}
            </span>
            <h2 className="text-balance font-heading text-display font-semibold leading-[1.05] text-foreground">
              {path.name}
            </h2>
            <p className="text-body text-muted-foreground">by {path.author}</p>
            <p className="mt-2 line-clamp-2 text-pretty text-body leading-relaxed text-muted-foreground">
              {tagline}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative z-10">
              <button
                type="button"
                aria-label={`Install ${path.name}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-surface-3 px-4 text-body font-semibold text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-2 active:scale-[0.96]"
              >
                <Download strokeWidth={2} className="size-3.5" aria-hidden />
                Install
              </button>
            </div>
            <div className="flex items-center gap-4 text-body text-muted-foreground">
              {path.yieldPct && (
                <span className="tabular-nums text-primary">{path.yieldPct}</span>
              )}
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Star
                  strokeWidth={0}
                  fill="currentColor"
                  className="size-3.5"
                  aria-hidden
                />
                {path.stars.toLocaleString()}
              </span>
              <span className="tabular-nums">
                {COMPACT.format(path.installs)} installs
              </span>
            </div>
          </div>
        </div>
        <div className="relative aspect-[5/4] w-full overflow-hidden sm:aspect-auto sm:min-h-[280px]">
          <GenerativeBanner path={path} width={1280} height={1024} />
          {/* Inner edge fade so the artwork blends into the text column. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-card to-transparent sm:from-[color-mix(in_oklch,var(--card)_92%,transparent)]"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Open ${path.name} details`}
        className="absolute inset-0 rounded-2xl"
      />
    </section>
  );
}

/** Procedural artwork shown when a featured path has no artwork.hero.
 *  Tone-colored field with a large low-alpha kind icon offset to the
 *  bottom-right — same vocabulary as PathCardHeader, scaled way up so
 *  it carries the hero slot on its own. */
function FeatureHeroFallback({ kind }: { kind: PathKind }) {
  const tone = KIND_TONES[kind];
  const Icon = tone.icon;
  return (
    <div className={cn("relative h-full w-full", tone.bg)}>
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-gradient-to-br to-transparent opacity-90",
          tone.tint,
        )}
      />
      <Icon
        strokeWidth={1}
        className={cn(
          "absolute -bottom-16 -right-12 size-[24rem] opacity-30",
          tone.iconClass,
        )}
        aria-hidden
      />
    </div>
  );
}

/** Banner that lazily fetches a Pollinations-generated image and
 *  crossfades it in over the procedural kind-tone fallback. While the
 *  image is loading, a shimmer band sweeps across the slot so the
 *  user can tell something's coming — distinguishes "still loading"
 *  from "this is the final state". Drop in inside any positioned
 *  parent (it fills via absolute children). */
function GenerativeBanner({
  path,
  width,
  height,
}: {
  path: Path;
  width: number;
  height: number;
}) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");
  return (
    <>
      <FeatureHeroFallback kind={path.kind} />
      {state === "loading" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <span className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/[0.10] to-transparent animate-shimmer" />
        </span>
      )}
      <img
        src={pathHeroUrl(path, width, height)}
        alt=""
        loading="lazy"
        className={cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ease-out",
          state === "loaded" ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Category card — text-forward tile with kind tone + CTA             */
/* ------------------------------------------------------------------ */

function CategoryCard({
  kind,
  count,
  onSelect,
}: {
  kind: PathKind;
  count: number;
  onSelect: () => void;
}) {
  const tone = KIND_TONES[kind];
  const Icon = tone.icon;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Browse ${PATH_KIND_LABELS[kind]} paths`}
      className={cn(
        "group relative flex h-full flex-col items-start gap-3 overflow-hidden rounded-xl bg-gradient-to-br to-transparent p-5 text-left transition-[transform,opacity] duration-200 ease-out hover:-translate-y-px hover:opacity-90 active:scale-[0.99]",
        tone.tint,
      )}
    >
      <span
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-md",
          tone.bg,
        )}
        aria-hidden
      >
        <Icon strokeWidth={1.75} className={cn("size-5", tone.iconClass)} />
      </span>
      <div className="flex flex-col gap-1">
        <h4 className="text-title font-semibold text-foreground">
          {PATH_KIND_LABELS[kind]}
        </h4>
        <p className="text-pretty text-body leading-relaxed text-muted-foreground">
          {KIND_DESCRIPTIONS[kind]}
        </p>
      </div>
      <span className="mt-auto inline-flex items-center gap-1 text-body font-medium text-muted-foreground">
        {count} {count === 1 ? "path" : "paths"}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Category drill-in view — grid of PathCards for one kind            */
/* ------------------------------------------------------------------ */

function CategoryView({
  kind,
  onBack,
  onSelectPath,
}: {
  kind: PathKind;
  onBack: () => void;
  onSelectPath: (p: Path) => void;
}) {
  const tone = KIND_TONES[kind];
  const Icon = tone.icon;
  const paths = useMemo(() => PATHS.filter((p) => p.kind === kind), [kind]);
  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-body font-medium text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground"
      >
        <ArrowLeft strokeWidth={1.75} className="size-4" aria-hidden />
        Back to Discover
      </button>
      <div className="mt-6 flex items-center gap-4">
        <span
          className={cn(
            "inline-flex size-14 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ring-white/[0.06]",
            tone.bg,
          )}
          aria-hidden
        >
          <Icon strokeWidth={1.5} className={cn("size-7", tone.iconClass)} />
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 className="font-heading text-display font-semibold leading-tight text-foreground">
            {PATH_KIND_LABELS[kind]}
          </h2>
          <p className="text-body text-muted-foreground">
            {KIND_DESCRIPTIONS[kind]}
          </p>
        </div>
        <span className="ml-auto text-body tabular-nums text-muted-foreground">
          {paths.length} {paths.length === 1 ? "path" : "paths"}
        </span>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paths.map((p) => (
          <PathCard key={p.id} path={p} onSelect={() => onSelectPath(p)} />
        ))}
      </div>
    </>
  );
}

/** Compact path card used inside CategoryView's grid. Icon emblem +
 *  name + author + 2-line description + stats + Install.
 *
 *  Clicking anywhere on the card drills into PathDetail via an
 *  absolute overlay button. The inline Install button sits in a
 *  relative z-10 wrapper so its clicks aren't captured by the overlay. */
function PathCard({ path, onSelect }: { path: Path; onSelect: () => void }) {
  const tone = KIND_TONES[path.kind];
  const Icon = tone.icon;
  return (
    <article className="group/path relative flex h-full flex-col overflow-hidden rounded-xl bg-white/[0.02] ring-1 ring-inset ring-white/[0.06] transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-px hover:bg-surface-1 hover:ring-white/[0.10]">
      {/* Banner — generative image with a sweep shimmer while it loads. */}
      <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-white/[0.05]">
        <GenerativeBanner path={path} width={800} height={450} />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "relative inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md",
            tone.bg,
          )}
        >
          {path.artwork?.icon ? (
            <img
              src={path.artwork.icon}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Icon strokeWidth={1.5} className={cn("size-6", tone.iconClass)} />
          )}
        </span>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <h4 className="truncate text-title font-semibold text-foreground">
            {path.name}
          </h4>
          <span className="truncate text-body text-muted-foreground">
            {path.author}
          </span>
        </div>
      </div>
      <p className="line-clamp-2 text-pretty text-body leading-relaxed text-muted-foreground">
        {path.description}
      </p>
      <div className="mt-auto flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body text-muted-foreground">
          {path.yieldPct && (
            <span className="tabular-nums text-primary">{path.yieldPct}</span>
          )}
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Star
              strokeWidth={0}
              fill="currentColor"
              className="size-3"
              aria-hidden
            />
            {path.stars.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Download strokeWidth={1.6} className="size-3" aria-hidden />
            {path.installs.toLocaleString()}
          </span>
        </div>
        <div className="relative z-10">
          <button
            type="button"
            aria-label={`Install ${path.name}`}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-primary/15 px-3 text-body font-medium text-primary transition-colors duration-150 ease-out hover:bg-primary/25"
          >
            <Download strokeWidth={1.75} className="size-3.5" aria-hidden />
            Install
          </button>
        </div>
      </div>
      </div>
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Open ${path.name} details`}
        className="absolute inset-0 rounded-xl"
      />
    </article>
  );
}

/* ------------------------------------------------------------------ */
/*  Top chart list — numbered 1-N ranking, App Store signature shape   */
/* ------------------------------------------------------------------ */

/** Numbered ranking list. Caller passes paths in chart order; this
 *  component just draws the rows. Big numerals, square emblems
 *  (using path.artwork.icon when set, falling back to a kind tile),
 *  hairline dividers, single Install per row. */

/** Three-up parallel chart layout (App Store's "Top Free / Paid /
 *  Grossing" pattern). On wide screens the columns sit side-by-side
 *  so the eye can compare three ranking axes at once; on narrow they
 *  stack. Each column carries its own title + sub-title so the axis
 *  is obvious without a parent header. */
function TopChartGroup({
  columns,
  onSelectPath,
}: {
  columns: Array<{ id: string; title: string; subtitle?: string; paths: Path[] }>;
  onSelectPath: (p: Path) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-14 gap-y-10 md:grid-cols-2 xl:gap-x-20">
      {columns.map((col) => (
        <div key={col.id} className="flex flex-col">
          <h4 className="font-heading text-title font-semibold leading-tight text-foreground">
            {col.title}
          </h4>
          {col.subtitle && (
            <p className="mt-0.5 text-body text-muted-foreground">
              {col.subtitle}
            </p>
          )}
          <div
            role="list"
            aria-label={col.title}
            className="mt-3 flex flex-col divide-y divide-white/[0.04]"
          >
            {col.paths.map((p, i) => (
              <TopChartRow
                key={p.id}
                path={p}
                rank={i + 1}
                onSelect={() => onSelectPath(p)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TopChartRow({
  path,
  rank,
  onSelect,
}: {
  path: Path;
  rank: number;
  onSelect: () => void;
}) {
  const tone = KIND_TONES[path.kind];
  const Icon = tone.icon;
  return (
    <div
      role="listitem"
      className="group/row relative flex items-center gap-4 px-3 py-4 transition-colors hover:bg-white/[0.025]"
    >
      <span
        aria-hidden
        className="w-7 shrink-0 text-center font-heading text-[clamp(20px,1.4vw,26px)] font-semibold tabular-nums leading-none text-foreground"
      >
        {rank}
      </span>
      <div
        className={cn(
          "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md",
          tone.bg,
        )}
        aria-hidden
      >
        {path.artwork?.icon ? (
          <img
            src={path.artwork.icon}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <Icon strokeWidth={1.5} className={cn("size-5", tone.iconClass)} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-body font-semibold text-foreground">
          {path.name}
        </span>
        <span className="truncate text-body text-muted-foreground">
          <span className={tone.iconClass}>{PATH_KIND_LABELS[path.kind]}</span>
          {" · "}
          {path.author}
        </span>
      </div>
      <div className="relative z-10">
        <button
          type="button"
          aria-label={`Install ${path.name}`}
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-surface-2 px-3 text-body font-medium text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-4 active:scale-[0.96]"
        >
          Install
        </button>
      </div>
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Open ${path.name} details`}
        className="absolute inset-0"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section header — title + optional subtitle + "See all" link        */
/* ------------------------------------------------------------------ */

function SectionHeader({
  title,
  subtitle,
  count,
  onSeeAll,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  onSeeAll?: () => void;
}) {
  return (
    <div className="mb-5 mt-14 flex items-end justify-between gap-3 first:mt-0">
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-[clamp(20px,1.6vw,26px)] font-semibold leading-tight text-foreground">
          {title}
          {count !== undefined && (
            <span className="ml-2 text-body font-normal tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </h3>
        {subtitle && (
          <p className="text-body text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {onSeeAll && (
        <button
          type="button"
          onClick={onSeeAll}
          className="shrink-0 self-center text-body font-semibold text-primary transition-colors duration-150 ease-out hover:text-primary/80"
        >
          See all
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

function useKindCounts() {
  return useMemo(() => {
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
}
