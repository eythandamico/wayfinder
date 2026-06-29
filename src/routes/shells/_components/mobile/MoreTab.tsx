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
import { useDepositModal } from "../../_state/shells-context";
import { usePlan } from "../../_state/plan-context";

/**
 * More tab body — the overflow page for secondary destinations.
 * Replaces the v2 hamburger drawer entirely; tapping the More
 * bottom-tab makes this view active rather than overlaying a
 * sheet. Each row launches a modal/sheet for its destination.
 *
 * Settings (full-screen sheet), Pricing/Plan (centered modal),
 * Deposit (centered modal), Keyboard shortcuts (event dispatch).
 */
export function MoreTab({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { openDeposit } = useDepositModal();
  const { openPricing, isPro } = usePlan();
  return (
    <div className="scroll-thin flex h-full min-h-0 flex-col overflow-y-auto px-3 pt-3 pb-32">
      <div className="px-1 pb-2 text-caption uppercase tracking-[0.14em] text-muted-foreground">
        More
      </div>
      <div className="flex flex-col">
        <MoreRow
          icon={SettingsIcon}
          label="Settings"
          description="Account, wallet, API"
          onClick={onOpenSettings}
        />
        {!isPro && (
          <MoreRow
            icon={Sparkles}
            label="Upgrade to Pro"
            description="Unlock the full agent + Pro panels"
            onClick={() => openPricing("manual")}
          />
        )}
        <MoreRow
          icon={ArrowDownLeft}
          label="Deposit"
          description="Fund your account"
          onClick={openDeposit}
        />
        <MoreRow
          icon={HelpCircle}
          label="Keyboard shortcuts"
          description="Quick reference"
          onClick={() => {
            window.dispatchEvent(new CustomEvent(HELP_EVENT));
          }}
        />
      </div>
    </div>
  );
}

function MoreRow({
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
      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-surface-1 active:bg-surface-2"
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
