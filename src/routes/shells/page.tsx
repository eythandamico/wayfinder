"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { cn } from "@/lib/utils";
import { CasinoModal } from "./_components/CasinoModal";
import { CommandBar } from "./_components/CommandBar";
import { DemoLayoutBridge } from "./_components/DemoLayoutBridge";
import { DemoOverlay } from "./_components/DemoOverlay";
import { DevTools } from "./_components/DevTools";
import { DopamineLayer } from "./_components/DopamineLayer";
import { ExplorePathsPanel } from "./_components/ExplorePathsPanel";
import { SettingsPage } from "./_components/SettingsPage";
import { MarketHeader } from "./_components/MarketHeader";
import { Marquee } from "./_components/Marquee";
import {
  PortfolioSheet,
  PORTFOLIO_SHEET_WIDTH,
} from "./_components/PortfolioSheet";
import {
  FriendsSheet,
  FRIENDS_SHEET_WIDTH,
} from "./_components/FriendsSheet";
import { LeftRail } from "./_components/LeftRail";
import { RightRail } from "./_components/RightRail";
import { AgentProofOfLife } from "./_components/AgentProofOfLife";
import { PhoneNumberModal } from "./_components/PhoneNumberModal";
import { ShellsBoot } from "./_components/ShellsBoot";
import { SignalToast } from "./_components/SignalToast";
import { MobileShell } from "./_components/mobile/MobileShell";
import { DEFAULT_LAYOUT } from "./_layout/default";
import { DragGhost } from "./_layout/DragGhost";
import { DragProvider } from "./_layout/DragContext";
import { DropPreview } from "./_layout/DropPreview";
import { LayoutProvider } from "./_layout/LayoutContext";
import { LayoutRenderer } from "./_layout/LayoutRenderer";
import { loadLayout, saveLayout } from "./_layout/persist";
import { layoutReducer } from "./_layout/reducer";
import {
  newSavedLayoutEntry,
  readSavedLayouts,
  writeSavedLayouts,
  type SavedLayoutEntry,
} from "./_layout/saved-layouts";
import type { LayoutAction, LayoutNode } from "./_layout/types";
import {
  ShellsProvider,
  useFriendsSheet,
  useMarquee,
  usePortfolioSheet,
  useViewMode,
} from "./_state/shells-context";
import { ActivityProvider } from "./_state/activity-context";
import { ChatSessionProvider } from "./_state/chat-context";
import { PlanProvider } from "./_state/plan-context";
import { SignalsProvider } from "./_state/signals-context";
import { PricingModal } from "./_components/PricingModal";
import { DepositModal } from "./_components/DepositModal";
import { AddFriendModal } from "./_components/AddFriendModal";
import { AuthorSheet } from "./_components/AuthorSheet";
import { ShortcutHelp } from "./_components/ShortcutHelp";
import { useShellsKeyboard } from "./_hooks/useShellsKeyboard";

const BOOT_FADE_OUT_MS = 500;

/* ------------------------------------------------------------------ */
/*  Media query — render desktop or mobile shell                       */
/* ------------------------------------------------------------------ */

function subscribe(cb: () => void) {
  const mql = window.matchMedia("(min-width: 768px)");
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

function getSnapshot() {
  return window.matchMedia("(min-width: 768px)").matches;
}

function getServerSnapshot() {
  return true;
}

function useIsDesktop() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function ShellsPage() {
  const isDesktop = useIsDesktop();
  // Initial state is the same on server and client so hydration
  // doesn't mismatch. We sync from sessionStorage in a
  // useLayoutEffect below — that runs after hydration but before
  // paint, so returning visitors skip straight to the app without
  // a visible flash of the boot screen.
  const [booted, setBooted] = useState(false);
  const [bootMounted, setBootMounted] = useState(true);

  useLayoutEffect(() => {
    try {
      if (window.sessionStorage.getItem("wf-shells-v3-booted") === "1") {
        setBooted(true);
         
        setBootMounted(false);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // ShellsBoot drives its own timeline and calls onComplete when every stage
  // has finished. Then we fade out the boot screen and reveal the app.
  useEffect(() => {
    if (!booted) return;
    try {
      window.sessionStorage.setItem("wf-shells-v3-booted", "1");
    } catch {
      /* ignore */
    }
    if (!bootMounted) return;
    const id = window.setTimeout(
      () => setBootMounted(false),
      BOOT_FADE_OUT_MS,
    );
    return () => window.clearTimeout(id);
  }, [booted, bootMounted]);

  return (
    <ShellsProvider>
      <SignalsProvider>
        <ActivityProvider>
        <PlanProvider>
        <ChatSessionProvider>
        <h1 className="sr-only">Wayfinder — your trading desk, intelligent.</h1>

        {/* AuroraAmbient temporarily disabled — the body bg
            (#101012) is the page backdrop for now. Re-mount the
            component here to bring the shader back. */}

        <CommandBar />

        {bootMounted && (
          <ShellsBoot dismissed={booted} onComplete={() => setBooted(true)} />
        )}

        {/* Opacity-only fade — no transform here. The shell's <main> is
           position: fixed, and a transform on this wrapper would re-anchor
           the fixed child to the (zero-height) wrapper instead of the
           viewport, hiding the app entirely. */}
        <div
          className={cn(
            "contents transition-opacity duration-700 ease-out",
            booted
              ? "opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >
          {isDesktop ? <DesktopShell /> : <MobileShell />}
        </div>

        {/* Signal cascade — bottom-right toast stack mounted at root
           so it floats above every panel. Signals also stream into
           Activity (via fromSignals in activity-context) for the
           persistent feed. AuthorSheet keeps its mount as it's a
           generic profile drill-in, used by signals + friend chats. */}
        <SignalToast />
        <AgentProofOfLife />
        <PhoneNumberModal />
        <PricingModal />
        <DepositModal />
        <AddFriendModal />
        <AuthorSheet />
        <KeyboardHost />
        <ShortcutHelp />

        <DopamineLayer />
        <DemoOverlay />
        <CasinoModal />
        <DevTools />
        </ChatSessionProvider>
        </PlanProvider>
        </ActivityProvider>
      </SignalsProvider>
    </ShellsProvider>
  );
}

/** Mounts the page-root keyboard layer inside ShellsProvider so the
 *  hook can access the command-bar toggle. */
function KeyboardHost() {
  useShellsKeyboard();
  return null;
}

/* ------------------------------------------------------------------ */
/*  DesktopShell — drives the layout tree                              */
/*                                                                     */
/*  The whole grid is described by a single LayoutNode tree            */
/*  (see _layout/types.ts). Splits become flex rows/cols with          */
/*  ResizeHandles between children; leaves become panels via the       */
/*  panel registry. Resize / move / add events bubble back here        */
/*  through dispatch and update the tree's sizes / shape.              */
/* ------------------------------------------------------------------ */

function DesktopShell() {
  const [layout, setLayout] = useState<LayoutNode>(DEFAULT_LAYOUT);

  const dispatch = useCallback((action: LayoutAction) => {
    setLayout((prev) => layoutReducer(prev, action));
  }, []);

  // Restore saved tree before paint to avoid layout flash.
  useLayoutEffect(() => {
    const saved = loadLayout();
    if (!saved) return;
    setLayout(saved);
  }, []);

  // Persist tree changes (debounced via effect coalescing).
  useEffect(() => {
    saveLayout(layout);
  }, [layout]);

  // Named saved layouts — user-created snapshots loaded from
  // localStorage on mount.
  const [savedLayouts, setSavedLayouts] = useState<SavedLayoutEntry[]>([]);
  useEffect(() => {
    setSavedLayouts(readSavedLayouts());
  }, []);
  const layoutRef = useRef(layout);
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  const saveCurrentLayout = useCallback((name: string) => {
    const entry = newSavedLayoutEntry(name, layoutRef.current);
    setSavedLayouts((prev) => {
      const next = [entry, ...prev];
      writeSavedLayouts(next);
      return next;
    });
  }, []);

  const loadSavedLayout = useCallback((id: string) => {
    setSavedLayouts((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) {
        setLayout(entry.layout);
      }
      return prev;
    });
  }, []);

  const deleteSavedLayout = useCallback((id: string) => {
    setSavedLayouts((prev) => {
      const next = prev.filter((e) => e.id !== id);
      writeSavedLayouts(next);
      return next;
    });
  }, []);

  const { viewMode } = useViewMode();
  const { enabled: marqueeEnabled } = useMarquee();
  const { open: portfolioOpen } = usePortfolioSheet();
  const { open: friendsOpen } = useFriendsSheet();

  return (
    <LayoutProvider
      dispatch={dispatch}
      savedLayouts={savedLayouts}
      saveCurrentLayout={saveCurrentLayout}
      loadSavedLayout={loadSavedLayout}
      deleteSavedLayout={deleteSavedLayout}
    >
      <DragProvider>
        <main
          className="fixed inset-0 flex flex-col overflow-hidden bg-background py-2 text-foreground"
        >
          {marqueeEnabled && (
            <div className="-mt-2 mb-2">
              <Marquee />
            </div>
          )}
          <MarketHeader />
          {/* Inner row — left rail, panel grid, right rail. Rails sit
              flush against the viewport edges (no horizontal padding
              on main); the panel-grid wrapper restores px-2 of
              breathing room around the layout tree. */}
          <div className="mt-2 flex min-h-0 min-w-0 flex-1">
            <LeftRail />
            <div
              data-panel-grid-top
              className="flex min-h-0 min-w-0 flex-1 px-2 transition-[margin] duration-300 ease-[var(--ease-drawer)]"
              style={{
                // Each sheet's footprint from its viewport edge is
                // FRIENDS_SHEET_WIDTH / PORTFOLIO_SHEET_WIDTH including
                // the SHEET_GUTTER inset. Pushing the panel-grid
                // wrapper by the full sheet width — combined with the
                // wrapper's own px-2 padding — yields the same 8px
                // seam between sheet and panels that the rails get on
                // the closed side. Both sheets can be open at once;
                // left and right margins animate independently so the
                // panels squeeze from whichever side is active.
                marginLeft: friendsOpen ? FRIENDS_SHEET_WIDTH : 0,
                marginRight: portfolioOpen ? PORTFOLIO_SHEET_WIDTH : 0,
              }}
            >
              {viewMode === "trading" ? (
                <LayoutRenderer node={layout} dispatch={dispatch} />
              ) : viewMode === "explore" ? (
                <ExplorePathsPanel />
              ) : viewMode === "settings" ? (
                <SettingsPage />
              ) : viewMode === "jobs" ? (
                <ComingSoonView title="Jobs" />
              ) : (
                <ComingSoonView title="Loops" />
              )}
            </div>
            <RightRail />
          </div>
          {/* Side sheets live INSIDE main so they share main's
              stacking context with MarketHeader. position: fixed on main
              creates a root-level stacking context — anything rendered as
              a sibling of main (z-30) ends up above main's contents
              (including the z-40 nav dropdowns). Keeping the sheets here
              means dropdowns naturally paint above them. */}
          <FriendsSheet />
          <PortfolioSheet />
        </main>
        <DropPreview />
        <DragGhost />
        <DemoLayoutBridge />
      </DragProvider>
    </LayoutProvider>
  );
}

/** Coming-soon placeholder for view modes whose product surface
 *  doesn't exist yet (Loops, Jobs). Renders inside the panel grid
 *  slot so the rails + top bar remain available; switching back to
 *  Trade restores the layout tree. */
function ComingSoonView({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg bg-surface-1 ring-1 ring-inset ring-white/[0.06]">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-caption uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </span>
        <span className="text-display font-semibold text-foreground">
          Coming soon
        </span>
      </div>
    </div>
  );
}
