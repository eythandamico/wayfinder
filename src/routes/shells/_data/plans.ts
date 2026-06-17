/**
 * Free vs Pro feature lists — the single source of truth for the
 * PricingModal copy. Each plan owns the bullets shown inside its
 * own card. Pro is framed additively ("Everything in Free, plus:")
 * so the upgrade reads as a clean delta rather than a redundant
 * spec sheet.
 *
 * Mock pricing only — there is no real billing layer (see
 * docs/MOCKING.md). The mock "upgrade" lives in plan-context's
 * setPlan("pro").
 */

export type PlanId = "free" | "pro";

export type BillingPeriod = "monthly" | "yearly";

export type Plan = {
  id: PlanId;
  name: string;
  /** Default monthly price. For Free this is just "$0" and the
   *  yearly toggle has no effect. */
  price: string;
  /** Optional per-period prices. When present, the modal renders a
   *  Monthly / Yearly toggle and switches the displayed price /
   *  billing note. */
  yearlyPrice?: string;
  yearlyBillingNote?: string;
  /** Short label used on the toggle's Yearly tab + (optionally) in
   *  the price line to advertise the savings. */
  yearlySavingsLabel?: string;
  /** Tagline that pairs with the principle: free = while you're
   *  watching, pro = while you're away. */
  blurb: string;
  /** Bullets shown inside the card. Keep short — these are scanned,
   *  not read. Max ~7 items so the card doesn't tower. */
  features: string[];
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    blurb: "The agent runs while you're at the desk.",
    features: [
      "Agent chat",
      "Gut check, unlimited",
      "Morning brief, daily",
      "In-chat signals",
      "Basic charts · 30D / 90D",
      "Manual trading, all venues",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    yearlyPrice: "$19",
    yearlyBillingNote: "billed $228 yearly",
    yearlySavingsLabel: "Save 35%",
    blurb: "The agent watches the tape when you can't.",
    features: [
      "Unlimited jobs, fast cadences",
      "SMS + push alerts when you're away",
      "K2 Thinking model",
      "Pendle, Boros, Aave quant data",
      "Multi-series charts · full history",
      "Auto mode",
    ],
  },
];
