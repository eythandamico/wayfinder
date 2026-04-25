"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MARKETS } from "../_data/mocks";
import type { Market } from "../_types";

type ShellsContextValue = {
  activeMarket: Market;
  setActiveMarket: (market: Market) => void;
  commandOpen: boolean;
  openCommand: () => void;
  closeCommand: () => void;
  toggleCommand: () => void;
};

const ShellsContext = createContext<ShellsContextValue | null>(null);

export function ShellsProvider({ children }: { children: ReactNode }) {
  const [activeMarket, setActiveMarket] = useState<Market>(MARKETS[0]);
  const [commandOpen, setCommandOpen] = useState(false);

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
    }),
    [activeMarket, commandOpen, openCommand, closeCommand, toggleCommand],
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
