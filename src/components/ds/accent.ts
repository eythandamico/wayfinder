/**
 * Accent system — single source of truth for per-card and per-section
 * accent color usage. Every component that accepts an accent (StackCard,
 * SectionHeader, Eyebrow, glow tokens) reads from this map. To add a new
 * accent, add a key here and the corresponding --wf-accent-* tokens in
 * tokens.css.
 */

export type Accent = "mint" | "amber" | "sky" | "violet";

export const ACCENTS: readonly Accent[] = ["mint", "amber", "sky", "violet"];

type AccentTokens = {
  /** Foreground for eyebrows, small labels, inline keywords */
  text: string;
  /** Diffuse glow fill — use with blur-3xl backgrounds */
  glow: string;
  /** Filled dot / marker background */
  dot: string;
  /** Soft tint background — buttons, chips, hover states */
  soft: string;
};

/**
 * Resolves to Tailwind arbitrary-value class fragments backed by
 * --wf-accent-* CSS vars from tokens.css.
 */
export const ACCENT_STYLES: Record<Accent, AccentTokens> = {
  mint: {
    text: "text-[var(--wf-accent-mint)]",
    glow: "bg-[var(--wf-accent-mint-soft)]",
    dot: "bg-[var(--wf-accent-mint)]",
    soft: "bg-[var(--wf-accent-mint-soft)]",
  },
  amber: {
    text: "text-[var(--wf-accent-amber)]",
    glow: "bg-[var(--wf-accent-amber-soft)]",
    dot: "bg-[var(--wf-accent-amber)]",
    soft: "bg-[var(--wf-accent-amber-soft)]",
  },
  sky: {
    text: "text-[var(--wf-accent-sky)]",
    glow: "bg-[var(--wf-accent-sky-soft)]",
    dot: "bg-[var(--wf-accent-sky)]",
    soft: "bg-[var(--wf-accent-sky-soft)]",
  },
  violet: {
    text: "text-[var(--wf-accent-violet)]",
    glow: "bg-[var(--wf-accent-violet-soft)]",
    dot: "bg-[var(--wf-accent-violet)]",
    soft: "bg-[var(--wf-accent-violet-soft)]",
  },
};
