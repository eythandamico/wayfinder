/**
 * Ask-agent event — the unified pipeline for "the user clicked
 * something on the desk and wants the agent to explain it." Every
 * desk object (position rows, market header, top movers, news rows,
 * signal toasts) dispatches one of these and ChatPanel's listener
 * turns it into a chat exchange: user-side bubble = the implicit
 * question, agent-side reply = a 2-sentence contextual answer in
 * gut-check house style.
 *
 * Reply copy reads from the payload's real numbers — leverage, liq
 * distance, funding APR, % move, etc. — so the agent sounds like
 * it's looking at the same row you just clicked.
 */

import type { Market } from "../_types";
import { POSITIONS, type PositionRow } from "../_data/positions";
import type { TradingCard } from "../_data/trading-cards";
import type { OpenerChip } from "./opener";

export const ASK_AGENT_EVENT = "wf:ask-agent";

/** A follow-up chip rendered under the agent's reply. Same shape as
 *  OpenerChip — both routes lead through the same `startThinking`
 *  user-send path so chips read as real user messages on click. */
export type AskAgentChip = OpenerChip;

/** Subset of NewsPanel's NewsItem we actually need to write the
 *  reply. Kept structurally typed so the panel's local type satisfies
 *  it without an import dance. */
export type AskAgentNewsItem = {
  id: string;
  headline: string;
  source: string;
  tickers?: string[];
  impact?: "high" | "medium";
};

export type AskAgentPolymarketEvent = {
  id: string;
  title: string;
  /** 24h trading volume in USD. */
  volume24h: number;
  /** ISO timestamp or short label like "Jan 2028". */
  endsAt?: string | null;
};

export type AskAgentPayload =
  | { kind: "position"; row: PositionRow }
  | { kind: "market"; market: Market }
  | { kind: "mover"; market: Market; pct: number }
  | { kind: "news"; item: AskAgentNewsItem }
  | { kind: "signal"; card: TradingCard }
  | { kind: "polymarket"; event: AskAgentPolymarketEvent }
  | {
      kind: "portfolio";
      balance: number;
      changeUsd: number;
      changePct: number;
    };

export type AskAgentReply = {
  /** User-side bubble — what the user implicitly asked by clicking. */
  question: string;
  /** Agent-side reply — 2 sentences, plain language, no headers. */
  reply: string;
  /** Follow-up chips rendered under the reply after streaming
   *  completes. Decision / action–oriented (cut, hedge, monitor,
   *  pile in) so the next step is always one tap away — same
   *  pattern as the opener chips. */
  chips: AskAgentChip[];
};

export function askAgent(payload: AskAgentPayload): void {
  window.dispatchEvent(
    new CustomEvent<AskAgentPayload>(ASK_AGENT_EVENT, { detail: payload }),
  );
}

export function generateAskAgentReply(payload: AskAgentPayload): AskAgentReply {
  switch (payload.kind) {
    case "position":
      return positionReply(payload.row);
    case "market":
      return marketReply(payload.market);
    case "mover":
      return moverReply(payload.market, payload.pct);
    case "news":
      return newsReply(payload.item);
    case "signal":
      return signalReply(payload.card);
    case "polymarket":
      return polymarketReply(payload.event);
    case "portfolio":
      return portfolioReply(payload.balance, payload.changeUsd, payload.changePct);
  }
}

/* ------------------------------------------------------------------ */
/*  per-kind generators                                                */
/* ------------------------------------------------------------------ */

function positionReply(p: PositionRow): AskAgentReply {
  const ticker = baseTicker(p.symbol);
  const sideLabel = sideAsText(p.side);

  if (p.kind === "perp") {
    const liqMovePct = liqDistancePct(p);
    const fundingApr = parseFundingApr(p.fundingApr);
    const pnlLabel = formatPnl(p.pnlPct);
    const fundingClause = Number.isFinite(fundingApr) && fundingApr !== 0
      ? `Funding APR is ${p.fundingApr ?? "?"} — that's ${fundingApr < 0 ? "costing you" : "paying you"} ${Math.abs(fundingApr).toFixed(2)}% annualized.`
      : "Funding is roughly flat right now.";
    return {
      question: `What's my exposure on this ${ticker} ${sideLabel}?`,
      reply:
        `You're ${sideLabel} ${p.size ?? "?"} ${ticker} at ${p.leverage ?? "?"}× ` +
        `with liquidation ~${liqMovePct.toFixed(1)}% away and the line up ${pnlLabel} day over day. ` +
        fundingClause,
      chips: [
        {
          id: "cut-half",
          label: `Cut my ${ticker} ${sideLabel} by half`,
          submit: `Cut my ${ticker} ${sideLabel} by half — walk me through the order.`,
        },
        {
          id: "hedge",
          label: `What's the hedge play?`,
          submit: `What's the cleanest hedge for my ${ticker} ${sideLabel}?`,
        },
        {
          id: "liq-monitor",
          label: `Set a liq monitor`,
          submit: `Set up a liquidation-price monitor on ${ticker}.`,
        },
      ],
    };
  }

  if (p.kind === "spot") {
    return {
      question: `What's my ${ticker} bag look like?`,
      reply:
        `You're holding ${p.size ?? "?"} ${ticker} at $${p.value.toLocaleString()} notional, day P/L ${formatPnl(p.pnlPct)}. ` +
        `No funding burn since it's spot — the question is whether the thesis is still intact.`,
      chips: [
        {
          id: "take-half",
          label: `Take half off`,
          submit: `Walk me through taking half off my ${ticker} bag.`,
        },
        {
          id: "dca",
          label: `Where would I DCA?`,
          submit: `Where are the levels to add to my ${ticker} bag?`,
        },
        {
          id: "thesis",
          label: `Is the thesis intact?`,
          submit: `Is the ${ticker} thesis still intact based on the tape?`,
        },
      ],
    };
  }

  if (p.kind === "prediction") {
    return {
      question: `What's my position on ${p.symbol}?`,
      reply:
        `You're holding ${sideLabel} on ${p.symbol} at $${p.value.toLocaleString()} notional, currently ${formatPnl(p.pnlPct)} from entry. ` +
        `Resolution ${p.expiresAt ?? "TBD"} — the call is whether to wait it out or take the implied price now.`,
      chips: [
        {
          id: "wait",
          label: `Wait for resolution`,
          submit: `Make the case for waiting on ${p.symbol}.`,
        },
        {
          id: "exit-now",
          label: `Take the implied price`,
          submit: `Walk me through taking the implied price on ${p.symbol} now.`,
        },
        {
          id: "hedge-poly",
          label: `Hedge it`,
          submit: `What's a clean hedge for my ${p.symbol} position?`,
        },
      ],
    };
  }

  // cash
  return {
    question: `What's sitting in cash?`,
    reply:
      `You've got $${p.value.toLocaleString()} idle. ` +
      `If you tell me what you're looking to do today I can map it against the tape.`,
    chips: [
      {
        id: "movers",
        label: `Show me today's movers`,
        submit: `Show me today's biggest movers across perps.`,
      },
      {
        id: "starters",
        label: `What's worth a starter?`,
        submit: `What's worth a starter position right now?`,
      },
    ],
  };
}

function marketReply(m: Market): AskAgentReply {
  const ticker = baseTicker(m.symbol);
  const pct = parseChangePct(m.change24h);
  const dir = pct >= 0 ? "+" : "";
  return {
    question: `What's the read on ${ticker}?`,
    reply:
      `${ticker} is at ${m.lastPrice} on ${m.venue}, ${dir}${pct.toFixed(2)}% on the day with $${m.volume ?? "?"} volume. ` +
      `${pct >= 0 ? "Momentum bid, but watch for confirmation before committing size." : "Sellers in control — wait for a clean reclaim or fade rallies."} ` +
      `Want me to wire it up on the chart?`,
    chips: [
      {
        id: "watchlist",
        label: `Add ${ticker} to my watchlist`,
        submit: `Add ${ticker} to my watchlist.`,
      },
      {
        id: "funding-rates",
        label: `Show me funding rates`,
        submit: `Show me the funding rate history on ${ticker}.`,
      },
      {
        id: "alert",
        label: `Set a price alert`,
        submit: `Set up a price alert on ${ticker}.`,
      },
    ],
  };
}

function moverReply(m: Market, pct: number): AskAgentReply {
  const ticker = baseTicker(m.symbol);
  const dir = pct >= 0 ? "up" : "down";
  return {
    question: `Why is ${ticker} ${dir} ${Math.abs(pct).toFixed(2)}%?`,
    reply:
      `${ticker} is ${dir} ${Math.abs(pct).toFixed(2)}% on ${m.venue} with $${m.volume ?? "?"} pushing it. ` +
      `${pct >= 0 ? "Leading the gainers today — usually flows + a narrative, not a single catalyst." : "Leading the losers — looks like positioning unwind, not a hard sell signal yet."}`,
    chips: [
      {
        id: "fourh",
        label: `Show me the 4h chart`,
        submit: `Pull up the 4h chart on ${ticker}.`,
      },
      {
        id: "similar",
        label: `Find similar setups`,
        submit: `Find me names with a similar setup to ${ticker}.`,
      },
      {
        id: "starter",
        label: `Worth a starter?`,
        submit: `Is ${ticker} worth a starter position here?`,
      },
    ],
  };
}

function newsReply(n: AskAgentNewsItem): AskAgentReply {
  const tickerList = n.tickers && n.tickers.length > 0
    ? n.tickers.map((t) => `$${t}`).join(", ")
    : null;
  const impactClause = n.impact === "high"
    ? "This one's worth paying attention to"
    : "Reads like background noise on your book";
  const firstTicker = n.tickers?.[0];
  return {
    question: `What does this mean for my book?`,
    reply:
      `${impactClause} — "${truncate(n.headline, 80)}" via ${n.source}. ` +
      (tickerList
        ? `Most direct read is on ${tickerList}; if you're in any of those I'd glance at the chart before doing anything else.`
        : `Nothing on your sheet maps directly — fine to watch and keep moving.`),
    chips: firstTicker
      ? [
          {
            id: "map-book",
            label: `Map it to my book`,
            submit: `Map this news to my open positions.`,
          },
          {
            id: "pull-chart",
            label: `Pull up $${firstTicker}`,
            submit: `$${firstTicker}`,
          },
          {
            id: "next-domino",
            label: `What's the next domino?`,
            submit: `If this is real, what's the next thing that moves?`,
          },
        ]
      : [
          {
            id: "map-book-2",
            label: `Map it to my book`,
            submit: `Map this news to my open positions.`,
          },
          {
            id: "next-domino-2",
            label: `What's the next domino?`,
            submit: `If this is real, what's the next thing that moves?`,
          },
        ],
  };
}

function polymarketReply(e: AskAgentPolymarketEvent): AskAgentReply {
  const volLabel = e.volume24h >= 1000
    ? `$${(e.volume24h / 1000).toFixed(1)}K`
    : `$${e.volume24h.toFixed(0)}`;
  const ends = e.endsAt ? `, resolves ${e.endsAt}` : "";
  return {
    question: `What's the read on "${truncate(e.title, 60)}"?`,
    reply:
      `"${truncate(e.title, 80)}" on Polymarket — ${volLabel} traded today${ends}. ` +
      `Two questions to answer first: is the consensus price reasonable, and can you live with the time-to-resolution. Want me to walk through it?`,
    chips: [
      {
        id: "implied",
        label: `Show me the implied odds`,
        submit: `Walk me through the implied odds on this Polymarket market.`,
      },
      {
        id: "case-yes",
        label: `What's the case for YES?`,
        submit: `Make the case for YES on this Polymarket market.`,
      },
      {
        id: "case-no",
        label: `What's the case for NO?`,
        submit: `Make the case for NO on this Polymarket market.`,
      },
    ],
  };
}

function portfolioReply(
  balance: number,
  changeUsd: number,
  changePct: number,
): AskAgentReply {
  const up = changeUsd >= 0;
  const dirVerb = up ? "up" : "down";
  const pnlLabel = `${up ? "+" : "−"}$${Math.abs(Math.round(changeUsd)).toLocaleString("en-US")} (${up ? "+" : ""}${changePct.toFixed(2)}%)`;
  const tradable = POSITIONS.filter((p) => p.kind !== "cash");
  const top = [...tradable].sort((a, b) => b.value - a.value)[0];
  const biggestLine = top
    ? `Biggest line is ${baseTicker(top.symbol)} at $${Math.round(top.value).toLocaleString("en-US")} (${formatPnl(top.pnlPct)})`
    : `Nothing meaningful open right now`;
  const sentiment = up
    ? `Book's in the green — no need to do anything dumb to chase it.`
    : `Book's red but contained — keep the bleed inside your daily R cap.`;
  return {
    question: `How's my book doing?`,
    reply:
      `You're at $${Math.round(balance).toLocaleString("en-US")} total, ${dirVerb} ${pnlLabel} on the day. ` +
      `${biggestLine}. ${sentiment}`,
    chips: [
      {
        id: "risk-check",
        label: `Where's my risk concentrated?`,
        submit: `Where's my risk concentrated right now?`,
      },
      {
        id: "trim",
        label: `What should I trim?`,
        submit: `Walk me through what to trim on the book.`,
      },
      {
        id: "pnl-drivers",
        label: `What's driving today's P/L?`,
        submit: `Break down what's driving today's P/L on my book.`,
      },
    ],
  };
}

function signalReply(card: TradingCard): AskAgentReply {
  const sentiment = card.sentiment === "bull"
    ? "long"
    : card.sentiment === "bear"
      ? "short"
      : "neutral";
  return {
    question: `What's ${card.author.name}'s read on ${card.ticker}?`,
    reply:
      `${card.author.name} is ${sentiment} ${card.ticker} — the thesis is "${truncate(card.thesis, 100)}". ` +
      `${card.change24h >= 0 ? "Tape's confirming so far" : "Tape's against it right now"} (${card.change24h >= 0 ? "+" : ""}${card.change24h.toFixed(2)}%). Want to size in or pass?`,
    chips: [
      {
        id: "pile-in",
        label: `Pile in for 0.5R`,
        submit: `Pile in to ${card.ticker} for 0.5R alongside ${card.author.name}.`,
      },
      {
        id: "pass-watch",
        label: `Pass and watch`,
        submit: `Skip this one but flag ${card.ticker} on my watchlist.`,
      },
      {
        id: "compare",
        label: `Compare to my book`,
        submit: `Compare ${card.author.name}'s ${card.ticker} thesis against what I'm already holding.`,
      },
    ],
  };
}

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

function baseTicker(symbol: string): string {
  return symbol.split("-")[0];
}

function sideAsText(side: PositionRow["side"]): string {
  switch (side) {
    case "long":
      return "long";
    case "short":
      return "short";
    case "yes":
      return "YES";
    case "no":
      return "NO";
    default:
      return "—";
  }
}

function parseChangePct(s: string | undefined): number {
  if (!s) return 0;
  const m = s.match(/-?\d+\.?\d*/);
  return m ? parseFloat(m[0]) : 0;
}

function parseFundingApr(s: string | undefined): number {
  if (!s) return 0;
  const m = s.match(/-?\d+\.?\d*/);
  return m ? parseFloat(m[0]) : 0;
}

function liqDistancePct(p: PositionRow): number {
  if (!p.liq || !p.entry) return 0;
  return (Math.abs(p.entry - p.liq) / p.entry) * 100;
}

function formatPnl(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
