"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Loader2, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * GIF picker backed by Giphy's REST API. Portaled to <body> to escape
 * the chat panel's clip + stacking context, anchored off the trigger
 * button.
 *
 *   - On open: fetches Trending.
 *   - On query change (300ms debounce): fetches Search.
 *   - On pick: hands the parent a GifItem with both preview + send
 *     renditions.
 *
 * Requires NEXT_PUBLIC_GIPHY_API_KEY. When absent the picker still
 * mounts but renders a config message instead of network calls.
 */

export type GifItem = {
  id: string;
  /** Preview URL used in the picker tile + the chat message body.
   *  Giphy's `fixed_width` is ~200px wide so it doubles for both. */
  src: string;
  title: string;
  w: number;
  h: number;
};

type GiphyRendition = {
  url: string;
  width: string;
  height: string;
};

type GiphyGif = {
  id: string;
  title: string;
  images: {
    fixed_width: GiphyRendition;
    fixed_width_small?: GiphyRendition;
    original: GiphyRendition;
    downsized?: GiphyRendition;
  };
};

const GIPHY_API_KEY = import.meta.env.VITE_GIPHY_API_KEY;
const GIPHY_LIMIT = 24;

function fromGiphy(g: GiphyGif): GifItem {
  const r = g.images.fixed_width;
  return {
    id: g.id,
    src: r.url,
    title: g.title || "GIF",
    w: parseInt(r.width, 10) || 200,
    h: parseInt(r.height, 10) || 200,
  };
}

async function fetchTrending(signal: AbortSignal): Promise<GifItem[]> {
  if (!GIPHY_API_KEY) return [];
  const res = await fetch(
    `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=${GIPHY_LIMIT}&rating=pg-13`,
    { signal },
  );
  if (!res.ok) throw new Error(`Giphy ${res.status}`);
  const data: { data: GiphyGif[] } = await res.json();
  return data.data.map(fromGiphy);
}

async function fetchSearch(
  q: string,
  signal: AbortSignal,
): Promise<GifItem[]> {
  if (!GIPHY_API_KEY) return [];
  const res = await fetch(
    `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=${GIPHY_LIMIT}&rating=pg-13`,
    { signal },
  );
  if (!res.ok) throw new Error(`Giphy ${res.status}`);
  const data: { data: GiphyGif[] } = await res.json();
  return data.data.map(fromGiphy);
}

type Props = {
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  onSelect: (gif: GifItem) => void;
  onOpenChange: (open: boolean) => void;
};

const PICKER_WIDTH = 360;
const PICKER_HEIGHT = 460;

export function GifPicker({ open, triggerRef, onSelect, onOpenChange }: Props) {
  // Stable close alias so effect deps below stay clean.
  const onClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Position + reset on open.
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const above = rect.top - 8;
    const below = window.innerHeight - rect.bottom - 8;
    const top =
      above >= PICKER_HEIGHT
        ? Math.max(8, rect.top - PICKER_HEIGHT - 8)
        : below >= PICKER_HEIGHT
          ? rect.bottom + 8
          : Math.max(8, window.innerHeight - PICKER_HEIGHT - 8);
    const left = Math.max(
      8,
      Math.min(rect.right - PICKER_WIDTH, window.innerWidth - PICKER_WIDTH - 8),
    );
    setPos({ top, left });
    setQuery("");
  }, [open, triggerRef]);

  // Fetch trending on open and on query (debounced).
  useEffect(() => {
    if (!open) return;
    if (!GIPHY_API_KEY) return;

    const controller = new AbortController();
    const q = query.trim();
    const handle = window.setTimeout(
      async () => {
        setLoading(true);
        setError(null);
        try {
          const items = q
            ? await fetchSearch(q, controller.signal)
            : await fetchTrending(controller.signal);
          setGifs(items);
        } catch (err) {
          if ((err as DOMException)?.name === "AbortError") return;
          setError("Couldn't load GIFs. Try again.");
          setGifs([]);
        } finally {
          setLoading(false);
        }
      },
      q ? 300 : 0,
    );
    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [open, query]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !pos) return null;

  return createPortal(
    <>
      <div onClick={onClose} aria-hidden className="fixed inset-0 z-[var(--z-cursor-overlay)]" />
      <div
        role="dialog"
        aria-label="GIF picker"
        onClick={(e) => e.stopPropagation()}
        className="fixed z-[201] flex flex-col overflow-hidden rounded-lg bg-card backdrop-blur-md ring-1 ring-inset ring-white/[0.06] shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        style={{
          top: pos.top,
          left: pos.left,
          width: PICKER_WIDTH,
          height: PICKER_HEIGHT,
        }}
      >
        <div className="shrink-0 border-b border-white/[0.05] px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-micro uppercase tracking-[0.18em] text-muted-foreground">
              {query.trim() ? "Search" : "Trending"}
            </span>
            <span className="text-micro text-muted-foreground/70">
              Powered by Giphy
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-md bg-surface-1 px-2.5 py-1.5">
            <Search
              strokeWidth={1.75}
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Giphy"
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2">
          {!GIPHY_API_KEY ? (
            <ConfigState />
          ) : error ? (
            <ErrorState message={error} />
          ) : loading && gifs.length === 0 ? (
            <LoadingState />
          ) : gifs.length === 0 ? (
            <EmptyState query={query} />
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {gifs.map((gif) => (
                <GifTile key={gif.id} gif={gif} onSelect={onSelect} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}

function GifTile({
  gif,
  onSelect,
}: {
  gif: GifItem;
  onSelect: (gif: GifItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(gif)}
      title={gif.title}
      aria-label={`Send GIF: ${gif.title}`}
      className={cn(
        "group/tile relative overflow-hidden rounded-md bg-surface-1 ring-1 ring-inset ring-white/[0.06] transition-[scale,box-shadow] duration-150 ease-out hover:ring-white/[0.10] active:scale-[0.96]",
      )}
      style={{ aspectRatio: `${gif.w} / ${gif.h}` }}
    >
      <img
        src={gif.src}
        alt={gif.title}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {gif.title && (
        <span className="absolute inset-x-1 bottom-1 truncate rounded-sm bg-black/70 px-1.5 py-0.5 text-micro font-medium text-white opacity-0 transition-opacity duration-150 ease-out group-hover/tile:opacity-100">
          {gif.title}
        </span>
      )}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
      <Loader2 strokeWidth={1.75} className="size-5 animate-spin" aria-hidden />
      <p className="text-caption">Loading GIFs…</p>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  const q = query.trim();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 px-6 text-center text-muted-foreground">
      <Sparkles strokeWidth={1.5} className="size-5" aria-hidden />
      <p className="text-body text-foreground">
        {q ? "No matches" : "Nothing trending"}
      </p>
      <p className="text-caption text-muted-foreground">
        {q ? "Try a different keyword." : "Search above to find a GIF."}
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 px-6 text-center text-muted-foreground">
      <p className="text-body text-tone-down">{message}</p>
    </div>
  );
}

function ConfigState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-muted-foreground">
      <Sparkles strokeWidth={1.5} className="size-5" aria-hidden />
      <p className="text-body text-foreground">Giphy not configured</p>
      <p className="text-caption leading-relaxed text-muted-foreground">
        Add{" "}
        <code className="rounded-sm bg-surface-2 px-1 py-0.5 text-micro tabular-nums text-foreground">
          NEXT_PUBLIC_GIPHY_API_KEY
        </code>{" "}
        to <code className="rounded-sm bg-surface-2 px-1 py-0.5 text-micro tabular-nums text-foreground">.env.local</code> and restart the dev server. Get a key at developers.giphy.com.
      </p>
    </div>
  );
}
