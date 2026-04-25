"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ASKS, BIDS } from "../_data/mocks";

export function OrderBookPanel() {
  const [tab, setTab] = useState<"book" | "trades">("book");

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg bg-muted">
      <div role="tablist" aria-label="Order book view" className="flex border-b border-white/5">
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
        <div id="orderbook-panel-book" role="tabpanel" className="flex min-h-0 flex-1 flex-col px-3 py-2">
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-2 py-1.5 text-meta uppercase tracking-wider text-muted-foreground">
            <span>Price</span>
            <span className="text-right">Size</span>
            <span className="text-right">Total ($)</span>
          </div>
          <div className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="flex flex-col">
              {ASKS.map((a) => (
                <OrderRow key={a.price} {...a} tone="ask" />
              ))}
            </div>
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 border-y border-white/5 bg-white/[0.02] px-2 py-1.5 text-meta tabular-nums">
              <span className="font-semibold">75766.5</span>
              <span />
              <span className="text-right text-muted-foreground">0.13 BPS</span>
            </div>
            <div className="flex flex-col">
              {BIDS.map((b) => (
                <OrderRow key={b.price} {...b} tone="bid" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div id="orderbook-panel-trades" role="tabpanel" className="flex h-full items-center justify-center p-6 text-body text-muted-foreground">
          No recent trades
        </div>
      )}
    </div>
  );
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
        "relative flex-1 py-2.5 text-center text-body font-medium transition-[color,scale] duration-150 ease-out active:scale-[0.96]",
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
  tone,
}: {
  price: string;
  size: string;
  total: string;
  tone: "ask" | "bid";
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-2 py-[3px] text-meta tabular-nums">
      <span
        className={tone === "ask" ? "text-[#f07575]" : "text-primary"}
        aria-label={`${tone === "ask" ? "Ask" : "Bid"} price ${price}`}
      >
        {price}
      </span>
      <span className="text-right text-foreground/90">{size}</span>
      <span className="text-right text-muted-foreground">{total}</span>
    </div>
  );
}
