"use client";

import { Check } from "lucide-react";
import { useActivity } from "../_state/activity-context";
import { ActivityFooterCta } from "./ActivityFooterCta";
import { ActivityRow } from "./ActivityRow";

/**
 * Activity panel — the standalone version of the bell dropdown. Same
 * merged feed (mock platform notifications + live signals), same row
 * markup, same "Mark all read" + "Get live updates" actions — just
 * stretched to fill a panel slot so it can live in the layout grid.
 *
 * State (read tracking, mark-all-read, phone modal) lives in
 * ActivityProvider so both surfaces stay perfectly in sync.
 */
export function ActivityPanel() {
  const { items, unreadCount, markAllRead } = useActivity();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header — title + unread badge + Mark all read */}
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.05] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-body font-semibold text-foreground">
            Activity
          </span>
          {unreadCount > 0 && (
            <span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-micro font-semibold tabular-nums text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-caption text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check strokeWidth={2} className="size-3" aria-hidden />
          Mark all read
        </button>
      </div>

      {/* Feed */}
      <div
        role="listbox"
        aria-label="Activity"
        className="scroll-thin flex min-h-0 flex-1 flex-col overflow-y-auto py-1"
      >
        {items.length === 0 ? (
          <div className="px-6 py-8 text-center text-body text-muted-foreground">
            You&rsquo;re all caught up.
          </div>
        ) : (
          items.map((it) => <ActivityRow key={it.id} item={it} />)
        )}
      </div>

      {/* Footer — SMS opt-in CTA. Same component the activity
          dropdown uses, so the offer reads identically across both
          surfaces. Suppressed once opted in. */}
      <ActivityFooterCta />
    </div>
  );
}
