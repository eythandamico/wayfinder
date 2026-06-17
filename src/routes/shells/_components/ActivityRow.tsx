"use client";

import Jazzicon from "react-jazzicon";
import { cn } from "@/lib/utils";
import {
  formatRelative,
  jazziconSeedFromString,
  type DisplayItem,
} from "../_state/activity-context";

/**
 * Single activity row — shared between the bell dropdown in the top
 * nav and the standalone Activity panel. Switches between a Jazzicon
 * profile picture (signal rows, when an author id is present) and a
 * tinted icon glyph (mock platform notifications).
 */
export function ActivityRow({ item }: { item: DisplayItem }) {
  const { Icon } = item.meta;
  const isSignal = item.source === "signal";
  return (
    <button
      type="button"
      role="option"
      aria-selected={false}
      onClick={item.onSelect}
      className={cn(
        "group/notif flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors",
        item.unread ? "hover:bg-surface-1" : "hover:bg-surface-1",
      )}
    >
      {isSignal && item.authorId ? (
        <span
          aria-hidden
          className="relative mt-0.5 size-7 shrink-0 overflow-hidden rounded-full"
        >
          <Jazzicon
            diameter={28}
            seed={jazziconSeedFromString(item.authorId)}
          />
        </span>
      ) : (
        <span
          aria-hidden
          className={cn(
            "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full",
            item.meta.ringClass,
          )}
        >
          <Icon
            strokeWidth={2}
            className={cn("size-3.5", item.meta.iconClass)}
          />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-tight">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-body",
              item.unread
                ? "font-semibold text-foreground"
                : "font-medium text-muted-foreground",
            )}
          >
            {item.title}
          </span>
          {item.unread && (
            <span
              aria-hidden
              className="size-1.5 shrink-0 rounded-full bg-primary"
            />
          )}
        </span>
        <span className="text-caption text-pretty text-muted-foreground">
          {item.body}
        </span>
        <span className="text-micro uppercase tracking-[0.12em] text-muted-foreground/70">
          {formatRelative(item.at)}
        </span>
      </span>
    </button>
  );
}
