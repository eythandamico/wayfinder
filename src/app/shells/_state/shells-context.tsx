"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MARKETS } from "../_data/mocks";
import type { Market } from "../_types";

export type Density = "small" | "medium" | "large";
const DENSITY_KEY = "wf-shells-density";

type ShellsContextValue = {
  activeMarket: Market;
  setActiveMarket: (market: Market) => void;
  commandOpen: boolean;
  openCommand: () => void;
  closeCommand: () => void;
  toggleCommand: () => void;
  density: Density;
  setDensity: (d: Density) => void;
};

const ShellsContext = createContext<ShellsContextValue | null>(null);

export function ShellsProvider({ children }: { children: ReactNode }) {
  const [activeMarket, setActiveMarket] = useState<Market>(MARKETS[0]);
  const [commandOpen, setCommandOpen] = useState(false);
  const [density, setDensityState] = useState<Density>("medium");

  // Hydrate density from localStorage after mount (SSR-safe).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(DENSITY_KEY) as Density | null;
      if (saved === "small" || saved === "medium" || saved === "large") {
        setDensityState(saved);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  // Apply density on <html> while Shells is mounted; clear on unmount so other
  // routes don't inherit the attribute. <html>-level placement means any
  // portaled content (BottomSheet, CommandBar palette, MarketPicker) inherits
  // the CSS variables without per-portal wiring.
  useEffect(() => {
    document.documentElement.dataset.density = density;
    return () => {
      delete document.documentElement.dataset.density;
    };
  }, [density]);

  const setDensity = useCallback((d: Density) => {
    setDensityState(d);
    try {
      window.localStorage.setItem(DENSITY_KEY, d);
    } catch {
      /* ignore */
    }
  }, []);

  const openCommand = useCallback(() => setCommandOpen(true), []);
  const closeCommand = useCallback(() => setCommandOpen(false), []);
  const toggleCommand = useCallback(() => setCommandOpen((v) => !v), []);

  const value = useMemo(
    () => ({
      activeMarket,
      setActiveMarket,
      commandOpen,
      openCommand,
      closeCommand,
      toggleCommand,
      density,
      setDensity,
    }),
    [
      activeMarket,
      commandOpen,
      openCommand,
      closeCommand,
      toggleCommand,
      density,
      setDensity,
    ],
  );

  return (
    <ShellsContext.Provider value={value}>{children}</ShellsContext.Provider>
  );
}

export function useActiveMarket() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error("useActiveMarket must be used inside <ShellsProvider>");
  }
  return ctx;
}

export function useCommandBar() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error("useCommandBar must be used inside <ShellsProvider>");
  }
  return {
    open: ctx.commandOpen,
    openCommand: ctx.openCommand,
    closeCommand: ctx.closeCommand,
    toggleCommand: ctx.toggleCommand,
  };
}

export function useDensity() {
  const ctx = useContext(ShellsContext);
  if (!ctx) {
    throw new Error("useDensity must be used inside <ShellsProvider>");
  }
  return { density: ctx.density, setDensity: ctx.setDensity };
}
