"use client";

import { useSyncExternalStore } from "react";
import { ChartPanel } from "./_components/ChartPanel";
import { ChatPanel } from "./_components/ChatPanel";
import { CommandBar } from "./_components/CommandBar";
import { MarketHeader } from "./_components/MarketHeader";
import { OrderBookPanel } from "./_components/OrderBook";
import { PortfolioPanel } from "./_components/PortfolioPanel";
import { TradePanel } from "./_components/TradePanel";
import { MobileLayout } from "./_components/mobile/MobileLayout";
import { ShellsProvider } from "./_state/shells-context";

function subscribe(cb: () => void) {
  const mql = window.matchMedia("(min-width: 768px)");
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

function getSnapshot() {
  return window.matchMedia("(min-width: 768px)").matches;
}

// SSR default: desktop. Shells skews desktop-heavy; mobile users see a brief
// desktop render during hydration, then switch. Avoids a mobile flash for the
// majority of traffic.
function getServerSnapshot() {
  return true;
}

function useIsDesktop() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function ShellsPage() {
  const isDesktop = useIsDesktop();
  return (
    <ShellsProvider>
      <h1 className="sr-only">Wayfinder Trading Terminal</h1>
      <CommandBar />
      {isDesktop ? <DesktopShell /> : <MobileLayout />}
    </ShellsProvider>
  );
}

function DesktopShell() {
  // CSS grid with `fr` units. No JS measurement, no library — works on first
  // paint every time. react-resizable-panels v4 sets unitless `flexBasis`
  // values on Panels that browsers treat as pixels; under network latency
  // the pre-measurement state ships to screen and sticks. Grid avoids the
  // whole class of bug. Trade-off: no drag-to-resize. Can be added back with
  // a different approach if needed.
  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-background p-1 text-foreground">
      <MarketHeader />
      <div className="mt-1 grid min-h-0 min-w-0 flex-1 grid-cols-[54fr_18fr_28fr] grid-rows-[minmax(0,1fr)] gap-1">
        {/* Left column: Chart / Portfolio */}
        <div className="grid h-full min-h-0 min-w-0 grid-rows-[7fr_3fr] gap-1">
          <div className="h-full min-h-0 min-w-0">
            <ChartPanel />
          </div>
          <div className="h-full min-h-0 min-w-0">
            <PortfolioPanel />
          </div>
        </div>
        {/* Middle column: Trade / Order book */}
        <div className="grid h-full min-h-0 min-w-0 grid-rows-[45fr_55fr] gap-1">
          <div className="h-full min-h-0 min-w-0">
            <TradePanel />
          </div>
          <div className="h-full min-h-0 min-w-0">
            <OrderBookPanel />
          </div>
        </div>
        {/* Right column: Chat */}
        <div className="h-full min-h-0 min-w-0">
          <ChatPanel />
        </div>
      </div>
    </main>
  );
}
