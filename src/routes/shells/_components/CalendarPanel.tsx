"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  CalendarEvent,
  CalendarSource,
  CalendarSyncResponse,
} from "@/api/calendar";

/**
 * Calendar panel — multi-source agenda view backed by public ICS
 * subscribe URLs. The user pastes a URL from Google / iCloud / Outlook
 * (see in-panel help on first add) and we fetch + merge the streams.
 *
 * Storage is localStorage-scoped — sources persist across reloads but
 * never leave the device.
 */

const STORAGE_KEY = "wf-calendar-sources";
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
// A small palette of distinct colors so multiple calendars are
// instantly disambiguable in the agenda.
const SOURCE_COLORS = [
  "#60a5fa",
  "#f59e0b",
  "#34d399",
  "#a78bfa",
  "#fb7185",
  "#22d3ee",
  "#facc66",
  "#f472b6",
];

export function CalendarPanel() {
  const [sources, setSources] = useState<CalendarSource[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Hydrate stored sources on first mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CalendarSource[];
      if (Array.isArray(parsed)) {
        setSources(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist on change.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
    } catch {
      /* quota / private window */
    }
  }, [sources]);

  // Fetch + refresh on a regular cadence.
  const refresh = useCallback(async () => {
    if (sources.length === 0) {
      setEvents([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources }),
      });
      const data = (await r.json()) as CalendarSyncResponse;
      setEvents(data.events);
      // Surface the first source error so the user knows something
      // went wrong — but only once.
      const failed = data.sources.find((s) => !s.ok);
      if (failed) setError(`${failed.name}: ${failed.error ?? "failed"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "sync failed");
    } finally {
      setLoading(false);
    }
  }, [sources]);

  useEffect(() => {
    refresh();
    if (sources.length === 0) return;
    const id = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refresh, sources.length]);

  const addSource = (name: string, url: string) => {
    const id = `cal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const color = SOURCE_COLORS[sources.length % SOURCE_COLORS.length];
    setSources((cur) => [...cur, { id, name, url, color }]);
  };

  const removeSource = (id: string) => {
    setSources((cur) => cur.filter((s) => s.id !== id));
    if (activeFilter === id) setActiveFilter(null);
  };

  const visible = useMemo(
    () =>
      activeFilter
        ? events.filter((e) => e.calendarId === activeFilter)
        : events,
    [events, activeFilter],
  );

  const groups = useMemo(() => groupByDay(visible), [visible]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Sources strip — chips per connected calendar + add button. */}
      <div className="scroll-thin flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-white/[0.05] px-3 py-2">
        <button
          type="button"
          onClick={() => setActiveFilter(null)}
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-caption transition-colors",
            activeFilter === null
              ? "bg-primary/15 text-primary"
              : "bg-surface-1 text-muted-foreground hover:bg-surface-3 hover:text-foreground",
          )}
        >
          All
        </button>
        {sources.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() =>
              setActiveFilter((cur) => (cur === s.id ? null : s.id))
            }
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-1 px-2 py-0.5 text-caption transition-colors hover:bg-surface-3",
              activeFilter === s.id ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full"
              style={{ background: s.color }}
            />
            {s.name}
          </button>
        ))}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh"
            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground disabled:opacity-50"
          >
            {loading ? (
              <Loader2 strokeWidth={2} className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw strokeWidth={1.75} className="size-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex h-6 items-center gap-1 rounded-md bg-surface-2 px-2 text-caption font-medium text-foreground transition-colors hover:bg-surface-4"
          >
            <Plus strokeWidth={2} className="size-3" />
            Add
          </button>
        </div>
      </div>

      {/* Optional error strip. */}
      {error && (
        <div className="border-b border-tone-down/20 bg-tone-down/[0.06] px-3 py-1.5 text-caption text-tone-down">
          {error}
        </div>
      )}

      {/* Body. */}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {sources.length === 0 ? (
          <EmptyConnect onAdd={() => setAddOpen(true)} />
        ) : groups.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center text-body text-muted-foreground">
            <CalendarDays strokeWidth={1.5} className="size-6 mb-1" />
            <span>No events.</span>
            {loading && <span className="text-caption">Loading…</span>}
          </div>
        ) : (
          groups.map((g) => (
            <DayGroup key={g.key} group={g} />
          ))
        )}
      </div>

      {addOpen && (
        <AddSourceDialog
          onAdd={(name, url) => {
            addSource(name, url);
            setAddOpen(false);
          }}
          onClose={() => setAddOpen(false)}
          existing={sources}
          onRemove={removeSource}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EmptyConnect({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="grid size-12 place-items-center rounded-2xl bg-surface-1 text-muted-foreground">
        <CalendarDays strokeWidth={1.5} className="size-6" />
      </span>
      <div className="flex flex-col gap-1">
        <span className="text-body font-semibold text-foreground">
          Connect a calendar
        </span>
        <span className="text-caption text-muted-foreground">
          Paste a public iCal / ICS URL from Google, iCloud, Outlook, or any
          other calendar to sync events.
        </span>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-body font-semibold text-primary-foreground transition-[filter] hover:brightness-[1.04]"
      >
        <Plus strokeWidth={2} className="size-3.5" />
        Add calendar
      </button>
    </div>
  );
}

function DayGroup({ group }: { group: DayBucket }) {
  return (
    <div className="border-b border-white/[0.05] last:border-b-0">
      <div className="sticky top-0 z-[1] flex items-baseline gap-2 bg-popover/80 px-3 py-1.5 backdrop-blur-sm">
        <span className="text-caption font-semibold uppercase tracking-[0.12em] text-foreground">
          {group.label}
        </span>
        <span className="text-micro text-muted-foreground">{group.subLabel}</span>
      </div>
      <ul className="flex flex-col">
        {group.events.map((ev) => (
          <li key={ev.id}>
            <EventRow event={ev} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EventRow({ event }: { event: CalendarEvent }) {
  const timeStr = event.allDay
    ? "All day"
    : `${formatTime(event.start)} – ${formatTime(event.end)}`;
  return (
    <div className="flex items-start gap-3 px-3 py-2">
      <span
        aria-hidden
        className="mt-1.5 size-1.5 shrink-0 rounded-full"
        style={{ background: event.color }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body text-foreground">
          {event.title}
        </span>
        <span className="truncate text-caption text-muted-foreground">
          {timeStr}
          {event.location && ` · ${event.location}`}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add-source dialog                                                  */
/* ------------------------------------------------------------------ */

function AddSourceDialog({
  onAdd,
  onClose,
  existing,
  onRemove,
}: {
  onAdd: (name: string, url: string) => void;
  onClose: () => void;
  existing: CalendarSource[];
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [provider, setProvider] = useState<"google" | "icloud" | "outlook">("google");
  const canAdd = name.trim() && url.trim();

  return (
    <div
      className="absolute inset-0 z-[2] flex items-start justify-center bg-background/55 px-4 pt-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[420px] flex-col gap-3 rounded-lg bg-popover p-4 ring-1 ring-inset ring-white/10 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-body font-semibold text-foreground">
            Connect a calendar
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-1 hover:text-foreground"
          >
            <X strokeWidth={2} className="size-3.5" />
          </button>
        </div>

        {/* Provider tabs — drive the instructions below. */}
        <div role="tablist" className="flex gap-1">
          {(
            [
              { id: "google", label: "Google" },
              { id: "icloud", label: "iCloud" },
              { id: "outlook", label: "Outlook" },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={provider === p.id}
              onClick={() => setProvider(p.id)}
              className={cn(
                "flex-1 rounded-md py-1.5 text-caption transition-colors",
                provider === p.id
                  ? "bg-surface-3 text-foreground"
                  : "bg-white/[0.03] text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <p className="rounded-md bg-white/[0.03] px-3 py-2 text-caption text-muted-foreground">
          {providerInstructions(provider)}
        </p>

        <label className="flex flex-col gap-1.5">
          <span className="text-caption text-muted-foreground">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Work, Personal, …"
            className="h-9 w-full rounded-md bg-surface-1 px-3 text-body text-foreground outline-none ring-1 ring-inset ring-white/[0.06] focus-visible:ring-primary/30"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-caption text-muted-foreground">ICS URL</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
            className="h-9 w-full rounded-md bg-surface-1 px-3 text-body text-foreground outline-none ring-1 ring-inset ring-white/[0.06] focus-visible:ring-primary/30"
          />
        </label>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-body text-muted-foreground transition-colors hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canAdd}
            onClick={() => onAdd(name.trim(), url.trim())}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-body font-semibold text-primary-foreground transition-[filter] disabled:opacity-50"
          >
            Connect
          </button>
        </div>

        {existing.length > 0 && (
          <>
            <div className="my-1 h-px bg-surface-1" />
            <span className="text-micro uppercase tracking-[0.12em] text-muted-foreground">
              Connected
            </span>
            <ul className="flex flex-col gap-0.5">
              {existing.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-1"
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-body text-foreground">
                    {s.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(s.id)}
                    aria-label={`Remove ${s.name}`}
                    className="inline-flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-surface-2 hover:text-tone-down"
                  >
                    <Trash2 strokeWidth={1.75} className="size-3" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function providerInstructions(p: "google" | "icloud" | "outlook"): string {
  switch (p) {
    case "google":
      return "Google Calendar → Settings → click your calendar → Integrate calendar → copy the “Secret address in iCal format” URL.";
    case "icloud":
      return "iCloud Calendar → right-click your calendar → Share Calendar → check Public Calendar → copy the URL (webcal:// is fine).";
    case "outlook":
      return "Outlook → Settings → Calendar → Shared calendars → Publish a calendar → copy the ICS link.";
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type DayBucket = {
  key: string;
  label: string;
  subLabel: string;
  events: CalendarEvent[];
};

function groupByDay(events: CalendarEvent[]): DayBucket[] {
  const byKey = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    const d = new Date(e.start);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const arr = byKey.get(key) ?? [];
    arr.push(e);
    byKey.set(key, arr);
  }
  return Array.from(byKey.entries()).map(([key, evs]) => {
    const d = new Date(evs[0].start);
    return {
      key,
      label: dayLabel(d),
      subLabel: d.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      events: evs,
    };
  });
}

function dayLabel(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cmp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round((cmp.getTime() - today.getTime()) / 86400000);
  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Tomorrow";
  if (dayDiff === -1) return "Yesterday";
  if (dayDiff > 0 && dayDiff < 7)
    return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

