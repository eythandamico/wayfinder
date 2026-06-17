"use client";

import { useState } from "react";
import { ActivityPanel } from "../ActivityPanel";
import { ChartPanel } from "../ChartPanel";
import { ChatPanel } from "../ChatPanel";
import { ExplorePathsPanel } from "../ExplorePathsPanel";
import { PortfolioMainView } from "../PortfolioSheet";
import { WatchlistPanel } from "../WatchlistPanel";
import { WALLETS } from "../../_data/mocks";
import { usePortfolioSheet } from "../../_state/shells-context";
import { BottomSheet } from "./BottomSheet";
import { MobileTopBar } from "./MobileTopBar";
import { SwipePanelDeck, type SwipePanel } from "./SwipePanelDeck";

/**
 * Mobile shell — agent-first.
 *
 * Unlike the desktop trading workstation, mobile is a "check in with
 * your agent" surface. A thin top bar sits on top of a horizontal
 * swipe deck of full-screen panels; the user moves between Portfolio,
 * Activity, Chat (default landing), Watchlist, and Markets by swiping
 * laterally or tapping the dot indicators above the deck.
 *
 * The Chat panel carries its own composer at the bottom (focal point
 * when the user lands or swipes back). The Portfolio bottom sheet
 * remains available as a drill-in via the wallet avatar in the top
 * bar — useful when the user wants the rich settings drill-in without
 * leaving whichever panel they're on.
 *
 * Deliberately removed from the previous mobile layout:
 *   - The market-pill row (BTC ticker with prev/next chevrons) —
 *     the agent surfaces tickers contextually inside messages.
 *   - The BottomBar with parallel Trade/composer/actions — replaced
 *     by the composer-inside-Chat-panel pattern.
 *   - The Trade ticket bottom sheet (the loud mint-fill one) — trade
 *     entry on mobile flows through signal-card pile-in, the agent
 *     intent ("$BTC long 0.05"), or a desktop session.
 */
export function MobileLayout() {
  const { open: portfolioOpen, closePortfolio } = usePortfolioSheet();
  const [activeWallet, setActiveWallet] = useState(WALLETS[0]);

  // Panel order: chat sits in the middle (default landing index 2),
  // with the most-glanced-at surfaces immediately adjacent so a
  // single swipe gets the user where they want.
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
      id: "chat",
      label: "Agent",
      render: () => (
        <PanelFrame>
          <ChatPanel />
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
      <SwipePanelDeck panels={panels} defaultIndex={2} />

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
