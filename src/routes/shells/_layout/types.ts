/**
 * Layout tree primitives.
 *
 * The whole shell is described as a single LayoutNode. A node is either a
 * Split (a row or column of children with proportional sizes) or a Leaf
 * (a region that holds one or more panels rendered as tabs).
 *
 * This is the foundation that future phases sit on top of:
 *   - close — remove a panel from its leaf; if the leaf empties, collapse
 *     it and let the sibling absorb the space.
 *   - move — drag a panel into another leaf's drop zone; tree rewrites
 *     itself to a new valid shape.
 *   - add  — insert a fresh panel via the top-nav selector.
 *
 * Every node has a stable id. Ids are how actions target a specific node
 * without us threading parent refs through the renderer.
 */

export type PanelType =
  | "chart"
  | "portfolio"
  | "chat"
  | "trade"
  | "orderbook"
  | "customChart"
  | "companion"
  | "friends"
  | "movers"
  | "watchlist"
  | "miniCharts"
  | "polymarket"
  | "activity"
  | "golf"
  | "video"
  | "media"
  // Extras — lifestyle utilities that sit alongside the trading desk.
  | "calendar"
  | "todo"
  | "marketplace"
  | "concerts"
  | "worldClocks"
  | "weather";

/** A specific panel placed in the layout. id is unique per instance so we
 *  can support multiple charts (BTC + SOL) in the same layout later.
 *  `config` is an optional opaque payload — used by configurable panels
 *  (customChart in particular) to carry per-instance state through
 *  persistence + drag/drop. The shape is owned by the panel's
 *  Component; the layout system treats it as a black box. */
export type PanelInstance = {
  id: string;
  type: PanelType;
  config?: Record<string, unknown>;
};

export type LeafNode = {
  kind: "leaf";
  id: string;
  panels: PanelInstance[];
  /** id of the panel that's currently surfaced when the leaf renders as a
   *  tab strip. For single-panel leaves this is just the only panel's id. */
  activePanelId: string;
};

export type SplitNode = {
  kind: "split";
  id: string;
  direction: "horizontal" | "vertical";
  children: LayoutNode[];
  /** Percentages summing to ~100, one per child. */
  sizes: number[];
};

export type LayoutNode = LeafNode | SplitNode;

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

export type DropEdge = "top" | "right" | "bottom" | "left";

export type LayoutAction =
  | {
      type: "resize";
      splitId: string;
      handleIdx: number;
      deltaPct: number;
    }
  | {
      type: "closePanel";
      regionId: string;
      panelId: string;
    }
  | {
      type: "addPanel";
      panel: PanelInstance;
    }
  | {
      /** Same as addPanel, except no-op if a panel of `panel.type`
       *  already exists anywhere in the layout. Used by surfaces
       *  that summon a specific panel kind (e.g. PredictionTicket's
       *  "Open Polymarket" button) where stacking duplicates would
       *  surprise the user. */
      type: "addPanelIfMissing";
      panel: PanelInstance;
    }
  | {
      type: "movePanel";
      sourceRegionId: string;
      panelId: string;
      targetRegionId: string;
      edge: DropEdge;
    }
  | {
      /** Insert a panel as a new sibling at the given gap of a split.
       *  Used when the user drops a dragged panel onto the seam between
       *  two panels rather than onto an edge of a single panel. The
       *  reducer detaches the panel from its source leaf, then splices
       *  it as the (insertIndex)th child of the target split at
       *  ADD_NEW_PCT, rescaling siblings proportionally. */
      type: "insertAtGap";
      sourceRegionId: string;
      panelId: string;
      targetSplitId: string;
      insertIndex: number;
    }
  | {
      type: "resetLayout";
    }
  | {
      /** Replace the entire layout tree wholesale — used by the
       *  saved-layouts loader to swap in a previously-saved tree. */
      type: "replaceLayout";
      root: LayoutNode;
    };

/* ------------------------------------------------------------------ */
/*  Persistence envelope                                               */
/* ------------------------------------------------------------------ */

export type SavedLayout = {
  version: number;
  root: LayoutNode;
};

/** Bumped when the LayoutNode schema changes in a way that would break
 *  older saved layouts. Older versions are dropped silently on load.
 *
 *  v2 — default tree no longer includes the portfolio preview; the
 *  side sheet replaces it for most use cases. */
export const LAYOUT_SCHEMA_VERSION = 5;
