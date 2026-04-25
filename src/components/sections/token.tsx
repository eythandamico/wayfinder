import Link from "next/link";
import Image from "next/image";
import { Button, Eyebrow, PageSection, Stack } from "@/components/ds";

export function TokenSection() {
  return (
    <PageSection pad="lg">
      <div className="relative overflow-hidden rounded-[2rem] bg-card/50 px-6 py-20 md:px-14 md:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Image
            src="/brand/keyart-01.png"
            alt=""
            fill
            className="object-cover opacity-25 mix-blend-screen"
            sizes="(min-width: 768px) 1100px, 100vw"
          />
          <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_50%,transparent_0%,var(--background)_85%)]" />
        </div>
        <Stack gap="xl" align="center" className="relative text-center">
          <Eyebrow accent="mint">$PROMPT · ERC-20</Eyebrow>
          <h2 className="font-heading text-[clamp(3rem,10vw,6.5rem)] font-semibold leading-none tracking-tight text-balance">
            <span className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-transparent">
              PROMPT
            </span>
          </h2>
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground md:text-xl">
            Governance and utility token powering Paths, bonding, staking,
            and usage-based rewards across the Wayfinder ecosystem.
          </p>
          <div className="mt-2 flex flex-col items-stretch gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-12 px-6"
              render={<Link href="https://cacheprompt.com" />}
            >
              Cache PROMPT
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="h-12 px-5"
              render={<Link href="/whitepaper" />}
            >
              Read Whitepaper →
            </Button>
          </div>
        </Stack>
      </div>
    </PageSection>
  );
}
