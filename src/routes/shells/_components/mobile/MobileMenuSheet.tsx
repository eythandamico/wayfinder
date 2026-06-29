"use client";

import {
  ArrowDownLeft,
  ChevronRight,
  Settings as SettingsIcon,
  Users,
  type LucideIcon,
} from "lucide-react";
import { BottomSheet } from "./BottomSheet";

/**
 * Mobile drawer — the equivalent of the desktop LeftRail's nav. The
 * hamburger in MobileTopBar opens this; tapping any row dismisses
 * the menu and triggers its action (which usually opens a more
 * specific sheet — Friends, Settings, Deposit).
 *
 * The desktop has these as rail buttons + view-modes; mobile gets a
 * single drawer because the chrome's too narrow for permanent
 * iconography and the user doesn't switch between them often.
 */
export function MobileMenuSheet({
  open,
  onOpenChange,
  onFriends,
  onSettings,
  onDeposit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFriends: () => void;
  onSettings: () => void;
  onDeposit: () => void;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Menu"
      heightFraction={0.55}
    >
      <div className="flex flex-col px-2 pb-2">
        <MenuRow
          icon={Users}
          label="Friends"
          description="Your social graph, leaderboard, messages"
          onClick={onFriends}
        />
        <MenuRow
          icon={ArrowDownLeft}
          label="Deposit"
          description="Fund your account — earn $5 in agent credit"
          onClick={onDeposit}
        />
        <MenuRow
          icon={SettingsIcon}
          label="Settings"
          description="Account, wallet, API"
          onClick={onSettings}
        />
      </div>
    </BottomSheet>
  );
}

/** Single drawer row — icon + title + description, trailing chevron.
 *  Generous touch target (h-14) so the menu feels native on a phone
 *  rather than a desktop dropdown shrunk down. */
function MenuRow({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-surface-2 active:bg-surface-3"
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-2 text-foreground"
      >
        <Icon strokeWidth={1.75} className="size-5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="text-body font-semibold text-foreground">
          {label}
        </span>
        <span className="text-caption text-muted-foreground">
          {description}
        </span>
      </div>
      <ChevronRight
        strokeWidth={1.75}
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
    </button>
  );
}
