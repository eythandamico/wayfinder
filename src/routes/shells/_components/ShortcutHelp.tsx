"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { HELP_EVENT } from "../_hooks/useShellsKeyboard";

/**
 * Keyboard shortcut reference. Opens on `?` (handled by
 * useShellsKeyboard) or programmatically via:
 *
 *   window.dispatchEvent(new CustomEvent("wf:shells:help"))
 *
 * Reads as a quick reference, not a tutorial — terse, no descriptions
 * the user already knows. Power users only.
 */

type Shortcut = { keys: string[]; label: string };

const GROUPS: Array<{ heading: string; items: Shortcut[] }> = [
  {
    heading: "Navigate",
    items: [
      { keys: ["⌘", "K"], label: "Open command bar" },
      { keys: ["?"], label: "Show shortcuts" },
      { keys: ["Esc"], label: "Close dialog / menu" },
    ],
  },
  {
    heading: "Trade",
    items: [
      { keys: ["B"], label: "Set side to Long" },
      { keys: ["S"], label: "Set side to Short" },
    ],
  },
];

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onShow = () => setOpen((v) => !v);
    window.addEventListener(HELP_EVENT, onShow);
    return () => window.removeEventListener(HELP_EVENT, onShow);
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[var(--z-modal-bg)] bg-background/70 backdrop-blur-[3px] transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-[var(--z-modal)] w-[min(92vw,460px)] -translate-x-1/2 -translate-y-1/2 origin-center rounded-xl bg-card backdrop-blur-md p-5 ring-1 ring-inset ring-white/[0.06] shadow-2xl transition-[opacity,transform] duration-200 ease-[var(--ease-strong)] data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0">
          <Dialog.Title className="text-body font-semibold text-foreground">
            Keyboard shortcuts
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-caption text-muted-foreground">
            Press <Kbd>?</Kbd> any time to toggle this panel.
          </Dialog.Description>
          <div className="mt-4 flex flex-col gap-4">
            {GROUPS.map((g) => (
              <div key={g.heading} className="flex flex-col gap-1.5">
                <div className="text-micro uppercase tracking-[0.16em] text-muted-foreground">
                  {g.heading}
                </div>
                {g.items.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-body text-foreground">{s.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {s.keys.map((k, i) => (
                        <Kbd key={i}>{k}</Kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-6 items-center justify-center rounded bg-surface-3 px-1.5 text-caption font-medium tabular-nums text-foreground ring-1 ring-inset ring-white/[0.06]",
      )}
    >
      {children}
    </span>
  );
}
