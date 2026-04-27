import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Hero, HeroBackdrop } from "@/components/sections/hero";
import { ShellShowcase } from "@/components/sections/shell-showcase";
import { MobileShellShowcase } from "@/components/sections/mobile-shell-showcase";
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
        <PageSection
          pad="none"
          innerClassName="-mt-16 px-4 pb-20 md:-mt-24 md:pb-28"
        >
          <div className="md:hidden">
            <MobileShellShowcase />
          </div>
          <div className="hidden md:block">
            <ShellShowcase />
          </div>
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
