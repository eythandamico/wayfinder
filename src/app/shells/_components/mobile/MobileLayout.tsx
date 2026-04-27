"use client";

import { useState } from "react";
import { ChartPanel } from "../ChartPanel";
import { ChatPanel } from "../ChatPanel";
import { ExplorePathsPanel } from "../ExplorePathsPanel";
import { OrderBookPanel } from "../OrderBook";
import { PortfolioPanel } from "../PortfolioPanel";
import { TradePanel } from "../TradePanel";
import { useViewMode } from "../../_state/shells-context";
import { BottomBar } from "./BottomBar";
import { BottomSheet } from "./BottomSheet";
import { MobileTopBar } from "./MobileTopBar";

type Sheet = "chat" | "trade" | "portfolio" | "orderbook" | null;

export function MobileLayout() {
  const { viewMode } = useViewMode();
  const [sheet, setSheet] = useState<Sheet>(null);
  const close = () => setSheet(null);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <MobileTopBar />

      {viewMode === "trading" ? (
        <>
          <div className="min-h-0 flex-1 overflow-hidden p-1">
            <ChartPanel tfPosition="below" />
          </div>

          <BottomBar
            onOpenSheet={(s) => setSheet(s)}
            onOpenChat={() => setSheet("chat")}
          />

          <BottomSheet
            open={sheet === "chat"}
            onOpenChange={(o) => !o && close()}
            heightFraction={1}
          >
            <div className="h-full">
              <ChatPanel />
            </div>
          </BottomSheet>

          <BottomSheet
            open={sheet === "trade"}
            onOpenChange={(o) => !o && close()}
            title="Trade"
            heightFraction={0.9}
          >
            <div className="h-full">
              <TradePanel />
            </div>
          </BottomSheet>

          <BottomSheet
            open={sheet === "portfolio"}
            onOpenChange={(o) => !o && close()}
            title="Portfolio"
            heightFraction={0.9}
          >
            <div className="h-full">
              <PortfolioPanel />
            </div>
          </BottomSheet>

          <BottomSheet
            open={sheet === "orderbook"}
            onOpenChange={(o) => !o && close()}
            title="Order book"
            heightFraction={0.9}
          >
            <div className="h-full">
              <OrderBookPanel />
            </div>
          </BottomSheet>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden p-1">
          <ExplorePathsPanel />
        </div>
      )}
    </div>
  );
}
