"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SAMPLE_TRADING_CARDS, type TradingCard } from "../_data/trading-cards";

export type SignalSource = "me" | "friend" | "group" | "agent" | "system";

export type SignalEvent = {
  /** Stable id derived from card + at; used as the React key for toasts. */
  id: string;
  card: TradingCard;
  source: SignalSource;
  at: number;
};

type Listener = (e: SignalEvent) => void;

/** A recorded pile-in. The cumulative R across today's records is
 *  what gates new fills against the daily cap. */
export type PileInRecord = {
  cardId: string;
  ticker: string;
  sizeR: number;
  at: number;
};

/** Numeric form of `PILE_IN_SIZE_R` (the string "0.5R" on cards). One
 *  pile-in always costs this many R units. */
export const PILE_IN_R = 0.5;
/** Default daily R cap. The live value is held in SignalsProvider
 *  state so the fresh-wallet interview can adjust it from the user's
 *  answer; consumers should read `dailyRCap` from the context, not
 *  this constant. */
export const DEFAULT_DAILY_R_CAP = 5;
/** Module-level alias for the daily R cap so non-hook contexts
 *  (button-state helpers in TradingCard, exposure math in AuthorSheet)
 *  can reference the same constant the provider uses. */
export const DAILY_R_CAP = DEFAULT_DAILY_R_CAP;

type SignalsContextValue = {
  /** Newest first. Drives the Activity feed (via `fromSignals` in
   *  activity-context) + dot/badge counters on the Activity bell. */
  events: SignalEvent[];
  /** Add a signal. Pass notify: true to fire the cascade
   *  (sound + aurora flash + toast). Defaults false so the user's
   *  OWN posts don't notify themselves. */
  publishSignal: (
    card: TradingCard,
    opts?: { source?: SignalSource; notify?: boolean },
  ) => void;
  /** Subscribe to notify-flagged events. Returns unsubscribe. */
  subscribe: (listener: Listener) => () => void;

  /** ============ Follow & author profile state ============== */
  /** Set of author ids the current user follows. Their signals
   *  populate the Personal feed (along with seed group/friend
   *  cards and your own posts) and tier up the cascade. */
  followedAuthorIds: ReadonlySet<string>;
  toggleFollow: (authorId: string) => void;
  isFollowing: (authorId: string) => boolean;
  /** Author currently shown in the AuthorSheet, or null when
   *  closed. */
  openAuthorId: string | null;
  openAuthor: (authorId: string) => void;
  closeAuthor: () => void;

  /** ============ Auto-mirror + risk-cap state ============== */
  /** Authors whose signals auto-pile-in for you. Strict subset of
   *  followedAuthorIds (UX-wise you have to follow before mirror). */
  autoMirrorAuthorIds: ReadonlySet<string>;
  toggleAutoMirror: (authorId: string) => void;
  isAutoMirroring: (authorId: string) => boolean;
  /** All pile-ins recorded today (resets at local midnight). */
  pileInsToday: readonly PileInRecord[];
  /** Quick membership lookup so cards can tell "have I already piled
   *  into this one?" without scanning the list. */
  pileInCardIds: ReadonlySet<string>;
  /** Cumulative R consumed today. Used by the per-card pile-in
   *  button to decide whether the next fill would breach the cap. */
  todaysExposureR: number;
  /** Live daily R cap — defaults to DEFAULT_DAILY_R_CAP, settable
   *  via setDailyRCap (e.g. from the fresh-wallet interview). */
  dailyRCap: number;
  setDailyRCap: (n: number) => void;
  /** Record a pile-in (manual click OR auto-mirror). No-ops if
   *  already piled into this card today, or if the fill would exceed
   *  the daily cap. */
  recordPileIn: (rec: Omit<PileInRecord, "at">) => void;
};

const SignalsContext = createContext<SignalsContextValue | null>(null);

/**
 * Auto-fire cadence for demo ideas (incoming "friend" posts). Tuned so
 * the cascade plays often enough to feel alive but not so often the
 * sound becomes noise. First fire happens INITIAL_DELAY_MS after mount
 * so the boot screen finishes first.
 */
const INITIAL_DELAY_MS = 8000;
const AUTOFIRE_INTERVAL_MS = 55000;

const FOLLOW_STORAGE_KEY = "wf-followed-authors-v1";
const AUTO_MIRROR_STORAGE_KEY = "wf-auto-mirror-authors-v1";
const PILE_INS_STORAGE_KEY = "wf-pile-ins-v1";

/** True if `at` (ms epoch) falls on the local current day. Used to
 *  drop pile-in records older than today when hydrating from
 *  localStorage. */
function isToday(at: number): boolean {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return at >= start.getTime();
}
/** Default follow set — the seed-card authors. Gives the Personal
 *  feed content out of the box, before the user manually follows
 *  anyone via the AuthorSheet. */
const DEFAULT_FOLLOWS: readonly string[] = [
  "kalos",
  "bounty",
  "deuce",
  "ryzla",
  "jcrew",
];

export function SignalsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<SignalEvent[]>([]);
  const listenersRef = useRef<Set<Listener>>(new Set());

  // Follow state — Set so membership checks are O(1). Hydrated from
  // localStorage after mount so SSR matches initial render. The
  // hydration itself happens in the consolidated effect below.
  const [followedAuthorIds, setFollowedAuthorIds] = useState<Set<string>>(
    () => new Set(DEFAULT_FOLLOWS),
  );

  const toggleFollow = useCallback((authorId: string) => {
    setFollowedAuthorIds((prev) => {
      const next = new Set(prev);
      if (next.has(authorId)) next.delete(authorId);
      else next.add(authorId);
      try {
        window.localStorage.setItem(
          FOLLOW_STORAGE_KEY,
          JSON.stringify([...next]),
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const isFollowing = useCallback(
    (authorId: string) => followedAuthorIds.has(authorId),
    [followedAuthorIds],
  );

  // Author sheet open/close — page-root AuthorSheet reads this and
  // renders the modal anchored to the open id.
  const [openAuthorId, setOpenAuthorId] = useState<string | null>(null);
  const openAuthor = useCallback((id: string) => setOpenAuthorId(id), []);
  const closeAuthor = useCallback(() => setOpenAuthorId(null), []);

  // Auto-mirror authors — Set, persisted. Hydrated in the consolidated
  // effect below.
  const [autoMirrorAuthorIds, setAutoMirrorAuthorIds] = useState<Set<string>>(
    () => new Set(),
  );
  const toggleAutoMirror = useCallback((id: string) => {
    setAutoMirrorAuthorIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(
          AUTO_MIRROR_STORAGE_KEY,
          JSON.stringify([...next]),
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  const isAutoMirroring = useCallback(
    (id: string) => autoMirrorAuthorIds.has(id),
    [autoMirrorAuthorIds],
  );

  // Today's pile-in ledger. Hydrated from localStorage on mount,
  // filtered to today's records only (records from yesterday or
  // earlier drop on the floor — daily reset).
  const [pileInsToday, setPileInsToday] = useState<PileInRecord[]>([]);

  // Consolidated localStorage hydration. Reads all three persisted
  // sets/lists in a single effect so they share one tick + one
  // cancelled-guard, rather than spreading three identical patterns
  // across the component. Each parse is wrapped in its own try/catch
  // so a corrupted value in one key doesn't blow up the others.
  useEffect(() => {
    let cancelled = false;

    const tryRead = (key: string): unknown => {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    const followsRaw = tryRead(FOLLOW_STORAGE_KEY);
    const autoMirrorRaw = tryRead(AUTO_MIRROR_STORAGE_KEY);
    const pileInsRaw = tryRead(PILE_INS_STORAGE_KEY);

    if (cancelled) return;

    if (Array.isArray(followsRaw)) {
      setFollowedAuthorIds(
        new Set(followsRaw.filter((x) => typeof x === "string")),
      );
    }
    if (Array.isArray(autoMirrorRaw)) {
       
      setAutoMirrorAuthorIds(
        new Set(autoMirrorRaw.filter((x) => typeof x === "string")),
      );
    }
    if (Array.isArray(pileInsRaw)) {
      const records: PileInRecord[] = pileInsRaw
        .filter(
          (r): r is PileInRecord =>
            typeof r === "object" &&
            r !== null &&
            typeof (r as PileInRecord).cardId === "string" &&
            typeof (r as PileInRecord).ticker === "string" &&
            typeof (r as PileInRecord).sizeR === "number" &&
            typeof (r as PileInRecord).at === "number",
        )
        .filter((r) => isToday(r.at));
       
      setPileInsToday(records);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // Derived from pileInsToday — re-computed cheaply via useMemo so
  // consumers don't all re-derive independently.
  const pileInCardIds = useMemo(
    () => new Set(pileInsToday.map((r) => r.cardId)),
    [pileInsToday],
  );
  const todaysExposureR = useMemo(
    () => pileInsToday.reduce((acc, r) => acc + r.sizeR, 0),
    [pileInsToday],
  );

  // Live daily R cap. Stored in state for UI subscribers; mirrored
  // into a ref so the stable recordPileIn closure reads the current
  // value without re-deriving on every change.
  const [dailyRCap, setDailyRCapState] = useState(DEFAULT_DAILY_R_CAP);
  const dailyRCapRef = useRef(dailyRCap);
  const setDailyRCap = useCallback((n: number) => {
    dailyRCapRef.current = n;
    setDailyRCapState(n);
  }, []);

  // Refs so the recordPileIn / auto-mirror closures don't have to
  // include exposure / membership in their deps (which would churn
  // every pile-in and re-create publishSignal).
  const pileInCardIdsRef = useRef(pileInCardIds);
  const exposureRef = useRef(todaysExposureR);
  useEffect(() => {
    pileInCardIdsRef.current = pileInCardIds;
    exposureRef.current = todaysExposureR;
  }, [pileInCardIds, todaysExposureR]);

  const recordPileIn = useCallback(
    (rec: Omit<PileInRecord, "at">) => {
      // No-op if we've already filled this card today.
      if (pileInCardIdsRef.current.has(rec.cardId)) return;
      // No-op if the next fill would breach the daily R cap.
      if (exposureRef.current + rec.sizeR > dailyRCapRef.current) return;
      setPileInsToday((prev) => {
        const next = [...prev, { ...rec, at: Date.now() }];
        try {
          window.localStorage.setItem(
            PILE_INS_STORAGE_KEY,
            JSON.stringify(next),
          );
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  // Auto-mirror is enforced inside publishSignal below — every
  // incoming signal from a mirrored author triggers a recordPileIn.
  // Hold the mirror set in a ref so publishSignal stays stable.
  const autoMirrorRef = useRef(autoMirrorAuthorIds);
  useEffect(() => {
    autoMirrorRef.current = autoMirrorAuthorIds;
  }, [autoMirrorAuthorIds]);

  const publishSignal = useCallback(
    (
      card: TradingCard,
      opts: { source?: SignalSource; notify?: boolean } = {},
    ) => {
      const event: SignalEvent = {
        id: `${card.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        card,
        source: opts.source ?? "me",
        at: Date.now(),
      };
      setEvents((prev) => [event, ...prev]);
      // Auto-mirror: incoming signals from authors you've opted into
      // mirroring auto-record a pile-in. Skipped for your own posts.
      // recordPileIn enforces the daily R cap so a mirrored author
      // can't drag you past the limit.
      if (
        (opts.source ?? "me") !== "me" &&
        autoMirrorRef.current.has(card.author.id)
      ) {
        recordPileIn({
          cardId: card.id,
          ticker: card.ticker,
          sizeR: PILE_IN_R,
        });
      }
      if (opts.notify) {
        listenersRef.current.forEach((l) => l(event));
      }
    },
    [recordPileIn],
  );

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  // Demo auto-fire — picks a random sample card and publishes it with
  // notify on. The whole cascade fires (sound + shader flash + toast
  // + Activity feed entry via fromSignals). ~30% of fires get a news
  // source so the Personal / Public split downstream has something to
  // show on both sides. Replace with real websocket events when
  // messaging lands.
  useEffect(() => {
    let stopped = false;
    const NEWS_OUTLETS = ["Bloomberg", "Reuters", "CoinDesk", "WSJ"];
    const fireOne = () => {
      if (stopped) return;
      const pool = SAMPLE_TRADING_CARDS;
      if (pool.length === 0) return;
      const base = pool[Math.floor(Math.random() * pool.length)];
      const isNews = Math.random() < 0.3;
      const source: TradingCard["source"] = isNews
        ? {
            kind: "news",
            outlet:
              NEWS_OUTLETS[Math.floor(Math.random() * NEWS_OUTLETS.length)],
          }
        : { kind: "chat" };
      const card: TradingCard = {
        ...base,
        id: `${base.id}-${Date.now()}`,
        createdAt: Date.now(),
        pileInCount: Math.max(
          0,
          (base.pileInCount ?? 0) + Math.floor(Math.random() * 3),
        ),
        source,
      };
      publishSignal(card, {
        source: isNews ? "system" : "friend",
        notify: true,
      });
    };
    const initial = window.setTimeout(fireOne, INITIAL_DELAY_MS);
    const interval = window.setInterval(fireOne, AUTOFIRE_INTERVAL_MS);
    return () => {
      stopped = true;
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [publishSignal]);

  const value = useMemo(
    () => ({
      events,
      publishSignal,
      subscribe,
      followedAuthorIds,
      toggleFollow,
      isFollowing,
      openAuthorId,
      openAuthor,
      closeAuthor,
      autoMirrorAuthorIds,
      toggleAutoMirror,
      isAutoMirroring,
      pileInsToday,
      pileInCardIds,
      todaysExposureR,
      dailyRCap,
      setDailyRCap,
      recordPileIn,
    }),
    [
      events,
      publishSignal,
      subscribe,
      followedAuthorIds,
      toggleFollow,
      isFollowing,
      openAuthorId,
      openAuthor,
      closeAuthor,
      autoMirrorAuthorIds,
      toggleAutoMirror,
      isAutoMirroring,
      pileInsToday,
      pileInCardIds,
      todaysExposureR,
      dailyRCap,
      setDailyRCap,
      recordPileIn,
    ],
  );

  return (
    <SignalsContext.Provider value={value}>{children}</SignalsContext.Provider>
  );
}

export function useSignals() {
  const ctx = useContext(SignalsContext);
  if (!ctx) throw new Error("useSignals must be used inside <SignalsProvider>");
  return ctx;
}

/**
 * Subscribe to notify-flagged signal events. The listener is held in a
 * ref so consumers can use freshly-captured closures without
 * re-subscribing on every render.
 */
export function useSignalEvents(listener: Listener) {
  const ctx = useSignals();
  const ref = useRef(listener);
  // Keep the ref pointed at the freshest callback (so consumers can
  // use freshly-captured closures) without re-subscribing on every
  // render. useLayoutEffect runs sync after commit, before the
  // event might fire.
  useLayoutEffect(() => {
    ref.current = listener;
  });
  useEffect(() => {
    const wrapped: Listener = (e) => ref.current(e);
    return ctx.subscribe(wrapped);
  }, [ctx]);
}
