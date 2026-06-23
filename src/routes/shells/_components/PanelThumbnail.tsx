/**
 * Tiny SVG mockups of what each panel actually looks like. Used in
 * the AddPanelMenu grid so users see the panel rather than read
 * about it.
 *
 * Each thumbnail renders in a 96×56 box (matches the AddPanelMenu
 * tile dimensions). Colors come from currentColor + Tailwind utility
 * classes on SVG elements where possible; raw hex avoided so dark/
 * light-theme changes flow through automatically.
 *
 * Design language: abstract silhouettes, not pixel-perfect copies.
 * Two or three tokens of contrast per thumbnail is enough — too much
 * detail at 96px just reads as noise.
 *
 * Font sizes: the SVG labels here intentionally use arbitrary
 * `text-[Npx]` values (5–9px) instead of the `text-micro` named
 * utility (10px). These are decorative chart annotations rendered
 * at 96×56 — they're never read as real UI text, and the smallest
 * named scale step is still 1–5px too big for the silhouette look.
 * This is the one explicit exception to "every text size is a
 * named utility" in shells (design-audit decision 1B).
 */

import { cn } from "@/lib/utils";
import type { PanelType } from "../_layout/types";

type Props = {
  type: PanelType;
  className?: string;
};

const SVG_PROPS = {
  viewBox: "0 0 96 56",
  preserveAspectRatio: "xMidYMid meet",
  className:
    "h-full w-full rounded-md bg-surface-1 ring-1 ring-inset ring-white/[0.06]",
} as const;

export function PanelThumbnail({ type, className }: Props) {
  return (
    <div className={className}>
      {RENDERERS[type]?.() ?? <Fallback />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Per-panel art                                                      */
/* ------------------------------------------------------------------ */

function ChartArt() {
  // Five candlesticks with wicks, climbing right. Last two in
  // primary-mint to suggest an up-trend.
  const candles: Array<{
    x: number;
    bodyY: number;
    bodyH: number;
    wickY1: number;
    wickY2: number;
    up: boolean;
  }> = [
    { x: 10, bodyY: 28, bodyH: 14, wickY1: 22, wickY2: 46, up: false },
    { x: 24, bodyY: 22, bodyH: 18, wickY1: 18, wickY2: 44, up: true },
    { x: 38, bodyY: 26, bodyH: 12, wickY1: 22, wickY2: 42, up: false },
    { x: 52, bodyY: 18, bodyH: 18, wickY1: 12, wickY2: 40, up: true },
    { x: 66, bodyY: 12, bodyH: 22, wickY1: 8, wickY2: 38, up: true },
  ];
  return (
    <svg {...SVG_PROPS}>
      {/* baseline */}
      <line
        x1={6}
        y1={50}
        x2={90}
        y2={50}
        stroke="currentColor"
        className="text-white/10"
      />
      {candles.map((c, i) => (
        <g key={i}>
          <line
            x1={c.x + 4}
            y1={c.wickY1}
            x2={c.x + 4}
            y2={c.wickY2}
            stroke="currentColor"
            className={c.up ? "text-primary/70" : "text-tone-down/60"}
            strokeWidth={1}
          />
          <rect
            x={c.x}
            y={c.bodyY}
            width={8}
            height={c.bodyH}
            rx={1}
            className={c.up ? "fill-primary/70" : "fill-tone-down/60"}
          />
        </g>
      ))}
    </svg>
  );
}

function PortfolioArt() {
  // Big balance number stub + sparkline rising into the corner.
  return (
    <svg {...SVG_PROPS}>
      <rect x={8} y={8} width={42} height={6} rx={1.5} className="fill-white/30" />
      <rect x={8} y={18} width={26} height={3} rx={1} className="fill-primary/70" />
      <polyline
        points="8,46 22,40 32,42 44,34 56,30 70,24 88,14"
        fill="none"
        stroke="currentColor"
        className="text-primary/80"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatArt() {
  // Three message bubbles alternating sides.
  return (
    <svg {...SVG_PROPS}>
      <rect x={6} y={8} width={40} height={9} rx={4} className="fill-white/20" />
      <rect x={32} y={22} width={50} height={9} rx={4} className="fill-primary/40" />
      <rect x={6} y={36} width={32} height={9} rx={4} className="fill-white/20" />
    </svg>
  );
}

function TradeArt() {
  // Amount input + side toggle (long/short).
  return (
    <svg {...SVG_PROPS}>
      <rect x={6} y={8} width={84} height={14} rx={2} className="fill-white/10" />
      <rect x={6} y={28} width={40} height={20} rx={3} className="fill-primary/30" />
      <rect x={50} y={28} width={40} height={20} rx={3} className="fill-tone-down/30" />
      <text
        x={26}
        y={42}
        textAnchor="middle"
        className="fill-primary text-[8px] font-semibold"
        style={{ fontSize: 7 }}
      >
        LONG
      </text>
      <text
        x={70}
        y={42}
        textAnchor="middle"
        className="fill-tone-down text-[8px] font-semibold"
        style={{ fontSize: 7 }}
      >
        SHORT
      </text>
    </svg>
  );
}

function OrderBookArt() {
  // Three asks (red) + three bids (mint), widths decreasing as they
  // move away from the spread.
  const asks = [
    { y: 6, w: 80 },
    { y: 12, w: 60 },
    { y: 18, w: 72 },
  ];
  const bids = [
    { y: 32, w: 76 },
    { y: 38, w: 58 },
    { y: 44, w: 66 },
  ];
  return (
    <svg {...SVG_PROPS}>
      {asks.map((r, i) => (
        <rect
          key={`a${i}`}
          x={6}
          y={r.y}
          width={r.w}
          height={4}
          rx={1}
          className="fill-tone-down/40"
        />
      ))}
      {/* spread line */}
      <line
        x1={6}
        y1={26}
        x2={90}
        y2={26}
        stroke="currentColor"
        className="text-white/15"
      />
      {bids.map((r, i) => (
        <rect
          key={`b${i}`}
          x={6}
          y={r.y}
          width={r.w}
          height={4}
          rx={1}
          className="fill-primary/40"
        />
      ))}
    </svg>
  );
}

function CompanionArt() {
  // Centered avatar (head + shoulders) on a tile — mic listener UI.
  return (
    <svg {...SVG_PROPS}>
      <rect
        x={28}
        y={6}
        width={40}
        height={44}
        rx={4}
        className="fill-white/[0.04]"
      />
      <circle cx={48} cy={24} r={6} className="fill-white/35" />
      <path
        d="M34 44 Q48 36 62 44"
        fill="none"
        stroke="currentColor"
        className="text-white/35"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <circle cx={48} cy={6.5} r={2} className="fill-tone-down/80" />
    </svg>
  );
}

function MoversArt() {
  // Three rows: ticker dot + bar + percent chip. Top two mint, bottom
  // red — the panel's gainers-vs-losers split reads at a glance.
  const rows: Array<{ y: number; w: number; up: boolean }> = [
    { y: 8, w: 56, up: true },
    { y: 22, w: 44, up: true },
    { y: 36, w: 50, up: false },
  ];
  return (
    <svg {...SVG_PROPS}>
      {rows.map(({ y, w, up }, i) => (
        <g key={i}>
          <circle cx={10} cy={y + 4} r={3} className="fill-white/30" />
          <rect
            x={18}
            y={y + 1}
            width={w}
            height={3}
            rx={1}
            className="fill-white/35"
          />
          <rect
            x={18}
            y={y + 6}
            width={w * 0.6}
            height={3}
            rx={1}
            className={up ? "fill-primary/55" : "fill-tone-down/55"}
          />
          <rect
            x={80}
            y={y + 1}
            width={10}
            height={8}
            rx={2}
            className={up ? "fill-primary/30" : "fill-tone-down/30"}
          />
        </g>
      ))}
    </svg>
  );
}

function WatchlistArt() {
  // Four list rows: token dot + ticker bar + right-aligned price.
  // Top row starred to differentiate from Top Movers (sorted by %).
  const rows = [
    { y: 8, starred: true },
    { y: 20, starred: false },
    { y: 32, starred: false },
    { y: 44, starred: false },
  ];
  return (
    <svg {...SVG_PROPS}>
      {rows.map(({ y, starred }, i) => (
        <g key={i}>
          {starred && (
            <path
              d={`M5 ${y + 3} L6 ${y + 5} L8 ${y + 5} L6.5 ${y + 6.5} L7 ${y + 9} L5 ${y + 7.5} L3 ${y + 9} L3.5 ${y + 6.5} L2 ${y + 5} L4 ${y + 5} Z`}
              className="fill-primary/70"
            />
          )}
          <circle cx={14} cy={y + 5} r={3} className="fill-white/25" />
          <rect
            x={20}
            y={y + 3}
            width={20}
            height={4}
            rx={1}
            className="fill-white/35"
          />
          <rect
            x={66}
            y={y + 3}
            width={20}
            height={4}
            rx={1}
            className="fill-white/30"
          />
        </g>
      ))}
    </svg>
  );
}

function MiniChartsArt() {
  // 2×2 grid of mini cards, each with a tiny sparkline.
  const cards: Array<{ x: number; y: number; up: boolean }> = [
    { x: 4, y: 4, up: true },
    { x: 50, y: 4, up: false },
    { x: 4, y: 30, up: false },
    { x: 50, y: 30, up: true },
  ];
  return (
    <svg {...SVG_PROPS}>
      {cards.map(({ x, y, up }, i) => (
        <g key={i}>
          <rect
            x={x}
            y={y}
            width={42}
            height={22}
            rx={2}
            className="fill-white/[0.06]"
          />
          <circle cx={x + 5} cy={y + 5} r={2} className="fill-white/40" />
          <rect
            x={x + 10}
            y={y + 3}
            width={14}
            height={2.5}
            rx={1}
            className="fill-white/35"
          />
          <polyline
            points={
              up
                ? `${x + 4},${y + 18} ${x + 10},${y + 15} ${x + 16},${y + 16} ${x + 24},${y + 12} ${x + 32},${y + 9} ${x + 38},${y + 10}`
                : `${x + 4},${y + 10} ${x + 10},${y + 11} ${x + 16},${y + 14} ${x + 24},${y + 13} ${x + 32},${y + 16} ${x + 38},${y + 18}`
            }
            fill="none"
            stroke="currentColor"
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={up ? "text-primary/80" : "text-tone-down/80"}
          />
        </g>
      ))}
    </svg>
  );
}

function PolymarketArt() {
  // Card with question lines + YES/NO outcome buttons.
  return (
    <svg {...SVG_PROPS}>
      <rect x={4} y={6} width={88} height={44} rx={3} className="fill-white/[0.04]" />
      <rect x={10} y={12} width={60} height={3.5} rx={1} className="fill-white/40" />
      <rect x={10} y={19} width={48} height={3.5} rx={1} className="fill-white/30" />
      <rect x={10} y={32} width={36} height={12} rx={3} className="fill-primary/30" />
      <text
        x={28}
        y={41}
        textAnchor="middle"
        className="fill-primary text-[7px] font-semibold"
        style={{ fontSize: 7 }}
      >
        YES
      </text>
      <rect x={50} y={32} width={36} height={12} rx={3} className="fill-tone-down/30" />
      <text
        x={68}
        y={41}
        textAnchor="middle"
        className="fill-tone-down text-[7px] font-semibold"
        style={{ fontSize: 7 }}
      >
        NO
      </text>
    </svg>
  );
}

function GolfArt() {
  return (
    <svg {...SVG_PROPS}>
      <rect x={6} y={6} width={28} height={26} rx={3} className="fill-primary/25" />
      <path
        d="M6 24 Q14 18 20 22 T34 20 L34 32 L6 32 Z"
        className="fill-primary/45"
      />
      <line
        x1={26}
        y1={10}
        x2={26}
        y2={20}
        stroke="currentColor"
        className="text-white/60"
        strokeWidth={1}
      />
      <path d="M26 10 L31 12 L26 14 Z" className="fill-tone-down/80" />
      <rect x={40} y={10} width={42} height={3.5} rx={1} className="fill-white/40" />
      <rect x={40} y={17} width={28} height={2.5} rx={1} className="fill-white/25" />
      <rect x={40} y={26} width={22} height={9} rx={4} className="fill-white/12" />
      <rect x={66} y={26} width={22} height={9} rx={4} className="fill-white/12" />
      <rect x={6} y={38} width={84} height={3} rx={1} className="fill-white/8" />
    </svg>
  );
}

function VideoArt() {
  return (
    <svg {...SVG_PROPS}>
      <rect x={4} y={4} width={88} height={26} rx={2} className="fill-white/[0.08]" />
      <path d="M44 12 L44 22 L54 17 Z" className="fill-white/70" />
      {[34, 44].map((y, i) => (
        <g key={i}>
          <rect x={4} y={y} width={16} height={9} rx={1.5} className="fill-white/[0.10]" />
          <rect x={23} y={y + 1} width={48} height={3} rx={1} className="fill-white/40" />
          <rect x={23} y={y + 6} width={26} height={2} rx={1} className="fill-white/25" />
        </g>
      ))}
    </svg>
  );
}

function MediaArt() {
  return (
    <svg {...SVG_PROPS}>
      <rect x={6} y={6} width={24} height={8} rx={2} className="fill-foreground/30" />
      <rect x={34} y={6} width={24} height={8} rx={2} className="fill-white/10" />
      <line x1={4} y1={18} x2={92} y2={18} stroke="currentColor" className="text-white/10" />
      <circle cx={12} cy={28} r={4} className="fill-white/30" />
      <rect x={20} y={24} width={28} height={3} rx={1} className="fill-white/40" />
      <rect x={50} y={24} width={14} height={3} rx={1} className="fill-white/20" />
      <rect x={20} y={31} width={66} height={3} rx={1} className="fill-white/30" />
      <rect x={20} y={37} width={48} height={3} rx={1} className="fill-white/20" />
      <circle cx={22} cy={47} r={1.5} className="fill-white/30" />
      <circle cx={36} cy={47} r={1.5} className="fill-white/30" />
      <circle cx={50} cy={47} r={1.5} className="fill-white/30" />
    </svg>
  );
}

function CalendarArt() {
  // Date tile (Mar 14) on the left + two event rows on the right.
  // Reads instantly as "agenda" without needing a full month grid.
  return (
    <svg {...SVG_PROPS}>
      {/* Date tile */}
      <rect x={6} y={8} width={20} height={22} rx={2.5} className="fill-white/[0.08]" />
      <rect x={6} y={8} width={20} height={6} rx={2.5} className="fill-tone-down/55" />
      <text
        x={16}
        y={13}
        textAnchor="middle"
        className="fill-white text-[5px] font-semibold uppercase"
        style={{ fontSize: 5, letterSpacing: 0.4 }}
      >
        MAR
      </text>
      <text
        x={16}
        y={26}
        textAnchor="middle"
        className="fill-white text-micro font-semibold tabular-nums"
        style={{ fontSize: 10 }}
      >
        14
      </text>
      {/* Event rows */}
      {[
        { y: 10, color: "fill-primary/60" },
        { y: 22, color: "fill-white/30" },
        { y: 34, color: "fill-tone-down/60" },
      ].map((r, i) => (
        <g key={i}>
          <rect x={32} y={r.y + 2} width={2} height={6} rx={1} className={r.color} />
          <rect x={37} y={r.y + 2} width={34} height={2.5} rx={1} className="fill-white/40" />
          <rect x={37} y={r.y + 6} width={22} height={2} rx={1} className="fill-white/20" />
        </g>
      ))}
      {/* Faint timeline line */}
      <line x1={6} y1={44} x2={90} y2={44} stroke="currentColor" className="text-white/10" />
    </svg>
  );
}

function TodoArt() {
  // Three task rows: one checked + struck through, two open with
  // priority dots. Matches the actual panel layout.
  return (
    <svg {...SVG_PROPS}>
      {[
        { y: 8, done: true, prio: "fill-white/30" },
        { y: 22, done: false, prio: "fill-primary/70" },
        { y: 36, done: false, prio: "fill-tone-down/70" },
      ].map((row, i) => (
        <g key={i}>
          {/* Checkbox */}
          {row.done ? (
            <g>
              <rect x={8} y={row.y} width={8} height={8} rx={1.5} className="fill-primary" />
              <path
                d={`M10 ${row.y + 4.5} L12 ${row.y + 6.5} L15 ${row.y + 2.5}`}
                stroke="black"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </g>
          ) : (
            <rect
              x={8}
              y={row.y}
              width={8}
              height={8}
              rx={1.5}
              fill="none"
              stroke="currentColor"
              className="text-white/30"
              strokeWidth={1}
            />
          )}
          {/* Priority dot */}
          <circle cx={20} cy={row.y + 4} r={1.5} className={row.prio} />
          {/* Task text */}
          <rect
            x={26}
            y={row.y + 2}
            width={56}
            height={3.5}
            rx={1}
            className={row.done ? "fill-white/20" : "fill-white/40"}
          />
          {row.done && (
            <line
              x1={26}
              y1={row.y + 3.5}
              x2={82}
              y2={row.y + 3.5}
              stroke="currentColor"
              className="text-white/30"
              strokeWidth={0.8}
            />
          )}
        </g>
      ))}
    </svg>
  );
}

function MarketplaceArt() {
  // 2×1 grid of listing cards with image tile + title/price stub.
  // Each card has a tint thumbnail and a price chip.
  const cards: Array<{ x: number; tint: string }> = [
    { x: 4, tint: "fill-amber-300/35" },
    { x: 50, tint: "fill-violet-300/30" },
  ];
  return (
    <svg {...SVG_PROPS}>
      {cards.map((c, i) => (
        <g key={i}>
          <rect
            x={c.x}
            y={4}
            width={42}
            height={48}
            rx={3}
            className="fill-white/[0.04]"
          />
          {/* Thumbnail tile */}
          <rect x={c.x + 3} y={7} width={36} height={20} rx={2} className={c.tint} />
          {/* Title */}
          <rect
            x={c.x + 3}
            y={31}
            width={22}
            height={2.5}
            rx={1}
            className="fill-white/40"
          />
          {/* Description */}
          <rect
            x={c.x + 3}
            y={36}
            width={30}
            height={2}
            rx={1}
            className="fill-white/20"
          />
          {/* Price chip */}
          <rect
            x={c.x + 3}
            y={43}
            width={16}
            height={5}
            rx={1.5}
            className="fill-primary/40"
          />
        </g>
      ))}
    </svg>
  );
}

function ConcertsArt() {
  // Date tile + event title + ticket chip with a small music glyph.
  return (
    <svg {...SVG_PROPS}>
      {/* Date tile */}
      <rect x={6} y={8} width={20} height={22} rx={2.5} className="fill-white/[0.08]" />
      <rect x={6} y={8} width={20} height={6} rx={2.5} className="fill-primary/55" />
      <text
        x={16}
        y={13}
        textAnchor="middle"
        className="fill-black text-[5px] font-semibold uppercase"
        style={{ fontSize: 5, letterSpacing: 0.4 }}
      >
        JUN
      </text>
      <text
        x={16}
        y={26}
        textAnchor="middle"
        className="fill-white text-micro font-semibold tabular-nums"
        style={{ fontSize: 10 }}
      >
        21
      </text>
      {/* Image thumbnail */}
      <rect x={32} y={8} width={16} height={22} rx={2} className="fill-violet-400/40" />
      {/* Music note */}
      <circle cx={37} cy={24} r={2} className="fill-white/80" />
      <line
        x1={39}
        y1={24}
        x2={39}
        y2={15}
        stroke="currentColor"
        className="text-white/80"
        strokeWidth={1}
        strokeLinecap="round"
      />
      <path
        d="M39 15 L43 14"
        stroke="currentColor"
        className="text-white/80"
        strokeWidth={1}
        strokeLinecap="round"
      />
      {/* Event title + venue */}
      <rect x={54} y={10} width={32} height={3} rx={1} className="fill-white/45" />
      <rect x={54} y={16} width={24} height={2.5} rx={1} className="fill-white/25" />
      <rect x={54} y={22} width={14} height={6} rx={2} className="fill-primary/30" />
      {/* Second row */}
      <rect x={6} y={36} width={84} height={12} rx={2} className="fill-white/[0.04]" />
      <circle cx={12} cy={42} r={3} className="fill-tone-down/70" />
      <rect x={20} y={39} width={40} height={2.5} rx={1} className="fill-white/35" />
      <rect x={20} y={44} width={28} height={2} rx={1} className="fill-white/20" />
    </svg>
  );
}

function WorldClocksArt() {
  // 2×2 grid of mini clock cards with city codes + times.
  const cards: Array<{ x: number; y: number; code: string; time: string; open: boolean }> = [
    { x: 4, y: 4, code: "NY", time: "09:32", open: true },
    { x: 50, y: 4, code: "LDN", time: "14:32", open: true },
    { x: 4, y: 30, code: "TYO", time: "22:32", open: false },
    { x: 50, y: 30, code: "HK", time: "21:32", open: false },
  ];
  return (
    <svg {...SVG_PROPS}>
      {cards.map((c, i) => (
        <g key={i}>
          <rect
            x={c.x}
            y={c.y}
            width={42}
            height={22}
            rx={2.5}
            className={
              c.open ? "fill-primary/[0.08]" : "fill-white/[0.04]"
            }
          />
          <circle
            cx={c.x + 5}
            cy={c.y + 5}
            r={1.5}
            className={c.open ? "fill-primary/80" : "fill-white/30"}
          />
          <text
            x={c.x + 9}
            y={c.y + 7}
            className={cn(
              "text-[5px] font-semibold uppercase",
              c.open ? "fill-primary" : "fill-white/60",
            )}
            style={{ fontSize: 5, letterSpacing: 0.3 }}
          >
            {c.code}
          </text>
          <text
            x={c.x + 4}
            y={c.y + 17}
            className="fill-white text-[8px] font-semibold tabular-nums"
            style={{ fontSize: 8 }}
          >
            {c.time}
          </text>
        </g>
      ))}
    </svg>
  );
}

function WeatherArt() {
  // Big temp + sun/cloud icon, then 5-day mini forecast strip below.
  return (
    <svg {...SVG_PROPS}>
      {/* Big number 72° */}
      <text
        x={8}
        y={26}
        className="fill-white text-title font-semibold tabular-nums"
        style={{ fontSize: 18 }}
      >
        72°
      </text>
      <rect x={8} y={28} width={26} height={2.5} rx={1} className="fill-white/30" />
      {/* Sun + cloud */}
      <circle cx={64} cy={16} r={6} className="fill-amber-300/70" />
      <path
        d="M50 22 Q52 18 56 18 Q58 14 64 16 Q72 14 74 20 Q80 20 80 26 L48 26 Q46 22 50 22 Z"
        className="fill-white/30"
      />
      {/* 5-day strip */}
      {[0, 1, 2, 3, 4].map((i) => {
        const x = 6 + i * 18;
        return (
          <g key={i}>
            <rect x={x} y={36} width={16} height={16} rx={2} className="fill-white/[0.05]" />
            <circle
              cx={x + 8}
              cy={42}
              r={2}
              className={i === 2 ? "fill-blue-300/60" : "fill-amber-300/65"}
            />
            <rect x={x + 4} y={47} width={8} height={2} rx={1} className="fill-white/50" />
          </g>
        );
      })}
    </svg>
  );
}

function Fallback() {
  return (
    <svg {...SVG_PROPS}>
      <rect
        x={20}
        y={14}
        width={56}
        height={28}
        rx={3}
        className="fill-white/[0.06]"
      />
    </svg>
  );
}

const RENDERERS: Partial<Record<PanelType, () => React.JSX.Element>> = {
  chart: ChartArt,
  portfolio: PortfolioArt,
  chat: ChatArt,
  trade: TradeArt,
  orderbook: OrderBookArt,
  companion: CompanionArt,
  movers: MoversArt,
  watchlist: WatchlistArt,
  miniCharts: MiniChartsArt,
  polymarket: PolymarketArt,
  golf: GolfArt,
  video: VideoArt,
  media: MediaArt,
  // ─── Extras ──────────────────────────────────────────────────────
  calendar: CalendarArt,
  todo: TodoArt,
  marketplace: MarketplaceArt,
  concerts: ConcertsArt,
  worldClocks: WorldClocksArt,
  weather: WeatherArt,
};
