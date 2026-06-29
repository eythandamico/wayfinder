"use client";

import { TradePanel } from "../TradePanel";

/**
 * Trade tab body — for v1, render the desktop TradePanel inside a
 * single-column scrollable container. TradePanel.tsx is already a
 * vertically-stacked form on narrow viewports (long/short toggle,
 * size input, leverage slider, confirm CTA), so a 390px column is
 * roughly the right shape.
 *
 * v2 will swap this for a phone-native ticket that drops the
 * multi-venue switcher + advanced order types into a "More" sheet
 * and surfaces the most common path (market long/short with
 * suggested size) as the default. For now we ship desktop parity.
 */
export function TradeTab() {
  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col overflow-y-auto">
      <TradePanel />
    </div>
  );
}
