/** Mock catalog of trending Polymarket prediction markets for the
 *  PolymarketPanel browser. These are distinct from the user's own
 *  prediction *positions* (which live in `positions.ts`) — this is
 *  the "discover" feed of markets they could enter.
 *
 *  Probabilities are quoted YES-side (0–100). Volume + expiry mirror
 *  the values surfaced on polymarket.com cards. Thumbnail URLs lean
 *  on Unsplash with `?w=160&q=70` so they render small + cheap. */

export type PolymarketMarket = {
  id: string;
  question: string;
  /** Optional small thumbnail (Unsplash hot-link OK for prototype). */
  thumbnail?: string;
  category: PolymarketCategory;
  /** YES-side probability, 0–100. NO side is implied (100 − yes). */
  yesPct: number;
  /** 24h trading volume in USD. */
  volume: number;
  /** Short-form expiration ("Jan 2029", "Dec 31, 2026"). */
  expiresAt: string;
};

export type PolymarketCategory =
  | "Politics"
  | "Crypto"
  | "Sports"
  | "Geopolitics"
  | "Economy"
  | "Culture";

export const POLYMARKET_MARKETS: PolymarketMarket[] = [
  {
    id: "trump-2028",
    question: "Will Trump win the 2028 presidential election?",
    category: "Politics",
    yesPct: 28,
    volume: 184_200_000,
    expiresAt: "Nov 2028",
    thumbnail:
      "https://images.unsplash.com/photo-1582558797253-86acf5b3a9d3?w=160&q=70",
  },
  {
    id: "btc-150k-eoy",
    question: "Will Bitcoin reach $150k by end of 2026?",
    category: "Crypto",
    yesPct: 41,
    volume: 12_400_000,
    expiresAt: "Dec 31, 2026",
    thumbnail:
      "https://images.unsplash.com/photo-1518544801976-3e159e50e5bb?w=160&q=70",
  },
  {
    id: "eth-5k-eoy",
    question: "Will Ethereum reach $5,000 by end of 2026?",
    category: "Crypto",
    yesPct: 22,
    volume: 6_120_000,
    expiresAt: "Dec 31, 2026",
    thumbnail:
      "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=160&q=70",
  },
  {
    id: "fed-cut-june",
    question: "Will the Fed cut rates at the June meeting?",
    category: "Economy",
    yesPct: 64,
    volume: 5_120_000,
    expiresAt: "Jun 2026",
    thumbnail:
      "https://images.unsplash.com/photo-1604772809717-9d4dfe49b9f8?w=160&q=70",
  },
  {
    id: "lakers-champs-26",
    question: "Will the Lakers win the 2026 NBA Championship?",
    category: "Sports",
    yesPct: 12,
    volume: 3_870_000,
    expiresAt: "Jun 2026",
    thumbnail:
      "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=160&q=70",
  },
  {
    id: "ai-passes-bar",
    question: "Will an AI model score a perfect 800 on the LSAT in 2026?",
    category: "Culture",
    yesPct: 35,
    volume: 2_410_000,
    expiresAt: "Dec 31, 2026",
    thumbnail:
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=160&q=70",
  },
  {
    id: "ceasefire-2026",
    question: "Will there be a Russia–Ukraine ceasefire by end of 2026?",
    category: "Geopolitics",
    yesPct: 47,
    volume: 8_950_000,
    expiresAt: "Dec 31, 2026",
    thumbnail:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=160&q=70",
  },
  {
    id: "sol-100",
    question: "Will Solana reach $100 in Q2 2026?",
    category: "Crypto",
    yesPct: 56,
    volume: 4_330_000,
    expiresAt: "Jun 30, 2026",
    thumbnail:
      "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=160&q=70",
  },
  {
    id: "openai-ipo",
    question: "Will OpenAI file for IPO by end of 2026?",
    category: "Culture",
    yesPct: 18,
    volume: 1_980_000,
    expiresAt: "Dec 31, 2026",
    thumbnail:
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=160&q=70",
  },
  {
    id: "spx-7500",
    question: "Will the S&P 500 close above 7,500 by end of 2026?",
    category: "Economy",
    yesPct: 39,
    volume: 2_770_000,
    expiresAt: "Dec 31, 2026",
    thumbnail:
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236e2?w=160&q=70",
  },
];

export const POLYMARKET_CATEGORIES = [
  "All",
  "Politics",
  "Crypto",
  "Sports",
  "Geopolitics",
  "Economy",
  "Culture",
] as const;
