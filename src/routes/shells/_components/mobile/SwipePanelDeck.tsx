"use client";

import {
  forwardRef,
  ReactNode,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { PanelGridMenu } from "./PanelGridMenu";

/** Imperative handle exposed to parents who need to drive the deck
 *  programmatically — e.g. the mobile sticky composer snapping back
 *  to the Chat panel after a send. */
export type SwipePanelDeckHandle = {
  goTo: (index: number) => void;
};

export type SwipePanel = {
  /** Stable id used as React key and aria description. */
  id: string;
  /** Short label shown in the indicator row + announced to SR. */
  label: string;
  /** Pulse the indicator dot when this panel has unread content the
   *  user might want to see (e.g. agent just replied while user was
   *  on Portfolio). */
  pulse?: boolean;
  /** Panel body. Renders inside a full-viewport-width snap stop. */
  render: () => ReactNode;
};

type Props = {
  panels: SwipePanel[];
  /** Default panel index when first rendered. Subsequent renders
   *  preserve scroll position; this only sets the initial. */
  defaultIndex?: number;
};

/**
 * Mobile swipe deck — N full-width panels laid out horizontally with
 * CSS scroll-snap so the OS handles the fling/snap. The indicator
 * strip above the deck shows which panel is active and lets the user
 * tap to jump directly.
 *
 * Renders inside its parent's flex column. Caller owns the height —
 * this component fills whatever vertical space it's given.
 */
export const SwipePanelDeck = forwardRef<SwipePanelDeckHandle, Props>(
function SwipePanelDeck({ panels, defaultIndex = 0 }, ref) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(defaultIndex);

  // Expose imperative `goTo` so parents can snap to a panel without
  // owning the scroll container themselves. Used by the mobile
  // composer to scroll back to Chat after a send.
  useImperativeHandle(
    ref,
    () => ({
      goTo: (index: number) => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({
          left: el.clientWidth * index,
          behavior: "smooth",
        });
      },
    }),
    [],
  );

  // Center on the default panel before paint. Subsequent panel
  // changes are user-driven so we don't re-center on every render.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * defaultIndex, behavior: "instant" });
    setActiveIndex(defaultIndex);
    // Run once per mount — re-centering on prop change would yank
    // the user mid-swipe. defaultIndex is intentionally read once at
    // mount and not added to the deps list.
  }, []);

  // Track which panel is in view by snapping the scrollLeft to a
  // panel index. rAF throttles to one update per frame even if the
  // browser fires many scroll events.
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const width = el.clientWidth;
    if (!width) return;
    const next = Math.round(el.scrollLeft / width);
    setActiveIndex((prev) => (prev === next ? prev : next));
  }, []);

  const goTo = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * index, behavior: "smooth" });
  };

  const active = panels[activeIndex] ?? panels[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PanelIndicator
        panels={panels}
        activeIndex={activeIndex}
        activeLabel={active?.label ?? ""}
        onJump={goTo}
      />
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={cn(
          "flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain",
          // Hide native scrollbar — the indicator above is the
          // affordance. Don't combine with `scroll-thin` since that
          // sets scrollbar-width: thin and would override these.
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:size-0",
        )}
        // Block vertical browser overscroll bounce on iOS while the
        // user swipes horizontally — fewer accidental pull-to-refresh
        // gestures fighting the swipe deck.
        style={{ touchAction: "pan-x pan-y" }}
      >
        {panels.map((p, i) => (
          <section
            key={p.id}
            aria-label={p.label}
            aria-hidden={i !== activeIndex}
            className="flex w-full shrink-0 snap-start snap-always flex-col overflow-hidden"
          >
            {p.render()}
          </section>
        ))}
      </div>
    </div>
  );
});

function PanelIndicator({
  panels,
  activeIndex,
  activeLabel,
  onJump,
}: {
  panels: SwipePanel[];
  activeIndex: number;
  activeLabel: string;
  onJump: (i: number) => void;
}) {
  // Three-column grid: title (left, takes share of the row), dots
  // (auto-width, centered between title and grid menu), and the
  // all-panels grid menu (right, takes equal share to balance the
  // title column visually). `minmax(0,1fr)` on the title slot lets
  // long labels truncate without pushing the dots off-center.
  return (
    <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 pt-1 pb-2">
      <h2 className="truncate text-lg font-semibold leading-none text-foreground">
        {activeLabel}
      </h2>
      <div className="flex items-center justify-self-center gap-1.5" role="tablist">
        {panels.map((p, i) => {
          const isActive = i === activeIndex;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Go to ${p.label}`}
              onClick={() => onJump(i)}
              className={cn(
                "relative flex items-center justify-center transition-[width,background-color] duration-200 ease-out",
                // Larger invisible tap target so the dots stay easy
                // to hit even though the visible mark is tiny.
                "before:absolute before:-inset-2 before:content-['']",
                isActive
                  ? "h-1.5 w-6 rounded-full bg-primary"
                  : "size-1.5 rounded-full bg-white/15 hover:bg-white/30",
              )}
            >
              {p.pulse && !isActive && (
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]"
                />
              )}
            </button>
          );
        })}
      </div>
      <div className="justify-self-end">
        <PanelGridMenu
          panels={panels}
          activeIndex={activeIndex}
          onJump={onJump}
        />
      </div>
    </div>
  );
}
