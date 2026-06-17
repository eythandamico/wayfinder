"use client";

import { useMemo, useState } from "react";
import { MapPin, Search, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Wayfinder Marketplace — a Craigslist-ish swap board for the
 * community. Data is local to this build; production would back this
 * with our own listings service. The UI layout is the contract: a
 * search row, category chips, and a scroll-feed of listing cards.
 */

type Category =
  | "all"
  | "wheels"
  | "tech"
  | "audio"
  | "home"
  | "wearables"
  | "sports"
  | "art";

type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  /** ISO currency code, e.g. "USD". */
  currency: string;
  category: Exclude<Category, "all">;
  location: string;
  postedAt: number;
  seller: string;
  /** Tag glyphs displayed top-left of the card thumbnail. */
  glyph: string;
  /** Soft solid tint for the thumbnail block. */
  tint: string;
  condition: "New" | "Like new" | "Used";
};

// Curated mock catalog. Real data eventually replaces this with no
// component changes — the UI takes Listing[] regardless of source.
const LISTINGS: Listing[] = [
  {
    id: "l-001",
    title: "Hermes Birkin 30",
    description: "Etoupe Togo leather, palladium hardware. Mint condition.",
    price: 18500,
    currency: "USD",
    category: "wearables",
    location: "New York, NY",
    postedAt: Date.now() - 1000 * 60 * 60 * 2,
    seller: "haute_h",
    glyph: "👜",
    tint: "#d6b884",
    condition: "Like new",
  },
  {
    id: "l-002",
    title: "Porsche 911 GT3 — 2023",
    description: "1,200 miles. Crayon over black. Sport Chrono. PCCB.",
    price: 245000,
    currency: "USD",
    category: "wheels",
    location: "Los Angeles, CA",
    postedAt: Date.now() - 1000 * 60 * 60 * 9,
    seller: "apex_only",
    glyph: "🏁",
    tint: "#f3eddf",
    condition: "Used",
  },
  {
    id: "l-003",
    title: "Apple Vision Pro 1TB",
    description: "Sealed in box. Bought as a gift, never opened.",
    price: 3200,
    currency: "USD",
    category: "tech",
    location: "Austin, TX",
    postedAt: Date.now() - 1000 * 60 * 28,
    seller: "linus_t",
    glyph: "🥽",
    tint: "#cbd5e1",
    condition: "New",
  },
  {
    id: "l-004",
    title: "KEF LS50 Meta (pair)",
    description: "Mineral white. Original boxes + speaker stands included.",
    price: 1100,
    currency: "USD",
    category: "audio",
    location: "Brooklyn, NY",
    postedAt: Date.now() - 1000 * 60 * 60 * 30,
    seller: "audiophile_andy",
    glyph: "🔊",
    tint: "#e2e8f0",
    condition: "Used",
  },
  {
    id: "l-005",
    title: "Eames Lounge + Ottoman",
    description: "Authentic Herman Miller. Walnut shell, black leather.",
    price: 4800,
    currency: "USD",
    category: "home",
    location: "San Francisco, CA",
    postedAt: Date.now() - 1000 * 60 * 60 * 12,
    seller: "midcentury_marv",
    glyph: "🪑",
    tint: "#a3a3a3",
    condition: "Used",
  },
  {
    id: "l-006",
    title: "Rolex Submariner Date 126610LN",
    description: "Worn ~30 times. Full set, papers, 2024 card.",
    price: 14900,
    currency: "USD",
    category: "wearables",
    location: "Miami, FL",
    postedAt: Date.now() - 1000 * 60 * 60 * 5,
    seller: "watch_doctor",
    glyph: "⌚",
    tint: "#1f2937",
    condition: "Like new",
  },
  {
    id: "l-007",
    title: "Specialized S-Works Tarmac SL8",
    description: "56cm. SRAM Red AXS. Roval Rapide CLX II wheels.",
    price: 8600,
    currency: "USD",
    category: "sports",
    location: "Boulder, CO",
    postedAt: Date.now() - 1000 * 60 * 60 * 18,
    seller: "watt_chaser",
    glyph: "🚴",
    tint: "#fb7185",
    condition: "Like new",
  },
  {
    id: "l-008",
    title: "Banksy “Girl with Balloon” print",
    description: "Authenticated. Edition 41/150. Original frame.",
    price: 32000,
    currency: "USD",
    category: "art",
    location: "London, UK",
    postedAt: Date.now() - 1000 * 60 * 60 * 50,
    seller: "gallery_g",
    glyph: "🎨",
    tint: "#facc66",
    condition: "Used",
  },
  {
    id: "l-009",
    title: "M3 Max MacBook Pro 16″",
    description: "64GB / 2TB. Sealed. AppleCare+ included until 2027.",
    price: 4200,
    currency: "USD",
    category: "tech",
    location: "Seattle, WA",
    postedAt: Date.now() - 1000 * 60 * 60 * 3,
    seller: "ts_dev",
    glyph: "💻",
    tint: "#9ca3af",
    condition: "New",
  },
  {
    id: "l-010",
    title: "Sonos Era 300 (pair) + Sub",
    description: "Atmos-capable. 6 months old, original boxes.",
    price: 1850,
    currency: "USD",
    category: "audio",
    location: "Chicago, IL",
    postedAt: Date.now() - 1000 * 60 * 60 * 21,
    seller: "spatial_sam",
    glyph: "🎧",
    tint: "#22d3ee",
    condition: "Used",
  },
  {
    id: "l-011",
    title: "Aesop Athanasius Kircher Set",
    description: "Full bathroom set, hand wash + balm + body lotion. Brand new.",
    price: 220,
    currency: "USD",
    category: "home",
    location: "Portland, OR",
    postedAt: Date.now() - 1000 * 60 * 60 * 1,
    seller: "cult_classics",
    glyph: "🧴",
    tint: "#d4a373",
    condition: "New",
  },
  {
    id: "l-012",
    title: "Vintage Brunswick pool table",
    description: '9-foot Anniversary model. New cloth. Local pickup only.',
    price: 4500,
    currency: "USD",
    category: "home",
    location: "Nashville, TN",
    postedAt: Date.now() - 1000 * 60 * 60 * 72,
    seller: "felt_specialist",
    glyph: "🎱",
    tint: "#16a34a",
    condition: "Used",
  },
];

const CATEGORIES: Array<{ id: Category; label: string }> = [
  { id: "all", label: "All" },
  { id: "wheels", label: "Wheels" },
  { id: "tech", label: "Tech" },
  { id: "audio", label: "Audio" },
  { id: "home", label: "Home" },
  { id: "wearables", label: "Wearables" },
  { id: "sports", label: "Sports" },
  { id: "art", label: "Art" },
];

export function MarketplacePanel() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [sort, setSort] = useState<"newest" | "price-asc" | "price-desc">(
    "newest",
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = LISTINGS.filter((l) => {
      if (category !== "all" && l.category !== category) return false;
      if (
        q &&
        !`${l.title} ${l.description} ${l.location} ${l.seller}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
    out = out.sort((a, b) => {
      if (sort === "newest") return b.postedAt - a.postedAt;
      if (sort === "price-asc") return a.price - b.price;
      return b.price - a.price;
    });
    return out;
  }, [query, category, sort]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Search + sort */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.05] px-3 py-2">
        <Search
          aria-hidden
          strokeWidth={1.75}
          className="size-3.5 text-muted-foreground"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search listings…"
          className="flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
        />
        <select
          value={sort}
          onChange={(e) =>
            setSort(e.target.value as "newest" | "price-asc" | "price-desc")
          }
          aria-label="Sort listings"
          className="rounded-md bg-surface-1 px-2 py-1 text-caption text-foreground outline-none"
        >
          <option value="newest">Newest</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
        </select>
      </div>

      {/* Category chips */}
      <div className="scroll-thin flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-white/[0.05] px-3 py-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-caption transition-colors",
              category === c.id
                ? "bg-primary/15 text-primary"
                : "bg-surface-1 text-muted-foreground hover:bg-surface-3 hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Listings */}
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center text-body text-muted-foreground">
            <Tag strokeWidth={1.5} className="size-6 mb-1" />
            <span>No listings match your filters.</span>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filtered.map((l) => (
              <li key={l.id}>
                <ListingCard listing={l} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const fmt = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: listing.currency,
    maximumFractionDigits: 0,
  });
  return (
    <button
      type="button"
      className="group flex w-full flex-col overflow-hidden rounded-lg bg-white/[0.03] text-left ring-1 ring-inset ring-white/[0.06] transition-[background-color,box-shadow] duration-150 hover:bg-surface-1 hover:ring-white/[0.06]"
    >
      {/* Thumbnail tile — solid tint with the glyph for visual variety. */}
      <span
        aria-hidden
        className="relative flex h-28 w-full items-center justify-center text-display"
        style={{ background: listing.tint }}
      >
        <span className="absolute right-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-micro font-medium tracking-wide text-white backdrop-blur-sm">
          {listing.condition}
        </span>
        {listing.glyph}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-body font-semibold text-foreground">
            {listing.title}
          </span>
          <span className="shrink-0 text-body font-semibold tabular-nums text-foreground">
            {fmt.format(listing.price)}
          </span>
        </div>
        <span className="line-clamp-2 text-caption text-muted-foreground">
          {listing.description}
        </span>
        <div className="mt-1 flex items-center gap-2 text-micro text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin strokeWidth={1.75} className="size-3" aria-hidden />
            {listing.location}
          </span>
          <span aria-hidden>·</span>
          <span>{timeAgo(listing.postedAt)}</span>
          <span aria-hidden>·</span>
          <span>{listing.seller}</span>
        </div>
      </div>
    </button>
  );
}

function timeAgo(ts: number): string {
  const delta = Date.now() - ts;
  const min = Math.floor(delta / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}
