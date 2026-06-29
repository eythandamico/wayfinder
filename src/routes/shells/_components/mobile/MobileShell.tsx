"use client";

import { useState, type CSSProperties } from "react";
import { BottomTabs, type ShellTab } from "./BottomTabs";
import { ChatTakeoverSheet } from "./ChatTakeoverSheet";
import { FloatingComposer } from "./FloatingComposer";
import { FriendsTab } from "./FriendsTab";
import { HomeTab } from "./HomeTab";
import { MobileFriendsSheet } from "./MobileFriendsSheet";
import { MobileTopBar } from "./MobileTopBar";
import { MoreTab } from "./MoreTab";
import { PortfolioTab } from "./PortfolioTab";
import { TradeTab } from "./TradeTab";

/**
 * Mobile shell v3 — five-tab bottom nav + floating agent composer.
 *
 *   ┌────────────────────────────────┐
 *   │ MobileTopBar (slim)            │
 *   ├────────────────────────────────┤
 *   │                                │
 *   │      Active tab body           │ Home / Friends / Trade / Portfolio / More
 *   │                                │  ↑ scrolls behind the footer
 *   │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  ← progressive blur backdrop
 *   │  ✨ Ask Wayfinder…       ↑    │  ← floating composer (absolute)
 *   │  🏠  👥  📈  💼  ▦            │  ← bottom tabs (absolute, translucent)
 *   └────────────────────────────────┘
 *
 * The footer (composer + bottom tabs) is absolutely positioned and
 * translucent. Tab content scrolls beneath it; the
 * BottomBlurBackdrop layer between content and the footer creates
 * a progressive blur + gradient so content fades out into the
 * footer rather than colliding with it.
 *
 * Scroll containers inside tabs honor the `--shell-footer-pad` CSS
 * variable set on the shell root so their last items can scroll
 * up past the footer rather than hiding behind it.
 */
export function MobileShell() {
  const [tab, setTab] = useState<ShellTab>("trade");
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div
      className="relative flex h-dvh flex-col overflow-hidden bg-background"
      style={
        {
          // Scroll containers in tabs + the panels they host read this
          // variable to add bottom padding equal to the floating
          // composer + bottom nav height + safe-area. Outside the
          // mobile shell the variable is undefined → 0 padding → no
          // effect on desktop.
          "--shell-footer-pad": "calc(env(safe-area-inset-bottom) + 9rem)",
        } as CSSProperties
      }
    >
      <MobileTopBar />

      {/* Active tab body — fills all remaining vertical space because
       *  the footer (composer + bottom nav) is absolutely positioned
       *  on top of this region rather than a flex sibling. */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab === "home" && <HomeTab />}
        {tab === "friends" && <FriendsTab />}
        {tab === "trade" && <TradeTab />}
        {tab === "portfolio" && <PortfolioTab />}
        {tab === "more" && <MoreTab />}
      </main>

      {/* Progressive blur backdrop — sits between scrolling content
       *  and the footer chrome. Blurs whatever's scrolling beneath
       *  the composer and bottom nav, with a soft fade from
       *  transparent at the top to bg-background near the bottom. */}
      <BottomBlurBackdrop />

      <FloatingComposer onEngage={() => setChatOpen(true)} />

      <BottomTabs active={tab} onChange={setTab} />

      <ChatTakeoverSheet open={chatOpen} onOpenChange={setChatOpen} />

      {/* Friends sheet — driven by useFriendsSheet().open, so the
       *  top-bar Activity bell + any agent-summoned friend
       *  affordances can still pop it. Inside Friends tab the
       *  panel renders directly, so this sheet is mostly a fallback
       *  path for cross-tab triggers. */}
      <MobileFriendsSheet />
    </div>
  );
}

/**
 * Stack of backdrop-blur layers + a vertical gradient, masked so
 * blur intensity ramps from 0 at the top to maximum near the
 * bottom. Sits behind the floating composer + bottom nav (z-20)
 * so both float over a blurred view of the scrolling tab content.
 *
 * The mask-image trick: each layer has the same fixed blur level
 * but is only visible in its mask band. Stacking four bands
 * creates the impression of a continuous "progressive" blur
 * without needing custom shaders.
 */
function BottomBlurBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
      style={{
        // Footer pad covers composer + bottom nav. Add a bit more so
        // the blur fade starts well above the composer's top edge.
        height: "calc(env(safe-area-inset-bottom) + 11rem)",
      }}
    >
      <BlurBand blurPx={2} from="0%" to="20%" />
      <BlurBand blurPx={6} from="20%" to="45%" />
      <BlurBand blurPx={14} from="45%" to="70%" />
      <BlurBand blurPx={28} from="70%" to="100%" />

      {/* Color gradient over the top of the blur — fades from
       *  transparent to a near-opaque bg-background near the
       *  bottom so the footer chrome sits on a clean tonal
       *  foundation rather than a busy blur. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, hsl(var(--background) / 0.5) 55%, hsl(var(--background) / 0.9) 100%)",
        }}
      />
    </div>
  );
}

function BlurBand({
  blurPx,
  from,
  to,
}: {
  blurPx: number;
  from: string;
  to: string;
}) {
  const mask = `linear-gradient(to bottom, transparent 0%, transparent ${from}, black ${to}, black 100%)`;
  return (
    <div
      className="absolute inset-0"
      style={{
        backdropFilter: `blur(${blurPx}px)`,
        WebkitBackdropFilter: `blur(${blurPx}px)`,
        maskImage: mask,
        WebkitMaskImage: mask,
      }}
    />
  );
}
