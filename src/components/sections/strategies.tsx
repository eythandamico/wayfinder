import Link from "next/link";
import {
  Button,
  PageSection,
  SectionHeader,
  Stack,
  Surface,
} from "@/components/ds";

export function Strategies() {
  return (
    <PageSection>
      <div className="grid gap-14 md:grid-cols-[1.05fr_1fr] md:items-center">
        <Stack gap="lg">
          <SectionHeader
            eyebrow="Strategies"
            accent="amber"
            title="Automate your yield, with guardrails."
            description="Automated yield templates. Personal vaults with policies, gas management, and real-time execution."
          />
          <div>
            <Button
              size="sm"
              variant="ghost"
              render={<Link href="/strategies" />}
            >
              Explore All Strategies →
            </Button>
          </div>
        </Stack>
        <StrategiesVisual />
      </div>
    </PageSection>
  );
}

function StrategiesVisual() {
  const rows = [
    { label: "stETH Looping", apy: "14.2%", risk: "Moderate" },
    { label: "USDC Delta Neutral", apy: "9.7%", risk: "Low" },
    { label: "BTC Basis Trade", apy: "11.4%", risk: "Moderate" },
    { label: "EIGEN Restake", apy: "22.8%", risk: "Elevated" },
  ];
  const riskTone: Record<string, string> = {
    Low: "text-primary",
    Moderate: "text-foreground/80",
    Elevated: "text-amber-300",
  };
  return (
    <Surface radius="2xl" padding="md">
      <div className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex items-center justify-between pb-4">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          <span className="relative flex size-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative size-1.5 rounded-full bg-primary" />
          </span>
          Strategies · Live
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          4 active
        </span>
      </div>
      <ul className="relative flex flex-col">
        {rows.map((r) => (
          <li
            key={r.label}
            className="group/row flex items-center justify-between gap-4 rounded-xl px-3 py-3.5 -mx-3 transition-colors hover:bg-card"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-lg bg-background/60 text-[10px] font-mono text-muted-foreground"
              >
                {r.label.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-sm font-medium">{r.label}</span>
            </div>
            <div className="flex items-center gap-6 font-mono text-xs">
              <span
                className={`font-heading text-base font-semibold tabular-nums tracking-tight ${
                  riskTone[r.risk] ?? "text-foreground"
                }`}
              >
                {r.apy}
              </span>
              <span className="text-muted-foreground">{r.risk}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="relative mt-5 flex items-center justify-between px-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          Total Net APY
        </span>
        <span className="font-heading text-xl font-semibold tabular-nums text-primary">
          14.52%
        </span>
      </div>
    </Surface>
  );
}
