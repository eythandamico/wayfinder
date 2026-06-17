"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { MARKETS } from "../_data/mocks";
import type { Market } from "../_types";
import { useActiveMarket } from "../_state/shells-context";
import { AskAgentAffordance, AskAgentSpacer } from "./AskAgentAffordance";
import { PanelTab, PanelTabBar } from "./PanelTabs";
import { TokenLogo } from "./TokenLogo";

type Tab = "gainers" | "losers";

/**
 * Top Movers — quick scan of the biggest 24h % movers across the
 * markets registry. Two tabs split gainers from losers; rows are
 * sorted by absolute % change. Tap a row → setActiveMarket so the
 * focused chart / Trade / OrderBook pivot to that asset.
 */
export function TopMoversPanel() {
  const [tab, setTab] = useState<Tab>("gainers");
  const { setActiveMarket } = useActiveMarket();

  const rows = useMemo(() => {
    const parsed = MARKETS.map((m) => ({
      market: m,
      pct: parseChangePct(m.change24h),
    }));
    if (tab === "gainers") {
      return parsed
        .filter((r) => r.pct > 0)
        .sort((a, b) => b.pct - a.pct);
    }
    return parsed.filter((r) => r.pct < 0).sort((a, b) => a.pct - b.pct);
  }, [tab]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PanelTabBar
        ariaLabel="Gainers and losers"
        actions={
          <span className="text-micro tabular-nums text-muted-foreground">
            24h
          </span>
        }
      >
        <PanelTab
          active={tab === "gainers"}
          onClick={() => setTab("gainers")}
          label="Gainers"
        />
        <PanelTab
          active={tab === "losers"}
          onClick={() => setTab("losers")}
          label="Losers"
        />
      </PanelTabBar>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-body text-muted-foreground">
            No {tab} right now.
          </div>
        ) : (
          rows.map(({ market, pct }) => (
            <MoverRow
              key={market.id}
              market={market}
              pct={pct}
              onSelect={() => setActiveMarket(market)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MoverRow({
  market,
  pct,
  onSelect,
}: {
  market: Market;
  pct: number;
  onSelect: () => void;
}) {
  const up = pct >= 0;
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative border-b border-white/[0.05]"
    >
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Open ${market.symbol} chart`}
        className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-surface-1"
      >
        <TokenLogo
          symbol={market.symbol}
          char={market.iconChar}
          bg={market.iconBg}
          fg={market.iconFg ?? "#fff"}
          size={26}
        />
        <div className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-body font-medium text-foreground">
            {market.symbol}
          </span>
          <span className="text-caption text-muted-foreground">
            {market.venue}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end leading-tight">
          <span className="text-body tabular-nums text-foreground">
            {market.lastPrice}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-caption tabular-nums",
              up ? "text-primary" : "text-tone-down",
            )}
          >
            {up ? (
              <ArrowUp strokeWidth={2.25} className="size-3" aria-hidden />
            ) : (
              <ArrowDown strokeWidth={2.25} className="size-3" aria-hidden />
            )}
            {pct >= 0 ? "+" : ""}
            {pct.toFixed(2)}%
          </span>
        </div>
        <AskAgentSpacer visible={hovered} />
      </button>
      <AskAgentAffordance
        payload={{ kind: "mover", market, pct }}
        ariaLabel={`Ask agent about ${market.symbol}`}
        visible={hovered}
      />
    </div>
  );
}

/** "+2.36%" / "-0.98%" → 2.36 / -0.98 */
function parseChangePct(s: string): number {
  const n = parseFloat(s.replace(/[%+]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
