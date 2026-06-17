"use client";

import { Sparkles, Users } from "lucide-react";
import Jazzicon from "react-jazzicon";
import { cn } from "@/lib/utils";
import type { Contact } from "../_data/contacts";
import { TokenLogo } from "./TokenLogo";

type Props = {
  contact: Contact;
  size: number;
  className?: string;
};

/**
 * Renders the appropriate avatar for a contact kind:
 *   - agent  → gradient circle with sparkle (brand)
 *   - friend → jazzicon seeded from `contact.seed`. Geometric, on-brand
 *              for a wallet-native product, deterministic per contact —
 *              and crucially not a third-party placeholder service.
 *   - group  → two-tone overlap glyph (people icon on tinted bg)
 *   - token  → token glyph on its market color
 */
export function ContactAvatar({ contact, size, className }: Props) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-block shrink-0 overflow-hidden rounded-full",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-0 flex items-center justify-center">
        {contact.kind === "agent" ? <AgentAvatar size={size} /> : null}
        {contact.kind === "friend" ? (
          contact.avatar ? (
            <img
              src={contact.avatar}
              alt=""
              width={size}
              height={size}
              className="h-full w-full object-cover"
            />
          ) : (
            <Jazzicon
              diameter={size}
              seed={
                contact.seed ??
                // Fallback hash if a friend was added without a seed.
                [...contact.id].reduce(
                  (h, c) => ((h * 31 + c.charCodeAt(0)) | 0) >>> 0,
                  0,
                )
              }
            />
          )
        ) : null}
        {contact.kind === "group" ? <GroupAvatar size={size} /> : null}
        {contact.kind === "token" ? (
          <TokenLogo
            symbol={contact.name}
            char={contact.iconChar ?? "?"}
            bg={contact.iconBg ?? "var(--card)"}
            fg={contact.iconFg ?? "#fff"}
            size={size}
          />
        ) : null}
      </span>
    </span>
  );
}


function AgentAvatar({ size }: { size: number }) {
  return (
    <span
      className="flex h-full w-full items-center justify-center"
      style={{
        background:
          "conic-gradient(from 140deg at 50% 50%, var(--primary), color-mix(in oklch, var(--primary) 60%, var(--wf-accent-sky)), color-mix(in oklch, var(--primary) 60%, var(--wf-accent-violet)), var(--primary))",
      }}
    >
      <Sparkles
        strokeWidth={2}
        className="text-background"
        style={{ width: size * 0.42, height: size * 0.42 }}
        aria-hidden
      />
    </span>
  );
}

function GroupAvatar({ size }: { size: number }) {
  return (
    <span className="flex h-full w-full items-center justify-center bg-surface-3">
      <Users
        strokeWidth={1.75}
        className="text-foreground"
        style={{
          width: size * 0.46,
          height: size * 0.46,
          // Lucide's Users SVG weighs its lower half (bodies), so optically
          // centering means nudging it up a touch within the circle.
          transform: "translateY(-6%)",
        }}
        aria-hidden
      />
    </span>
  );
}
