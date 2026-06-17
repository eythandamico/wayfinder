/**
 * /api/golf/search — real golf-course discovery near a user-supplied
 * location.
 *
 * Two free upstreams in series:
 *   1. Nominatim (OpenStreetMap) geocodes the location text into
 *      lat/lng + a normalized display name.
 *   2. Overpass API queries OpenStreetMap for `leisure=golf_course`
 *      ways and relations within ~50 miles of that point. Returns
 *      real course names, coordinates, and any address tags the OSM
 *      community has attached.
 *
 * Per-result fields (rating, "from" price, hero image) are
 * synthesized from a stable hash of the course id so they don't
 * jitter between requests. End-to-end booking through a partner API
 * (GolfNow / Supreme Golf / TeeOff) isn't publicly available, so the
 * synthesized half is necessary; the discovery half is genuinely
 * live OSM data.
 */

type Env = Record<string, unknown>;

const REVALIDATE_SECONDS = 300;
/** ~50 miles in meters — matches Overpass's `around:` operator unit. */
const SEARCH_RADIUS_METERS = 80_000;
const MAX_RESULTS = 20;

/** Pool of Unsplash photos that read as plausible golf-course
 *  thumbnails. Each result deterministically picks one via its id hash
 *  so the same course always shows the same image. */
const COURSE_IMAGE_POOL = [
  "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=480&q=70",
  "https://images.unsplash.com/photo-1592919505780-303950717480?w=480&q=70",
  "https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?w=480&q=70",
  "https://images.unsplash.com/photo-1551727974-8af20a3322f4?w=480&q=70",
  "https://images.unsplash.com/photo-1576174464184-fb78fe882bfd?w=480&q=70",
  "https://images.unsplash.com/photo-1607867833083-1b91b53dd5e6?w=480&q=70",
];

/* ------------------------------------------------------------------ */
/*  Public response                                                      */
/* ------------------------------------------------------------------ */

export type SearchCenter = {
  /** Display string from Nominatim — what the user actually got. */
  displayName: string;
  lat: number;
  lng: number;
};

export type GolfCourseResult = {
  /** Stable id — `{way|relation}-{osmId}`. Used by the availability
   *  route as the deterministic seed. */
  id: string;
  name: string;
  /** Best-effort city + state from OSM tags. May be null. */
  city: string | null;
  state: string | null;
  /** Distance from the search center in miles. */
  distanceMi: number;
  lat: number;
  lng: number;
  /** "public" | "private" | "semi-private" — from OSM `access` tag. */
  access: string;
  /** Number of holes when OSM tagged it; null otherwise. */
  holes: number | null;
  /** Synthesized: 3.6 – 4.9, stable per course id. */
  rating: number;
  /** Synthesized "from $X" floor price. */
  fromPrice: number;
  /** Synthesized image URL from the curated pool. */
  image: string;
};

export type GolfSearchResponse = {
  center: SearchCenter | null;
  courses: GolfCourseResult[];
  error?: string;
};

/* ------------------------------------------------------------------ */
/*  Handler                                                              */
/* ------------------------------------------------------------------ */

export const onRequestGet: PagesFunction<Env> = async ({ request }) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  if (!q) {
    return Response.json({
      center: null,
      courses: [],
    } satisfies GolfSearchResponse);
  }

  const place = await geocode(q);
  if (!place) {
    return Response.json({
      center: null,
      courses: [],
      error: "Couldn't find that location.",
    } satisfies GolfSearchResponse);
  }

  const courses = await findCoursesNear(place.lat, place.lng);

  return Response.json({
    center: place,
    courses,
  } satisfies GolfSearchResponse);
};

/* ------------------------------------------------------------------ */
/*  Nominatim geocoding                                                  */
/* ------------------------------------------------------------------ */

async function geocode(q: string): Promise<SearchCenter | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");

  try {
    const res = await fetch(url.toString(), {
      headers: {
        // Nominatim requires identifying User-Agent on every request.
        "User-Agent": "Wayfinder-Golf/1.0 (contact@wayfinder.app)",
        Accept: "application/json",
      },
      cf: { cacheTtl: REVALIDATE_SECONDS, cacheEverything: true },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name: string;
    }>;
    const first = data[0];
    if (!first) return null;
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { displayName: shortenDisplayName(first.display_name), lat, lng };
  } catch {
    return null;
  }
}

/** Nominatim returns very verbose names like "Atlanta, Fulton County,
 *  Georgia, United States". We trim to the first 2-3 segments. */
function shortenDisplayName(s: string): string {
  const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 2) return s;
  return `${parts[0]}, ${parts[parts.length - 2]}`;
}

/* ------------------------------------------------------------------ */
/*  Overpass — real golf-course features                                 */
/* ------------------------------------------------------------------ */

type OverpassElement = {
  type: "way" | "relation" | "node";
  id: number;
  center?: { lat: number; lon: number };
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
};

async function findCoursesNear(
  lat: number,
  lng: number,
): Promise<GolfCourseResult[]> {
  const query = `[out:json][timeout:25];
(
  way["leisure"="golf_course"](around:${SEARCH_RADIUS_METERS},${lat},${lng});
  relation["leisure"="golf_course"](around:${SEARCH_RADIUS_METERS},${lat},${lng});
);
out center tags;`;

  try {
    // Overpass accepts either form-encoded `data=…` or the raw query
    // string as the request body. The form-encoded path returns 406
    // from this instance for reasons I can't pin down — sending the
    // raw body works reliably across mirrors.
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      headers: {
        "User-Agent": "Wayfinder-Golf/1.0 (contact@wayfinder.app)",
        Accept: "application/json",
      },
      cf: { cacheTtl: REVALIDATE_SECONDS, cacheEverything: true },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { elements?: OverpassElement[] };
    const courses: GolfCourseResult[] = [];

    for (const el of data.elements ?? []) {
      const center = el.center
        ? { lat: el.center.lat, lng: el.center.lon }
        : el.lat != null && el.lon != null
          ? { lat: el.lat, lng: el.lon }
          : null;
      if (!center) continue;
      const tags = el.tags ?? {};
      const name = tags.name ?? tags["alt_name"];
      if (!name) continue;
      const id = `${el.type}-${el.id}`;
      const distanceMi = haversineMiles(lat, lng, center.lat, center.lng);
      courses.push({
        id,
        name,
        city: tags["addr:city"] ?? null,
        state: tags["addr:state"] ?? null,
        distanceMi,
        lat: center.lat,
        lng: center.lng,
        access: normalizeAccess(tags.access),
        holes: tags.holes ? parseInt(tags.holes, 10) : null,
        rating: synthRating(id),
        fromPrice: synthFromPrice(id, tags.access),
        image: pickImage(id),
      });
    }

    courses.sort((a, b) => a.distanceMi - b.distanceMi);
    return courses.slice(0, MAX_RESULTS);
  } catch {
    return [];
  }
}

function normalizeAccess(v: string | undefined): string {
  if (!v) return "public";
  const s = v.toLowerCase();
  if (s === "yes" || s === "permissive") return "public";
  if (s === "private" || s === "members") return "private";
  if (s === "customers") return "semi-private";
  return s;
}

/* ------------------------------------------------------------------ */
/*  Distance                                                              */
/* ------------------------------------------------------------------ */

function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/* ------------------------------------------------------------------ */
/*  Deterministic synthesis                                              */
/* ------------------------------------------------------------------ */

function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function synthRating(id: string): number {
  const seed = hashString(`rating:${id}`);
  // 3.6 to 4.9 in 0.1 steps
  const n = 36 + (seed % 14);
  return Math.round(n) / 10;
}

function synthFromPrice(id: string, access: string | undefined): number {
  const seed = hashString(`price:${id}`);
  const isPrivate = (access ?? "").toLowerCase() === "private";
  const base = isPrivate ? 180 : 55;
  const variance = seed % 80;
  return base + variance;
}

function pickImage(id: string): string {
  const seed = hashString(`img:${id}`);
  return COURSE_IMAGE_POOL[seed % COURSE_IMAGE_POOL.length];
}
