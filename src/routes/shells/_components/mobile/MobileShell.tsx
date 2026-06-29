"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { WALLETS } from "../../_data/mocks";
import {
  useDepositModal,
  useFriendsSheet,
  usePortfolioSheet,
} from "../../_state/shells-context";
import { PortfolioMainView } from "../PortfolioSheet";
import { AgentTab } from "./AgentTab";
import { BottomSheet } from "./BottomSheet";
import { BottomTabs, type ShellTab } from "./BottomTabs";
import { ChartYoke } from "./ChartYoke";
import { MobileAgentComposer } from "./MobileAgentComposer";
import { MobileFriendsSheet } from "./MobileFriendsSheet";
import { MobileMenuSheet } from "./MobileMenuSheet";
import { MobileSettingsSheet } from "./MobileSettingsSheet";
import { MobileTopBar } from "./MobileTopBar";
import { TradeTab } from "./TradeTab";

/**
 * Mobile shell v2 — twin primaries with a persistent chart yoke.
 *
 *   ┌────────────────────────────┐
 *   │ MobileTopBar               │ chrome (menu, mode pill, etc.)
 *   ├────────────────────────────┤
 *   │ ChartYoke                  │ persistent across tab switches
 *   ├────────────────────────────┤
 *   │                            │
 *   │      Active tab body       │ AgentTab or TradeTab
 *   │                            │
 *   ├────────────────────────────┤
 *   │ Composer (agent tab only)  │ persistent composer
 *   ├────────────────────────────┤
 *   │ BottomTabs Agent | Trade   │
 *   └────────────────────────────┘
 *
 * Sheets and modals (portfolio, friends, settings, deposit,
 * activity, menu) are full-screen overlays — never stacked.
 *
 * Replaces the previous MobileLayout's swipe-deck + persistent
 * composer pattern. The new architecture treats Agent and Trade as
 * peer surfaces with a shared symbol context (the yoke).
 */
export function MobileShell() {
  const [tab, setTab] = useState<ShellTab>("agent");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  const { open: portfolioOpen, closePortfolio } = usePortfolioSheet();
  const { openFriends } = useFriendsSheet();
  const { openDeposit } = useDepositModal();

  const [activeWallet, setActiveWallet] = useState(WALLETS[0]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <MobileTopBar onOpenMenu={() => setMenuOpen(true)} />
      <ChartYoke />

      {/* Active tab body — single render per switch, no shared
       *  transition (the tabs are explicit, not swiped). */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "agent" ? <AgentTab /> : <TradeTab />}
      </main>

      {/* Persistent composer — only meaningful in the Agent tab.
       *  When the user is on the Trade tab the composer is hidden
       *  (the trade ticket inside TradeTab is the action surface);
       *  tapping the Agent tab brings it back. */}
      <div
        aria-hidden={tab !== "agent"}
        className={cn(
          "shrink-0 transition-opacity duration-150 ease-out",
          tab === "agent" ? "opacity-100" : "pointer-events-none hidden",
        )}
      >
        <MobileAgentComposer
          chatOpen={false}
          onEngage={() => setTab("agent")}
          onAfterSubmit={() => setTab("agent")}
        />
      </div>

      <BottomTabs active={tab} onChange={setTab} />

      {/* Drawer — opens via the hamburger in the top bar. Friends
       *  and Deposit go through global open-state hooks (so any
       *  trigger anywhere in the app opens the right chrome for
       *  this breakpoint). Settings is local because it has no
       *  global open-state (desktop renders it as a view-mode). */}
      <MobileMenuSheet
        open={menuOpen}
        onOpenChange={setMenuOpen}
        onFriends={() => {
          setMenuOpen(false);
          openFriends();
        }}
        onSettings={() => {
          setMenuOpen(false);
          setMobileSettingsOpen(true);
        }}
        onDeposit={() => {
          setMenuOpen(false);
          openDeposit();
        }}
      />

      <MobileFriendsSheet />

      <MobileSettingsSheet
        open={mobileSettingsOpen}
        onOpenChange={setMobileSettingsOpen}
      />

      {/* Portfolio bottom sheet — wallet avatar / $-chip in the
       *  top bar pop this drill-in. */}
      <BottomSheet
        open={portfolioOpen}
        onOpenChange={(o) => !o && closePortfolio()}
        heightFraction={0.95}
      >
        <div className="flex h-full flex-col">
          <PortfolioMainView
            activeWallet={activeWallet}
            setActiveWallet={setActiveWallet}
          />
        </div>
      </BottomSheet>
    </div>
  );
}
