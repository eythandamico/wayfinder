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

export function loadLayout(): LayoutNode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedLayout>;
    if (parsed.version !== LAYOUT_SCHEMA_VERSION) return null;
    if (!isWellFormed(parsed.root)) return null;
    return parsed.root;
  } catch {
    return null;
  }
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
