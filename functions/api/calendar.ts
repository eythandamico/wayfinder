/**
 * Calendar sync via public ICS subscribe URLs.
 *
 * Every major calendar provider exposes a per-calendar "public ICS"
 * URL — no OAuth required. This route accepts a list of those URLs,
 * fetches each, and returns a normalised event stream the panel can
 * render directly.
 *
 *   - Google: Calendar settings → "Integrate calendar" → secret iCal
 *   - iCloud: Calendar → "Public Calendar" toggle (webcal:// → https://)
 *   - Outlook: Settings → Shared calendars → "Publish a calendar"
 *
 * This is the universal sync path. Layered OAuth on top later would
 * enable write access (creating events) but isn't needed for view.
 *
 * Runs at the edge — pure fetch + string parsing, no Node deps.
 */

type Env = Record<string, unknown>;

export type CalendarEvent = {
  /** Stable id we synthesise from UID + start time for React keys. */
  id: string;
  calendarId: string;
  calendarName: string;
  color: string;
  /** Plain-text summary line from the ICS. */
  title: string;
  /** Free-form description (often empty). */
  description?: string;
  location?: string;
  /** Epoch millis. */
  start: number;
  /** Epoch millis. */
  end: number;
  /** True if the event is "all day" (no time component on either side). */
  allDay: boolean;
};

export type CalendarSource = {
  id: string;
  name: string;
  color: string;
  url: string;
};

export type CalendarSyncResponse = {
  events: CalendarEvent[];
  /** Per-source status so the UI can show which calendars failed. */
  sources: Array<{
    id: string;
    name: string;
    ok: boolean;
    eventCount: number;
    error?: string;
  }>;
};

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  let body: { sources?: CalendarSource[] };
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const sources = Array.isArray(body.sources) ? body.sources : [];
  if (sources.length === 0) {
    return json({ events: [], sources: [] } satisfies CalendarSyncResponse);
  }

  const results = await Promise.all(
    sources.map(async (src) => {
      try {
        // webcal:// → https:// — Apple's URL scheme that browsers
        // hand to Calendar.app but doesn't fetch via HTTP.
        const url = src.url.replace(/^webcal:\/\//i, "https://");
        const r = await fetch(url, {
          headers: { "User-Agent": "Wayfinder/1.0 (+calendar sync)" },
          // Cache for a minute server-side — calendars rarely change
          // faster than that and we don't want to hammer providers.
          cf: { cacheTtl: 60, cacheEverything: true },
        } as RequestInit);
        if (!r.ok) {
          return {
            src,
            ok: false,
            error: `HTTP ${r.status}`,
            events: [] as CalendarEvent[],
          };
        }
        const text = await r.text();
        const events = parseIcs(text, src);
        return { src, ok: true, error: undefined, events };
      } catch (err) {
        return {
          src,
          ok: false,
          error: err instanceof Error ? err.message : "fetch failed",
          events: [] as CalendarEvent[],
        };
      }
    }),
  );

  const events = results.flatMap((r) => r.events);
  // Sort by start ascending so the panel can render straight through.
  events.sort((a, b) => a.start - b.start);

  return json({
    events,
    sources: results.map((r) => ({
      id: r.src.id,
      name: r.src.name,
      ok: r.ok,
      eventCount: r.events.length,
      error: r.error,
    })),
  } satisfies CalendarSyncResponse);
};

/* ------------------------------------------------------------------ */
/*  ICS parser — minimal but real                                      */
/* ------------------------------------------------------------------ */

/**
 * Parses VEVENT blocks out of an ICS feed. We handle the subset that
 * Google/iCloud/Outlook actually emit:
 *
 *   - Line unfolding (RFC 5545 §3.1 — continuation lines start with
 *     a space or tab).
 *   - Property params (TZID=, VALUE=DATE, etc.) — we don't honor
 *     TZID for time math; we treat tz-naive values as local-ish and
 *     emit a UTC epoch from the date components. Good enough for
 *     display; not good enough for invitation math.
 *   - All-day events (VALUE=DATE) get midnight-to-midnight ranges.
 *   - Recurring events (RRULE) are NOT expanded — we'd need a full
 *     rrule lib for that. The panel's "next N events" view doesn't
 *     surface recurring instances yet; documented as a known gap.
 */
function parseIcs(text: string, src: CalendarSource): CalendarEvent[] {
  const unfolded = unfoldLines(text);
  const events: CalendarEvent[] = [];
  let inEvent = false;
  let cur: Record<string, { value: string; params: Record<string, string> }> | null = null;

  for (const line of unfolded) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) {
        const ev = buildEvent(cur, src);
        if (ev) events.push(ev);
      }
      inEvent = false;
      cur = null;
      continue;
    }
    if (!inEvent || !cur) continue;
    const parsed = parseProperty(line);
    if (!parsed) continue;
    cur[parsed.name] = { value: parsed.value, params: parsed.params };
  }
  return events;
}

/** Join wrapped lines back together (RFC 5545 §3.1 continuation). */
function unfoldLines(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function parseProperty(line: string): {
  name: string;
  params: Record<string, string>;
  value: string;
} | null {
  // The split is on the FIRST unquoted colon — params can contain
  // colons inside quoted strings, but the property name + params
  // section ends at the first bare `:`.
  let depth = 0;
  let split = -1;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') depth = depth === 0 ? 1 : 0;
    else if (c === ":" && depth === 0) {
      split = i;
      break;
    }
  }
  if (split < 0) return null;
  const head = line.slice(0, split);
  const value = line.slice(split + 1);
  const parts = head.split(";");
  const name = parts[0].toUpperCase();
  const params: Record<string, string> = {};
  for (let i = 1; i < parts.length; i++) {
    const eq = parts[i].indexOf("=");
    if (eq < 0) continue;
    params[parts[i].slice(0, eq).toUpperCase()] = parts[i].slice(eq + 1);
  }
  return { name, params, value: unescapeIcsText(value) };
}

/** Unescape \n, \,, \;, \\ per RFC 5545 §3.3.11. */
function unescapeIcsText(s: string): string {
  return s
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function buildEvent(
  props: Record<string, { value: string; params: Record<string, string> }>,
  src: CalendarSource,
): CalendarEvent | null {
  const dtstart = props["DTSTART"];
  const dtend = props["DTEND"] ?? props["DTSTART"]; // some all-day have no end
  const summary = props["SUMMARY"]?.value;
  const uid = props["UID"]?.value ?? Math.random().toString(36).slice(2);
  if (!dtstart || !summary) return null;

  const allDay = dtstart.params["VALUE"] === "DATE";
  const start = parseIcsDate(dtstart.value, allDay);
  const end = parseIcsDate(dtend.value, allDay);
  if (start === null || end === null) return null;

  return {
    id: `${src.id}:${uid}:${start}`,
    calendarId: src.id,
    calendarName: src.name,
    color: src.color,
    title: summary,
    description: props["DESCRIPTION"]?.value,
    location: props["LOCATION"]?.value,
    start,
    end,
    allDay,
  };
}

/**
 * Parse an ICS date or datetime value. Handles:
 *   - YYYYMMDD                  (date — all-day)
 *   - YYYYMMDDTHHMMSS           (floating, treat as UTC for display)
 *   - YYYYMMDDTHHMMSSZ          (UTC)
 *
 * TZID-prefixed datetimes are not timezone-resolved here — we treat
 * the wall-clock value as UTC. The agenda view's "in 2 hours" copy
 * is consistent because everything is compared in millis, but a
 * 9:00am London event for a NY user would still render as 9:00am.
 * Documented; revisit if users care.
 */
function parseIcsDate(raw: string, allDay: boolean): number | null {
  if (allDay) {
    if (!/^\d{8}$/.test(raw)) return null;
    const y = +raw.slice(0, 4);
    const m = +raw.slice(4, 6) - 1;
    const d = +raw.slice(6, 8);
    return Date.UTC(y, m, d);
  }
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
