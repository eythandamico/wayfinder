import Link from "next/link";
import {
  Button,
  Card,
  CardContent,
  PageSection,
  Row,
  SectionHeader,
} from "@/components/ds";

type Pack = {
  initial: string;
  name: string;
  description: string;
  tags: string[];
  installs: string;
  cost: string;
  href: string;
};

const packs: Pack[] = [
  {
    initial: "S",
    name: "Spread Radar Reference",
    description:
      "Clusters a user-defined asset universe, enumerates spread candidates, and surfaces a validated relative-value trade.",
    tags: ["spread-radar", "relative-value"],
    installs: "30",
    cost: "0.2 PROMPT",
    href: "/shells?prompt=install%20pack%20spread-radar-reference",
  },
  {
    initial: "O",
    name: "Oil Macro Hedge",
    description:
      "Bearish oil via Polymarket WTI + ETH short on Hyperliquid, with monthly rollovers.",
    tags: ["polymarket", "macrohedge"],
    installs: "20",
    cost: "2 PROMPT",
    href: "/shells?prompt=install%20pack%20oil-macro-hedge",
  },
  {
    initial: "V",
    name: "VIRTUAL DN Test Pack",
    description: "Test pack for on-chain publish + bond flow.",
    tags: ["strategy", "delta-neutral"],
    installs: "00",
    cost: "0 PROMPT",
    href: "/shells?prompt=install%20pack%20virtual-delta-neutral-test",
  },
];

export function Discovery() {
  return (
    <PageSection>
      <div className="flex flex-col gap-10 md:flex-row md:items-end md:justify-between">
        <SectionHeader
          title="Discover, bond, install."
          description="Versioned, bondable bundles. Built on Base's on-chain trust system."
        />
        <Row gap="sm" wrap>
          <Button size="sm" render={<Link href="/packs" />}>
            Explore Hub
          </Button>
          <Button size="sm" variant="ghost" render={<Link href="/packs/rewards" />}>
            Rewards →
          </Button>
        </Row>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
        {packs.map((p) => (
          <Card key={p.name} className="h-full">
            <CardContent className="flex h-full flex-col gap-5">
              {/* Header: muted avatar + minimal status */}
              <div className="flex items-start justify-between">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 font-mono text-[12px] font-semibold text-primary">
                  {p.initial}
                </div>
                <span
                  className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                  aria-label="Active"
                >
                  <span className="size-1.5 rounded-full bg-primary" />
                  Active
                </span>
              </div>

              {/* Primary: title dominates */}
              <div className="flex flex-col gap-2">
                <h3 className="font-heading text-[1.375rem] font-semibold leading-[1.15] text-foreground">
                  {p.name}
                </h3>
                <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                  {p.description}
                </p>

                {/* Tags grouped with description, as pills */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-foreground/80"
                    >
                      <span className="size-1 rounded-full bg-foreground/40" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer: subtle divider, muted meta, clear CTA */}
              <div className="mt-auto flex items-center justify-between border-t border-white/[0.06] pt-4">
                <div className="flex items-baseline gap-2 font-mono text-[11px] uppercase tracking-wider tabular-nums text-muted-foreground">
                  <span>{p.installs} installs</span>
                  <span aria-hidden>·</span>
                  <span className="text-foreground/85">{p.cost}</span>
                </div>
                <Button
                  size="xs"
                  variant="ghost"
                  render={<Link href={p.href} />}
                >
                  Install →
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PageSection>
  );
}
