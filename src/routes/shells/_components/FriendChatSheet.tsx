"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONTACTS, type Contact } from "../_data/contacts";
import { useFriends } from "../_state/shells-context";
import { ContactAvatar } from "./ContactAvatar";

/**
 * Inline friend chat — drills into the FriendsPanel slot just like
 * TraderProfile does. Header has Back + the friend's identity, a
 * mock message thread scrolls in the middle, and a composer sits at
 * the bottom. Sent messages persist for the session via
 * localStorage so a panel re-render doesn't wipe the conversation.
 *
 * Lightweight by design: no card embeds, no GIF picker, no agent
 * routing. Real conversation infrastructure will land when the
 * messaging backend ships; this surface keeps the visual + UX bones
 * in place so the upgrade path is obvious.
 */

type Message = {
  id: string;
  side: "in" | "out";
  text: string;
  /** Mocked relative time label. */
  age: string;
};

/** Per-friend seed thread so each conversation looks lived-in. The
 *  composer's sends append to a session-persisted list and render
 *  after these. */
const SEED_THREAD: Record<string, Message[]> = {
  kalos: [
    { id: "k1", side: "in", text: "Saw you piled into ETH around the news drop — clean entry.", age: "2h" },
    { id: "k2", side: "out", text: "Honestly thanks to the agent's flag. The 1m breaker triggered right after.", age: "2h" },
    { id: "k3", side: "in", text: "Sharing my SOL setup later — want a heads up?", age: "1h" },
  ],
  jcrew: [
    { id: "j1", side: "in", text: "did u see the wassie nft floor lol", age: "yesterday" },
  ],
  byokes: [
    { id: "b1", side: "in", text: "Are we still copy-trading the macro book next week?", age: "3d" },
    { id: "b2", side: "out", text: "Yes — turning it on Monday once the funding flips.", age: "3d" },
  ],
};

const PERSIST_KEY = "wf-shells-v3-friend-chat-v1";

type SentMap = Record<string, { id: string; text: string; age: string }[]>;

function readSent(): SentMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PERSIST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeSent(next: SentMap) {
  try {
    window.localStorage.setItem(PERSIST_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function FriendChatSheet({ friendId }: { friendId: string }) {
  const { closeFriendChat } = useFriends();
  const friend = useMemo<Contact | null>(
    () =>
      CONTACTS.find((c) => c.id === friendId && c.kind === "friend") ?? null,
    [friendId],
  );

  const [sentByFriend, setSentByFriend] = useState<SentMap>(() => readSent());
  const sent = useMemo(
    () => sentByFriend[friendId] ?? [],
    [sentByFriend, friendId],
  );
  const seed = SEED_THREAD[friendId] ?? [];

  const messages: Message[] = useMemo(
    () => [
      ...seed,
      ...sent.map((m) => ({
        id: m.id,
        side: "out" as const,
        text: m.text,
        age: m.age,
      })),
    ],
    [seed, sent],
  );

  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom on open + after each send.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Focus the composer on open so the user can type right away.
  useEffect(() => {
    const id = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(id);
  }, []);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const message = {
      id: `m-${friendId}-${performance.now().toString(36)}`,
      text,
      age: "just now",
    };
    setSentByFriend((prev) => {
      const next = { ...prev, [friendId]: [...(prev[friendId] ?? []), message] };
      writeSent(next);
      return next;
    });
    setDraft("");
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Friend missing (data drift) — show a slim error chrome and
  // route the user back rather than crashing.
  if (!friend) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-2 border-b border-white/[0.05] px-2 py-2">
          <IconButton onClick={closeFriendChat} aria-label="Back to friends">
            <ArrowLeft strokeWidth={2} className="size-4" aria-hidden />
          </IconButton>
          <span className="text-body font-medium text-foreground">Chat</span>
        </header>
        <div className="flex flex-1 items-center justify-center px-4 text-center text-body text-muted-foreground">
          Friend not found. Go back and pick a contact.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header — back + identity. Same chrome rhythm as TraderProfile. */}
      <header className="flex shrink-0 items-center gap-2 border-b border-white/[0.05] px-2 py-2">
        <IconButton onClick={closeFriendChat} aria-label="Back to friends">
          <ArrowLeft strokeWidth={2} className="size-4" aria-hidden />
        </IconButton>
        <ContactAvatar contact={friend} size={32} />
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="flex items-center gap-1 truncate text-body font-semibold text-foreground">
            {friend.name}
            {friend.verified && (
              <BadgeCheck
                strokeWidth={2}
                className="size-3.5 shrink-0 text-primary"
                aria-label="Verified"
              />
            )}
          </span>
          {friend.handle && (
            <span className="truncate text-caption text-muted-foreground">
              {friend.handle}
            </span>
          )}
        </div>
      </header>

      {/* Thread */}
      <div
        ref={scrollerRef}
        className="scroll-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3"
      >
        {messages.length === 0 ? (
          <div className="m-auto px-6 text-center text-body text-muted-foreground">
            Say hi to {friend.name} — the conversation starts here.
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const showAge = !prev || prev.side !== m.side || prev.age !== m.age;
            return <MessageBubble key={m.id} message={m} showAge={showAge} />;
          })
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-white/[0.05] p-2">
        <div className="flex items-end gap-2 rounded-lg bg-surface-2 px-3 py-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder={`Message ${friend.name}`}
            rows={1}
            className="scroll-thin max-h-32 min-h-[1.5rem] flex-1 resize-none bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
            aria-label={`Message ${friend.name}`}
          />
          <button
            type="button"
            onClick={send}
            disabled={draft.trim().length === 0}
            aria-label="Send message"
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-md transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
              draft.trim().length === 0
                ? "bg-surface-3 text-muted-foreground"
                : "bg-primary text-primary-foreground hover:brightness-[1.04]",
            )}
          >
            <Send strokeWidth={2} className="size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  showAge,
}: {
  message: Message;
  showAge: boolean;
}) {
  const out = message.side === "out";
  return (
    <div className={cn("flex flex-col", out ? "items-end" : "items-start")}>
      {showAge && (
        <span className="mb-1 px-1 text-micro uppercase tracking-[0.14em] text-muted-foreground">
          {message.age}
        </span>
      )}
      <span
        className={cn(
          "max-w-[78%] rounded-2xl px-3 py-2 text-body leading-snug",
          out
            ? "rounded-br-md bg-primary text-primary-foreground"
            : "rounded-bl-md bg-surface-2 text-foreground",
        )}
      >
        {message.text}
      </span>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      {...props}
    >
      {children}
    </button>
  );
}
