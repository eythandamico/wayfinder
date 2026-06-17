import type { LayoutNode } from "./types";

/**
 * Workspace presets — curated layouts the user can load on first
 * landing (or any time via the Add Panel menu's "Workspace presets"
 * section). Each one targets a specific persona so the default
 * arrangement matches intent.
 *
 * Distinct from saved-layouts:
 *   - Presets are READ-ONLY system snapshots, always available.
 *   - Saved layouts are user-created snapshots, mutable.
 *
 * Surfaced as "Workspace presets" in the Add Panel menu's drill-
 * down sidebar so they sit between the per-panel picker and the
 * per-user saved-layouts list.
 */

export type WorkspacePreset = {
  id: string;
  name: string;
  /** Short pitch — one sentence on who this is for. */
  description: string;
  layout: LayoutNode;
};

/* ------------------------------------------------------------------ */
/*  Day Trader — chart-forward, fast execution, depth visible          */
/* ------------------------------------------------------------------ */

const dayTraderLayout: LayoutNode = {
  kind: "split",
  id: "root",
  direction: "horizontal",
  sizes: [42, 16, 20, 22],
  children: [
    {
      kind: "leaf",
      id: "region-chart",
      panels: [{ id: "chart-1", type: "chart" }],
      activePanelId: "chart-1",
    },
    {
      kind: "leaf",
      id: "region-trade",
      panels: [{ id: "trade-1", type: "trade" }],
      activePanelId: "trade-1",
    },
    {
      kind: "split",
      id: "split-right",
      direction: "vertical",
      sizes: [55, 45],
      children: [
        {
          kind: "leaf",
          id: "region-orderbook",
          panels: [{ id: "orderbook-1", type: "orderbook" }],
          activePanelId: "orderbook-1",
        },
        {
          kind: "leaf",
          id: "region-watchlist",
          panels: [{ id: "watchlist-1", type: "watchlist" }],
          activePanelId: "watchlist-1",
        },
      ],
    },
    {
      kind: "leaf",
      id: "region-chat",
      panels: [{ id: "chat-1", type: "chat" }],
      activePanelId: "chat-1",
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Analyst — multi-asset scanning, news + signals over execution      */
/* ------------------------------------------------------------------ */

const analystLayout: LayoutNode = {
  kind: "split",
  id: "root",
  direction: "horizontal",
  sizes: [40, 18, 20, 22],
  children: [
    {
      kind: "split",
      id: "split-left",
      direction: "vertical",
      sizes: [62, 38],
      children: [
        {
          kind: "leaf",
          id: "region-chart",
          panels: [{ id: "chart-1", type: "chart" }],
          activePanelId: "chart-1",
        },
        {
          kind: "leaf",
          id: "region-minicharts",
          panels: [{ id: "miniCharts-1", type: "miniCharts" }],
          activePanelId: "miniCharts-1",
        },
      ],
    },
    {
      kind: "leaf",
      id: "region-movers",
      panels: [{ id: "movers-1", type: "movers" }],
      activePanelId: "movers-1",
    },
    {
      kind: "leaf",
      id: "region-media",
      panels: [{ id: "media-1", type: "media" }],
      activePanelId: "media-1",
    },
    {
      kind: "leaf",
      id: "region-chat",
      panels: [{ id: "chat-1", type: "chat" }],
      activePanelId: "chat-1",
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Companion — assistant-led, chat-first, the AI does the work        */
/* ------------------------------------------------------------------ */

const companionLayout: LayoutNode = {
  kind: "split",
  id: "root",
  direction: "horizontal",
  sizes: [60, 40],
  children: [
    {
      kind: "split",
      id: "split-left",
      direction: "vertical",
      sizes: [70, 30],
      children: [
        {
          kind: "leaf",
          id: "region-chart",
          panels: [{ id: "chart-1", type: "chart" }],
          activePanelId: "chart-1",
        },
        {
          kind: "leaf",
          id: "region-portfolio",
          panels: [{ id: "portfolio-1", type: "portfolio" }],
          activePanelId: "portfolio-1",
        },
      ],
    },
    {
      kind: "leaf",
      id: "region-chat",
      panels: [{ id: "chat-1", type: "chat" }],
      activePanelId: "chat-1",
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Scout — opportunity discovery, no specific asset in mind           */
/* ------------------------------------------------------------------ */

const scoutLayout: LayoutNode = {
  kind: "split",
  id: "root",
  direction: "horizontal",
  sizes: [30, 32, 16, 22],
  children: [
    {
      kind: "leaf",
      id: "region-movers",
      panels: [{ id: "movers-1", type: "movers" }],
      activePanelId: "movers-1",
    },
    {
      kind: "split",
      id: "split-center",
      direction: "vertical",
      sizes: [62, 38],
      children: [
        {
          kind: "leaf",
          id: "region-minicharts",
          panels: [{ id: "miniCharts-1", type: "miniCharts" }],
          activePanelId: "miniCharts-1",
        },
        {
          kind: "leaf",
          id: "region-watchlist",
          panels: [{ id: "watchlist-1", type: "watchlist" }],
          activePanelId: "watchlist-1",
        },
      ],
    },
    {
      kind: "leaf",
      id: "region-media",
      panels: [{ id: "media-1", type: "media" }],
      activePanelId: "media-1",
    },
    {
      kind: "leaf",
      id: "region-chat",
      panels: [{ id: "chat-1", type: "chat" }],
      activePanelId: "chat-1",
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Predictor — Polymarket-led event trading                           */
/* ------------------------------------------------------------------ */

const predictorLayout: LayoutNode = {
  kind: "split",
  id: "root",
  direction: "horizontal",
  sizes: [34, 28, 16, 22],
  children: [
    {
      kind: "leaf",
      id: "region-polymarket",
      panels: [{ id: "polymarket-1", type: "polymarket" }],
      activePanelId: "polymarket-1",
    },
    {
      kind: "split",
      id: "split-center",
      direction: "vertical",
      sizes: [60, 40],
      children: [
        {
          kind: "leaf",
          id: "region-chart",
          panels: [{ id: "chart-1", type: "chart" }],
          activePanelId: "chart-1",
        },
        {
          kind: "leaf",
          id: "region-portfolio",
          panels: [{ id: "portfolio-1", type: "portfolio" }],
          activePanelId: "portfolio-1",
        },
      ],
    },
    {
      kind: "leaf",
      id: "region-trade",
      panels: [{ id: "trade-1", type: "trade" }],
      activePanelId: "trade-1",
    },
    {
      kind: "leaf",
      id: "region-chat",
      panels: [{ id: "chat-1", type: "chat" }],
      activePanelId: "chat-1",
    },
  ],
};

export const WORKSPACE_PRESETS: WorkspacePreset[] = [
  {
    id: "day-trader",
    name: "Day Trader",
    description: "Chart + ticket + depth. Built for fast execution.",
    layout: dayTraderLayout,
  },
  {
    id: "analyst",
    name: "Analyst",
    description: "Multi-asset scan + news. Read the tape before you trade.",
    layout: analystLayout,
  },
  {
    id: "companion",
    name: "Companion",
    description: "Chart + portfolio + agent. Let the AI drive.",
    layout: companionLayout,
  },
  {
    id: "scout",
    name: "Scout",
    description: "Movers + mini-charts + watchlist. Find the next move.",
    layout: scoutLayout,
  },
  {
    id: "predictor",
    name: "Predictor",
    description: "Polymarket + chart + portfolio. Trade the event.",
    layout: predictorLayout,
  },
];
