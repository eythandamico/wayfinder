"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlay, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { CONTACTS, type Contact } from "../_data/contacts";
import {
  buildCardFromTicker,
  type CardKind,
  type TradingCard as TradingCardData,
} from "../_data/trading-cards";
import { extractTicker } from "../_data/tickers";
import { useVoiceInput } from "../_hooks/useVoiceInput";
import { ComposerExtras } from "./ComposerExtras";
import { ComposerSendButton } from "./ComposerSendButton";
import { ContactAvatar } from "./ContactAvatar";
import { GifPicker, type GifItem } from "./GifPicker";
import {
  InitialAvatar,
  MessageRow,
} from "./MessageRow";
import { TokenLogo } from "./TokenLogo";
import { PILE_IN_SIZE_R, TradingCard } from "./TradingCard";
import { TradingCardSheet } from "./TradingCardSheet";
import { useSignals } from "../_state/signals-context";

/* Trade-receipt drop — emitted by Pile-In on a card. Lives in the chat
 * thread as a small "@you went long $TSLA · 0.3R · from card #2" chip. */
type TradeReceipt = {
  id: string;
  cardId: string;
  ticker: string;
  kind: CardKind;
  iconChar: string;
  iconBg: string;
  iconFg?: string;
  side: "long" | "short";
  size: string;
  trader: { id: string; name: string };
  createdAt: number;
};


/**
 * Minimal friend/group conversation view. Used when a non-agent contact
 * is active in the ChatPanel. Mock thread + a composer — real
 * conversation state will land when messaging is wired up.
 */
export function FriendChat({
  contact,
  onSend,
}: {
  contact: Contact;
  onSend?: () => void;
}) {
  const [draft, setDraft] = useState("");
  // Pre-populated signal cards from friends/groups are hidden in v3 —
  // the chat should feel like a real conversation, not a signal feed.
  // User-published cards (via $TICKER drafts) still land in userCards
  // below, so the interactive flow still works.
  const [activeCards, setActiveCards] = useState<TradingCardData[]>([]);
  const [openCard, setOpenCard] = useState<TradingCardData | null>(null);
  // Trade receipts dropped into the thread by Pile-In events.
  const [receipts, setReceipts] = useState<TradeReceipt[]>([]);
  // Cards materialized inline when the user sends a message containing a
  // `$TICKER` reference. Appended after the mock thread + receipts.
  const [userCards, setUserCards] = useState<TradingCardData[]>([]);
  // Plain-text sends — submitted strings that aren't $TICKER cards.
  // Without this list, plain messages would just clear the draft and
  // disappear with no rendering.
  const [userMessages, setUserMessages] = useState<string[]>([]);
  // GIFs the user picks via the composer's GIF button. Same shape as
  // userCards — appended to the message list as a "you" row.
  const [userGifs, setUserGifs] = useState<GifItem[]>([]);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const gifTriggerRef = useRef<HTMLButtonElement>(null);
  // Demo-injected incoming replies. The runner dispatches
  // wf:demo:friend-reply with { friendId, content, emoji? }; when the
  // friendId matches the active contact we drop the message into
  // this list so it renders alongside the rest of the thread.
  const [injectedIncoming, setInjectedIncoming] = useState<
    Array<{ id: string; content: string; emoji?: boolean }>
  >([]);
  useEffect(() => {
    const onReply = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          friendId: string;
          content: string;
          emoji?: boolean;
        }>
      ).detail;
      if (!detail || detail.friendId !== contact.id) return;
      setInjectedIncoming((prev) => [
        ...prev,
        {
          id: `inj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          content: detail.content,
          emoji: detail.emoji,
        },
      ]);
    };
    window.addEventListener("wf:demo:friend-reply", onReply as EventListener);
    return () =>
      window.removeEventListener(
        "wf:demo:friend-reply",
        onReply as EventListener,
      );
  }, [contact.id]);

  // Auto-scroll the thread to the bottom whenever something new
  // lands. Without this, newly-sent messages render at the end of
  // the list but stay off-screen until the user scrolls down — felt
  // broken compared to any normal chat.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [
    userCards.length,
    userGifs.length,
    userMessages.length,
    receipts.length,
    injectedIncoming.length,
  ]);

  const sendGif = (gif: GifItem) => {
    setUserGifs((prev) => [...prev, gif]);
    setGifPickerOpen(false);
    onSend?.();
  };

  const {
    recording,
    toggle: toggleMic,
    supported: micSupported,
  } = useVoiceInput((text) => setDraft((prev) => (prev ? `${prev} ${text}` : text)));

  const mockMessages =
    contact.kind === "group"
      ? (GROUP_THREADS[contact.id] ?? GROUP_THREADS.default)
      : (FRIEND_THREADS[contact.id] ?? FRIEND_MOCK_THREAD);

  const hasContent = draft.trim().length > 0;
  const { publishSignal } = useSignals();

  const submit = () => {
    if (!hasContent) return;
    const ticker = extractTicker(draft);
    if (ticker) {
      // Strip the $TICKER reference — the remaining text becomes the
      // card's thesis line. If nothing's left, the builder supplies a
      // default.
      const thesis = draft.replace(/\$[A-Za-z]{1,6}\b/, "").trim();
      const card = buildCardFromTicker(ticker, { thesis });
      setUserCards((prev) => [...prev, card]);
      // Your own posts land in the Activity feed but DON'T fire the
      // cascade — no toast/sound/flash for things you just sent.
      publishSignal(card, { source: "me", notify: false });
    } else {
      setUserMessages((prev) => [...prev, draft.trim()]);
    }
    setDraft("");
    onSend?.();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Conversation header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.05] px-4 py-3">
        <ContactAvatar contact={contact} size={36} />
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-body font-semibold text-foreground">
            {contact.name}
          </span>
          <span className="truncate text-body text-muted-foreground">
            {contact.kind === "group"
              ? `${contact.members ?? 0} members`
              : (contact.handle ?? "online")}
          </span>
        </div>
      </div>

      {/* Messages — text + receipts + gifs + inline cards. Cards
          materialize when a message contained $TICKER. */}
      <div
        ref={scrollRef}
        className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
        {mockMessages.map((m, i) => (
          <Bubble
            key={`m-${i}`}
            from={m.from}
            text={m.text}
            sender={m.sender}
            contact={contact}
            isGroup={contact.kind === "group"}
            seedKey={`${contact.id}-${i}-${m.sender ?? m.from}`}
          />
        ))}
        {userMessages.map((text, i) => (
          <div
            key={`um-${i}`}
            className="flex justify-end animate-in fade-in slide-in-from-bottom-1 duration-200"
          >
            <div className="max-w-[80%] rounded-2xl bg-surface-3 px-3.5 py-2 text-body text-pretty text-foreground ring-1 ring-inset ring-white/[0.06]">
              {text}
            </div>
          </div>
        ))}
        {receipts.map((r, i) => (
          <ReceiptRow key={`r-${i}`} receipt={r} />
        ))}
        {userCards.map((card) => (
          <div
            key={card.id}
            className="flex justify-end animate-in fade-in slide-in-from-bottom-1 duration-200"
          >
            <TradingCard
              card={card}
              onSelect={() => setOpenCard(card)}
              onClose={() =>
                setUserCards((prev) => prev.filter((c) => c.id !== card.id))
              }
              onPileIn={(c) =>
                setReceipts((prev) => [
                  ...prev,
                  {
                    id: `${c.id}-${Date.now()}`,
                    cardId: c.id,
                    ticker: c.ticker,
                    kind: c.kind,
                    iconChar: c.iconChar,
                    iconBg: c.iconBg,
                    iconFg: c.iconFg,
                    side: c.sentiment === "bear" ? "short" : "long",
                    size: PILE_IN_SIZE_R,
                    trader: { id: "me", name: "you" },
                    createdAt: Date.now(),
                  },
                ])
              }
              className="w-full max-w-[320px]"
            />
          </div>
        ))}
        {activeCards.map((card) => (
          <div
            key={card.id}
            className="animate-in fade-in slide-in-from-bottom-1 duration-200"
          >
            <MessageRow
              avatar={<InitialAvatar name={card.author.name} />}
              sender={card.author.name}
            >
              <TradingCard
                card={card}
                onSelect={() => setOpenCard(card)}
                onClose={() =>
                  setActiveCards((prev) =>
                    prev.filter((c) => c.id !== card.id),
                  )
                }
                onPileIn={(c) =>
                  setReceipts((prev) => [
                    ...prev,
                    {
                      id: `${c.id}-${Date.now()}`,
                      cardId: c.id,
                      ticker: c.ticker,
                      kind: c.kind,
                      iconChar: c.iconChar,
                      iconBg: c.iconBg,
                      iconFg: c.iconFg,
                      side: c.sentiment === "bear" ? "short" : "long",
                      size: PILE_IN_SIZE_R,
                      trader: { id: "me", name: "you" },
                      createdAt: Date.now(),
                    },
                  ])
                }
                className="mt-1 w-full max-w-[320px]"
              />
            </MessageRow>
          </div>
        ))}
        {userGifs.map((gif, i) => (
          <div
            key={`${gif.id}-${i}`}
            className="flex justify-end animate-in fade-in slide-in-from-bottom-1 duration-200"
          >
            <img
              src={gif.src}
              alt={gif.title}
              className="block max-w-[280px] rounded-2xl ring-1 ring-inset ring-white/[0.06]"
              style={{ aspectRatio: `${gif.w} / ${gif.h}` }}
              loading="lazy"
            />
          </div>
        ))}
        {injectedIncoming.map((msg) => (
          <div
            key={msg.id}
            className="animate-in fade-in slide-in-from-bottom-1 duration-200"
          >
            {msg.emoji ? (
              <div className="flex items-end gap-2">
                <ContactAvatar contact={contact} size={28} />
                <span className="text-[40px] leading-none">{msg.content}</span>
              </div>
            ) : (
              <MessageRow
                avatar={<ContactAvatar contact={contact} size={28} />}
                sender={contact.name}
              >
                {msg.content}
              </MessageRow>
            )}
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="shrink-0 px-4 pb-3">
        <ComposerExtras
          draft={draft}
          onPickCommand={(c) => setDraft(c.prefix + " ")}
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="flex items-center gap-2 rounded-full bg-surface-1 py-1.5 pl-4 pr-1.5 ring-1 ring-inset ring-white/[0.06]"
        >
          <input
            type="text"
            placeholder={`Message ${contact.name}…`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            data-demo="friend-chat-input"
            className="flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground/80"
          />
          <button
            ref={gifTriggerRef}
            type="button"
            aria-label="Add a GIF"
            onClick={() => setGifPickerOpen((v) => !v)}
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-full transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
              gifPickerOpen
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            )}
          >
            <ImagePlay strokeWidth={1.75} className="size-4" aria-hidden />
          </button>
          <ComposerSendButton
            hasContent={hasContent}
            onSend={submit}
            recording={recording}
            micSupported={micSupported}
            onMicToggle={toggleMic}
            data-demo="friend-chat-send"
          />
        </form>
      </div>

      {/* Fullscreen takeover for the tapped card */}
      <TradingCardSheet
        card={openCard}
        onOpenChange={(open) => !open && setOpenCard(null)}
      />

      {/* GIF picker — portaled to body so it escapes overflow-hidden
          on the chat panel + leaf wrapper. */}
      <GifPicker
        open={gifPickerOpen}
        triggerRef={gifTriggerRef}
        onSelect={sendGif}
        onOpenChange={setGifPickerOpen}
      />
    </div>
  );
}

type Mock = { from: "me" | "them"; text: string; sender?: string };

const FRIEND_MOCK_THREAD: Mock[] = [
  { from: "them", text: "Just opened a small long on HYPE at 24.10" },
  { from: "me", text: "nice. funding still positive over there?" },
  { from: "them", text: "0.008%/h, looks healthy" },
  { from: "me", text: "watching it 👀" },
];

/**
 * Per-friend mock threads. The text references the same ticker and thesis
 * that's on each friend's floating card.
 */
const FRIEND_THREADS: Record<string, Mock[]> = {
  kalos: [
    { from: "them", text: "AAPL setup is too clean. Long the run, hedge gamma" },
    { from: "me", text: "Hedging with what?" },
    { from: "them", text: "Short the front-month vol. Burn rate is wide enough" },
    { from: "me", text: "Sized?" },
    { from: "them", text: "0.5R into earnings. Stops at the gap" },
  ],
  jcrew: [
    { from: "them", text: "Going long the HYPE perp — funding inflection looks done" },
    { from: "me", text: "How are you sizing?" },
    { from: "them", text: "Tight. 0.3R, stop below the swing low" },
    { from: "me", text: "Same. Riding it with you" },
  ],
  byokes: [
    { from: "them", text: "TSLA delivery beat is sending — chasing the gap fill above 400" },
    { from: "me", text: "Where are stops?" },
    { from: "them", text: "Below VWAP, ~398. Keeps risk tight" },
    { from: "me", text: "Joining the move" },
  ],
  bounty: [
    { from: "them", text: "Fading NVDA into the print. Capex guidance is going to trim" },
    { from: "me", text: "Risk on the short?" },
    { from: "them", text: "Above 142 and I'm out. Down to 130 if it breaks" },
  ],
  deuce: [
    { from: "them", text: "ETH basis is tight — fading the spot premium for 4 days of carry" },
    { from: "me", text: "Annualized?" },
    { from: "them", text: "~9% if it holds. Small but clean" },
  ],
  ryzla: [
    { from: "them", text: "Closing the MSFT long here — Azure beat already priced" },
    { from: "me", text: "What's next?" },
    { from: "them", text: "Sitting in cash, waiting for the next catalyst" },
  ],
  eythan: [
    { from: "them", text: "SOL bid is back — validator unlock cleared, breakout above 90 looks clean" },
    { from: "me", text: "Where do you take it?" },
    { from: "them", text: "Trailing stop, taking 50% at 100" },
  ],
};

/**
 * Per-group mock threads. The text references the same tickers and theses
 * that appear on the group's floating cards, so the chat and the deck
 * feel like the same conversation.
 */
const GROUP_THREADS: Record<string, Mock[]> = {
  "alpha-hunters": [
    { from: "them", sender: "kalos", text: "Funding flipped negative on AAPL perps — shorts crowded, watching for the squeeze into earnings" },
    { from: "them", sender: "bounty", text: "TSLA Cybertruck deliveries pulling forward, momentum bid all morning" },
    { from: "me", text: "I'm short NVDA into the print, hyperscaler capex guidance looked soft" },
    { from: "them", sender: "deuce", text: "Same — capex cooling is the cleanest bear setup we've seen in months" },
    { from: "them", sender: "ryzla", text: "Long AAPL / short NVDA pair if you want it hedged" },
  ],
  "funding-capture": [
    { from: "them", sender: "kalos", text: "BTC perp funding at −0.012%/h, basis is wide. Clean short perp / long spot trade" },
    { from: "them", sender: "deuce", text: "Stacking it. Spot premium is sticky right now" },
    { from: "me", text: "ETH spreads compressing — neutral here, waiting for next funding window" },
    { from: "them", sender: "jcrew", text: "HYPE funding flipped positive again, closing the perp short and taking the carry" },
    { from: "them", sender: "bounty", text: "Good call — that trade's done" },
  ],
  default: [
    { from: "them", sender: "kalos", text: "Anything live worth looking at?" },
    { from: "them", sender: "bounty", text: "Quiet morning so far" },
  ],
};

function Bubble({
  from,
  text,
  sender,
  contact,
  isGroup,
  seedKey,
}: Mock & { contact: Contact; isGroup: boolean; seedKey?: string }) {
  // My messages — right-aligned subdued bubble, matches the agent
  // chat's UserBubble so both surfaces feel like one chat system.
  if (from === "me") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-surface-3 px-3.5 py-2 text-body text-pretty text-foreground ring-1 ring-inset ring-white/[0.06]">
          {text}
        </div>
      </div>
    );
  }

  // Incoming messages — Slack-style MessageRow with profile pic,
  // sender name, message text, and the hover reaction toolbar /
  // seeded default reactions.
  if (isGroup && sender) {
    const senderContact = CONTACTS.find((c) => c.id === sender);
    const displayName = senderContact?.name ?? sender;
    return (
      <MessageRow
        avatar={
          senderContact ? (
            <ContactAvatar contact={senderContact} size={28} />
          ) : (
            <InitialAvatar name={sender} />
          )
        }
        sender={displayName}
        seedKey={seedKey}
      >
        {text}
      </MessageRow>
    );
  }

  return (
    <MessageRow
      avatar={<ContactAvatar contact={contact} size={28} />}
      sender={contact.name}
      seedKey={seedKey}
    >
      {text}
    </MessageRow>
  );
}

/**
 * Trade receipt — rendered inline in the messages list when someone
 * pile-ins on a card. Small left-aligned chip with the side (long/short),
 * size, and the ticker logo so the action is immediately scannable.
 */
function ReceiptRow({ receipt }: { receipt: TradeReceipt }) {
  const isLong = receipt.side === "long";
  return (
    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
      <TokenLogo
        symbol={receipt.ticker}
        char={receipt.iconChar}
        bg={receipt.iconBg}
        fg={receipt.iconFg ?? "#fff"}
        size={20}
        kind={receipt.kind}
      />
      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-1 px-2.5 py-1 text-body">
        <span className="text-muted-foreground">@{receipt.trader.name}</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 font-medium",
            isLong ? "text-primary" : "text-tone-down",
          )}
        >
          {isLong ? (
            <TrendingUp strokeWidth={2} className="size-3" aria-hidden />
          ) : (
            <TrendingDown strokeWidth={2} className="size-3" aria-hidden />
          )}
          {isLong ? "long" : "short"}
        </span>
        <span className="font-semibold text-foreground">${receipt.ticker}</span>
        <span className="text-muted-foreground tabular-nums">·</span>
        <span className="text-foreground tabular-nums">{receipt.size}</span>
      </span>
    </div>
  );
}
