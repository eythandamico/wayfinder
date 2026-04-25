import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero, HeroBackdrop } from "@/components/sections/hero";
import { ShellShowcase } from "@/components/sections/shell-showcase";
import { Features } from "@/components/sections/features";
import { SdkSection } from "@/components/sections/sdk";
import { TokenSection } from "@/components/sections/token";
import { PageSection, Reveal } from "@/components/ds";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-clip">
      <HeroBackdrop />
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <Hero />
        <PageSection pad="none" innerClassName="px-4 pb-20 md:pb-28">
          <ShellShowcase />
        </PageSection>
        <Features />
        <Reveal>
          <SdkSection />
        </Reveal>
        <Reveal>
          <TokenSection />
        </Reveal>
      </main>
      <SiteFooter />
    </div>
  );
}
