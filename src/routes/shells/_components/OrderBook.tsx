"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { orderBookFor, type OrderRow as OrderRowData } from "../_data/mocks";
import { useActiveMarket } from "../_state/shells-context";
import { useLiveMarketTicker } from "../_hooks/useLiveMarketTicker";

export function OrderBookPanel() {
  const [tab, setTab] = useState<"book" | "trades">("book");
  const { activeMarket } = useActiveMarket();

  // Track the chart's live price so the book doesn't drift ~10K off
  // the chart. Quantize the live price to a coarse bucket so the book
  // only re-seeds when the market moves materially — otherwise the
  // 5s ticker poll would visibly reshuffle every level.
  const live = useLiveMarketTicker(activeMarket);
  const seedPrice = live?.lastPrice
    ? quantizePrice(live.lastPrice)
    : activeMarket.lastPrice;

  const book = useMemo(
    () => orderBookFor({ ...activeMarket, lastPrice: seedPrice }),
    [activeMarket, seedPrice],
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div role="tablist" aria-label="Order book view" className="flex border-b border-white/[0.05]">
        <PanelTab
          active={tab === "book"}
          onClick={() => setTab("book")}
          controls="orderbook-panel-book"
        >
          Order Book
        </PanelTab>
        <PanelTab
          active={tab === "trades"}
          onClick={() => setTab("trades")}
          controls="orderbook-panel-trades"
        >
          Trades
        </PanelTab>
      </div>

      {tab === "book" ? (
        <div id="orderbook-panel-book" role="tabpanel" className="flex min-h-0 flex-1 flex-col px-3 py-3">
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-2 py-1.5 text-caption text-muted-foreground">
            <span>Price</span>
            <span className="text-right">Size</span>
            <span className="text-right">Total ($)</span>
          </div>
          <div className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="flex flex-col">
              {book.asks.map((a) => (
                <OrderRow key={`a-${a.price}`} {...a} tone="ask" />
              ))}
            </div>
            {/* Mid-price strip — emphasized so it doesn't read as
                "just another order row". Tabular-nums + larger Price
                + flanking dividers. */}
            <div
              className="grid grid-cols-[1fr_1fr_1fr] gap-2 border-y border-white/[0.05] bg-surface-1 px-2 py-2 text-body tabular-nums"
              aria-live="polite"
            >
              <span className="font-semibold text-foreground">{book.mid}</span>
              <span aria-hidden />
              <span className="text-right text-muted-foreground">
                {book.spreadBps}
              </span>
            </div>
            <div className="flex flex-col">
              {book.bids.map((b) => (
                <OrderRow key={`b-${b.price}`} {...b} tone="bid" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div id="orderbook-panel-trades" role="tabpanel" className="flex h-full items-center justify-center p-3 text-body text-muted-foreground">
          No recent trades
        </div>
      )}
    </div>
  );
}

// Coarse buckets keyed to price magnitude — BTC steps in $250 chunks,
// SOL in ~$5, sub-dollar tokens in fractional ticks. Preserves the
// formatted thousands-grouping the live ticker emits.
function quantizePrice(priceStr: string): string {
  const compact = priceStr.replace(/,/g, "");
  const n = parseFloat(compact);
  if (!Number.isFinite(n)) return priceStr;
  const step = n >= 10_000 ? 250 : n >= 1_000 ? 25 : n >= 100 ? 1 : n >= 1 ? 0.05 : 0.001;
  const bucketed = Math.round(n / step) * step;
  const decimals = compact.includes(".") ? compact.split(".")[1].length : 0;
  return bucketed.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function PanelTab({
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
        "relative flex-1 py-3 text-center text-body font-medium transition-[color,scale] duration-150 ease-out active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
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

function OrderRow({
  price,
  size,
  total,
  depth,
  tone,
}: OrderRowData & {
  tone: "ask" | "bid";
}) {
  return (
    <div className="relative grid grid-cols-[1fr_1fr_1fr] gap-2 px-2 py-[3px] text-body tabular-nums">
      {/* Depth bar — paints behind the row from the price edge,
          scaled to the cumulative size at this level. Standard
          orderbook convention. */}
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-0 right-0 -mx-2 pointer-events-none",
          tone === "ask" ? "bg-tone-down/10" : "bg-primary/10",
        )}
        style={{ width: `${Math.round(depth * 100)}%` }}
      />
      <span
        className={cn(
          "relative",
          tone === "ask" ? "text-tone-down" : "text-primary",
        )}
        aria-label={`${tone === "ask" ? "Ask" : "Bid"} price ${price}`}
      >
        {price}
      </span>
      <span className="relative text-right text-foreground">{size}</span>
      <span className="relative text-right text-muted-foreground">{total}</span>
    </div>
  );
}
