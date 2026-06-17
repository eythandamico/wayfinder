/**
 * Concert search via the Ticketmaster Discovery API.
 *
 *   docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 *
 * Requires TICKETMASTER_API_KEY in env. Free tier is 5000 calls/day
 * which is plenty for an interactive search panel.
 *
 * Search supports artist keyword + city + date range. Returns the
 * upstream event list trimmed to fields the panel renders, plus the
 * Ticketmaster `url` field that the panel hands off to for purchase
 * (no public buy-endpoint exists — every concert app deep-links the
 * official purchase page).
 */

interface Env {
  TICKETMASTER_API_KEY?: string;
}

export type ConcertEvent = {
  id: string;
  name: string;
  /** Epoch millis of the local start time. */
  start: number;
  venue: string;
  city?: string;
  country?: string;
  image?: string;
  /** Display "from $X" if there's a public price band. */
  priceFrom?: number;
  priceCurrency?: string;
  /** Ticketmaster's canonical event page — open this for purchase. */
  url: string;
  genre?: string;
};

export type ConcertSearchResponse = {
  events: ConcertEvent[];
  /** Echoed so the client can display "Concerts near {city}". */
  city?: string;
  error?: string;
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const keyword = url.searchParams.get("q") ?? "";
  const city = url.searchParams.get("city") ?? "";
  const country = url.searchParams.get("country") ?? "US";
  const apiKey = env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    return json({
      events: [],
      error:
        "TICKETMASTER_API_KEY missing — register a free key at developer.ticketmaster.com and add it to env.",
    } satisfies ConcertSearchResponse);
  }

  const params = new URLSearchParams({
    apikey: apiKey,
    classificationName: "music",
    size: "30",
    sort: "date,asc",
    countryCode: country,
  });
  if (keyword) params.set("keyword", keyword);
  if (city) params.set("city", city);

  const upstream = `https://app.ticketmaster.com/discovery/v2/events.json?${params}`;
  let data: unknown;
  try {
    const r = await fetch(upstream, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: 60, cacheEverything: true },
    } as RequestInit);
    if (!r.ok) {
      return json({
        events: [],
        error: `Ticketmaster ${r.status}`,
      } satisfies ConcertSearchResponse);
    }
    data = await r.json();
  } catch (err) {
    return json({
      events: [],
      error: err instanceof Error ? err.message : "fetch failed",
    } satisfies ConcertSearchResponse);
  }

  const events = normalize(data);
  return json({
    events,
    city: city || undefined,
  } satisfies ConcertSearchResponse);
};

type TMRoot = {
  _embedded?: {
    events?: Array<{
      id: string;
      name: string;
      url: string;
      images?: Array<{ url: string; width?: number; ratio?: string }>;
      dates?: { start?: { dateTime?: string; localDate?: string } };
      priceRanges?: Array<{ min?: number; currency?: string }>;
      classifications?: Array<{
        genre?: { name?: string };
        subGenre?: { name?: string };
      }>;
      _embedded?: {
        venues?: Array<{
          name?: string;
          city?: { name?: string };
          country?: { name?: string; countryCode?: string };
        }>;
      };
    }>;
  };
};

function normalize(raw: unknown): ConcertEvent[] {
  const root = raw as TMRoot;
  const items = root._embedded?.events ?? [];
  return items
    .map((e): ConcertEvent | null => {
      const startIso = e.dates?.start?.dateTime ?? e.dates?.start?.localDate;
      if (!startIso) return null;
      const startMs = new Date(startIso).getTime();
      if (!Number.isFinite(startMs)) return null;
      const venueObj = e._embedded?.venues?.[0];
      const venue = venueObj?.name ?? "TBA";
      const image = pickImage(e.images);
      const price = e.priceRanges?.[0];
      const genre =
        e.classifications?.[0]?.genre?.name ??
        e.classifications?.[0]?.subGenre?.name;
      return {
        id: e.id,
        name: e.name,
        start: startMs,
        venue,
        city: venueObj?.city?.name,
        country: venueObj?.country?.countryCode ?? venueObj?.country?.name,
        image,
        priceFrom: typeof price?.min === "number" ? price.min : undefined,
        priceCurrency: price?.currency,
        url: e.url,
        genre,
      };
    })
    .filter((x): x is ConcertEvent => x !== null);
}

/** Pick the best image — prefer 16:9 mid-size to keep cards tidy. */
function pickImage(
  images?: Array<{ url: string; width?: number; ratio?: string }>,
): string | undefined {
  if (!images || images.length === 0) return undefined;
  const sixteenNine = images.find(
    (i) => i.ratio === "16_9" && (i.width ?? 0) >= 600,
  );
  if (sixteenNine) return sixteenNine.url;
  return images[0].url;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
