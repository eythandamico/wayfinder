"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Button, PageSection, Reveal, Stack } from "@/components/ds";
import { DOCS_URL } from "@/lib/links";

export function Hero() {
  return (
    <section className="relative">
      <PageSection
        pad="hero"
        innerClassName="relative flex flex-col items-center gap-8 text-center"
      >
        <Reveal y={28} delay={0.08}>
          <h1 className="max-w-4xl font-heading text-[clamp(2.75rem,5.5vw,5rem)] font-semibold leading-[1] text-balance">
            Your crypto agent,{" "}
            <span className="text-primary">your way.</span>
          </h1>
        </Reveal>
        <Reveal y={20} delay={0.12}>
          <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Autonomous agents for cross-chain execution. Deploy, monitor, and
            earn — without scripting.
          </p>
        </Reveal>
        <Reveal y={16} delay={0.22}>
          <Stack as="div" gap="sm" className="sm:flex-row sm:items-center">
            <Button
              size="lg"
              className="h-12 px-6"
              render={<Link href="/shells" />}
            >
              Launch app
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="h-12 px-5"
              render={<Link href={DOCS_URL} />}
            >
              Read Docs →
            </Button>
          </Stack>
        </Reveal>
      </PageSection>
    </section>
  );
}

export function HeroBackdrop() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[min(110vh,1000px)] overflow-hidden"
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/media/hero-aurora-poster.jpg"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-75"
      >
        <source src="/media/hero-aurora.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_20%,transparent_0%,color-mix(in_oklch,var(--background)_55%,transparent)_45%,var(--background)_85%)]" />
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}
