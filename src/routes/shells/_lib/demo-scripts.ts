import type { DemoStep } from "./demo";

/** Named demo scripts. Each entry is an array of DemoSteps ordered by
 *  their `at` offset from start (ms). Keep timings in ms — the runner
 *  schedules one setTimeout per step. */
export const DEMO_SCRIPTS: Record<string, { label: string; steps: DemoStep[] }> = {
  "main-reel": {
    label: "Main reel",
    /*
     * Tight 3-beat walkthrough:
     *   1. Open command bar → switch chart to HYPE
     *   2. Open the trade panel, type a size, click Place Market Long
     *   3. order-placed + lev-10x dopamine stingers
     *
     * Typing budgets (55ms per char):
     *   "HYPE"   ~220ms
     *   "100"    ~165ms
     */
    steps: [
      /* ── 1. Cursor enters off-screen, opens the command bar ────── */
      { at: 0, kind: "cursor", target: { x: -40, y: 80 }, durationMs: 0 },
      { at: 500, kind: "cursor", target: '[data-demo="command-trigger"]' },
      { at: 1500, kind: "click", target: '[data-demo="command-trigger"]' },

      /* ── 2. Type HYPE in the command bar, click the row ────────── */
      { at: 2000, kind: "cursor", target: '[data-demo="command-input"]' },
      {
        at: 2400,
        kind: "type",
        selector: '[data-demo="command-input"]',
        text: "HYPE",
      },
      // "HYPE" finishes typing ~2620ms.
      { at: 3000, kind: "cursor", target: '[data-demo="command-market-hype"]' },
      { at: 3500, kind: "click", target: '[data-demo="command-market-hype"]' },

      /* ── 3. Move to the trade panel, set size, place market long ─ */
      { at: 4400, kind: "cursor", target: '[data-demo="trade-size-input"]' },
      {
        at: 5000,
        kind: "type",
        selector: '[data-demo="trade-size-input"]',
        text: "100",
      },
      // "100" finishes typing ~5165ms.
      { at: 5700, kind: "cursor", target: '[data-demo="trade-place"]' },
      { at: 6400, kind: "click", target: '[data-demo="trade-place"]' },

      /* ── 4. Dopamine: order placed, then 10x leverage ───────────
         order-placed.webm runs ~3.04s — lev-10x kicks in right as
         it wraps so the two stingers feel like one continuous beat. */
      { at: 6800, kind: "dopamine", id: "order-placed" },
      { at: 9850, kind: "dopamine", id: "lev-10x" },
    ],
  },
  "position-up-mobile": {
    label: "Position up (mobile)",
    /*
     * Tight mobile scene. Resize the browser to <768px before playing
     * — that's what triggers MobileLayout to render.
     *
     * Beats:
     *   • Open the search button → command bar
     *   • Type HYPE, pick the row → chart switches to HYPE
     *   • up-25 stinger pops (cursor parked off-screen so it reads
     *     like a notification, not a tap)
     */
    steps: [
      { at: 0, kind: "cursor", target: { x: -40, y: 80 }, durationMs: 0 },
      { at: 400, kind: "cursor", target: '[data-demo="command-trigger"]' },
      { at: 1400, kind: "click", target: '[data-demo="command-trigger"]' },
      { at: 1900, kind: "cursor", target: '[data-demo="command-input"]' },
      {
        at: 2300,
        kind: "type",
        selector: '[data-demo="command-input"]',
        text: "HYPE",
      },
      { at: 2900, kind: "cursor", target: '[data-demo="command-market-hype"]' },
      { at: 3400, kind: "click", target: '[data-demo="command-market-hype"]' },

      // Park the cursor off-screen so the stinger lands with no
      // cursor in the frame — reads like a notification, not a tap.
      { at: 4200, kind: "cursor", target: { x: -200, y: -200 }, durationMs: 0 },
      { at: 4600, kind: "dopamine", id: "up-25" },
    ],
  },
  "position-up-50-mobile": {
    label: "Position up 50% (mobile)",
    /*
     * Same shape as position-up-mobile, but fires the up-50 stinger
     * for the bigger milestone. Resize the browser to <768px before
     * playing — that's what triggers MobileLayout to render.
     */
    steps: [
      { at: 0, kind: "cursor", target: { x: -40, y: 80 }, durationMs: 0 },
      { at: 400, kind: "cursor", target: '[data-demo="command-trigger"]' },
      { at: 1400, kind: "click", target: '[data-demo="command-trigger"]' },
      { at: 1900, kind: "cursor", target: '[data-demo="command-input"]' },
      {
        at: 2300,
        kind: "type",
        selector: '[data-demo="command-input"]',
        text: "HYPE",
      },
      { at: 2900, kind: "cursor", target: '[data-demo="command-market-hype"]' },
      { at: 3400, kind: "click", target: '[data-demo="command-market-hype"]' },

      { at: 4200, kind: "cursor", target: { x: -200, y: -200 }, durationMs: 0 },
      { at: 4600, kind: "dopamine", id: "up-50" },
    ],
  },
  "close-the-trade": {
    label: "Close the trade (desktop)",
    /*
     * ~13-second desktop scene. Resize back to ≥768px before
     * playing — DesktopShell needs to be the active layout.
     *
     * Beats:
     *   • Open the command bar, switch the chart to HYPE
     *   • up-50 stinger pops (chart is pumping)
     *   • Open the portfolio side-sheet from the wallet pill
     *   • Cursor on the HYPE-PERP row, click its Close button
     *     → sell-green stinger fires + the row collapses
     */
    steps: [
      { at: 0, kind: "cursor", target: { x: -40, y: 80 }, durationMs: 0 },

      // Switch chart to HYPE.
      { at: 400, kind: "cursor", target: '[data-demo="command-trigger"]' },
      { at: 1400, kind: "click", target: '[data-demo="command-trigger"]' },
      { at: 1900, kind: "cursor", target: '[data-demo="command-input"]' },
      {
        at: 2300,
        kind: "type",
        selector: '[data-demo="command-input"]',
        text: "HYPE",
      },
      { at: 2900, kind: "cursor", target: '[data-demo="command-market-hype"]' },
      { at: 3400, kind: "click", target: '[data-demo="command-market-hype"]' },

      // Park cursor off-screen so the +50% stinger reads as a
      // notification.
      { at: 4200, kind: "cursor", target: { x: -200, y: -200 }, durationMs: 0 },
      { at: 4600, kind: "dopamine", id: "up-50" },

      // Open the portfolio sheet via the wallet pill.
      { at: 6600, kind: "cursor", target: '[data-demo="portfolio-toggle"]' },
      { at: 7300, kind: "click", target: '[data-demo="portfolio-toggle"]' },

      // Expand the HYPE-PERP row to reveal the action drawer
      // (Close lives there now, not on the compact row).
      { at: 8400, kind: "cursor", target: '[data-demo="expand-position-hype-perp"]' },
      { at: 9100, kind: "click", target: '[data-demo="expand-position-hype-perp"]' },
      // 250ms slide-in animation; cursor moves once it's open.
      { at: 9700, kind: "cursor", target: '[data-demo="close-position-hype-perp"]' },
      { at: 10400, kind: "click", target: '[data-demo="close-position-hype-perp"]' },
      // AlertDialog confirm — destructive actions are gated now.
      // The confirm button fires the real close + sell-green stinger.
      { at: 11100, kind: "cursor", target: '[data-demo="confirm-close-position-hype-perp"]' },
      { at: 11700, kind: "click", target: '[data-demo="confirm-close-position-hype-perp"]' },
    ],
  },
  "home-50-sell": {
    label: "Home, sees +50%, sells (desktop)",
    /*
     * Framing: user comes home / wakes up, glances at the chart, sees
     * HYPE is up 50%, calmly closes the position before bed.
     *
     * Beats:
     *   • Cursor parks off-screen — chart switches to HYPE quickly
     *     (the command-bar flow happens behind the scenes)
     *   • up-50 stinger pops with no cursor in frame — the moment
     *     of seeing it
     *   • Cursor enters, opens portfolio, expands HYPE-PERP, clicks
     *     Close → AlertDialog → confirm
     *   • sell-green fires from the Close handler internally
     */
    steps: [
      // Start with the cursor off-screen — he hasn't sat down yet.
      { at: 0, kind: "cursor", target: { x: -200, y: -200 }, durationMs: 0 },

      // Quick chart switch via command bar. Cursor flicks in, does
      // the flow, parks again so the +50% stinger lands with no
      // cursor in frame.
      { at: 300, kind: "cursor", target: '[data-demo="command-trigger"]' },
      { at: 1100, kind: "click", target: '[data-demo="command-trigger"]' },
      { at: 1500, kind: "cursor", target: '[data-demo="command-input"]' },
      {
        at: 1900,
        kind: "type",
        selector: '[data-demo="command-input"]',
        text: "HYPE",
      },
      { at: 2500, kind: "cursor", target: '[data-demo="command-market-hype"]' },
      { at: 2950, kind: "click", target: '[data-demo="command-market-hype"]' },

      // Cursor parks; +50% stinger pops — the "oh, nice" moment.
      { at: 3500, kind: "cursor", target: { x: -200, y: -200 }, durationMs: 0 },
      { at: 4000, kind: "dopamine", id: "up-50" },

      // After admiring the candle, he opens the portfolio + closes.
      { at: 6200, kind: "cursor", target: '[data-demo="portfolio-toggle"]' },
      { at: 6900, kind: "click", target: '[data-demo="portfolio-toggle"]' },
      { at: 7900, kind: "cursor", target: '[data-demo="expand-position-hype-perp"]' },
      { at: 8500, kind: "click", target: '[data-demo="expand-position-hype-perp"]' },
      { at: 9100, kind: "cursor", target: '[data-demo="close-position-hype-perp"]' },
      { at: 9700, kind: "click", target: '[data-demo="close-position-hype-perp"]' },
      // Confirm in the AlertDialog → sell-green pops internally.
      { at: 10400, kind: "cursor", target: '[data-demo="confirm-close-position-hype-perp"]' },
      { at: 11000, kind: "click", target: '[data-demo="confirm-close-position-hype-perp"]' },
    ],
  },
};

export type DemoScriptId = keyof typeof DEMO_SCRIPTS;
