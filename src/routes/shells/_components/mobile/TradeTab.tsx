"use client";

import { TradePanel } from "../TradePanel";
import { ChartYoke } from "./ChartYoke";

/**
 * Trade tab body — chart yoke at top, TradePanel below.
 *
 * v3 moves the ChartYoke from shell-level (where v2 had it
 * persisting across Agent↔Trade switches) into the Trade tab
 * itself, since Friends and Portfolio don't need a chart and
 * "chart context persists across tabs" stopped being a real
 * requirement once the agent moved to a floating composer instead
 * of a peer tab.
 *
 * The user can collapse the yoke to {0, 120, 360}px via its drag
 * handle, so a heavy TradePanel session can fully hide the chart
 * if they want vertical room.
 */
export function TradeTab() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <ChartYoke />
      <div className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto">
        <TradePanel />
      </div>
    </div>
  );
}
