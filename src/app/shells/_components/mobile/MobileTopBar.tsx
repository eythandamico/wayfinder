"use client";

import Link from "next/link";
import Image from "next/image";
import { WALLET_ADDRESS } from "../../_data/mocks";
import { CommandSearchIconButton } from "../CommandBar";

export function MobileTopBar() {
  const short = `${WALLET_ADDRESS.slice(0, 6)}…${WALLET_ADDRESS.slice(-4)}`;
  return (
    <div
      className="flex shrink-0 items-center justify-between gap-2 bg-muted px-3"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
        paddingBottom: "0.5rem",
      }}
    >
      <Link
        href="/"
        aria-label="Wayfinder home"
        className="flex items-center rounded-md px-1 transition-opacity hover:opacity-80"
      >
        <Image
          src="/brand/wayfinder-logomark.svg"
          alt="Wayfinder"
          width={120}
          height={28}
          className="h-6 w-auto"
          priority
        />
      </Link>

      <div className="flex items-center gap-1.5">
        <span
          className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/5 px-2.5 text-[11px] tabular-nums text-foreground"
          aria-label={`Wallet ${short}`}
        >
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]"
          />
          {short}
        </span>
        <CommandSearchIconButton />
        <button
          type="button"
          aria-label="More"
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="size-4"
            fill="currentColor"
          >
            <circle cx="3.5" cy="8" r="1.25" />
            <circle cx="8" cy="8" r="1.25" />
            <circle cx="12.5" cy="8" r="1.25" />
          </svg>
        </button>
      </div>
    </div>
  );
}
