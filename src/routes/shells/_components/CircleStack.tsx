import type React from "react";

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  /** Pixel diameter of each child element. */
  size: number;
  /** How much each child slides over the previous one, in px. */
  overlap: number;
  /** Visible gap punched between adjacent children, in px. Defaults to 2. */
  gap?: number;
  /** Children render at exactly `size × size`. The wrapper clips to a circle,
   *  so square content (e.g. Jazzicon SVGs) is OK. */
  children: React.ReactNode[];
};

/**
 * Row of overlapping circular elements that uses a real CSS mask cutout
 * between each pair — not a painted ring. The underneath child gets a
 * radial mask that punches a circle out of itself where the next child
 * sits, so the panel/background behind shows through the gap.
 *
 * Compared to `ring-muted` outlines this reads cleanly on translucent
 * surfaces because no solid color is painted in the gap; what shows
 * through is whatever is actually behind the panel.
 */
export function CircleStack({
  size,
  overlap,
  gap = 2,
  children,
  style,
  ...rest
}: Props) {
  const step = size - overlap; // center-to-center distance
  const r = size / 2;
  const last = children.length - 1;

  return (
    <span {...rest} style={{ display: "inline-flex", ...style }}>
      {children.map((child, i) => {
        const isLast = i === last;
        // Cutout circle is centered on the next child (which sits at
        // x = step relative to this wrapper) and slightly larger than
        // its radius so a visible gap appears between them.
        const mask = isLast
          ? undefined
          : `radial-gradient(circle at ${r + step}px ${r}px, transparent ${r + gap}px, black ${r + gap + 1}px)`;
        return (
          <span
            key={i}
            style={{
              width: size,
              height: size,
              flex: "0 0 auto",
              borderRadius: 9999,
              overflow: "hidden",
              display: "inline-flex",
              marginLeft: i === 0 ? 0 : -overlap,
              maskImage: mask,
              WebkitMaskImage: mask,
            }}
          >
            {child}
          </span>
        );
      })}
    </span>
  );
}
