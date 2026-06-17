"use client";

import { useState } from "react";
import { PinOff } from "lucide-react";
import { CONTACTS, type Contact } from "../_data/contacts";
import { extractTicker } from "../_data/tickers";
import {
  buildCardFromTicker,
  type TradingCard as TradingCardData,
} from "../_data/trading-cards";
import { useVoiceInput } from "../_hooks/useVoiceInput";
import { ComposerExtras } from "./ComposerExtras";
import { ComposerSendButton } from "./ComposerSendButton";
import { ContactAvatar } from "./ContactAvatar";
import {
  InitialAvatar,
  MeAvatar,
  MessageRow,
} from "./MessageRow";
import { TradingCard } from "./TradingCard";
import { TradingCardSheet } from "./TradingCardSheet";
import { useSignals } from "../_state/signals-context";

type Props = {
  contact: Contact;
  /** Called when the user submits a message. ChatPanel uses this to pin
   *  a provisional token chat ("only stays if you chat"). */
  onSend: () => void;
  /** Called when the user clicks unpin. Only relevant for pinned tokens. */
  onUnpin: () => void;
};

/**
 * Conversation view for a token chat (e.g. BTC-USDC). Mirrors FriendChat
 * structurally — header, mock community thread, composer — but the header
 * carries the token chip, member count, and a pin/unpin affordance.
 *
 * Behavior:
 *   - Provisional (chart-driven, no message yet): header shows a "Send a
 *     message to keep this chat" hint instead of unpin.
 *   - Pinned (after first message): header shows a small Unpin button.
 */
type SentItem =
  | { kind: "text"; text: string }
  | { kind: "card"; card: TradingCardData };

export function TokenChat({ contact, onSend, onUnpin }: Props) {
  const [draft, setDraft] = useState("");
  const [sentItems, setSentItems] = useState<SentItem[]>([]);
  const [openCard, setOpenCard] = useState<TradingCardData | null>(null);
  const { publishSignal } = useSignals();

  const {
    recording,
    toggle: toggleMic,
    supported: micSupported,
  } = useVoiceInput((text) => setDraft((prev) => (prev ? `${prev} ${text}` : text)));

  const submit = () => {
    const v = draft.trim();
    if (!v) return;
    const ticker = extractTicker(v);
    if (ticker) {
      const thesis = v.replace(/\$[A-Za-z]{1,6}\b/, "").trim();
      const card = buildCardFromTicker(ticker, { thesis });
      setSentItems((prev) => [...prev, { kind: "card", card }]);
      publishSignal(card, { source: "me", notify: false });
    } else {
      setSentItems((prev) => [...prev, { kind: "text", text: v }]);
    }
    setDraft("");
    onSend();
  };

  const hasContent = draft.trim().length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Conversation header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.05] px-4 py-3">
        <ContactAvatar contact={contact} size={36} />
        <div className="flex min-w-0 flex-col">
          <span className="text-body font-semibold text-foreground">
            {contact.name}
            <span className="ml-2 text-micro uppercase tracking-wider text-muted-foreground">
              live
            </span>
          </span>
          <span className="text-body text-muted-foreground tabular-nums">
            {contact.members ?? 142} in chat
          </span>
        </div>
        <div className="ml-auto">
          {contact.provisional ? (
            <span className="text-micro uppercase tracking-wider text-muted-foreground">
              Tap send to join
            </span>
          ) : (
            <button
              type="button"
              onClick={onUnpin}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-1 px-2.5 py-1 text-body text-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-surface-3 hover:text-foreground"
            >
              <PinOff strokeWidth={1.6} className="size-3.5" aria-hidden />
              Unpin
            </button>
          )}
        </div>
      </div>

      {/* Messages — text bubbles + inline trading cards. Cards
          materialize when a sent message contained $TICKER. */}
      <div className="scroll-thin min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {COMMUNITY_THREAD.map((m, i) => (
          <CommunityBubble
            key={`c-${i}`}
            {...m}
            seedKey={`${contact.id}-${i}-${m.sender}`}
          />
        ))}
        {sentItems.map((item, i) =>
          item.kind === "text" ? (
            <MeBubble key={`m-${i}`} text={item.text} />
          ) : (
            <div
              key={item.card.id}
              className="animate-in fade-in slide-in-from-bottom-1 duration-200"
            >
              <MessageRow avatar={<MeAvatar />} sender="You">
                <TradingCard
                  card={item.card}
                  onSelect={() => setOpenCard(item.card)}
                  className="mt-1 w-full max-w-[320px]"
                />
              </MessageRow>
            </div>
          ),
        )}
      </div>

      {/* Composer */}
      <div className="shrink-0 px-3 pb-3">
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
            placeholder={`Message ${contact.name} chat…`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground/80"
          />
          <ComposerSendButton
            hasContent={hasContent}
            onSend={submit}
            recording={recording}
            micSupported={micSupported}
            onMicToggle={toggleMic}
          />
        </form>
      </div>

      <TradingCardSheet
        card={openCard}
        onOpenChange={(open) => !open && setOpenCard(null)}
      />
    </div>
  );
}

type Msg = { sender: string; text: string; tone?: "buy" | "sell" };

const COMMUNITY_THREAD: Msg[] = [
  { sender: "kalos", text: "Funding flipped negative on perps, watch out" },
  { sender: "deuce", text: "Bought a small bag at 75.2k", tone: "buy" },
  { sender: "bounty", text: "RSI cooling, looking for the next leg" },
  { sender: "ryzla", text: "Closed half. Up 4.2% on the day", tone: "sell" },
  { sender: "jcrew", text: "Anyone else seeing the spread widen?" },
];

function CommunityBubble({
  sender,
  text,
  tone,
  seedKey,
}: Msg & { seedKey?: string }) {
  // Senders in the mock thread map 1:1 to contact ids — look up the
  // friend so we can render their real avatar. Falls back to an
  // initial-tile if the sender isn't in CONTACTS.
  const senderContact = CONTACTS.find((c) => c.id === sender);
  return (
    <MessageRow
      avatar={
        senderContact ? (
          <ContactAvatar contact={senderContact} size={28} />
        ) : (
          <InitialAvatar name={sender} />
        )
      }
      sender={senderContact?.name ?? sender}
      tone={tone}
      seedKey={seedKey}
    >
      {text}
    </MessageRow>
  );
}

function MeBubble({ text }: { text: string }) {
  return (
    <MessageRow avatar={<MeAvatar />} sender="You">
      {text}
    </MessageRow>
  );
}
