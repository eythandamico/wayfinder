"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import {
  Check,
  CornerDownRight,
  Copy,
  History,
  RotateCw,
  Search,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage, Session } from "../_types";
import {
  MARKETS,
  MODELS,
  MODEL_PROVIDER,
  SAMPLE_SESSIONS,
} from "../_data/mocks";
import { useActivity } from "../_state/activity-context";
import { usePlan } from "../_state/plan-context";
import { useActiveMarket } from "../_state/shells-context";
import { useVoiceInput } from "../_hooks/useVoiceInput";
import { extractTicker } from "../_data/tickers";
import {
  buildCardFromTicker,
  type TradingCard as TradingCardData,
} from "../_data/trading-cards";
import { AskAgentButton } from "./AskAgentAffordance";
import { ComposerExtras } from "./ComposerExtras";
import { ProTag } from "./ProTag";
import { SubduedButton } from "./SubduedButton";
import { ThinkingGlow } from "./ThinkingGlow";
import {
  useForceFirstRunProfile,
  useForceThinkingGlow,
} from "../_lib/dev-flags";
import {
  GUT_CHECK_EVENT,
  generateGutCheck,
  type GutCheckSnapshot,
} from "../_lib/gut-check";
import {
  detectFirstRunProfile,
  generateOpener,
  seedFromSessionId,
  type OpenerChip,
} from "../_lib/opener";
import {
  MORNING_BRIEF_SESSION_ID,
  OPEN_MORNING_BRIEF_EVENT,
  generateMorningBrief,
} from "../_lib/morning-brief";
import {
  ASK_AGENT_EVENT,
  generateAskAgentReply,
  type AskAgentPayload,
} from "../_lib/ask-agent";
import { TradingCard } from "./TradingCard";
import { TradingCardSheet } from "./TradingCardSheet";
import { useSignals } from "../_state/signals-context";
import { useChatSession } from "../_state/chat-context";
import { useSeededWatchlist } from "../_state/shells-context";
import { useLayoutDispatch } from "../_layout/LayoutContext";
import { advanceInterview, startInterview } from "../_lib/interview";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  ImageIcon,
  InfinityIcon,
  LockIcon,
  MicIcon,
  MicRecordingIcon,
} from "./icons";

/** Custom event name the mobile composer dispatches when the user
 *  hits send. Kept in sync with `MobileAgentComposer.MOBILE_AGENT_SUBMIT_EVENT`. */
const MOBILE_AGENT_SUBMIT_EVENT = "wf:agent:submit";

type ChatPanelProps = {
  /** When true, the local composer is hidden because something
   *  outside this component (today: the mobile sticky composer in
   *  MobileLayout) owns the send affordance. We still listen for
   *  `wf:agent:submit` events so the external composer can route
   *  user input through this panel's existing pipeline. */
  embedded?: boolean;
};

export function ChatPanel({ embedded = false }: ChatPanelProps = {}) {
  // Persistent chat state — lifted into a context that mounts above
  // the layout tree so panel moves don't wipe it. ChatPanel itself is
  // unmount-prone (any structural layout change reshapes its React
  // ancestry; React then remounts the subtree even though the leaf
  // key is stable). Anything that has to survive a drag is destructured
  // here; anything strictly transient (streaming animation, the
  // trading-card sheet) stays in local useState below.
  const {
    input,
    setInput,
    activeSession,
    setActiveSession,
    transcriptItems,
    setTranscriptItems,
    replyChips,
    setReplyChips,
    firedOpenerFor,
    setFiredOpenerFor,
    briefDeliveredFor,
    setBriefDeliveredFor,
    dismissedToastSessions,
    setDismissedToastSessions,
    interviewState,
    setInterviewState,
  } = useChatSession();

  const [thinking, setThinking] = useState(false);
  const gutCheckTimer = useRef<number | null>(null);
  // Dev override — flip from the DevTools panel to hold the glow on
  // for design iteration. Production builds tree-shake this to a
  // no-op since the flag is only ever written by DevTools, which is
  // gated behind NODE_ENV / ?dev=1.
  const forceGlow = useForceThinkingGlow();
  const thinkingTimer = useRef<number | null>(null);

  // Streaming agent response. When the user submits in the agent chat,
  // we briefly show the thinking indicator, then "stream" a canned reply
  // character-by-character (rotating between a couple of variants so it
  // feels alive). Cursor blinks at the head until done. Stays local —
  // an in-flight stream is OK to lose on a panel move (finalized
  // messages are committed to the lifted transcript before the next
  // turn kicks off, so history is preserved).
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [streamingDone, setStreamingDone] = useState(false);
  const streamTimer = useRef<number | null>(null);

  const [openCard, setOpenCard] = useState<TradingCardData | null>(null);
  const { publishSignal } = useSignals();

  // Opener — agent-initiated first message per session. `firedOpenerFor`
  // now lives in the context above so a panel drag doesn't reset the
  // Set and re-fire the morning brief; the timer ref stays local.
  const openerTimer = useRef<number | null>(null);
  const forceProfile = useForceFirstRunProfile();
  const { setActiveMarket } = useActiveMarket();
  const { setDailyRCap } = useSignals();
  const { setSeededTickers } = useSeededWatchlist();
  const layoutDispatch = useLayoutDispatch();
  const { openPhoneModal, smsOptedIn } = useActivity();
  const { requirePro, isPro } = usePlan();
  const briefToastVisible =
    !smsOptedIn &&
    activeSession.id === MORNING_BRIEF_SESSION_ID &&
    briefDeliveredFor.has(activeSession.id) &&
    !dismissedToastSessions.has(activeSession.id);

  /**
   * Shared think-then-stream pipeline. Every agent-side reply in this
   * panel — opener, gut check, ask-agent, plain user-send — funnels
   * through here. Clears in-flight timers + streaming state, wipes
   * the previous turn's chips, glows the panel for `thinkMs`, then
   * char-streams the reply. If `followupChips` is provided, they
   * stage automatically the instant streaming completes — so
   * "render chips" reduces to "is replyChips truthy?" with no
   * stagedAt bookkeeping.
   */
  // Memoized with `[]` deps INTENTIONALLY. This callback closes over
  // four timer refs (gutCheckTimer/thinkingTimer/streamTimer/openerTimer)
  // and the setters from useState. All are stable across renders by
  // React's contract — refs by identity, setters by guarantee — so the
  // empty deps don't risk a stale closure today.
  //
  // If you later capture a non-stable value here (state, a derived
  // closure, a callback prop), MOVE it to deps or read it from a ref.
  // Don't add it silently — that's where the stale-closure bug lives.
  const runAgentReply = useCallback(
    (text: string, thinkMs: number, followupChips?: OpenerChip[]) => {
      if (gutCheckTimer.current) window.clearTimeout(gutCheckTimer.current);
      if (thinkingTimer.current) window.clearTimeout(thinkingTimer.current);
      if (streamTimer.current) window.clearInterval(streamTimer.current);
      if (openerTimer.current) window.clearTimeout(openerTimer.current);

      setStreamingText(null);
      setStreamingDone(false);
      setThinking(true);
      // Previous turn's chips are no longer relevant — wipe them at
      // the start of the new turn, not on user-send. Avoids the
      // race where ask-agent's own bubble-bump clears its own
      // about-to-stage chips.
      setReplyChips(null);

      thinkingTimer.current = window.setTimeout(() => {
        setThinking(false);
        let i = 0;
        setStreamingText("");
        streamTimer.current = window.setInterval(() => {
          i += Math.floor(Math.random() * 4) + 1;
          if (i >= text.length) {
            // Persist the completed agent message into the transcript
            // and clear streamingText in the same batch. The bubble
            // hands off seamlessly from StreamingMessage to the
            // static AgentBubble — both use the same underlying
            // component, so there's no visual switch. This is what
            // lets prior briefs / replies stay visible after the
            // next turn starts.
            setTranscriptItems((prev) => [
              ...prev,
              { kind: "agent", text },
            ]);
            setStreamingText(null);
            setStreamingDone(true);
            if (followupChips) setReplyChips(followupChips);
            if (streamTimer.current) window.clearInterval(streamTimer.current);
          } else {
            setStreamingText(text.slice(0, i));
          }
        }, 28);
        thinkingTimer.current = null;
      }, thinkMs);
    },
    [],
  );

  // Auto-scroll the agent thread to bottom whenever new items land
  // (user sends, streaming reply updates, thinking toggles). Without
  // this newly-rendered content stays below the visible area.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [transcriptItems.length, thinking, streamingText]);

  // Gut Check — TradePanel dispatches a snapshot, we fire the
  // thinking glow, then stream a plain agent reply containing the
  // summary + verdict. No special bubble — reads as a regular agent
  // message. Shared pipeline = runAgentReply.
  useEffect(() => {
    const onGutCheck = (e: Event) => {
      const snapshot = (e as CustomEvent<GutCheckSnapshot>).detail;
      if (!snapshot) return;
      const reply = generateGutCheck(snapshot);
      runAgentReply(
        `${reply.summary}\n\n${reply.verdict.copy}`,
        1800,
      );
    };
    window.addEventListener(GUT_CHECK_EVENT, onGutCheck);
    return () => window.removeEventListener(GUT_CHECK_EVENT, onGutCheck);
  }, [runAgentReply]);

  // Ask agent — any desk object can dispatch one of these. The user
  // bubble is the implicit question ("What's my exposure on this
  // HYPE long?"); the agent reply is the contextual answer in
  // gut-check house style. Where it's natural, we also switch the
  // active market so the chart + trade panel follow what was asked
  // about — no extra windows, the existing desk is the answer
  // surface.
  useEffect(() => {
    const onAskAgent = (e: Event) => {
      const payload = (e as CustomEvent<AskAgentPayload>).detail;
      if (!payload) return;

      // Pivot the desk when the payload names a tradeable market.
      const pivotMarket = resolveMarketFromPayload(payload);
      if (pivotMarket) setActiveMarket(pivotMarket);

      const { question, reply, chips } = generateAskAgentReply(payload);
      setTranscriptItems((prev) => [...prev, { kind: "text", text: question }]);
      runAgentReply(reply, 1500, chips);
    };
    window.addEventListener(ASK_AGENT_EVENT, onAskAgent);
    return () => window.removeEventListener(ASK_AGENT_EVENT, onAskAgent);
  }, [runAgentReply, setActiveMarket]);

  // DevTools "Open morning brief" trigger — switches to the chat tab,
  // sets the brief session active, and clears its fired-flag so the
  // opener pipeline re-streams the brief even if it already ran once.
  // Must also tear down any in-flight stream/thinking state — the
  // opener trigger effect gates on `thinking || streamingText !== null`
  // and would silently skip the re-fire if a prior turn was still
  // mid-stream when this event arrives.
  useEffect(() => {
    const onOpenBrief = () => {
      const target = SAMPLE_SESSIONS.find(
        (s) => s.id === MORNING_BRIEF_SESSION_ID,
      );
      if (!target) return;
      if (thinkingTimer.current) window.clearTimeout(thinkingTimer.current);
      if (streamTimer.current) window.clearInterval(streamTimer.current);
      if (openerTimer.current) window.clearTimeout(openerTimer.current);
      if (gutCheckTimer.current) window.clearTimeout(gutCheckTimer.current);
      setTranscriptItems([]);
      setReplyChips(null);
      setStreamingText(null);
      setStreamingDone(false);
      setThinking(false);
      setFiredOpenerFor((prev) => {
        if (!prev.has(MORNING_BRIEF_SESSION_ID)) return prev;
        const next = new Set(prev);
        next.delete(MORNING_BRIEF_SESSION_ID);
        return next;
      });
      setActiveSession(target);
      // Force the opener trigger effect to re-run even when the brief
      // session was already active (activeSession.id wouldn't change
      // so the effect's deps wouldn't fire on their own).
      setOpenerResetKey((k) => k + 1);
    };
    window.addEventListener(OPEN_MORNING_BRIEF_EVENT, onOpenBrief);
    return () =>
      window.removeEventListener(OPEN_MORNING_BRIEF_EVENT, onOpenBrief);
  }, []);

  // Opener trigger. Resets the thread on dev-profile flip so design
  // iteration on the three variants is one toggle away — chat, chips,
  // interview state, fired-set, all wiped. `openerResetKey` exists so
  // the trigger effect below picks up FRESH state after the reset
  // (within the same render, the gating closures would still be
  // stale and the new opener wouldn't fire).
  const [openerResetKey, setOpenerResetKey] = useState(0);
  useEffect(() => {
    setFiredOpenerFor(new Set());
    setTranscriptItems([]);
    setReplyChips(null);
    setInterviewState(null);
    setStreamingText(null);
    setStreamingDone(false);
    setThinking(false);
    if (thinkingTimer.current) window.clearTimeout(thinkingTimer.current);
    if (streamTimer.current) window.clearInterval(streamTimer.current);
    if (openerTimer.current) window.clearTimeout(openerTimer.current);
    if (gutCheckTimer.current) window.clearTimeout(gutCheckTimer.current);
    setOpenerResetKey((k) => k + 1);
  }, [forceProfile]);
  useEffect(() => {
    const sid = activeSession.id;
    if (firedOpenerFor.has(sid)) return;
    // Skip if the user has already sent something — agent items in
    // the transcript don't count (they're the prior opener; firing
    // again would duplicate it).
    if (transcriptItems.some((it) => it.kind !== "agent")) return;
    if (thinking || streamingText !== null) return;

    // The dedicated morning-brief session always streams the brief
    // content the agent generated this morning, regardless of profile.
    const opener =
      sid === MORNING_BRIEF_SESSION_ID
        ? generateMorningBrief()
        : generateOpener(
            forceProfile ?? detectFirstRunProfile(),
            seedFromSessionId(sid),
          );

    setFiredOpenerFor((prev) => new Set(prev).add(sid));
    runAgentReply(opener.message, 1200, opener.chips);
    // Gating reads stale state on first pass after a profile flip;
    // openerResetKey forces a second pass with fresh closures.
  }, [activeSession.id, forceProfile, openerResetKey]);

  // Top-level cleanup for the opener timer — separate from the
  // thinking-timer/stream-timer cleanup since this fires from a
  // different code path.
  useEffect(() => {
    return () => {
      if (openerTimer.current) window.clearTimeout(openerTimer.current);
    };
  }, []);

  // When the brief finishes streaming, mark its session as
  // "delivered." The composer toast watches this flag so it pops
  // AFTER the agent finishes typing — not the moment the session
  // becomes active.
  useEffect(() => {
    if (!streamingDone) return;
    if (activeSession.id !== MORNING_BRIEF_SESSION_ID) return;
    if (!firedOpenerFor.has(activeSession.id)) return;
    if (briefDeliveredFor.has(activeSession.id)) return;
    setBriefDeliveredFor((prev) => {
      if (prev.has(activeSession.id)) return prev;
      const next = new Set(prev);
      next.add(activeSession.id);
      return next;
    });
  }, [
    streamingDone,
    activeSession.id,
    firedOpenerFor,
    briefDeliveredFor,
  ]);

  const startThinking = (submitted: string) => {
    const v = submitted.trim();
    if (v) {
      const ticker = extractTicker(v);
      if (ticker) {
        const thesis = v.replace(/\$[A-Za-z]{1,6}\b/, "").trim();
        const card = buildCardFromTicker(ticker, { thesis });
        setTranscriptItems((prev) => [...prev, { kind: "card", card }]);
        publishSignal(card, { source: "me", notify: false });
      } else {
        setTranscriptItems((prev) => [...prev, { kind: "text", text: v }]);
      }
    }
    const reply =
      AGENT_REPLIES[Math.floor(Math.random() * AGENT_REPLIES.length)];
    runAgentReply(reply, 520);
  };

  // Receive submits from external composers (today: the mobile sticky
  // composer in MobileLayout). The event payload is the user's draft
  // string — same shape the local ChatComposer passes via onSubmit.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.trim()) {
        startThinking(detail);
      }
    };
    window.addEventListener(MOBILE_AGENT_SUBMIT_EVENT, handler);
    return () => window.removeEventListener(MOBILE_AGENT_SUBMIT_EVENT, handler);
    // startThinking is recreated each render; we re-bind to capture
    // the latest closure (fresh refs to setTranscriptItems, etc.).
  });

  /**
   * Chip tap router. Default flow goes through the regular user-send
   * path. The interview flows append the chip's submit string as a
   * real user bubble, then either start or advance the small fresh-
   * wallet state machine. The close step applies the side effects
   * (R cap, watchlist seed, addPanelIfMissing for watchlist) and
   * streams a confirmation message that names what just happened.
   */
  const handleChipTap = (chip: OpenerChip) => {
    const flow = chip.flow ?? { kind: "submit" };

    if (flow.kind === "submit") {
      startThinking(chip.submit);
      return;
    }

    // Both interview flows append the chip as a real user bubble
    // (so the thread reads naturally) before advancing.
    setTranscriptItems((prev) => [
      ...prev,
      { kind: "text", text: chip.submit },
    ]);

    if (flow.kind === "interview-start") {
      const { state, turn } = startInterview();
      setInterviewState(state);
      runAgentReply(turn.message, 900, turn.chips);
      return;
    }

    if (flow.kind === "interview-answer") {
      const current = interviewState ?? startInterview().state;
      const result = advanceInterview(current, flow.value);
      if ("close" in result) {
        // Apply the durable side effects first — by the time the
        // agent's reply stops streaming, the watchlist + R cap the
        // message references are already live.
        setDailyRCap(result.close.dailyRCap);
        setSeededTickers(result.close.watchlistTickers);
        if (layoutDispatch) {
          layoutDispatch({
            type: "addPanelIfMissing",
             
            panel: { id: `watchlist-${Date.now()}`, type: "watchlist" },
          });
        }
        setInterviewState(result.state);
        runAgentReply(result.close.message, 900);
      } else {
        setInterviewState(result.state);
        runAgentReply(result.turn.message, 900, result.turn.chips);
      }
      return;
    }
  };

  useEffect(() => {
    return () => {
      if (thinkingTimer.current) window.clearTimeout(thinkingTimer.current);
      if (streamTimer.current) window.clearInterval(streamTimer.current);
    };
  }, []);

  const [showUpgrade, setShowUpgrade] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isPro) {
       
      setShowUpgrade(false);
      return;
    }
    if (
      window.localStorage.getItem("wayfinder:pro-banner-dismissed-v2") !== "1"
    ) {
       
      setShowUpgrade(true);
    }
  }, [isPro]);
  const dismissUpgrade = () => {
    try {
      window.localStorage.setItem("wayfinder:pro-banner-dismissed-v2", "1");
    } catch {
      // storage unavailable; dismissal stays session-scoped
    }
    setShowUpgrade(false);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Panel header — agent-only since Paths moved to the Paths
          page's Library tab and Jobs is a top-level destination now.
          The history dropdown stays as the panel's only chrome. */}
      <div className="flex shrink-0 items-center justify-end gap-0.5 border-b border-white/[0.05] px-2 py-1.5">
        <HistoryDropdown
          active={activeSession}
          onSelect={setActiveSession}
        />
      </div>

          <div
            className="relative flex min-h-0 flex-1 flex-col"
          >
              {/* Bottom-edge thinking glow — lights the bottom 33% of
                  the panel while the agent is generating. Positioned
                  here (not on the composer wrapper) so the glow anchors
                  to the panel bottom regardless of composer height. */}
              <ThinkingGlow active={thinking || forceGlow} />
              <div
                ref={scrollRef}
                className="scroll-thin relative z-[1] min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pt-3"
              >
                {transcriptItems.map((item, i) => {
                  if (item.kind === "text") {
                    return (
                      <Message
                        key={`u-${i}`}
                        message={{ role: "user", text: item.text }}
                      />
                    );
                  }
                  if (item.kind === "agent") {
                    return (
                      <Message
                        key={`a-${i}`}
                        message={{
                          role: "assistant",
                          text: item.text,
                          meta: "",
                        }}
                      />
                    );
                  }
                  return (
                    <div
                      key={item.card.id}
                      className="flex justify-end animate-in fade-in slide-in-from-bottom-1 duration-200"
                    >
                      <TradingCard
                        card={item.card}
                        onSelect={() => setOpenCard(item.card)}
                        className="w-full max-w-[320px]"
                      />
                    </div>
                  );
                })}
                {thinking && <ThinkingIndicator />}
                {streamingText !== null && (
                  <StreamingMessage
                    text={streamingText}
                    done={streamingDone}
                  />
                )}
                {/* Follow-up chips — render under the most recent
                    agent message. Staged automatically by
                    runAgentReply when streaming finishes, cleared by
                    the same helper at the start of the next turn.
                    Tapping one routes through the regular send path
                    so it reads as a real user message. */}
                {replyChips && streamingDone && (
                  <OpenerChipRow chips={replyChips} onSelect={handleChipTap} />
                )}
              </div>
              {/* Composer block — visible in both standalone (desktop)
                  and embedded (mobile chat takeover sheet) modes. The
                  takeover-sheet variant is what the floating
                  mini-composer "morphs into" when the user engages
                  the bar on Home — same desktop ChatComposer shape,
                  inherited here. */}
              <div className="relative z-[1] px-3 pb-3">
                <div className="relative">
                  {/* In-context toast — floats above the composer
                      when a job has run something worth acting on.
                      Absolute-positioned so the composer stays put;
                      the toast feels like it landed on top instead
                      of pushing the input down. Pattern is reusable;
                      right now it carries the SMS opt-in that pairs
                      with the Morning brief job. */}
                  {!embedded && briefToastVisible && (
                    <div className="absolute inset-x-0 bottom-full mb-2">
                      <ComposerToast
                        label="Step away. Stay informed."
                        description="Fills, signals, and liquidations — as they happen."
                        actionLabel="Get notified"
                        onAction={openPhoneModal}
                        onDismiss={() =>
                          setDismissedToastSessions((prev) => {
                            const next = new Set(prev);
                            next.add(activeSession.id);
                            return next;
                          })
                        }
                      />
                    </div>
                  )}
                  <ComposerExtras
                    draft={input}
                    onPickCommand={(c) => setInput(c.prefix + " ")}
                  />
                  <ChatComposer
                    value={input}
                    onChange={setInput}
                    onSubmit={startThinking}
                    // Upgrade banner stays visible in both standalone
                    // (desktop) and embedded (mobile takeover sheet)
                    // modes. UpgradeBannerPanel's surface is tuned so
                    // it reads as a slightly elevated card on either
                    // chrome rather than a harsh dark rectangle.
                    showUpgrade={showUpgrade}
                    onDismissUpgrade={dismissUpgrade}
                  />
                </div>
              </div>
            </div>

      <TradingCardSheet
        card={openCard}
        onOpenChange={(open) => !open && setOpenCard(null)}
      />
    </div>
  );
}

function HistoryDropdown({
  active,
  onSelect,
}: {
  active: Session;
  onSelect: (s: Session) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", key);
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", key);
      cancelAnimationFrame(raf);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SAMPLE_SESSIONS;
    return SAMPLE_SESSIONS.filter((s) => s.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <div ref={ref} className="relative">
      <IconButton
        aria-label="Chat history"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <HistoryIcon />
      </IconButton>
      <div
        role="dialog"
        aria-label="Chat history"
        aria-hidden={!open}
        className={cn(
          "absolute right-0 top-full z-20 mt-1 w-72 origin-top-right overflow-hidden rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-2xl transition-[opacity,transform] duration-150 ease-out",
          open
            ? "opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 -translate-y-1 scale-[0.98]",
        )}
      >
        {/* Search row — matches the trade panel's asset picker: a
            flex row with a leading Search glyph and the input as a
            sibling, separated from the list by a border-b. The old
            inner-pill search style is gone so the two surfaces read
            as siblings. */}
        <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.05] px-3 py-2.5">
          <Search
            aria-hidden
            strokeWidth={1.75}
            className="size-3.5 text-muted-foreground"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions…"
            aria-label="Search sessions"
            className="min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div
          role="listbox"
          className="scroll-thin flex max-h-72 flex-col overflow-y-auto py-1"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-body text-muted-foreground">
              No sessions match{" "}
              <span className="text-foreground">
                &ldquo;{query}&rdquo;
              </span>
            </div>
          ) : (
            filtered.map((s) => {
              const isActive = s.id === active.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onSelect(s);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors",
                    isActive ? "bg-primary/10" : "hover:bg-surface-1",
                  )}
                >
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-body",
                      isActive
                        ? "font-semibold text-primary"
                        : "font-medium text-foreground",
                    )}
                  >
                    {s.name}
                  </span>
                  <span className="shrink-0 text-caption tabular-nums text-muted-foreground">
                    {s.age}
                  </span>
                  {isActive && <CheckIcon />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}


/* ---------------------------------------------------------- */
/*  Upgrade banner                                             */
/* ---------------------------------------------------------- */

/**
 * Outer panel that wraps the agent composer with an upgrade
 * announcement header. The composer card lives inside (as children)
 * inset by a small gap so its own rounded corners stay visible —
 * mirrors the Claude reference where the composer reads as a card
 * "slotted into" the announcement panel.
 *
 * Owns the outer rounded surface, the ring, and the ThinkingGlow
 * atmosphere (same pattern as the Pro price card in PricingModal so
 * mint reads as "the agent at full power"). The composer inside
 * keeps its own popover surface so the visual hierarchy is
 * announcement → input, not one flat surface.
 */
function UpgradeBannerPanel({
  onDismiss,
  children,
}: {
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  const { openPricing } = usePlan();
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleDismiss = () => {
    setLeaving(true);
    window.setTimeout(onDismiss, 200);
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-background ring-1 ring-inset ring-white/[0.06] transition-[opacity,transform] duration-300 ease-[var(--ease-strong)] motion-reduce:transition-none",
        !entered || leaving
          ? "opacity-0 -translate-y-1"
          : "opacity-100 translate-y-0",
      )}
    >
      {/* ThinkingGlow atmosphere — same treatment as the Pro price
          card. Subdued via opacity + brightness/saturate so the mint
          glow sits as the panel's signature surface without competing
          with the copy or the composer card slotted inside. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg opacity-60"
        style={{ filter: "brightness(0.85) saturate(0.9)" }}
      >
        <ThinkingGlow active edge="top" heightClass="h-full" sides="both" />
      </span>

      {/* Announcement row */}
      <div className="relative z-[1] flex items-center gap-3 px-3 pt-1 pb-1">
        <span className="min-w-0 flex-1 truncate text-body text-foreground">
          <span className="font-semibold">Agent always on.</span>
          <span className="text-muted-foreground">
            {" "}Unlock the full toolkit with Pro.
          </span>
        </span>
        <button
          type="button"
          onClick={() => openPricing("banner")}
          className="shrink-0 text-body font-semibold text-foreground underline-offset-2 transition-[opacity,scale] duration-150 ease-out hover:underline hover:opacity-90 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Upgrade
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss upgrade prompt"
          className="relative inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-1 hover:text-foreground active:scale-[0.96] before:absolute before:-inset-2.5 before:content-[''] focus-visible:bg-surface-1 focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <X strokeWidth={2} className="size-3" aria-hidden />
        </button>
      </div>

      {/* Composer card — flush left + right with the outer panel so
          both surfaces share a single column width (matches the Claude
          reference where the input sits at the panel's full width).
          No bottom inset — composer's rounded bottom edge aligns
          with the banner's bottom edge. */}
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------- */
/*  Icons local to this panel — wrappers around lucide for     */
/*  consistent stroke + sizing in this component's context.    */
/* ---------------------------------------------------------- */

function HistoryIcon() {
  return <History strokeWidth={1.5} className="size-[15px]" aria-hidden />;
}

/* ---------------------------------------------------------- */
/*  Composer                                                   */
/* ---------------------------------------------------------- */

function ChatComposer({
  value,
  onChange,
  onSubmit,
  showUpgrade,
  onDismissUpgrade,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (value: string) => void;
  showUpgrade: boolean;
  onDismissUpgrade: () => void;
}) {
  const { recording, toggle, supported } = useVoiceInput((text) => {
    onChange(value ? `${value} ${text}` : text);
  });

  const hasContent = value.trim().length > 0;

  const handleSend = () => {
    if (!hasContent) return;
    onSubmit(value);
    onChange("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // The composer card itself — same surface in both states (with and
  // without the upgrade banner). When the banner shows, this card sits
  // inset inside an outer panel that carries the ThinkingGlow + the
  // banner header above it; when it doesn't, the card stands alone.
  const composerCard = (
    <div className="relative flex flex-col overflow-hidden rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 transition-[box-shadow] duration-200 ease-out focus-within:ring-white/[0.10]">
      <label htmlFor="chat-composer" className="sr-only">
        Chat message
      </label>
      <textarea
        id="chat-composer"
        aria-label="Chat message"
        data-demo="agent-chat-input"
        placeholder="Ask about your book, a ticker, or $HYPE for a card"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        rows={3}
        className="resize-none bg-transparent px-4 pt-3.5 pb-2 text-body leading-[1.55] text-foreground outline-none placeholder:text-muted-foreground"
      />
      <div className="flex items-center justify-between px-2 pb-2">
        <div className="flex items-center gap-1">
          <AgentPill />
          <ModePill label="Auto" />
        </div>
        <div className="flex items-center gap-1">
          <IconButton aria-label="Attach image">
            <ImageIcon />
          </IconButton>
          <SendOrMicButton
            hasContent={hasContent}
            recording={recording}
            micSupported={supported}
            onMicToggle={toggle}
            onSend={handleSend}
          />
        </div>
      </div>
    </div>
  );

  if (!showUpgrade) {
    return <div className="relative mt-4">{composerCard}</div>;
  }

  return (
    <div className="relative mt-4">
      {/* Outer banner panel — wraps the composer card + announces the
          tier above it. Owns the ThinkingGlow + outer rounded corners;
          the composer card sits inset on the inside so both surfaces'
          radii are visible (matches the Claude reference where the
          composer card visually slots into the announcement panel). */}
      <UpgradeBannerPanel onDismiss={onDismissUpgrade}>
        {composerCard}
      </UpgradeBannerPanel>
    </div>
  );
}

function SendOrMicButton({
  hasContent,
  recording,
  micSupported,
  onMicToggle,
  onSend,
}: {
  hasContent: boolean;
  recording: boolean;
  micSupported: boolean;
  onMicToggle: () => void;
  onSend: () => void;
}) {
  const disabled = !hasContent && !micSupported;
  return (
    <button
      type="button"
      onClick={hasContent ? onSend : onMicToggle}
      disabled={disabled}
      data-demo="agent-chat-send"
      aria-label={
        hasContent
          ? "Send message"
          : recording
            ? "Stop voice input"
            : "Voice input"
      }
      className={cn(
        "relative flex size-9 items-center justify-center overflow-hidden rounded-full transition-[background-color,color,scale] duration-200 ease-out active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50",
        hasContent
          ? "bg-primary text-primary-foreground hover:brightness-110"
          : recording
            ? "bg-primary/80 text-primary-foreground"
            : "bg-surface-4 text-muted-foreground hover:bg-surface-4 hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
          hasContent
            ? "scale-[0.25] opacity-0 blur-[4px]"
            : "scale-100 opacity-100 blur-0",
        )}
      >
        {recording ? <MicRecordingIcon /> : <MicIcon />}
      </span>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
          hasContent
            ? "scale-100 opacity-100 blur-0"
            : "scale-[0.25] opacity-0 blur-[4px]",
        )}
      >
        <ArrowUpIcon />
      </span>
    </button>
  );
}

function AgentPill() {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState(MODELS[0]);
  const { isPro, openPricing } = usePlan();
  const ref = useRef<HTMLDivElement>(null);

  useClickOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="agent-menu"
        aria-label={`Model: ${model.label}. Choose model`}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-[var(--ui-h-pill)] items-center gap-1.5 rounded-full bg-surface-1 px-3 text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-4 hover:text-foreground active:scale-[0.96]"
      >
        <InfinityIcon />
        <span className="text-body font-medium text-foreground">{model.label}</span>
        <ChevronDownIcon
          aria-hidden
          className={cn(
            "size-3 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        id="agent-menu"
        role="menu"
        aria-hidden={!open}
        className={cn(
          "absolute bottom-full left-0 z-20 mb-2 w-64 origin-bottom-left rounded-lg bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 p-1 shadow-2xl transition-[opacity,transform] duration-150 ease-[var(--ease-strong)]",
          open
            ? "opacity-100 translate-y-0 scale-100"
            : "pointer-events-none opacity-0 translate-y-1 scale-[0.98]",
        )}
      >
        <div className="px-3 pb-1.5 pt-2 text-body text-muted-foreground">
          {MODEL_PROVIDER}
        </div>
        {MODELS.map((m) => {
          const active = m.id === model.id;
          const locked = !!m.pro && !isPro;
          return (
            <button
              key={m.id}
              type="button"
              role="menuitemradio"
              aria-checked={active}
              onClick={() => {
                // Pro models route through the canonical PricingModal
                // for free users. On Pro the row behaves as a normal
                // selection.
                if (locked) {
                  openPricing("model");
                  setOpen(false);
                  return;
                }
                setModel(m);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors",
                active ? "bg-primary/10" : "hover:bg-surface-1",
              )}
            >
              <span
                className={cn(
                  "flex items-center gap-2 text-body",
                  active ? "text-primary" : "text-foreground",
                )}
              >
                {m.label}
                {m.pro && <ProTag size="sm" />}
              </span>
              {active && !locked && <CheckIcon />}
              {locked && <LockIcon />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ModePill({ label }: { label: string }) {
  const { openPricing, isPro } = usePlan();
  // Auto mode is Pro-only — clicking the pill opens the canonical
  // PricingModal for free users. Once on Pro, the lock falls away
  // and the pill reads as an active mode indicator.
  return (
    <button
      type="button"
      aria-label={
        isPro ? `Chat mode: ${label}` : `Chat mode: ${label} (Pro)`
      }
      onClick={() => {
        if (!isPro) openPricing("auto");
      }}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-body text-muted-foreground transition-[color,scale] duration-150 ease-out hover:text-foreground active:scale-[0.96]"
    >
      {label}
      {!isPro && <LockIcon />}
    </button>
  );
}

function IconButton({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        "relative flex items-center justify-center rounded-md p-[var(--ui-y)] text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-1 hover:text-foreground active:scale-[0.96]",
        "before:absolute before:-inset-1 before:content-['']",
        className,
      )}
    >
      {children}
    </button>
  );
}

/**
 * Opener chips — the 2-3 suggested replies rendered below the agent's
 * first message of an empty session. Styled like preview user-message
 * bubbles (same rounded surface + text-body type as UserBubble, just
 * slightly more muted bg + a corner-down-right glyph on the right) so
 * they read as "here are the next things you could say." Tapping one
 * submits its `submit` string through the regular user-send path —
 * the bubble effectively becomes a real user message the moment it's
 * tapped.
 */
/**
 * Reusable in-context toast that sits above the agent's composer
 * input. Used for "this just happened, want to act on it?" prompts
 * triggered by jobs. The Wayfinder brand button on the right is the
 * primary action; the ✕ dismisses. ThinkingGlow background ties the
 * toast to the agent's visual identity (matches the SMS modal the
 * action opens).
 */
function ComposerToast({
  label,
  description,
  actionLabel,
  onAction,
  onDismiss,
}: {
  label: string;
  /** Plain text or rich content (e.g. with explicit line breaks via
   *  `<br />` so the copy lands on a chosen sentence boundary). */
  description?: React.ReactNode;
  /** Aria-label for the brand action button (e.g. "Get notified"). */
  actionLabel: string;
  onAction: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out">
      <div className="relative flex items-center gap-3 overflow-hidden rounded-lg bg-popover px-5 py-4 backdrop-blur-md shadow-[0_12px_32px_-8px_rgba(0,0,0,0.55),0_4px_12px_-4px_rgba(0,0,0,0.35)]">
        {/* Subtle white tint lifts the toast a step above the agent
            chat's bg-popover so it reads as a distinct elevated
            surface — same base material, just a touch brighter. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-white/[0.04]"
        />
        <div className="relative z-[1] flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
          <span className="text-body font-semibold text-foreground">
            {label}
          </span>
          {description && (
            <span className="text-pretty text-body text-muted-foreground">
              {description}
            </span>
          )}
        </div>
        <div className="relative z-[1] flex shrink-0 items-center gap-1.5 self-center">
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-9 shrink-0 items-center rounded-md px-3 text-body font-medium text-muted-foreground transition-[color,background-color,scale] duration-150 ease-out hover:bg-white/[0.06] hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            Not now
          </button>
          <AskAgentButton
            ariaLabel={actionLabel}
            label={actionLabel}
            onClick={onAction}
            size="md"
            variant="primary"
          />
        </div>
      </div>
    </div>
  );
}

function OpenerChipRow({
  chips,
  onSelect,
}: {
  chips: OpenerChip[];
  onSelect: (chip: OpenerChip) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 pt-1 animate-in fade-in slide-in-from-bottom-1 duration-200">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onSelect(chip)}
          aria-label={chip.label}
          className="group/chip flex w-full items-center justify-between gap-3 rounded-2xl bg-surface-1 px-3.5 py-2 text-left text-body text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-white/[0.09] hover:text-foreground active:scale-[0.985]"
        >
          <span className="min-w-0 flex-1 text-pretty">{chip.label}</span>
          <CornerDownRight
            strokeWidth={1.75}
            className="size-4 shrink-0 text-muted-foreground transition-colors group-hover/chip:text-foreground"
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

function ThinkingIndicator() {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => {
      setElapsedMs(performance.now() - start);
    }, 200);
    return () => window.clearInterval(id);
  }, []);

  const secs = Math.floor(elapsedMs / 1000);
  const mins = Math.floor(secs / 60);
  const timeStr = mins > 0 ? `${mins}m ${secs % 60}s` : `${secs}s`;
  const tokens = Math.floor((elapsedMs / 1000) * 32);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="flex items-center gap-2 text-body text-muted-foreground"
    >
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        className="size-3.5 animate-spin text-primary"
        style={{ animationDuration: "900ms" }}
        fill="none"
      >
        <circle
          cx="8"
          cy="8"
          r="6"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.18"
        />
        <path
          d="M14 8a6 6 0 0 0-6-6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <span>thinking…</span>
      <span className="tabular-nums text-muted-foreground">
        {timeStr} · {tokens} tokens
      </span>
    </div>
  );
}

/** Agent chat message — Claude-style. User prompts render as a
 *  right-aligned bubble; agent replies render as plain full-width
 *  text with a model badge underneath. */
function Message({ message }: { message: ChatMessage; seedKey?: string }) {
  if (message.role === "user") {
    return <UserBubble>{message.text}</UserBubble>;
  }
  return (
    <AgentBubble>{message.text}</AgentBubble>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl bg-surface-3 px-3.5 py-2 text-body text-pretty text-foreground">
        {children}
      </div>
    </div>
  );
}

function AgentBubble({
  children,
  streaming,
}: {
  children: React.ReactNode;
  streaming?: boolean;
}) {
  // Extract the raw text for the copy action — children is React
  // content, but in our chat flow it's always a string.
  const text = typeof children === "string" ? children : "";
  return (
    <div className="group/agent flex flex-col gap-1.5">
      <div className="whitespace-pre-wrap text-body text-pretty text-foreground">
        {children}
        {streaming && (
          <span
            aria-hidden
            className="ml-px inline-block h-[1em] w-[2px] -translate-y-px translate-x-[1px] bg-primary align-middle animate-pulse-soft"
          />
        )}
      </div>
      {!streaming && <AgentMessageActions text={text} />}
    </div>
  );
}

/** Hover-revealed action toolbar below an agent reply: copy, thumbs
 *  up/down, retry. Only the copy action does real work for now — the
 *  rest are visual + log-only handlers ready to wire to a feedback
 *  endpoint later. Group key is `agent` so the actions react to hover
 *  on the AgentBubble wrapper, not the entire chat row. */
function AgentMessageActions({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const copy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore — clipboard may be unavailable in dev / iframe */
    }
  };
  return (
    <div className="-ml-1 flex items-center gap-0.5 opacity-0 transition-opacity duration-150 ease-out group-hover/agent:opacity-100 focus-within:opacity-100">
      <ActionIconButton
        label={copied ? "Copied" : "Copy message"}
        onClick={copy}
        Icon={copied ? Check : Copy}
        active={copied}
      />
      <ActionIconButton
        label="Good response"
        onClick={() => setFeedback((v) => (v === "up" ? null : "up"))}
        Icon={ThumbsUp}
        active={feedback === "up"}
      />
      <ActionIconButton
        label="Bad response"
        onClick={() => setFeedback((v) => (v === "down" ? null : "down"))}
        Icon={ThumbsDown}
        active={feedback === "down"}
      />
      <ActionIconButton
        label="Retry"
        onClick={() => {
          /* hook into agent retry path later */
        }}
        Icon={RotateCw}
      />
    </div>
  );
}

function ActionIconButton({
  label,
  onClick,
  Icon,
  active = false,
}: {
  label: string;
  onClick: () => void;
  Icon: typeof Copy;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-md transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-2 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

/* Streaming agent replies — rotated through randomly when the user submits
 * in the agent chat. The reply text streams in character-by-character so
 * the agent feels alive rather than dumping a wall of text. */
const AGENT_REPLIES: string[] = [
  "Funding flipped negative on the perp this morning — clean setup. Short the perp against your spot, ~0.4R, stops above the swing high. Want me to size it for you?",
  "Looking at the order book, there's a wall of bids at 75.2k. If we lose that, I'd expect a quick 1.5% flush. Hedge by trimming 25%?",
  "Earnings setup is too clean here — IV's compressing into the print. Long the move, hedge gamma with front-month puts. Risk capped at 0.3R.",
  "Spot premium is widening. Basis trade looks juicy — short perp, long spot, ~12% annualized if it holds. Want me to lay out the legs?",
];

function StreamingMessage({ text, done }: { text: string; done: boolean }) {
  return (
    <AgentBubble streaming={!done}>
      {text}
    </AgentBubble>
  );
}

/** Resolve an ask-agent payload to a Market the desk should pivot to.
 *  - position rows + signal cards carry a ticker; we look it up by
 *    base ticker (e.g. "BTC" matches BTC-USDC in MARKETS).
 *  - market / mover payloads already carry the Market.
 *  - news has no implicit market — returns null. */
function resolveMarketFromPayload(payload: AskAgentPayload) {
  if (payload.kind === "market" || payload.kind === "mover") {
    return payload.market;
  }
  if (payload.kind === "position") {
    const base = payload.row.symbol.split("-")[0];
    return MARKETS.find((m) => m.symbol.split("-")[0] === base) ?? null;
  }
  if (payload.kind === "signal") {
    const base = payload.card.ticker.split("-")[0];
    return MARKETS.find((m) => m.symbol.split("-")[0] === base) ?? null;
  }
  return null;
}
