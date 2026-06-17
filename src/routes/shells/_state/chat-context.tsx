"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { PATHS, type Path } from "@/lib/paths";
import { SAMPLE_JOBS, SAMPLE_SESSIONS } from "../_data/chat";
import type { TradingCard as TradingCardData } from "../_data/trading-cards";
import type { Job, Session } from "../_types";
import type { InterviewState } from "../_lib/interview";
import type { OpenerChip } from "../_lib/opener";

/**
 * Lifted chat-session state.
 *
 * ChatPanel used to own all of this as local `useState`. The problem:
 * panel moves restructure the layout tree, which in turn reshapes
 * ChatPanel's React ancestry — React then unmounts/remounts the
 * subtree even though the leaf `key` is stable (React only preserves
 * identity within the *same* parent JSX, not across structural moves).
 * On every panel drag the chat panel was being torn down + rebuilt,
 * which wiped the transcript, the opener-fired set (so the morning
 * brief replayed), the jobs/paths the user had edited, and the
 * composer draft.
 *
 * Lifting state out of the unmounted component is the React-canonical
 * fix. The provider mounts above `LayoutRenderer` / `MobileLayout` so
 * it lives across every layout reshape; ChatPanel becomes a view that
 * reads/writes here. Anything that has to survive a panel move lives
 * in this context.
 *
 * What stays local in ChatPanel (intentional):
 *   - thinking / streamingText / streamingDone — current in-flight
 *     reply animation. Resetting an in-flight stream on a panel move
 *     is acceptable (the streaming timers are local; coordinating
 *     them across remounts isn't worth the complexity for a UI that
 *     finalises completed messages into the transcript anyway).
 *   - openCard — trading-card sheet open state. UI-level only.
 *   - openerResetKey — internal effect-rerun nudge for the opener.
 */

/** What shows up in the agent thread — a user text bubble, a
 *  user-issued trading card, or a completed agent reply. Defined here
 *  (not inside ChatPanel) so consumers downstream of the context can
 *  type their transcript reads. */
export type TranscriptItem =
  | { kind: "text"; text: string }
  | { kind: "card"; card: TradingCardData }
  | { kind: "agent"; text: string };

export type ChatSessionApi = {
  // Composer + active surface
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  activeSession: Session;
  setActiveSession: Dispatch<SetStateAction<Session>>;
  tab: "chat" | "paths" | "jobs";
  setTab: Dispatch<SetStateAction<"chat" | "paths" | "jobs">>;

  // Conversation + chips
  transcriptItems: TranscriptItem[];
  setTranscriptItems: Dispatch<SetStateAction<TranscriptItem[]>>;
  replyChips: OpenerChip[] | null;
  setReplyChips: Dispatch<SetStateAction<OpenerChip[] | null>>;

  // Per-session gates — these were the loudest casualty of the
  // remount bug: an empty Set meant the opener fired again on every
  // panel move, so the morning brief replayed.
  firedOpenerFor: ReadonlySet<string>;
  setFiredOpenerFor: Dispatch<SetStateAction<ReadonlySet<string>>>;
  briefDeliveredFor: ReadonlySet<string>;
  setBriefDeliveredFor: Dispatch<SetStateAction<ReadonlySet<string>>>;
  dismissedToastSessions: ReadonlySet<string>;
  setDismissedToastSessions: Dispatch<SetStateAction<ReadonlySet<string>>>;

  // Fresh-wallet interview state
  interviewState: InterviewState | null;
  setInterviewState: Dispatch<SetStateAction<InterviewState | null>>;

  // User-mutable lists rendered in the Agent sub-tabs
  jobs: Job[];
  setJobs: Dispatch<SetStateAction<Job[]>>;
  paths: Path[];
  setPaths: Dispatch<SetStateAction<Path[]>>;
};

const ChatSessionContext = createContext<ChatSessionApi | null>(null);

export function ChatSessionProvider({ children }: { children: ReactNode }) {
  const [input, setInput] = useState("");
  const [activeSession, setActiveSession] = useState<Session>(
    SAMPLE_SESSIONS[0],
  );
  const [tab, setTab] = useState<"chat" | "paths" | "jobs">("chat");
  const [transcriptItems, setTranscriptItems] = useState<TranscriptItem[]>([]);
  const [replyChips, setReplyChips] = useState<OpenerChip[] | null>(null);
  const [firedOpenerFor, setFiredOpenerFor] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [briefDeliveredFor, setBriefDeliveredFor] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [dismissedToastSessions, setDismissedToastSessions] = useState<
    ReadonlySet<string>
  >(() => new Set());
  const [interviewState, setInterviewState] = useState<InterviewState | null>(
    null,
  );
  const [jobs, setJobs] = useState<Job[]>(SAMPLE_JOBS);
  const [paths, setPaths] = useState<Path[]>(() => PATHS.slice(0, 10));

  return (
    <ChatSessionContext.Provider
      value={{
        input,
        setInput,
        activeSession,
        setActiveSession,
        tab,
        setTab,
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
        jobs,
        setJobs,
        paths,
        setPaths,
      }}
    >
      {children}
    </ChatSessionContext.Provider>
  );
}

/** Read the lifted chat-session state. Throws when used outside the
 *  provider — surfaces missing-mount mistakes loudly instead of
 *  silently rendering an empty agent panel. */
export function useChatSession(): ChatSessionApi {
  const ctx = useContext(ChatSessionContext);
  if (!ctx) {
    throw new Error(
      "useChatSession must be used within ChatSessionProvider — " +
        "mount it above LayoutRenderer + MobileLayout in the page tree.",
    );
  }
  return ctx;
}
