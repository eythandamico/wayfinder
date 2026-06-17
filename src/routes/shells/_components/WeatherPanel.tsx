"use client";

import { useCallback, useEffect, useState } from "react";
import { Droplets, Loader2, RefreshCw, Search, Wind } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui";
import type { WeatherResponse } from "@/api/weather";

/**
 * Weather panel — OpenWeather One Call.
 *
 * Default location stored in localStorage. User can type a city and
 * press Enter to swap. We show current conditions + a 5-day forecast
 * strip. Auto-refreshes every 10 minutes while mounted.
 */

const STORAGE_KEY = "wf-weather-location";
const REFRESH_INTERVAL_MS = 10 * 60 * 1000;
const DEFAULT_LOCATION = "New York";

export function WeatherPanel() {
  const [location, setLocation] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_LOCATION;
    try {
      return (
        window.localStorage.getItem(STORAGE_KEY) ?? DEFAULT_LOCATION
      );
    } catch {
      return DEFAULT_LOCATION;
    }
  });
  const [data, setData] = useState<WeatherResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");

  const fetchFor = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/weather?q=${encodeURIComponent(q)}`);
      const json = (await r.json()) as WeatherResponse;
      setData(json);
    } catch (err) {
      setData({
        name: "",
        current: {
          temp: 0,
          feelsLike: 0,
          condition: "—",
          icon: "",
          humidity: 0,
          windSpeed: 0,
        },
        daily: [],
        error: err instanceof Error ? err.message : "fetch failed",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFor(location);
    const id = window.setInterval(() => fetchFor(location), REFRESH_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [location, fetchFor]);

  const commit = (next: string) => {
    const trimmed = next.trim();
    if (!trimmed) return;
    setLocation(trimmed);
    setDraft("");
    try {
      window.localStorage.setItem(STORAGE_KEY, trimmed);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Search + refresh */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.05] px-3 py-2">
        <Search
          aria-hidden
          strokeWidth={1.75}
          className="size-3.5 text-muted-foreground"
        />
        <input
          type="search"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(draft);
          }}
          placeholder={data?.name ?? location}
          className="flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={() => fetchFor(location)}
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
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {data?.error ? (
          <div className="m-3 rounded-lg bg-tone-down/[0.08] p-3 text-caption text-tone-down ring-1 ring-inset ring-tone-down/20">
            {data.error}
          </div>
        ) : !data ? (
          <WeatherLoading />
        ) : (
          <>
            <CurrentBlock data={data} />
            <ForecastStrip days={data.daily} />
          </>
        )}
      </div>
    </div>
  );
}

function WeatherLoading() {
  // Mirrors the CurrentBlock + ForecastStrip layout so the panel
  // settles into the same shape when data lands. Skeleton heights
  // are sized to the real type so the temperature digits don't
  // jump after fetch.
  return (
    <>
      <div className="flex flex-col gap-2 px-4 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex flex-col gap-2 leading-tight">
            <Skeleton variant="line" className="h-2.5 w-24" />
            <Skeleton className="h-11 w-28" />
            <Skeleton variant="line" className="h-2 w-32" />
          </div>
          <Skeleton variant="circle" className="size-12" />
        </div>
        <div className="mt-1 flex items-center gap-4">
          <Skeleton variant="line" className="h-2 w-12" />
          <Skeleton variant="line" className="h-2 w-12" />
        </div>
      </div>
      <div className="border-t border-white/[0.05] px-2 py-2">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1.5 rounded-md px-1 py-2"
              aria-hidden
            >
              <Skeleton variant="line" className="h-2 w-6" />
              <Skeleton variant="circle" className="size-7" />
              <Skeleton variant="line" className="h-2 w-5" />
              <Skeleton variant="line" className="h-2 w-4" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function CurrentBlock({ data }: { data: WeatherResponse }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col leading-tight">
          <span className="truncate text-body text-muted-foreground">
            {data.name}
          </span>
          <span className="text-display font-semibold tabular-nums tracking-tight text-foreground">
            {Math.round(data.current.temp)}°
          </span>
          <span className="text-caption text-muted-foreground">
            {data.current.condition} · feels like {Math.round(data.current.feelsLike)}°
          </span>
        </div>
        <WeatherIcon icon={data.current.icon} size={64} />
      </div>
      <div className="mt-1 flex items-center gap-4 text-caption text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Droplets strokeWidth={1.75} className="size-3.5" aria-hidden />
          {data.current.humidity}%
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Wind strokeWidth={1.75} className="size-3.5" aria-hidden />
          {Math.round(data.current.windSpeed)} mph
        </span>
      </div>
    </div>
  );
}

function ForecastStrip({ days }: { days: WeatherResponse["daily"] }) {
  return (
    <div className="border-t border-white/[0.05] px-2 py-2">
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const dow = new Date(d.ts).toLocaleDateString(undefined, {
            weekday: "short",
          });
          return (
            <div
              key={d.ts}
              className="flex flex-col items-center gap-1 rounded-md px-1 py-2"
            >
              <span className="text-micro uppercase tracking-[0.12em] text-muted-foreground">
                {dow}
              </span>
              <WeatherIcon icon={d.icon} size={32} />
              <span className="text-caption font-semibold tabular-nums text-foreground">
                {Math.round(d.high)}°
              </span>
              <span className="text-micro tabular-nums text-muted-foreground">
                {Math.round(d.low)}°
              </span>
              {d.pop > 0.2 && (
                <span className="text-micro tabular-nums text-blue-300/80">
                  {Math.round(d.pop * 100)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeatherIcon({ icon, size = 32 }: { icon: string; size?: number }) {
  // OpenWeather emits codes like 01d, 04n, etc. Map to a lucide-ish
  // glyph using just emoji so we don't need an icon library lookup.
  const glyph = iconGlyph(icon);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center",
        size > 48 && "text-display",
        size <= 48 && size > 24 && "text-display",
        size <= 24 && "text-[16px]",
      )}
      style={{ width: size, height: size }}
    >
      {glyph}
    </span>
  );
}

function iconGlyph(icon: string): string {
  const c = icon.slice(0, 2);
  switch (c) {
    case "01":
      return icon.endsWith("n") ? "🌙" : "☀️";
    case "02":
      return "🌤";
    case "03":
    case "04":
      return "☁️";
    case "09":
      return "🌧";
    case "10":
      return "🌦";
    case "11":
      return "⛈";
    case "13":
      return "❄️";
    case "50":
      return "🌫";
    default:
      return "🌡";
  }
}

