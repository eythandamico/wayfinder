/**
 * Gut Check — the agent's pre-flight review of the trade currently
 * sitting in the TradePanel ticket. The TradePanel dispatches the
 * GUT_CHECK_EVENT with a snapshot of the ticket state; the ChatPanel
 * listens, kicks off its thinking state, and types out a styled
 * "Gut Check" reply in the chat once analysis "completes."
 *
 * Output shape is intentionally minimal: a 1-2 sentence summary
 * (the agent's read in plain language) plus a tone-coloured
 * verdict for the standout box at the end. No section structure —
 * the bubble reads as a real agent reply, not a UI card.
 */

export const GUT_CHECK_EVENT = "wf:gut-check";

export type GutCheckSnapshot = {
  side: "long" | "short";
  /** Raw size string from the input (may be "0" / "" / "0.04"). */
  size: string;
  /** Slider percentage 0–100. */
  pct: number;
  leverage: number;
  margin: string;
  orderType: string;
  marketSymbol: string;
  marketDisplay: string;
  isReducing: boolean;
  positionSide?: "long" | "short";
  positionSize?: number;
};

export type GutCheckVerdict = {
  tone: "go" | "caution" | "stop";
  copy: string;
};

export type GutCheckReply = {
  id: string;
  ts: number;
  snapshot: GutCheckSnapshot;
  /** Short read on the trade — 1 to 2 sentences, conversational. */
  summary: string;
  verdict: GutCheckVerdict;
};

export function generateGutCheck(s: GutCheckSnapshot): GutCheckReply {
  if (s.isReducing && s.positionSize !== undefined && s.positionSide) {
    return buildReduceCheck(s, s.positionSize, s.positionSide);
  }
  return buildOpenCheck(s);
}

function buildReduceCheck(
  s: GutCheckSnapshot,
  positionSize: number,
  positionSide: "long" | "short",
): GutCheckReply {
  const sideLabel = positionSide === "long" ? "long" : "short";
  const remaining = positionSize * (1 - s.pct / 100);

  let summary: string;
  let verdict: GutCheckVerdict;

  if (s.pct >= 95) {
    summary = `Flattening your ${sideLabel} ${positionSize} ${s.marketSymbol} entirely — margin frees up and you're out of the trade. If the move continues you'll be on the sidelines.`;
    verdict = { tone: "go", copy: "Clean exit. Send when ready." };
  } else if (s.pct >= 70) {
    summary = `Big trim on your ${sideLabel} — taking most of the position off. Leaves you with ${remaining.toFixed(3)} ${s.marketSymbol} on a thinner directional bet.`;
    verdict = { tone: "go", copy: "Solid trim. Locking gains looks right." };
  } else if (s.pct >= 40) {
    summary = `Mid-trim on your ${sideLabel} ${positionSize} ${s.marketSymbol}. Takes pressure off while keeping skin in for any continuation.`;
    verdict = { tone: "go", copy: "Reasonable derisk." };
  } else {
    summary = `Light trim — derisks the ${sideLabel} without abandoning the trade idea. Useful before an event or into resistance.`;
    verdict = { tone: "go", copy: "Reduce looks consistent with the playbook." };
  }

  return {
    id: makeId(),
    ts: Date.now(),
    snapshot: s,
    summary,
    verdict,
  };
}

function buildOpenCheck(s: GutCheckSnapshot): GutCheckReply {
  const liqMovePct = (100 / s.leverage).toFixed(1);
  const sideLabel = s.side === "long" ? "Long" : "Short";

  let summary: string;
  let verdict: GutCheckVerdict;

  if (s.leverage >= 40) {
    summary = `${sideLabel}ing ${s.marketSymbol} at ${s.leverage}× sits in the danger band — a ${liqMovePct}% adverse move liquidates, which is well inside normal hourly chop. The thesis can be right and you can still get stopped out.`;
    verdict = { tone: "stop", copy: "Dial the leverage back before sending." };
  } else if (s.leverage >= 20) {
    summary = `${sideLabel} ${s.marketSymbol} at ${s.leverage}× is aggressive — liquidation sits roughly ${liqMovePct}% against you. Enough room for typical intraday wiggle, not enough for a sustained move.`;
    verdict = { tone: "caution", copy: "Liq is tight — eyes open." };
  } else if (s.leverage >= 5) {
    summary = `${sideLabel} ${s.marketSymbol} at ${s.leverage}× gives the trade about ${liqMovePct}% of breathing room before liquidation. Real space for the thesis to play out without random ticks ending it.`;
    verdict = { tone: "go", copy: "Reasonable setup. Send when ready." };
  } else {
    summary = `${sideLabel} ${s.marketSymbol} at ${s.leverage}× is conservative — liquidation isn't your concern at this leverage. This trade lives or dies on the thesis and how patient you can be.`;
    verdict = { tone: "go", copy: "Low-leverage trade — focus on conviction." };
  }

  return {
    id: makeId(),
    ts: Date.now(),
    snapshot: s,
    summary,
    verdict,
  };
}

function makeId(): string {
  return `gc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
