import { cn } from "@/lib/utils";
import { Eyebrow } from "./eyebrow";
import type { Accent } from "./accent";

type SectionHeaderProps = {
  eyebrow?: string;
  accent?: Accent;
  title: string;
  description?: string;
  /**
   * Title scale. Defaults to `section` (big h2).
   * Use `compact` for side-by-side layouts where the title shares a row.
   */
  size?: "section" | "compact";
  /**
   * Horizontal alignment. `start` (default) matches the editorial grid;
   * `center` is used for hero-style centered sections.
   */
  align?: "start" | "center";
  className?: string;
};

const TITLE_SIZES = {
  section:
    "font-heading text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] text-balance",
  compact:
    "font-heading text-[clamp(1.5rem,2.5vw,2.25rem)] font-semibold leading-[1.08] text-balance",
} as const;

const ALIGNS = {
  start: "",
  center: "items-center text-center",
} as const;

/**
 * Editorial section header — eyebrow + h2 + optional description.
 * No pill chrome, no border accents; relies purely on typography.
 */
export function SectionHeader({
  eyebrow,
  accent,
  title,
  description,
  size = "section",
  align = "start",
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-6", ALIGNS[align], className)}>
      {eyebrow ? <Eyebrow accent={accent}>{eyebrow}</Eyebrow> : null}
      <h2 className={cn("max-w-3xl", TITLE_SIZES[size])}>{title}</h2>
      {description ? (
        <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}
