import Link from "next/link";
import {
  ACCENTS,
  Badge,
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Divider,
  Eyebrow,
  MockCard,
  PageSection,
  Row,
  SectionHeader,
  Stack,
  StackCard,
  StatRow,
  Surface,
  type Accent,
} from "@/components/ds";
import { SiteHeader } from "@/components/site-header";

const BUTTON_VARIANTS = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
] as const;

const BUTTON_SIZES = ["xs", "sm", "default", "lg"] as const;

const BADGE_VARIANTS = [
  "default",
  "secondary",
  "destructive",
  "outline",
  "ghost",
  "link",
] as const;

const STACK_GAPS = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;

const SECTIONS = [
  { id: "tokens", label: "Tokens" },
  { id: "typography", label: "Typography" },
  { id: "layout", label: "Layout" },
  { id: "interactive", label: "Interactive" },
  { id: "containers", label: "Containers" },
  { id: "marketing", label: "Marketing" },
];

export default function DSShowcasePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <ShowcaseNav />

        <PageSection pad="lg">
          <Stack gap="md">
            <Eyebrow accent="mint">Wayfinder DS</Eyebrow>
            <h1 className="font-heading text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.0] tracking-tight text-balance">
              Design system and components.
            </h1>
            <p className="max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Every primitive consumed by the landing page. Edit the source in{" "}
              <code className="font-mono text-[13px] text-foreground/80">
                src/components/ds/
              </code>{" "}
              — changes hot-reload here first, then propagate to production
              surfaces.
            </p>
          </Stack>
        </PageSection>

        <TokensSection />
        <TypographySection />
        <LayoutSection />
        <InteractiveSection />
        <ContainersSection />
        <MarketingSection />

        <PageSection pad="sm">
          <Divider spacing="none" />
          <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Back to{" "}
            <Link href="/" className="text-foreground hover:text-primary">
              landing
            </Link>
          </p>
        </PageSection>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shell                                                              */
/* ------------------------------------------------------------------ */

function ShowcaseNav() {
  return (
    <nav
      aria-label="Design system sections"
      className="sticky top-[65px] z-20 border-b border-border/40 bg-background/70 backdrop-blur-xl"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function Block({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <PageSection as="section" id={id} pad="default">
      <Stack gap="2xl">
        <SectionHeader title={title} description={description} size="compact" />
        <Stack gap="xl">{children}</Stack>
      </Stack>
    </PageSection>
  );
}

function Example({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Stack gap="sm">
      <Row justify="between" align="baseline" gap="md" wrap>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-foreground/90">
          {label}
        </span>
        {hint ? (
          <span className="font-mono text-[10.5px] text-muted-foreground">
            {hint}
          </span>
        ) : null}
      </Row>
      <Surface tone="card" padding="md" radius="xl">
        {children}
      </Surface>
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/*  Tokens                                                              */
/* ------------------------------------------------------------------ */

function TokensSection() {
  return (
    <Block
      id="tokens"
      title="Tokens."
      description="Accent palette and shadows defined in src/components/ds/tokens.css. Color tokens for background / card / primary / border / muted live in globals.css (Tailwind @theme)."
    >
      <Example label="Accent palette" hint="--wf-accent-*">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {ACCENTS.map((accent) => (
            <AccentSwatch key={accent} accent={accent} />
          ))}
        </div>
      </Example>
      <Example label="Shadows" hint="--wf-shadow-*">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <ShadowSwatch
            name="shadow-card"
            shadow="var(--wf-shadow-card)"
            caption="Subtle card elevation"
          />
          <ShadowSwatch
            name="shadow-mockup"
            shadow="var(--wf-shadow-mockup)"
            caption="Floating mockup cards"
          />
          <ShadowSwatch
            name="shadow-cta"
            shadow="var(--wf-shadow-cta)"
            caption="Primary CTA glow"
          />
        </div>
      </Example>
    </Block>
  );
}

function AccentSwatch({ accent }: { accent: Accent }) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative h-20 overflow-hidden rounded-xl"
        style={{ background: `var(--wf-accent-${accent})` }}
      >
        <div
          className="absolute inset-x-0 bottom-0 h-1/2"
          style={{ background: `var(--wf-accent-${accent}-soft)` }}
        />
      </div>
      <div className="flex flex-col gap-0.5 font-mono text-[11px]">
        <span className="uppercase tracking-[0.2em] text-foreground">
          {accent}
        </span>
        <span className="text-muted-foreground">--wf-accent-{accent}</span>
      </div>
    </div>
  );
}

function ShadowSwatch({
  name,
  shadow,
  caption,
}: {
  name: string;
  shadow: string;
  caption: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex h-28 items-center justify-center rounded-xl bg-card"
        style={{ boxShadow: shadow }}
      >
        <span className="font-mono text-[11px] text-muted-foreground">
          {name}
        </span>
      </div>
      <span className="font-mono text-[11px] text-muted-foreground">
        {caption}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Typography                                                          */
/* ------------------------------------------------------------------ */

function TypographySection() {
  return (
    <Block
      id="typography"
      title="Typography."
      description="Kickers, section headers, and stat clusters. Editorial — no pill chrome, no badge borders."
    >
      <Example label="Eyebrow" hint="<Eyebrow accent={…}>">
        <Stack gap="md">
          <Eyebrow>Default · muted</Eyebrow>
          {ACCENTS.map((accent) => (
            <Eyebrow key={accent} accent={accent}>
              Accent · {accent}
            </Eyebrow>
          ))}
        </Stack>
      </Example>

      <Example label="SectionHeader · section" hint='size="section"'>
        <SectionHeader
          eyebrow="The Stack"
          title="Four ways to run Wayfinder."
          description="Lightweight editorial lead-in; no border, no pill, no sparkle."
        />
      </Example>

      <Example label="SectionHeader · compact" hint='size="compact"'>
        <SectionHeader
          eyebrow="Strategies"
          accent="amber"
          title="Automate your yield, with guardrails."
          description="Compact variant — used in two-column layouts where the section shares a row with a visual."
          size="compact"
        />
      </Example>

      <Example label="StatRow · flow" hint='layout="flow"'>
        <StatRow
          stats={[
            { label: "Volume Routed", value: "$8.4B" },
            { label: "Chains", value: "40+" },
            { label: "Active Agents", value: "12,740" },
            { label: "Avg Latency", value: "290ms" },
          ]}
        />
      </Example>

      <Example label="StatRow · grid" hint='layout="grid"'>
        <StatRow
          layout="grid"
          stats={[
            { label: "Total Volume", value: "$8.4B" },
            { label: "Supported Chains", value: "40+" },
            { label: "Active Agents", value: "12,740" },
            { label: "Median Latency", value: "290ms" },
          ]}
        />
      </Example>
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/*  Layout                                                              */
/* ------------------------------------------------------------------ */

function LayoutSection() {
  return (
    <Block
      id="layout"
      title="Layout primitives."
      description="Stack, Row, Surface, PageSection, Divider. Use these before reaching for raw flex containers."
    >
      <Example label="Stack · gap scale" hint='<Stack gap="…">'>
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
          {STACK_GAPS.map((gap) => (
            <Stack key={gap} gap={gap}>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
                gap={gap}
              </span>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-3 w-full rounded-sm bg-foreground/10"
                />
              ))}
            </Stack>
          ))}
        </div>
      </Example>

      <Example label="Row · justify" hint='<Row justify="…">'>
        <Stack gap="md">
          {(["start", "center", "between", "end"] as const).map((justify) => (
            <Row key={justify} justify={justify}>
              <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
                {justify}
              </span>
              <span className="rounded-sm bg-foreground/10 px-3 py-1 font-mono text-[11px]">
                A
              </span>
              <span className="rounded-sm bg-foreground/10 px-3 py-1 font-mono text-[11px]">
                B
              </span>
              <span className="rounded-sm bg-foreground/10 px-3 py-1 font-mono text-[11px]">
                C
              </span>
            </Row>
          ))}
        </Stack>
      </Example>

      <Example label="Surface · tone" hint='<Surface tone="…">'>
        <div className="grid gap-4 md:grid-cols-3">
          {(["card", "raised", "transparent"] as const).map((tone) => (
            <Surface key={tone} tone={tone} padding="md">
              <span className="font-mono text-[11px] text-muted-foreground">
                tone={tone}
              </span>
            </Surface>
          ))}
        </div>
      </Example>

      <Example label="Divider · spacing" hint='<Divider spacing="…">'>
        <div className="flex flex-col">
          {(["sm", "md", "lg"] as const).map((spacing) => (
            <div key={spacing} className="flex flex-col">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-muted-foreground">
                spacing={spacing}
              </span>
              <Divider spacing={spacing} />
            </div>
          ))}
        </div>
      </Example>
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/*  Interactive                                                         */
/* ------------------------------------------------------------------ */

function InteractiveSection() {
  return (
    <Block
      id="interactive"
      title="Interactive."
      description="Button + Badge. Both route through Base UI's primitives and CVA variants; `render` lets any Button become a Link."
    >
      <Example label="Button · variants" hint="default size">
        <Row gap="sm" wrap>
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </Row>
      </Example>

      <Example label="Button · sizes" hint="default variant">
        <Row gap="sm" align="center" wrap>
          {BUTTON_SIZES.map((size) => (
            <Button key={size} size={size}>
              size={size}
            </Button>
          ))}
        </Row>
      </Example>

      <Example label="Button · as link" hint="render={<Link />}">
        <Row gap="sm" wrap>
          <Button render={<Link href="/" />}>Back to landing</Button>
          <Button variant="ghost" render={<Link href="/" />}>
            Ghost link →
          </Button>
        </Row>
      </Example>

      <Example label="Badge · variants">
        <Row gap="sm" wrap>
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </Row>
      </Example>
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/*  Containers                                                          */
/* ------------------------------------------------------------------ */

function ContainersSection() {
  return (
    <Block
      id="containers"
      title="Containers."
      description="Card — shadcn-flavored with data-slot subcomponents. Used by Discovery packs and wherever content needs header / content / footer structure."
    >
      <Example label="Card · default">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Spread Radar</CardTitle>
            </CardHeader>
            <CardContent>
              Clusters a user-defined asset universe and surfaces a validated
              relative-value trade.
            </CardContent>
            <CardFooter>
              <Row justify="between" gap="md" className="w-full">
                <span className="font-mono text-[11px] text-muted-foreground">
                  30 installs · 0.2 PROMPT
                </span>
                <Button size="xs" variant="ghost">
                  Install →
                </Button>
              </Row>
            </CardFooter>
          </Card>
          <Card size="sm">
            <CardHeader>
              <CardTitle>Compact card</CardTitle>
            </CardHeader>
            <CardContent>size=&quot;sm&quot; — tighter gaps and padding.</CardContent>
          </Card>
        </div>
      </Example>
    </Block>
  );
}

/* ------------------------------------------------------------------ */
/*  Marketing compounds                                                 */
/* ------------------------------------------------------------------ */

function MarketingSection() {
  return (
    <Block
      id="marketing"
      title="Marketing compounds."
      description="StackCard + MockCard — the signature cards on the landing's Stack section. Accent drives eyebrow and top-right glow only; titles stay on foreground."
    >
      <Example label="StackCard · four accents">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <StackCard
            href="/shells"
            accent="mint"
            eyebrow="Shells"
            title="Execute complex cross-chain paths instantly."
            footerText="Built-in terminal"
            visual={<DemoVisual rotate="-left" />}
          />
          <StackCard
            href="/openclaw"
            accent="amber"
            eyebrow="OpenClaw"
            title="Run agents forever on decentralized nodes."
            footerText="OpenClaw network"
            visual={<DemoVisual rotate="right" />}
          />
          <StackCard
            href="/wallet"
            accent="sky"
            eyebrow="Wallet Assistant"
            title="Move assets with plain English."
            footerText="Multichain routing"
            visual={<DemoVisual rotate="-left" />}
          />
          <StackCard
            href="/docs"
            accent="violet"
            eyebrow="SDK / API"
            title="Build custom workflows with code."
            footerText="SDK · REST · MCP"
            visual={<DemoVisual rotate="right" />}
          />
        </div>
      </Example>

      <Example label="MockCard · examples">
        <div className="relative grid gap-16 md:grid-cols-2">
          <div className="relative h-48">
            <MockCard className="absolute inset-0 -rotate-[3deg]">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Terminal
              </span>
              <pre className="mt-3 font-mono text-[13px] leading-[1.65] text-foreground/90">
                <span className="text-primary">$</span> wayfinder run
                {"\n"}
                <span className="text-muted-foreground">→ scanning pools</span>
              </pre>
            </MockCard>
          </div>
          <div className="relative h-48">
            <MockCard className="absolute inset-0 rotate-[3deg]">
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Available
              </span>
              <div className="mt-2 font-heading text-[2rem] font-semibold tabular-nums leading-none tracking-tight">
                $1,204.83
              </div>
              <div className="mt-2 font-mono text-[12px] text-primary">
                +$49.95 · 0.82%
              </div>
            </MockCard>
          </div>
        </div>
      </Example>
    </Block>
  );
}

function DemoVisual({ rotate }: { rotate: "-left" | "right" }) {
  const cls =
    rotate === "-left"
      ? "absolute -left-6 -top-10 w-[88%] -rotate-[5deg] md:-left-4 md:-top-8 md:w-[82%]"
      : "absolute -right-8 top-20 w-[60%] rotate-[4deg] md:-right-10 md:top-24 md:w-[56%]";
  return (
    <MockCard className={cls}>
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        Preview
      </span>
      <div className="mt-2 font-heading text-[1.75rem] font-semibold tabular-nums leading-none tracking-tight">
        $4,812.07
      </div>
      <div className="mt-1 font-mono text-[11px] text-primary">
        +0.42%
      </div>
    </MockCard>
  );
}
