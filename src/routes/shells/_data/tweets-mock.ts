/** Mock tweet feed shown in the MediaPanel's Social tab after the
 *  user "connects" their X account. Real OAuth + read access via the
 *  X API is paywalled, so the demo flips to this curated feed of
 *  high-signal crypto/macro accounts on connect. The shape mirrors
 *  the v2 API timeline payload so swapping to real data later is
 *  mostly a fetch change. */

export type Tweet = {
  id: string;
  author: {
    name: string;
    handle: string;
    avatar: string;
    verified?: boolean;
  };
  /** Tweet body — plain text. */
  text: string;
  /** Relative time like "2m", "1h", "Apr 12". */
  postedAt: string;
  metrics: {
    replies: number;
    reposts: number;
    likes: number;
  };
  /** Optional attached media — chart screenshots, news graphics, etc.
   *  Matches the X API timeline shape (`includes.media[].url`) so the
   *  swap to real data later is mostly a fetch change. */
  media?: Array<{
    type: "image";
    url: string;
    alt?: string;
  }>;
};

export const MOCK_TWEETS: Tweet[] = [
  {
    id: "1",
    author: {
      name: "Loomdart",
      handle: "loomdart",
      avatar: "https://i.pravatar.cc/64?img=12",
      verified: true,
    },
    text: "$HYPE flows are absolutely insane right now. Funding still negative on a green day. Tells you everything about positioning.",
    postedAt: "8m",
    metrics: { replies: 41, reposts: 188, likes: 1_240 },
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1640340434855-6084b1f4901c?w=800&q=70",
        alt: "Funding-rate chart screenshot",
      },
    ],
  },
  {
    id: "2",
    author: {
      name: "GCR",
      handle: "GiganticRebirth",
      avatar: "https://i.pravatar.cc/64?img=33",
      verified: true,
    },
    text: "If you can't tell me what your edge is in <30 seconds you don't have one. Sit on your hands until you can.",
    postedAt: "22m",
    metrics: { replies: 89, reposts: 410, likes: 3_120 },
  },
  {
    id: "3",
    author: {
      name: "DCFGod",
      handle: "DCFGOD",
      avatar: "https://i.pravatar.cc/64?img=14",
    },
    text: "BTC at 75k and people are still calling for a crash. We are SO early.",
    postedAt: "47m",
    metrics: { replies: 22, reposts: 95, likes: 612 },
  },
  {
    id: "4",
    author: {
      name: "0xfoobar",
      handle: "0xfoobar",
      avatar: "https://i.pravatar.cc/64?img=22",
      verified: true,
    },
    text: "Hyperliquid daily volume just printed another ATH. The orderbook on perp DEXes is officially competitive with CEXes for the majors.",
    postedAt: "1h",
    metrics: { replies: 31, reposts: 142, likes: 870 },
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236e2?w=800&q=70",
        alt: "Perp DEX volume chart",
      },
    ],
  },
  {
    id: "5",
    author: {
      name: "Tetranode",
      handle: "Tetranode",
      avatar: "https://i.pravatar.cc/64?img=15",
      verified: true,
    },
    text: "Counterparty risk is THE story of 2026. Pick venues like your life depends on it because for some of you it will.",
    postedAt: "2h",
    metrics: { replies: 64, reposts: 220, likes: 1_510 },
  },
  {
    id: "6",
    author: {
      name: "frog_pilled",
      handle: "frog_pilled",
      avatar: "https://i.pravatar.cc/64?img=8",
    },
    text: "the meta is just buy hype and sleep frens",
    postedAt: "3h",
    metrics: { replies: 12, reposts: 38, likes: 410 },
  },
  {
    id: "7",
    author: {
      name: "wassie.eth",
      handle: "wassieboy",
      avatar: "https://i.pravatar.cc/64?img=18",
    },
    text: "if you sold at 70 i hate to break it to u but ur not gonna make it",
    postedAt: "4h",
    metrics: { replies: 51, reposts: 92, likes: 738 },
  },
  {
    id: "8",
    author: {
      name: "Polymarket",
      handle: "Polymarket",
      avatar: "https://i.pravatar.cc/64?img=51",
      verified: true,
    },
    text: "Trump 2028 odds just crossed 28% — biggest move in 30 days. $184M traded across the market this week alone.",
    postedAt: "5h",
    metrics: { replies: 240, reposts: 1_120, likes: 4_900 },
    media: [
      {
        type: "image",
        url: "https://images.unsplash.com/photo-1551636898-47668aa61de2?w=800&q=70",
        alt: "Election prediction-market chart",
      },
    ],
  },
];
