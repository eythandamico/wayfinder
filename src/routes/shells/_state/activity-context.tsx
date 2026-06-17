"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Radio,
  Sparkles,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { TradingCard as TradingCardData } from "../_data/trading-cards";
import { TradingCardSheet } from "../_components/TradingCardSheet";
import { useSignals } from "./signals-context";

/**
 * Activity feed — the single source of truth behind the bell-dropdown
 * in MarketHeader AND the standalone Activity panel. Lifting state up
 * here means marking an item read in one surface updates the other
 * immediately, and both share the "Get live updates" modal.
 *
 * Stream sources:
 *   - Mock platform notifications (order fills, liquidation warnings,
 *     polymarket payouts, agent suggestions, system events). Hardcoded
 *     for the demo; production wires this to whatever stream produces
 *     fills, liquidation warnings, etc.
 *   - Live SignalsProvider events — every chat / agent signal turns
 *     into an activity row.
 */

export type NotificationKind = "fill" | "warning" | "win" | "agent" | "system";

type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** Minutes ago — keeps the mock data resilient to clock drift in
   *  storybooks/demos. Formatted via formatRelative(). */
  minutesAgo: number;
  unread: boolean;
};

const NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    kind: "fill",
    title: "Order filled",
    body: "BTC-PERP long 0.04 filled at $75,729.50.",
    minutesAgo: 3,
    unread: true,
  },
  {
    id: "n2",
    kind: "warning",
    title: "Liquidation risk",
    body: "ETH-PERP short within 4.2% of liquidation. Add margin or reduce.",
    minutesAgo: 12,
    unread: true,
  },
  {
    id: "n3",
    kind: "win",
    title: "Polymarket payout",
    body: "Switzerland to win Eurovision resolved YES — +$230.00 credited.",
    minutesAgo: 64,
    unread: true,
  },
  {
    id: "n4",
    kind: "agent",
    title: "Wayfinder suggestion",
    body: "Your SOL-PERP leverage is 30× — consider trimming on the next bounce.",
    minutesAgo: 142,
    unread: false,
  },
  {
    id: "n5",
    kind: "system",
    title: "Path installed",
    body: "Trend-follow / 4h is now live and watching your watchlist.",
    minutesAgo: 1280,
    unread: false,
  },
];

export type IconMeta = {
  Icon: LucideIcon;
  iconClass: string;
  ringClass: string;
};

const KIND_META: Record<NotificationKind, IconMeta> = {
  fill: {
    Icon: CheckCircle2,
    iconClass: "text-primary",
    ringClass: "bg-primary/15",
  },
  warning: {
    Icon: AlertTriangle,
    iconClass: "text-tone-down",
    ringClass: "bg-tone-down/15",
  },
  win: {
    Icon: Trophy,
    iconClass: "text-primary",
    ringClass: "bg-primary/15",
  },
  agent: {
    Icon: Sparkles,
    iconClass: "text-foreground",
    ringClass: "bg-surface-3",
  },
  system: {
    Icon: Zap,
    iconClass: "text-muted-foreground",
    ringClass: "bg-surface-2",
  },
};

/** Shared signal meta — Radio is the fallback icon when a signal
 *  somehow lacks an author id. In the common path the row renders a
 *  Jazzicon avatar instead. */
const SIGNAL_META: IconMeta = {
  Icon: Radio,
  iconClass: "text-primary",
  ringClass: "bg-primary/15",
};

/** A unified display row — either a mock platform notification or a
 *  live signal from the SignalsProvider stream. Both surfaces (bell
 *  dropdown + Activity panel) render the same shape. */
export type DisplayItem = {
  id: string;
  source: "mock" | "signal";
  meta: IconMeta;
  title: string;
  body: string;
  at: number;
  unread: boolean;
  /** Set for signal rows so they can render a Jazzicon profile picture
   *  instead of a generic icon glyph. */
  authorId?: string;
  /** Set for signal rows — clicking the row opens the full trading
   *  card sheet (the drill-in surface that used to live behind the
   *  standalone Signals panel before it was removed). */
  card?: TradingCardData;
  onSelect: () => void;
};

/** Author ids are arbitrary strings (e.g. "kalos"), not hex addresses,
 *  so we can't feed them to jsNumberForAddress. This hash matches the
 *  fallback used in ContactAvatar so the same id always produces the
 *  same jazzicon across the toast, dropdown row, and AuthorSheet. */
export function jazziconSeedFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = ((h * 31 + s.charCodeAt(i)) | 0) >>> 0;
  }
  return h;
}

export function formatRelative(ms: number): string {
  const delta = Date.now() - ms;
  const m = Math.max(0, Math.floor(delta / 60_000));
  if (m < 1) return "now";
  if (m < 60) return `${m}m ago`;
  if (m < 60 * 24) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / (60 * 24))}d ago`;
}

type ActivityContextValue = {
  items: DisplayItem[];
  unreadCount: number;
  markAllRead: () => void;
  phoneModalOpen: boolean;
  openPhoneModal: () => void;
  closePhoneModal: () => void;
  /** Whether the user has set up SMS alerts. Used by job toasts to
   *  suppress the "Get notified" CTA after the user is already
   *  subscribed. */
  smsOptedIn: boolean;
  /** Called by PhoneNumberModal when the user submits a number.
   *  Flips `smsOptedIn` to true; the toast disappears on the next
   *  render. */
  confirmSmsOptIn: () => void;
};

const ActivityContext = createContext<ActivityContextValue | null>(null);

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [mockItems, setMockItems] = useState<Notification[]>(NOTIFICATIONS);
  // Read state for live signals lives here — the SignalsProvider
  // doesn't track per-event read status (its job is delivery + the
  // cascade). Any signal whose id isn't in this set reads as unread.
  const [readSignalIds, setReadSignalIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [smsOptedIn, setSmsOptedIn] = useState(false);
  // Card-sheet drill-in for signal rows. Mounted once below so every
  // surface that consumes ActivityContext (the bell dropdown + the
  // Activity panel) shares one sheet — no per-surface state.
  const [openCard, setOpenCard] = useState<TradingCardData | null>(null);
  const { events: signalEvents } = useSignals();

  const items = useMemo<DisplayItem[]>(() => {
    // Date.now() is impure but the value only seeds relative-time
    // strings — formatRelative() is recomputed in every render — so
    // an unstable anchor here can't drift React state. The purity
    // lint flags it conservatively; same disable pattern as
    // MarketHeader.tsx's id generators.
    const now = Date.now();
    const fromMocks: DisplayItem[] = mockItems.map((n) => ({
      id: `mock-${n.id}`,
      source: "mock",
      meta: KIND_META[n.kind],
      title: n.title,
      body: n.body,
      at: now - n.minutesAgo * 60_000,
      unread: n.unread,
      onSelect: () =>
        setMockItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)),
        ),
    }));
    const fromSignals: DisplayItem[] = signalEvents.map((e) => ({
      id: `signal-${e.id}`,
      source: "signal",
      meta: SIGNAL_META,
      title: `${e.card.author.name} on ${e.card.ticker}`,
      body: e.card.thesis,
      at: e.at,
      unread: !readSignalIds.has(e.id),
      authorId: e.card.author.id,
      card: e.card,
      onSelect: () => {
        // Mark read AND open the full card sheet — the only path to
        // the rich card view now that the standalone Signals panel
        // is gone.
        setReadSignalIds((prev) => {
          if (prev.has(e.id)) return prev;
          const next = new Set(prev);
          next.add(e.id);
          return next;
        });
        setOpenCard(e.card);
      },
    }));
    return [...fromMocks, ...fromSignals].sort((a, b) => b.at - a.at);
  }, [mockItems, signalEvents, readSignalIds]);

  const unreadCount = items.reduce((n, x) => n + (x.unread ? 1 : 0), 0);

  const markAllRead = () => {
    setMockItems((prev) => prev.map((x) => ({ ...x, unread: false })));
    setReadSignalIds(new Set(signalEvents.map((e) => e.id)));
  };

  return (
    <ActivityContext.Provider
      value={{
        items,
        unreadCount,
        markAllRead,
        phoneModalOpen,
        openPhoneModal: () => setPhoneModalOpen(true),
        closePhoneModal: () => setPhoneModalOpen(false),
        smsOptedIn,
        confirmSmsOptIn: () => setSmsOptedIn(true),
      }}
    >
      {children}
      {/* Shared trading-card sheet — opened from any ActivityRow with
          source === "signal". Mounted once here so the bell dropdown
          and the Activity panel share a single sheet instance instead
          of each surface owning its own state. */}
      <TradingCardSheet
        card={openCard}
        onOpenChange={(open) => !open && setOpenCard(null)}
      />
    </ActivityContext.Provider>
  );
}

export function useActivity() {
  const ctx = useContext(ActivityContext);
  if (!ctx) {
    throw new Error("useActivity must be used inside <ActivityProvider>");
  }
  return ctx;
}
