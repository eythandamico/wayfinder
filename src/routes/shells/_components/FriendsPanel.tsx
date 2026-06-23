"use client";

import { useMemo, useState } from "react";
import { Check, Crown, Plus, UserPlus, Users } from "lucide-react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { cn } from "@/lib/utils";
import { CONTACTS, type Contact } from "../_data/contacts";
import { MARKETS, WALLET_ADDRESS } from "../_data/mocks";
import type { Market } from "../_types";
import { CircleStack } from "./CircleStack";
import { ContactAvatar } from "./ContactAvatar";
import { DISCOVERABLE } from "./AddFriendModal";
import { FriendChatSheet } from "./FriendChatSheet";
import { TokenLogo } from "./TokenLogo";
import { TraderProfile } from "./TraderProfile";
import { useFriends } from "../_state/shells-context";
import { useSignals } from "../_state/signals-context";
import { SearchIcon } from "./icons";

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

type Tab = "friends" | "inbox" | "leaderboard";
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

/** Unified trader registry — every trader the panel knows about,
 *  whether they're a contact-with-DM-history or a discoverable
 *  recommendation. Looked up by id from anywhere in the panel so
 *  friend rows, leaderboard rows, and the Add Friend modal all
 *  share one source. */
const TRADER_REGISTRY: Map<string, Trader> = new Map();
for (const c of CONTACTS) {
  if (c.kind !== "friend") continue;
  TRADER_REGISTRY.set(c.id, {
    id: c.id,
    name: c.name,
    handle: c.handle,
    seed: c.seed ?? hashString(c.id),
    contact: c,
  });
}
for (const d of DISCOVERABLE) {
  if (TRADER_REGISTRY.has(d.id)) continue;
  TRADER_REGISTRY.set(d.id, {
    id: d.id,
    name: d.name,
    handle: d.handle,
    seed: d.seed,
  });
}

function traderById(id: string): Trader | null {
  return TRADER_REGISTRY.get(id) ?? null;
}

/** All known traders (friends + discoverable) — drives the leaderboard
 *  so depth stays comparable to the previous static POOL. */
const POOL: Trader[] = Array.from(TRADER_REGISTRY.values());

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
  const [query, setQuery] = useState("");
  const { chatWithFriendId, openAddFriend } = useFriends();

  const selectedTrader = useMemo(
    () => (selectedId ? traderById(selectedId) : null),
    [selectedId],
  );

  // Drill-in priority: chat takes the slot (most contextual action),
  // then profile, then the list. Both drill-ins replace the entire
  // panel content so the in-panel navigation feels app-like rather
  // than modal.
  if (chatWithFriendId) {
    return <FriendChatSheet friendId={chatWithFriendId} />;
  }
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
      {/* Header — flush search row matching the AddFriendModal /
       *  CommandPalette search pattern (no boxed input, just icon +
       *  input + border-b under the whole row). The Add Friend
       *  modal opens from the Suggested-for-you "See all" link and
       *  from the empty-state CTA — no permanent chrome button. */}
      <div className="flex shrink-0 items-center gap-3 border-b border-white/[0.05] px-4 py-2.5">
        <SearchIcon />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tab === "friends" ? "Search friends" : "Search traders"}
          className="min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-muted-foreground"
          aria-label="Search"
        />
      </div>

      <TabStrip tab={tab} setTab={setTab} />
      <div
        id={`friends-panel-${tab}`}
        role="tabpanel"
        className="scroll-thin min-h-0 flex-1 overflow-y-auto"
      >
        {tab === "friends" && (
          <FriendsTab query={query} onSelect={setSelectedId} />
        )}
        {tab === "inbox" && (
          <InboxTab query={query} onSelect={setSelectedId} />
        )}
        {tab === "leaderboard" && (
          <LeaderboardTab query={query} onSelect={setSelectedId} />
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
  const { friendIds } = useFriends();
  const unread = totalUnread(friendIds);
  const followerCount = recentFollowersList(friendIds).length;
  const inboxBadge = unread + followerCount;
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
        <span className="text-muted-foreground/70">({friendIds.size})</span>
      </TabButton>
      <TabButton
        active={tab === "inbox"}
        onClick={() => setTab("inbox")}
        controls="friends-panel-inbox"
      >
        <span className="inline-flex items-center gap-1.5">
          Inbox
          {inboxBadge > 0 && (
            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-micro font-semibold tabular-nums text-primary-foreground">
              {inboxBadge}
            </span>
          )}
        </span>
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

function FriendsTab({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (id: string) => void;
}) {
  const { friendIds, openAddFriend, addFriend, removeFriend } = useFriends();
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;

  // Build the live friends list each render — friendIds is the
  // single source of truth, so the panel updates instantly when
  // someone is added or removed via the AddFriendModal.
  const friends = useMemo(() => {
    const list: Trader[] = [];
    for (const id of friendIds) {
      const t = traderById(id);
      if (t) list.push(t);
    }
    // Stable sort by name so add/remove doesn't reshuffle the list.
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [friendIds]);

  const filteredFriends = useMemo(() => {
    if (!q) return friends;
    return friends.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.handle?.toLowerCase().includes(q) ?? false),
    );
  }, [friends, q]);

  // Non-friend matches surfaced inline while searching. Pulls from
  // the trader registry (CONTACTS friends + DISCOVERABLE) minus the
  // user's current friends. Empty when query is empty so the
  // resting view shows just friends + the suggested carousel.
  const discoverMatches = useMemo(() => {
    if (!q) return [];
    return Array.from(TRADER_REGISTRY.values())
      .filter((t) => !friendIds.has(t.id))
      .filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.handle?.toLowerCase().includes(q) ?? false),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [friendIds, q]);

  // Suggested-for-you = discoverable people not yet in the friend
  // set. Capped to keep the row scannable; the modal exposes the
  // full pool when the user wants more. Only visible at rest —
  // searching surfaces matches inline.
  const suggested = useMemo(
    () =>
      searching
        ? []
        : DISCOVERABLE.filter((d) => !friendIds.has(d.id)).slice(0, 6),
    [friendIds, searching],
  );

  const noResults =
    searching && filteredFriends.length === 0 && discoverMatches.length === 0;

  return (
    <>
      {/* Empty states */}
      {noResults && (
        <EmptyState
          title={`No one matches "${query}"`}
          body="Try a different name or handle."
        />
      )}
      {!searching && friends.length === 0 && (
        <EmptyState
          title="No friends yet"
          body="Add a trader and you'll see their P/L, positions, and signals here."
          ctaLabel="Find friends"
          onCta={openAddFriend}
        />
      )}

      {/* Friend matches */}
      {filteredFriends.length > 0 && (
        <>
          {searching && <SectionHeader>Friends</SectionHeader>}
          <div className="flex flex-col">
            {filteredFriends.map((trader) => (
              <FriendRow
                key={trader.id}
                trader={trader}
                scope="all"
                onOpen={() => onSelect(trader.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Inline discover matches — only while searching. Same row
       *  geometry as the AddFriendModal so the affordance reads as
       *  the same control no matter where the user finds it. */}
      {discoverMatches.length > 0 && (
        <>
          <SectionHeader>Discover</SectionHeader>
          <div className="flex flex-col">
            {discoverMatches.map((trader) => (
              <DiscoverInlineRow
                key={trader.id}
                trader={trader}
                added={friendIds.has(trader.id)}
                onAdd={() => addFriend(trader.id)}
                onRemove={() => removeFriend(trader.id)}
                onOpen={() => onSelect(trader.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Suggested-for-you — horizontal carousel of cards. Shows the
       *  reason each suggestion was made so the row reads as
       *  curated rather than dumped. Hidden while searching since
       *  the inline Discover section covers the same need. */}
      {suggested.length > 0 && (
        <section className="mt-4 flex flex-col gap-2 pb-4">
          <div className="flex items-center justify-between px-3 text-caption uppercase tracking-[0.14em] text-muted-foreground">
            <span>Suggested for you</span>
            <button
              type="button"
              onClick={openAddFriend}
              className="rounded text-caption normal-case tracking-normal text-muted-foreground transition-colors hover:text-foreground"
            >
              See all
            </button>
          </div>
          <div className="scroll-thin flex gap-2 overflow-x-auto px-3 pb-1">
            {suggested.map((d) => (
              <SuggestedCard
                key={d.id}
                discoverable={d}
                onOpen={() => onSelect(d.id)}
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1 pt-3 text-micro uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </div>
  );
}

/** Inline row used by the FriendsPanel's search results for traders
 *  who aren't friends yet. Mirrors the AddFriendModal's DiscoverRow
 *  geometry so the Add/Added affordance reads as the same control,
 *  and clicks on the row itself still open the trader profile. */
function DiscoverInlineRow({
  trader,
  added,
  onAdd,
  onRemove,
  onOpen,
}: {
  trader: Trader;
  added: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="group relative flex w-full items-center gap-3 border-b border-white/[0.05] px-3 py-2.5 transition-colors hover:bg-surface-1">
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
      {added ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${trader.name}`}
          className="relative z-10 inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-surface-3 px-3 text-body font-medium text-foreground transition-colors hover:bg-surface-4 hover:text-tone-down"
        >
          <Check
            strokeWidth={2}
            className="size-3.5 text-primary group-hover:hidden"
            aria-hidden
          />
          <span className="group-hover:hidden">Added</span>
          <span className="hidden group-hover:inline">Remove</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          aria-label={`Add ${trader.name}`}
          className="relative z-10 inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-surface-3 px-3 text-body font-medium text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-4 active:scale-[0.96]"
        >
          <UserPlus strokeWidth={1.75} className="size-3.5" aria-hidden />
          Add
        </button>
      )}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${trader.handle ?? trader.name} profile`}
        className="absolute inset-0"
      />
    </div>
  );
}

/** Empty-state block — used both when there are no friends yet and
 *  when the search query has zero matches. Keeps the body width
 *  capped so the prose breathes. */
function EmptyState({
  title,
  body,
  ctaLabel,
  onCta,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="text-body font-semibold text-foreground">{title}</span>
      <span className="max-w-[280px] text-balance text-caption text-muted-foreground">
        {body}
      </span>
      {ctaLabel && onCta && (
        <button
          type="button"
          onClick={onCta}
          className="mt-2 inline-flex h-8 items-center gap-1 rounded-md bg-surface-3 px-3 text-body font-medium text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-4 active:scale-[0.96]"
        >
          <Plus strokeWidth={2} className="size-3.5" aria-hidden />
          {ctaLabel}
        </button>
      )}
    </div>
  );
}

/** Suggested-for-you card — fixed-width tile in the horizontal
 *  carousel. Avatar + name + tiny reason chip + Follow toggle. The
 *  whole card opens the profile; the Follow button is z-layered so
 *  its clicks don't bubble. */
function SuggestedCard({
  discoverable,
  onOpen,
}: {
  discoverable: (typeof DISCOVERABLE)[number];
  onOpen: () => void;
}) {
  const { isFollowing, toggleFollow } = useSignals();
  const { addFriend } = useFriends();
  const following = isFollowing(discoverable.id);
  return (
    <div className="relative flex w-[180px] shrink-0 flex-col items-center gap-2 rounded-lg bg-surface-1 px-3 py-3 ring-1 ring-inset ring-white/[0.05] transition-colors hover:bg-surface-2">
      <span
        aria-hidden
        className="inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full"
      >
        <Jazzicon diameter={48} seed={discoverable.seed} />
      </span>
      <div className="flex min-w-0 flex-col items-center gap-0.5 leading-tight">
        <span className="max-w-[150px] truncate text-body font-medium text-foreground">
          {discoverable.name}
        </span>
        {discoverable.reason && (
          <span className="max-w-[150px] truncate text-caption text-muted-foreground">
            {discoverable.reason}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          // Following is the lighter commitment than friending —
          // tapping the card's primary action just toggles follow.
          // Use AddFriend from the modal to make them a friend.
          toggleFollow(discoverable.id);
          if (!following) addFriend(discoverable.id);
        }}
        aria-pressed={following}
        className={cn(
          "relative z-10 inline-flex h-7 w-full items-center justify-center gap-1 rounded-md px-2 text-caption font-semibold transition-[background-color,color] duration-150 ease-out",
          following
            ? "bg-surface-3 text-foreground hover:bg-surface-4"
            : "bg-primary text-primary-foreground hover:brightness-[1.04]",
        )}
      >
        {following ? "Following" : "Follow"}
      </button>
      {/* Full-card click target — opens the profile. Sits behind the
       *  Follow button so the button still receives clicks. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${discoverable.handle} profile`}
        className="absolute inset-0 rounded-lg"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Leaderboard tab                                                    */
/* ------------------------------------------------------------------ */

function LeaderboardTab({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (id: string) => void;
}) {
  const [scope, setScope] = useState<Scope>("24h");

  // Rank the pool by P/L for the active scope, then filter by the
  // search query. Filtering AFTER ranking means rank positions stay
  // anchored to the unfiltered field (rank 4 stays rank 4 even when
  // only one trader matches).
  const ranked = useMemo(() => {
    const q = query.trim().toLowerCase();
    const ordered = [...POOL]
      .map((t) => ({ trader: t, pnl: pnlFor(t, scope) }))
      .sort((a, b) => b.pnl - a.pnl);
    if (!q) return ordered.map((row, i) => ({ ...row, rank: i + 1 }));
    return ordered
      .map((row, i) => ({ ...row, rank: i + 1 }))
      .filter(
        ({ trader }) =>
          trader.name.toLowerCase().includes(q) ||
          (trader.handle?.toLowerCase().includes(q) ?? false),
      );
  }, [scope, query]);

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
        {ranked.length === 0 ? (
          <EmptyState
            title={`No traders match "${query}"`}
            body="Clear the search to see the full leaderboard."
          />
        ) : (
          ranked.map(({ trader, pnl, rank }) => (
            <LeaderboardRow
              key={trader.id}
              rank={rank}
              trader={trader}
              pnl={pnl}
              scope={scope}
              onOpen={() => onSelect(trader.id)}
            />
          ))
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Inbox tab                                                          */
/* ------------------------------------------------------------------ */

function InboxTab({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (id: string) => void;
}) {
  const { friendIds, addFriend, openFriendChat } = useFriends();
  const q = query.trim().toLowerCase();

  const friendsList = useMemo(() => {
    const list: Trader[] = [];
    for (const id of friendIds) {
      const t = traderById(id);
      if (t) list.push(t);
    }
    return list;
  }, [friendIds]);

  const matchesQuery = (t: { name: string; handle?: string }) =>
    !q ||
    t.name.toLowerCase().includes(q) ||
    (t.handle?.toLowerCase().includes(q) ?? false);

  // Unread takes priority — show all friends with > 0 unread, sorted
  // by unread count descending so the loudest threads sit at top.
  const unreadFriends = useMemo(
    () =>
      friendsList
        .filter((t) => unreadFor(t) > 0)
        .filter(matchesQuery)
        .sort((a, b) => unreadFor(b) - unreadFor(a)),
    [friendsList, q],
  );

  // Read messages — friends WITHOUT unread, still showing the last
  // preview so the inbox feels like a real DM list. Capped to keep
  // the tab scannable.
  const readMessages = useMemo(
    () =>
      friendsList
        .filter((t) => unreadFor(t) === 0)
        .filter(matchesQuery)
        .slice(0, 8),
    [friendsList, q],
  );

  const followers = useMemo(
    () => recentFollowersList(friendIds).filter(matchesQuery),
    [friendIds, q],
  );

  const empty =
    unreadFriends.length === 0 &&
    readMessages.length === 0 &&
    followers.length === 0;

  if (empty) {
    return (
      <EmptyState
        title={q ? `No inbox matches "${query}"` : "All caught up"}
        body={
          q
            ? "Clear the search to see everything."
            : "No new messages or followers since you last checked in."
        }
      />
    );
  }

  return (
    <>
      {unreadFriends.length > 0 && (
        <>
          <SectionHeader>Unread</SectionHeader>
          <div className="flex flex-col">
            {unreadFriends.map((trader) => (
              <InboxMessageRow
                key={trader.id}
                trader={trader}
                unread={unreadFor(trader)}
                onOpen={() => openFriendChat(trader.id)}
              />
            ))}
          </div>
        </>
      )}

      {followers.length > 0 && (
        <>
          <SectionHeader>New followers</SectionHeader>
          <div className="flex flex-col">
            {followers.map((f) => (
              <FollowerRow
                key={f.id}
                follower={f}
                onFollowBack={() => addFriend(f.id)}
                onOpen={() => onSelect(f.id)}
              />
            ))}
          </div>
        </>
      )}

      {readMessages.length > 0 && (
        <>
          <SectionHeader>Messages</SectionHeader>
          <div className="flex flex-col">
            {readMessages.map((trader) => (
              <InboxMessageRow
                key={trader.id}
                trader={trader}
                unread={0}
                onOpen={() => openFriendChat(trader.id)}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

/** Inbox row for a DM thread — avatar + name + preview + age, plus
 *  an unread count pill on the right when there's something new. */
function InboxMessageRow({
  trader,
  unread,
  onOpen,
}: {
  trader: Trader;
  unread: number;
  onOpen: () => void;
}) {
  const { text, age } = lastMessagePreview(trader);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 border-b border-white/[0.05] px-3 py-2.5 text-left transition-colors hover:bg-surface-1"
    >
      <TraderAvatar trader={trader} size={40} showOnline />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-body",
              unread > 0
                ? "font-semibold text-foreground"
                : "font-medium text-foreground",
            )}
          >
            {trader.name}
          </span>
          <span className="ml-auto shrink-0 text-caption tabular-nums text-muted-foreground">
            {age}
          </span>
        </span>
        <span
          className={cn(
            "truncate text-caption",
            unread > 0 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {text}
        </span>
      </div>
      {unread > 0 && (
        <span className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-primary px-1 text-micro font-semibold tabular-nums text-primary-foreground">
          {unread}
        </span>
      )}
    </button>
  );
}

/** Inbox row for a new follower — "Name followed you" + age + an
 *  inline "Follow back" button that adds them as a friend without
 *  leaving the inbox. Tapping the row body opens the profile. */
function FollowerRow({
  follower,
  onFollowBack,
  onOpen,
}: {
  follower: { id: string; name: string; handle: string; seed: number; age: string };
  onFollowBack: () => void;
  onOpen: () => void;
}) {
  const trader = traderById(follower.id);
  return (
    <div className="group relative flex w-full items-center gap-3 border-b border-white/[0.05] px-3 py-2.5 transition-colors hover:bg-surface-1">
      {trader && <TraderAvatar trader={trader} size={40} />}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
        <span className="truncate text-body">
          <span className="font-medium text-foreground">{follower.name}</span>{" "}
          <span className="text-muted-foreground">followed you</span>
        </span>
        <span className="truncate text-caption text-muted-foreground">
          {follower.handle} · {follower.age} ago
        </span>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onFollowBack();
        }}
        aria-label={`Follow ${follower.name} back`}
        className="relative z-10 inline-flex h-8 shrink-0 items-center gap-1 rounded-md bg-surface-3 px-3 text-body font-medium text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-4 active:scale-[0.96]"
      >
        <UserPlus strokeWidth={1.75} className="size-3.5" aria-hidden />
        Follow back
      </button>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${follower.name} profile`}
        className="absolute inset-0"
      />
    </div>
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
  const pct = pctFor(trader, scope);
  const positions = positionsFor(trader);
  const { isAutoMirroring } = useSignals();
  const copying = isAutoMirroring(trader.id);
  return (
    <div className="group relative flex w-full items-center gap-3 border-b border-white/[0.05] px-3 py-2.5 transition-colors hover:bg-surface-1">
      <TraderAvatar trader={trader} size={40} showOnline />
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="flex items-center gap-1.5 truncate">
          <span className="truncate text-body font-medium text-foreground">
            {trader.name}
          </span>
          {copying && <CopyingBadge />}
        </span>
        {trader.handle && (
          <span className="truncate text-body text-muted-foreground">
            {trader.handle}
          </span>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 leading-tight">
        <PnlPercent value={pct} size="md" />
        <PositionStack tokens={positions} />
      </div>
      {/* Full-row click target — opens the profile. Beneath the
       *  Message button so clicks on Message don't bubble here. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${trader.handle ?? trader.name} profile`}
        className="absolute inset-0"
      />
    </div>
  );
}

/** Inline COPYING pill — surfaces auto-mirror state on a friend row
 *  so the user knows at a glance which trades they're copying.
 *  Uses the same primary tint as the "Following" affordance for
 *  visual continuity. */
function CopyingBadge() {
  return (
    <span className="inline-flex items-center rounded-[3px] bg-surface-3 px-1 py-px text-micro font-semibold uppercase tracking-[0.06em] text-primary">
      Copying
    </span>
  );
}

function LeaderboardRow({
  rank,
  trader,
  scope,
  onOpen,
}: {
  rank: number;
  trader: Trader;
  /** Parent still computes pnl for the sort order, but the row only
   *  ever displays the percentage — friend account totals are
   *  private. The prop is intentionally unused here. */
  pnl: number;
  scope: Scope;
  onOpen: () => void;
}) {
  const positions = positionsFor(trader);
  const pct = pctFor(trader, scope);
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
        <PnlPercent value={pct} size="md" />
        <PositionStack tokens={positions} />
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Bits                                                               */
/* ------------------------------------------------------------------ */

function TraderAvatar({
  trader,
  size,
  showOnline = false,
}: {
  trader: Trader;
  size: number;
  /** When true, paints a green online indicator on the bottom-right
   *  of the avatar for traders flagged as online. Online state is
   *  derived from `isOnline(trader)` — mock until a presence API
   *  lands. */
  showOnline?: boolean;
}) {
  const online = showOnline && isOnline(trader);
  const inner = trader.contact ? (
    <ContactAvatar contact={trader.contact} size={size} />
  ) : (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size }}
    >
      <Jazzicon diameter={size} seed={trader.seed} />
    </span>
  );
  if (!online) return inner;
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      {inner}
      <span
        aria-label="Online"
        className="absolute bottom-0 right-0 size-2.5 rounded-full bg-primary ring-2 ring-surface-1"
      />
    </span>
  );
}

/** Deterministic mock — about a third of traders read as "online"
 *  based on their seed. Stable across renders. Real presence will
 *  swap this for a live signal. */
function isOnline(trader: Trader): boolean {
  return trader.seed % 3 === 0;
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

/** Percentage-form variant of PnlValue — same tone semantics, no
 *  dollar magnitude. Used on social surfaces (friend rows,
 *  leaderboard) where a friend's account size is private. */
function PnlPercent({
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
      {value.toFixed(2)}%
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
  // Top three get a small solid crown in a tier color (gold /
  // silver / bronze). No inset number — the color reads the rank
  // unambiguously and the solid fill keeps the shape readable at
  // small sizes.
  const color =
    rank === 1
      ? "var(--wf-pro-gold)" // brand gold
      : rank === 2
        ? "#c8d0d4" // silver
        : "#c08a5b"; // bronze
  return (
    <span
      aria-hidden
      className="inline-flex w-5 shrink-0 items-center justify-center"
    >
      <Crown
        strokeWidth={1.5}
        className="size-4"
        style={{ color }}
        fill={color}
      />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Mock data helpers                                                  */
/* ------------------------------------------------------------------ */

/** Deterministic seed-based mutual flag. About two-thirds of traders
 *  follow you back. Mock until a real follower graph lands. Exported
 *  so TraderProfile can gate its DM affordance on the same rule. */
export function isMutual(trader: Trader): boolean {
  return trader.seed % 3 !== 0;
}

/* ------------------------------------------------------------------ */
/*  Inbox helpers — mocked DM previews + recent follower list          */
/* ------------------------------------------------------------------ */

const LAST_MESSAGE_SAMPLES = [
  "saw you piled into ETH",
  "the funding flipped, watch HYPE",
  "going long $BTC",
  "GM",
  "did u see the news",
  "ser",
  "macro thesis update incoming",
  "thanks for the heads up",
  "thoughts on the SOL setup?",
  "cooking something — DM later",
];

/** Mock unread count for a friend. Uses contact.unread when present
 *  (some CONTACTS entries declare real demo unreads); otherwise a
 *  small seed-derived sprinkle so the inbox has live-feeling data. */
function unreadFor(trader: Trader): number {
  if (trader.contact?.unread) return trader.contact.unread;
  return trader.seed % 7 === 0 ? (trader.seed % 3) + 1 : 0;
}

function lastMessagePreview(trader: Trader): { text: string; age: string } {
  const r = (n: number) =>
    ((trader.seed * 9301 + 49297 + n * 7919) % 233280) / 233280;
  const text =
    LAST_MESSAGE_SAMPLES[Math.floor(r(70) * LAST_MESSAGE_SAMPLES.length)];
  const hours = Math.floor(r(71) * 48);
  const age =
    hours < 1 ? "just now" : hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
  return { text, age };
}

/** Total unread across all friends — drives the Inbox tab's count
 *  badge. Pure derivation; no extra state. */
function totalUnread(friendIds: ReadonlySet<string>): number {
  let n = 0;
  for (const id of friendIds) {
    const t = traderById(id);
    if (t) n += unreadFor(t);
  }
  return n;
}

/** Recent followers — Discoverable entries that aren't friends yet,
 *  filtered by a seed gate so only a handful read as "recently
 *  followed you". Each gets a deterministic "how long ago". */
function recentFollowersList(
  friendIds: ReadonlySet<string>,
): Array<{ id: string; name: string; handle: string; seed: number; age: string }> {
  return DISCOVERABLE.filter(
    (d) => !friendIds.has(d.id) && d.seed % 4 === 0,
  )
    .slice(0, 4)
    .map((d) => {
      const hours = (d.seed % 30) + 1;
      const age =
        hours < 1
          ? "just now"
          : hours < 24
            ? `${hours}h`
            : `${Math.floor(hours / 24)}d`;
      return { ...d, age };
    });
}

/** Percentage-form PnL for a trader, derived from the same seed +
 *  scope so the sign matches pnlFor's. Used in social surfaces
 *  where exposing dollar amounts would leak portfolio size. */
function pctFor(trader: Trader, scope: Scope): number {
  const sign = pnlFor(trader, scope) >= 0 ? 1 : -1;
  const r = (n: number) =>
    ((trader.seed * 9301 + 49297 + n * 7919) % 233280) / 233280;
  // Magnitude scales gently with scope so 24h sits in the single
  // digits and "all" can stretch into the hundreds. Deterministic.
  const base = 0.4 + r(50) * 8; // 0.4% → 8.4%
  const scoped = base * SCOPE_FACTOR[scope];
  return sign * scoped;
}

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
