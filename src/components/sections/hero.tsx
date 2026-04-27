"use client";

import type { ComponentType, SVGProps } from "react";
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
        <Reveal y={12} delay={0.32}>
          <SupportedModels />
        </Reveal>
      </PageSection>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Supported models row                                               */
/* ------------------------------------------------------------------ */

type ModelEntry = {
  name: string;
  Logo: ComponentType<SVGProps<SVGSVGElement>>;
};

const MODELS: ModelEntry[] = [
  { name: "DeepSeek V2 Pro", Logo: DeepSeekMark },
  { name: "Kimi 2.6", Logo: KimiMark },
  { name: "Kimi 2.5", Logo: KimiMark },
  { name: "GPT-5.4", Logo: OpenAIMark },
];

function SupportedModels() {
  return (
    <div className="mt-10 flex flex-col items-center gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground/65">
        Supported models
      </span>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-muted-foreground/90">
        {MODELS.map((m) => (
          <span
            key={m.name}
            className="inline-flex items-center gap-1.5 text-[12.5px]"
          >
            <m.Logo
              aria-hidden
              className="size-[18px] shrink-0 text-foreground"
            />
            {m.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/* OpenAI — official spirograph mark, monochrome. */
function OpenAIMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5Z" />
    </svg>
  );
}

/* DeepSeek — official whale mark, rendered white via currentColor. */
function DeepSeekMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      {...props}
    >
      <path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" />
    </svg>
  );
}

/* Kimi — official mark, rendered white via currentColor. */
function KimiMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      fillRule="evenodd"
      {...props}
    >
      <path d="M21.846 0a1.923 1.923 0 110 3.846H20.15a.226.226 0 01-.227-.226V1.923C19.923.861 20.784 0 21.846 0z" />
      <path d="M11.065 11.199l7.257-7.2c.137-.136.06-.41-.116-.41H14.3a.164.164 0 00-.117.051l-7.82 7.756c-.122.12-.302.013-.302-.179V3.82c0-.127-.083-.23-.185-.23H3.186c-.103 0-.186.103-.186.23V19.77c0 .128.083.23.186.23h2.69c.103 0 .186-.102.186-.23v-3.25c0-.069.025-.135.069-.178l2.424-2.406a.158.158 0 01.205-.023l6.484 4.772a7.677 7.677 0 003.453 1.283c.108.012.2-.095.2-.23v-3.06c0-.117-.07-.212-.164-.227a5.028 5.028 0 01-2.027-.807l-5.613-4.064c-.117-.078-.132-.279-.028-.381z" />
    </svg>
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
