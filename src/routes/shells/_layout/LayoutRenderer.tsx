"use client";

import { useRef, type Dispatch } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useDragApi } from "./DragContext";
import { PanelChrome } from "./PanelChrome";
import { PANEL_REGISTRY } from "./registry";
import { ResizeHandle } from "./ResizeHandle";
import type {
  LayoutAction,
  LayoutNode,
  LeafNode,
  PanelInstance,
  SplitNode,
} from "./types";

// FLIP/layout uses a tight bounce-free spring; opacity+scale on
// mount/exit use the project's drawer ease to match the rest of the
// shell. bounce: 0 per the project's icon-animation guidance.
const PANEL_TRANSITION = {
  layout: { type: "spring", duration: 0.35, bounce: 0 },
  opacity: { duration: 0.22, ease: [0.32, 0.72, 0, 1] },
  scale: { duration: 0.22, ease: [0.32, 0.72, 0, 1] },
} as const;

/**
 * Walks a LayoutNode tree and renders it. Splits become flex containers
 * with ResizeHandles between children; leaves become panels via the
 * registry.
 *
 * Phase 1 deliberately doesn't render title bars yet — same visual as
 * the hardcoded shell. Title bars + close + drag land in phase 2/3.
 */
export function LayoutRenderer({
  node,
  dispatch,
}: {
  node: LayoutNode;
  dispatch: Dispatch<LayoutAction>;
}) {
  if (node.kind === "leaf") return <LeafView node={node} />;
  return <SplitView node={node} dispatch={dispatch} />;
}

/* ------------------------------------------------------------------ */
/*  Split — flex row/col with ResizeHandles between children          */
/* ------------------------------------------------------------------ */

function SplitView({
  node,
  dispatch,
}: {
  node: SplitNode;
  dispatch: Dispatch<LayoutAction>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const onDrag = (handleIdx: number) => (deltaPx: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dim = node.direction === "horizontal" ? rect.width : rect.height;
    if (!dim) return;
    dispatch({
      type: "resize",
      splitId: node.id,
      handleIdx,
      deltaPct: (deltaPx / dim) * 100,
    });
  };

  // Vertical splits respect each leaf's panel-registry maxHeight: a
  // capped child gets a fixed pixel basis, and its sibling(s) switch
  // from basis-based sizing to grow-based so they fill the freed
  // space. Horizontal splits ignore the cap (it's a height constraint,
  // not a width one) and behave the same as before.
  const isVertical = node.direction === "vertical";
  const caps = node.children.map((c) =>
    isVertical ? getLeafCap(c) : undefined,
  );
  const anyCapped = caps.some((c) => c !== undefined);

  // FLIP layout animations only fire when the structure changes (add /
  // remove / reorder), not on every resize tick. Hashing the IDs gives
  // motion a stable signal so resize-drag stays 1:1 with the cursor.
  const layoutDep = node.children.map((c) => c.id).join("|");

  return (
    <div
      ref={containerRef}
      data-split-id={node.id}
      className={cn(
        "flex min-h-0 min-w-0 flex-1",
        node.direction === "horizontal" ? "flex-row" : "flex-col",
      )}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {node.children.flatMap((child, i) => {
          const cap = caps[i];
          const childStyle: React.CSSProperties =
            cap !== undefined
              ? { flex: `0 0 ${cap}px` }
              : anyCapped
                ? { flex: `${node.sizes[i]} 1 0%` }
                : {
                    flexBasis: `${node.sizes[i]}%`,
                    flexShrink: 1,
                    flexGrow: 0,
                  };
          const items: React.ReactNode[] = [];
          if (i > 0) {
            // ResizeHandle stays outside the motion wrapper so it never
            // gets caught in mount/exit animations — it's structural
            // chrome, not panel content.
            items.push(
              <ResizeHandle
                key={`handle-${child.id}`}
                orientation={
                  node.direction === "horizontal" ? "horizontal" : "vertical"
                }
                onDrag={onDrag(i - 1)}
                splitId={node.id}
                gapIndex={i}
              />,
            );
          }
          items.push(
            <motion.div
              key={child.id}
              layout
              layoutDependency={layoutDep}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={PANEL_TRANSITION}
              style={childStyle}
              className="flex min-h-0 min-w-0"
            >
              <LayoutRenderer node={child} dispatch={dispatch} />
            </motion.div>,
          );
          return items;
        })}
      </AnimatePresence>
    </div>
  );
}

/** Recursively read the maxHeight cap from a leaf's active panel.
 *  Returns undefined for splits or for panels without a cap, which
 *  signals "size by basis as before". */
function getLeafCap(node: LayoutNode): number | undefined {
  if (node.kind !== "leaf") return undefined;
  const active =
    node.panels.find((p) => p.id === node.activePanelId) ?? node.panels[0];
  return active ? PANEL_REGISTRY[active.type]?.maxHeight : undefined;
}

/* ------------------------------------------------------------------ */
/*  Leaf — the panel region                                            */
/* ------------------------------------------------------------------ */

function LeafView({ node }: { node: LeafNode }) {
  const activePanel =
    node.panels.find((p) => p.id === node.activePanelId) ?? node.panels[0];
  const drag = useDragApi();

  const cap = activePanel
    ? PANEL_REGISTRY[activePanel.type]?.maxHeight
    : undefined;

  // Drag-state-driven visual treatments. One leaf cycles through up
  // to four states:
  //   - isSource: this leaf owns the panel currently being dragged
  //     → lift treatment (slight scale, opacity, shadow)
  //   - isHoveredTarget: this leaf is the active drop target
  //     → bright primary ring
  //   - isPotentialTarget: a drag is in flight, this leaf isn't the
  //     source → faint white ring so the user reads it as "available"
  //   - isJustLanded: a drop just landed here → 600ms primary glow
  //     confirmation that fades out
  const isDragging = drag.state?.phase === "dragging";
  const isSource =
    isDragging && drag.state?.sourceRegionId === node.id;
  const isPotentialTarget = isDragging && !isSource;
  const hovered = drag.state?.hovered;
  const isHoveredTarget =
    isPotentialTarget &&
    hovered?.kind === "edge" &&
    hovered.regionId === node.id;
  const isJustLanded = drag.justLanded?.regionId === node.id;

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      <motion.div
        data-leaf-id={node.id}
        style={cap ? { maxHeight: cap } : undefined}
        animate={{
          // Source panel lifts very subtly — reads as "this picked
          // up off the surface."
          scale: isSource ? 0.985 : 1,
          opacity: isSource ? 0.5 : 1,
        }}
        transition={{
          duration: 0.18,
          ease: [0.32, 0.72, 0, 1],
        }}
        className={cn(
          "relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg bg-surface-1 ring-1 ring-inset transition-[box-shadow,--tw-ring-color] duration-200 ease-out",
          isHoveredTarget && "ring-primary/30",
          !isHoveredTarget && isPotentialTarget && "ring-white/[0.10]",
          !isPotentialTarget && !isJustLanded && "ring-white/[0.06]",
          isJustLanded && "ring-primary/30",
          isSource &&
            "shadow-[0_24px_60px_-20px_color-mix(in_oklch,var(--primary)_45%,transparent)]",
        )}
      >
        {/* Drop-start pulse — every valid target briefly illuminates
            on drag arm so the user reads "every panel is a target."
            One-shot opacity decay; remounts on each new drag because
            isPotentialTarget toggles. */}
        {isPotentialTarget && !isHoveredTarget && (
          <motion.span
            key="drag-start-pulse"
            aria-hidden
            initial={{ opacity: 0.55 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-inset ring-primary/30"
          />
        )}

        {/* Confirmation glow — a single ring-flash on the just-
            landed panel that decays over JUST_LANDED_MS. */}
        {isJustLanded && (
          <motion.span
            aria-hidden
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-inset ring-primary"
          />
        )}
        {activePanel ? (
          (() => {
            // Pull the panel's optional HeaderActions component out of
            // the registry so PanelChrome's right-side `actions` slot
            // sits next to the panel title — e.g. the chart's crown
            // toggle lives next to "Chart" in the chrome strip rather
            // than inside the chart body.
            const desc = PANEL_REGISTRY[activePanel.type];
            const HeaderActions = desc?.HeaderActions;
            return (
              <PanelChrome
                region={node}
                panel={activePanel}
                actions={
                  HeaderActions ? <HeaderActions panel={activePanel} /> : undefined
                }
              >
                <PanelHost panel={activePanel} />
              </PanelChrome>
            );
          })()
        ) : (
          <EmptyRegion />
        )}
      </motion.div>
    </div>
  );
}

function PanelHost({ panel }: { panel: PanelInstance }) {
  const desc = PANEL_REGISTRY[panel.type];
  if (!desc) return <UnknownPanel type={panel.type} />;
  const Component = desc.Component;
  return <Component panel={panel} />;
}

/* ------------------------------------------------------------------ */
/*  Fallbacks                                                          */
/* ------------------------------------------------------------------ */

function EmptyRegion() {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg bg-surface-1 ring-1 ring-inset ring-white/[0.06] text-body text-muted-foreground">
      Empty region
    </div>
  );
}

function UnknownPanel({ type }: { type: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg bg-surface-1 ring-1 ring-inset ring-white/[0.06] text-body text-tone-down">
      Unknown panel: {type}
    </div>
  );
}
