"use client";

import { useEffect, useRef } from "react";
import { MARKETS } from "../_data/markets";
import { buildCardFromTicker } from "../_data/trading-cards";
import { useSignals } from "../_state/signals-context";

/**
 * Agent proof-of-life — once per browser, ~90s into a session, the
 * Wayfinder agent publishes a signal on a top mover. Goes through
 * the existing `publishSignal({source:"agent", notify:true})` so the
 * dopamine cascade (sound + aurora flash + SignalToast) plays just
 * like any other incoming signal. Tapping the toast routes through
 * Phase 2's askAgent({kind:"signal"}) so the agent explains its own
 * pick in chat — which is exactly the moment that proves the agent
 * is alive and watching.
 *
 * One-shot per browser: localStorage gates re-fires across reloads.
 * DevTools dispatches AGENT_POL_FIRE_EVENT to bypass the gate for
 * design iteration.
 *
 * No UI of its own — mounted next to SignalToast at the page root.
 */

/** Delay before the agent's first proof-of-life fires. 90s gives the
 *  user time to actually engage the desk first; faster than this
 *  feels canned, slower and the demo window misses it. */
const POL_DELAY_MS = 90_000;

const POL_STORAGE_KEY = "wf-agent-pol-fired";

export const AGENT_POL_FIRE_EVENT = "wf:agent-pol-fire";

/** The agent's signed-as identity on the signals stream. Author id
 *  is the seed for the Jazzicon in the toast + notifications row, so
 *  it'll be the same picture every time. */
const AGENT_AUTHOR = { id: "wayfinder", name: "Wayfinder" } as const;

export function AgentProofOfLife() {
  const { publishSignal } = useSignals();
  /** Tracks "did we already fire in this React-mounted lifetime"
   *  separately from the localStorage gate, so the manual DevTools
   *  fire can re-fire without spawning duplicates inside the same
   *  load. */
  const firedRef = useRef(false);

  useEffect(() => {
    const fireOnce = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      const card = buildAgentMoverCard();
      if (!card) return;
      try {
        window.localStorage.setItem(POL_STORAGE_KEY, "1");
      } catch {
        /* storage unavailable — flag is session-only */
      }
      publishSignal(card, { source: "agent", notify: true });
    };

    const fireFromDevTools = () => {
      // Wipe both gates so the next fire goes through immediately.
      try {
        window.localStorage.removeItem(POL_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      firedRef.current = false;
      fireOnce();
    };

    window.addEventListener(AGENT_POL_FIRE_EVENT, fireFromDevTools);

    let alreadyFired = false;
    try {
      alreadyFired =
        window.localStorage.getItem(POL_STORAGE_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (alreadyFired) {
      firedRef.current = true;
      return () => {
        window.removeEventListener(AGENT_POL_FIRE_EVENT, fireFromDevTools);
      };
    }

    const timer = window.setTimeout(fireOnce, POL_DELAY_MS);
    return () => {
      window.removeEventListener(AGENT_POL_FIRE_EVENT, fireFromDevTools);
      window.clearTimeout(timer);
    };
  }, [publishSignal]);

  return null;
}

/** Build a TradingCard from today's top gainer in MARKETS. Returns
 *  null if MARKETS is empty or has no movers — defensive but unlikely
 *  given the seeded catalog. */
function buildAgentMoverCard() {
  const ranked = MARKETS.map((m) => ({
    market: m,
    pct: parseChangePct(m.change24h),
  }))
    .filter((x) => x.pct !== 0)
    .sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  if (ranked.length === 0) return null;
  const top = ranked[0];
  const m = top.market;
  const ticker = m.symbol.split("-")[0];
  const price = parseFloat(m.lastPrice.replace(/,/g, ""));

  const direction = top.pct >= 0 ? "up" : "down";
  const dirVerb = top.pct >= 0 ? "Leading the tape" : "Sliding off the tape";
  const thesis =
    `${ticker} ${direction} ${Math.abs(top.pct).toFixed(2)}% on the day` +
    (m.volume ? ` with ${m.volume} volume backing it` : "") +
    `. ${dirVerb} — worth a look before the close.`;

  return buildCardFromTicker(
    {
      ticker,
      name: ticker,
      kind: "crypto",
      price: Number.isFinite(price) ? price : 0,
      change24h: top.pct,
      iconChar: m.iconChar,
      iconBg: m.iconBg,
      iconFg: m.iconFg,
    },
    {
      thesis,
      author: { id: AGENT_AUTHOR.id, name: AGENT_AUTHOR.name },
    },
  );
}

function parseChangePct(s: string | undefined): number {
  if (!s) return 0;
  const m = s.match(/-?\d+\.?\d*/);
  return m ? parseFloat(m[0]) : 0;
}
