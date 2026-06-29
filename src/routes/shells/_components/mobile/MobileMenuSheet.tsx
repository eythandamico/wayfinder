"use client";

import {
  ArrowDownLeft,
  ChevronRight,
  HelpCircle,
  Settings as SettingsIcon,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { HELP_EVENT } from "../../_hooks/useShellsKeyboard";
import { usePlan } from "../../_state/plan-context";
import { BottomSheet } from "./BottomSheet";

/**
 * Mobile drawer — opens from the hamburger in MobileTopBar. The
 * drawer holds utility destinations that don't deserve persistent
 * top-bar real estate (Friends, Activity, and Portfolio already
 * live up there as quick-access icons).
 *
 *   Settings  ·  Pricing / Plan  ·  Deposit  ·  Help
 *
 * Friends moved to the top bar; Deposit kept here as an alternate
 * entry point (the top-bar Earn $5 chip is the primary path
 * pre-first-deposit, but the drawer is the canonical home for
 * deposit when the Earn $5 chip is hidden post-deposit).
 */
export function MobileMenuSheet({
  open,
  onOpenChange,
  onFriends: _onFriends,
  onSettings,
  onDeposit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Friends moved to the top bar; we keep this prop in the API for
   *  shell-side wiring symmetry but the drawer no longer surfaces
   *  it. */
  onFriends: () => void;
  onSettings: () => void;
  onDeposit: () => void;
}) {
  const { openPricing, isPro } = usePlan();
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Menu"
      heightFraction={0.55}
    >
      <div className="flex flex-col px-2 pb-2">
        <MenuRow
          icon={SettingsIcon}
          label="Settings"
          description="Account, wallet, API"
          onClick={onSettings}
        />
        {!isPro && (
          <MenuRow
            icon={Sparkles}
            label="Upgrade to Pro"
            description="Unlock the full agent + Pro panels"
            onClick={() => {
              onOpenChange(false);
              openPricing("manual");
            }}
          />
        )}
        <MenuRow
          icon={ArrowDownLeft}
          label="Deposit"
          description="Fund your account"
          onClick={onDeposit}
        />
        <MenuRow
          icon={HelpCircle}
          label="Keyboard shortcuts"
          description="Quick reference"
          onClick={() => {
            onOpenChange(false);
            window.dispatchEvent(new CustomEvent(HELP_EVENT));
          }}
        />
      </div>
    </BottomSheet>
  );
}

/** Single drawer row — icon + title + description, trailing
 *  chevron. Generous touch target (h-14) so the menu feels native
 *  on a phone rather than a desktop dropdown shrunk down. */
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
