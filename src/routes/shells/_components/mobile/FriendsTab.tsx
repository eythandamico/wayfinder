"use client";

import { FriendsPanel } from "../FriendsPanel";

/**
 * Friends tab body — renders FriendsPanel directly. The panel
 * owns its own Friends/Inbox/Leaderboard sub-tabs, drill-ins
 * (TraderProfile, FriendChatSheet), and AddFriendModal trigger.
 *
 * The bottom-padding below FriendsPanel's scrollable list comes
 * from the shell — the floating composer + bottom tab bar reserve
 * ~120px at the bottom so list items don't hide behind them.
 */
export function FriendsTab() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <FriendsPanel />
    </div>
  );
}
