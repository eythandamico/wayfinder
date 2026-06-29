"use client";

import { SettingsPage } from "../SettingsPage";
import { BottomSheet } from "./BottomSheet";

/**
 * Mobile chrome for the Settings surface. The desktop renders
 * SettingsPage as a view-mode page (it takes over the panel grid);
 * mobile gets it as a near-full-height BottomSheet so the user
 * doesn't lose context of the panel deck behind it.
 *
 * Body reuses the same SettingsPage component — Profile / Wallet /
 * API tabs with the WalletSettings card group inside the Wallet
 * tab. Open state is local to MobileLayout because Settings
 * doesn't have a global open-state hook (desktop uses
 * setViewMode("settings") instead).
 */
export function MobileSettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      heightFraction={0.95}
    >
      <div className="flex h-full flex-col">
        <SettingsPage />
      </div>
    </BottomSheet>
  );
}
