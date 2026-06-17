"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Pill, Skeleton } from "@/components/ui";
import { POLYMARKET_CATEGORIES } from "../_data/polymarket-markets";
import {
  usePredictionTicket,
  type PredictionTarget,
} from "../_state/shells-context";
import type { NormalizedSportsEvent } from "@/api/polymarket/sports";
import type {
  NormalizedEvent,
  NormalizedOption,
} from "@/api/polymarket/events";
import { AskAgentButton } from "./AskAgentAffordance";
import { PolymarketEventDetail } from "./PolymarketEventDetail";

/** Panel-level "open this event in the detail view" channel. Cards
 *  consume this so the click handler isn't passed through every wrapper
 *  component. Provided once at the panel root. */
const OpenDetailContext = createContext<((eventId: string) => void) | null>(
  null,
);

function useOpenDetail(): (eventId: string) => void {
  const open = useContext(OpenDetailContext);
  if (!open) {
    throw new Error("OpenDetailContext provider missing");
  }
  return open;
}

/** Stable identity for "this option is currently in the ticket".
 *  Combining eventId + optionLabel handles both binary (null label)
 *  and categorical/sports markets without collisions. */
function targetMatches(
  target: PredictionTarget | null,
  eventId: string,
  optionLabel: string | null,
): boolean {
  if (!target) return false;
  if (target.eventId !== eventId) return false;
  return (target.optionLabel ?? null) === (optionLabel ?? null);
}

type Category = (typeof POLYMARKET_CATEGORIES)[number];

/** UI tab → gamma-api tag label. `null` skips tag filter (Trending). */
const CATEGORY_TAG: Record<Category, string | null> = {
  All: null,
  Politics: "Politics",
  Crypto: "Crypto",
  Sports: null, // handled by the dedicated sports route
  Geopolitics: "Geopolitics",
  Economy: "Economy",
  Culture: "Culture",
};

const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const END_DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

/**
 * Polymarket browser — live discovery feed across every category.
 *
 *   - Sports → SportsCard (team scoreboard + game state, via the
 *     dedicated /api/polymarket/sports route).
 *   - Everything else → EventCard, which renders binary Y/N markets
 *     and categorical (multi-outcome) markets like "Republican Nominee
 *     2028" via /api/polymarket/events.
 *
 * All data is live from gamma-api, cached 30s at the edge and
 * client-refreshed when the user switches tabs.
 */
export function PolymarketPanel() {
  const [category, setCategory] = useState<Category>("Sports");
  const [detailEventId, setDetailEventId] = useState<string | null>(null);

  const sports = useSportsEvents(category === "Sports" && !detailEventId);
  const events = useEvents(
    !detailEventId && category !== "Sports" ? CATEGORY_TAG[category] : undefined,
  );

  // When a detail is open, the detail component owns the entire panel
  // body — its own back-button bar replaces the panel header so the
  // category strip stops competing for the user's attention.
  if (detailEventId) {
    return (
      <OpenDetailContext.Provider value={setDetailEventId}>
        <PolymarketEventDetail
          eventId={detailEventId}
          onBack={() => setDetailEventId(null)}
        />
      </OpenDetailContext.Provider>
    );
  }

  return (
    <OpenDetailContext.Provider value={setDetailEventId}>
      <div className="flex h-full flex-col overflow-hidden">
        {/* Category filter — primary navigation for the panel. The
            panel chrome above already names the panel, so we don't
            need a redundant "Polymarket / N markets" header here. */}
        <div
          role="tablist"
          aria-label="Polymarket categories"
          className="scroll-none flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/[0.05] px-2 py-2"
        >
          {POLYMARKET_CATEGORIES.map((c) => {
            const selected = category === c;
            return (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setCategory(c)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center rounded-full px-3 text-body font-medium transition-[background-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  selected
                    ? "bg-surface-4 text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c === "All" ? "Trending" : c}
              </button>
            );
          })}
        </div>

        <div className="@container scroll-thin min-h-0 flex-1 overflow-y-auto p-2">
          {category === "Sports" ? (
            <SportsGrid {...sports} />
          ) : (
            <EventsGrid {...events} />
          )}
        </div>
      </div>
    </OpenDetailContext.Provider>
  );
}

/* ================================================================== */
/*  Pick → ticket bridge                                                */
/*                                                                       */
/*  Each card calls `usePickHandler()` to get a stable callback that     */
/*  pushes the clicked option into ShellsContext.predictionTarget —      */
/*  which TradePanel watches to auto-load + switch into Prediction       */
/*  mode. Centralized here so each card type doesn't need its own        */
/*  hook plumbing.                                                       */
/* ================================================================== */

function usePickHandler() {
  const { target, setTarget } = usePredictionTicket();
  return { target, pick: setTarget };
}

/* ================================================================== */
/*  Sports tab — live data from /api/polymarket/sports                  */
/* ================================================================== */

type SportsState = {
  events: NormalizedSportsEvent[];
  loading: boolean;
  error: string | null;
};

function useSportsEvents(enabled: boolean): SportsState {
  const [state, setState] = useState<SportsState>({
    events: [],
    loading: enabled,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    fetch("/api/polymarket/sports?limit=30")
      .then((r) => r.json() as Promise<{ events: NormalizedSportsEvent[]; error?: string }>)
      .then((data) => {
        if (cancelled) return;
        setState({
          events: data.events ?? [],
          loading: false,
          error: data.error ?? null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          events: [],
          loading: false,
          error: err instanceof Error ? err.message : "fetch failed",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}

function SportsGrid({ events, loading, error }: SportsState) {
  if (loading && events.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-2 @[480px]:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[200px]" />
        ))}
      </div>
    );
  }
  if (error && events.length === 0) {
    return <EmptyState message={`Couldn't reach Polymarket (${error}).`} />;
  }
  if (events.length === 0) {
    return (
      <EmptyState message="No live game markets right now. Check back at game time." />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-2 @[480px]:grid-cols-2">
      {events.map((e) => (
        <SportsCard key={e.id} event={e} />
      ))}
    </div>
  );
}

function SportsCard({ event }: { event: NormalizedSportsEvent }) {
  const { target, pick } = usePickHandler();
  const openDetail = useOpenDetail();
  const home = event.teams.find((t) => t.ordering === "home") ?? event.teams[0];
  const away = event.teams.find((t) => t.ordering === "away") ?? event.teams[1];

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="flex items-stretch border-b border-white/[0.05]">
        <button
          type="button"
          onClick={() => openDetail(event.id)}
          aria-label={`View ${event.title} markets`}
          className="group flex flex-1 items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <Pill tone="muted" size="sm">
              {event.league}
            </Pill>
            <GameStatePill state={event.state} startsInMs={event.startsInMs} />
          </div>
          <span className="flex shrink-0 items-center gap-1 text-caption tabular-nums text-muted-foreground">
            ${COMPACT.format(event.volume24h)} 24h
            <ChevronRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2}
              aria-hidden
            />
          </span>
        </button>
        <div className="flex shrink-0 items-center pr-2">
          <AskAgentButton
            size="sm"
            withHoverGlow
            payload={{
              kind: "polymarket",
              event: {
                id: event.id,
                title: event.title,
                volume24h: event.volume24h,
              },
            }}
            ariaLabel={`Ask agent about ${event.title}`}
          />
        </div>
      </div>

      <div className="flex flex-col divide-y divide-white/[0.04]">
        {[home, away].map((team) => {
          if (!team) return null;
          const outcome = event.outcomes.find((o) => o.label === team.name);
          const loaded = targetMatches(target, event.id, team.name);
          return (
            <TeamRow
              key={team.name}
              team={team}
              outcome={outcome ?? null}
              loaded={loaded}
              onPick={() => {
                if (!outcome) return;
                pick({
                  eventId: event.id,
                  eventTitle: event.title,
                  eventImage: event.image,
                  optionLabel: team.name,
                  optionIcon: team.logo || null,
                  yesPrice: outcome.yesPrice,
                  initialSide: "yes",
                });
              }}
            />
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => openDetail(event.id)}
        aria-label={`View all markets for ${event.title}`}
        className="group flex h-11 w-full items-center justify-center gap-1.5 border-t border-white/[0.05] px-3 text-body font-medium text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
      >
        <span>Spreads, totals, player props</span>
        <ChevronRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          strokeWidth={2}
          aria-hidden
        />
      </button>
    </Card>
  );
}

function GameStatePill({
  state,
  startsInMs,
}: {
  state: NormalizedSportsEvent["state"];
  startsInMs: number;
}) {
  if (state === "live") {
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
  if (state === "final") {
    return (
      <Pill tone="muted" size="sm" uppercase>
        FINAL
      </Pill>
    );
  }
  return (
    <Pill tone="muted" size="sm">
      {formatStartsIn(startsInMs)}
    </Pill>
  );
}

function TeamRow({
  team,
  outcome,
  loaded,
  onPick,
}: {
  team: NormalizedSportsEvent["teams"][number];
  outcome: NormalizedSportsEvent["outcomes"][number] | null;
  loaded: boolean;
  onPick: () => void;
}) {
  const yesPct = outcome ? Math.round(outcome.yesPrice * 100) : null;
  const change = outcome?.priceChange24h ?? 0;
  const changeAbs = Math.abs(Math.round(change * 100));
  const showChange = changeAbs > 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-3 transition-colors",
        loaded && "bg-primary/[0.06]",
      )}
    >
      <TeamAvatar team={team} />
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-body font-semibold text-foreground">
          {team.name}
        </span>
        {team.record && (
          <span className="truncate text-caption text-muted-foreground tabular-nums">
            {team.record}
          </span>
        )}
      </div>
      {yesPct !== null && (
        <button
          type="button"
          onClick={onPick}
          aria-pressed={loaded}
          aria-label={`Buy YES on ${team.name} at ${yesPct} cents`}
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md px-3.5 text-body font-semibold transition-[background-color,scale,box-shadow] duration-150 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            loaded
              ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--color-primary)]"
              : yesPct >= 50
                ? "bg-primary/15 text-primary hover:bg-primary/25"
                : "bg-surface-1 text-foreground hover:bg-surface-4",
          )}
        >
          <span className="tabular-nums">{yesPct}¢</span>
          {showChange && !loaded && (
            <ChangeChip change={change} changeAbs={changeAbs} />
          )}
        </button>
      )}
    </div>
  );
}

function TeamAvatar({
  team,
}: {
  team: NormalizedSportsEvent["teams"][number];
}) {
  const [errored, setErrored] = useState(false);
  if (!team.logo || errored) {
    return (
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-full text-body font-semibold ring-1 ring-inset ring-black/20"
        style={{ background: team.color, color: pickFg(team.color) }}
      >
        {team.abbreviation.slice(0, 3).toUpperCase()}
      </span>
    );
  }
  return (
    <div
      className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-1 ring-1 ring-inset ring-black/20"
      style={{ background: team.color }}
    >
      <img
        src={team.logo}
        alt=""
        width={40}
        height={40}
        className="size-full object-contain"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

/* ================================================================== */
/*  General tabs — live data from /api/polymarket/events                */
/* ================================================================== */

type EventsState = {
  events: NormalizedEvent[];
  loading: boolean;
  error: string | null;
};

/** Pass `undefined` to disable; pass `null` to fetch trending (no tag);
 *  pass a tag string to filter by that tag. */
function useEvents(tag: string | null | undefined): EventsState {
  const [state, setState] = useState<EventsState>({
    events: [],
    loading: tag !== undefined,
    error: null,
  });

  useEffect(() => {
    if (tag === undefined) return;
    let cancelled = false;

    const qs = new URLSearchParams({ limit: "24" });
    if (tag) qs.set("tag", tag);

    fetch(`/api/polymarket/events?${qs.toString()}`)
      .then((r) => r.json() as Promise<{ events: NormalizedEvent[]; error?: string }>)
      .then((data) => {
        if (cancelled) return;
        setState({
          events: data.events ?? [],
          loading: false,
          error: data.error ?? null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          events: [],
          loading: false,
          error: err instanceof Error ? err.message : "fetch failed",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [tag]);

  return state;
}

function EventsGrid({ events, loading, error }: EventsState) {
  if (loading && events.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-2 @[480px]:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[280px]" />
        ))}
      </div>
    );
  }
  if (error && events.length === 0) {
    return <EmptyState message={`Couldn't reach Polymarket (${error}).`} />;
  }
  if (events.length === 0) {
    return <EmptyState message="No markets in this category right now." />;
  }
  return (
    <div className="grid grid-cols-1 gap-2 @[480px]:grid-cols-2">
      {events.map((e) => (
        <EventCard key={e.id} event={e} />
      ))}
    </div>
  );
}

function EventCard({ event }: { event: NormalizedEvent }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <EventHeader event={event} />
      {event.shape === "binary" && event.binary ? (
        <BinaryBody event={event} binary={event.binary} />
      ) : (
        <CategoricalBody
          event={event}
          options={event.options ?? []}
          remaining={event.remainingOptions ?? 0}
        />
      )}
    </Card>
  );
}

function EventHeader({ event }: { event: NormalizedEvent }) {
  const openDetail = useOpenDetail();
  // Pick the most useful tag for context (skip generic/admin tags).
  const SKIP_TAGS = new Set([
    "Hide From New",
    "Recurring",
    "Main Election",
    "Weekly",
    "Multi Strikes",
    "Hit Price",
    "Earn 4%",
  ]);
  const tag = event.tags.find((t) => !SKIP_TAGS.has(t)) ?? null;

  return (
    <div className="flex items-stretch border-b border-white/[0.05]">
      <button
        type="button"
        onClick={() => openDetail(event.id)}
        aria-label={`View ${event.title} markets`}
        className="group flex flex-1 items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
      >
        {event.image && (
          <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-surface-1 ring-1 ring-inset ring-white/[0.06]">
            <img
              src={event.image}
              alt=""
              className="absolute inset-0 size-full object-cover"
            />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="line-clamp-2 text-body font-semibold leading-tight text-foreground text-pretty">
            {event.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption tabular-nums text-muted-foreground">
            {tag && (
              <span className="rounded-full bg-surface-1 px-2 py-0.5 text-muted-foreground">
                {tag}
              </span>
            )}
            <span>${COMPACT.format(event.volume24h)} 24h</span>
            {event.endsAt && (
              <span>Ends {formatEndDate(event.endsAt)}</span>
            )}
          </div>
        </div>
        <ChevronRight
          className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          strokeWidth={2}
          aria-hidden
        />
      </button>
      <div className="flex shrink-0 items-start pr-2 pt-3">
        <AskAgentButton
          size="sm"
          withHoverGlow
          payload={{
            kind: "polymarket",
            event: {
              id: event.id,
              title: event.title,
              volume24h: event.volume24h,
              endsAt: event.endsAt ?? null,
            },
          }}
          ariaLabel={`Ask agent about ${event.title}`}
        />
      </div>
    </div>
  );
}

function BinaryBody({
  event,
  binary,
}: {
  event: NormalizedEvent;
  binary: NonNullable<NormalizedEvent["binary"]>;
}) {
  const { target, pick } = usePickHandler();
  const yesPct = Math.round(binary.yesPrice * 100);
  const noPct = 100 - yesPct;
  const change = binary.priceChange24h;
  const changeAbs = Math.abs(Math.round(change * 100));
  const loaded = targetMatches(target, event.id, null);

  const baseTarget: Omit<PredictionTarget, "initialSide"> = {
    eventId: event.id,
    eventTitle: event.title,
    eventImage: event.image,
    optionLabel: null,
    optionIcon: event.image,
    yesPrice: binary.yesPrice,
  };

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center gap-1.5">
        <OutcomeButton
          label="Yes"
          pct={yesPct}
          tone="positive"
          loaded={loaded && target?.initialSide === "yes"}
          onClick={() => pick({ ...baseTarget, initialSide: "yes" })}
        />
        <OutcomeButton
          label="No"
          pct={noPct}
          tone="negative"
          loaded={loaded && target?.initialSide === "no"}
          onClick={() => pick({ ...baseTarget, initialSide: "no" })}
        />
      </div>
      {changeAbs > 0 && (
        <div className="flex items-center justify-end gap-1 text-caption text-muted-foreground">
          <span>Yes</span>
          <ChangeChip change={change} changeAbs={changeAbs} />
          <span>24h</span>
        </div>
      )}
    </div>
  );
}

function CategoricalBody({
  event,
  options,
  remaining,
}: {
  event: NormalizedEvent;
  options: NormalizedOption[];
  remaining: number;
}) {
  const { target, pick } = usePickHandler();
  const openDetail = useOpenDetail();
  if (options.length === 0) return null;

  return (
    <div className="flex flex-col">
      <div className="flex flex-col divide-y divide-white/[0.04]">
        {options.map((opt) => (
          <OptionRow
            key={opt.label}
            option={opt}
            loaded={targetMatches(target, event.id, opt.label)}
            onPick={() =>
              pick({
                eventId: event.id,
                eventTitle: event.title,
                eventImage: event.image,
                optionLabel: opt.label,
                optionIcon: opt.icon,
                yesPrice: opt.yesPrice,
                initialSide: "yes",
              })
            }
          />
        ))}
      </div>
      <button
        type="button"
        onClick={() => openDetail(event.id)}
        aria-label={
          remaining > 0
            ? `View ${remaining} additional options for ${event.title}`
            : `View market details for ${event.title}`
        }
        className="group flex h-11 w-full items-center justify-center gap-1.5 border-t border-white/[0.05] px-3 text-body font-medium text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
      >
        <span>
          {remaining > 0
            ? `+ ${remaining} more ${remaining === 1 ? "option" : "options"}`
            : "View market details"}
        </span>
        <ChevronRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          strokeWidth={2}
          aria-hidden
        />
      </button>
    </div>
  );
}

function OptionRow({
  option,
  loaded,
  onPick,
}: {
  option: NormalizedOption;
  loaded: boolean;
  onPick: () => void;
}) {
  const yesPct = Math.round(option.yesPrice * 100);
  const change = option.priceChange24h;
  const changeAbs = Math.abs(Math.round(change * 100));
  const showChange = changeAbs > 0;

  return (
    <div
      className={cn(
        "relative flex items-center gap-3 px-3 py-2.5 transition-colors",
        loaded && "bg-primary/[0.08]",
      )}
    >
      {/* Probability bar — sits behind the row content. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 bg-primary/[0.06]"
        style={{ width: `${yesPct}%` }}
      />
      <OptionIcon icon={option.icon} label={option.label} />
      <span className="relative line-clamp-1 min-w-0 flex-1 text-body font-medium text-foreground">
        {option.label}
      </span>
      <div className="relative flex shrink-0 items-center gap-1.5">
        {showChange && !loaded && (
          <ChangeChip change={change} changeAbs={changeAbs} />
        )}
        <button
          type="button"
          onClick={onPick}
          aria-pressed={loaded}
          aria-label={`Buy YES on ${option.label} at ${yesPct} cents`}
          className={cn(
            "inline-flex h-10 min-w-[3.75rem] items-center justify-center rounded-md px-3 text-body font-semibold tabular-nums transition-[background-color,scale,box-shadow] duration-150 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
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
        className="relative grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-caption font-semibold text-muted-foreground ring-1 ring-inset ring-white/[0.06]"
      >
        {label.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  return (
    <span className="relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-1 ring-1 ring-inset ring-white/[0.06]">
      <img
        src={icon}
        alt=""
        width={28}
        height={28}
        className="size-full object-cover"
        onError={() => setErrored(true)}
      />
    </span>
  );
}

/* ================================================================== */
/*  Shared bits                                                          */
/* ================================================================== */

function OutcomeButton({
  label,
  pct,
  tone,
  loaded = false,
  onClick,
}: {
  label: string;
  pct: number;
  tone: "positive" | "negative";
  loaded?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={loaded}
      aria-label={`${label} at ${pct} cents`}
      className={cn(
        "inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md text-body font-semibold transition-[background-color,scale,box-shadow] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        loaded
          ? tone === "positive"
            ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--color-primary)]"
            : "bg-tone-down text-tone-down-foreground shadow-[0_0_0_1px_var(--color-tone-down)]"
          : tone === "positive"
            ? "bg-primary/15 text-primary hover:bg-primary/25"
            : "bg-tone-down/15 text-tone-down hover:bg-tone-down/25",
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums">{pct}¢</span>
    </button>
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

/* ------------------------------------------------------------------ */
/*  Helpers                                                              */
/* ------------------------------------------------------------------ */

function formatStartsIn(ms: number): string {
  if (ms <= 0) return "Starting…";
  const totalMin = Math.round(ms / 60_000);
  if (totalMin < 60) return `${totalMin}m to tip`;
  const totalHr = Math.round(totalMin / 60);
  if (totalHr < 24) return `${totalHr}h to tip`;
  const days = Math.round(totalHr / 24);
  return `${days}d to tip`;
}

function formatEndDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "";
  return END_DATE_FMT.format(d);
}

function pickFg(hex: string): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return "#fff";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return l > 0.55 ? "#0e1111" : "#fff";
}
