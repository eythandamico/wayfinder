/**
 * /api/golf/availability — synthetic tee-time grid for a (course, date)
 * pair.
 *
 * No public golf-booking API exposes real-time availability + pricing,
 * so we generate a deterministic-but-plausible grid keyed on the
 * course id + date. The same course + date always returns the same
 * grid, which (a) makes "I saw $58 a minute ago" rendering stable
 * across remounts, and (b) makes hover/click states predictable while
 * we develop.
 *
 * The synthesis approximates real golf-shop pricing patterns —
 * weekend premium, morning premium, occasional walk-only / 9-hole
 * slots, varying group sizes — so the panel reads as a real booking
 * surface even though no reservation is actually being made.
 */

type Env = Record<string, unknown>;

/** Earliest slot offered. 6:30 AM is a typical first off-time. */
const FIRST_SLOT_MIN = 6 * 60 + 30;
/** Last slot offered. After ~4 PM there's not enough light for 18. */
const LAST_SLOT_MIN = 16 * 60;
/** Stride between candidate slots in minutes. Typical shops post in
 *  7-10 minute increments. */
const SLOT_STRIDE_MIN = 10;

export type TeeTime = {
  id: string;
  /** ISO datetime — `YYYY-MM-DDTHH:MM:00`. No timezone suffix because
   *  we treat times as local to the course. */
  time: string;
  /** Per-player USD. */
  pricePerPlayer: number;
  rideOrWalk: "ride" | "walk";
  holes: 9 | 18;
  /** Max party size still bookable at this slot. */
  playersAvailable: number;
};

export type AvailabilityResponse = {
  teeTimes: TeeTime[];
};

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const url = new URL(request.url);
  const courseId = url.searchParams.get("courseId")?.trim();
  const date = url.searchParams.get("date")?.trim();
  const players = clamp(parseInt(url.searchParams.get("players") ?? "2", 10), 1, 4);

  if (!courseId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ teeTimes: [] } satisfies AvailabilityResponse, {
      status: 400,
    });
  }

  const teeTimes = generateTeeTimes(courseId, date, players);
  return Response.json({ teeTimes } satisfies AvailabilityResponse);
};

/* ------------------------------------------------------------------ */
/*  Synthesis                                                            */
/* ------------------------------------------------------------------ */

function generateTeeTimes(
  courseId: string,
  date: string,
  minPlayers: number,
): TeeTime[] {
  let seed = hashString(`${courseId}::${date}`);
  const baseRate = baseRateFor(courseId, date);
  const out: TeeTime[] = [];

  for (let mins = FIRST_SLOT_MIN; mins <= LAST_SLOT_MIN; mins += SLOT_STRIDE_MIN) {
    seed = next(seed);
    // ~55% of candidate slots are taken; remaining show as available.
    if (seed % 100 < 55) continue;

    const hour = Math.floor(mins / 60);
    const minute = mins % 60;

    // Morning premium tapers across the day. Twilight rate (after 2pm)
    // sees a discount.
    const morningPremium =
      hour < 8 ? 35 : hour < 10 ? 22 : hour < 12 ? 10 : hour >= 14 ? -12 : 0;
    seed = next(seed);
    const variance = ((seed % 21) - 10); // ±10
    const pricePerPlayer = Math.max(
      18,
      Math.round(baseRate + morningPremium + variance),
    );

    seed = next(seed);
    // 22% of slots are walk-only (more common at midday). Otherwise ride.
    const rideOrWalk: TeeTime["rideOrWalk"] =
      seed % 100 < 22 ? "walk" : "ride";

    seed = next(seed);
    // 18 holes default; 12% of afternoon slots get a 9-hole variant.
    const holes: 9 | 18 = hour >= 13 && seed % 100 < 12 ? 9 : 18;

    seed = next(seed);
    // Group capacity: 1-4 with most slots open to 3-4 players.
    const r = seed % 100;
    const playersAvailable = r < 10 ? 1 : r < 30 ? 2 : r < 60 ? 3 : 4;

    if (playersAvailable < minPlayers) continue;

    const timeISO = `${date}T${pad(hour)}:${pad(minute)}:00`;
    out.push({
      id: `tt-${courseId}-${mins}`,
      time: timeISO,
      pricePerPlayer,
      rideOrWalk,
      holes,
      playersAvailable,
    });
  }

  return out;
}

/** Base price for this course on this day. Weekend events bump the
 *  base; otherwise it's deterministic from the course id. */
function baseRateFor(courseId: string, date: string): number {
  const seed = hashString(`base:${courseId}`);
  const dayOfWeek = new Date(`${date}T00:00:00`).getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const courseBase = 45 + (seed % 60); // 45-104
  return courseBase + (isWeekend ? 22 : 0);
}

/* ------------------------------------------------------------------ */
/*  Hash helpers — same as /api/golf/search                              */
/* ------------------------------------------------------------------ */

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function next(seed: number): number {
  return Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
