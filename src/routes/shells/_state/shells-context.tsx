"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MARKETS } from "../_data/mocks";
import { CONTACTS } from "../_data/contacts";
import type { Market } from "../_types";

export type Density = "small" | "medium" | "large";
export type ViewMode = "trading" | "explore" | "loops" | "settings";

/**
 * Prediction-market target — the single source of truth for "what's
 * loaded in the trade panel's Prediction ticket". Set when the user
 * clicks an outcome on the Polymarket panel.
 */
export type PredictionTarget = {
  eventId: string;
  eventTitle: string;
  eventImage: string | null;
  optionLabel: string | null;
  optionIcon: string | null;
  yesPrice: number;
  initialSide: "yes" | "no";
};

const DENSITY_KEY = "wf-shells-v3-density";
const VIEW_MODE_KEY = "wf-shells-v3-view-v1";
const MAIN_CHART_KEY = "wf-shells-v3-main-chart-v1";
const CHART_MARKETS_KEY = "wf-shells-v3-chart-markets-v1";
const WALLET_CONNECTED_KEY = "wf-shells-v3-wallet-connected-v1";
const MARQUEE_ENABLED_KEY = "wf-shells-v3-marquee-v1";
const REDUCE_MOTION_KEY = "wf-shells-v3-reduce-motion-v1";
const SOUND_KEY = "wf-shells-v3-sound-v1";
const AMBIENT_KEY = "wf-shells-v3-ambient-v1";
const FRIEND_IDS_KEY = "wf-shells-v3-friend-ids-v1";

/** Initial friend set — seeded from CONTACTS the first time a user
 *  loads the app. Persisted additions/removals then live in
 *  localStorage under FRIEND_IDS_KEY. */
const DEFAULT_FRIEND_IDS = CONTACTS.filter((c) => c.kind === "friend").map(
  (c) => c.id,
);
/** Default layout's first chart panel — claims main-chart status on
 *  first load so the trade panel has something to bind to out of the
 *  box. Stays in sync with `_layout/default.ts`. */
const DEFAULT_MAIN_CHART_ID = "chart-1";

type ShellsContextValue = {
  activeMarket: Market;
  setActiveMarket: (market: Market) => void;
  commandOpen: boolean;
  openCommand: () => void;
  closeCommand: () => void;
  toggleCommand: () => void;
  density: Density;
  setDensity: (d: Density) => void;
  viewMode: ViewMode;
  setViewMode: (m: ViewMode) => void;
  portfolioOpen: boolean;
  openPortfolio: () => void;
  closePortfolio: () => void;
  togglePortfolio: () => void;
  friendsOpen: boolean;
  openFriends: () => void;
  closeFriends: () => void;
  toggleFriends: () => void;
  depositOpen: boolean;
  openDeposit: () => void;
  closeDeposit: () => void;
  /** Friends — the user's social graph. Seeded from CONTACTS where
   *  kind === "friend" and persisted to localStorage so additions
   *  survive reload. */
  friendIds: ReadonlySet<string>;
  addFriend: (id: string) => void;
  removeFriend: (id: string) => void;
  isFriend: (id: string) => boolean;
  /** Friend chat drill-in — open inside the FriendsSheet over the
   *  panel body, same slot the TraderProfile uses. null = no chat. */
  chatWithFriendId: string | null;
  openFriendChat: (id: string) => void;
  closeFriendChat: () => void;
  /** Add-friend modal — opened from the FriendsPanel header. */
  addFriendOpen: boolean;
  openAddFriend: () => void;
  closeAddFriend: () => void;
  /** Which ChartPanel is currently the "main" — its market mirrors
   *  the global activeMarket (and vice versa), so the trade panel /
   *  order book / etc. follow it. null = no main, charts are
   *  decoupled and the trade panel sticks to whatever activeMarket
   *  was last set. */
  mainChartId: string | null;
  setMainChartId: (id: string | null) => void;
  /** Per-chart market id overrides. Non-main charts read from here
   *  so each chart can show a different asset independently. The
   *  main chart ignores this and reads activeMarket. */
  chartMarkets: Record<string, string>;
  setChartMarket: (panelId: string, marketId: string) => void;
  /** When the CommandBar's market picker opens, this records who
   *  asked for it. null = global activeMarket; string = the chart
   *  panel whose market should be updated on select. CommandBar
   *  clears it after the selection lands. */
  marketPickerTarget: string | null;
  setMarketPickerTarget: (id: string | null) => void;
  /** Globally-seeded watchlist tickers. When set, fresh Watchlist
   *  panels (those without their own `panel.config.tickers`) read
   *  from this instead of DEFAULT_TICKERS. Used by the fresh-wallet
   *  interview to populate a watchlist matching the user's stated
   *  trade kind. `null` = unseeded; use the panel default. */
  seededWatchlistTickers: string[] | null;
  setSeededWatchlistTickers: (tickers: string[] | null) => void;
  walletConnected: boolean;
  connectWallet: () => void;
  disconnectWallet: () => void;
  predictionTarget: PredictionTarget | null;
  setPredictionTarget: (t: PredictionTarget | null) => void;
  marqueeEnabled: boolean;
  setMarqueeEnabled: (v: boolean) => void;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  ambientEnabled: boolean;
  setAmbientEnabled: (v: boolean) => void;
};

const ShellsContext = createContext<ShellsContextValue | null>(null);

export function ShellsProvider({ children }: { children: ReactNode }) {
  const [activeMarket, setActiveMarket] = useState<Market>(MARKETS[0]);
  const [commandOpen, setCommandOpen] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [friendIds, setFriendIds] = useState<ReadonlySet<string>>(
    () => new Set(DEFAULT_FRIEND_IDS),
  );
  const [chatWithFriendId, setChatWithFriendId] = useState<string | null>(
    null,
  );
  const [addFriendOpen, setAddFriendOpen] = useState(false);

  // Hydrate friendIds from localStorage on mount. Two-pass pattern
  // (same as density/viewMode) avoids reading storage during the
  // initial render — keeps SSR-safe + skips a hydration mismatch
  // when the persisted list differs from the seed.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(FRIEND_IDS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setFriendIds(new Set(parsed));
      }
    } catch {
      /* ignore — storage blocked, stick with the default seed */
    }
  }, []);
  const persistFriendIds = useCallback((next: ReadonlySet<string>) => {
    try {
      window.localStorage.setItem(
        FRIEND_IDS_KEY,
        JSON.stringify(Array.from(next)),
      );
    } catch {
      /* ignore */
    }
  }, []);
  const [density, setDensityState] = useState<Density>("medium");
  const [viewMode, setViewModeState] = useState<ViewMode>("trading");
  const [mainChartId, setMainChartIdState] = useState<string | null>(
    DEFAULT_MAIN_CHART_ID,
  );
  const [chartMarkets, setChartMarketsState] = useState<
    Record<string, string>
  >({});
  const [marketPickerTarget, setMarketPickerTarget] = useState<string | null>(
    null,
  );
  const [seededWatchlistTickers, setSeededWatchlistTickers] = useState<
    string[] | null
  >(null);
  const [predictionTarget, setPredictionTargetState] =
    useState<PredictionTarget | null>(null);
  // Initialize to constants on both server and client so first-render
  // markup matches. Real persisted values get applied in the useEffect
  // below — same two-pass pattern as `density` / `viewMode` /
  // `mainChartId` / `chartMarkets` further down. Reading localStorage
  // inside a lazy initializer would mismatch hydration for any user
  // who'd opted into these toggles.
  const [marqueeEnabled, setMarqueeEnabledState] = useState(false);
  const [reduceMotion, setReduceMotionState] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(false);
  const [ambientEnabled, setAmbientEnabledState] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);

  // Hydrate density from localStorage after mount (SSR-safe).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DENSITY_KEY) as Density | null;
      if (saved === "small" || saved === "medium" || saved === "large") {
        setDensityState(saved);
      }
      const savedView = window.localStorage.getItem(VIEW_MODE_KEY);
      if (savedView === "trading" || savedView === "explore") {
        setViewModeState(savedView);
      }
      const savedMain = window.localStorage.getItem(MAIN_CHART_KEY);
      if (savedMain !== null) {
        setMainChartIdState(savedMain === "" ? null : savedMain);
      }
      const savedMarkets = window.localStorage.getItem(CHART_MARKETS_KEY);
      if (savedMarkets) {
        try {
          const parsed = JSON.parse(savedMarkets);
          if (parsed && typeof parsed === "object") {
            setChartMarketsState(parsed as Record<string, string>);
          }
        } catch {
          /* ignore */
        }
      }
      // Boolean toggles persisted as "1" — absent or any other value
      // means off. Applied post-mount so SSR markup is consistent.
      if (window.localStorage.getItem(MARQUEE_ENABLED_KEY) === "1") {
        setMarqueeEnabledState(true);
      }
      if (window.localStorage.getItem(REDUCE_MOTION_KEY) === "1") {
        setReduceMotionState(true);
      }
      if (window.localStorage.getItem(SOUND_KEY) === "1") {
        setSoundEnabledState(true);
      }
      if (window.localStorage.getItem(AMBIENT_KEY) === "1") {
        setAmbientEnabledState(true);
      }
      if (window.localStorage.getItem(WALLET_CONNECTED_KEY) === "1") {
        setWalletConnected(true);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Apply density on <html> while Shells is mounted; clear on unmount so other
  // routes don't inherit the attribute. <html>-level placement means any
  // portaled content (BottomSheet, CommandBar palette, MarketPicker) inherits
  // the CSS variables without per-portal wiring.
  useEffect(() => {
    document.documentElement.dataset.density = density;
    return () => {
      delete document.documentElement.dataset.density;
    };
  }, [density]);

  const setDensity = useCallback((d: Density) => {
    setDensityState(d);
    try {
      window.localStorage.setItem(DENSITY_KEY, d);
    } catch {
      /* ignore */
    }
  }, []);

  const setViewMode = useCallback((m: ViewMode) => {
    setViewModeState(m);
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  const openCommand = useCallback(() => setCommandOpen(true), []);
  const closeCommand = useCallback(() => setCommandOpen(false), []);
  const toggleCommand = useCallback(() => setCommandOpen((v) => !v), []);

  const openPortfolio = useCallback(() => setPortfolioOpen(true), []);
  const closePortfolio = useCallback(() => setPortfolioOpen(false), []);
  const togglePortfolio = useCallback(() => setPortfolioOpen((v) => !v), []);

  const openFriends = useCallback(() => setFriendsOpen(true), []);
  const closeFriends = useCallback(() => setFriendsOpen(false), []);
  const toggleFriends = useCallback(() => setFriendsOpen((v) => !v), []);

  const openDeposit = useCallback(() => setDepositOpen(true), []);
  const closeDeposit = useCallback(() => setDepositOpen(false), []);

  const addFriend = useCallback(
    (id: string) => {
      setFriendIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        persistFriendIds(next);
        return next;
      });
    },
    [persistFriendIds],
  );
  const removeFriend = useCallback(
    (id: string) => {
      setFriendIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        persistFriendIds(next);
        return next;
      });
    },
    [persistFriendIds],
  );
  const isFriend = useCallback((id: string) => friendIds.has(id), [friendIds]);
  const openFriendChat = useCallback(
    (id: string) => setChatWithFriendId(id),
    [],
  );
  const closeFriendChat = useCallback(() => setChatWithFriendId(null), []);
  const openAddFriend = useCallback(() => setAddFriendOpen(true), []);
  const closeAddFriend = useCallback(() => setAddFriendOpen(false), []);

  const setMainChartId = useCallback((id: string | null) => {
    setMainChartIdState(id);
    try {
      window.localStorage.setItem(MAIN_CHART_KEY, id ?? "");
    } catch {
      /* ignore */
    }
  }, []);

  const setChartMarket = useCallback(
    (panelId: string, marketId: string) => {
      setChartMarketsState((prev) => {
        const next = { ...prev, [panelId]: marketId };
        try {
          window.localStorage.setItem(CHART_MARKETS_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  const connectWallet = useCallback(() => {
    setWalletConnected(true);
    try {
      window.localStorage.setItem(WALLET_CONNECTED_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const setPredictionTarget = useCallback(
    (t: PredictionTarget | null) => setPredictionTargetState(t),
    [],
  );

  const setMarqueeEnabled = useCallback((v: boolean) => {
    setMarqueeEnabledState(v);
    try {
      if (v) window.localStorage.setItem(MARQUEE_ENABLED_KEY, "1");
      else window.localStorage.removeItem(MARQUEE_ENABLED_KEY);
    } catch {
      /* ignore */
    }
  }, []);
  const setReduceMotion = useCallback((v: boolean) => {
    setReduceMotionState(v);
    try {
      if (v) window.localStorage.setItem(REDUCE_MOTION_KEY, "1");
      else window.localStorage.removeItem(REDUCE_MOTION_KEY);
    } catch {
      /* ignore */
    }
  }, []);
  const setSoundEnabled = useCallback((v: boolean) => {
    setSoundEnabledState(v);
    try {
      if (v) window.localStorage.setItem(SOUND_KEY, "1");
      else window.localStorage.removeItem(SOUND_KEY);
    } catch {
      /* ignore */
    }
  }, []);
  const setAmbientEnabled = useCallback((v: boolean) => {
    setAmbientEnabledState(v);
    try {
      if (v) window.localStorage.setItem(AMBIENT_KEY, "1");
      else window.localStorage.removeItem(AMBIENT_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWalletConnected(false);
    try {
      window.localStorage.removeItem(WALLET_CONNECTED_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      activeMarket,
      setActiveMarket,
      commandOpen,
      openCommand,
      closeCommand,
      toggleCommand,
      density,
      setDensity,
      viewMode,
      setViewMode,
      portfolioOpen,
      openPortfolio,
      closePortfolio,
      togglePortfolio,
      friendsOpen,
      openFriends,
      closeFriends,
      toggleFriends,
      depositOpen,
      openDeposit,
      closeDeposit,
      friendIds,
      addFriend,
      removeFriend,
      isFriend,
      chatWithFriendId,
      openFriendChat,
      closeFriendChat,
      addFriendOpen,
      openAddFriend,
      closeAddFriend,
      mainChartId,
      setMainChartId,
      chartMarkets,
      setChartMarket,
      marketPickerTarget,
      setMarketPickerTarget,
      seededWatchlistTickers,
      setSeededWatchlistTickers,
      walletConnected,
      connectWallet,
      disconnectWallet,
      predictionTarget,
      setPredictionTarget,
      marqueeEnabled,
      setMarqueeEnabled,
      reduceMotion,
      setReduceMotion,
      soundEnabled,
      setSoundEnabled,
      ambientEnabled,
      setAmbientEnabled,
    }),
    [
      activeMarket,
      commandOpen,
      openCommand,
      closeCommand,
      toggleCommand,
      density,
      setDensity,
      viewMode,
      setViewMode,
      portfolioOpen,
      openPortfolio,
      closePortfolio,
      togglePortfolio,
      friendsOpen,
      openFriends,
      closeFriends,
      toggleFriends,
      depositOpen,
      openDeposit,
      closeDeposit,
      friendIds,
      addFriend,
      removeFriend,
      isFriend,
      chatWithFriendId,
      openFriendChat,
      closeFriendChat,
      addFriendOpen,
      openAddFriend,
      closeAddFriend,
      mainChartId,
      setMainChartId,
      chartMarkets,
      setChartMarket,
      marketPickerTarget,
      seededWatchlistTickers,
      walletConnected,
      connectWallet,
      disconnectWallet,
      predictionTarget,
      setPredictionTarget,
      marqueeEnabled,
      setMarqueeEnabled,
      reduceMotion,
      setReduceMotion,
      soundEnabled,
      setSoundEnabled,
      ambientEnabled,
      setAmbientEnabled,
    ],
  );

  return (
    <ShellsContext.Provider value={value}>{children}</ShellsContext.Provider>
  );
}

export function useActiveMarket() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error("useActiveMarket must be used inside <ShellsProvider>");
  }
  return ctx;
}

export function useCommandBar() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error("useCommandBar must be used inside <ShellsProvider>");
  }
  return {
    open: ctx.commandOpen,
    openCommand: ctx.openCommand,
    closeCommand: ctx.closeCommand,
    toggleCommand: ctx.toggleCommand,
  };
}

export function usePortfolioSheet() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error("usePortfolioSheet must be used inside <ShellsProvider>");
  }
  return {
    open: ctx.portfolioOpen,
    openPortfolio: ctx.openPortfolio,
    closePortfolio: ctx.closePortfolio,
    togglePortfolio: ctx.togglePortfolio,
  };
}

export function useFriendsSheet() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error("useFriendsSheet must be used inside <ShellsProvider>");
  }
  return {
    open: ctx.friendsOpen,
    openFriends: ctx.openFriends,
    closeFriends: ctx.closeFriends,
    toggleFriends: ctx.toggleFriends,
  };
}

export function useDepositModal() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error("useDepositModal must be used inside <ShellsProvider>");
  }
  return {
    open: ctx.depositOpen,
    openDeposit: ctx.openDeposit,
    closeDeposit: ctx.closeDeposit,
  };
}

export function useFriends() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error("useFriends must be used inside <ShellsProvider>");
  }
  return {
    friendIds: ctx.friendIds,
    addFriend: ctx.addFriend,
    removeFriend: ctx.removeFriend,
    isFriend: ctx.isFriend,
    chatWithFriendId: ctx.chatWithFriendId,
    openFriendChat: ctx.openFriendChat,
    closeFriendChat: ctx.closeFriendChat,
    addFriendOpen: ctx.addFriendOpen,
    openAddFriend: ctx.openAddFriend,
    closeAddFriend: ctx.closeAddFriend,
  };
}

export function useDensity() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error("useDensity must be used inside <ShellsProvider>");
  }
  return { density: ctx.density, setDensity: ctx.setDensity };
}

/** Read or set which chart panel is currently the "main" chart —
 *  the one whose market is bound to the trade panel. */
export function useMainChart() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error("useMainChart must be used inside <ShellsProvider>");
  }
  return { mainChartId: ctx.mainChartId, setMainChartId: ctx.setMainChartId };
}

/** Per-chart market overrides. Non-main charts read their market id
 *  from this map; main charts ignore it and use activeMarket. */
export function useChartMarkets() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error("useChartMarkets must be used inside <ShellsProvider>");
  }
  return {
    chartMarkets: ctx.chartMarkets,
    setChartMarket: ctx.setChartMarket,
  };
}

/** Routing hint for the CommandBar's market picker. When a non-main
 *  chart wants to change its market, it sets the target before
 *  opening the picker; CommandBar reads this on select and routes
 *  the choice to the right chart instead of the global activeMarket. */
export function useMarketPickerTarget() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error(
      "useMarketPickerTarget must be used inside <ShellsProvider>",
    );
  }
  return {
    target: ctx.marketPickerTarget,
    setTarget: ctx.setMarketPickerTarget,
  };
}

export function useViewMode() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error("useViewMode must be used inside <ShellsProvider>");
  }
  return { viewMode: ctx.viewMode, setViewMode: ctx.setViewMode };
}

/** Globally-seeded watchlist tickers. Set by the fresh-wallet
 *  interview after the user picks a trade kind; read by
 *  WatchlistPanel as the per-panel-config fallback. */
export function useSeededWatchlist() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error(
      "useSeededWatchlist must be used inside <ShellsProvider>",
    );
  }
  return {
    seededTickers: ctx.seededWatchlistTickers,
    setSeededTickers: ctx.setSeededWatchlistTickers,
  };
}

/** Wallet connect state. Defaults false on first visit so empty
 *  states render honestly. Persisted to localStorage. */
export function useMarquee() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error("useMarquee must be used inside <ShellsProvider>");
  }
  return {
    enabled: ctx.marqueeEnabled,
    setEnabled: ctx.setMarqueeEnabled,
  };
}

/** Workspace chrome toggles surfaced in the Add menu. Each one is a
 *  cheap boolean flag persisted to localStorage. Consumers wire up
 *  the actual effects (reduce-motion CSS classes, sound effects,
 *  ambient shader) by reading the matching flag. */
export function useWorkspaceChrome() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error(
      "useWorkspaceChrome must be used inside <ShellsProvider>",
    );
  }
  return {
    marquee: ctx.marqueeEnabled,
    setMarquee: ctx.setMarqueeEnabled,
    reduceMotion: ctx.reduceMotion,
    setReduceMotion: ctx.setReduceMotion,
    sound: ctx.soundEnabled,
    setSound: ctx.setSoundEnabled,
    ambient: ctx.ambientEnabled,
    setAmbient: ctx.setAmbientEnabled,
  };
}

export function usePredictionTicket() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error(
      "usePredictionTicket must be used inside <ShellsProvider>",
    );
  }
  return {
    target: ctx.predictionTarget,
    setTarget: ctx.setPredictionTarget,
    clearTarget: () => ctx.setPredictionTarget(null),
  };
}

export function useWalletConnection() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error(
      "useWalletConnection must be used inside <ShellsProvider>",
    );
  }
  return {
    connected: ctx.walletConnected,
    connect: ctx.connectWallet,
    disconnect: ctx.disconnectWallet,
  };
}
