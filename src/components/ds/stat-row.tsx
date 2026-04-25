import { cn } from "@/lib/utils";

export type Stat = {
  label: string;
  value: string;
};

type StatRowProps = {
  stats: Stat[];
  className?: string;
  /**
   * `flow` — flex-wrap row with large gap, used in hero.
   * `grid` — equal-width grid, used in in-section metric blocks.
   */
  layout?: "flow" | "grid";
};

export function StatRow({ stats, className, layout = "flow" }: StatRowProps) {
  return (
    <dl
      className={cn(
        layout === "flow"
          ? "flex flex-wrap items-start gap-x-14 gap-y-8"
          : "grid grid-cols-2 gap-6 md:grid-cols-4",
        className,
      )}
    >
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-2">
          <dt className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
            {s.label}
          </dt>
          <dd className="font-heading text-3xl font-semibold tabular-nums tracking-tight md:text-4xl">
            {s.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
