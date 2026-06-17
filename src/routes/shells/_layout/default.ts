import type { LayoutNode } from "./types";

/**
 * Default layout tree. Chart on the left, trade/orderbook in the
 * middle, companion / chat on the right. The portfolio preview is
 * intentionally NOT in the default — the connected wallet has its own
 * persistent side sheet (opened from the jazzicon in the nav), so a
 * preview panel would be redundant most of the time. Users who want
 * a continuous glance at their balance can still add it back via the
 * top-nav "Add panel" menu.
 *
 * Node ids are stable strings so future actions (close, move) have a
 * deterministic target across reloads.
 */
export const DEFAULT_LAYOUT: LayoutNode = {
  kind: "split",
  id: "root",
  direction: "horizontal",
  sizes: [44, 18, 38],
  children: [
    {
      kind: "leaf",
      id: "region-chart",
      panels: [{ id: "chart-1", type: "chart" }],
      activePanelId: "chart-1",
    },
    {
      kind: "split",
      id: "split-mid",
      direction: "vertical",
      sizes: [45, 55],
      children: [
        {
          kind: "leaf",
          id: "region-trade",
          panels: [{ id: "trade-1", type: "trade" }],
          activePanelId: "trade-1",
        },
        {
          kind: "leaf",
          id: "region-orderbook",
          panels: [{ id: "orderbook-1", type: "orderbook" }],
          activePanelId: "orderbook-1",
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
