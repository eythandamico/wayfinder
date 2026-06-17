"use client";

import { useRef, useState } from "react";
import { MessageSquareReply, SmilePlus } from "lucide-react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { cn } from "@/lib/utils";
import { WALLET_ADDRESS } from "../_data/mocks";
import { AGENT_CONTACT, CONTACTS, type Contact } from "../_data/contacts";
import { ContactAvatar } from "./ContactAvatar";
import { EmojiPicker } from "./EmojiPicker";

/**
 * Slack-style message row. Avatar on the left, sender name + optional
 * timestamp on the header line, message body below. No bubbles, no
 * left/right alignment by role — every message reads the same way so
 * conversations are coherent regardless of which surface they're on
 * (agent, friend, group, token).
 *
 * Hover affordances (top-right):
 *   - Add reaction (curated emoji picker)
 *   - Reply  (fires onReply if provided; placeholder otherwise)
 *
 * Reactions live in local state — fine for this demo since none of
 * the chat data is persisted across reloads anyway.
 */
type Props = {
  /** Resolved avatar — usually a <ContactAvatar/> or a <MeAvatar/>. */
  avatar: React.ReactNode;
  sender: string;
  /** Optional small label after the sender — usually a time string. */
  timestamp?: string;
  /** Tone tints the text body for buy/sell sentiment, matching the
   *  existing community bubble convention. */
  tone?: "buy" | "sell";
  /** Optional reply handler. When omitted the reply button hides. */
  onReply?: () => void;
  /** Stable per-message identifier used to seed default reactions so
   *  the chat doesn't render every row with an empty social slot.
   *  Callers usually pass `${senderId}-${index}` or similar. */
  seedKey?: string;
  children: React.ReactNode;
};

const AVATAR_SIZE = 28;

/** Quick-react emojis surfaced in the hover toolbar — one tap, no
 *  picker. Curated to the most common chat reactions so the strip
 *  feels like a shortcut, not the whole library. */
const QUICK_REACTIONS = ["❤️", "🔥", "👀", "💯", "😂"] as const;

/** 6×6 grid of common reaction emojis surfaced in the full picker. */
const EMOJI_GRID = [
  "❤️", "🔥", "👀", "💯", "👍", "😂",
  "🚀", "💎", "🎯", "⚡", "💀", "🧠",
  "😀", "😅", "😍", "🤔", "🙄", "😱",
  "🥲", "😎", "🥹", "🤯", "🤝", "🙏",
  "👎", "🙌", "👏", "✌️", "📈", "📉",
  "💸", "💰", "🏦", "📊", "🦍", "💔",
] as const;

type Reaction = { emoji: string; count: number };

/**
 * Cheap deterministic 32-bit hash → derives a stable set of default
 * reactions from the caller-provided seedKey. Same seedKey across
 * renders yields the same reactions; different keys yield different
 * picks — so a chat thread looks varied without persisting state.
 */
function seedReactions(seed: string): Reaction[] {
  if (!seed) return [];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  h = h >>> 0;
  // ~50% of messages render with no reactions — keeps the chat from
  // feeling like every line was workshopped.
  if (h % 4 === 0) return [];
  const count = 1 + (h % 3); // 1–3 reactions
  const out: Reaction[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < count; i++) {
    const ei = (h >>> (i * 5)) % EMOJI_GRID.length;
    const emoji = EMOJI_GRID[ei];
    if (seen.has(emoji)) continue;
    seen.add(emoji);
    const c = 1 + ((h >>> (i * 7 + 3)) % 7); // 1–7 count
    out.push({ emoji, count: c });
  }
  return out;
}

export function MessageRow({
  avatar,
  sender,
  timestamp,
  tone,
  onReply,
  seedKey,
  children,
}: Props) {
  const [reactions, setReactions] = useState<Reaction[]>(() =>
    seedReactions(seedKey ?? ""),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  // Whichever button last opened the picker — used by EmojiPicker to
  // anchor itself off the right trigger, since there are two (the
  // hover-toolbar SmilePlus + the inline "+ Add reaction" under the
  // message). useRef instead of useState so flipping it doesn't cause
  // an extra render.
  const pickerTriggerRef = useRef<HTMLElement | null>(null);

  const togglePickerAt = (el: HTMLElement) => {
    if (pickerOpen && pickerTriggerRef.current === el) {
      setPickerOpen(false);
      return;
    }
    pickerTriggerRef.current = el;
    setPickerOpen(true);
  };

  const react = (emoji: string) => {
    setReactions((prev) => {
      const idx = prev.findIndex((r) => r.emoji === emoji);
      if (idx === -1) return [...prev, { emoji, count: 1 }];
      const next = [...prev];
      next[idx] = { ...next[idx], count: next[idx].count + 1 };
      return next;
    });
    setPickerOpen(false);
  };

  return (
    <div
      className={cn(
        "group/msg relative -mx-2 flex items-start gap-2.5 rounded-md px-2 py-1 transition-colors duration-150 ease-out hover:bg-surface-1",
        pickerOpen && "bg-surface-1",
      )}
    >
      <span aria-hidden className="shrink-0">
        {avatar}
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-body font-semibold text-foreground">
            {sender}
          </span>
          {timestamp && (
            <span className="text-caption tabular-nums text-muted-foreground">
              {timestamp}
            </span>
          )}
        </div>
        <div
          className={cn(
            "text-body text-pretty",
            tone === "buy"
              ? "text-primary"
              : tone === "sell"
                ? "text-tone-down"
                : "text-foreground",
          )}
        >
          {children}
        </div>
        {reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => react(r.emoji)}
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/[0.02] px-2 transition-[background-color,scale] duration-150 ease-out hover:bg-surface-2 active:scale-[0.96]"
              >
                <span aria-hidden className="text-[15px] leading-none">
                  {r.emoji}
                </span>
                <span className="text-caption tabular-nums text-muted-foreground">
                  {r.count}
                </span>
              </button>
            ))}
            <button
              type="button"
              aria-label="Add reaction"
              onClick={(e) => togglePickerAt(e.currentTarget)}
              className="inline-flex h-7 items-center justify-center rounded-full bg-white/[0.02] px-2 text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-2 hover:text-foreground active:scale-[0.96]"
            >
              <SmilePlus strokeWidth={1.75} className="size-3.5" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {/* Hover toolbar — top-right, half-overlapping the row so it
          doesn't push the message down. Picker (when open) floats
          above the toolbar so it doesn't compete for horizontal
          space. */}
      <div className="absolute -top-3 right-0 z-20">
        <div
          className={cn(
            "flex items-center justify-end transition-opacity duration-150 ease-out",
            pickerOpen
              ? "opacity-100"
              : "pointer-events-none opacity-0 group-hover/msg:pointer-events-auto group-hover/msg:opacity-100",
          )}
        >
          <div className="inline-flex items-center gap-0.5 rounded-md bg-card backdrop-blur-md px-0.5 py-0.5 ring-1 ring-inset ring-white/[0.06] shadow-lg">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                aria-label={`React with ${emoji}`}
                onClick={() => react(emoji)}
                className="inline-flex size-6 items-center justify-center rounded-sm text-[15px] leading-none transition-[background-color,scale] duration-150 ease-out hover:bg-surface-2 active:scale-[0.96]"
              >
                {emoji}
              </button>
            ))}
            <span
              aria-hidden
              className="mx-0.5 h-4 w-px shrink-0 bg-surface-2"
            />
            <button
              type="button"
              aria-label={pickerOpen ? "Close reactions" : "More reactions"}
              onClick={(e) => togglePickerAt(e.currentTarget)}
              className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-2 hover:text-foreground active:scale-[0.96]"
            >
              <SmilePlus strokeWidth={1.75} className="size-3.5" aria-hidden />
            </button>
            {onReply && (
              <ToolbarButton label="Reply" onClick={onReply}>
                <MessageSquareReply
                  strokeWidth={1.75}
                  className="size-3.5"
                  aria-hidden
                />
              </ToolbarButton>
            )}
          </div>
        </div>
      </div>

      {/* Portaled, full-featured emoji picker — lives at document.body
          so it escapes the chat panel's overflow-hidden + stacking
          context. Positions itself off the trigger button's rect. */}
      <EmojiPicker
        open={pickerOpen}
        triggerRef={pickerTriggerRef}
        onSelect={react}
        onOpenChange={setPickerOpen}
      />
    </div>
  );
}

function ToolbarButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex size-6 items-center justify-center rounded-sm text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-2 hover:text-foreground active:scale-[0.96]"
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Avatar helpers                                                     */
/* ------------------------------------------------------------------ */

/** The user's own jazzicon, seeded from their connected wallet so it
 *  stays stable across every chat surface. */
export function MeAvatar({ size = AVATAR_SIZE }: { size?: number } = {}) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size }}
    >
      <Jazzicon diameter={size} seed={jsNumberForAddress(WALLET_ADDRESS)} />
    </span>
  );
}

/** Plain initial-letter fallback when the sender id doesn't match a
 *  known contact (some mock threads reference handles we don't track
 *  in CONTACTS). */
export function InitialAvatar({
  name,
  size = AVATAR_SIZE,
}: {
  name: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-surface-4 text-caption font-semibold text-muted-foreground"
      style={{ width: size, height: size }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/** Convenience: resolve a sender id to (Contact | null), useful for
 *  group / community threads where messages carry only the id. */
export function findSenderContact(senderId: string): Contact | null {
  return CONTACTS.find((c) => c.id === senderId) ?? null;
}

/* Re-export so callers don't need to know the contacts module. */
export { AGENT_CONTACT, ContactAvatar };
