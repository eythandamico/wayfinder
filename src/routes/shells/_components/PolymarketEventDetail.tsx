"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Pill, Skeleton } from "@/components/ui";
import {
  usePredictionTicket,
  type PredictionTarget,
} from "../_state/shells-context";
import type {
  DetailMarket,
  DetailOutcome,
  NormalizedEventDetail,
} from "@/api/polymarket/event";
import type { MarketHistoryPoint } from "@/api/polymarket/market-history";

const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const END_DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

/* ================================================================== */
/*  Sports tab grouping                                                 */
/* ================================================================== */

/** Maps a Polymarket sportsMarketType into the tab + section it should
 *  render under. Polymarket exposes ~20 different types per game; we
 *  collapse to the 5 tabs that show up on their UI plus an "Other" bucket
 *  for the long tail (odd/even, "team to score first", etc.). */
const SPORTS_TAB_MAP: Record<string, { tab: SportsTab; section: string }> = {
  moneyline: { tab: "game-lines", section: "Moneyline" },
  spreads: { tab: "game-lines", section: "Spreads" },
  totals: { tab: "game-lines", section: "Totals" },
  first_half_moneyline: { tab: "1st-half", section: "Moneyline" },
  first_half_spreads: { tab: "1st-half", section: "Spreads" },
  first_half_totals: { tab: "1st-half", section: "Totals" },
  points: { tab: "points", section: "Player Points" },
  assists: { tab: "assists", section: "Player Assists" },
  rebounds: { tab: "rebounds", section: "Player Rebounds" },
};

type SportsTab =
  | "game-lines"
  | "1st-half"
  | "points"
  | "assists"
  | "rebounds"
  | "other";

const SPORTS_TAB_LABELS: Record<SportsTab, string> = {
  "game-lines": "Game Lines",
  "1st-half": "1st Half",
  points: "Points",
  assists: "Assists",
  rebounds: "Rebounds",
  other: "Other",
};

/* ================================================================== */
/*  Component                                                            */
/* ================================================================== */

export function PolymarketEventDetail({
  eventId,
  onBack,
}: {
  eventId: string;
  onBack: () => void;
}) {
  const { event, loading, error } = useEventDetail(eventId);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.05] px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to markets"
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-2 hover:text-foreground active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
        <span className="truncate text-body font-medium text-foreground">
          {event?.title ?? "Loading…"}
        </span>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {loading && !event && <DetailSkeleton />}
        {error && !event && (
          <EmptyState message={`Couldn't load market (${error}).`} />
        )}
        {event && <DetailBody event={event} />}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-3">
      <Skeleton className="h-32" />
      <Skeleton className="h-20" />
      <Skeleton className="h-40" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data hook                                                            */
/* ------------------------------------------------------------------ */

type DetailState = {
  event: NormalizedEventDetail | null;
  loading: boolean;
  error: string | null;
};

function useEventDetail(eventId: string): DetailState {
  const [state, setState] = useState<DetailState>({
    event: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // AbortController aborts the HTTP request itself (not just the
    // state setter) when eventId changes or the component unmounts —
    // saves the response body drain that the previous `cancelled`-
    // flag-only pattern was paying for.
    const controller = new AbortController();
    fetch(`/api/polymarket/event?id=${encodeURIComponent(eventId)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json() as Promise<{ event?: NormalizedEventDetail; error?: string }>)
      .then(
        (data) => {
          setState({
            event: data.event ?? null,
            loading: false,
            error: data.error ?? null,
          });
        },
      )
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          event: null,
          loading: false,
          error: err instanceof Error ? err.message : "fetch failed",
        });
      });
    return () => controller.abort();
  }, [eventId]);

  return state;
}

/* ------------------------------------------------------------------ */
/*  Body                                                                 */
/* ------------------------------------------------------------------ */

function DetailBody({ event }: { event: NormalizedEventDetail }) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <DetailHero event={event} />
      <DetailSparkline event={event} />
      {event.shape === "sports" ? (
        <SportsMarkets event={event} />
      ) : event.shape === "binary" ? (
        <BinaryMarkets event={event} />
      ) : (
        <CategoricalMarkets event={event} />
      )}
      {event.context && (
        <Card padding="md" variant="ghost">
          <p className="text-caption leading-relaxed text-muted-foreground text-pretty">
            {event.context}
          </p>
        </Card>
      )}
    </div>
  );
}

function DetailHero({ event }: { event: NormalizedEventDetail }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-micro tabular-nums text-muted-foreground">
        {event.league && (
          <Pill tone="muted" size="sm">
            {event.league}
          </Pill>
        )}
        {event.shape === "sports" && event.state && (
          <SportsStatePill event={event} />
        )}
        <span className="ml-auto">${COMPACT.format(event.volume24h)} 24h</span>
      </div>
      {event.shape === "sports" && event.teams ? (
        <SportsTeamsHero event={event} />
      ) : (
        <div className="flex items-start gap-3">
          {event.image && (
            <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-surface-1 ring-1 ring-inset ring-white/[0.06]">
              <img
                src={event.image}
                alt={event.title}
                className="absolute inset-0 size-full object-cover"
              />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="text-balance text-body font-semibold text-foreground">
              {event.title}
            </h2>
            {event.endsAt && (
              <span className="text-caption tabular-nums text-muted-foreground">
                Ends {END_DATE_FMT.format(new Date(event.endsAt))}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SportsStatePill({ event }: { event: NormalizedEventDetail }) {
  if (event.state === "live") {
    return (
      <Pill tone="tone-down" size="sm" className="gap-1.5 uppercase">
        <span
          aria-hidden
          className="size-1.5 rounded-full bg-tone-down animate-pulse"
        />
        LIVE
      </Pill>
    );
  }
  if (event.state === "final") {
    return (
      <Pill tone="muted" size="sm" uppercase>
        FINAL
      </Pill>
    );
  }
  if (event.startsInMs != null && event.startsInMs > 0) {
    return (
      <Pill tone="muted" size="sm">
        {formatStartsIn(event.startsInMs)}
      </Pill>
    );
  }
  return null;
}

function SportsTeamsHero({ event }: { event: NormalizedEventDetail }) {
  const home = event.teams?.find((t) => t.ordering === "home") ?? event.teams?.[0];
  const away = event.teams?.find((t) => t.ordering === "away") ?? event.teams?.[1];
  const timeLabel = event.startTime
    ? END_DATE_FMT.format(new Date(event.startTime))
    : null;

  return (
    <div className="grid grid-cols-3 items-center gap-3 rounded-lg bg-white/[0.03] p-4">
      {home ? (
        <TeamPlate team={home} align="start" />
      ) : (
        <div />
      )}
      <div className="flex flex-col items-center text-center">
        {timeLabel ? (
          <span className="text-caption tabular-nums text-muted-foreground">
            {timeLabel}
          </span>
        ) : (
          <span className="text-caption text-muted-foreground">vs</span>
        )}
      </div>
      {away ? (
        <TeamPlate team={away} align="end" />
      ) : (
        <div />
      )}
    </div>
  );
}

function TeamPlate({
  team,
  align,
}: {
  team: NonNullable<NormalizedEventDetail["teams"]>[number];
  align: "start" | "end";
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 min-w-0",
        align === "start" ? "items-center" : "items-center",
      )}
    >
      <DetailTeamLogo team={team} />
      <span className="line-clamp-1 text-body font-medium text-foreground">
        {team.name}
      </span>
      {team.record && (
        <span className="text-caption tabular-nums text-muted-foreground">
          {team.record}
        </span>
      )}
    </div>
  );
}

function DetailTeamLogo({
  team,
}: {
  team: NonNullable<NormalizedEventDetail["teams"]>[number];
}) {
  const [errored, setErrored] = useState(false);
  if (!team.logo || errored) {
    return (
      <span
        aria-hidden
        className="grid size-12 place-items-center rounded-lg text-body font-semibold ring-1 ring-inset ring-black/20"
        style={{ background: team.color, color: pickFg(team.color) }}
      >
        {team.abbreviation.slice(0, 3).toUpperCase()}
      </span>
    );
  }
  return (
    <div
      className="grid size-12 place-items-center overflow-hidden rounded-lg ring-1 ring-inset ring-black/20"
      style={{ background: team.color }}
    >
      <img
        src={team.logo}
        alt=""
        width={48}
        height={48}
        className="size-full object-contain"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sparkline — YES price over the last week                            */
/* ------------------------------------------------------------------ */

function DetailSparkline({ event }: { event: NormalizedEventDetail }) {
  // Pick the market whose history is most representative.
  // Sports → moneyline. Binary → its only market. Categorical → top option.
  const headlineMarket = useMemo(() => {
    if (event.shape === "sports") {
      return event.markets.find((m) => m.sportsMarketType === "moneyline") ?? null;
    }
    if (event.shape === "binary") {
      return event.markets[0] ?? null;
    }
    const sorted = [...event.markets].sort(
      (a, b) => b.outcomes[0].price - a.outcomes[0].price,
    );
    return sorted[0] ?? null;
  }, [event]);

  const tokenId = headlineMarket?.outcomes[0].clobTokenId ?? null;
  const headlineLabel =
    headlineMarket?.groupItemTitle ??
    headlineMarket?.outcomes[0].label ??
    null;
  const headlinePrice = headlineMarket?.outcomes[0].price ?? 0;
  const headlineChange = headlineMarket?.priceChange24h ?? 0;
  const { history, loading } = useMarketHistory(tokenId);

  if (!headlineMarket) return null;

  return (
    <Card padding="md" variant="ghost">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-caption text-muted-foreground">
          {headlineLabel} · YES
        </span>
        <div className="inline-flex items-baseline gap-2">
          <span className="text-body font-semibold tabular-nums text-foreground">
            {Math.round(headlinePrice * 100)}¢
          </span>
          {Math.abs(headlineChange) > 0 && (
            <ChangeChip
              change={headlineChange}
              changeAbs={Math.abs(Math.round(headlineChange * 100))}
            />
          )}
        </div>
      </div>
      <div className="mt-2 h-[80px]">
        {loading && history.length === 0 ? (
          <Skeleton className="size-full" />
        ) : (
          <Sparkline points={history} />
        )}
      </div>
      <div className="mt-1 flex justify-between text-micro tabular-nums text-muted-foreground">
        <span>7d</span>
        <span>now</span>
      </div>
    </Card>
  );
}

function useMarketHistory(tokenId: string | null) {
  // When no token is available we render an empty/no-data state — the
  // loading flag only matters when there's actually something to fetch.
  const [state, setState] = useState<{
    history: MarketHistoryPoint[];
    loading: boolean;
  }>({ history: [], loading: !!tokenId });

  useEffect(() => {
    if (!tokenId) return;
    let cancelled = false;
    fetch(
      `/api/polymarket/market-history?token=${encodeURIComponent(tokenId)}&interval=1w`,
    )
      .then((r) => r.json() as Promise<{ history?: MarketHistoryPoint[] }>)
      .then((data) => {
        if (cancelled) return;
        setState({
          history: data.history ?? [],
          loading: false,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ history: [], loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [tokenId]);

  return state;
}

function Sparkline({ points }: { points: MarketHistoryPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="grid size-full place-items-center text-caption text-muted-foreground">
        No history yet.
      </div>
    );
  }
  const xs = points.map((p) => p.t);
  const ys = points.map((p) => p.p);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  // Pad y range so flat lines don't render as a single pixel.
  const yMin = Math.max(0, Math.min(...ys) - 0.02);
  const yMax = Math.min(1, Math.max(...ys) + 0.02);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 0.001;

  // Use a 100×40 viewBox; preserveAspectRatio=none stretches to fit.
  const W = 100;
  const H = 40;
  const pathData = points
    .map((p, i) => {
      const x = ((p.t - xMin) / xRange) * W;
      const y = H - ((p.p - yMin) / yRange) * H;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  // Fill polygon below the line for that "filled sparkline" feel.
  const lastX = W;
  const fillData = `${pathData} L ${lastX.toFixed(2)} ${H} L 0 ${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="size-full"
      role="img"
      aria-label="Price over time"
    >
      <defs>
        <linearGradient id="spark-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillData} fill="url(#spark-grad)" />
      <path
        d={pathData}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Sports — grouped tabs                                                */
/* ------------------------------------------------------------------ */

function SportsMarkets({ event }: { event: NormalizedEventDetail }) {
  // Group markets by tab.
  const byTab = useMemo(() => {
    const map = new Map<SportsTab, Map<string, DetailMarket[]>>();
    for (const m of event.markets) {
      const lookup = m.sportsMarketType
        ? SPORTS_TAB_MAP[m.sportsMarketType]
        : null;
      const tab = lookup?.tab ?? "other";
      const section = lookup?.section ?? humanizeMarketType(m.sportsMarketType);
      if (!map.has(tab)) map.set(tab, new Map());
      const sectionMap = map.get(tab)!;
      if (!sectionMap.has(section)) sectionMap.set(section, []);
      sectionMap.get(section)!.push(m);
    }
    return map;
  }, [event]);

  const tabs: SportsTab[] = (
    ["game-lines", "1st-half", "points", "assists", "rebounds", "other"] as const
  ).filter((t) => byTab.has(t));

  const [activeTab, setActiveTab] = useState<SportsTab>(
    tabs[0] ?? "game-lines",
  );

  if (tabs.length === 0) return null;

  const sections = byTab.get(activeTab) ?? new Map<string, DetailMarket[]>();

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Market category"
        className="scroll-none flex shrink-0 items-center gap-1 overflow-x-auto rounded-lg bg-white/[0.03] p-1"
      >
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={t === activeTab}
            onClick={() => setActiveTab(t)}
            className={cn(
              "h-8 shrink-0 rounded-md px-3 text-caption font-medium transition-[background-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
              t === activeTab
                ? "bg-surface-4 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {SPORTS_TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {Array.from(sections.entries()).map(([sectionLabel, markets]) => (
          <MarketSection
            key={sectionLabel}
            title={sectionLabel}
            markets={markets}
            eventMeta={event}
          />
        ))}
      </div>
    </div>
  );
}

function MarketSection({
  title,
  markets,
  eventMeta,
}: {
  title: string;
  markets: DetailMarket[];
  eventMeta: NormalizedEventDetail;
}) {
  // Sort by absolute line value (so closest-to-even spreads come first)
  // when this section has lines; otherwise preserve upstream order.
  const sorted = useMemo(() => {
    const hasLines = markets.some((m) => m.line != null);
    if (!hasLines) return markets;
    return [...markets].sort(
      (a, b) => Math.abs(a.line ?? 99) - Math.abs(b.line ?? 99),
    );
  }, [markets]);

  const totalVol = sorted.reduce((s, m) => s + m.volume24h, 0);

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-baseline justify-between gap-2 border-b border-white/[0.05] px-3 py-2">
        <span className="text-body font-medium text-foreground">{title}</span>
        {totalVol > 0 && (
          <span className="text-micro tabular-nums text-muted-foreground">
            ${COMPACT.format(totalVol)} Vol
          </span>
        )}
      </div>
      <div className="flex flex-col divide-y divide-white/[0.04]">
        {sorted.map((m) => (
          <SportsMarketRow key={m.id} market={m} eventMeta={eventMeta} />
        ))}
      </div>
    </Card>
  );
}

function SportsMarketRow({
  market,
  eventMeta,
}: {
  market: DetailMarket;
  eventMeta: NormalizedEventDetail;
}) {
  const { target, setTarget } = usePredictionTicket();
  // For a moneyline there's only one row per game; spread/total rows
  // have many sibling lines so we show the line label inline.
  const rowLabel = market.groupItemTitle ?? market.question;

  const buildTarget = (oc: DetailOutcome): PredictionTarget => ({
    eventId: eventMeta.id,
    eventTitle: eventMeta.title,
    eventImage: eventMeta.image,
    optionLabel: ocLabelForTicket(market, oc),
    optionIcon: market.icon ?? eventMeta.image,
    yesPrice: oc.price,
    initialSide: "yes",
  });

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <span className="line-clamp-1 min-w-0 flex-1 text-body text-foreground">
        {rowLabel}
      </span>
      <div className="flex shrink-0 items-center gap-1.5">
        {market.outcomes.map((oc, i) => {
          const pct = Math.round(oc.price * 100);
          const optionLabel = ocLabelForTicket(market, oc);
          const loaded =
            !!target &&
            target.eventId === eventMeta.id &&
            target.optionLabel === optionLabel;
          return (
            <button
              key={i}
              type="button"
              onClick={() => setTarget(buildTarget(oc))}
              aria-pressed={loaded}
              aria-label={`Buy ${optionLabel} at ${pct} cents`}
              className={cn(
                "inline-flex h-8 min-w-[5rem] items-center justify-between gap-1.5 rounded-md px-2.5 text-body font-semibold tabular-nums transition-[background-color,scale,box-shadow] duration-150 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                loaded
                  ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--color-primary)]"
                  : "bg-surface-1 text-foreground hover:bg-surface-4",
              )}
            >
              <span className="truncate text-caption font-medium opacity-75">
                {oc.label}
              </span>
              <span>{pct}¢</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Build the optionLabel string we store in PredictionTarget so the
 *  ticket header reads naturally — "Knicks Moneyline", "Knicks -2.5",
 *  "Over 216.5", "LeBron James Over 25.5 Points". */
function ocLabelForTicket(m: DetailMarket, oc: DetailOutcome): string {
  if (!m.sportsMarketType) return oc.label;
  if (m.sportsMarketType.endsWith("moneyline")) {
    const prefix = m.sportsMarketType.startsWith("first_half") ? "1H " : "";
    return `${prefix}${oc.label} ML`;
  }
  if (m.sportsMarketType.endsWith("spreads")) {
    // Both outcomes share the same |line| but the sign flips per side.
    // outcomes[0] is the favorite (negative line), outcomes[1] gets +line.
    const sign = oc.label === m.outcomes[0].label ? m.line ?? 0 : -(m.line ?? 0);
    const prefix = m.sportsMarketType.startsWith("first_half") ? "1H " : "";
    return `${prefix}${oc.label} ${formatSpread(sign)}`;
  }
  if (m.sportsMarketType.endsWith("totals")) {
    const prefix = m.sportsMarketType.startsWith("first_half") ? "1H " : "";
    return `${prefix}${oc.label} ${m.line ?? ""}`;
  }
  // Player props — question phrases the player + threshold already.
  return `${m.question}: ${oc.label}`;
}

function formatSpread(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}

function humanizeMarketType(t: string | null): string {
  if (!t) return "Other";
  return t
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/*  Categorical — full ranked list                                       */
/* ------------------------------------------------------------------ */

function CategoricalMarkets({ event }: { event: NormalizedEventDetail }) {
  const sorted = useMemo(
    () => [...event.markets].sort(
      (a, b) => b.outcomes[0].price - a.outcomes[0].price,
    ),
    [event],
  );
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-baseline justify-between gap-2 border-b border-white/[0.05] px-3 py-2">
        <span className="text-body font-medium text-foreground">
          All options
        </span>
        <span className="text-micro tabular-nums text-muted-foreground">
          {sorted.length}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-white/[0.04]">
        {sorted.map((m) => (
          <CategoricalRow key={m.id} market={m} eventMeta={event} />
        ))}
      </div>
    </Card>
  );
}

function CategoricalRow({
  market,
  eventMeta,
}: {
  market: DetailMarket;
  eventMeta: NormalizedEventDetail;
}) {
  const { target, setTarget } = usePredictionTicket();
  const yes = market.outcomes[0];
  const yesPct = Math.round(yes.price * 100);
  const label = market.groupItemTitle ?? yes.label;
  const change = market.priceChange24h;
  const changeAbs = Math.abs(Math.round(change * 100));
  const showChange = changeAbs > 0;
  const loaded =
    !!target &&
    target.eventId === eventMeta.id &&
    target.optionLabel === label;

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 px-3 py-2 transition-colors",
        loaded && "bg-primary/[0.08]",
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-primary/[0.06]"
        style={{ width: `${yesPct}%` }}
      />
      <OptionIcon icon={market.icon} label={label} />
      <span className="relative line-clamp-1 min-w-0 flex-1 text-body text-foreground">
        {label}
      </span>
      <div className="relative flex shrink-0 items-center gap-1.5">
        {showChange && !loaded && (
          <ChangeChip change={change} changeAbs={changeAbs} />
        )}
        <button
          type="button"
          onClick={() =>
            setTarget({
              eventId: eventMeta.id,
              eventTitle: eventMeta.title,
              eventImage: eventMeta.image,
              optionLabel: label,
              optionIcon: market.icon,
              yesPrice: yes.price,
              initialSide: "yes",
            })
          }
          aria-pressed={loaded}
          aria-label={`Buy YES on ${label} at ${yesPct} cents`}
          className={cn(
            "inline-flex h-8 min-w-[3.25rem] items-center justify-center rounded-md px-2 text-body font-semibold tabular-nums transition-[background-color,scale,box-shadow] duration-150 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            loaded
              ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--color-primary)]"
              : yesPct >= 50
                ? "bg-primary/15 text-primary hover:bg-primary/25"
                : "bg-surface-1 text-foreground hover:bg-surface-4",
          )}
        >
          {yesPct}¢
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Binary — Yes / No buttons                                            */
/* ------------------------------------------------------------------ */

function BinaryMarkets({ event }: { event: NormalizedEventDetail }) {
  const market = event.markets[0];
  const { target, setTarget } = usePredictionTicket();
  if (!market) return null;
  const yesPct = Math.round(market.outcomes[0].price * 100);
  const noPct = Math.round(market.outcomes[1].price * 100);
  const loadedYes =
    !!target && target.eventId === event.id && target.initialSide === "yes";
  const loadedNo =
    !!target && target.eventId === event.id && target.initialSide === "no";

  const buildTarget = (side: "yes" | "no"): PredictionTarget => ({
    eventId: event.id,
    eventTitle: event.title,
    eventImage: event.image,
    optionLabel: null,
    optionIcon: event.image,
    yesPrice: market.outcomes[0].price,
    initialSide: side,
  });

  return (
    <Card padding="md" className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setTarget(buildTarget("yes"))}
          aria-pressed={loadedYes}
          className={cn(
            "inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md text-body font-semibold transition-[background-color,scale,box-shadow] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            loadedYes
              ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--color-primary)]"
              : "bg-primary/15 text-primary hover:bg-primary/25",
          )}
        >
          Yes <span className="tabular-nums">{yesPct}¢</span>
        </button>
        <button
          type="button"
          onClick={() => setTarget(buildTarget("no"))}
          aria-pressed={loadedNo}
          className={cn(
            "inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md text-body font-semibold transition-[background-color,scale,box-shadow] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
            loadedNo
              ? "bg-tone-down text-tone-down-foreground shadow-[0_0_0_1px_var(--color-tone-down)]"
              : "bg-tone-down/15 text-tone-down hover:bg-tone-down/25",
          )}
        >
          No <span className="tabular-nums">{noPct}¢</span>
        </button>
      </div>
      {Math.abs(market.priceChange24h) > 0 && (
        <div className="flex items-center justify-end gap-1 text-caption text-muted-foreground">
          <span>Yes</span>
          <ChangeChip
            change={market.priceChange24h}
            changeAbs={Math.abs(Math.round(market.priceChange24h * 100))}
          />
          <span>24h</span>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared bits                                                          */
/* ------------------------------------------------------------------ */

function OptionIcon({
  icon,
  label,
}: {
  icon: string | null;
  label: string;
}) {
  const [errored, setErrored] = useState(false);
  if (!icon || errored) {
    return (
      <span
        aria-hidden
        className="relative grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-micro font-semibold text-muted-foreground ring-1 ring-inset ring-white/[0.06]"
      >
        {label.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <span className="relative grid size-6 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-1 ring-1 ring-inset ring-white/[0.06]">
      <img
        src={icon}
        alt=""
        width={24}
        height={24}
        className="size-full object-cover"
        onError={() => setErrored(true)}
      />
    </span>
  );
}

function ChangeChip({
  change,
  changeAbs,
}: {
  change: number;
  changeAbs: number;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-caption tabular-nums",
        change > 0 ? "text-primary" : "text-tone-down",
      )}
    >
      {change > 0 ? (
        <ArrowUp strokeWidth={2.25} className="size-3" aria-hidden />
      ) : (
        <ArrowDown strokeWidth={2.25} className="size-3" aria-hidden />
      )}
      {changeAbs}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-body text-muted-foreground">
      {message}
    </div>
  );
}

/* Helpers */
function formatStartsIn(ms: number): string {
  if (ms <= 0) return "Starting…";
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 60) return `${totalMin}m to tip`;
  const totalHr = Math.round(totalMin / 60);
  if (totalHr < 24) return `${totalHr}h to tip`;
  const days = Math.round(totalHr / 24);
  return `${days}d to tip`;
}
function pickFg(hex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return "#fff";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return l > 0.55 ? "#0e1111" : "#fff";
}
