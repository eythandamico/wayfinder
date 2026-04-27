import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ACCENT_STYLES, type Accent } from "./accent";

type StackCardProps = {
  href: string;
  accent?: Accent;
  eyebrow: string;
  title: string;
  /**
   * The mockup art. In `portrait` layout it renders as a dimmed
   * background texture; in `wide` layout it fills the right half of
   * the card at full opacity.
   */
  visual: ReactNode;
  footerIcon?: ReactNode;
  footerText?: string;
  /**
   * `portrait` (default) — square card, copy pinned to bottom, art as
   * background texture. `wide` — 2:1 card, copy-left / art-right split.
   */
  layout?: "portrait" | "wide";
  className?: string;
};

/**
 * Polymarket-style marketing card. Accent color drives the eyebrow and
 * the soft top-right glow. Supports a portrait (square) and a wide
 * (2:1, split layout) variant.
 */
export function StackCard({
  href,
  accent = "mint",
  eyebrow,
  title,
  visual,
  footerIcon,
  footerText,
  layout = "portrait",
  className,
}: StackCardProps) {
  const a = ACCENT_STYLES[accent];
  const wide = layout === "wide";

  const copy = (
    <>
      <span
        className={cn(
          "font-mono text-[13px] uppercase tracking-[0.2em]",
          a.text,
        )}
      >
        {eyebrow}
      </span>
      <h3 className="max-w-md font-heading text-[clamp(1.625rem,2.25vw,2.25rem)] font-semibold leading-[1.15] text-balance text-foreground">
        {title}
      </h3>
      {footerText ? (
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          {footerIcon}
          <span>{footerText}</span>
        </div>
      ) : null}
    </>
  );

  return (
    <Link
      href={href}
      className={cn(
        "group/stack relative isolate overflow-hidden rounded-3xl bg-card ring-1 ring-inset ring-white/[0.06] transition-colors hover:ring-white/[0.1]",
        wide ? "grid aspect-[2/1] grid-cols-2" : "flex flex-col",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-24 -top-24 size-72 rounded-full blur-3xl md:opacity-80",
          a.glow,
        )}
      />

      {wide ? (
        <>
          <div className="relative z-10 flex flex-col justify-end gap-4 p-10 md:p-14">
            {copy}
          </div>
          <div className="relative overflow-hidden border-l border-white/[0.06]">
            {visual}
          </div>
        </>
      ) : (
        <>
          <div className="relative aspect-[4/3] overflow-hidden">
            {visual}
          </div>
          <div className="relative flex flex-col gap-3 p-7">{copy}</div>
        </>
      )}
    </Link>
  );
}
