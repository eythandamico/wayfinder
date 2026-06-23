import { isWellFormed } from "./reducer";
import {
  LAYOUT_SCHEMA_VERSION,
  type LayoutNode,
  type SavedLayout,
} from "./types";

// Key carries the historical `-v3-` segment from when this app had
// shells/shells-v2/shells-v3 living side by side — kept as-is so users
// don't lose their saved layout. The current /shells is the only
// generation; the prior versions were deleted on or before 2026-06-16.
const STORAGE_KEY = "wf-shells-v3-layout-tree-v1";

/** Panel types that used to be grid-renderable but have since been
 *  promoted to top-level chrome (e.g. friends moved to a side sheet
 *  on 2026-06-23). On load, strip these from any saved tree so users
 *  with persisted layouts don't see "Unknown panel: friends" stubs
 *  where the panel used to live. */
const REMOVED_PANEL_TYPES = new Set<string>(["friends"]);

export function loadLayout(): LayoutNode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedLayout>;
    if (parsed.version !== LAYOUT_SCHEMA_VERSION) return null;
    if (!isWellFormed(parsed.root)) return null;
    return migrateRemovedPanels(parsed.root);
  } catch {
    return null;
  }
}

/** Walks the persisted tree and removes any panel whose type is no
 *  longer registered. Empties bubble up: a leaf with zero remaining
 *  panels collapses out of its parent split (and a 1-child split
 *  hoists its only child up). If the whole tree empties out, returns
 *  null so callers fall back to DEFAULT_LAYOUT.
 *
 *  Exported so user-named saved-layouts can run the same migration —
 *  same removal rules need to apply everywhere persisted trees live. */
export function migrateRemovedPanels(node: LayoutNode): LayoutNode | null {
  if (node.kind === "leaf") {
    const filtered = node.panels.filter(
      (p) => !REMOVED_PANEL_TYPES.has(p.type),
    );
    if (filtered.length === 0) return null;
    const activeStillPresent = filtered.some(
      (p) => p.id === node.activePanelId,
    );
    return {
      ...node,
      panels: filtered,
      activePanelId: activeStillPresent
        ? node.activePanelId
        : filtered[0].id,
    };
  }

  // Split: migrate each child, drop nulls, re-normalize sizes.
  const kept = node.children
    .map((child, i) => ({
      child: migrateRemovedPanels(child),
      size: node.sizes[i],
    }))
    .filter(
      (c): c is { child: LayoutNode; size: number } => c.child !== null,
    );

  if (kept.length === 0) return null;
  if (kept.length === 1) return kept[0].child;

  const total = kept.reduce((acc, c) => acc + c.size, 0) || 1;
  return {
    ...node,
    children: kept.map((c) => c.child),
    sizes: kept.map((c) => (c.size / total) * 100),
  };
}

export function saveLayout(root: LayoutNode) {
  if (typeof window === "undefined") return;
  try {
    const envelope: SavedLayout = { version: LAYOUT_SCHEMA_VERSION, root };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // storage unavailable — layout stays session-scoped, no recovery needed
  }
}
