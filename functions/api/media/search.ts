/**
 * /api/media/search — unified video + stream search across YouTube and
 * Twitch. Powered by:
 *
 *   - YouTube Data API v3 (`/search` with `type=video`). Returns both
 *     regular videos and live broadcasts; we surface a `isLive` flag.
 *     Requires `YOUTUBE_API_KEY`.
 *
 *   - Twitch Helix API (`/search/channels`). Returns matching channels
 *     whether or not they're currently live, with an `is_live` flag
 *     and the live broadcast metadata when applicable. Requires
 *     `TWITCH_CLIENT_ID` + `TWITCH_CLIENT_SECRET` (client_credentials
 *     OAuth flow — the token endpoint runs separately and we cache the
 *     resulting app token at the edge for ~50 days).
 *
 * If either provider is unconfigured the route degrades gracefully —
 * the response includes a `configured` flag the UI uses to show a
 * helpful hint instead of a generic empty state.
 *
 * Results are normalized to a single shape the Streams panel can
 * render directly + drop into its source list without re-parsing.
 */

interface Env {
  YOUTUBE_API_KEY?: string;
  TWITCH_CLIENT_ID?: string;
  TWITCH_CLIENT_SECRET?: string;
}

const REVALIDATE_SECONDS = 60;
/** Twitch app tokens are valid ~60 days. Cache aggressively so we
 *  don't burn a token-exchange round-trip on every search. */
const TWITCH_TOKEN_REVALIDATE = 50 * 24 * 60 * 60;

/* ------------------------------------------------------------------ */
/*  Public result type                                                  */
/* ------------------------------------------------------------------ */

export type MediaSearchResult = {
  /** Stable id within the result set — synthesized from platform +
   *  identifier so React keys stay consistent across requeries. */
  id: string;
  source: "youtube" | "twitch";
  /** The platform value the panel uses when adding the source. */
  platform: "youtube" | "twitch";
  /** Platform-specific identifier (videoId for YT, broadcaster_login
   *  for Twitch). */
  identifier: string;
  /** Display label for the chip after adding. */
  label: string;
  /** Card title — primary line in the search dropdown. */
  title: string;
  /** Card subtitle — channel name for YT, game/category for Twitch. */
  subtitle: string | null;
  /** Original URL — what "Open in new tab" links to. */
  url: string;
  thumbnail: string | null;
  isLive: boolean;
};

export type MediaSearchResponse = {
  results: MediaSearchResult[];
  configured: {
    youtube: boolean;
    twitch: boolean;
  };
};

/* ------------------------------------------------------------------ */
/*  Handler                                                              */
/* ------------------------------------------------------------------ */

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  const configured = {
    youtube: !!env.YOUTUBE_API_KEY,
    twitch: !!(env.TWITCH_CLIENT_ID && env.TWITCH_CLIENT_SECRET),
  };

  if (!q) {
    return Response.json({ results: [], configured });
  }

  // Fan out — partial failures shouldn't tank the whole response.
  const [youtube, twitch] = await Promise.all([
    safeSearch((query) => searchYouTube(query, env), q),
    safeSearch((query) => searchTwitch(query, env), q),
  ]);

  // Interleave: live results first (Twitch live, then YouTube live),
  // then offline channels + regular videos. Within each tier preserve
  // upstream relevance ranking.
  const merged: MediaSearchResult[] = [
    ...twitch.filter((r) => r.isLive),
    ...youtube.filter((r) => r.isLive),
    ...youtube.filter((r) => !r.isLive),
    ...twitch.filter((r) => !r.isLive),
  ];

  return Response.json({
    results: merged,
    configured,
  } satisfies MediaSearchResponse);
};

async function safeSearch(
  fn: (q: string) => Promise<MediaSearchResult[]>,
  q: string,
): Promise<MediaSearchResult[]> {
  try {
    return await fn(q);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  YouTube                                                              */
/* ------------------------------------------------------------------ */

type YTItem = {
  id: { kind: string; videoId?: string };
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    liveBroadcastContent: "live" | "upcoming" | "none";
    thumbnails?: {
      medium?: { url: string };
      default?: { url: string };
    };
  };
};

async function searchYouTube(q: string, env: Env): Promise<MediaSearchResult[]> {
  const key = env.YOUTUBE_API_KEY;
  if (!key) return [];

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", q);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "10");
  url.searchParams.set("safeSearch", "moderate");
  url.searchParams.set("key", key);

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cf: { cacheTtl: REVALIDATE_SECONDS, cacheEverything: true },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: YTItem[] };

  return (data.items ?? [])
    .filter((it): it is YTItem & { id: { videoId: string } } => !!it.id.videoId)
    .map((it) => {
      const videoId = it.id.videoId;
      return {
        id: `youtube:${videoId}`,
        source: "youtube" as const,
        platform: "youtube" as const,
        identifier: videoId,
        label: it.snippet.title,
        title: it.snippet.title,
        subtitle: it.snippet.channelTitle,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail:
          it.snippet.thumbnails?.medium?.url ??
          it.snippet.thumbnails?.default?.url ??
          null,
        isLive: it.snippet.liveBroadcastContent === "live",
      };
    });
}

/* ------------------------------------------------------------------ */
/*  Twitch                                                               */
/* ------------------------------------------------------------------ */

type TwitchChannel = {
  broadcaster_login: string;
  display_name: string;
  title: string;
  thumbnail_url: string;
  is_live: boolean;
  game_name: string;
  started_at: string;
};

async function searchTwitch(q: string, env: Env): Promise<MediaSearchResult[]> {
  const clientId = env.TWITCH_CLIENT_ID;
  const clientSecret = env.TWITCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return [];

  const token = await getTwitchAppToken(clientId, clientSecret);
  if (!token) return [];

  const url = new URL("https://api.twitch.tv/helix/search/channels");
  url.searchParams.set("query", q);
  url.searchParams.set("first", "10");

  const res = await fetch(url.toString(), {
    headers: {
      "Client-Id": clientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cf: { cacheTtl: REVALIDATE_SECONDS, cacheEverything: true },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { data?: TwitchChannel[] };

  return (data.data ?? []).map((c) => ({
    id: `twitch:${c.broadcaster_login}`,
    source: "twitch" as const,
    platform: "twitch" as const,
    identifier: c.broadcaster_login,
    label: c.display_name,
    title: c.display_name,
    subtitle: c.is_live
      ? c.game_name
        ? `Live · ${c.game_name}`
        : "Live"
      : c.game_name || "Offline",
    url: `https://www.twitch.tv/${c.broadcaster_login}`,
    thumbnail: c.thumbnail_url || null,
    isLive: c.is_live,
  }));
}

/** App-token cache via Next's edge fetch cache. The token endpoint
 *  is POST, but `revalidate` is honored — so we re-mint maybe once a
 *  month per edge location instead of on every search. */
async function getTwitchAppToken(
  clientId: string,
  clientSecret: string,
): Promise<string | null> {
  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
    cf: { cacheTtl: TWITCH_TOKEN_REVALIDATE, cacheEverything: true },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}
