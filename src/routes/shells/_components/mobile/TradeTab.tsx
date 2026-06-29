"use client";

import { TradePanel } from "../TradePanel";

/**
 * Trade tab body — just the TradePanel.
 *
 * Earlier v3 iterations also embedded a ChartYoke above the
 * TradePanel so the user could see price while building a trade.
 * The Home tab now exposes ChartPanel directly via the panel
 * dropdown, so duplicating the chart here was redundant — Trade
 * tab is purely the order ticket.
 */
export function TradeTab() {
  return (
    <div
      className="scroll-thin flex h-full min-h-0 flex-col overflow-y-auto"
      style={{ paddingBottom: "var(--shell-footer-pad, 0)" }}
    >
      <TradePanel />
    </div>
  );
}
