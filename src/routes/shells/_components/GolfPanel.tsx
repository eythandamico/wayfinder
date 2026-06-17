"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Check,
  Loader2,
  MapPin,
  Minus,
  Plus,
  Search,
  Star,
  Sunrise,
  Sun,
  Sunset,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Pill, Skeleton } from "@/components/ui";
import { triggerDopamine } from "../_lib/dopamine";
import type {
  GolfCourseResult,
  GolfSearchResponse,
} from "@/api/golf/search";
import type {
  AvailabilityResponse,
  TeeTime,
} from "@/api/golf/availability";

/**
 * GolfPanel — tee-time booking with real course discovery.
 *
 * Course search hits the live `/api/golf/search` route (Nominatim
 * geocode → Overpass OSM → real golf-course features near the user's
 * location). Tee-time availability + booking flow is synthesized —
 * no public golf-booking partner API exists, so we simulate the
 * second half with deterministic pricing and a fake confirmation
 * code at the end.
 *
 * Three views inside one panel: search/results, course detail, and
 * booking confirmation. Last search location and recent bookings
 * persist to localStorage so the user picks up where they left off.
 */

const QUICK_LOCATIONS = [
  "Atlanta, GA",
  "Phoenix, AZ",
  "Pebble Beach, CA",
  "Pinehurst, NC",
  "Scottsdale, AZ",
];

const SEARCH_KEY = "wf-shells-v3-golf-search-v1";
const DATE_KEY = "wf-shells-v3-golf-date-v1";
const PLAYERS_KEY = "wf-shells-v3-golf-players-v1";
const BOOKINGS_KEY = "wf-shells-v3-golf-bookings-v1";

const SUBMIT_DELAY_MS = 750;
const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

type View = "search" | "detail" | "confirmed";

type Booking = {
  id: string;
  confirmation: string;
  courseId: string;
  courseName: string;
  courseImage: string;
  time: string;
  players: number;
  pricePerPlayer: number;
  total: number;
  holes: number;
  mode: "ride" | "walk";
  bookedAt: number;
};

/* ================================================================== */
/*  Component                                                            */
/* ================================================================== */

export function GolfPanel() {
  const [view, setView] = useState<View>("search");
  const [query, setQuery] = useState("");
  const [date, setDate] = useState<string>(() => todayISO());
  const [players, setPlayers] = useState<number>(2);
  const [hydrated, setHydrated] = useState(false);

  const [searchState, setSearchState] = useState<{
    loading: boolean;
    data: GolfSearchResponse | null;
    error: string | null;
  }>({ loading: false, data: null, error: null });

  const [selectedCourse, setSelectedCourse] =
    useState<GolfCourseResult | null>(null);
  const [availabilityState, setAvailabilityState] = useState<{
    loading: boolean;
    teeTimes: TeeTime[];
  }>({ loading: false, teeTimes: [] });
  const [selectedTeeTime, setSelectedTeeTime] = useState<TeeTime | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(
    null,
  );

  // Abort controllers for in-flight search + availability fetches so
  // rapid input doesn't race — older requests cancel the moment a
  // newer one fires, and the latest response always wins. Also
  // aborted on unmount so a stale response can't setState on a
  // torn-down component.
  const searchAbortRef = useRef<AbortController | null>(null);
  const availabilityAbortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      searchAbortRef.current?.abort();
      availabilityAbortRef.current?.abort();
    };
  }, []);

  // Hydrate persisted prefs once on mount.
  useEffect(() => {
    try {
      const lastQuery = window.localStorage.getItem(SEARCH_KEY);
      if (lastQuery) setQuery(lastQuery);
      const lastDate = window.localStorage.getItem(DATE_KEY);
      if (lastDate && /^\d{4}-\d{2}-\d{2}$/.test(lastDate)) {
        // Only honor saved date if it's still in the future.
        if (lastDate >= todayISO()) setDate(lastDate);
      }
      const lastPlayers = parseInt(
        window.localStorage.getItem(PLAYERS_KEY) ?? "",
        10,
      );
      if (lastPlayers >= 1 && lastPlayers <= 4) setPlayers(lastPlayers);
    } catch {
      /* ignore */
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist as the user changes prefs.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(DATE_KEY, date);
      window.localStorage.setItem(PLAYERS_KEY, String(players));
    } catch {
      /* ignore */
    }
  }, [date, players, hydrated]);

  /* -------- search -------- */
  const runSearch = useCallback(async (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setSearchState({ loading: true, data: null, error: null });
    try {
      window.localStorage.setItem(SEARCH_KEY, q);
    } catch {
      /* ignore */
    }
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    try {
      const res = await fetch(`/api/golf/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      });
      const data = (await res.json()) as GolfSearchResponse;
      if (controller.signal.aborted) return;
      setSearchState({
        loading: false,
        data,
        error: data.error ?? null,
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      setSearchState({
        loading: false,
        data: null,
        error: err instanceof Error ? err.message : "Search failed.",
      });
    }
  }, []);

  /* -------- course detail / availability -------- */
  const fetchAvailability = useCallback(
    async (course: GolfCourseResult, isoDate: string, p: number) => {
      setAvailabilityState({ loading: true, teeTimes: [] });
      availabilityAbortRef.current?.abort();
      const controller = new AbortController();
      availabilityAbortRef.current = controller;
      try {
        const res = await fetch(
          `/api/golf/availability?courseId=${encodeURIComponent(course.id)}&date=${isoDate}&players=${p}`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as AvailabilityResponse;
        if (controller.signal.aborted) return;
        setAvailabilityState({
          loading: false,
          teeTimes: data.teeTimes ?? [],
        });
      } catch {
        if (controller.signal.aborted) return;
        setAvailabilityState({ loading: false, teeTimes: [] });
      }
    },
    [],
  );

  const openCourse = useCallback(
    (course: GolfCourseResult) => {
      setSelectedCourse(course);
      setSelectedTeeTime(null);
      setView("detail");
      void fetchAvailability(course, date, players);
    },
    [date, players, fetchAvailability],
  );

  // Re-fetch availability when date or players change inside detail view.
  useEffect(() => {
    if (view !== "detail" || !selectedCourse) return;
    setSelectedTeeTime(null);
    void fetchAvailability(selectedCourse, date, players);
  }, [date, players, view, selectedCourse, fetchAvailability]);

  /* -------- booking -------- */
  const submitBooking = () => {
    if (!selectedCourse || !selectedTeeTime || confirming) return;
    setConfirming(true);
    window.setTimeout(() => {
      const total = selectedTeeTime.pricePerPlayer * players;
      const confirmation = makeConfirmation(selectedCourse.name);
      const booking: Booking = {
        id: `bk-${Date.now()}`,
        confirmation,
        courseId: selectedCourse.id,
        courseName: selectedCourse.name,
        courseImage: selectedCourse.image,
        time: selectedTeeTime.time,
        players,
        pricePerPlayer: selectedTeeTime.pricePerPlayer,
        total,
        holes: selectedTeeTime.holes,
        mode: selectedTeeTime.rideOrWalk,
        bookedAt: Date.now(),
      };
      setConfirmedBooking(booking);
      setConfirming(false);
      setView("confirmed");
      try {
        const raw = window.localStorage.getItem(BOOKINGS_KEY) ?? "[]";
        const list = JSON.parse(raw) as Booking[];
        const next = [booking, ...list].slice(0, 20);
        window.localStorage.setItem(BOOKINGS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      triggerDopamine("buy");
    }, SUBMIT_DELAY_MS);
  };

  const resetToSearch = () => {
    setSelectedCourse(null);
    setSelectedTeeTime(null);
    setAvailabilityState({ loading: false, teeTimes: [] });
    setConfirmedBooking(null);
    setView("search");
  };

  /* ================================================================ */
  /*  Render                                                          */
  /* ================================================================ */

  if (view === "confirmed" && confirmedBooking) {
    return (
      <ConfirmedView booking={confirmedBooking} onReset={resetToSearch} />
    );
  }

  if (view === "detail" && selectedCourse) {
    return (
      <DetailView
        course={selectedCourse}
        date={date}
        players={players}
        onChangeDate={setDate}
        onChangePlayers={setPlayers}
        onBack={() => setView("search")}
        availability={availabilityState}
        selectedTeeTime={selectedTeeTime}
        onSelectTeeTime={setSelectedTeeTime}
        onConfirm={submitBooking}
        confirming={confirming}
      />
    );
  }

  return (
    <SearchView
      query={query}
      onQueryChange={setQuery}
      date={date}
      onDateChange={setDate}
      players={players}
      onPlayersChange={setPlayers}
      state={searchState}
      onSearch={() => runSearch(query)}
      onPickLocation={(loc) => {
        setQuery(loc);
        void runSearch(loc);
      }}
      onOpenCourse={openCourse}
    />
  );
}

/* ================================================================== */
/*  Search view                                                          */
/* ================================================================== */

function SearchView({
  query,
  onQueryChange,
  date,
  onDateChange,
  players,
  onPlayersChange,
  state,
  onSearch,
  onPickLocation,
  onOpenCourse,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  date: string;
  onDateChange: (v: string) => void;
  players: number;
  onPlayersChange: (v: number) => void;
  state: { loading: boolean; data: GolfSearchResponse | null; error: string | null };
  onSearch: () => void;
  onPickLocation: (location: string) => void;
  onOpenCourse: (course: GolfCourseResult) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <SearchHeader
        query={query}
        onQueryChange={onQueryChange}
        date={date}
        onDateChange={onDateChange}
        players={players}
        onPlayersChange={onPlayersChange}
        onSearch={onSearch}
        inputRef={inputRef}
      />

      <div className="@container scroll-thin min-h-0 flex-1 overflow-y-auto">
        {state.loading ? (
          <ResultsSkeleton />
        ) : state.error ? (
          <EmptyMessage message={state.error} />
        ) : state.data === null ? (
          <SearchIntro onPick={onPickLocation} />
        ) : state.data.courses.length === 0 ? (
          <EmptyMessage message="No golf courses found within 50 miles." />
        ) : (
          <ResultsList
            center={state.data.center}
            courses={state.data.courses}
            onOpenCourse={onOpenCourse}
          />
        )}
      </div>
    </div>
  );
}

function SearchHeader({
  query,
  onQueryChange,
  date,
  onDateChange,
  players,
  onPlayersChange,
  onSearch,
  inputRef,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  date: string;
  onDateChange: (v: string) => void;
  players: number;
  onPlayersChange: (v: number) => void;
  onSearch: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const minDate = todayISO();
  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-white/[0.05] px-3 py-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
        className="flex items-center gap-1.5"
      >
        <div className="relative inline-flex h-10 min-w-0 flex-1 items-center rounded-lg bg-surface-1 pl-3 transition-[background-color,box-shadow] duration-150 ease-out focus-within:bg-surface-3 focus-within:ring-2 focus-within:ring-primary/60">
          <Search
            className="size-4 shrink-0 text-muted-foreground"
            strokeWidth={2}
            aria-hidden
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="City, state, or zip"
            aria-label="Search golf courses by location"
            className="size-full min-w-0 flex-1 bg-transparent px-2.5 text-body text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button
          type="submit"
          disabled={!query.trim()}
          className="inline-flex h-10 shrink-0 items-center rounded-lg bg-primary px-3.5 text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Search
        </button>
      </form>

      <div className="flex items-center gap-2">
        <label className="inline-flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md bg-surface-1 px-3 text-caption text-muted-foreground transition-colors focus-within:bg-white/[0.07]">
          <span>Date</span>
          <input
            type="date"
            value={date}
            min={minDate}
            onChange={(e) => onDateChange(e.target.value)}
            aria-label="Tee-time date"
            className="ml-auto min-w-0 bg-transparent text-body tabular-nums text-foreground outline-none [color-scheme:dark]"
          />
        </label>
        <PlayersStepper value={players} onChange={onPlayersChange} />
      </div>
    </div>
  );
}

function PlayersStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Players"
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-surface-1 px-1.5"
    >
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Decrease players"
        className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <Minus className="size-3.5" strokeWidth={2} aria-hidden />
      </button>
      <span className="min-w-[3.5rem] text-center text-caption tabular-nums text-foreground">
        {value} {value === 1 ? "player" : "players"}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(4, value + 1))}
        disabled={value >= 4}
        aria-label="Increase players"
        className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <Plus className="size-3.5" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

function SearchIntro({ onPick }: { onPick: (loc: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 py-8 text-center">
      <span
        aria-hidden
        className="grid size-12 place-items-center rounded-full bg-surface-1 text-muted-foreground ring-1 ring-inset ring-white/[0.06]"
      >
        <MapPin className="size-5" strokeWidth={1.75} />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-body font-semibold text-foreground text-balance">
          Find a tee time anywhere
        </p>
        <p className="max-w-[280px] text-body text-muted-foreground text-pretty">
          Search any city, state, or zip — we&apos;ll find real golf courses
          within 50 miles.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {QUICK_LOCATIONS.map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => onPick(loc)}
            className="inline-flex h-8 items-center rounded-full bg-surface-1 px-3 text-caption font-medium text-muted-foreground transition-colors hover:bg-surface-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            {loc}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-[96px]" />
      ))}
    </div>
  );
}

function ResultsList({
  center,
  courses,
  onOpenCourse,
}: {
  center: GolfSearchResponse["center"];
  courses: GolfCourseResult[];
  onOpenCourse: (course: GolfCourseResult) => void;
}) {
  return (
    <div className="flex flex-col gap-1 p-2">
      {center && (
        <div className="flex items-center gap-1.5 px-1 pb-1 text-caption text-muted-foreground">
          <MapPin className="size-3" strokeWidth={1.75} aria-hidden />
          <span>Near {center.displayName}</span>
          <span className="ml-auto tabular-nums">
            {courses.length} {courses.length === 1 ? "course" : "courses"}
          </span>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {courses.map((c) => (
          <ResultRow key={c.id} course={c} onOpen={() => onOpenCourse(c)} />
        ))}
      </div>
    </div>
  );
}

function ResultRow({
  course,
  onOpen,
}: {
  course: GolfCourseResult;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`View tee times for ${course.name}`}
      className="group flex w-full items-stretch gap-3 overflow-hidden rounded-lg bg-white/[0.03] p-2.5 text-left ring-1 ring-inset ring-white/[0.06] transition-[background-color,scale] duration-150 ease-out hover:bg-surface-1 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      <CourseThumb image={course.image} alt={course.name} size={72} />
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <span className="line-clamp-1 text-body font-semibold text-foreground">
          {course.name}
        </span>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-caption text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" strokeWidth={1.75} aria-hidden />
            {course.distanceMi.toFixed(1)} mi
            {course.city && ` · ${course.city}`}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star
              className="size-3 fill-current"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="tabular-nums">{course.rating.toFixed(1)}</span>
          </span>
          <AccessPill access={course.access} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-center gap-0.5 pl-2">
        <span className="text-caption text-muted-foreground">from</span>
        <span className="text-body font-semibold text-foreground tabular-nums">
          {USD.format(course.fromPrice)}
        </span>
      </div>
    </button>
  );
}

function AccessPill({ access }: { access: string }) {
  const label =
    access === "public"
      ? "Public"
      : access === "private"
        ? "Private"
        : access === "semi-private"
          ? "Semi-private"
          : access;
  return (
    <Pill tone={access === "private" ? "muted" : "neutral"} size="sm">
      {label}
    </Pill>
  );
}

/* ================================================================== */
/*  Detail view                                                          */
/* ================================================================== */

function DetailView({
  course,
  date,
  players,
  onChangeDate,
  onChangePlayers,
  onBack,
  availability,
  selectedTeeTime,
  onSelectTeeTime,
  onConfirm,
  confirming,
}: {
  course: GolfCourseResult;
  date: string;
  players: number;
  onChangeDate: (d: string) => void;
  onChangePlayers: (p: number) => void;
  onBack: () => void;
  availability: { loading: boolean; teeTimes: TeeTime[] };
  selectedTeeTime: TeeTime | null;
  onSelectTeeTime: (t: TeeTime) => void;
  onConfirm: () => void;
  confirming: boolean;
}) {
  const grouped = useMemo(
    () => groupByDaypart(availability.teeTimes),
    [availability.teeTimes],
  );
  const minDate = todayISO();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.05] px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to results"
          className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-2 hover:text-foreground active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
        <span className="line-clamp-1 text-body font-medium text-foreground">
          {course.name}
        </span>
      </div>

      <div className="@container scroll-thin min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 p-3">
          <CourseHero course={course} />
          <div className="flex items-center gap-2">
            <label className="inline-flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md bg-surface-1 px-3 text-caption text-muted-foreground transition-colors focus-within:bg-white/[0.07]">
              <span>Date</span>
              <input
                type="date"
                value={date}
                min={minDate}
                onChange={(e) => onChangeDate(e.target.value)}
                aria-label="Tee-time date"
                className="ml-auto min-w-0 bg-transparent text-body tabular-nums text-foreground outline-none [color-scheme:dark]"
              />
            </label>
            <PlayersStepper value={players} onChange={onChangePlayers} />
          </div>

          {availability.loading && availability.teeTimes.length === 0 ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[44px]" />
              ))}
            </div>
          ) : availability.teeTimes.length === 0 ? (
            <EmptyMessage message="No tee times available for this date. Try another day or smaller group." />
          ) : (
            <div className="flex flex-col gap-3">
              {grouped.map(({ label, Icon, slots }) =>
                slots.length === 0 ? null : (
                  <DaypartSection
                    key={label}
                    label={label}
                    Icon={Icon}
                    slots={slots}
                    selectedId={selectedTeeTime?.id ?? null}
                    onSelect={onSelectTeeTime}
                  />
                ),
              )}
            </div>
          )}
        </div>
      </div>

      {selectedTeeTime && (
        <BookingBar
          tee={selectedTeeTime}
          players={players}
          confirming={confirming}
          onConfirm={onConfirm}
        />
      )}
    </div>
  );
}

function CourseHero({ course }: { course: GolfCourseResult }) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="relative aspect-video w-full overflow-hidden bg-surface-1">
        <CourseThumb image={course.image} alt={course.name} fill />
      </div>
      <div className="flex flex-col gap-1 px-3 py-2.5">
        <span className="text-body font-semibold text-foreground">
          {course.name}
        </span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-caption text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" strokeWidth={1.75} aria-hidden />
            {course.distanceMi.toFixed(1)} mi
            {course.city && ` · ${course.city}`}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star
              className="size-3 fill-current text-primary"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="tabular-nums">{course.rating.toFixed(1)}</span>
          </span>
          {course.holes && (
            <span className="tabular-nums">{course.holes} holes</span>
          )}
          <AccessPill access={course.access} />
        </div>
      </div>
    </Card>
  );
}

function DaypartSection({
  label,
  Icon,
  slots,
  selectedId,
  onSelect,
}: {
  label: string;
  Icon: typeof Sunrise;
  slots: TeeTime[];
  selectedId: string | null;
  onSelect: (t: TeeTime) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 px-1 text-caption text-muted-foreground">
        <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
        <span className="uppercase tracking-wide">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 @[420px]:grid-cols-3">
        {slots.map((t) => (
          <TeeTimeButton
            key={t.id}
            tee={t}
            selected={t.id === selectedId}
            onSelect={() => onSelect(t)}
          />
        ))}
      </div>
    </div>
  );
}

function TeeTimeButton({
  tee,
  selected,
  onSelect,
}: {
  tee: TeeTime;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-md px-2.5 py-2 text-left transition-[background-color,scale,box-shadow] duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        selected
          ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_var(--color-primary)]"
          : "bg-surface-1 text-foreground hover:bg-surface-4",
      )}
    >
      <span className="text-body font-semibold tabular-nums">
        {formatTime(tee.time)}
      </span>
      <span
        className={cn(
          "text-caption tabular-nums",
          selected ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {USD.format(tee.pricePerPlayer)} ·{" "}
        {tee.holes === 18 ? "18" : "9"} ·{" "}
        {tee.rideOrWalk === "ride" ? "Ride" : "Walk"}
      </span>
    </button>
  );
}

function BookingBar({
  tee,
  players,
  confirming,
  onConfirm,
}: {
  tee: TeeTime;
  players: number;
  confirming: boolean;
  onConfirm: () => void;
}) {
  const total = tee.pricePerPlayer * players;
  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-white/[0.05] bg-background/95 px-3 py-2 backdrop-blur-sm">
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-body font-semibold text-foreground tabular-nums">
          {formatTime(tee.time)} ·{" "}
          {USD.format(total)}{" "}
          <span className="text-caption font-medium text-muted-foreground">
            total
          </span>
        </span>
        <span className="text-caption text-muted-foreground">
          {players} {players === 1 ? "player" : "players"} ·{" "}
          {USD.format(tee.pricePerPlayer)} each
        </span>
      </div>
      <button
        type="button"
        onClick={onConfirm}
        disabled={confirming}
        aria-busy={confirming}
        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md bg-primary px-4 text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        {confirming ? (
          <>
            <Loader2 className="size-4 animate-spin" strokeWidth={2.25} aria-hidden />
            Booking…
          </>
        ) : (
          "Confirm booking"
        )}
      </button>
    </div>
  );
}

/* ================================================================== */
/*  Confirmation                                                         */
/* ================================================================== */

function ConfirmedView({
  booking,
  onReset,
}: {
  booking: Booking;
  onReset: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center gap-4 p-6 text-center">
          <span
            aria-hidden
            className="grid size-12 place-items-center rounded-full bg-primary text-primary-foreground"
          >
            <Check className="size-6" strokeWidth={2.5} />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-body font-semibold text-foreground">
              Tee time booked
            </p>
            <p className="text-body text-muted-foreground">
              Confirmation{" "}
              <span className="text-foreground tabular-nums">
                {booking.confirmation}
              </span>
            </p>
          </div>
          <Card padding="none" className="w-full overflow-hidden">
            <div className="relative aspect-video w-full overflow-hidden bg-surface-1">
              <CourseThumb
                image={booking.courseImage}
                alt={booking.courseName}
                fill
              />
            </div>
            <div className="flex flex-col gap-2 px-3 py-3 text-left">
              <span className="text-body font-semibold text-foreground">
                {booking.courseName}
              </span>
              <SummaryRow
                label="When"
                value={`${formatLongDate(booking.time)} · ${formatTime(booking.time)}`}
              />
              <SummaryRow
                label="Players"
                value={`${booking.players} ${booking.players === 1 ? "player" : "players"}`}
              />
              <SummaryRow
                label="Format"
                value={`${booking.holes} holes · ${booking.mode === "ride" ? "Riding" : "Walking"}`}
              />
              <SummaryRow
                label="Total"
                value={`${USD.format(booking.total)} (${USD.format(booking.pricePerPlayer)}/player)`}
                tone="primary"
              />
            </div>
          </Card>
        </div>
      </div>
      <div className="shrink-0 border-t border-white/[0.05] px-3 py-2">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-surface-2 text-body font-semibold text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-4 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Book another
        </button>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-body">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-right tabular-nums",
          tone === "primary" ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* ================================================================== */
/*  Shared bits                                                          */
/* ================================================================== */

function CourseThumb({
  image,
  alt,
  size,
  fill,
}: {
  image: string;
  alt: string;
  size?: number;
  fill?: boolean;
}) {
  const [errored, setErrored] = useState(false);
  if (errored) {
    return (
      <div
        aria-hidden
        className={cn(
          "grid place-items-center rounded-md bg-surface-1 text-muted-foreground",
          fill ? "size-full" : "",
        )}
        style={fill ? undefined : { width: size, height: size }}
      >
        <MapPin className="size-4" strokeWidth={1.5} />
      </div>
    );
  }
  if (fill) {
    return (
      <img
        src={image}
        alt={alt}
        className="absolute inset-0 size-full object-cover"
        onError={() => setErrored(true)}
      />
    );
  }
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-md bg-surface-1"
      style={{ width: size, height: size }}
    >
      <img
        src={image}
        alt={alt}
        className="absolute inset-0 size-full object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center text-body text-muted-foreground">
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                              */
/* ------------------------------------------------------------------ */

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatTime(iso: string): string {
  // Treat as local time (no timezone suffix means JS uses local on parse).
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatLongDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type DaypartGroup = {
  label: string;
  Icon: typeof Sunrise;
  slots: TeeTime[];
};

function groupByDaypart(times: TeeTime[]): DaypartGroup[] {
  const morning: TeeTime[] = [];
  const midday: TeeTime[] = [];
  const afternoon: TeeTime[] = [];
  for (const t of times) {
    const h = parseInt(t.time.slice(11, 13), 10);
    if (h < 11) morning.push(t);
    else if (h < 14) midday.push(t);
    else afternoon.push(t);
  }
  return [
    { label: "Morning", Icon: Sunrise, slots: morning },
    { label: "Midday", Icon: Sun, slots: midday },
    { label: "Afternoon", Icon: Sunset, slots: afternoon },
  ];
}

function makeConfirmation(courseName: string): string {
  // Two-segment confirmation: course initials + random alphanumeric.
  const prefix = courseName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix || "GLF"}-${suffix}`;
}
