"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PANEL_REGISTRY } from "../../_layout/registry";
import type { PanelInstance, PanelType } from "../../_layout/types";
import { WALLETS } from "../../_data/mocks";
import { usePortfolioSheet } from "../../_state/shells-context";
import { BottomSheet } from "./BottomSheet";
import { ChatTakeoverSheet } from "./ChatTakeoverSheet";
import { MobileAddPanelPicker } from "./MobileAddPanelPicker";
import { MobileAgentComposer } from "./MobileAgentComposer";
import { MobilePanelDeckSheet } from "./MobilePanelDeckSheet";
import { MobileTopBar } from "./MobileTopBar";
import { PortfolioMainView } from "../PortfolioSheet";
import { SwipePanelDeck, type SwipePanel } from "./SwipePanelDeck";

/** localStorage key for the user's curated mobile swipe deck. The
 *  shape is a list of {id, type} instance descriptors. Versioned so
 *  the schema can break later. */
const PANELS_KEY = "wf-mobile-panels-v1";

/** Default deck — chosen to mirror the most-glanced-at desktop
 *  panels and to give Activity the center slot so it's the user's
 *  landing surface. The user can curate from here via the panel
 *  manager sheet. */
const DEFAULT_PANELS: PanelInstance[] = [
  { id: "p-portfolio", type: "portfolio" },
  { id: "p-activity", type: "activity" },
  { id: "p-watchlist", type: "watchlist" },
  { id: "p-chart", type: "chart" },
  { id: "p-orderbook", type: "orderbook" },
];

/** Default landing index = Activity (signals + agent updates is what
 *  the user typically wants on app open). */
const DEFAULT_LANDING_INDEX = 1;

function readPanels(): PanelInstance[] {
  if (typeof window === "undefined") return DEFAULT_PANELS;
  try {
    const raw = window.localStorage.getItem(PANELS_KEY);
    if (!raw) return DEFAULT_PANELS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PANELS;
    // Defensive filter: drop entries whose type the registry no
    // longer knows about (e.g. the user's stored panel was renamed
    // or removed). Avoids the deck silently rendering blank slots.
    return parsed.filter(
      (p): p is PanelInstance =>
        p &&
        typeof p.id === "string" &&
        typeof p.type === "string" &&
        Boolean(PANEL_REGISTRY[p.type as PanelType]),
    );
  } catch {
    return DEFAULT_PANELS;
  }
}

function writePanels(panels: PanelInstance[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PANELS_KEY, JSON.stringify(panels));
  } catch {
    /* quota / serialization — fall through silently */
  }
}

/**
 * Mobile shell — agent-first.
 *
 * Layout:
 *   ┌──────────────────────────────┐
 *   │ thin top bar                 │
 *   │ Title  •●•••  [grid icon]    │ ← indicator strip + panel manager
 *   │                              │
 *   │ swipeable panel deck         │ ← user-curated panel list,
 *   │                              │   persisted to localStorage
 *   │                              │
 *   ├──────────────────────────────┤
 *   │ persistent composer          │ ← tap or send to morph into the
 *   └──────────────────────────────┘   full chat takeover sheet
 *
 * The grid icon at the right of the indicator strip opens a
 * full-page sheet that shows the current deck as PanelThumbnail
 * tiles, plus a dashed "+" tile that opens a second sheet (the
 * panel registry catalog) for adding new panels to the deck.
 */
export function MobileLayout() {
  const { open: portfolioOpen, closePortfolio } = usePortfolioSheet();
  const [activeWallet, setActiveWallet] = useState(WALLETS[0]);
  const [chatOpen, setChatOpen] = useState(false);

  // User-curated deck. Hydrated from localStorage on first render
  // (pure SPA — no SSR mismatch risk). Writes back every change.
  const [panelInstances, setPanelInstances] = useState<PanelInstance[]>(() =>
    readPanels(),
  );
  useEffect(() => {
    writePanels(panelInstances);
  }, [panelInstances]);

  // Panel manager sheet stack:
  //   deckSheetOpen   = "Your panels" — current deck as tiles
  //   pickerOpen      = "Add panel"   — registry catalog
  // Stacking: picker mounts on top of deckSheet (deckSheet stays
  // mounted underneath). Picking a panel closes both.
  const [deckSheetOpen, setDeckSheetOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const addPanel = (type: PanelType) => {
    setPanelInstances((prev) => [
      ...prev,
      { id: `p-${type}-${prev.length + 1}`, type },
    ]);
  };

  // Map each persisted PanelInstance to a SwipePanel by looking the
  // Component up in the registry. Registry types whose Component
  // requires layout-tree props get a minimal panel arg so they
  // render correctly outside the desktop LayoutRenderer.
  const swipePanels: SwipePanel[] = useMemo(() => {
    return panelInstances
      .map((instance): SwipePanel | null => {
        const descriptor = PANEL_REGISTRY[instance.type];
        if (!descriptor) return null;
        const { label, Component } = descriptor;
        return {
          id: instance.id,
          label,
          render: () => (
            <PanelFrame>
              <Component panel={instance} />
            </PanelFrame>
          ),
        };
      })
      .filter((p): p is SwipePanel => p !== null);
  }, [panelInstances]);

  const presentTypes = useMemo(
    () => new Set(panelInstances.map((p) => p.type)),
    [panelInstances],
  );

  // If the deck has fewer panels than DEFAULT_LANDING_INDEX (e.g.
  // user nuked their deck down to one panel), land on whatever
  // panel index 0 maps to instead.
  const landingIndex = Math.min(
    DEFAULT_LANDING_INDEX,
    Math.max(0, swipePanels.length - 1),
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <MobileTopBar />
      <SwipePanelDeck
        panels={swipePanels}
        defaultIndex={landingIndex}
        onManagePanels={() => setDeckSheetOpen(true)}
      />

      {/* Persistent reduced composer — tapping (focus or click) or
       *  sending morphs into the full ChatPanel composer inside
       *  ChatTakeoverSheet as the sheet rises from the bottom. */}
      <div
        aria-hidden={chatOpen}
        inert={chatOpen}
        className={cn(
          "relative z-30 transition-opacity duration-200 ease-out",
          chatOpen && "pointer-events-none opacity-0",
        )}
      >
        <MobileAgentComposer
          chatOpen={chatOpen}
          onEngage={() => setChatOpen(true)}
          onAfterSubmit={() => setChatOpen(true)}
        />
      </div>

      <ChatTakeoverSheet open={chatOpen} onOpenChange={setChatOpen} />

      {/* Panel manager — current deck + Add tile. We compute the
       *  active index naively as the landing index; in practice the
       *  sheet is informational + add-only, so the active marker is
       *  just a visual hint. */}
      <MobilePanelDeckSheet
        open={deckSheetOpen}
        onOpenChange={setDeckSheetOpen}
        panels={panelInstances}
        activeIndex={landingIndex}
        onJump={() => setDeckSheetOpen(false)}
        onAddTile={() => setPickerOpen(true)}
      />

      <MobileAddPanelPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        presentTypes={presentTypes}
        onPick={(type) => {
          addPanel(type);
          setPickerOpen(false);
          setDeckSheetOpen(false);
        }}
      />

      {/* Portfolio bottom sheet — wallet avatar in the top bar pops
       *  this drill-in regardless of which panel is active. */}
      <BottomSheet
        open={portfolioOpen}
        onOpenChange={(o) => !o && closePortfolio()}
        heightFraction={0.95}
      >
        <div className="flex h-full flex-col">
          <PortfolioMainView
            onOpenSettings={() => {
              /* settings drill-in is a follow-up surface */
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
