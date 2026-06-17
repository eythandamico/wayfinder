"use client";

import {
  createContext,
  useContext,
  type Dispatch,
  type ReactNode,
} from "react";
import type { SavedLayoutEntry } from "./saved-layouts";
import type { LayoutAction } from "./types";

/**
 * Lets components anywhere in the tree (MarketHeader, PanelChrome,
 * future drag handlers) dispatch layout actions without prop drilling.
 * Also exposes the saved-layouts list + named save / load / delete
 * actions so AddPanelMenu can drive everything from one menu.
 */

type Ctx = {
  dispatch: Dispatch<LayoutAction>;
  savedLayouts: SavedLayoutEntry[];
  saveCurrentLayout: (name: string) => void;
  loadSavedLayout: (id: string) => void;
  deleteSavedLayout: (id: string) => void;
};

const LayoutContext = createContext<Ctx | null>(null);

export function LayoutProvider({
  dispatch,
  savedLayouts,
  saveCurrentLayout,
  loadSavedLayout,
  deleteSavedLayout,
  children,
}: {
  dispatch: Dispatch<LayoutAction>;
  savedLayouts: SavedLayoutEntry[];
  saveCurrentLayout: (name: string) => void;
  loadSavedLayout: (id: string) => void;
  deleteSavedLayout: (id: string) => void;
  children: ReactNode;
}) {
  return (
    <LayoutContext.Provider
      value={{
        dispatch,
        savedLayouts,
        saveCurrentLayout,
        loadSavedLayout,
        deleteSavedLayout,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutDispatch(): Dispatch<LayoutAction> | null {
  return useContext(LayoutContext)?.dispatch ?? null;
}

/** Saved-layouts surface — list + the three actions. Returns null
 *  outside the provider so callers can guard mobile / SSR. */
export function useSavedLayouts() {
  const ctx = useContext(LayoutContext);
  if (!ctx) return null;
  const {
    savedLayouts,
    saveCurrentLayout,
    loadSavedLayout,
    deleteSavedLayout,
  } = ctx;
  return {
    savedLayouts,
    saveCurrentLayout,
    loadSavedLayout,
    deleteSavedLayout,
  };
}
