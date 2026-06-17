"use client";

import { useMemo, useState } from "react";
import { Medal, UserPlus, Users } from "lucide-react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { cn } from "@/lib/utils";
import { CONTACTS, type Contact } from "../_data/contacts";
import { MARKETS, WALLET_ADDRESS } from "../_data/mocks";
import type { Market } from "../_types";
import { CircleStack } from "./CircleStack";
import { ContactAvatar } from "./ContactAvatar";
import { TokenLogo } from "./TokenLogo";
import { TraderProfile } from "./TraderProfile";
import { useSignals } from "../_state/signals-context";

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

type Tab = "friends" | "leaderboard";
type Scope = "24h" | "7d" | "30d" | "all";

/** Exported so TraderProfile (panel-local drill-in) can take a
 *  Trader by reference. */
export type Trader = {
  id: string;
  name: string;
  handle?: string;
  seed: number;
  /** Optional — present for real contacts so we can use ContactAvatar
   *  + bridge into AuthorSheet / DM flows. Absent for the mock extras
   *  who just exist to round out the leaderboard. */
  contact?: Contact;
};

const FRIENDS: Trader[] = CONTACTS.filter((c) => c.kind === "friend").map(
  (c) => ({
    id: c.id,
    name: c.name,
    handle: c.handle,
    seed: c.seed ?? hashString(c.id),
    contact: c,
  }),
);

/** Extra traders that fill out the leaderboard depth + the Recommended
 *  list on the Friends tab. Pure mock until a real backend ships. */
const EXTRA_TRADERS: Trader[] = [
  { id: "jg", name: "jg", handle: "@jotagezin", seed: 9201 },
  { id: "xventures", name: "X Ventures", handle: "@XVentures", seed: 8311 },
  {
    id: "watery",
    name: "WaterySimpleBobolink",
    handle: "@WaterySimpleBobolink",
    seed: 7842,
  },
  { id: "nfy", name: "nfy", handle: "@nfydefi", seed: 6789 },
  { id: "doc", name: "Ðoc", handle: "@doc", seed: 5432 },
  { id: "humble", name: "HumbleUnderGod", handle: "@HumbleUnderGod", seed: 4567 },
  { id: "shortmemes", name: "lshortMemes", handle: "@KyleBands1", seed: 3456 },
  { id: "tommy", name: "tommy", handle: "@tommy", seed: 8421 },
];

const POOL: Trader[] = [...FRIENDS, ...EXTRA_TRADERS];

const SCOPE_FACTOR: Record<Scope, number> = {
  "24h": 1,
  "7d": 4.2,
  "30d": 12.6,
  all: 38,
};

/**
 * Friends panel — two-tab layout:
 *
 *   Friends     — your friend contacts as a portfolio glance
 *                 (P/L + position tokens), then a Recommended
 *                 section of suggested traders with Follow buttons.
 *   Leaderboard — Your rank card on top + a ranked list of every
 *                 trader in POOL, scoped by 24h / 7d / 30d / All.
 */
export function FriendsPanel() {
  const [tab, setTab] = useState<Tab>("friends");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedTrader = useMemo(
    () => (selectedId ? POOL.find((t) => t.id === selectedId) ?? null : null),
    [selectedId],
  );

  // Drill-in mode replaces the entire panel content with the
  // TraderProfile so the in-panel navigation feels app-like rather
  // than modal. Back returns to the list at the previous tab.
  if (selectedTrader) {
    return (
      <TraderProfile
        trader={selectedTrader}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TabStrip tab={tab} setTab={setTab} />
      <div
        id={tab === "friends" ? "friends-panel-friends" : "friends-panel-leaderboard"}
        role="tabpanel"
        className="scroll-thin min-h-0 flex-1 overflow-y-auto"
      >
        {tab === "friends" ? (
          <FriendsTab onSelect={setSelectedId} />
        ) : (
          <LeaderboardTab onSelect={setSelectedId} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab strip — underline-active, same vocabulary as PortfolioSheet    */
/* ------------------------------------------------------------------ */

function TabStrip({
  tab,
  setTab,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Friends view"
      className="flex shrink-0 items-center border-b border-white/[0.05]"
    >
      <TabButton
        active={tab === "friends"}
        onClick={() => setTab("friends")}
        controls="friends-panel-friends"
      >
        Friends{" "}
        <span className="text-muted-foreground/70">({FRIENDS.length})</span>
      </TabButton>
      <TabButton
        active={tab === "leaderboard"}
        onClick={() => setTab("leaderboard")}
        controls="friends-panel-leaderboard"
      >
        Leaderboard
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
  controls,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  controls?: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={cn(
        "relative flex-1 py-3 text-center text-body font-medium transition-[color,scale] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 active:scale-[0.96]",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {active && (
        <span aria-hidden className="absolute inset-x-4 bottom-0 h-px bg-foreground" />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Friends tab                                                        */
/* ------------------------------------------------------------------ */

function FriendsTab({ onSelect }: { onSelect: (id: string) => void }) {
  const { isFollowing } = useSignals();

  // Recommended = pool minus the user's friends, capped to 3 picks
  // so the section feels curated rather than dumping data.
  const recommended = useMemo(() => {
    const friendIds = new Set(FRIENDS.map((f) => f.id));
    return EXTRA_TRADERS.filter((t) => !friendIds.has(t.id)).slice(0, 3);
  }, []);

  return (
    <>
      {/* Friend rows */}
      <div className="flex flex-col">
        {FRIENDS.map((trader) => (
          <FriendRow
            key={trader.id}
            trader={trader}
            scope="all"
            onOpen={() => onSelect(trader.id)}
          />
        ))}
      </div>

      {/* Recommended section */}
      <div className="px-3 pb-2 pt-4 text-caption uppercase tracking-[0.14em] text-muted-foreground">
        Recommended
      </div>
      <div className="flex flex-col">
        {recommended.map((trader) => (
          <RecommendedRow
            key={trader.id}
            trader={trader}
            following={isFollowing(trader.id)}
            onOpen={() => onSelect(trader.id)}
          />
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Leaderboard tab                                                    */
/* ------------------------------------------------------------------ */

function LeaderboardTab({ onSelect }: { onSelect: (id: string) => void }) {
  const [scope, setScope] = useState<Scope>("24h");

  // Rank the pool by P/L for the active scope.
  const ranked = useMemo(() => {
    return [...POOL]
      .map((t) => ({ trader: t, pnl: pnlFor(t, scope) }))
      .sort((a, b) => b.pnl - a.pnl);
  }, [scope]);

  return (
    <>
      <YourRankCard scope={scope} />

      <div className="flex items-center justify-between px-3 pb-2 pt-3">
        <span className="text-caption uppercase tracking-[0.14em] text-muted-foreground">
          Top traders
        </span>
        <ScopeChips scope={scope} setScope={setScope} />
      </div>

      <div className="flex flex-col">
        {ranked.map(({ trader, pnl }, idx) => (
          <LeaderboardRow
            key={trader.id}
            rank={idx + 1}
            trader={trader}
            pnl={pnl}
            scope={scope}
            onOpen={() => onSelect(trader.id)}
          />
        ))}
      </div>
    </>
  );
}

function YourRankCard({ scope }: { scope: Scope }) {
  // User's mock rank + P/L. Same scope semantics as the leaderboard
  // so the value moves with the scope chip.
  const pnl = -10.47 * SCOPE_FACTOR[scope];
  return (
    <div className="px-3 pt-3">
      <div className="flex items-center gap-3 rounded-lg bg-surface-1 px-3 py-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full">
          <Jazzicon
            diameter={36}
            seed={jsNumberForAddress(WALLET_ADDRESS)}
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-caption uppercase tracking-[0.14em] text-muted-foreground">
            Your rank
          </span>
          <span className="text-title font-semibold tabular-nums text-foreground">
            <span className="text-signal">#</span> 70,235
          </span>
        </div>
        <PnlValue value={pnl} size="md" />
      </div>
    </div>
  );
}

function ScopeChips({
  scope,
  setScope,
}: {
  scope: Scope;
  setScope: (s: Scope) => void;
}) {
  const scopes: { value: Scope; label: string }[] = [
    { value: "24h", label: "24h" },
    { value: "7d", label: "7d" },
    { value: "30d", label: "30d" },
    { value: "all", label: "All" },
  ];
  return (
    <div className="flex items-center gap-0.5">
      {scopes.map((s) => (
        <button
          key={s.value}
          type="button"
          aria-pressed={scope === s.value}
          onClick={() => setScope(s.value)}
          className={cn(
            "inline-flex h-6 items-center rounded px-2 text-body transition-[background-color,color] duration-150 ease-out",
            scope === s.value
              ? "bg-surface-3 font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row shapes                                                         */
/* ------------------------------------------------------------------ */

function FriendRow({
  trader,
  scope,
  onOpen,
}: {
  trader: Trader;
  scope: Scope;
  onOpen: () => void;
}) {
  const pnl = pnlFor(trader, scope);
  const positions = positionsFor(trader);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${trader.handle ?? trader.name} profile`}
      className="flex w-full items-center gap-3 border-b border-white/[0.05] px-3 py-2.5 text-left transition-colors hover:bg-surface-1"
    >
      <TraderAvatar trader={trader} size={40} />
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-body font-medium text-foreground">
          {trader.name}
        </span>
        {trader.handle && (
          <span className="truncate text-body text-muted-foreground">
            {trader.handle}
          </span>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 leading-tight">
        <PnlValue value={pnl} size="md" />
        <PositionStack tokens={positions} />
      </div>
    </button>
  );
}

function RecommendedRow({
  trader,
  following,
  onOpen,
}: {
  trader: Trader;
  following: boolean;
  onOpen: () => void;
}) {
  const { toggleFollow } = useSignals();
  return (
    <div className="relative flex w-full items-center gap-3 border-b border-white/[0.05] px-3 py-2.5 transition-colors hover:bg-surface-1">
      <TraderAvatar trader={trader} size={40} />
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-body font-medium text-foreground">
          {trader.name}
        </span>
        {trader.handle && (
          <span className="truncate text-body text-muted-foreground">
            {trader.handle}
          </span>
        )}
      </div>
      {/* Follow button lifts above the row-level overlay button so its
          clicks aren't captured by the profile open target. */}
      <div className="relative z-10 shrink-0">
        {following ? (
          <button
            type="button"
            onClick={() => toggleFollow(trader.id)}
            aria-pressed
            aria-label="Unfollow"
            className="inline-flex h-8 items-center gap-1 rounded-md bg-primary/10 px-3 text-body font-semibold text-primary ring-1 ring-inset ring-primary/30 transition-[background-color,scale] duration-150 ease-out hover:bg-primary/15 active:scale-[0.96]"
          >
            Following
          </button>
        ) : (
          <button
            type="button"
            onClick={() => toggleFollow(trader.id)}
            aria-pressed={false}
            aria-label="Follow"
            className="group relative inline-flex h-8 items-center gap-1 overflow-hidden rounded-md bg-primary px-3 text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.96]"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-white/40 to-transparent"
            />
            <span className="relative inline-flex items-center gap-1">
              <UserPlus strokeWidth={2} className="size-3.5" aria-hidden />
              Follow
            </span>
          </button>
        )}
      </div>
      {/* Full-row click target — opens the profile. Sits below the
          Follow button (z-0 vs the button's z-10) so its clicks
          aren't captured here. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${trader.handle ?? trader.name} profile`}
        className="absolute inset-0"
      />
    </div>
  );
}

function LeaderboardRow({
  rank,
  trader,
  pnl,
  onOpen,
}: {
  rank: number;
  trader: Trader;
  pnl: number;
  scope: Scope;
  onOpen: () => void;
}) {
  const positions = positionsFor(trader);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${trader.handle ?? trader.name} profile`}
      className="flex w-full items-center gap-3 border-b border-white/[0.05] px-3 py-2.5 text-left transition-colors hover:bg-surface-1"
    >
      <RankBadge rank={rank} />
      <TraderAvatar trader={trader} size={40} />
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-body font-medium text-foreground">
          {trader.name}
        </span>
        {trader.handle && (
          <span className="truncate text-body text-muted-foreground">
            {trader.handle}
          </span>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 leading-tight">
        <PnlValue value={pnl} size="md" />
        <PositionStack tokens={positions} />
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Bits                                                               */
/* ------------------------------------------------------------------ */

function TraderAvatar({ trader, size }: { trader: Trader; size: number }) {
  if (trader.contact) return <ContactAvatar contact={trader.contact} size={size} />;
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size }}
    >
      <Jazzicon diameter={size} seed={trader.seed} />
    </span>
  );
}

function PnlValue({
  value,
  size = "md",
}: {
  value: number;
  size?: "md" | "lg";
}) {
  const up = value > 0.005;
  const down = value < -0.005;
  const sign = up ? "+" : down ? "" : "";
  return (
    <span
      className={cn(
        "tabular-nums",
        size === "lg" ? "text-title" : "text-body",
        "font-semibold",
        up && "text-primary",
        down && "text-tone-down",
        !up && !down && "text-muted-foreground",
      )}
    >
      {sign}
      {USD.format(value)}
    </span>
  );
}

/** Up to 3 overlapping token logos + an overflow chip when there are
 *  more. Ringed in the panel surface color so the stack reads
 *  cleanly when tokens overlap. */
function PositionStack({ tokens }: { tokens: Market[] }) {
  if (tokens.length === 0) return null;
  const MAX = 3;
  const visible = tokens.slice(0, MAX);
  const overflow = tokens.length - visible.length;
  return (
    <span className="inline-flex items-center gap-1.5">
      <CircleStack size={14} overlap={6}>
        {visible.map((m) => (
          <TokenLogo
            key={m.id}
            symbol={m.symbol}
            char={m.iconChar}
            bg={m.iconBg}
            fg={m.iconFg ?? "#fff"}
            size={14}
          />
        ))}
      </CircleStack>
      {overflow > 0 && (
        <span className="inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-surface-2 px-1 text-micro tabular-nums text-muted-foreground">
          {overflow}+
        </span>
      )}
    </span>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank > 3) {
    return (
      <span
        aria-hidden
        className="inline-flex w-5 shrink-0 justify-center text-body tabular-nums text-muted-foreground"
      >
        {rank}.
      </span>
    );
  }
  // Top three get a Medal icon in a tier color.
  const color =
    rank === 1
      ? "var(--wf-pro-gold)" // brand gold
      : rank === 2
        ? "#c8d0d4" // silver
        : "#c08a5b"; // bronze
  return (
    <span
      aria-hidden
      className="relative inline-flex w-5 shrink-0 items-center justify-center"
    >
      <Medal strokeWidth={2} className="size-5" style={{ color }} />
      <span className="absolute top-[2px] text-[8px] font-semibold tabular-nums text-background">
        {rank}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Mock data helpers                                                  */
/* ------------------------------------------------------------------ */

function pnlFor(trader: Trader, scope: Scope): number {
  // Deterministic — same seed always returns same number, but the
  // scope multiplier amplifies the magnitude for longer windows.
  const r = (n: number) =>
    ((trader.seed * 9301 + 49297 + n * 7919) % 233280) / 233280;
  const sign = r(0) > 0.32 ? 1 : -1; // ~2:1 winners to losers
  const magnitude = 50 + r(1) * 60_000; // $50 → $60k
  return sign * magnitude * SCOPE_FACTOR[scope];
}

function positionsFor(trader: Trader): Market[] {
  const r = (n: number) =>
    ((trader.seed * 9301 + 49297 + n * 7919) % 233280) / 233280;
  const count = 2 + Math.floor(r(20) * 4); // 2–5 positions
  const picks: Market[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < MARKETS.length && picks.length < count; i++) {
    const idx = Math.floor(r(30 + i) * MARKETS.length);
    const m = MARKETS[idx];
    if (m && !seen.has(m.id)) {
      seen.add(m.id);
      picks.push(m);
    }
  }
  // If we under-filled (collisions), pad from the start.
  for (let i = 0; picks.length < count && i < MARKETS.length; i++) {
    if (!seen.has(MARKETS[i].id)) {
      seen.add(MARKETS[i].id);
      picks.push(MARKETS[i]);
    }
  }
  return picks;
}

function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return Math.abs(h) % 1_000_000;
}

// Re-exported for any future panel descriptor wiring.
export { Users as FriendsIcon };
