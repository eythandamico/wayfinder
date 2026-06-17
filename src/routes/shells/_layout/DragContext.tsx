"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLayoutDispatch } from "./LayoutContext";
import type { DropEdge, PanelType } from "./types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/**
 * Two drop modes:
 *   - edge: subdivide the target leaf, dragged panel takes half
 *   - gap:  insert as a new sibling at the seam between siblings
 */
type HoveredDrop =
  | { kind: "edge"; regionId: string; edge: DropEdge }
  | {
      kind: "gap";
      splitId: string;
      insertIndex: number;
      orientation: "horizontal" | "vertical";
    }
  | null;

type Rect = { x: number; y: number; width: number; height: number };

/**
 * Drag lifecycle: each phase has its own visual signature so the
 * whole gesture reads as one continuous motion.
 *
 *   dragging   — ghost follows cursor; drop zones illuminated
 *   landing    — ghost morphs from release point into the landed rect
 *   cancelling — ghost springs back to source rect (no drop happened)
 *
 * `justLanded` lives on a separate field because it persists *after*
 * the drag is done — used to render the confirmation glow on the
 * newly-placed panel for ~400ms.
 */
type Phase = "dragging" | "landing" | "cancelling";

type Dragging = {
  phase: Phase;
  sourceRegionId: string;
  panelId: string;
  label: string;
  iconType: PanelType;
  /** Current pointer position in viewport coords. */
  pointerX: number;
  pointerY: number;
  /** Smoothed horizontal velocity in px/ms — drives the ghost tilt. */
  velocityX: number;
  hovered: HoveredDrop;
  /** Rect of the source panel at drag-start, used to spring the ghost
   *  back on cancel. Null if it couldn't be captured. */
  sourceRect: Rect | null;
  /** Rect to morph the ghost into on landing — null until phase
   *  transitions to "landing". */
  landingRect: Rect | null;
  /** Source split id + child index at drag-start, used to suppress
   *  preview when the drop would be a strict no-op (releasing the
   *  panel into the same slot it came from). */
  sourceParentSplitId: string | null;
  sourceChildIndex: number | null;
};

type JustLanded = {
  regionId: string;
  panelId: string;
};

type DragApi = {
  state: Dragging | null;
  justLanded: JustLanded | null;
  /** Called by PanelChrome on pointerdown on the drag handle. */
  beginDrag: (
    e: React.PointerEvent<HTMLElement>,
    args: { sourceRegionId: string; panelId: string; label: string; iconType: PanelType },
  ) => void;
};

const DragContext = createContext<DragApi | null>(null);

/* ------------------------------------------------------------------ */
/*  Provider — manages the entire drag lifecycle                       */
/* ------------------------------------------------------------------ */

const DRAG_THRESHOLD_PX = 4;
/** Window the velocity sampler keeps around. Short window = jitter;
 *  long window = sluggish tilt. 60ms is a sweet spot. */
const VELOCITY_WINDOW_MS = 60;
/** How long the ghost takes to morph into its landing rect. Matches
 *  the FLIP layout duration so they read as one motion. */
const LANDING_MS = 280;
const CANCEL_MS = 220;
/** How long the just-landed glow lingers on the dropped panel. */
const JUST_LANDED_MS = 600;

export function DragProvider({ children }: { children: ReactNode }) {
  const dispatch = useLayoutDispatch();
  const [state, setState] = useState<Dragging | null>(null);
  // `armed` reflects "intent.current is live" — flips true on beginDrag,
  // false on teardown. State (not ref) so the listener effect below can
  // gate on it. Without this, the document-level pointer/keyboard
  // listeners were bound for the entire DragProvider lifetime — a
  // permanent overhead despite the "only while a drag is in progress"
  // intent in the comment.
  const [armed, setArmed] = useState(false);
  const [justLanded, setJustLanded] = useState<JustLanded | null>(null);
  // Ref-mirror of `state` so the pointerup handler can read the
  // current drag synchronously without going through a setState
  // callback (those run twice in strict mode — dispatching from
  // inside them would double-fire layout actions).
  const stateRef = useRef<Dragging | null>(null);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const intent = useRef<{
    sourceRegionId: string;
    panelId: string;
    label: string;
    iconType: PanelType;
    startX: number;
    startY: number;
    armed: boolean;
  } | null>(null);
  /** Rolling pointer-sample buffer for velocity calc. */
  const samples = useRef<{ x: number; t: number }[]>([]);
  /** Timer ids for landing / cancelling / glow phases. */
  const phaseTimer = useRef<number | null>(null);
  const glowTimer = useRef<number | null>(null);

  const clearPhaseTimer = () => {
    if (phaseTimer.current !== null) {
      window.clearTimeout(phaseTimer.current);
      phaseTimer.current = null;
    }
  };
  const clearGlowTimer = () => {
    if (glowTimer.current !== null) {
      window.clearTimeout(glowTimer.current);
      glowTimer.current = null;
    }
  };

  const computeVelocity = (now: number) => {
    const buf = samples.current;
    if (buf.length < 2) return 0;
    const cutoff = now - VELOCITY_WINDOW_MS;
    while (buf.length > 1 && buf[0].t < cutoff) buf.shift();
    const oldest = buf[0];
    const newest = buf[buf.length - 1];
    const dt = newest.t - oldest.t || 1;
    return (newest.x - oldest.x) / dt;
  };

  const onPointerMove = useCallback((e: PointerEvent) => {
    const ix = intent.current;
    if (!ix) return;
    const now = performance.now();
    samples.current.push({ x: e.clientX, t: now });
    if (samples.current.length > 12) samples.current.shift();

    // Threshold gate — don't enter drag mode for tiny accidental movements.
    if (!ix.armed) {
      const dx = e.clientX - ix.startX;
      const dy = e.clientY - ix.startY;
      if (dx * dx + dy * dy < DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) return;
      ix.armed = true;
      // Capture source rect at arm time so cancel knows where to spring
      // the ghost back to.
      const sourceEl = document.querySelector<HTMLElement>(
        `[data-leaf-id="${cssEscape(ix.sourceRegionId)}"]`,
      );
      const sourceRect = sourceEl
        ? rectOf(sourceEl.getBoundingClientRect())
        : null;
      const { splitId: sourceParentSplitId, childIndex: sourceChildIndex } =
        readSourceSlot(sourceEl);
      setState({
        phase: "dragging",
        sourceRegionId: ix.sourceRegionId,
        panelId: ix.panelId,
        label: ix.label,
        iconType: ix.iconType,
        pointerX: e.clientX,
        pointerY: e.clientY,
        velocityX: 0,
        hovered: null,
        sourceRect,
        landingRect: null,
        sourceParentSplitId,
        sourceChildIndex,
      });
      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
      // Stops TradingView (and any other iframe) from eating pointer
      // events while the drag is in flight — see globals.css selector.
      document.body.dataset.layoutDragging = "true";
    }

    const velocityX = computeVelocity(now);
    setState((prev) => {
      if (!prev || prev.phase !== "dragging") return prev;
      const hovered = hitTest(
        e.clientX,
        e.clientY,
        prev.sourceRegionId,
        prev.sourceParentSplitId,
        prev.sourceChildIndex,
      );
      // Cursor reflects the validity of the current drop target so the
      // user gets one more confirmation that "if I let go here, it'll
      // land." Avoids the silent failure of releasing in a dead zone.
      document.body.style.cursor = hovered ? "grabbing" : "not-allowed";
      return {
        ...prev,
        pointerX: e.clientX,
        pointerY: e.clientY,
        velocityX,
        hovered,
      };
    });
    // teardownDragSession + updateTabSpring are local closures with
    // stable behavior (no captured render state); we intentionally
    // skip them from deps to avoid recreating this callback per render.
     
  }, []);

  /** Tear down body-level drag flags + clear intent. */
  const teardownDragSession = () => {
    intent.current = null;
    samples.current = [];
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    delete document.body.dataset.layoutDragging;
    setArmed(false);
  };

  const cancelDrag = useCallback(() => {
    const cur = stateRef.current;
    teardownDragSession();
    if (!cur || cur.phase !== "dragging") {
      // Pre-threshold cancel — nothing visible happened.
      setState(null);
      return;
    }
    // Visible cancel — transition to "cancelling" so the ghost springs
    // back to source before unmounting.
    setState({ ...cur, phase: "cancelling", hovered: null });
    clearPhaseTimer();
    phaseTimer.current = window.setTimeout(() => {
      setState(null);
      phaseTimer.current = null;
    }, CANCEL_MS);
    // teardownDragSession is a stable local closure — intentionally
    // omitted from deps.
     
  }, []);

  const onPointerUp = useCallback(() => {
    const ix = intent.current;
    if (!ix) return;
    if (!ix.armed) {
      // Pre-threshold release — no drag actually started.
      teardownDragSession();
      return;
    }
    teardownDragSession();

    const cur = stateRef.current;
    if (!cur) return;

    if (!cur.hovered || !dispatch) {
      // No valid target — arc back to source via the cancelling phase.
      setState({ ...cur, phase: "cancelling", hovered: null });
      clearPhaseTimer();
      phaseTimer.current = window.setTimeout(() => {
        setState(null);
        phaseTimer.current = null;
      }, CANCEL_MS);
      return;
    }

    // Pre-compute the landing region id so we know where the ghost
    // is morphing to. Both edge and gap drops create a new leaf
    // keyed `region-{panelId}`.
    const hovered = cur.hovered;
    const landingRegion = `region-${cur.panelId}`;

    // Single, synchronous dispatch (NOT inside a setState callback —
    // strict mode would double-fire that).
    if (hovered.kind === "edge") {
      dispatch({
        type: "movePanel",
        sourceRegionId: cur.sourceRegionId,
        panelId: cur.panelId,
        targetRegionId: hovered.regionId,
        edge: hovered.edge,
      });
    } else {
      dispatch({
        type: "insertAtGap",
        sourceRegionId: cur.sourceRegionId,
        panelId: cur.panelId,
        targetSplitId: hovered.splitId,
        insertIndex: hovered.insertIndex,
      });
    }

    // Confirmation glow on the newly-landed panel.
    clearGlowTimer();
    setJustLanded({ regionId: landingRegion, panelId: cur.panelId });
    glowTimer.current = window.setTimeout(() => {
      setJustLanded(null);
      glowTimer.current = null;
    }, JUST_LANDED_MS);

    // Schedule the landing rect lookup + landing phase enter for the
    // next paint so React + FLIP have committed the new tree.
    window.requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-leaf-id="${cssEscape(landingRegion)}"]`,
      );
      const landingRect = el ? rectOf(el.getBoundingClientRect()) : null;
      setState((p) =>
        p ? { ...p, phase: "landing", landingRect, hovered: null } : p,
      );
      clearPhaseTimer();
      phaseTimer.current = window.setTimeout(() => {
        setState(null);
        phaseTimer.current = null;
      }, LANDING_MS);
    });
    // teardownDragSession is a stable local closure — intentionally
    // omitted from deps.
     
  }, [dispatch]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") cancelDrag();
    },
    [cancelDrag],
  );

  // Bind document-level listeners ONLY while a drag is armed (intent
  // live) or in flight (state live). Gating on the `armed` state +
  // `state` ensures the listeners attach on beginDrag, stay attached
  // through the threshold cross + dragging + landing/cancelling phases,
  // and detach as soon as teardownDragSession clears both. Previously
  // the effect ran unconditionally — listeners were permanently bound
  // for the entire DragProvider lifetime.
  useEffect(() => {
    if (!armed && !state) return;
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", cancelDrag);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", cancelDrag);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [armed, state, onPointerMove, onPointerUp, cancelDrag, onKeyDown]);

  // Tidy up any in-flight timers on unmount.
  useEffect(() => {
    return () => {
      clearPhaseTimer();
      clearGlowTimer();
    };
  }, []);

  const beginDrag: DragApi["beginDrag"] = useCallback((e, args) => {
    e.preventDefault();
    intent.current = {
      sourceRegionId: args.sourceRegionId,
      panelId: args.panelId,
      label: args.label,
      iconType: args.iconType,
      startX: e.clientX,
      startY: e.clientY,
      armed: false,
    };
    samples.current = [{ x: e.clientX, t: performance.now() }];
    setArmed(true);
  }, []);

  return (
    <DragContext.Provider value={{ state, justLanded, beginDrag }}>
      {children}
    </DragContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

export function useDragApi(): DragApi {
  const ctx = useContext(DragContext);
  if (!ctx) {
    // Provider not mounted (e.g. on /portfolio) — return a no-op API so
    // PanelChrome can render without crashing in those contexts.
    return { state: null, justLanded: null, beginDrag: () => {} };
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Hit testing — pointer → drop target                                */
/* ------------------------------------------------------------------ */

/**
 * Hit-test policy. The body of a non-source leaf is fully active —
 * every position inside commits to whichever edge is closest. The
 * previous mental model ("outer 18% = split, middle = tab merge")
 * was a remnant of the tab-merge feature that's since been removed;
 * with no consumer for the middle band it just left a dead zone the
 * user kept landing in. Now: edges still split, and the middle splits
 * to the nearest edge — no dead spot, every drop has a target.
 *
 * `GAP_PROXIMITY_PX` still gates seam drops so inter-panel gutters
 * stay easy to hit without stealing the whole panel body.
 */
const GAP_PROXIMITY_PX = 14;
/** Outer-edge band where dropping near a leaf's outer side (first or
 *  last child of its parent split) maps to insertIndex 0 or end —
 *  closes the first/last gap holes. */
const OUTER_GAP_PROXIMITY_PX = 16;

function hitTest(
  x: number,
  y: number,
  sourceRegionId: string,
  sourceParentSplitId: string | null,
  sourceChildIndex: number | null,
): HoveredDrop {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;

  // 1. Inter-sibling gap drop — direct hit OR proximity.
  const gap = resolveGap(el, x, y);
  if (gap) {
    return suppressNoOp(gap, sourceParentSplitId, sourceChildIndex);
  }

  // 2. Otherwise resolve relative to the leaf under the cursor.
  const leafEl = el.closest<HTMLElement>("[data-leaf-id]");
  if (!leafEl) return null;
  const regionId = leafEl.dataset.leafId;
  if (!regionId) return null;

  const rect = leafEl.getBoundingClientRect();
  const xRatio = (x - rect.x) / rect.width;
  const yRatio = (y - rect.y) / rect.height;
  if (xRatio < 0 || xRatio > 1 || yRatio < 0 || yRatio > 1) return null;

  // 3. First/last-gap drop on this leaf's outer edge (only if the leaf
  // is the first or last child of its parent split and pointer is
  // within OUTER_GAP_PROXIMITY_PX of the outer side).
  const outer = resolveOuterGap(leafEl, x, y, rect);
  if (outer) {
    return suppressNoOp(outer, sourceParentSplitId, sourceChildIndex);
  }

  // 4. Self-drops are no-ops (releasing onto your own source panel).
  if (regionId === sourceRegionId) return null;

  // 5. Subdivide along the nearest edge — no dead zone in the middle
  // of the panel. The four (distTop / distBottom / distLeft / distRight)
  // distances are ratios in [0, 1]; `min` picks the closest. With no
  // band cutoff every interior position commits to a valid edge, so
  // the slab preview slides continuously between top/bottom/left/right
  // as the cursor crosses the panel's diagonals.
  const distTop = yRatio;
  const distBottom = 1 - yRatio;
  const distLeft = xRatio;
  const distRight = 1 - xRatio;
  const min = Math.min(distTop, distBottom, distLeft, distRight);

  let edge: DropEdge;
  if (min === distTop) edge = "top";
  else if (min === distBottom) edge = "bottom";
  else if (min === distLeft) edge = "left";
  else edge = "right";
  return { kind: "edge", regionId, edge };
}

/**
 * Suppress drops that would land in the same slot the panel was just
 * picked up from. Currently checks the same-split same-slot case for
 * gap drops; tab/edge no-ops are already handled upstream.
 */
function suppressNoOp(
  drop: HoveredDrop,
  sourceParentSplitId: string | null,
  sourceChildIndex: number | null,
): HoveredDrop {
  if (!drop || drop.kind !== "gap") return drop;
  if (!sourceParentSplitId || sourceChildIndex === null) return drop;
  if (drop.splitId !== sourceParentSplitId) return drop;
  // Inserting at sourceChildIndex or sourceChildIndex+1 lands the
  // panel exactly where it came from after the source-detach
  // collapses the empty slot.
  if (
    drop.insertIndex === sourceChildIndex ||
    drop.insertIndex === sourceChildIndex + 1
  ) {
    return null;
  }
  return drop;
}

function resolveGap(
  el: Element,
  x: number,
  y: number,
): Extract<HoveredDrop, { kind: "gap" }> | null {
  // (a) Direct hit on a resize handle.
  const direct = el.closest<HTMLElement>("[data-resize-handle]");
  if (direct) return readGap(direct);

  // (b) Proximity — find the nearest gap handle that belongs to the
  // hovered leaf's immediate parent split. Skip handles owned by
  // nested splits so the user can't accidentally target a gap they're
  // not visually near.
  const leafEl = el.closest<HTMLElement>("[data-leaf-id]");
  if (!leafEl) return null;
  const splitEl = leafEl.closest<HTMLElement>("[data-split-id]");
  if (!splitEl) return null;
  const parentSplitId = splitEl.dataset.splitId;

  let best: { handle: HTMLElement; dist: number } | null = null;
  const handles = splitEl.querySelectorAll<HTMLElement>("[data-resize-handle]");
  for (const h of Array.from(handles)) {
    if (h.dataset.splitId !== parentSplitId) continue;
    const r = h.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const orientation = h.dataset.orientation;
    const dist =
      orientation === "horizontal" ? Math.abs(x - cx) : Math.abs(y - cy);
    if (dist <= GAP_PROXIMITY_PX && (!best || dist < best.dist)) {
      best = { handle: h, dist };
    }
  }
  return best ? readGap(best.handle) : null;
}

/**
 * Outer-gap detection: if the leaf is the leftmost (or topmost) child
 * of its parent split and the pointer is within OUTER_GAP_PROXIMITY_PX
 * of that outer edge, target gap-index 0. Symmetric for last child.
 */
function resolveOuterGap(
  leafEl: HTMLElement,
  x: number,
  y: number,
  rect: DOMRect,
): Extract<HoveredDrop, { kind: "gap" }> | null {
  const splitEl = leafEl.closest<HTMLElement>("[data-split-id]");
  if (!splitEl) return null;
  const splitId = splitEl.dataset.splitId;
  if (!splitId) return null;
  // Walk forward in the split's children to determine this leaf's
  // position. The split DOM is: <splitContainer><motion.div leafA><Handle><motion.div leafB>...</splitContainer>.
  // Find the index of this leaf's wrapper among the split's direct
  // child motion.divs.
  const direct = Array.from(splitEl.children).filter((c) =>
    !(c instanceof HTMLElement) || c.dataset.resizeHandle === undefined,
  );
  const wrapper = leafEl.closest<HTMLElement>("[style*='flex']") ??
    leafEl.parentElement?.parentElement;
  if (!wrapper) return null;
  const idx = direct.indexOf(wrapper);
  if (idx === -1) return null;

  // Detect split direction from the first handle inside the split
  // (the same way LayoutRenderer wires them).
  const firstHandle = splitEl.querySelector<HTMLElement>(
    `[data-resize-handle][data-split-id="${cssEscape(splitId)}"]`,
  );
  const orientation =
    firstHandle?.dataset.orientation === "vertical" ? "vertical" : "horizontal";

  // Leftmost / topmost — outer gap is at index 0.
  const isFirst = idx === 0;
  const isLast = idx === direct.length - 1;

  if (orientation === "horizontal") {
    if (isFirst && x - rect.x <= OUTER_GAP_PROXIMITY_PX) {
      return { kind: "gap", splitId, insertIndex: 0, orientation };
    }
    if (isLast && rect.right - x <= OUTER_GAP_PROXIMITY_PX) {
      return {
        kind: "gap",
        splitId,
        insertIndex: direct.length,
        orientation,
      };
    }
  } else {
    if (isFirst && y - rect.y <= OUTER_GAP_PROXIMITY_PX) {
      return { kind: "gap", splitId, insertIndex: 0, orientation };
    }
    if (isLast && rect.bottom - y <= OUTER_GAP_PROXIMITY_PX) {
      return {
        kind: "gap",
        splitId,
        insertIndex: direct.length,
        orientation,
      };
    }
  }
  return null;
}

function readGap(
  handle: HTMLElement,
): Extract<HoveredDrop, { kind: "gap" }> | null {
  const splitId = handle.dataset.splitId;
  const idxStr = handle.dataset.gapIndex;
  const orientation = handle.dataset.orientation;
  if (!splitId || !idxStr) return null;
  if (orientation !== "horizontal" && orientation !== "vertical") return null;
  const insertIndex = parseInt(idxStr, 10);
  if (!Number.isFinite(insertIndex)) return null;
  return { kind: "gap", splitId, insertIndex, orientation };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function rectOf(r: DOMRect): Rect {
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

/**
 * Determine the dragged leaf's parent split id + its index within that
 * split. Used for no-op suppression on gap drops.
 */
function readSourceSlot(sourceEl: HTMLElement | null): {
  splitId: string | null;
  childIndex: number | null;
} {
  if (!sourceEl) return { splitId: null, childIndex: null };
  const splitEl = sourceEl.closest<HTMLElement>("[data-split-id]");
  if (!splitEl) return { splitId: null, childIndex: null };
  const splitId = splitEl.dataset.splitId ?? null;
  if (!splitId) return { splitId: null, childIndex: null };
  // Same wrapper-walk as resolveOuterGap.
  const direct = Array.from(splitEl.children).filter(
    (c) => !(c instanceof HTMLElement) || c.dataset.resizeHandle === undefined,
  );
  const wrapper =
    sourceEl.closest<HTMLElement>("[style*='flex']") ??
    sourceEl.parentElement?.parentElement;
  if (!wrapper) return { splitId, childIndex: null };
  const idx = direct.indexOf(wrapper);
  return { splitId, childIndex: idx === -1 ? null : idx };
}

function cssEscape(s: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(s);
  }
  return s;
}
