"use client";

import { useState } from "react";
import { WALLETS } from "../../_data/mocks";
import { PortfolioMainView } from "../PortfolioSheet";

/**
 * Portfolio tab body — renders the desktop PortfolioMainView
 * directly. Same wallet selector + balance hero + Tokens/Perps/
 * Polymarket/Activity/Allocation tabs as the desktop sheet.
 *
 * On mobile this is a TAB rather than a sheet (v2 used a sheet
 * triggered by the top-bar avatar; v3 promotes it to a real bottom-
 * nav destination).
 */
export function PortfolioTab() {
  const [activeWallet, setActiveWallet] = useState(WALLETS[0]);
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PortfolioMainView
        activeWallet={activeWallet}
        setActiveWallet={setActiveWallet}
      />
    </div>
  );
}
