"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui";

/**
 * World clocks — global market sessions at a glance.
 *
 * Curated list of the financial-center timezones traders track. Each
 * card shows current local time, whether the market is currently
 * open (rough 9:30–16:00 local M–F window for equities; FX runs
 * 24/5), and how many hours from the user's local time it sits.
 *
 * Updates every second via a single setInterval rather than per-card
 * so all clocks stay frame-aligned.
 */

type City = {
  id: string;
  label: string;
  /** Sub-label rendered under the city name. */
  market: string;
  /** IANA timezone identifier. */
  tz: string;
  /** Local 24h open time (e.g. 9.5 for 9:30). */
  open: number;
  /** Local 24h close time. */
  close: number;
  /** Days of week the market is open (0=Sun … 6=Sat). */
  days: number[];
  emoji: string;
};

const CITIES: City[] = [
  {
    id: "ny",
    label: "New York",
    market: "NYSE / Nasdaq",
    tz: "America/New_York",
    open: 9.5,
    close: 16,
    days: [1, 2, 3, 4, 5],
    emoji: "🗽",
  },
  {
    id: "ldn",
    label: "London",
    market: "LSE",
    tz: "Europe/London",
    open: 8,
    close: 16.5,
    days: [1, 2, 3, 4, 5],
    emoji: "🇬🇧",
  },
  {
    id: "tyo",
    label: "Tokyo",
    market: "TSE",
    tz: "Asia/Tokyo",
    open: 9,
    close: 15,
    days: [1, 2, 3, 4, 5],
    emoji: "🗼",
  },
  {
    id: "hk",
    label: "Hong Kong",
    market: "HKEX",
    tz: "Asia/Hong_Kong",
    open: 9.5,
    close: 16,
    days: [1, 2, 3, 4, 5],
    emoji: "🏯",
  },
  {
    id: "syd",
    label: "Sydney",
    market: "ASX",
    tz: "Australia/Sydney",
    open: 10,
    close: 16,
    days: [1, 2, 3, 4, 5],
    emoji: "🏝",
  },
  {
    id: "sgp",
    label: "Singapore",
    market: "SGX",
    tz: "Asia/Singapore",
    open: 9,
    close: 17,
    days: [1, 2, 3, 4, 5],
    emoji: "🌴",
  },
  {
    id: "fra",
    label: "Frankfurt",
    market: "Xetra",
    tz: "Europe/Berlin",
    open: 9,
    close: 17.5,
    days: [1, 2, 3, 4, 5],
    emoji: "🇩🇪",
  },
  {
    id: "dxb",
    label: "Dubai",
    market: "DFM",
    tz: "Asia/Dubai",
    open: 10,
    close: 14,
    days: [0, 1, 2, 3, 4],
    emoji: "🕌",
  },
];

export function WorldClocksPanel() {
  // Start at 0 so server and client agree on the first paint —
  // reading Date.now() in the initializer would stamp the SSR HTML
  // with one moment and the client first render with another,
  // tripping a hydration mismatch. The effect below paints the real
  // time after mount before the user notices.
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2">
        <ul className="grid grid-cols-2 gap-2">
          {CITIES.map((c) => (
            <li key={c.id}>
              {now === 0 ? <ClockSkeleton /> : <ClockCard city={c} now={now} />}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ClockSkeleton() {
  return (
    <div
      aria-hidden
      className="flex flex-col gap-1 rounded-lg bg-white/[0.03] p-3 ring-1 ring-inset ring-white/[0.06]"
    >
      <div className="flex items-baseline justify-between gap-2">
        <Skeleton variant="line" className="w-16" />
        <Skeleton variant="line" className="h-2 w-10" />
      </div>
      <Skeleton className="mt-1 h-6 w-20" />
      <Skeleton variant="line" className="h-2 w-14" />
    </div>
  );
}

function ClockCard({ city, now }: { city: City; now: number }) {
  const local = new Date(now);
  // Pull H/M/S in the target timezone via Intl. The parts come back
  // already padded, so just split them.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: city.tz,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(local);
  const pick = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  const hh = pick("hour");
  const mm = pick("minute");
  const ss = pick("second");
  const weekday = pick("weekday");

  const localFractional = parseInt(hh, 10) + parseInt(mm, 10) / 60;
  const dayIdx = weekdayIndex(weekday);
  const isOpen =
    city.days.includes(dayIdx) &&
    localFractional >= city.open &&
    localFractional < city.close;

  // Approximate offset from the user's local clock — show only hours
  // since DST can put it on the half-hour for places like Adelaide.
  const userOffsetMin = -new Date(now).getTimezoneOffset();
  const cityOffsetMin = offsetMin(city.tz, now);
  const deltaHours = (cityOffsetMin - userOffsetMin) / 60;

  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg p-3 ring-1 ring-inset transition-colors",
        isOpen
          ? "bg-primary/[0.06] ring-primary/30"
          : "bg-white/[0.03] ring-white/[0.06]",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="text-body">
            {city.emoji}
          </span>
          <span className="truncate text-body font-semibold text-foreground">
            {city.label}
          </span>
        </span>
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-0.5 text-micro font-semibold uppercase tracking-[0.12em]",
            isOpen
              ? "bg-primary/15 text-primary"
              : "bg-surface-1 text-muted-foreground",
          )}
        >
          {isOpen ? "Open" : "Closed"}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-title font-semibold tabular-nums tracking-tight text-foreground">
          {hh}:{mm}
        </span>
        <span className="text-caption tabular-nums text-muted-foreground">
          :{ss}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-micro text-muted-foreground">
        <span>{city.market}</span>
        <span className="tabular-nums">{formatDelta(deltaHours)}</span>
      </div>
    </div>
  );
}

function weekdayIndex(short: string): number {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(short);
}

function offsetMin(tz: string, atMs: number): number {
  const d = new Date(atMs);
  // Compute the offset by formatting the same instant in the target
  // timezone and comparing to UTC. Subtle but reliable.
  const utc = new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth(),
      d.getUTCDate(),
      d.getUTCHours(),
      d.getUTCMinutes(),
    ),
  ).getTime();
  const tzString = d.toLocaleString("en-US", { timeZone: tz });
  const tzTime = new Date(tzString).getTime();
  return Math.round((tzTime - utc) / 60000);
}

function formatDelta(h: number): string {
  if (Math.abs(h) < 0.001) return "same as you";
  const sign = h > 0 ? "+" : "−";
  const abs = Math.abs(h);
  const whole = Math.floor(abs);
  const minutes = Math.round((abs - whole) * 60);
  if (minutes === 0) return `${sign}${whole}h`;
  return `${sign}${whole}h ${minutes}m`;
}
