"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, PageSection, SectionHeader } from "@/components/ds";
import { cn } from "@/lib/utils";

const REPO_URL =
  "https://github.com/WayfinderFoundation/wayfinder-paths-sdk";

const QUICKSTART = `git clone ${REPO_URL}
cd wayfinder-paths-sdk
# Open in your coding agent (Claude Code, Codex, Opencode, etc.)`;

export function SdkSection() {
  return (
    <PageSection className="bg-white/[0.02]">
      <div className="mx-auto max-w-3xl">
        <SectionHeader
          align="center"
          eyebrow="Velocity Protocol"
          title="Wayfinder SDK"
          description="The engine behind Wayfinder. Build sovereign agents on our core orchestration layer."
        />
        <QuickstartBlock code={QUICKSTART} className="mt-10" />
        <div className="mt-6 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="https://docs.wayfinder.ai" />}
          >
            Read the Docs →
          </Button>
        </div>
      </div>
    </PageSection>
  );
}

function QuickstartBlock({
  code,
  className,
}: {
  code: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable; swallow
    }
  };

  return (
    <div
      className={cn(
        "relative rounded-2xl bg-card p-6 pr-14 ring-1 ring-inset ring-white/[0.06]",
        className,
      )}
    >
      <button
        type="button"
        onClick={onCopy}
        aria-label={copied ? "Copied" : "Copy command"}
        className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/[0.05] hover:text-foreground"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
      <pre className="overflow-x-auto font-mono text-[13px] leading-[1.8] text-foreground/90">
        <code>
          <span className="text-primary">git</span>
          {` clone ${REPO_URL}\n`}
          <span className="text-primary">cd</span>
          {" wayfinder-paths-sdk\n"}
          <span className="text-muted-foreground">
            # Open in your coding agent (Claude Code, Codex, Opencode, etc.)
          </span>
        </code>
      </pre>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-[15px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="5" width="8" height="8" rx="1.5" />
      <path d="M10 5V4a1.5 1.5 0 0 0-1.5-1.5h-5A1.5 1.5 0 0 0 2 4v5a1.5 1.5 0 0 0 1.5 1.5H5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      className="size-[15px] text-primary"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8.5 6.5 11.5 12.5 5" />
    </svg>
  );
}
