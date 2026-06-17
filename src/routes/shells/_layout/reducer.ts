import { DEFAULT_LAYOUT } from "./default";
import type {
  DropEdge,
  LayoutAction,
  LayoutNode,
  LeafNode,
  PanelInstance,
  SplitNode,
} from "./types";

/**
 * Minimum child size, expressed as a percentage of its parent split.
 * Anything below this becomes unreadable; the dragger clamps to it.
 *
 * Phase 1 uses a flat global minimum. When we add panel-specific minimums
 * (e.g. order book needs more vertical room than a chip strip), this
 * becomes a per-leaf concern looked up from the panel registry.
 */
const MIN_CHILD_PCT = 12;

export function layoutReducer(
  state: LayoutNode,
  action: LayoutAction,
): LayoutNode {
  switch (action.type) {
    case "resize":
      return mapNode(state, action.splitId, (node) => {
        if (node.kind !== "split") return node;
        return {
          ...node,
          sizes: applyDelta(node.sizes, action.handleIdx, action.deltaPct),
        };
      });

    case "closePanel": {
      // Remove the panel; if its leaf empties, prune walks the tree and
      // collapses empty leaves + single-child splits so the layout stays
      // valid without dead regions.
      const next = mapNode(state, action.regionId, (node) => {
        if (node.kind !== "leaf") return node;
        const panels = node.panels.filter((p) => p.id !== action.panelId);
        const activePanelId =
          node.activePanelId === action.panelId
            ? (panels[0]?.id ?? "")
            : node.activePanelId;
        return { ...node, panels, activePanelId };
      });
      return prune(next);
    }

    case "addPanel":
      return addPanelToRoot(state, action.panel);

    case "addPanelIfMissing":
      if (hasPanelOfType(state, action.panel.type)) return state;
      return addPanelToRoot(state, action.panel);

    case "movePanel":
      return movePanel(state, action);

    case "insertAtGap":
      return insertAtGap(state, action);

    case "resetLayout":
      return DEFAULT_LAYOUT;

    case "replaceLayout":
      // Trust the caller to have validated the tree (loader hits
      // isWellFormed before dispatching). No transformation; the
      // whole root just gets swapped in.
      return action.root;
  }
}

/**
 * Detach a panel from its source leaf and re-attach it at the requested
 * edge of the target leaf. The flow:
 *
 *   1. Remove the panel from its source leaf.
 *   2. Wrap the target leaf in a new split with the dragged panel on the
 *      requested side. This always produces a valid tree, even if it's
 *      momentarily deeper than necessary.
 *   3. Prune empty leaves and collapse single-child splits.
 *   4. Flatten any same-direction nested splits so the tree stays as
 *      shallow as it can be (no [hsplit [hsplit a b] c]).
 *
 * Self-drops (source === target) are no-ops.
 */
function movePanel(
  state: LayoutNode,
  action: { sourceRegionId: string; panelId: string; targetRegionId: string; edge: DropEdge },
): LayoutNode {
  if (action.sourceRegionId === action.targetRegionId) return state;

  // 1. Detach
  let detached: PanelInstance | null = null;
  const withoutPanel = mapNode(state, action.sourceRegionId, (node) => {
    if (node.kind !== "leaf") return node;
    const idx = node.panels.findIndex((p) => p.id === action.panelId);
    if (idx === -1) return node;
    detached = node.panels[idx];
    const panels = node.panels.filter((_, i) => i !== idx);
    const activePanelId =
      node.activePanelId === action.panelId
        ? (panels[0]?.id ?? "")
        : node.activePanelId;
    return { ...node, panels, activePanelId };
  });

  if (!detached) return state;
  // capture into a const so TS understands it's non-null inside the closure
  const movedPanel: PanelInstance = detached;

  // 2. Drop at target
  const dropped = mapNode(withoutPanel, action.targetRegionId, (node) => {
    return wrapWithDrop(node, action.edge, movedPanel);
  });

  // 3. Prune source-side empty leaves + single-child splits
  const pruned = prune(dropped) as LayoutNode;

  // 4. Flatten any redundant same-direction nesting
  return flattenSplits(pruned);
}

/**
 * Insert a dragged panel as a new sibling at a specific gap of a split.
 *
 *   1. Detach the panel from its source leaf.
 *   2. Find the target split, splice the new leaf at `insertIndex`,
 *      and rescale siblings so the new leaf gets ADD_NEW_PCT and the
 *      existing children keep their relative proportions of the
 *      remainder.
 *   3. Prune source-side empties + flatten redundant nesting.
 *
 * If the target split disappears mid-flight (e.g. source detach collapsed
 * it via single-child hoist), we fall back to the root-append behavior.
 */
function insertAtGap(
  state: LayoutNode,
  action: {
    sourceRegionId: string;
    panelId: string;
    targetSplitId: string;
    insertIndex: number;
  },
): LayoutNode {
  let detached: PanelInstance | null = null;
  const withoutPanel = mapNode(state, action.sourceRegionId, (node) => {
    if (node.kind !== "leaf") return node;
    const idx = node.panels.findIndex((p) => p.id === action.panelId);
    if (idx === -1) return node;
    detached = node.panels[idx];
    const panels = node.panels.filter((_, i) => i !== idx);
    const activePanelId =
      node.activePanelId === action.panelId
        ? (panels[0]?.id ?? "")
        : node.activePanelId;
    return { ...node, panels, activePanelId };
  });

  if (!detached) return state;
  const movedPanel: PanelInstance = detached;
  const newLeaf: LeafNode = {
    kind: "leaf",
    id: `region-${movedPanel.id}`,
    panels: [movedPanel],
    activePanelId: movedPanel.id,
  };

  // Insertion happens before pruning so the target-split id stays
  // resolvable even when the source detach would have otherwise
  // collapsed a single-child parent.
  let inserted = false;
  const withInserted = mapNode(withoutPanel, action.targetSplitId, (node) => {
    if (node.kind !== "split") return node;
    const idx = Math.max(0, Math.min(action.insertIndex, node.children.length));
    const factor = (100 - ADD_NEW_PCT) / 100;
    const nextChildren = [...node.children];
    const nextSizes = node.sizes.map((s) => s * factor);
    nextChildren.splice(idx, 0, newLeaf);
    nextSizes.splice(idx, 0, ADD_NEW_PCT);
    inserted = true;
    return { ...node, children: nextChildren, sizes: nextSizes };
  });

  // Target split vanished — fall back to root-append so the panel
  // doesn't get silently lost.
  if (!inserted) {
    return addPanelToRoot(prune(withoutPanel) as LayoutNode, movedPanel);
  }

  return flattenSplits(prune(withInserted) as LayoutNode);
}

/**
 * Wraps `target` in a new split with `panel` on the requested edge. The
 * new split is sized 50/50. If the target is the root of a subtree, the
 * caller (mapNode) replaces it in place — that's the whole game.
 */
function wrapWithDrop(
  target: LayoutNode,
  edge: DropEdge,
  panel: PanelInstance,
): LayoutNode {
  const newLeaf: LeafNode = {
    kind: "leaf",
    id: `region-${panel.id}`,
    panels: [panel],
    activePanelId: panel.id,
  };
  const direction: "horizontal" | "vertical" =
    edge === "left" || edge === "right" ? "horizontal" : "vertical";
  const droppedFirst = edge === "left" || edge === "top";
  return {
    kind: "split",
    id: freshId("split"),
    direction,
    children: droppedFirst ? [newLeaf, target] : [target, newLeaf],
    sizes: [50, 50],
  };
}

/**
 * If a split has a child that is itself a split with the same direction,
 * inline the grandchildren. Sizes are merged proportionally so total
 * area stays constant. Runs recursively until the tree is fully flat.
 */
function flattenSplits(node: LayoutNode): LayoutNode {
  if (node.kind === "leaf") return node;

  const flatChildren = node.children.map(flattenSplits);
  const nextChildren: LayoutNode[] = [];
  const nextSizes: number[] = [];

  flatChildren.forEach((child, i) => {
    if (child.kind === "split" && child.direction === node.direction) {
      const slot = node.sizes[i];
      const innerTotal = child.sizes.reduce((a, b) => a + b, 0) || 1;
      child.children.forEach((grand, j) => {
        nextChildren.push(grand);
        nextSizes.push((child.sizes[j] / innerTotal) * slot);
      });
    } else {
      nextChildren.push(child);
      nextSizes.push(node.sizes[i]);
    }
  });

  // Re-normalize for safety in case rounding drifted.
  const total = nextSizes.reduce((a, b) => a + b, 0) || 1;
  return {
    ...node,
    children: nextChildren,
    sizes: nextSizes.map((s) => (s / total) * 100),
  };
}

/** Short, sortable-ish id for newly created splits. Doesn't need to be
 *  globally unique, just unique within the tree. Random suffix avoids
 *  collisions if the user drags many panels in quick succession. */
function freshId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${rand}`;
}

/**
 * Walks the tree bottom-up and:
 *   - drops empty leaves (panels.length === 0)
 *   - re-normalises sibling sizes to sum to 100
 *   - collapses splits that have a single remaining child by hoisting
 *     that child up into the split's slot
 *
 * Returns the cleaned root. If everything got pruned (no panels left
 * anywhere) we return a single empty leaf so the renderer can show a
 * friendly "add a panel" empty state instead of crashing.
 */
function prune(node: LayoutNode): LayoutNode | typeof EMPTY_ROOT {
  if (node.kind === "leaf") {
    if (node.panels.length === 0) return EMPTY_ROOT;
    return node;
  }

  // Prune children first (post-order).
  const pruned = node.children
    .map((child, i) => ({ child: prune(child), size: node.sizes[i] }))
    .filter((c) => c.child !== EMPTY_ROOT) as {
    child: LayoutNode;
    size: number;
  }[];

  if (pruned.length === 0) return EMPTY_ROOT;
  if (pruned.length === 1) return pruned[0].child;

  // Re-normalize sizes so they sum to 100 after any removals.
  const total = pruned.reduce((acc, c) => acc + c.size, 0) || 1;
  return {
    ...node,
    children: pruned.map((c) => c.child),
    sizes: pruned.map((c) => (c.size / total) * 100),
  };
}

/** Sentinel returned by prune when a subtree is fully empty. We never
 *  surface this — the public reducer wraps it back into a single empty
 *  leaf if it would otherwise become the root. */
const EMPTY_ROOT: LeafNode = {
  kind: "leaf",
  id: "region-empty",
  panels: [],
  activePanelId: "",
};

const ADD_NEW_PCT = 22;

/** Tree walk — returns true if any leaf in the layout contains a
 *  panel of the given type. Used by `addPanelIfMissing` to make the
 *  add idempotent for "summon" surfaces. */
function hasPanelOfType(node: LayoutNode, type: string): boolean {
  if (node.kind === "leaf") return node.panels.some((p) => p.type === type);
  return node.children.some((c) => hasPanelOfType(c, type));
}

function addPanelToRoot(root: LayoutNode, panel: PanelInstance): LayoutNode {
  const leaf: LeafNode = {
    kind: "leaf",
    id: `region-${panel.id}`,
    panels: [panel],
    activePanelId: panel.id,
  };

  // Edge case: empty root → just return the new leaf alone.
  if (root.kind === "leaf" && root.panels.length === 0) return leaf;

  // If root is already a horizontal split, append the new leaf as its
  // last child and rebalance sizes.
  if (root.kind === "split" && root.direction === "horizontal") {
    const factor = (100 - ADD_NEW_PCT) / 100;
    return {
      ...root,
      children: [...root.children, leaf],
      sizes: [...root.sizes.map((s) => s * factor), ADD_NEW_PCT],
    };
  }

  // Otherwise wrap the whole current root in a new horizontal split.
  return {
    kind: "split",
    id: "root",
    direction: "horizontal",
    children: [root, leaf],
    sizes: [100 - ADD_NEW_PCT, ADD_NEW_PCT],
  };
}

/* ------------------------------------------------------------------ */
/*  Internals                                                          */
/* ------------------------------------------------------------------ */

function mapNode(
  node: LayoutNode,
  targetId: string,
  transform: (n: LayoutNode) => LayoutNode,
): LayoutNode {
  if (node.id === targetId) return transform(node);
  if (node.kind === "split") {
    let changed = false;
    const nextChildren = node.children.map((child) => {
      const next = mapNode(child, targetId, transform);
      if (next !== child) changed = true;
      return next;
    });
    return changed ? { ...node, children: nextChildren } : node;
  }
  return node;
}

/**
 * Adjusts a sizes array given a delta % at the boundary between sizes[a]
 * and sizes[a+1], clamping both neighbours so neither falls below
 * MIN_CHILD_PCT. Lifted from the previous flat layout — the math is the
 * same regardless of how nested the split is.
 */
function applyDelta(
  sizes: number[],
  handleIdx: number,
  deltaPct: number,
): number[] {
  const a = handleIdx;
  const b = handleIdx + 1;
  let nextA = sizes[a] + deltaPct;
  let nextB = sizes[b] - deltaPct;

  if (nextA < MIN_CHILD_PCT) {
    nextB -= MIN_CHILD_PCT - nextA;
    nextA = MIN_CHILD_PCT;
  }
  if (nextB < MIN_CHILD_PCT) {
    nextA -= MIN_CHILD_PCT - nextB;
    nextB = MIN_CHILD_PCT;
  }

  const next = [...sizes];
  next[a] = nextA;
  next[b] = nextB;
  return next;
}

/**
 * Validates a deserialized layout. We're paranoid because a corrupt
 * localStorage entry would otherwise crash the whole shell. Returns the
 * node if it looks well-formed, or null to trigger fallback to default.
 */
export function isWellFormed(value: unknown): value is LayoutNode {
  if (!value || typeof value !== "object") return false;
  const n = value as { kind?: unknown };
  if (n.kind === "leaf") return isWellFormedLeaf(value);
  if (n.kind === "split") return isWellFormedSplit(value);
  return false;
}

function isWellFormedLeaf(value: unknown): boolean {
  const n = value as {
    id?: unknown;
    panels?: unknown;
    activePanelId?: unknown;
  };
  if (typeof n.id !== "string") return false;
  if (!Array.isArray(n.panels) || n.panels.length === 0) return false;
  for (const p of n.panels) {
    if (!p || typeof p !== "object") return false;
    const pp = p as { id?: unknown; type?: unknown };
    if (typeof pp.id !== "string" || typeof pp.type !== "string") return false;
  }
  if (typeof n.activePanelId !== "string") return false;
  return true;
}

function isWellFormedSplit(value: unknown): boolean {
  const n = value as {
    id?: unknown;
    direction?: unknown;
    children?: unknown;
    sizes?: unknown;
  };
  if (typeof n.id !== "string") return false;
  if (n.direction !== "horizontal" && n.direction !== "vertical") return false;
  if (!Array.isArray(n.children) || n.children.length < 2) return false;
  if (!Array.isArray(n.sizes) || n.sizes.length !== n.children.length)
    return false;
  if (!n.sizes.every((s) => typeof s === "number" && Number.isFinite(s)))
    return false;
  return (n.children as unknown[]).every((c) => isWellFormed(c));
}

/* Lint-clean unused-type suppression — SplitNode is referenced indirectly
 * through the union. Re-exported for callers who want it. */
export type { SplitNode };
