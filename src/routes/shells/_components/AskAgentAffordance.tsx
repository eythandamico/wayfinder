"use client";

import { useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { askAgent, type AskAgentPayload } from "../_lib/ask-agent";
import { ThinkingGlow } from "./ThinkingGlow";

/**
 * Hover-revealed "ask the agent about this" button + ThinkingGlow
 * halo. Shared affordance for any list row that wants the same
 * gut-check-style choreography:
 *   - row body grows a small spacer so the right-side numbers shift
 *     leftward on hover, opening a slot on the right edge
 *   - the Wayfinder button reveals in that slot
 *   - a real ThinkingGlow blooms in behind it from the right
 *
 * Consumer manages row-hover state (because Tailwind can't see
 * dynamic group-name strings at build time) and passes it via
 * `visible`. The same `visible` boolean gates the glow's WebGL rAF
 * so idle rows pay zero paint cost.
 *
 * Use `<AskAgentSpacer visible={...}>` inside the row body to push
 * the numbers leftward, and `<AskAgentAffordance .../>` as a
 * sibling on the row container — flex layout for the spacer, absolute
 * positioning for the button + glow.
 */

// Sized so the on-hover layout reads as balanced: the spacer
// pushes the numbers left far enough that the gap between numbers
// and the button matches the gap between the button and the row's
// right edge. The math has to account for the row body's gap-3
// (12px) between the numbers' flex-1 container and this spacer —
// that gap is invisible but consumes 12px of horizontal space.
//   spacer + flex-row gap = button_width + (gap left of button) +
//                          (gap right of button)
//   spacer + 12          = 36 + 12 + 12  → spacer = 48 ... wrong
// Actually the spacer doesn't need to cover the right-side button
// gap — the affordance's own pr-3 does. The spacer just needs to
// match the button width PLUS one 12px gap (the visible gap
// between numbers and the button left edge):
//   spacer = button_width + numbers_gap - flex_row_gap
//          = 36 + 12 - 12 = 36
// Both visible gaps then land at 12px.
const SPACER_OPEN_WIDTH_PX = 36;

export function AskAgentSpacer({ visible }: { visible: boolean }) {
  const style: CSSProperties = {
    width: visible ? SPACER_OPEN_WIDTH_PX : 0,
  };
  return (
    <div
      aria-hidden
      className="h-1 shrink-0 transition-[width] duration-200 ease-out"
      style={style}
    />
  );
}

export function AskAgentAffordance({
  payload,
  ariaLabel,
  visible,
}: {
  payload: AskAgentPayload;
  ariaLabel: string;
  /** True while the parent row is being hovered. Gates the
   *  affordance's opacity transition AND the ThinkingGlow's rAF. */
  visible: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute inset-y-0 right-0 flex items-center pr-3 transition-opacity duration-200 ease-out",
        visible
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
      )}
    >
      {/* Top-right ThinkingGlow — mint pool concentrated in the row's
          top-right corner so the bottom edge stays clean. This matters
          for rows that expand into a drawer: a U-shape (sides="both")
          puts an equally bright rise at the bottom-right corner, which
          reads as a horizontal seam where the drawer joins. The L
          variant (edge="right" + sides="left", which the UV rotation
          maps to the top corner) keeps the glow visually "hung from
          above" and lets the drawer flow underneath untouched.
          Brightness filter punches the halo against the hover bg. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-72 overflow-hidden rounded-md"
        style={{ filter: "brightness(1.25) saturate(1.1)" }}
      >
        <ThinkingGlow
          active={visible}
          edge="right"
          widthClass="w-full"
          sides="left"
        />
      </div>
      <AskAgentButton
        payload={payload}
        ariaLabel={ariaLabel}
        shimmerActive={visible}
      />
    </div>
  );
}

/**
 * Just the Wayfinder button — same shape language as the Gut Check
 * button. Exposed separately so surfaces without the row-shift
 * choreography (NewsPanel's action row, ChartPanel's header) can use
 * the consistent visual without the spacer + glow setup.
 *
 * `withHoverGlow` adds a small ThinkingGlow on hover behind the
 * button — useful for header / inline placements that want the
 * agentic accent without the full row treatment.
 */
export function AskAgentButton({
  payload,
  onClick,
  ariaLabel,
  withHoverGlow,
  size = "md",
  shimmerActive = true,
  label,
  variant = "brand",
  className,
  buttonProps,
}: {
  /** Default behavior: clicking dispatches an askAgent(payload).
   *  Omit when providing `onClick` instead. */
  payload?: AskAgentPayload;
  /** Override the default askAgent behavior. Use when the brand
   *  Wayfinder button needs to trigger something other than the
   *  agent prompt — e.g. opening a modal. Required if `payload` is
   *  omitted. */
  onClick?: () => void;
  ariaLabel: string;
  withHoverGlow?: boolean;
  size?: "sm" | "md" | "lg";
  /** Passthrough for any extra button-level attributes — e.g.
   *  `aria-busy`, `data-demo`. Kept as a separate prop so the
   *  component's primary props stay typed while still letting
   *  consumers like the Gut Check button attach state + selector
   *  hooks. */
  buttonProps?: Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "onClick" | "aria-label" | "type" | "style" | "className"
  > & {
    // Allow arbitrary data-* attributes (e.g. data-demo for the
    // recorder/E2E selector). ButtonHTMLAttributes only types a
    // narrow set of data-* aria-* fields by default.
    [key: `data-${string}`]: string | number | boolean | undefined;
  };
  /** When true, two quick shimmers sweep across the button, then a
   *  ~2.7s pause, then repeat — for as long as this stays true. The
   *  row affordance passes the row's hover state so shimmers only
   *  run while the user is engaged; always-visible inline
   *  placements (header, hero) default to true. */
  shimmerActive?: boolean;
  /** Text label instead of the Wayfinder icon. When provided, the
   *  button widens to fit the text and the brand mark is replaced
   *  by the label so the brand glass treatment can carry an
   *  explicit action verb. */
  label?: string;
  /** Visual treatment.
   *   - "brand" (default): dark popover + boxShadow inset edges +
   *     three-layer breathing glow + twin shimmer (the full Wayfinder
   *     glass identity). Used when the button is THE brand affordance
   *     on the surface it sits on.
   *   - "flat": solid white with dark text. Use when the surrounding
   *     surface already carries the brand glow (e.g. inside the
   *     ComposerToast), so the action button needs to contrast and
   *     pop OUT of the brand glass rather than blend into it. Skips
   *     all the glow/shimmer machinery — flat is flat.
   *   - "primary": solid brand mint with dark text. Same flat
   *     treatment as "flat" but with the primary color, for CTAs
   *     that should read as the affirmative action on a neutral
   *     surface (e.g. "Get notified" in the composer toast). */
  variant?: "brand" | "flat" | "primary";
  /** Extra classes merged onto the button element — use for layout
   *  overrides like `w-full` when the button needs to fill its
   *  parent (e.g. stacked CTAs in the ComposerToast). */
  className?: string;
}) {
  const isFlat = variant === "flat";
  const isPrimary = variant === "primary";
  // Both flat variants skip the glass+glow machinery; they share
  // the same simplified rendering path with different fill colors.
  const isSimple = isFlat || isPrimary;
  const [hovered, setHovered] = useState(false);
  const sizeClass = label
    ? size === "sm"
      ? "h-7 px-2.5"
      : size === "lg"
        ? "h-12 px-4"
        : "h-9 px-3.5"
    : size === "sm"
      ? "size-7"
      : size === "lg"
        ? "size-12"
        : "size-9";
  const iconSize = size === "sm" ? 14 : size === "lg" ? 28 : 20;
  const iconClass =
    size === "sm" ? "size-3.5" : size === "lg" ? "size-7" : "size-5";
  // Concentric corner sizing: bigger surface earns a bigger radius
  // so the glass edge keeps the same visual rhythm at every size.
  const roundedClass = size === "lg" ? "rounded-lg" : "rounded-md";
  return (
    <span
      className={cn("relative inline-flex", className && "flex w-full")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Outer halo space is now empty — hover glow moved inside the
          button (rendered as a child of <button>) so it haloes from
          within instead of wrapping. */}
      <button
        {...buttonProps}
        type="button"
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) {
            onClick();
          } else if (payload) {
            askAgent(payload);
          }
        }}
        style={
          isSimple
            ? undefined
            : {
                // Brand variant: layered box-shadow gives the button
                // "whole-object presence":
                //   1. Outer dark ring for definition against any bg
                //   2. White inset ring at the border for crisp glass edge
                //   3. Soft mint inset glow that bleeds INWARD from all
                //      four edges — bounds emit light, not just the corners.
                // The mint inset is the load-bearing layer for the "the
                // whole button is alive" read.
                boxShadow:
                  // Outer dark ring for definition against any bg.
                  "0 0 0 1px rgba(0,0,0,0.35), " +
                  // White inset rim at the border for the glass-edge read.
                  "inset 0 0 0 1px rgba(255,255,255,0.18), " +
                  // Mint insets — bottom + left + right edges. Tightened
                  // offsets + blur so the color hugs the perimeter
                  // instead of bleeding into the surface.
                  "inset 0 -4px 8px -3px color-mix(in oklch, var(--primary) 50%, transparent), " +
                  "inset 4px 0 8px -4px color-mix(in oklch, var(--primary) 32%, transparent), " +
                  "inset -4px 0 8px -4px color-mix(in oklch, var(--primary) 32%, transparent), " +
                  // Blue inset from top — matches the tighter mint
                  // footprint so the color band stays at the bound.
                  "inset 0 4px 8px -3px color-mix(in oklch, var(--signal) 48%, transparent)",
              }
        }
        className={cn(
          "group/wf-btn relative z-[1] inline-flex items-center justify-center overflow-hidden transition-[transform,background-color,filter] duration-150 ease-out active:scale-[0.95]",
          roundedClass,
          isPrimary
            ? "bg-primary hover:brightness-[1.04]"
            : isFlat
              ? "bg-white hover:bg-white/90"
              : "bg-popover backdrop-blur-md",
          sizeClass,
          className,
        )}
      >
        {/* Surface glow — three desynced layers mirror the shader's
            color model:
              • Layer 1 (4.2s breath): BLUE atmospheric base — fills
                the whole button with the shader's "central pool"
                color so blue, not mint, is the dominant identity.
              • Layer 2 (3.4s breath, +0.5s phase shift): MINT only
                at the bottom + bottom corners — matches the
                shader's "sides green" where mint hugs the edges,
                NOT the whole surface.
              • Layer 3 (2.8s breath, +1.1s phase shift): WHITE
                sparkle peak in the upper-mid — mimics the shader's
                "pool highlights" where noise crests reach white.
            Three independent rhythms cross-fade so the surface
            never lands at uniform color — gives the visual sense
            of flowing currents the shader has via noise. Gated on
            shimmerActive; CSS not WebGL to stay under the browser
            context limit. */}
        {!isSimple && shimmerActive && (
          <>
            {/* Layer 2: mint at bottom edge + bottom corners —
                the shader's "sides green". No blue base layer
                anymore: the dark popover bg shows through, and the
                blue lives in the boxShadow inset stack alongside
                the mint, matching the shader's pure-color edge
                pose. */}
            <motion.span
              aria-hidden
              className={`pointer-events-none absolute inset-0 overflow-hidden ${roundedClass}`}
              style={{
                background:
                  // Mint pool from below — primary brand pose
                  "radial-gradient(ellipse 130% 70% at 50% 110%, color-mix(in oklch, var(--primary) 50%, transparent) 0%, color-mix(in oklch, var(--primary) 18%, transparent) 35%, transparent 70%), " +
                  // Bottom-left corner accent
                  "radial-gradient(ellipse 50% 90% at 0% 100%, color-mix(in oklch, var(--primary) 35%, transparent) 0%, transparent 65%), " +
                  // Bottom-right corner accent
                  "radial-gradient(ellipse 50% 90% at 100% 100%, color-mix(in oklch, var(--primary) 35%, transparent) 0%, transparent 65%)",
              }}
              initial={{ opacity: 0.8 }}
              animate={{ opacity: [0.8, 1, 0.8] }}
              transition={{
                duration: 3.4,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
            />
            {/* Layer 3: white sparkle peak in the upper-mid —
                the shader's "pool highlights" */}
            <motion.span
              aria-hidden
              className={`pointer-events-none absolute inset-0 overflow-hidden ${roundedClass}`}
              style={{
                background:
                  "radial-gradient(ellipse 50% 35% at 50% 30%, rgba(255,255,255,0.35) 0%, transparent 80%)",
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.7, 0] }}
              transition={{
                duration: 3.0,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 1.1,
              }}
            />
          </>
        )}
        {/* Hover glow — two stacked ThinkingGlows inside the button,
            one anchored at the bottom and one at the top, both with
            sides="both". Together they paint glow on all four edges
            (bottom edge + bottom-corner rises + top edge + top-corner
            rises). Brightness filter punches the halo so it reads
            against the dark button bg. Gated on `withHoverGlow` so
            only consumers that want the heavy hover treatment pay
            the WebGL cost. */}
        {withHoverGlow && (
          <span
            aria-hidden
            className={`pointer-events-none absolute inset-0 overflow-hidden ${roundedClass}`}
            style={{ filter: "brightness(1.4) saturate(1.2)" }}
          >
            <ThinkingGlow
              active={hovered}
              edge="bottom"
              heightClass="h-full"
              sides="both"
            />
            <ThinkingGlow
              active={hovered}
              edge="top"
              heightClass="h-full"
              sides="both"
            />
          </span>
        )}
        {/* Inner top highlight — 1px gradient line that gives the
            surface a glass-edge read. Sits above the surface glow,
            below the shimmer + icon. Skipped for flat (no glass). */}
        {!isSimple && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-white/35 to-transparent"
          />
        )}
        {/* Twin shimmer — two back-to-back sweeps with a long pause,
            looped infinitely while shimmerActive. Diagonal skew +
            soft white gradient reads like polished glass catching
            light. Subdued opacity peak (0.4) keeps the effect from
            competing with the row content. Cycle is one motion
            animate{} with explicit keyframe times: sweep1 (0–20%) +
            sweep2 (20–40%) + pause (40–100%) over 4.5s total.
            Only mounted when shimmerActive so unhovered rows pay
            zero animation cost. */}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-0 overflow-hidden ${roundedClass}`}
        >
          {!isSimple && shimmerActive && (
            <motion.span
              className="absolute -inset-y-2"
              style={{
                width: "60%",
                background:
                  "linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
                transform: "skewX(-14deg)",
              }}
              initial={{ x: "-180%", opacity: 0 }}
              animate={{
                x: ["-180%", "200%", "-180%", "200%"],
                opacity: [0, 0.4, 0, 0, 0.4, 0],
              }}
              transition={{
                duration: 4.5,
                ease: [0.4, 0, 0.2, 1],
                x: { times: [0, 0.2, 0.2, 0.4], duration: 4.5 },
                opacity: {
                  times: [0, 0.1, 0.2, 0.2, 0.3, 0.4],
                  duration: 4.5,
                },
                repeat: Infinity,
                repeatType: "loop",
              }}
            />
          )}
        </span>
        {label ? (
          <span
            className={cn(
              "relative whitespace-nowrap text-body font-semibold",
              isPrimary
                ? "text-primary-foreground"
                : isFlat
                  ? "text-neutral-950"
                  : "text-foreground",
            )}
            style={
              // Backlight only on the brand glass variant — keeps the
              // label looking lit by the pool-highlight peak. The
              // flat / primary variants need no glow; the dark text
              // reads against the solid fill directly.
              isSimple
                ? undefined
                : {
                    textShadow:
                      "0 0 6px rgba(255,255,255,0.35), 0 1px 2px rgba(0,0,0,0.55)",
                  }
            }
          >
            {label}
          </span>
        ) : (
          <img
            src="/brand/wayfinder-icon-white.png"
            alt=""
            width={iconSize}
            height={iconSize}
            // Soft white backlight + dark shadow combo. White matches
            // the shader's "pool highlight" peaks, so the icon reads
            // as lit by the central pool's brightest moment rather
            // than tinted by the mint edges. Dark shadow underneath
            // keeps the mark legible against the blue/white field.
            style={{
              filter:
                "drop-shadow(0 0 5px rgba(255,255,255,0.45)) " +
                "drop-shadow(0 1px 2px rgba(0,0,0,0.55))",
            }}
            className={cn("relative select-none", iconClass)}
            aria-hidden
          />
        )}
      </button>
    </span>
  );
}
