"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  History,
  Repeat2,
  Send,
  Share2,
  UserPlus,
} from "lucide-react";
import Jazzicon from "react-jazzicon";
import { cn } from "@/lib/utils";
import type { Market } from "../_types";
import { MARKETS } from "../_data/mocks";
import { CircleStack } from "./CircleStack";
import { ContactAvatar } from "./ContactAvatar";
import { TokenLogo } from "./TokenLogo";
import { useSignals } from "../_state/signals-context";
import type { Trader } from "./FriendsPanel";

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const USD_COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

type Scope = "24h" | "7d" | "30d";

/**
 * Trader profile — inline view in the FriendsPanel. Same panel slot
 * as the friends list; selectedTraderId in the parent flips this on.
 *
 * Layout, top → bottom:
 *
 *   Top bar           Back · History · Bell · Share
 *   Avatar row        avatar + Send + Add-friend
 *   Identity          name · verified · @handle
 *   Bio               two-line bio
 *   Counts            Following · Followers
 *   Mutuals           stacked avatars + label
 *   Meta              avg hold · trades · joined
 *   Hero balance      big $ + 24h delta + scope chips
 *   Sparkline         signed (primary/tone-down) line + endpoint dot
 *   Cash balance      separate card
 *   Open positions    list with token + amount + value + %
 */
export function TraderProfile({
  trader,
  onBack,
}: {
  trader: Trader;
  onBack: () => void;
}) {
  const [scope, setScope] = useState<Scope>("24h");
  const { isFollowing, toggleFollow } = useSignals();
  const following = isFollowing(trader.id);

  const profile = useMemo(() => statsFor(trader, scope), [trader, scope]);
  const positions = useMemo(() => positionsFor(trader), [trader]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between px-2 py-2">
        <IconButton onClick={onBack} aria-label="Back to friends">
          <ArrowLeft strokeWidth={2} className="size-4" aria-hidden />
        </IconButton>
        <div className="flex items-center gap-0.5">
          <IconButton aria-label="History">
            <History strokeWidth={1.75} className="size-4" aria-hidden />
          </IconButton>
          <IconButton aria-label="Notifications">
            <Bell strokeWidth={1.75} className="size-4" aria-hidden />
          </IconButton>
          <IconButton aria-label="Share">
            <Share2 strokeWidth={1.75} className="size-4" aria-hidden />
          </IconButton>
        </div>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {/* Avatar + actions */}
        <div className="flex items-center gap-3 pt-1">
          <TraderAvatar trader={trader} size={64} />
          <div className="ml-auto flex items-center gap-1.5">
            {following ? (
              <>
                <PrimaryCta
                  icon={<Send strokeWidth={2} className="size-3.5" aria-hidden />}
                  label="Message"
                  ariaLabel={`Message ${trader.name}`}
                />
                <SecondaryIconButton
                  onClick={() => toggleFollow(trader.id)}
                  ariaLabel="Unfollow"
                  ariaPressed
                  variant="active"
                >
                  <Check strokeWidth={2.25} className="size-4" aria-hidden />
                </SecondaryIconButton>
              </>
            ) : (
              <>
                <PrimaryCta
                  icon={<UserPlus strokeWidth={2} className="size-3.5" aria-hidden />}
                  label="Follow"
                  ariaLabel={`Follow ${trader.name}`}
                  onClick={() => toggleFollow(trader.id)}
                />
                <SecondaryIconButton
                  ariaLabel={`Message ${trader.name}`}
                  variant="ghost"
                >
                  <Send strokeWidth={2} className="size-4" aria-hidden />
                </SecondaryIconButton>
              </>
            )}
          </div>
        </div>

        {/* Name + handle */}
        <div className="mt-3 flex items-center gap-1.5">
          <h2 className="truncate text-title font-semibold leading-none text-foreground">
            {trader.name}
          </h2>
          <VerifiedBadge />
        </div>
        <p className="mt-1 truncate text-body text-muted-foreground">
          {trader.handle ?? `@${trader.id}`}
        </p>

        {/* Bio — two short lines from a small pool */}
        <p className="mt-3 whitespace-pre-line text-body leading-relaxed text-muted-foreground">
          {profile.bio}
        </p>

        {/* Following / Followers */}
        <div className="mt-3 flex items-center gap-4 text-body">
          <span>
            <span className="font-semibold text-foreground tabular-nums">
              {USD_COMPACT.format(profile.followingCount)}
            </span>{" "}
            <span className="text-muted-foreground">Following</span>
          </span>
          <span>
            <span className="font-semibold text-foreground tabular-nums">
              {USD_COMPACT.format(profile.followersCount)}
            </span>{" "}
            <span className="text-muted-foreground">Followers</span>
          </span>
        </div>

        {/* Mutuals row */}
        {profile.mutuals.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <MutualsStack mutuals={profile.mutuals} />
            <span className="text-body text-muted-foreground">
              {profile.mutuals.length} mutual
              {profile.mutuals.length === 1 ? "" : "s"} following
            </span>
          </div>
        )}

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-body text-muted-foreground">
          <MetaPip Icon={Clock} text={profile.avgHold} />
          <MetaPip Icon={Repeat2} text={`${profile.tradeCount} trades`} />
          <MetaPip Icon={Calendar} text={`Joined ${profile.joined}`} />
        </div>

        <Divider />

        {/* Hero balance + scope */}
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="font-heading text-display font-semibold leading-none tabular-nums text-foreground">
              {USD.format(profile.balance)}
            </div>
            <div
              className={cn(
                "mt-2 text-body tabular-nums",
                profile.delta >= 0 ? "text-primary" : "text-tone-down",
              )}
            >
              {profile.delta >= 0 ? "+" : ""}
              {USD.format(profile.delta)}{" "}
              <span className="text-muted-foreground">{scope}</span>
            </div>
          </div>
          <ScopeChips scope={scope} setScope={setScope} />
        </div>

        {/* Sparkline */}
        <div className="mt-3">
          <BigSparkline
            data={profile.sparkline}
            positive={profile.delta >= 0}
          />
        </div>

        {/* Cash balance */}
        <button
          type="button"
          className="mt-4 flex w-full items-center gap-3 rounded-lg bg-surface-1 px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
        >
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-3 text-foreground"
          >
            $
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-body text-muted-foreground">
              Cash balance
            </span>
            <span className="text-body font-semibold tabular-nums text-foreground">
              {USD.format(profile.cashBalance)}
            </span>
          </div>
        </button>

        {/* Open positions */}
        <div className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-caption uppercase tracking-[0.14em] text-muted-foreground">
            Open positions
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-signal shadow-[0_0_6px_var(--signal)]"
            />
          </span>
          <ChevronDown
            strokeWidth={2}
            className="size-3.5 text-muted-foreground"
            aria-hidden
          />
        </div>

        <div className="mt-2 flex flex-col divide-y divide-white/[0.04]">
          {positions.map((p) => (
            <PositionRow key={p.market.id} position={p} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TraderAvatar({ trader, size }: { trader: Trader; size: number }) {
  if (trader.contact)
    return <ContactAvatar contact={trader.contact} size={size} />;
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

function IconButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-2 hover:text-foreground active:scale-[0.96]"
    >
      {children}
    </button>
  );
}

/** Solid mint CTA — same shape as TradePanel's Place CTA, with a
 *  subtle top highlight stripe for a touch of dimensionality. */
function PrimaryCta({
  icon,
  label,
  ariaLabel,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  ariaLabel: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="group relative inline-flex h-9 items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-primary px-4 text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.96]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-white/40 to-transparent"
      />
      <span className="relative inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </button>
  );
}

function SecondaryIconButton({
  children,
  onClick,
  ariaLabel,
  ariaPressed,
  variant,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel: string;
  ariaPressed?: boolean;
  variant: "ghost" | "active";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
        variant === "active"
          ? "bg-primary/10 text-primary ring-primary/30 hover:bg-primary/15"
          : "bg-transparent text-muted-foreground ring-white/[0.10] hover:bg-surface-1 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function VerifiedBadge() {
  // "X-linked" verification mark — small flat chip with an X glyph.
  // Uses signal-cyan to stay in brand vocabulary rather than the
  // canonical bird-blue verified.
  return (
    <span
      aria-label="X verified"
      className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm bg-signal/20 text-micro font-semibold text-signal"
    >
      𝕏
    </span>
  );
}

function MutualsStack({
  mutuals,
}: {
  mutuals: { id: string; seed: number }[];
}) {
  return (
    <CircleStack size={20} overlap={6} aria-hidden>
      {mutuals.slice(0, 3).map((m) => (
        <Jazzicon key={m.id} diameter={20} seed={m.seed} />
      ))}
    </CircleStack>
  );
}

function MetaPip({
  Icon,
  text,
}: {
  Icon: typeof Clock;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon strokeWidth={1.75} className="size-3 text-muted-foreground/80" aria-hidden />
      {text}
    </span>
  );
}

function Divider() {
  return <div aria-hidden className="my-4 h-px bg-surface-1" />;
}

function ScopeChips({
  scope,
  setScope,
}: {
  scope: Scope;
  setScope: (s: Scope) => void;
}) {
  const scopes: Scope[] = ["24h", "7d", "30d"];
  return (
    <div className="flex items-center gap-0.5">
      {scopes.map((s) => (
        <button
          key={s}
          type="button"
          aria-pressed={scope === s}
          onClick={() => setScope(s)}
          className={cn(
            "inline-flex h-6 items-center rounded px-2 text-body transition-[background-color,color] duration-150 ease-out",
            scope === s
              ? "bg-surface-3 font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function BigSparkline({
  data,
  positive,
}: {
  data: number[];
  positive: boolean;
}) {
  if (data.length === 0) return null;
  const w = 360;
  const h = 96;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return [x, y] as const;
  });
  const pointsStr = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const endpoint = pts[pts.length - 1];
  // Area path: line down to the bottom corners for the fill.
  const areaStr =
    `M ${pts[0][0].toFixed(1)},${h} L ` +
    pointsStr +
    ` L ${pts[pts.length - 1][0].toFixed(1)},${h} Z`;
  const lineColor = positive ? "var(--primary)" : "var(--tone-down)";
  const fillId = `tp-grad-${positive ? "up" : "down"}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="h-24 w-full"
      aria-hidden
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.22" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaStr} fill={`url(#${fillId})`} />
      <polyline
        points={pointsStr}
        fill="none"
        stroke={lineColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={endpoint[0]} cy={endpoint[1]} r={3.5} fill={lineColor} />
    </svg>
  );
}

function PositionRow({ position }: { position: PositionDetail }) {
  const up = position.pctChange >= 0;
  return (
    <div className="flex items-center gap-3 py-2.5">
      <TokenLogo
        symbol={position.market.symbol}
        char={position.market.iconChar}
        bg={position.market.iconBg}
        fg={position.market.iconFg ?? "#fff"}
        size={32}
      />
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-body font-medium text-foreground">
          {position.market.symbol.replace("-USDC", "")}
        </span>
        <span className="truncate text-body text-muted-foreground tabular-nums">
          {formatAmount(position.amount)} {position.market.symbol.replace("-USDC", "")}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end leading-tight">
        <span className="text-body font-semibold tabular-nums text-foreground">
          {USD.format(position.valueUsd)}
        </span>
        <span
          className={cn(
            "text-body tabular-nums",
            up ? "text-primary" : "text-tone-down",
          )}
        >
          {up ? "▲" : "▼"} {Math.abs(position.pctChange).toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mock data per trader                                               */
/* ------------------------------------------------------------------ */

type PositionDetail = {
  market: Market;
  amount: number;
  valueUsd: number;
  pctChange: number;
};

type ScopeFactor = Record<Scope, number>;
const SCOPE_FACTOR: ScopeFactor = { "24h": 1, "7d": 4.2, "30d": 12.6 };

const BIOS = [
  "everything will be ok in the end\nif its not ok then its not the end",
  "long convictions · short patience",
  "running back · long volatility",
  "i sell signals, not promises",
  "perma-bid",
  "max pain enjoyer",
];

function statsFor(trader: Trader, scope: Scope) {
  const r = (n: number) =>
    ((trader.seed * 9301 + 49297 + n * 7919) % 233280) / 233280;
  const sign = r(0) > 0.32 ? 1 : -1;
  const balance = 80_000 + r(1) * 1_900_000;
  const delta = sign * (200 + r(2) * 120_000) * SCOPE_FACTOR[scope];
  const cashBalance = balance * (0.005 + r(3) * 0.12);
  const followingCount = 60 + Math.floor(r(4) * 800);
  const followersCount = 1000 + Math.floor(r(5) * 130_000);
  const avgHoldDays = 1 + Math.floor(r(6) * 14);
  const avgHoldHours = Math.floor(r(7) * 24);
  const tradeCount = 80 + Math.floor(r(8) * 1500);
  const joined = joinedDate(r(9));
  const bio = BIOS[Math.floor(r(10) * BIOS.length)];

  // Sparkline trends in the direction of delta with light noise.
  const sparkline = Array.from({ length: 64 }).map((_, i) => {
    const trend = (i / 63) * (delta >= 0 ? 1 : -1) * 10;
    const noise = (r(20 + i) - 0.5) * 3.5;
    return trend + noise + 50;
  });

  // Synthesize a small mutuals avatar list.
  const mutuals = [
    { id: "m1", seed: (trader.seed + 31) % 100000 },
    { id: "m2", seed: (trader.seed * 7) % 100000 },
  ];

  return {
    balance,
    delta,
    cashBalance,
    followingCount,
    followersCount,
    avgHold: `${avgHoldDays}d ${avgHoldHours}h avg. hold`,
    tradeCount,
    joined,
    bio,
    sparkline,
    mutuals,
  };
}

function positionsFor(trader: Trader): PositionDetail[] {
  const r = (n: number) =>
    ((trader.seed * 9301 + 49297 + n * 7919) % 233280) / 233280;
  const count = 2 + Math.floor(r(50) * 4); // 2–5 positions
  const seen = new Set<string>();
  const out: PositionDetail[] = [];
  for (let i = 0; out.length < count && i < MARKETS.length * 2; i++) {
    const m = MARKETS[Math.floor(r(60 + i) * MARKETS.length)];
    if (!m || seen.has(m.id)) continue;
    seen.add(m.id);
    const amount = 100 + r(70 + i) * 9_999_900;
    // Tiny scaling factor so position values don't all collide at the
    // same magnitude. Real prices are wired up later with a price feed.
    const valueUsd = amount * (0.5 + r(80 + i) * 4);
    const pctChange = -25 + r(90 + i) * 90;
    out.push({ market: m, amount, valueUsd, pctChange });
  }
  // Sort largest position first.
  out.sort((a, b) => b.valueUsd - a.valueUsd);
  return out;
}

function joinedDate(r: number): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthIdx = Math.floor(r * 12);
  const year = 2022 + Math.floor(r * 4);
  return `${months[monthIdx]} ${year}`;
}

function formatAmount(n: number): string {
  if (n >= 1_000_000) {
    return new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
    }).format(Math.round(n));
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 4,
  }).format(n);
}
