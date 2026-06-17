/**
 * Fresh-wallet onboarding interview. A two-question chip-driven flow
 * that closes by DOING something with the answers: setting the daily
 * R cap (via signals-context) and seeding the watchlist tickers (via
 * shells-context). The close message names the artifacts so the
 * agent is visibly competent — "I'll watch BTC, ETH, SOL for you,
 * they're in your watchlist now."
 *
 * Kept as a pure state machine — ChatPanel plugs the transitions
 * into runAgentReply and side-effects in its useActivity / signals /
 * shells hooks. Nothing here reaches React state directly.
 */

import type { OpenerChip } from "./opener";

export type TradeKind = "perps" | "spot" | "predictions" | "all";

export type InterviewStep = "trade-kind" | "risk-cap" | "done";

export type InterviewState = {
  step: InterviewStep;
  tradeKind?: TradeKind;
  riskR?: number;
};

export type InterviewTurn = {
  /** The agent's reply for this step. */
  message: string;
  /** Chips that drive the NEXT step. */
  chips: OpenerChip[];
};

export type InterviewClose = {
  /** Close message — describes the side effects that just ran. */
  message: string;
  /** Tickers to seed into the global watchlist. */
  watchlistTickers: string[];
  /** Daily R cap to set on the signals context. */
  dailyRCap: number;
  /** Trade kind the user picked, for downstream personalisation. */
  tradeKind: TradeKind;
};

/** Kick off the interview — returns the first agent turn. */
export function startInterview(): { state: InterviewState; turn: InterviewTurn } {
  return {
    state: { step: "trade-kind" },
    turn: {
      message:
        `Cool. Quick — what do you trade? I'll line up your watchlist and risk window around it.`,
      chips: [
        chip("tk-perps", "Perps", "Perps", { step: "trade-kind", value: "perps" }),
        chip("tk-spot", "Spot", "Spot", { step: "trade-kind", value: "spot" }),
        chip(
          "tk-predictions",
          "Predictions",
          "Predictions",
          { step: "trade-kind", value: "predictions" },
        ),
        chip("tk-all", "All of it", "All of it", { step: "trade-kind", value: "all" }),
      ],
    },
  };
}

/** Advance the interview given a chip's value. Returns either the
 *  next agent turn OR — when the close step lands — the close
 *  artefact (so the caller can apply side effects). */
export function advanceInterview(
  state: InterviewState,
  answerValue: string,
):
  | { state: InterviewState; turn: InterviewTurn }
  | { state: InterviewState; close: InterviewClose } {
  if (state.step === "trade-kind") {
    const tradeKind = parseTradeKind(answerValue);
    return {
      state: { ...state, step: "risk-cap", tradeKind },
      turn: {
        message:
          `Got it — ${tradeKindLabel(tradeKind)}. How much are you comfortable risking per day?`,
        chips: [
          chip("rr-1", "1R", "1R", { step: "risk-cap", value: "1" }),
          chip("rr-3", "3R", "3R", { step: "risk-cap", value: "3" }),
          chip("rr-5", "5R", "5R", { step: "risk-cap", value: "5" }),
        ],
      },
    };
  }

  if (state.step === "risk-cap" && state.tradeKind) {
    const riskR = parseInt(answerValue, 10);
    const safeRisk = Number.isFinite(riskR) ? riskR : 5;
    const tickers = pickTickersForTradeKind(state.tradeKind);
    return {
      state: { step: "done", tradeKind: state.tradeKind, riskR: safeRisk },
      close: {
        message: closeMessage(state.tradeKind, safeRisk, tickers),
        watchlistTickers: tickers,
        dailyRCap: safeRisk,
        tradeKind: state.tradeKind,
      },
    };
  }

  // Defensive — should never hit, but if state is malformed, restart.
  return startInterview();
}

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

function chip(
  id: string,
  label: string,
  submit: string,
  answer: { step: "trade-kind" | "risk-cap"; value: string },
): OpenerChip {
  return {
    id,
    label,
    submit,
    flow: { kind: "interview-answer", step: answer.step, value: answer.value },
  };
}

function parseTradeKind(v: string): TradeKind {
  if (v === "perps" || v === "spot" || v === "predictions" || v === "all") {
    return v;
  }
  return "all";
}

function tradeKindLabel(k: TradeKind): string {
  switch (k) {
    case "perps":
      return "perps";
    case "spot":
      return "spot";
    case "predictions":
      return "predictions";
    case "all":
      return "all of it";
  }
}

/** Watchlist seed per trade kind. Tickers are MARKETS ids — the
 *  WatchlistPanel looks them up by `m.id`. */
function pickTickersForTradeKind(k: TradeKind): string[] {
  switch (k) {
    case "perps":
      return ["btc", "eth", "sol", "hype"];
    case "spot":
      return ["btc", "eth", "sol"];
    case "predictions":
      // Predictions don't have MARKETS rows; seed with the majors so
      // the panel isn't empty, and let the close copy mention the
      // Polymarket angle explicitly.
      return ["btc", "eth", "sol"];
    case "all":
      return ["btc", "eth", "sol", "hype"];
  }
}

function closeMessage(
  kind: TradeKind,
  riskR: number,
  tickers: string[],
): string {
  const tickerLabels = tickers.map((t) => t.toUpperCase()).join(", ");
  const predicSuffix =
    kind === "predictions"
      ? " (plus I'll flag the high-volume Polymarket events as they move)"
      : "";
  return (
    `Locked in. ${riskR}R daily cap, and I'll watch ${tickerLabels} for you — they're in your watchlist now${predicSuffix}. ` +
    `Hit me anytime — type a ticker, tell me an idea, or just ask "what's moving."`
  );
}
