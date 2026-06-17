/**
 * Casino spin reel — symbol table + outcome roll.
 *
 * 8 symbols using the v3 casino artwork (Japanese-coded tiles to
 * match the companion's anime aesthetic). spin() rolls an outcome
 * (jackpot / near-miss / miss) using a fixed distribution biased
 * toward wins — this is a demo, not a fair slot. On jackpot the
 * prize is multiplier × BASE_PRIZE.
 */

export type CasinoSymbol = {
  id: string;
  /** Display label for the prize line and accessibility. */
  label: string;
  /** Image path under /public. */
  src: string;
  /** Multiplier applied to BASE_PRIZE on a 3-of-a-kind. */
  payout: number;
};

export const CASINO_SYMBOLS: CasinoSymbol[] = [
  { id: "samurai", label: "Samurai", src: "/casino/samurai.png", payout: 12 },
  { id: "token", label: "Token", src: "/casino/token.png", payout: 10 },
  { id: "cat", label: "Cat", src: "/casino/cat.png", payout: 8 },
  { id: "thing", label: "Thing", src: "/casino/thing.png", payout: 7 },
  { id: "sakura", label: "Sakura", src: "/casino/sakura.png", payout: 5 },
  { id: "lantern", label: "Lantern", src: "/casino/lantern.png", payout: 4 },
  { id: "fish", label: "Fish", src: "/casino/fish.png", payout: 3 },
  { id: "guy", label: "Guy", src: "/casino/guy.png", payout: 2 },
];

export const BASE_PRIZE = 50;

export type Outcome = "jackpot" | "near-miss" | "miss";

export type SpinResult = {
  symbols: [CasinoSymbol, CasinoSymbol, CasinoSymbol];
  outcome: Outcome;
  /** USD payout. 0 for non-jackpot. */
  prizeUsd: number;
};

/** Bias toward dopamine: 45% jackpot, 35% near-miss, 20% miss. */
export function spin(): SpinResult {
  const r = Math.random();
  const pick = () =>
    CASINO_SYMBOLS[Math.floor(Math.random() * CASINO_SYMBOLS.length)];

  if (r < 0.45) {
    const s = pick();
    return {
      symbols: [s, s, s],
      outcome: "jackpot",
      prizeUsd: s.payout * BASE_PRIZE,
    };
  }

  if (r < 0.8) {
    const s = pick();
    const others = CASINO_SYMBOLS.filter((x) => x.id !== s.id);
    const odd = others[Math.floor(Math.random() * others.length)];
    const trio: [CasinoSymbol, CasinoSymbol, CasinoSymbol] = [s, s, s];
    const oddIdx = Math.floor(Math.random() * 3) as 0 | 1 | 2;
    trio[oddIdx] = odd;
    return { symbols: trio, outcome: "near-miss", prizeUsd: 0 };
  }

  // Miss — three distinct, shuffled.
  const shuffled = [...CASINO_SYMBOLS].sort(() => Math.random() - 0.5);
  return {
    symbols: [shuffled[0], shuffled[1], shuffled[2]],
    outcome: "miss",
    prizeUsd: 0,
  };
}

export const CASINO_OPEN_EVENT = "wf:casino:open";
