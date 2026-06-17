"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, MapPin, Music, Search } from "lucide-react";
import { Skeleton } from "@/components/ui";
import type {
  ConcertEvent,
  ConcertSearchResponse,
} from "@/api/concerts";

/**
 * Concerts panel — Ticketmaster Discovery search.
 *
 * No public buy endpoint exists, so we deep-link the Ticketmaster
 * event URL to complete purchase — same handoff every concert app
 * (Bandsintown, etc.) uses.
 *
 * Requires TICKETMASTER_API_KEY in env. The API route returns a
 * structured error when missing so the panel can show a friendly
 * setup hint instead of silently failing.
 */

const DEBOUNCE_MS = 350;

export function ConcertsPanel() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [events, setEvents] = useState<ConcertEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [debouncedCity, setDebouncedCity] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setDebouncedCity(city.trim());
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query, city]);

  useEffect(() => {
    let cancelled = false;
    // Defer the synchronous setLoading/setError out of the effect's
    // commit phase via a microtask — the lint rule (and React) flag
    // synchronous state updates from inside an effect.
    const id = window.setTimeout(() => {
      if (!debouncedQuery && !debouncedCity) {
        setEvents([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (debouncedCity) params.set("city", debouncedCity);
      fetch(`/api/concerts?${params}`)
        .then((r) => r.json() as Promise<ConcertSearchResponse>)
        .then((data) => {
          if (cancelled) return;
          if (data.error) setError(data.error);
          setEvents(data.events);
        })
        .catch((err) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : "fetch failed");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [debouncedQuery, debouncedCity]);

  const grouped = useMemo(() => groupByMonth(events), [events]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Search rows */}
      <div className="flex shrink-0 flex-col gap-1.5 border-b border-white/[0.05] px-3 py-2">
        <div className="flex items-center gap-2">
          <Search
            aria-hidden
            strokeWidth={1.75}
            className="size-3.5 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Artist or event…"
            className="flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
          />
          {loading && (
            <Loader2
              className="size-3.5 animate-spin text-muted-foreground"
              strokeWidth={2}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <MapPin
            aria-hidden
            strokeWidth={1.75}
            className="size-3.5 text-muted-foreground"
          />
          <input
            type="search"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Body */}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {error ? (
          <ErrorState message={error} />
        ) : loading && events.length === 0 ? (
          // First-load skeleton — without it the panel falls through
          // to EmptyState during fetch and the user sees "no results"
          // before the request even returns.
          <ConcertsLoading />
        ) : events.length === 0 ? (
          <EmptyState hasQuery={!!(debouncedQuery || debouncedCity)} />
        ) : (
          grouped.map((g) => (
            <section key={g.label}>
              <div className="sticky top-0 z-[1] bg-popover/80 px-3 py-1.5 text-caption font-semibold uppercase tracking-[0.12em] text-foreground backdrop-blur-sm">
                {g.label}
              </div>
              <ul className="flex flex-col">
                {g.events.map((e) => (
                  <li key={e.id}>
                    <ConcertRow event={e} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function ConcertRow({ event }: { event: ConcertEvent }) {
  const date = new Date(event.start);
  return (
    <a
      href={event.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-stretch gap-3 px-3 py-2 transition-colors hover:bg-surface-1"
    >
      {/* Date tile — month + day */}
      <div className="flex shrink-0 flex-col items-center justify-center rounded-md bg-surface-1 px-2 py-1 ring-1 ring-inset ring-white/[0.06]">
        <span className="text-micro font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {date.toLocaleDateString(undefined, { month: "short" })}
        </span>
        <span className="text-body font-semibold tabular-nums text-foreground">
          {date.getDate()}
        </span>
      </div>
      {/* Thumbnail */}
      {event.image && (
        <span className="relative size-12 shrink-0 overflow-hidden rounded-md bg-surface-1 ring-1 ring-inset ring-white/[0.06]">
          <img
            src={event.image}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-body font-semibold text-foreground">
          {event.name}
        </span>
        <span className="truncate text-caption text-muted-foreground">
          {event.venue}
          {event.city && ` · ${event.city}`}
        </span>
        <div className="flex items-center gap-2 text-micro text-muted-foreground">
          <span>
            {date.toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
          {event.priceFrom && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">
                from {priceLabel(event.priceFrom, event.priceCurrency)}
              </span>
            </>
          )}
          {event.genre && (
            <>
              <span aria-hidden>·</span>
              <span>{event.genre}</span>
            </>
          )}
        </div>
      </div>
      <ExternalLink
        strokeWidth={1.75}
        className="size-3.5 shrink-0 self-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </a>
  );
}

function ConcertsLoading() {
  // Two faux "month" groups with three rows each — same shape as the
  // real list, so the user reads "results coming" instead of "lurch."
  return (
    <div>
      {Array.from({ length: 2 }).map((_, g) => (
        <section key={g}>
          <div className="sticky top-0 z-[1] flex bg-popover/80 px-3 py-1.5 backdrop-blur-sm">
            <Skeleton variant="line" className="h-2 w-20" />
          </div>
          <ul className="flex flex-col">
            {Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className="flex items-stretch gap-3 px-3 py-2"
                aria-hidden
              >
                <Skeleton className="size-11 shrink-0" />
                <Skeleton className="size-12 shrink-0" />
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                  <Skeleton variant="line" className="w-2/3" />
                  <Skeleton variant="line" className="h-2 w-1/2" />
                  <Skeleton variant="line" className="h-2 w-1/3" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <span className="grid size-10 place-items-center rounded-xl bg-surface-1 text-muted-foreground">
        <Music strokeWidth={1.5} className="size-5" />
      </span>
      <span className="text-body font-semibold text-foreground">
        {hasQuery ? "No events found" : "Find a concert"}
      </span>
      <span className="text-caption text-muted-foreground">
        {hasQuery
          ? "Try a different artist, city, or both."
          : "Search by artist or city to see upcoming shows."}
      </span>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="m-3 rounded-lg bg-tone-down/[0.08] p-3 text-caption text-tone-down ring-1 ring-inset ring-tone-down/20">
      {message}
    </div>
  );
}

type MonthBucket = { label: string; events: ConcertEvent[] };

function groupByMonth(events: ConcertEvent[]): MonthBucket[] {
  const byKey = new Map<string, ConcertEvent[]>();
  for (const e of events) {
    const d = new Date(e.start);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    (byKey.get(key) ?? byKey.set(key, []).get(key)!).push(e);
  }
  return Array.from(byKey.entries()).map(([key, evs]) => {
    const [y, m] = key.split("-").map(Number);
    return {
      label: new Date(y, m, 1).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      }),
      events: evs,
    };
  });
}

function priceLabel(price: number, currency?: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency ?? "USD",
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `$${price}`;
  }
}
