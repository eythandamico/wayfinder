"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Plus,
  Search,
  Tv,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaSearchResponse, MediaSearchResult } from "@/api/media/search";

/**
 * Streams panel — a bring-your-own-source video deck.
 *
 * Paste a URL from YouTube (videos / live / shorts), Twitch (channels +
 * VODs), Kick (channels), or Vimeo, and the panel detects the platform,
 * builds the embed URL, and adds it to a saved list. The chip strip
 * across the top switches between added sources; the player below
 * fills the panel.
 *
 * No server-side auth required — every supported platform exposes a
 * keyless embed URL. We do hit our own `/api/media/oembed` server route
 * to resolve YouTube video titles into nicer chip labels.
 *
 * The list is persisted to localStorage per shell version so traders
 * keep their CNBC feed / favorite streamer pinned across sessions.
 */

/* ------------------------------------------------------------------ */
/*  Types + storage                                                      */
/* ------------------------------------------------------------------ */

type Platform = "youtube" | "twitch" | "twitch-vod" | "kick" | "vimeo";

type MediaSource = {
  /** Stable per-source id; not the platform identifier. */
  id: string;
  platform: Platform;
  /** Platform-specific identifier — videoId for YouTube, channel name
   *  for Twitch/Kick, video numeric id for Vimeo. */
  identifier: string;
  /** Display label shown in the chip. Populated from the URL initially,
   *  upgraded via oEmbed for YouTube. */
  label: string;
  /** Original URL the user pasted, for the "open in new tab" escape. */
  url: string;
};

const STORAGE_KEY = "wf-shells-v3-streams-v1";
const ACTIVE_KEY = "wf-shells-v3-streams-active-v1";

/* ------------------------------------------------------------------ */
/*  URL parsing                                                          */
/* ------------------------------------------------------------------ */

function parseStreamUrl(input: string): Omit<MediaSource, "id"> | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Accept bare channel handles like "@coinbureau" → assume YouTube.
  if (/^@[\w.-]+$/.test(trimmed)) {
    return {
      platform: "youtube",
      identifier: trimmed.slice(1),
      label: trimmed,
      url: `https://www.youtube.com/${trimmed}`,
    };
  }

  // Tolerate missing scheme — "twitch.tv/coindesk" should work too.
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  let u: URL;
  try {
    u = new URL(candidate);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, "").replace(/^m\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  // ─── YouTube ────────────────────────────────────────────────────
  if (
    host === "youtube.com" ||
    host === "youtu.be" ||
    host === "youtube-nocookie.com"
  ) {
    let videoId: string | null = null;
    if (host === "youtu.be") {
      videoId = parts[0] ?? null;
    } else if (parts[0] === "watch") {
      videoId = u.searchParams.get("v");
    } else if (parts[0] === "embed" || parts[0] === "live" || parts[0] === "shorts") {
      videoId = parts[1] ?? null;
    }
    if (videoId) {
      return {
        platform: "youtube",
        identifier: videoId,
        label: "YouTube",
        url: candidate,
      };
    }
  }

  // ─── Twitch ─────────────────────────────────────────────────────
  if (host === "twitch.tv") {
    if (parts[0] === "videos" && parts[1]) {
      return {
        platform: "twitch-vod",
        identifier: parts[1],
        label: `Twitch VOD ${parts[1].slice(0, 6)}`,
        url: candidate,
      };
    }
    if (parts[0]) {
      return {
        platform: "twitch",
        identifier: parts[0],
        label: parts[0],
        url: candidate,
      };
    }
  }

  // ─── Kick ───────────────────────────────────────────────────────
  if (host === "kick.com") {
    if (parts[0]) {
      return {
        platform: "kick",
        identifier: parts[0],
        label: parts[0],
        url: candidate,
      };
    }
  }

  // ─── Vimeo ──────────────────────────────────────────────────────
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = parts.pop();
    if (id && /^\d+$/.test(id)) {
      return {
        platform: "vimeo",
        identifier: id,
        label: "Vimeo",
        url: candidate,
      };
    }
  }

  return null;
}

function buildEmbedUrl(source: MediaSource, parentHost: string): string {
  switch (source.platform) {
    case "youtube":
      // youtube-nocookie reduces tracking and behaves identically.
      // autoplay + mute is required for autoplay to engage on most
      // browsers — user can unmute via the player controls.
      return `https://www.youtube-nocookie.com/embed/${source.identifier}?autoplay=1&mute=1&rel=0&modestbranding=1`;
    case "twitch":
      return `https://player.twitch.tv/?channel=${encodeURIComponent(source.identifier)}&parent=${encodeURIComponent(parentHost)}&muted=true&autoplay=true`;
    case "twitch-vod":
      return `https://player.twitch.tv/?video=v${encodeURIComponent(source.identifier)}&parent=${encodeURIComponent(parentHost)}&muted=true&autoplay=true`;
    case "kick":
      return `https://player.kick.com/${encodeURIComponent(source.identifier)}?autoplay=true&muted=true`;
    case "vimeo":
      return `https://player.vimeo.com/video/${encodeURIComponent(source.identifier)}?autoplay=1&muted=1`;
  }
}

const PLATFORM_BADGE: Record<Platform, { label: string; tone: string }> = {
  youtube: { label: "YT", tone: "bg-[#FF0000]/15 text-[#FF6B6B]" },
  twitch: { label: "Twitch", tone: "bg-[#9146FF]/20 text-[#B388FF]" },
  "twitch-vod": { label: "Twitch", tone: "bg-[#9146FF]/20 text-[#B388FF]" },
  kick: { label: "Kick", tone: "bg-[#53FC18]/15 text-[#79F562]" },
  vimeo: { label: "Vimeo", tone: "bg-[#1ab7ea]/15 text-[#5bd0ff]" },
};

/* ------------------------------------------------------------------ */
/*  Component                                                            */
/* ------------------------------------------------------------------ */

export function VideoSearchPanel() {
  const [sources, setSources] = useState<MediaSource[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount. SSR-safe.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MediaSource[];
        if (Array.isArray(parsed)) {
          setSources(parsed);
          const savedActive = window.localStorage.getItem(ACTIVE_KEY);
          if (savedActive && parsed.some((s) => s.id === savedActive)) {
            setActiveId(savedActive);
          } else if (parsed[0]) {
            setActiveId(parsed[0].id);
          }
        }
      }
    } catch {
      /* storage unavailable — start empty */
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist whenever sources change (after hydration).
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sources));
    } catch {
      /* ignore */
    }
  }, [sources, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (activeId) {
        window.localStorage.setItem(ACTIVE_KEY, activeId);
      } else {
        window.localStorage.removeItem(ACTIVE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [activeId, hydrated]);

  const active = sources.find((s) => s.id === activeId) ?? null;

  /** Lower-level add path — every entry point ends up here. Skips
   *  URL parsing because search results already carry the parsed
   *  shape. Pass `tryOembed: true` to async-upgrade the label via
   *  YouTube oEmbed. */
  const pickSource = useCallback(
    (parsed: Omit<MediaSource, "id">, opts: { tryOembed?: boolean } = {}) => {
      const id = `${parsed.platform}-${parsed.identifier}-${Date.now().toString(36)}`;
      const newSource: MediaSource = { ...parsed, id };
      setSources((prev) => [...prev, newSource]);
      setActiveId(id);
      if (opts.tryOembed && parsed.platform === "youtube") {
        void fetchYouTubeTitle(parsed.url).then((title) => {
          if (!title) return;
          setSources((prev) =>
            prev.map((s) => (s.id === id ? { ...s, label: title } : s)),
          );
        });
      }
    },
    [],
  );

  /** URL-paste entry point — used by both inputs when the value is
   *  a recognizable URL. Returns an error to display when parsing
   *  fails (likely a search query rather than a URL). */
  const addSource = useCallback(
    (raw: string): { ok: boolean; error?: string } => {
      const parsed = parseStreamUrl(raw);
      if (!parsed) {
        return {
          ok: false,
          error:
            "Couldn't recognize that URL. Try YouTube, Twitch, Kick, or Vimeo.",
        };
      }
      pickSource(parsed, { tryOembed: true });
      return { ok: true };
    },
    [pickSource],
  );

  const removeSource = useCallback((id: string) => {
    setSources((prev) => {
      const next = prev.filter((s) => s.id !== id);
      // If we removed the active one, jump to a neighbor.
      setActiveId((cur) => {
        if (cur !== id) return cur;
        if (next.length === 0) return null;
        const idx = prev.findIndex((s) => s.id === id);
        return next[Math.min(idx, next.length - 1)]?.id ?? null;
      });
      return next;
    });
  }, []);

  if (sources.length === 0) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <EmptyState
          onAdd={addSource}
          onPick={(r) => pickSource(searchResultToSource(r))}
          disabled={!hydrated}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <SourceStrip
        sources={sources}
        activeId={activeId}
        onSelect={setActiveId}
        onAdd={addSource}
        onPick={(r) => pickSource(searchResultToSource(r))}
        onRemove={removeSource}
      />
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-black">
        {active ? <Player source={active} /> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Search hook + helpers                                                */
/* ------------------------------------------------------------------ */

type SearchState = {
  query: string;
  loading: boolean;
  results: MediaSearchResult[];
  configured: { youtube: boolean; twitch: boolean };
  error: string | null;
};

/** Debounced YouTube + Twitch search. Skips firing when the input is
 *  empty or already a recognizable URL — the panel's URL paste path
 *  handles those without round-tripping to the search route. */
function useMediaSearch(rawQuery: string): SearchState {
  const [state, setState] = useState<SearchState>({
    query: "",
    loading: false,
    results: [],
    configured: { youtube: false, twitch: false },
    error: null,
  });

  useEffect(() => {
    const q = rawQuery.trim();
    if (!q || parseStreamUrl(q)) {
      setState((s) => ({ ...s, query: q, loading: false, results: [] }));
      return;
    }
    setState((s) => ({ ...s, query: q, loading: true, error: null }));
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/media/search?q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as MediaSearchResponse;
        setState({
          query: q,
          loading: false,
          results: data.results ?? [],
          configured: data.configured ?? { youtube: false, twitch: false },
          error: null,
        });
      } catch (err) {
        if (controller.signal.aborted) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof Error ? err.message : "Search failed",
        }));
      }
    }, 320);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [rawQuery]);

  return state;
}

/** Convert a search-route result back into the shape pickSource wants.
 *  The result already carries platform + identifier + url + label so
 *  there's no re-parsing — we just hand it over. */
function searchResultToSource(r: MediaSearchResult): Omit<MediaSource, "id"> {
  return {
    platform: r.platform,
    identifier: r.identifier,
    label: r.label,
    url: r.url,
  };
}

/* ------------------------------------------------------------------ */
/*  Search results dropdown                                              */
/* ------------------------------------------------------------------ */

function SearchResults({
  state,
  onPick,
  variant,
}: {
  state: SearchState;
  onPick: (r: MediaSearchResult) => void;
  /** "overlay" = floats over the player; "inline" = sits in normal flow */
  variant: "overlay" | "inline";
}) {
  const { query, loading, results, configured, error } = state;
  if (!query) return null;

  const shell =
    variant === "overlay"
      ? "absolute left-2 right-2 top-full z-20 mt-1.5 max-h-[60vh] overflow-y-auto rounded-lg bg-background shadow-[0_12px_48px_-8px_rgba(0,0,0,0.6)] ring-1 ring-white/[0.06]"
      : "mt-3 max-h-[280px] w-full max-w-md overflow-y-auto rounded-lg bg-white/[0.02] ring-1 ring-inset ring-white/[0.06]";

  const showProviderHint =
    !loading &&
    results.length === 0 &&
    (!configured.youtube || !configured.twitch);

  return (
    <div className={shell} role="listbox" aria-label="Search results">
      {loading && (
        <div className="flex items-center justify-center gap-2 px-3 py-6 text-body text-muted-foreground">
          <Loader2 className="size-4 animate-spin" strokeWidth={2} aria-hidden />
          Searching…
        </div>
      )}
      {!loading && results.length > 0 && (
        <ul className="divide-y divide-white/[0.04]">
          {results.map((r) => (
            <li key={r.id}>
              <SearchResultRow result={r} onPick={() => onPick(r)} />
            </li>
          ))}
        </ul>
      )}
      {!loading && results.length === 0 && (
        <div className="flex flex-col gap-1 px-3 py-4 text-center text-caption">
          {error ? (
            <span className="text-tone-down">{error}</span>
          ) : (
            <span className="text-muted-foreground">No results.</span>
          )}
          {showProviderHint && (
            <span className="text-muted-foreground">
              {[
                !configured.youtube && "YouTube",
                !configured.twitch && "Twitch",
              ]
                .filter(Boolean)
                .join(" + ")}{" "}
              search is unconfigured. Pasting a URL still works.
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function SearchResultRow({
  result,
  onPick,
}: {
  result: MediaSearchResult;
  onPick: () => void;
}) {
  const badge = PLATFORM_BADGE[result.platform];
  return (
    <button
      type="button"
      role="option"
      aria-selected={false}
      onClick={onPick}
      className="group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/60"
    >
      <SearchThumbnail result={result} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-1 text-body font-medium text-foreground">
          {result.title}
        </span>
        <div className="flex min-w-0 items-center gap-1.5 text-caption text-muted-foreground">
          <span
            aria-hidden
            className={cn(
              "inline-flex h-4 shrink-0 items-center rounded-sm px-1 text-micro font-semibold uppercase tracking-wide",
              badge.tone,
            )}
          >
            {badge.label}
          </span>
          {result.isLive && (
            <span className="inline-flex shrink-0 items-center gap-1 text-tone-down">
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-tone-down animate-pulse"
              />
              LIVE
            </span>
          )}
          {result.subtitle && (
            <span className="truncate">{result.subtitle}</span>
          )}
        </div>
      </div>
      <Plus
        className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
        strokeWidth={2}
        aria-hidden
      />
    </button>
  );
}

function SearchThumbnail({ result }: { result: MediaSearchResult }) {
  const [errored, setErrored] = useState(false);
  if (!result.thumbnail || errored) {
    return (
      <span
        aria-hidden
        className="grid size-11 shrink-0 place-items-center rounded-md bg-surface-2 text-muted-foreground"
      >
        <Tv className="size-4" strokeWidth={1.75} />
      </span>
    );
  }
  return (
    <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-surface-1 ring-1 ring-inset ring-white/[0.06]">
      <img
        src={result.thumbnail}
        alt=""
        className="absolute inset-0 size-full object-cover"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Source strip — chip switcher + add affordance                        */
/* ------------------------------------------------------------------ */

function SourceStrip({
  sources,
  activeId,
  onSelect,
  onAdd,
  onPick,
  onRemove,
}: {
  sources: MediaSource[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: (url: string) => { ok: boolean; error?: string };
  onPick: (r: MediaSearchResult) => void;
  onRemove: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="relative flex shrink-0 items-center gap-1 border-b border-white/[0.05] px-2 py-1.5">
      {adding ? (
        <AddSourceInput
          onSubmit={(v) => {
            const res = onAdd(v);
            if (res.ok) setAdding(false);
            return res;
          }}
          onPick={(r) => {
            onPick(r);
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Stream sources"
            className="scroll-none flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
          >
            {sources.map((s) => (
              <SourceChip
                key={s.id}
                source={s}
                active={s.id === activeId}
                onSelect={() => onSelect(s.id)}
                onRemove={() => onRemove(s.id)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAdding(true)}
            aria-label="Add stream source"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-2 hover:text-foreground active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <Plus className="size-4" strokeWidth={2} aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}

function SourceChip({
  source,
  active,
  onSelect,
  onRemove,
}: {
  source: MediaSource;
  active: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const badge = PLATFORM_BADGE[source.platform];
  return (
    <div
      className={cn(
        "group inline-flex h-9 shrink-0 items-center rounded-full pl-1 pr-1 transition-colors",
        active ? "bg-surface-4" : "hover:bg-surface-1",
      )}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={onSelect}
        className="inline-flex h-7 max-w-[180px] items-center gap-1.5 rounded-full px-2 text-body font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <span
          aria-hidden
          className={cn(
            "inline-flex h-5 shrink-0 items-center rounded-sm px-1 text-micro font-semibold tracking-wide uppercase",
            badge.tone,
          )}
        >
          {badge.label}
        </span>
        <span
          className={cn(
            "truncate",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {source.label}
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${source.label}`}
        className="ml-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-[opacity,background-color,color] duration-150 ease-out group-hover:opacity-100 focus-visible:opacity-100 hover:bg-surface-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <X className="size-3" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}

function AddSourceInput({
  onSubmit,
  onPick,
  onCancel,
}: {
  onSubmit: (url: string) => { ok: boolean; error?: string };
  onPick: (r: MediaSearchResult) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const search = useMediaSearch(value);
  const looksLikeUrl = !!parseStreamUrl(value);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const submit = () => {
    if (!value.trim()) {
      onCancel();
      return;
    }
    if (!looksLikeUrl && search.results.length > 0) {
      // Pressing Enter on a search query picks the top result —
      // a slight power-user shortcut.
      onPick(search.results[0]);
      return;
    }
    const res = onSubmit(value);
    if (!res.ok) {
      setError(res.error ?? "Couldn't add that source.");
    }
  };

  return (
    <div className="flex w-full min-w-0 items-center gap-1.5">
      <div className="relative inline-flex h-9 min-w-0 flex-1 items-center rounded-full bg-surface-1 pl-3 transition-[background-color,box-shadow] duration-150 ease-out focus-within:bg-surface-3 focus-within:ring-2 focus-within:ring-primary/60">
        <Search
          className="size-3.5 shrink-0 text-muted-foreground"
          strokeWidth={2}
          aria-hidden
        />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              onCancel();
            }
          }}
          placeholder="Search or paste URL — YouTube, Twitch, Kick"
          aria-label="Search streams or paste URL"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="size-full min-w-0 flex-1 bg-transparent px-2 text-body text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      <button
        type="button"
        onClick={submit}
        className="inline-flex h-9 shrink-0 items-center rounded-full bg-primary px-3.5 text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        Add
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel"
        className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <X className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
      {error && (
        <span
          id={errorId}
          role="alert"
          className="absolute left-3 top-full mt-1 text-caption text-tone-down"
        >
          {error}
        </span>
      )}
      <SearchResults state={search} onPick={onPick} variant="overlay" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Player — iframe + overlay controls                                   */
/* ------------------------------------------------------------------ */

function Player({ source }: { source: MediaSource }) {
  // Twitch requires `parent` to match the page hostname. Compute it
  // client-side after mount so the iframe gets the right value in dev
  // (localhost) AND prod (deployment domain) without env config.
  const [parentHost, setParentHost] = useState<string | null>(null);
  useEffect(() => {
    setParentHost(window.location.hostname);
  }, []);

  const embedSrc = useMemo(() => {
    if (!parentHost) return null;
    return buildEmbedUrl(source, parentHost);
  }, [source, parentHost]);

  return (
    <>
      {embedSrc ? (
        <iframe
          key={source.id}
          src={embedSrc}
          title={source.label}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="size-full border-0"
        />
      ) : null}
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open in new tab"
        className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-md bg-black/40 text-white/80 backdrop-blur-sm transition-[background-color,color,scale] duration-150 ease-out hover:bg-black/60 hover:text-white active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <ExternalLink className="size-3.5" strokeWidth={2} aria-hidden />
      </a>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                          */
/* ------------------------------------------------------------------ */

function EmptyState({
  onAdd,
  onPick,
  disabled,
}: {
  onAdd: (url: string) => { ok: boolean; error?: string };
  onPick: (r: MediaSearchResult) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();
  const search = useMediaSearch(value);
  const looksLikeUrl = !!parseStreamUrl(value);

  const submit = () => {
    if (!value.trim()) return;
    if (!looksLikeUrl && search.results.length > 0) {
      onPick(search.results[0]);
      setValue("");
      return;
    }
    const res = onAdd(value);
    if (!res.ok) {
      setError(res.error ?? "Couldn't add that source.");
    } else {
      setValue("");
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-6 py-8 text-center">
      <span
        aria-hidden
        className="grid size-12 place-items-center rounded-full bg-surface-1 text-muted-foreground ring-1 ring-inset ring-white/[0.06]"
      >
        <Tv className="size-5" strokeWidth={1.75} />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-body font-semibold text-foreground text-balance">
          Pull in any video stream
        </p>
        <p className="max-w-[320px] text-body text-muted-foreground text-pretty">
          Search YouTube and Twitch, or paste a link from YouTube, Twitch,
          Kick, or Vimeo.
        </p>
      </div>
      <div className="flex w-full max-w-md flex-col items-stretch gap-2">
        <div className="flex items-center gap-1.5">
          <label htmlFor={inputId} className="sr-only">
            Search streams or paste URL
          </label>
          <div className="relative inline-flex h-11 min-w-0 flex-1 items-center rounded-lg bg-surface-1 pl-3.5 transition-[background-color,box-shadow] duration-150 ease-out focus-within:bg-surface-3 focus-within:ring-2 focus-within:ring-primary/60">
            <Search
              className="size-4 shrink-0 text-muted-foreground"
              strokeWidth={2}
              aria-hidden
            />
            <input
              id={inputId}
              type="text"
              value={value}
              disabled={disabled}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Search 'bloomberg', or paste a URL"
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              className="size-full min-w-0 flex-1 bg-transparent px-2.5 text-body text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={disabled || !value.trim()}
            className="inline-flex h-11 shrink-0 items-center rounded-lg bg-primary px-4 text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {error && (
          <p
            id={errorId}
            role="alert"
            className="inline-flex items-center justify-center gap-1.5 text-caption text-tone-down"
          >
            <AlertCircle className="size-3.5" strokeWidth={2} aria-hidden />
            {error}
          </p>
        )}
        <SearchResults state={search} onPick={onPick} variant="inline" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  YouTube oEmbed helper                                                */
/* ------------------------------------------------------------------ */

async function fetchYouTubeTitle(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/media/oembed?url=${encodeURIComponent(url)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      title?: string | null;
      author?: string | null;
    };
    return data.title ?? data.author ?? null;
  } catch {
    return null;
  }
}
