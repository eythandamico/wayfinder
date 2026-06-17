/**
 * Agent-initiated opener — the first message the agent says when the
 * user lands on an empty thread. Three first-run profiles, each with
 * a handful of stylistic variants so repeat loads don't feel canned.
 * Variant selection is deterministic from the session id so SSR and
 * client first render agree, and the same session reliably gets the
 * same opener.
 *
 * Copy style matches _lib/gut-check.ts — plain language, 2-3
 * sentences, ends in a question, no emoji, no headers. The agent
 * sounds like it's already looking at your book.
 */

import { MARKETS } from "../_data/markets";
import type { PositionRow } from "../_data/positions";
import { POSITIONS } from "../_data/positions";
import { MOCK_ACCOUNT } from "../_components/PortfolioPanel";

export type OpenerProfile = "active" | "funded" | "fresh";

/** Where a chip tap routes through ChatPanel. Default `submit` runs
 *  the regular user-send pipeline; the interview variants drive the
 *  fresh-wallet onboarding state machine. */
export type ChipFlow =
  | { kind: "submit" }
  | { kind: "interview-start" }
  | { kind: "interview-answer"; step: "trade-kind" | "risk-cap"; value: string };

export type OpenerChip = {
  id: string;
  /** Visible chip label. */
  label: string;
  /** Text submitted to the chat composer when the chip is tapped.
   *  Goes through startThinking → real user bubble + reply. Use
   *  `$TICKER` to materialize a trading card. */
  submit: string;
  /** Optional state-machine hook. When set, ChatPanel routes the
   *  tap to the named flow instead of the regular user-send path.
   *  Defaults to plain submit. */
  flow?: ChipFlow;
};

export type Opener = {
  message: string;
  chips: OpenerChip[];
};

/** Detect which profile applies to the current mock state. The dev
 *  toggle in DevTools overrides this. */
export function detectFirstRunProfile(): OpenerProfile {
  if (POSITIONS.length > 0) return "active";
  if ((MOCK_ACCOUNT.balance ?? 0) > 0) return "funded";
  return "fresh";
}

/** Stable seed derived from a string — matches the jazzicon-seed
 *  helper in activity-context. Used to pick a variant per session so
 *  loads of the same session produce the same opener. */
export function seedFromSessionId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = ((h * 31 + id.charCodeAt(i)) | 0) >>> 0;
  }
  return h;
}

export function generateOpener(profile: OpenerProfile, seed: number): Opener {
  switch (profile) {
    case "active": {
      const variants = buildActiveVariants();
      return variants[seed % variants.length];
    }
    case "funded": {
      const variants = buildFundedVariants();
      return variants[seed % variants.length];
    }
    case "fresh": {
      const variants = buildFreshVariants();
      return variants[seed % variants.length];
    }
  }
}

/* ------------------------------------------------------------------ */
/*  active — has positions                                             */
/* ------------------------------------------------------------------ */

function buildActiveVariants(): Opener[] {
  const perps = POSITIONS.filter((p) => p.kind === "perp");
  // Defensive fallback so an empty perps array doesn't crash the
  // helper picks below — caller normally only calls this when
  // POSITIONS is non-empty, but downsizing scenarios may strip perps.
  if (perps.length === 0) return buildFundedVariants();

  const highestLev = pickBy(
    perps,
    (p) => p.leverage ?? 0,
    "max",
  );
  const biggestPnl = pickBy(
    perps,
    (p) => Math.abs(p.pnlPct),
    "max",
  );
  const worstFunding = pickBy(
    perps,
    (p) => parseFundingApr(p.fundingApr),
    "min",
  );

  const highestLevTicker = baseTicker(highestLev.symbol);
  const biggestPnlTicker = baseTicker(biggestPnl.symbol);
  const worstFundingTicker = baseTicker(worstFunding.symbol);

  const liqMovePct = liqDistancePct(highestLev);

  return [
    // Variant A — leverage angle.
    {
      message:
        `Took a pass through your book. Your ${highestLevTicker} ${highestLev.side} is up at ${highestLev.leverage ?? "?"}× ` +
        `and liquidation sits roughly ${liqMovePct.toFixed(1)}% away — that's tight if ${highestLevTicker} sees its usual hourly chop. ` +
        `Want me to stress-test it or are you riding it?`,
      chips: [
        {
          id: "stress",
          label: `Stress-test my ${highestLevTicker} ${highestLev.side}`,
          submit: `Stress-test my ${highestLevTicker} ${highestLev.side}.`,
        },
        {
          id: "liq",
          label: "Show all my liq distances",
          submit: "Show me liquidation distances on every perp I have open.",
        },
        {
          id: "ticker",
          label: `$${highestLevTicker}`,
          submit: `$${highestLevTicker}`,
        },
      ],
    },
    // Variant B — funding angle.
    {
      message:
        `Your ${worstFundingTicker} ${worstFunding.side} is paying ${worstFunding.fundingApr ?? "?"} ` +
        `funding APR — that's the most expensive line on your book right now. ` +
        `Want the math on whether to wear it or unwind?`,
      chips: [
        {
          id: "funding-math",
          label: "Why is funding so negative?",
          submit: `Why is funding so negative on my ${worstFundingTicker} ${worstFunding.side}?`,
        },
        {
          id: "net-burn",
          label: "Show net funding burn",
          submit: "What's my net funding cost across all open perps per day?",
        },
        {
          id: "ticker-funding",
          label: `$${worstFundingTicker}`,
          submit: `$${worstFundingTicker}`,
        },
      ],
    },
    // Variant C — pnl mover angle.
    {
      message:
        `${biggestPnlTicker} is your biggest mover today at ${formatPnl(biggestPnl.pnlPct)}. ` +
        `${biggestPnl.pnlPct >= 0 ? "If this is what you came in for, taking half off locks the win and lets the rest run." : "If the thesis hasn't broken, the question is whether to add or cut."} ` +
        `What's the call?`,
      chips: [
        {
          id: "half-off",
          label: biggestPnl.pnlPct >= 0 ? "Take half off" : "Add or cut?",
          submit:
            biggestPnl.pnlPct >= 0
              ? `Walk me through taking half off my ${biggestPnlTicker} ${biggestPnl.side}.`
              : `Should I add to or cut my ${biggestPnlTicker} ${biggestPnl.side}?`,
        },
        {
          id: "monitor",
          label: "Set a liq-price monitor",
          submit: `Set up a liq-price monitor for ${biggestPnlTicker}.`,
        },
        {
          id: "ticker-pnl",
          label: `$${biggestPnlTicker}`,
          submit: `$${biggestPnlTicker}`,
        },
      ],
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  funded — cash, no positions                                        */
/* ------------------------------------------------------------------ */

function buildFundedVariants(): Opener[] {
  const movers = topMovers(2);
  const bull = movers.find((m) => m.dir === "up") ?? movers[0];
  const bear = movers.find((m) => m.dir === "down") ?? movers[1] ?? bull;

  return [
    // Variant A — bull lead.
    {
      message:
        `Quiet tape this morning, but ${bull.ticker} is up ${bull.changeAbs.toFixed(2)}% — that's the cleanest momentum on the board. ` +
        `You're sitting on dry powder. What are we hunting first?`,
      chips: [
        {
          id: "bull-ticker",
          label: `$${bull.ticker}`,
          submit: `$${bull.ticker}`,
        },
        {
          id: "scan",
          label: "Show me the rest of the movers",
          submit: "Show me today's top movers across perps.",
        },
        {
          id: "watchlist",
          label: "Build me a watchlist",
          submit:
            "Build me a watchlist of the four or five things you'd watch today.",
        },
      ],
    },
    // Variant B — pair lead.
    {
      message:
        `${bull.ticker} +${bull.changeAbs.toFixed(2)}%, ${bear.ticker} ${bear.changeAbs >= 0 ? "+" : "-"}${Math.abs(bear.changeAbs).toFixed(2)}%. ` +
        `Two sides of the same trade if you want a pair. What's the angle you're looking for?`,
      chips: [
        {
          id: "pair",
          label: `Pair trade on ${bull.ticker} / ${bear.ticker}`,
          submit: `Walk me through a ${bull.ticker} long / ${bear.ticker} short pair.`,
        },
        {
          id: "scan-pair",
          label: "Show me today's top movers",
          submit: "Show me today's biggest movers across perps.",
        },
        {
          id: "ticker-pair",
          label: `$${bull.ticker}`,
          submit: `$${bull.ticker}`,
        },
      ],
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  fresh — empty wallet                                               */
/* ------------------------------------------------------------------ */

function buildFreshVariants(): Opener[] {
  const movers = topMovers(2);
  const lead = movers[0];
  const second = movers[1] ?? lead;

  return [
    // Variant A — competence proof + fork.
    {
      message:
        `Tape's interesting: ${lead.ticker} ${lead.dir === "up" ? "+" : "-"}${lead.changeAbs.toFixed(2)}% and ${second.ticker} the opposite direction. ` +
        `Both look tradable. Want the breakdown, or tell me what you actually trade first?`,
      chips: [
        {
          id: "breakdown",
          label: "Give me the breakdown",
          submit: `Walk me through ${lead.ticker} and ${second.ticker} — what's driving today's move on each?`,
        },
        {
          id: "what-i-trade",
          label: "Let me tell you what I trade",
          submit: "Let me tell you what I trade first.",
          flow: { kind: "interview-start" },
        },
      ],
    },
    // Variant B — minimalist lead.
    {
      message:
        `Fresh wallet — easiest start is telling me what you trade so I can stop guessing. ` +
        `Want to set that up, or want me to show you what's moving first?`,
      chips: [
        {
          id: "set-up",
          label: "Set me up",
          submit: "Let me tell you what I trade first.",
          flow: { kind: "interview-start" },
        },
        {
          id: "show-me",
          label: "Show me what's moving",
          submit: "Show me the biggest movers today.",
        },
      ],
    },
  ];
}

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

function baseTicker(symbol: string): string {
  return symbol.split("-")[0];
}

function pickBy<T>(
  arr: T[],
  score: (x: T) => number,
  mode: "max" | "min",
): T {
  let best = arr[0];
  let bestScore = score(best);
  for (const x of arr.slice(1)) {
    const s = score(x);
    if (mode === "max" ? s > bestScore : s < bestScore) {
      best = x;
      bestScore = s;
    }
  }
  return best;
}

function parseFundingApr(apr: string | undefined): number {
  if (!apr) return 0;
  const m = apr.match(/-?\d+\.?\d*/);
  return m ? parseFloat(m[0]) : 0;
}

function parseChangePct(s: string | undefined): number {
  if (!s) return 0;
  const m = s.match(/-?\d+\.?\d*/);
  return m ? parseFloat(m[0]) : 0;
}

function liqDistancePct(p: PositionRow): number {
  if (!p.liq || !p.entry) return 0;
  const ref = p.entry;
  return (Math.abs(ref - p.liq) / ref) * 100;
}

function formatPnl(pct: number): string {
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

type Mover = {
  ticker: string;
  changeAbs: number;
  dir: "up" | "down";
};

function topMovers(n: number): Mover[] {
  const all = MARKETS.map((m) => {
    const pct = parseChangePct(m.change24h);
    return {
      ticker: baseTicker(m.symbol),
      changeAbs: pct,
      dir: pct >= 0 ? ("up" as const) : ("down" as const),
    };
  });
  // Highest |change| first, but interleave one bull + one bear for
  // variant copy that wants two opposing examples.
  const bulls = all.filter((m) => m.dir === "up").sort((a, b) => b.changeAbs - a.changeAbs);
  const bears = all
    .filter((m) => m.dir === "down")
    .sort((a, b) => a.changeAbs - b.changeAbs);
  const out: Mover[] = [];
  for (let i = 0; out.length < n; i += 1) {
    if (i % 2 === 0 && bulls[Math.floor(i / 2)]) out.push(bulls[Math.floor(i / 2)]);
    else if (bears[Math.floor(i / 2)]) out.push(bears[Math.floor(i / 2)]);
    else break;
  }
  return out;
}
