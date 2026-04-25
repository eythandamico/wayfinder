"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { cn } from "@/lib/utils";
import { ChartPanel } from "./_components/ChartPanel";
import { ChatPanel } from "./_components/ChatPanel";
import { CommandBar } from "./_components/CommandBar";
import { MarketHeader } from "./_components/MarketHeader";
import { OrderBookPanel } from "./_components/OrderBook";
import { PortfolioPanel } from "./_components/PortfolioPanel";
import { TradePanel } from "./_components/TradePanel";
import { MobileLayout } from "./_components/mobile/MobileLayout";
import { ShellsProvider } from "./_state/shells-context";

/* ------------------------------------------------------------------ */
/*  Media query — render desktop or mobile shell                       */
/* ------------------------------------------------------------------ */

function subscribe(cb: () => void) {
  const mql = window.matchMedia("(min-width: 768px)");
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

function getSnapshot() {
  return window.matchMedia("(min-width: 768px)").matches;
}

function getServerSnapshot() {
  return true;
}

function useIsDesktop() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function ShellsPage() {
  const isDesktop = useIsDesktop();
  return (
    <ShellsProvider>
      <h1 className="sr-only">Wayfinder Trading Terminal</h1>
      <CommandBar />
      {isDesktop ? <DesktopShell /> : <MobileLayout />}
    </ShellsProvider>
  );
}

/* ------------------------------------------------------------------ */
/*  Resizable layout primitives                                        */
/*                                                                     */
/*  Sizes stored as percentage arrays summing to 100. Applied via      */
/*  inline `flex-basis: <pct>%` so first paint always has the right    */
/*  proportions — no measurement race like react-resizable-panels v4.  */
/*  Drag handles convert pixel deltas to percentage deltas using the   */
/*  parent container's measured size, with min-size clamping.          */
/* ------------------------------------------------------------------ */

const COL_DEFAULTS = [54, 18, 28];
const COL_MINS = [34, 14, 22];
const LEFT_ROW_DEFAULTS = [70, 30];
const LEFT_ROW_MINS = [30, 20];
const MID_ROW_DEFAULTS = [45, 55];
const MID_ROW_MINS = [25, 25];

const STORAGE_KEY = "wf-shells-layout-v1";

type SavedLayout = {
  cols: number[];
  leftRows: number[];
  midRows: number[];
};

function loadLayout(): SavedLayout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedLayout>;
    if (
      !parsed.cols ||
      parsed.cols.length !== 3 ||
      !parsed.leftRows ||
      parsed.leftRows.length !== 2 ||
      !parsed.midRows ||
      parsed.midRows.length !== 2
    )
      return null;
    return parsed as SavedLayout;
  } catch {
    return null;
  }
}

function saveLayout(layout: SavedLayout) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // storage unavailable, layout stays session-scoped
  }
}

function DesktopShell() {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const midColRef = useRef<HTMLDivElement>(null);

  const [cols, setCols] = useState<number[]>(COL_DEFAULTS);
  const [leftRows, setLeftRows] = useState<number[]>(LEFT_ROW_DEFAULTS);
  const [midRows, setMidRows] = useState<number[]>(MID_ROW_DEFAULTS);

  // Restore from localStorage before paint to avoid layout flash.
  useLayoutEffect(() => {
    const saved = loadLayout();
    if (!saved) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCols(saved.cols);
    setLeftRows(saved.leftRows);
    setMidRows(saved.midRows);
  }, []);

  // Persist layout changes (debounced via effect coalescing).
  useEffect(() => {
    saveLayout({ cols, leftRows, midRows });
  }, [cols, leftRows, midRows]);

  const onDragCols = useCallback(
    (handleIdx: number) => (deltaPx: number) => {
      const w = containerRef.current?.getBoundingClientRect().width ?? 0;
      if (!w) return;
      setCols((prev) =>
        applyDelta(prev, handleIdx, (deltaPx / w) * 100, COL_MINS),
      );
    },
    [],
  );

  const onDragLeftRows = useCallback(
    (deltaPx: number) => {
      const h = leftColRef.current?.getBoundingClientRect().height ?? 0;
      if (!h) return;
      setLeftRows((prev) =>
        applyDelta(prev, 0, (deltaPx / h) * 100, LEFT_ROW_MINS),
      );
    },
    [],
  );

  const onDragMidRows = useCallback(
    (deltaPx: number) => {
      const h = midColRef.current?.getBoundingClientRect().height ?? 0;
      if (!h) return;
      setMidRows((prev) =>
        applyDelta(prev, 0, (deltaPx / h) * 100, MID_ROW_MINS),
      );
    },
    [],
  );

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-background p-1 text-foreground">
      <MarketHeader />
      <div
        ref={containerRef}
        className="mt-1 flex min-h-0 min-w-0 flex-1"
      >
        {/* Left column: Chart / Portfolio */}
        <div
          ref={leftColRef}
          className="flex min-h-0 min-w-0 flex-col"
          style={{ flexBasis: `${cols[0]}%`, flexShrink: 0, flexGrow: 0 }}
        >
          <div
            className="min-h-0 min-w-0"
            style={{ flexBasis: `${leftRows[0]}%`, flexShrink: 0, flexGrow: 0 }}
          >
            <ChartPanel />
          </div>
          <ResizeHandle orientation="vertical" onDrag={onDragLeftRows} />
          <div
            className="min-h-0 min-w-0"
            style={{ flexBasis: `${leftRows[1]}%`, flexShrink: 0, flexGrow: 0 }}
          >
            <PortfolioPanel />
          </div>
        </div>

        <ResizeHandle orientation="horizontal" onDrag={onDragCols(0)} />

        {/* Middle column: Trade / Order book */}
        <div
          ref={midColRef}
          className="flex min-h-0 min-w-0 flex-col"
          style={{ flexBasis: `${cols[1]}%`, flexShrink: 0, flexGrow: 0 }}
        >
          <div
            className="min-h-0 min-w-0"
            style={{ flexBasis: `${midRows[0]}%`, flexShrink: 0, flexGrow: 0 }}
          >
            <TradePanel />
          </div>
          <ResizeHandle orientation="vertical" onDrag={onDragMidRows} />
          <div
            className="min-h-0 min-w-0"
            style={{ flexBasis: `${midRows[1]}%`, flexShrink: 0, flexGrow: 0 }}
          >
            <OrderBookPanel />
          </div>
        </div>

        <ResizeHandle orientation="horizontal" onDrag={onDragCols(1)} />

        {/* Right column: Chat */}
        <div
          className="min-h-0 min-w-0"
          style={{ flexBasis: `${cols[2]}%`, flexShrink: 0, flexGrow: 0 }}
        >
          <ChatPanel />
        </div>
      </div>
    </main>
  );
}

/** Adjusts a sizes array given a delta % at a handle position, clamped by mins. */
function applyDelta(
  sizes: number[],
  handleIdx: number,
  deltaPct: number,
  mins: number[],
): number[] {
  const a = handleIdx;
  const b = handleIdx + 1;
  let nextA = sizes[a] + deltaPct;
  let nextB = sizes[b] - deltaPct;

  if (nextA < mins[a]) {
    nextB -= mins[a] - nextA;
    nextA = mins[a];
  }
  if (nextB < mins[b]) {
    nextA -= mins[b] - nextB;
    nextB = mins[b];
  }

  const next = [...sizes];
  next[a] = nextA;
  next[b] = nextB;
  return next;
}

function ResizeHandle({
  orientation,
  onDrag,
}: {
  orientation: "horizontal" | "vertical";
  onDrag: (deltaPx: number) => void;
}) {
  const draggingRef = useRef(false);
  const lastPosRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  // setPointerCapture routes all subsequent events for this pointer to the
  // handle element until release — even if the cursor moves over an iframe
  // (TradingView) or any other element that would otherwise consume events.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointerIdRef.current = e.pointerId;
    draggingRef.current = true;
    lastPosRef.current =
      orientation === "horizontal" ? e.clientX : e.clientY;
    document.body.style.cursor =
      orientation === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const cur = orientation === "horizontal" ? e.clientX : e.clientY;
    const delta = cur - lastPosRef.current;
    lastPosRef.current = cur;
    if (delta !== 0) onDrag(delta);
  };

  const stop = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (pointerIdRef.current !== null) {
      try {
        e.currentTarget.releasePointerCapture(pointerIdRef.current);
      } catch {
        // Capture may have been released already (e.g., element detached).
      }
      pointerIdRef.current = null;
    }
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  return (
    <div
      role="separator"
      aria-orientation={
        orientation === "horizontal" ? "vertical" : "horizontal"
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      className={cn(
        "group/handle relative shrink-0 touch-none select-none transition-colors duration-150 ease-out hover:bg-primary/30",
        orientation === "horizontal"
          ? "w-1 cursor-col-resize"
          : "h-1 cursor-row-resize",
      )}
    >
      {/* Wider invisible hit area to make grabbing the thin line easier */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-0",
          orientation === "horizontal" ? "-mx-1" : "-my-1",
        )}
      />
    </div>
  );
}
