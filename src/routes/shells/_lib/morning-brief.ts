/**
 * Default "Morning brief" — a daily 8am job that the agent runs for
 * every user. The job writes into a dedicated session so the brief
 * lives as a real thread the user can scroll back through; when the
 * user opens the morning-brief session, the opener pipeline streams
 * the brief instead of a profile-based welcome.
 *
 * The brief reads from current POSITIONS + MARKETS + MOCK_ACCOUNT so
 * the agent sounds like it actually looked at the book this morning.
 */

import { MARKETS } from "../_data/markets";
import { POSITIONS } from "../_data/positions";
import { MOCK_ACCOUNT } from "../_components/PortfolioPanel";
import type { Opener, OpenerChip } from "./opener";

/** ID of the dedicated session the morning brief job writes into.
 *  Same constant referenced by SAMPLE_SESSIONS, SAMPLE_JOBS, and the
 *  ChatPanel opener override so all three stay in sync. */
export const MORNING_BRIEF_SESSION_ID = "brief";

/** ID of the default morning brief job. Used by JobsPanel to attach
 *  the "Get the brief texted to you" CTA below the row. */
export const MORNING_BRIEF_JOB_ID = "j-brief";

/** Custom event that opens the morning-brief session in the agent
 *  panel. Dispatched by DevTools (and reusable from anywhere — e.g.
 *  a future "Today's brief" header pill). ChatPanel listens, switches
 *  to the chat tab, sets the active session, and re-fires the opener
 *  even if the brief was already shown this session. */
export const OPEN_MORNING_BRIEF_EVENT = "wf:open-morning-brief";

export function generateMorningBrief(): Opener {
  const balance = Math.round(MOCK_ACCOUNT.balance).toLocaleString("en-US");
  const dayPnlUsd = Math.abs(Math.round(MOCK_ACCOUNT.changeUsd)).toLocaleString(
    "en-US",
  );
  const dayDir = MOCK_ACCOUNT.changeUsd >= 0 ? "up" : "down";

  const tradable = POSITIONS.filter((p) => p.kind !== "cash");
  const topPos = [...tradable].sort((a, b) => b.value - a.value)[0];
  const topPosLine = topPos
    ? `Biggest line on the book is ${baseTicker(topPos.symbol)} at $${Math.round(
        topPos.value,
      ).toLocaleString("en-US")}, ${formatPnl(topPos.pnlPct)} into the open.`
    : `Nothing big sitting on the book right now.`;

  // Top mover from MARKETS — gives the brief an "overnight tape" beat.
  const mover = pickTopMover();
  const moverLine = mover
    ? `Overnight, ${mover.ticker} is the headline — ${mover.dir} ${mover.absPct.toFixed(
        2,
      )}% with ${mover.market.volume ?? "$?"} backing it.`
    : `Tape's quiet overnight — nothing leading hard either way.`;

  // Risk reminder bookends the brief — frames the read into a decision.
  const close = MOCK_ACCOUNT.changeUsd >= 0
    ? `You're ${dayDir} $${dayPnlUsd} on the day — clean start, let the setups come to you.`
    : `You're ${dayDir} $${dayPnlUsd} on the day — defense first, no chasing.`;

  const message =
    `Morning brief — book at $${balance}. ${topPosLine} ${moverLine} ${close}`;

  const chips: OpenerChip[] = [
    {
      id: "brief-risk",
      label: "Where's my risk this morning?",
      submit: "Where's my risk concentrated this morning?",
    },
    {
      id: "brief-setups",
      label: "What setups are you watching?",
      submit: "What setups are you watching into the open?",
    },
    {
      id: "brief-trim",
      label: "Anything to trim before the open?",
      submit: "Walk me through anything I should trim before the open.",
    },
  ];

  return { message, chips };
}

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

function baseTicker(symbol: string): string {
  return symbol.split("-")[0];
}

function formatPnl(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function pickTopMover() {
  const ranked = MARKETS.map((m) => ({
    market: m,
    pct: parseChangePct(m.change24h),
  }))
    .filter((x) => x.pct !== 0)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  if (ranked.length === 0) return null;
  const top = ranked[0];
  return {
    market: top.market,
    ticker: top.market.symbol.split("-")[0],
    absPct: Math.abs(top.pct),
    dir: top.pct >= 0 ? "up" : "down",
  };
}

function parseChangePct(s: string | undefined): number {
  if (!s) return 0;
  const m = s.match(/-?\d+\.?\d*/);
  return m ? parseFloat(m[0]) : 0;
}
