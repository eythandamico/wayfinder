"use client";

import { useEffect, useRef, useState } from "react";
import { ActivityPanel } from "../ActivityPanel";
import { ChartPanel } from "../ChartPanel";
import { ExplorePathsPanel } from "../ExplorePathsPanel";
import { PortfolioMainView } from "../PortfolioSheet";
import { WatchlistPanel } from "../WatchlistPanel";
import { WALLETS } from "../../_data/mocks";
import { usePortfolioSheet } from "../../_state/shells-context";
import { BottomSheet } from "./BottomSheet";
import { ChatTakeoverSheet } from "./ChatTakeoverSheet";
import { MobileAgentComposer } from "./MobileAgentComposer";
import { MobileTopBar } from "./MobileTopBar";
import { SwipePanelDeck, type SwipePanel } from "./SwipePanelDeck";

/** Index of the Activity panel — chosen as the default landing so the
 *  user opens the app to "what did I miss" content (signals + agent
 *  updates) rather than a static portfolio snapshot. */
const ACTIVITY_PANEL_INDEX = 1;

/**
 * Mobile shell — agent-first.
 *
 * Layout:
 *   ┌──────────────────────────────┐
 *   │ thin top bar                 │
 *   │ panel indicator + label      │
 *   │                              │
 *   │ swipeable panel deck         │  ← Portfolio · Activity (default)
 *   │                              │    · Watchlist · Markets · Paths
 *   │                              │
 *   ├──────────────────────────────┤
 *   │ persistent composer          │  ← always visible
 *   └──────────────────────────────┘
 *
 * Tapping (focusing) or sending from the composer opens the
 * ChatTakeoverSheet — a near-full-screen sheet that slides down from
 * the safe-area-top to the composer's top edge. The composer stays
 * functional underneath the sheet so a continued conversation feels
 * uninterrupted.
 *
 * Chat is intentionally NOT one of the deck panels. The deck holds
 * read-mostly surfaces; the agent conversation gets its own dedicated
 * sheet so it can take over the screen when the user wants to engage.
 *
 * Deliberately removed from the previous mobile layout:
 *   - Market-pill row (BTC ticker with prev/next chevrons) — agent
 *     surfaces tickers contextually inside chat messages.
 *   - BottomBar with parallel Trade/composer/actions — replaced by
 *     the persistent composer + chat takeover model.
 *   - The Trade ticket bottom sheet (the loud mint-fill one) — trade
 *     entry flows through signal-card pile-in, agent intents, or a
 *     desktop session.
 */
export function MobileLayout() {
  const { open: portfolioOpen, closePortfolio } = usePortfolioSheet();
  const [activeWallet, setActiveWallet] = useState(WALLETS[0]);
  const [chatOpen, setChatOpen] = useState(false);

  // Composer height → CSS variable. The ChatTakeoverSheet reads this
  // to position its bottom edge just above the composer instead of
  // covering it. ResizeObserver tracks dynamic changes (keyboard
  // open, multi-line input growth, safe-area inset shifts).
  const composerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    const apply = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty(
        "--mobile-composer-h",
        `${Math.ceil(h)}px`,
      );
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--mobile-composer-h");
    };
  }, []);

  // Panel order: read-mostly surfaces, Activity in the middle as
  // default. Order chosen so a single swipe in either direction lands
  // on the most-glanced-at neighbor.
  const panels: SwipePanel[] = [
    {
      id: "portfolio",
      label: "Portfolio",
      render: () => (
        <PanelFrame>
          <PortfolioMainView
            onOpenSettings={() => {
              /* settings drill-in is a follow-up; the hide-balances
                 toggle and density picker land in that view */
            }}
            activeWallet={activeWallet}
            setActiveWallet={setActiveWallet}
          />
        </PanelFrame>
      ),
    },
    {
      id: "activity",
      label: "Activity",
      render: () => (
        <PanelFrame>
          <ActivityPanel />
        </PanelFrame>
      ),
    },
    {
      id: "watchlist",
      label: "Watchlist",
      render: () => (
        <PanelFrame>
          <WatchlistPanel panel={{ id: "mobile-watchlist", type: "watchlist" }} />
        </PanelFrame>
      ),
    },
    {
      id: "markets",
      label: "Markets",
      render: () => (
        <PanelFrame>
          <ChartPanel tfPosition="below" />
        </PanelFrame>
      ),
    },
    {
      id: "paths",
      label: "Paths",
      render: () => (
        <PanelFrame>
          <ExplorePathsPanel />
        </PanelFrame>
      ),
    },
  ];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <MobileTopBar />
      <SwipePanelDeck panels={panels} defaultIndex={ACTIVITY_PANEL_INDEX} />

      {/* Persistent reduced composer — tapping (focus) or sending
          opens the chat takeover sheet. Wrapped in a ref'd div so we
          can observe its height for the sheet's bottom offset. */}
      <div ref={composerRef} className="relative z-50">
        <MobileAgentComposer
          chatOpen={chatOpen}
          onEngage={() => setChatOpen(true)}
          onAfterSubmit={() => setChatOpen(true)}
        />
      </div>

      {/* Chat takeover — slides down from the top, stops at the
          composer's top edge. The persistent composer stays
          functional underneath so the user keeps the same input
          throughout the conversation. */}
      <ChatTakeoverSheet open={chatOpen} onOpenChange={setChatOpen} />

      {/* Portfolio bottom sheet — driven by usePortfolioSheet so the
          wallet avatar in the top bar can pop the rich drill-in even
          when the user isn't on the Portfolio panel. */}
      <BottomSheet
        open={portfolioOpen}
        onOpenChange={(o) => !o && closePortfolio()}
        heightFraction={0.95}
      >
        <div className="flex h-full flex-col">
          <PortfolioMainView
            onOpenSettings={() => {
              /* see note above — settings is a Phase 2 surface */
            }}
            activeWallet={activeWallet}
            setActiveWallet={setActiveWallet}
          />
        </div>
      </BottomSheet>
    </div>
  );
}

/** Each panel gets a flex column wrapper so its body can take all
 *  remaining vertical space. `relative` traps any absolutely-
 *  positioned descendants (chat panel settings wrench, toast
 *  overlays, etc.) so they don't bleed into the off-screen panels
 *  on either side of the swipe deck. */
function PanelFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {children}
    </div>
  );
}
