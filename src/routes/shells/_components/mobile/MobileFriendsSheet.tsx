"use client";

import { useFriendsSheet } from "../../_state/shells-context";
import { FriendsPanel } from "../FriendsPanel";
import { BottomSheet } from "./BottomSheet";

/**
 * Mobile chrome for the Friends surface. Reads the same
 * `useFriendsSheet().open` state the desktop FriendsSheet uses, so
 * any trigger anywhere in the app (mobile menu, top-bar toggle,
 * deep-link) opens the right chrome for the current breakpoint.
 *
 * The body is the desktop FriendsPanel — same Friends/Inbox/
 * Leaderboard tabs, suggested-for-you carousel, drill-ins to
 * TraderProfile + FriendChatSheet, AddFriendModal trigger. Only
 * the wrapping differs: desktop slides from the left, mobile rises
 * from the bottom as a near-full-height sheet.
 */
export function MobileFriendsSheet() {
  const { open, closeFriends } = useFriendsSheet();
  return (
    <BottomSheet
      open={open}
      onOpenChange={(o) => {
        if (!o) closeFriends();
      }}
      heightFraction={0.95}
    >
      <div className="flex h-full flex-col">
        <FriendsPanel />
      </div>
    </BottomSheet>
  );
}
