"use client";

import { useState } from "react";
import { BottomTabs, type ShellTab } from "./BottomTabs";
import { ChatTakeoverSheet } from "./ChatTakeoverSheet";
import { FloatingComposer } from "./FloatingComposer";
import { FriendsTab } from "./FriendsTab";
import { MobileFriendsSheet } from "./MobileFriendsSheet";
import { MobileSettingsSheet } from "./MobileSettingsSheet";
import { MobileTopBar } from "./MobileTopBar";
import { MoreTab } from "./MoreTab";
import { PortfolioTab } from "./PortfolioTab";
import { TradeTab } from "./TradeTab";

/**
 * Mobile shell v3 — four-tab bottom nav + floating agent composer.
 *
 *   ┌────────────────────────────────┐
 *   │ MobileTopBar (slim)            │
 *   ├────────────────────────────────┤
 *   │                                │
 *   │      Active tab body           │ Friends / Trade / Portfolio / More
 *   │                                │
 *   ├────────────────────────────────┤
 *   │  ✨ Ask Wayfinder…       ↑    │ ← floating composer (absolute)
 *   ├────────────────────────────────┤
 *   │  👥  📈  💼  ▦                │ ← bottom tabs (4)
 *   └────────────────────────────────┘
 *
 * Agent is a tool, not a destination — the floating composer is
 * present on every tab and opens a ChatTakeoverSheet when engaged.
 *
 * Friends + Portfolio + Settings panels are mounted inside their
 * respective tabs OR as full-screen sheets triggered from the top
 * bar. MoreTab replaces the v2 hamburger drawer entirely.
 */
export function MobileShell() {
  const [tab, setTab] = useState<ShellTab>("trade");
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-background">
      <MobileTopBar />

      {/* Active tab body — single render per switch. Bottom
       *  padding leaves room for the floating composer (~52px) +
       *  the bottom tab bar (~52px + safe-area) so scrollable
       *  content inside the tabs doesn't hide behind them. */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "friends" && <FriendsTab />}
        {tab === "trade" && <TradeTab />}
        {tab === "portfolio" && <PortfolioTab />}
        {tab === "more" && (
          <MoreTab onOpenSettings={() => setMobileSettingsOpen(true)} />
        )}
      </main>

      {/* Floating agent composer — anchored to the shell's relative
       *  container, sits absolute above the bottom tabs. Tap or
       *  send opens the ChatTakeoverSheet. */}
      <FloatingComposer onEngage={() => setChatOpen(true)} />

      <BottomTabs active={tab} onChange={setTab} />

      <ChatTakeoverSheet open={chatOpen} onOpenChange={setChatOpen} />

      {/* Settings sheet — opened from MoreTab's Settings row. Local
       *  state because desktop renders Settings as a view-mode
       *  rather than a sheet, so there's no global open-state to
       *  share. */}
      <MobileSettingsSheet
        open={mobileSettingsOpen}
        onOpenChange={setMobileSettingsOpen}
      />

      {/* Friends sheet — driven by useFriendsSheet().open, so the
       *  top-bar Activity bell + any agent-summoned friend
       *  affordances can still pop it. Inside Friends tab the
       *  panel renders directly, so this sheet is mostly a fallback
       *  path for cross-tab triggers. */}
      <MobileFriendsSheet />
    </div>
  );
}
