"use client";

import { useActivity } from "../_state/activity-context";
import { SubduedButton } from "./SubduedButton";

/**
 * SMS opt-in footer that sits at the bottom of the Activity dropdown
 * and the Activity panel. Quiet SubduedButton matching the
 * "Create a new job" footer in the Jobs panel — same surface, same
 * type, same hover treatment. Tapping it opens the PhoneNumberModal.
 *
 * Suppressed once the user has opted in (`smsOptedIn`), so users who
 * already subscribed don't see a stale CTA.
 */
export function ActivityFooterCta({ onPick }: { onPick?: () => void }) {
  const { smsOptedIn, openPhoneModal } = useActivity();
  if (smsOptedIn) return null;
  return (
    <div className="shrink-0 border-t border-white/[0.05] p-2">
      <SubduedButton
        onClick={() => {
          openPhoneModal();
          onPick?.();
        }}
        className="w-full px-3 py-2"
      >
        Get notified
      </SubduedButton>
    </div>
  );
}
