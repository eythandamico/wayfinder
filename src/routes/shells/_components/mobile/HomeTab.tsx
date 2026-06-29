"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import {
  PANEL_CATEGORIES,
  PANEL_REGISTRY,
  PANEL_TYPES,
} from "../../_layout/registry";
import type { PanelInstance, PanelType } from "../../_layout/types";
import { cn } from "@/lib/utils";

const DEFAULT_PANEL: PanelType = "chart";

/**
 * Home tab body — single-panel view with a top dropdown that
 * switches between every panel in the registry.
 *
 * On desktop the panels tile into a layout tree; on mobile we
 * surface one at a time so each panel gets the full screen.
 * Selecting a different panel from the dropdown swaps the
 * rendered component below.
 *
 * Panel instance ids are stable per type (`mobile-${type}`) so
 * panels that hold internal state via context (active market,
 * watchlist selection, etc.) keep that state when the user
 * switches away and back.
 */
export function HomeTab() {
  const [type, setType] = useState<PanelType>(DEFAULT_PANEL);
  const desc = PANEL_REGISTRY[type];
  const Component = desc.Component;
  const instance: PanelInstance = { id: `mobile-${type}`, type };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PanelSwitcher value={type} onChange={setType} />
      <div
        className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto"
        style={{ paddingBottom: "var(--shell-footer-pad, 0)" }}
      >
        <Component panel={instance} />
      </div>
    </div>
  );
}

function PanelSwitcher({
  value,
  onChange,
}: {
  value: PanelType;
  onChange: (next: PanelType) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useClickOutside(wrapRef, () => setOpen(false), open);
  const current = PANEL_REGISTRY[value];
  const CurrentIcon = current.Icon;

  return (
    <div className="shrink-0 px-3 py-2">
      <div ref={wrapRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Switch panel"
          className="flex h-10 w-full items-center gap-2 rounded-md bg-surface-1 px-3 text-body font-semibold text-foreground transition-colors hover:bg-surface-2"
        >
          <CurrentIcon
            strokeWidth={1.75}
            className="size-4 text-muted-foreground"
            aria-hidden
          />
          <span className="flex-1 text-left">{current.label}</span>
          <ChevronDown
            strokeWidth={1.75}
            className="size-3.5 text-muted-foreground"
            aria-hidden
          />
        </button>
        {open && (
          <div
            role="menu"
            className="absolute inset-x-0 top-full z-40 mt-1 max-h-[70vh] overflow-y-auto rounded-lg bg-popover backdrop-blur-md p-1 shadow-2xl ring-1 ring-inset ring-white/10"
          >
            {PANEL_CATEGORIES.map((cat) => {
              const items = PANEL_TYPES.filter((p) => p.category === cat.id);
              if (items.length === 0) return null;
              return (
                <div key={cat.id} className="py-1">
                  <div className="px-2 pb-1 text-micro uppercase tracking-[0.14em] text-muted-foreground/70">
                    {cat.label}
                  </div>
                  {items.map((p) => {
                    const PIcon = p.Icon;
                    const active = p.type === value;
                    return (
                      <button
                        key={p.type}
                        role="menuitem"
                        type="button"
                        onClick={() => {
                          onChange(p.type);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-body transition-colors",
                          active
                            ? "bg-surface-3 text-foreground"
                            : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                        )}
                      >
                        <PIcon
                          strokeWidth={1.75}
                          className="size-4 shrink-0"
                          aria-hidden
                        />
                        <span className="truncate">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
