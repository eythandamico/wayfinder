"use client";

import { useState, type ReactNode } from "react";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Compass,
  Crown,
  Repeat,
  Settings as SettingsIcon,
  type LucideIcon,
} from "lucide-react";
import { usePlan } from "../../_state/plan-context";
import { ExplorePathsPanel } from "../ExplorePathsPanel";
import { SettingsPage } from "../SettingsPage";

type MorePage = null | "paths" | "loops" | "jobs" | "settings";

/**
 * More tab — the overflow page for secondary destinations.
 *
 * Sub-pages (Paths, Loops, Settings) render as full-bleed pages
 * INSIDE the More tab rather than as bottom sheets, so the user
 * gets a true page-stack experience: tap a row → that destination
 * fills the tab body → tap the back chevron to return to the list.
 *
 * Upgrade to Pro still opens the centered PricingModal — it's a
 * dialog, not a destination page.
 */
export function MoreTab() {
  const [page, setPage] = useState<MorePage>(null);

  if (page === "settings") {
    return (
      <MoreSubPage title="Settings" onBack={() => setPage(null)}>
        <SettingsPage />
      </MoreSubPage>
    );
  }
  if (page === "paths") {
    return (
      <MoreSubPage title="Paths" onBack={() => setPage(null)}>
        <ExplorePathsPanel />
      </MoreSubPage>
    );
  }
  if (page === "loops") {
    return (
      <MoreSubPage title="Loops" onBack={() => setPage(null)}>
        <ComingSoonView title="Loops" />
      </MoreSubPage>
    );
  }
  if (page === "jobs") {
    return (
      <MoreSubPage title="Jobs" onBack={() => setPage(null)}>
        <ComingSoonView title="Jobs" />
      </MoreSubPage>
    );
  }

  return <MoreList onNavigate={setPage} />;
}

function MoreList({ onNavigate }: { onNavigate: (page: MorePage) => void }) {
  const { openPricing, isPro } = usePlan();
  return (
    <div
      className="scroll-thin flex h-full min-h-0 flex-col overflow-y-auto px-3 pt-3"
      style={{ paddingBottom: "var(--shell-footer-pad, 0)" }}
    >
      <div className="px-1 pb-2 text-caption uppercase tracking-[0.14em] text-muted-foreground">
        More
      </div>
      <div className="flex flex-col">
        <MoreRow
          icon={Compass}
          label="Paths"
          description="Curated discovery flows"
          onClick={() => onNavigate("paths")}
        />
        <MoreRow
          icon={Repeat}
          label="Loops"
          description="Automated trading routines"
          onClick={() => onNavigate("loops")}
        />
        <MoreRow
          icon={Briefcase}
          label="Jobs"
          description="Background tasks the agent runs for you"
          onClick={() => onNavigate("jobs")}
        />
        <MoreRow
          icon={SettingsIcon}
          label="Settings"
          description="Account, wallet, API"
          onClick={() => onNavigate("settings")}
        />
        {!isPro && (
          <MoreRow
            icon={Crown}
            label="Upgrade to Pro"
            description="Unlock the full agent + Pro panels"
            onClick={() => openPricing("manual")}
          />
        )}
      </div>
    </div>
  );
}

function MoreSubPage({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-1 px-2 pt-2 pb-1">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-surface-2 hover:text-foreground active:scale-[0.96]"
        >
          <ChevronLeft strokeWidth={1.75} className="size-5" aria-hidden />
        </button>
        <h2 className="text-h4 font-semibold text-foreground">{title}</h2>
      </header>
      <div
        className="min-h-0 flex-1 overflow-hidden"
        style={{ paddingBottom: "var(--shell-footer-pad, 0)" }}
      >
        {children}
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

function ComingSoonView({ title }: { title: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-caption uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </span>
        <span className="text-display font-semibold text-foreground">
          Coming soon
        </span>
      </div>
    </div>
  );
}
