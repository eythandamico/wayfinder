import { migrateRemovedPanels } from "./persist";
import { isWellFormed } from "./reducer";
import { LAYOUT_SCHEMA_VERSION, type LayoutNode } from "./types";

/**
 * User-named layout presets stored in localStorage. Distinct from
 * `persist.ts` which auto-saves the current tree as the user resizes
 * + drops panels around. These are intentional snapshots the user
 * created via the AddPanelMenu's "Save current layout" button.
 */

const STORAGE_KEY = "wf-shells-v3-saved-layouts-v1";

export type SavedLayoutEntry = {
  id: string;
  name: string;
  layout: LayoutNode;
  savedAt: number;
  /** Schema version of the layout payload at save time. Entries from
   *  older schemas are dropped silently on load. */
  version: number;
};

/** Read all entries from storage, filtering out anything that fails
 *  schema validation or carries a stale version. Always returns an
 *  array — empty on SSR, missing key, or parse failure. */
export function readSavedLayouts(): SavedLayoutEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is SavedLayoutEntry =>
          entry &&
          typeof entry === "object" &&
          typeof entry.id === "string" &&
          typeof entry.name === "string" &&
          typeof entry.savedAt === "number" &&
          typeof entry.version === "number" &&
          isWellFormed(entry.layout),
      )
      .filter((entry) => entry.version === LAYOUT_SCHEMA_VERSION)
      // Strip removed panel types from each saved tree. Entries that
      // emptied out entirely (their only panel was removed) get dropped.
      .map((entry) => {
        const migrated = migrateRemovedPanels(entry.layout);
        return migrated ? { ...entry, layout: migrated } : null;
      })
      .filter((entry): entry is SavedLayoutEntry => entry !== null)
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

/** Replace the entire saved-layouts list. Used by the provider after
 *  any mutation (add / delete). */
export function writeSavedLayouts(entries: SavedLayoutEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota exceeded or storage unavailable — silent no-op */
  }
}

export function newSavedLayoutEntry(
  name: string,
  layout: LayoutNode,
): SavedLayoutEntry {
  return {
    id: `layout-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    name: name.trim() || "Untitled layout",
    layout,
    savedAt: Date.now(),
    version: LAYOUT_SCHEMA_VERSION,
  };
}
