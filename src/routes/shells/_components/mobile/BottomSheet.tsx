"use client";

import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /** Max height of the sheet content area, as viewport fraction. Defaults to 90%. */
  heightFraction?: number;
  children: ReactNode;
  className?: string;
};

/** Drag past this fraction of the sheet height OR fling faster than
 *  the velocity threshold to dismiss. Below either threshold the
 *  sheet springs back to its open position. */
const DISMISS_DISTANCE_FRACTION = 0.25;
const DISMISS_VELOCITY_PX_PER_MS = 0.5;

/**
 * Bottom sheet primitive for mobile. Backed by Base UI's Dialog for focus
 * trapping, Escape, and backdrop click. Content slides up from the bottom
 * and scrolls internally. Safe-area-inset-bottom is respected so the
 * interior never runs under the home indicator.
 *
 * Drag-to-dismiss: pointer-down on the drag handle (or the header row)
 * arms a downward pan. Once delta > 25% of sheet height OR fling
 * velocity > 0.5px/ms, the sheet closes. Below threshold it snaps back
 * via a single CSS transition. Touch-action panning is locked vertical
 * so the gesture never fights with horizontal scrolling inside.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  heightFraction = 0.9,
  children,
  className,
}: Props) {
  const popupRef = useRef<HTMLDivElement>(null);
  // Drag offset in px (>= 0). null = not dragging.
  const [dragY, setDragY] = useState<number | null>(null);
  const dragStateRef = useRef<{
    startY: number;
    startT: number;
    lastY: number;
    lastT: number;
    pointerId: number;
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only react to touch / pen drags. Mouse users have the × close.
    if (e.pointerType === "mouse") return;
    dragStateRef.current = {
      startY: e.clientY,
      startT: performance.now(),
      lastY: e.clientY,
      lastT: performance.now(),
      pointerId: e.pointerId,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragY(0);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragStateRef.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const dy = Math.max(0, e.clientY - s.startY); // ignore upward drag
    s.lastY = e.clientY;
    s.lastT = performance.now();
    setDragY(dy);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = dragStateRef.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const totalDy = Math.max(0, e.clientY - s.startY);
    const dt = Math.max(1, performance.now() - s.startT);
    const velocity = totalDy / dt;
    const sheetEl = popupRef.current;
    const sheetHeight = sheetEl?.offsetHeight ?? window.innerHeight;
    const distanceHit =
      totalDy > sheetHeight * DISMISS_DISTANCE_FRACTION;
    const flingHit = velocity > DISMISS_VELOCITY_PX_PER_MS;
    dragStateRef.current = null;
    if (distanceHit || flingHit) {
      // Close — Base UI's exit transition will animate from the
      // current dragged position to fully off-screen.
      onOpenChange(false);
      setDragY(null);
    } else {
      // Snap back — clear the drag offset, the CSS transition on
      // transform makes the spring-back animate smoothly.
      setDragY(null);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-40 bg-black/55 backdrop-blur-sm",
            "transition-opacity duration-200 ease-out",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          )}
        />
        <Dialog.Popup
          ref={popupRef}
          className={cn(
            "fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-2xl bg-card shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.65)]",
            "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
            // Transform animates UNLESS the user is mid-drag — that
            // way the snap-back uses ease-out and the live drag is
            // pinned 1:1 to the finger.
            dragY === null &&
              "transition-transform duration-300 ease-[var(--ease-drawer)]",
            "data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
            className,
          )}
          style={{
            height: `${heightFraction * 100}dvh`,
            maxHeight: `${heightFraction * 100}dvh`,
            // touchAction confines the drag gesture to vertical so
            // horizontal scrollers inside (carousels, etc.) keep
            // working.
            touchAction: "pan-y",
            // While dragging, translateY by the drag offset. Once the
            // drag ends without dismissal we set dragY back to null
            // and the CSS transition above carries the sheet home.
            transform: dragY !== null ? `translate3d(0, ${dragY}px, 0)` : undefined,
          }}
        >
          {/* Drag handle + header — both surfaces are armed for the
           *  drag-to-dismiss gesture. The handle gives a clear visual
           *  affordance; the rest of the header makes the gesture
           *  generous on mobile where pixel-precision is hard. */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
          >
            <div className="flex shrink-0 items-center justify-center pt-2.5 pb-2">
              <span
                aria-hidden
                className="h-1 w-10 rounded-full bg-white/15"
              />
            </div>
            <div className="flex shrink-0 items-center justify-between gap-2 px-4 pb-2">
              {title ? (
                <Dialog.Title className="text-body font-semibold text-foreground">
                  {title}
                </Dialog.Title>
              ) : (
                <Dialog.Title className="sr-only">Panel</Dialog.Title>
              )}
              <Dialog.Close
                aria-label="Close"
                className={cn(
                  "ml-auto flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-4 hover:text-foreground active:scale-[0.96]",
                )}
              >
                <CloseIcon />
              </Dialog.Close>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CloseIcon() {
  return <X strokeWidth={1.75} className="size-3.5" aria-hidden />;
}
