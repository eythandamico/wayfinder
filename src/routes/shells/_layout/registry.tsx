import type { ComponentType } from "react";
import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  CloudSun,
  Eye,
  Flag,
  Globe2,
  LineChart,
  ListChecks,
  MessageCircle,
  Mic,
  Music,
  Newspaper,
  Repeat,
  ShoppingBag,
  TrendingUp,
  Tv,
  Vote,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { ActivityPanel } from "../_components/ActivityPanel";
import { CalendarPanel } from "../_components/CalendarPanel";
import {
  ChartPanel,
  ChartPanelHeaderActions,
} from "../_components/ChartPanel";
import { ChatPanel } from "../_components/ChatPanel";
import { ConcertsPanel } from "../_components/ConcertsPanel";
import { CustomChartPanel } from "../_components/CustomChartPanel";
import { GolfPanel } from "../_components/GolfPanel";
import { MarketplacePanel } from "../_components/MarketplacePanel";
import { MediaPanel } from "../_components/MediaPanel";
import { MiniChartsPanel } from "../_components/MiniChartsPanel";
import { OrderBookPanel } from "../_components/OrderBook";
import { PolymarketPanel } from "../_components/PolymarketPanel";
import { PortfolioPanel } from "../_components/PortfolioPanel";
import { TodoPanel } from "../_components/TodoPanel";
import { TopMoversPanel } from "../_components/TopMoversPanel";
import {
  TradePanel,
  TradePanelHeaderActions,
} from "../_components/TradePanel";
import { VideoPanel } from "../_components/VideoPanel";
import { VideoSearchPanel } from "../_components/VideoSearchPanel";
import { WatchlistPanel } from "../_components/WatchlistPanel";
import { WeatherPanel } from "../_components/WeatherPanel";
import { WorldClocksPanel } from "../_components/WorldClocksPanel";
import type { PanelInstance, PanelType } from "./types";

/**
 * Maps a panel type identifier to the React component that renders it,
 * plus the human-facing label and a Lucide icon for the "Add panel"
 * selector in the top nav.
 *
 * Add new panel types here. Anything not in this registry is treated as
 * an unknown leaf and rendered as an error chip (better than crashing).
 *
 * Components optionally receive a `panel` prop carrying their
 * PanelInstance (id + type + config) so configurable panels like
 * customChart can read their per-instance state.
 */

export type PanelComponentProps = { panel: PanelInstance };

/** Logical grouping for the Add Panel menu. Drives both the section
 *  ordering and the labels rendered above each tile group. */
export type PanelCategory = "markets" | "insights" | "social" | "extras";

export type PanelDescriptor = {
  type: PanelType;
  label: string;
  Icon: LucideIcon;
  // Panels can opt in to receiving their PanelInstance by accepting a
  // `panel?` prop. Most panels ignore it. Typed loosely so existing
  // panels (e.g. ChartPanel with its tfPosition prop) keep working
  // without each having to declare the panel prop too.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: ComponentType<any>;
  /** Optional component rendered into PanelChrome's right-side
   *  `actions` slot (between any custom panel content and the Close
   *  ×). Use this for panel-level affordances that belong NEXT TO
   *  the panel title rather than inside the panel body — e.g. the
   *  chart's "make this the main chart" crown. Receives the same
   *  PanelInstance as the main Component so it can read the panel's
   *  config + global state hooks. */
  HeaderActions?: ComponentType<{ panel: PanelInstance }>;
  /** Which grouping this panel belongs to in the Add Panel menu.
   *  Optional because hidden-from-menu panels (customChart) don't
   *  need to be assigned. */
  category?: PanelCategory;
  /** Hidden from the "Add panel" tile grid. Useful for panels that are
   *  only created from a dedicated flow (e.g. customChart from
   *  "Create chart") so they don't show up as a blank-config tile. */
  hiddenFromAddMenu?: boolean;
  /** When set, the leaf wrapper that hosts this panel caps its
   *  height to this many pixels. */
  maxHeight?: number;
  /** Marks the panel as Pro-only. Free users see a ProTag chip on the
   *  Add Panel tile (replacing the + affordance) and clicking it opens
   *  the pricing modal instead of dispatching addPanel. Pro users
   *  treat it as a regular tile.
   *
   *  Picked to mirror the Pro plan's feature list: multi-series
   *  charts, full-history signals, and Pendle/Boros/Aave quant data. */
  pro?: boolean;
};

/** Sections rendered in the Add Panel menu, top-to-bottom. The order
 *  reflects primary user intent — most users come to the app to look
 *  at markets, so that bucket sits up top. */
export const PANEL_CATEGORIES: Array<{ id: PanelCategory; label: string }> = [
  { id: "markets", label: "Markets" },
  { id: "insights", label: "Insights" },
  { id: "social", label: "Social" },
  { id: "extras", label: "Extras" },
];

/** Registry order = tile order within each category, ordered roughly
 *  by frequency-of-use within each bucket. */
export const PANEL_REGISTRY: Record<PanelType, PanelDescriptor> = {
  // ─── Markets ─────────────────────────────────────────────────────
  chart: {
    type: "chart",
    label: "Chart",
    Icon: LineChart,
    Component: ChartPanel,
    HeaderActions: ChartPanelHeaderActions,
    category: "markets",
  },
  trade: {
    type: "trade",
    label: "Trade",
    Icon: Repeat,
    Component: TradePanel,
    HeaderActions: TradePanelHeaderActions,
    category: "markets",
  },
  orderbook: {
    type: "orderbook",
    label: "Order Book",
    Icon: BookOpen,
    Component: OrderBookPanel,
    category: "markets",
  },
  watchlist: {
    type: "watchlist",
    label: "Watchlist",
    Icon: Eye,
    Component: WatchlistPanel,
    category: "markets",
  },
  miniCharts: {
    type: "miniCharts",
    label: "Mini Charts",
    Icon: Activity,
    Component: MiniChartsPanel,
    category: "markets",
    pro: true,
  },
  movers: {
    type: "movers",
    label: "Gainers & Losers",
    Icon: TrendingUp,
    Component: TopMoversPanel,
    category: "markets",
    pro: true,
  },
  portfolio: {
    type: "portfolio",
    label: "Portfolio",
    Icon: Wallet,
    Component: PortfolioPanel,
    category: "markets",
  },

  // ─── Insights ────────────────────────────────────────────────────
  polymarket: {
    type: "polymarket",
    label: "Polymarket",
    Icon: Vote,
    Component: PolymarketPanel,
    category: "insights",
    pro: true,
  },
  media: {
    type: "media",
    label: "News & Social",
    Icon: Newspaper,
    Component: MediaPanel,
    category: "insights",
    pro: true,
  },

  // ─── Social ──────────────────────────────────────────────────────
  chat: {
    type: "chat",
    label: "Agent",
    Icon: MessageCircle,
    Component: ChatPanel,
    category: "social",
  },
  activity: {
    type: "activity",
    label: "Activity",
    Icon: Bell,
    Component: ActivityPanel,
    category: "social",
    pro: true,
  },
  companion: {
    type: "companion",
    label: "Companion",
    Icon: Mic,
    Component: VideoPanel,
    category: "social",
    pro: true,
  },
  // ─── Extras ──────────────────────────────────────────────────────
  calendar: {
    type: "calendar",
    label: "Calendar",
    Icon: CalendarDays,
    Component: CalendarPanel,
    category: "extras",
    pro: true,
  },
  todo: {
    type: "todo",
    label: "To-do",
    Icon: ListChecks,
    Component: TodoPanel,
    category: "extras",
  },
  marketplace: {
    type: "marketplace",
    label: "Marketplace",
    Icon: ShoppingBag,
    Component: MarketplacePanel,
    category: "extras",
    pro: true,
  },
  concerts: {
    type: "concerts",
    label: "Concerts",
    Icon: Music,
    Component: ConcertsPanel,
    category: "extras",
    pro: true,
  },
  worldClocks: {
    type: "worldClocks",
    label: "World clocks",
    Icon: Globe2,
    Component: WorldClocksPanel,
    category: "extras",
  },
  weather: {
    type: "weather",
    label: "Weather",
    Icon: CloudSun,
    Component: WeatherPanel,
    category: "extras",
  },
  golf: {
    type: "golf",
    label: "Tee Times",
    Icon: Flag,
    Component: GolfPanel,
    category: "extras",
    pro: true,
  },
  video: {
    type: "video",
    label: "Streams",
    Icon: Tv,
    Component: VideoSearchPanel,
    category: "extras",
    pro: true,
  },

  // ─── Hidden (created via dedicated flows) ────────────────────────
  customChart: {
    type: "customChart",
    label: "Custom Chart",
    Icon: Activity,
    Component: CustomChartPanel,
    // Created via the dedicated "Create chart" button + dialog, not
    // from the Add panel tile grid (which would create an unconfigured
    // chart with no metric/venue/timeframe).
    hiddenFromAddMenu: true,
  },
};

export const PANEL_TYPES = Object.values(PANEL_REGISTRY).filter(
  (p) => !p.hiddenFromAddMenu,
);

/* ComponentType keeps the lint rule happy about untyped components. */
export type { ComponentType };
