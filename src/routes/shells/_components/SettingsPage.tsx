"use client";

import { useState, type ReactNode } from "react";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { WalletSettings } from "./WalletSettings";

/**
 * Large settings page — takes over the panel-grid slot when the
 * shell's view mode is "settings". Scrollable, centered max-width
 * column of ringed section cards. Profile/API tabs at the top; the
 * API tab is a stub for now (the rest of the surface lives under
 * Profile per the design reference).
 *
 * Everything below is presentation-only — fields are uncontrolled
 * placeholders, buttons no-op. Wiring lands when the account API
 * ships; the structure is set up so swapping each section's state
 * for real handlers is local.
 */

type Tab = "profile" | "wallet" | "api";

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");
  // scrollbar-gutter:stable reserves the scrollbar's width even when
  // content is short — switching from a short tab (Profile) to a
  // tall one (Wallet) used to add the scrollbar and shift the
  // centered column leftward by a pixel or two. Stable gutter
  // removes that shift entirely.
  return (
    <div
      className="scroll-thin flex h-full w-full flex-col overflow-y-auto"
      style={{ scrollbarGutter: "stable" }}
    >
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-6 py-8">
        <TabStrip tab={tab} setTab={setTab} />
        {tab === "profile" && <ProfileTab />}
        {tab === "wallet" && <WalletSettings />}
        {tab === "api" && <ApiTab />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab strip                                                          */
/* ------------------------------------------------------------------ */

function TabStrip({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div
      role="tablist"
      aria-label="Settings"
      className="flex shrink-0 items-center border-b border-white/[0.05]"
    >
      <TabButton active={tab === "profile"} onClick={() => setTab("profile")}>
        Profile
      </TabButton>
      <TabButton active={tab === "wallet"} onClick={() => setTab("wallet")}>
        Wallet
      </TabButton>
      <TabButton active={tab === "api"} onClick={() => setTab("api")}>
        API
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  // Underline-active geometry. Tabs left-align (no flex-1) so each
  // sits at its content width — the underline pins to inset-x-3
  // which exactly matches the px-3 button padding, giving an
  // underline that spans the label edge-to-edge.
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative px-3 py-3 text-body font-medium transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {active && (
        <span
          aria-hidden
          className="absolute inset-x-3 bottom-0 h-px bg-foreground"
        />
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile tab                                                        */
/* ------------------------------------------------------------------ */

function ProfileTab() {
  return (
    <div className="flex flex-col gap-4">
      <ProfileSection />
      <PhoneSection />
      <PublicCreatorNameSection />
      <PreferencesSection />
      <SocialAccountsSection />
    </div>
  );
}

function ApiTab() {
  return (
    <div className="flex flex-col gap-4">
      <ApiKeysSection />
      <UsageSection
        title="API Usage"
        description="Track your API request usage for the current billing period."
        used={34}
        total={10_000}
        unit="requests"
        resetLabel="Resets in 7d 9h"
        yAxisMax={36}
        history={[0, 0, 0, 0, 0, 36, 0, 0, 0, 0, 0, 0]}
      />
      <UsageSection
        title="AI Usage"
        description="Track your LLM token usage for the current billing period."
        used={662_561}
        total={10_000_000}
        unit="credits"
        resetLabel="Rolls over in 7d 9h"
        yAxisMax={800_000}
        history={[0, 0, 0, 0, 0, 620_000, 0, 0, 0, 0, 0, 0]}
        formatValue={(v) =>
          v >= 1_000 ? `${Math.round(v / 1_000)}K` : v.toString()
        }
      />
      <SubscriptionSection />
    </div>
  );
}

function ApiKeysSection() {
  return (
    <SectionCard>
      <div className="flex flex-col gap-1">
        <SectionHeader title="API Keys" />
        <p className="text-caption text-muted-foreground">
          Create an API key to integrate with the Wayfinder SDK. Keys
          attached to Shells are managed automatically.
        </p>
      </div>
      <div>
        <PrimaryButton>Create API Key</PrimaryButton>
      </div>
    </SectionCard>
  );
}

function UsageSection({
  title,
  description,
  used,
  total,
  unit,
  resetLabel,
  yAxisMax,
  history,
  formatValue = (v) => v.toString(),
}: {
  title: string;
  description: string;
  used: number;
  total: number;
  unit: string;
  resetLabel: string;
  yAxisMax: number;
  /** 12 entries — Jan to Dec. */
  history: number[];
  formatValue?: (v: number) => string;
}) {
  const numberFmt = new Intl.NumberFormat("en-US");
  const pct = Math.min(100, (used / total) * 100);
  return (
    <SectionCard>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <SectionHeader title={title} />
          <p className="text-caption text-muted-foreground">{description}</p>
        </div>
        <PrimaryButton compact>Top up</PrimaryButton>
      </div>

      {/* Current period — usage bar */}
      <div className="flex flex-col gap-2 rounded-md bg-surface-2 px-3 py-3 ring-1 ring-inset ring-white/[0.05]">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-title font-semibold tabular-nums text-foreground">
            {numberFmt.format(used)}
            <span className="ml-1 text-body font-normal text-muted-foreground">
              / {numberFmt.format(total)} {unit}
            </span>
          </div>
          <span className="text-caption tabular-nums text-muted-foreground">
            {resetLabel}
          </span>
        </div>
        <div
          aria-hidden
          className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
        >
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%`, minWidth: pct > 0 ? 4 : 0 }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 text-caption text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            Updated just now
            <RotateCw strokeWidth={1.75} className="size-3" aria-hidden />
          </span>
          <span className="tabular-nums">{pct.toFixed(1)}% used</span>
        </div>
      </div>

      {/* Usage history — yearly bar chart */}
      <div className="flex flex-col gap-2">
        <span className="text-body text-foreground">Usage History</span>
        <UsageHistoryChart
          values={history}
          yAxisMax={yAxisMax}
          formatValue={formatValue}
        />
      </div>
    </SectionCard>
  );
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Minimal year-view bar chart — 12 monthly bars + a 5-tick y-axis.
 *  Values that round to zero render no bar; the largest bar in the
 *  series scales to ~95% of the plot height so the tallest bar isn't
 *  pinned to the top tick. */
function UsageHistoryChart({
  values,
  yAxisMax,
  formatValue,
}: {
  values: number[];
  yAxisMax: number;
  formatValue: (v: number) => string;
}) {
  const TICKS = 5;
  const ticks = Array.from({ length: TICKS }, (_, i) =>
    Math.round((yAxisMax * (TICKS - 1 - i)) / (TICKS - 1)),
  );
  return (
    <div className="rounded-md bg-surface-2 px-3 py-3 ring-1 ring-inset ring-white/[0.05]">
      <div className="flex h-44 items-stretch gap-2">
        {/* Y-axis */}
        <div className="flex w-10 flex-col justify-between py-1 text-caption tabular-nums text-muted-foreground">
          {ticks.map((t) => (
            <span key={t} className="leading-none">
              {formatValue(t)}
            </span>
          ))}
        </div>
        {/* Bars */}
        <div className="flex flex-1 items-end gap-1.5 border-l border-white/[0.05] pl-2">
          {values.map((v, i) => {
            const h = yAxisMax > 0 ? (v / yAxisMax) * 100 : 0;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-36 w-full items-end">
                  {h > 0 ? (
                    <span
                      aria-hidden
                      className="w-full rounded-sm bg-primary"
                      style={{ height: `${Math.max(2, h * 0.95)}%` }}
                    />
                  ) : (
                    <span aria-hidden className="h-px w-full" />
                  )}
                </div>
                <span className="text-caption text-muted-foreground">
                  {MONTH_LABELS[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SubscriptionSection() {
  return (
    <SectionCard>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <SectionHeader title="Subscription" />
          <p className="text-caption text-muted-foreground">
            Manage your subscription, update payment methods, or view
            invoices.
          </p>
        </div>
        <PrimaryButton>Manage Subscription</PrimaryButton>
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Sections                                                           */
/* ------------------------------------------------------------------ */

function ProfileSection() {
  return (
    <SectionCard>
      <div className="flex items-center gap-2">
        <SectionHeader title="Profile" />
        <VerifiedPill />
        <button
          type="button"
          aria-label="Refresh profile"
          className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <RotateCw strokeWidth={1.75} className="size-4" aria-hidden />
        </button>
      </div>
      <FieldLabel>Email</FieldLabel>
      <div className="flex items-center gap-3">
        <Input defaultValue="me@eythandami.co" aria-label="Email" />
        <PrimaryButton>Update Email</PrimaryButton>
      </div>
    </SectionCard>
  );
}

function PhoneSection() {
  return (
    <SectionCard>
      <SectionHeader title="Phone" />
      <div className="flex flex-col gap-1">
        <FieldLabel>Phone number</FieldLabel>
        <p className="text-caption text-muted-foreground">
          Codes expire quickly. If a code is stale, request a fresh one.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Input placeholder="+1 415 555 2671" aria-label="Phone number" />
        <SubduedButton>Add phone</SubduedButton>
      </div>
    </SectionCard>
  );
}

function PublicCreatorNameSection() {
  return (
    <SectionCard>
      <div className="flex flex-col gap-1">
        <SectionHeader title="Public creator name" />
        <p className="text-caption text-muted-foreground">
          Choose the username shown on your public path pages and creator
          links.
        </p>
      </div>
      <FieldLabel>Username</FieldLabel>
      <div className="flex items-center gap-3">
        <Input placeholder="your-name" aria-label="Username" />
        <SubduedButton>Save username</SubduedButton>
      </div>
      <p className="text-caption text-muted-foreground">
        Pick a public name before people discover your path so your creator
        profile reads like a person, not a wallet.
      </p>
    </SectionCard>
  );
}

function PreferencesSection() {
  // Auto-saving — no Save button. Each toggle persists to local
  // state immediately (will hit the real preferences API once it
  // lands). The row's affordance IS the action.
  const [marketing, setMarketing] = useState(true);
  const [vault, setVault] = useState(true);
  return (
    <SectionCard>
      <div className="flex flex-col gap-1">
        <SectionHeader title="Preferences" />
        <p className="text-caption text-muted-foreground">
          Control what kinds of account and product emails you receive.
        </p>
      </div>
      <div className="flex flex-col">
        <ToggleRow
          checked={marketing}
          onChange={setMarketing}
          title="Marketing emails"
          description="Product updates, launches, and occasional announcements."
        />
        <ToggleRow
          checked={vault}
          onChange={setVault}
          title="Vault updates"
          description="Important vault lifecycle and account-related update emails."
        />
      </div>
    </SectionCard>
  );
}

const SOCIAL_ACCOUNTS = [
  { id: "x", name: "X / Twitter", glyph: <XGlyph /> },
  { id: "google", name: "Google", glyph: <GoogleGlyph /> },
  { id: "discord", name: "Discord", glyph: <DiscordGlyph /> },
];

function SocialAccountsSection() {
  return (
    <SectionCard>
      <div className="flex flex-col gap-1">
        <SectionHeader title="Social accounts" />
        <p className="text-caption text-muted-foreground">
          Link a social account so you can sign in from anywhere — your phone
          browser, a fresh device — and land on the same account.
        </p>
      </div>
      <div className="flex flex-col">
        {SOCIAL_ACCOUNTS.map((acct, i) => (
          <div
            key={acct.id}
            className={cn(
              "flex items-center justify-between gap-3 py-3",
              i > 0 && "border-t border-white/[0.05]",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="flex size-7 items-center justify-center"
              >
                {acct.glyph}
              </span>
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="text-body font-medium text-foreground">
                  {acct.name}
                </span>
                <span className="text-caption text-muted-foreground">
                  Not linked
                </span>
              </div>
            </div>
            <PrimaryButton compact>Link</PrimaryButton>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/*  Building blocks                                                    */
/* ------------------------------------------------------------------ */

function SectionCard({ children }: { children: ReactNode }) {
  // Same chrome as the panel grid leaves — bg-surface-1 with the
  // 6%-white inset ring — so settings sections read as part of the
  // same shell rather than a foreign UI.
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface-1 px-4 py-4 ring-1 ring-inset ring-white/[0.06]">
      {children}
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="text-body font-semibold text-foreground">{title}</h2>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="text-caption text-muted-foreground">{children}</label>
  );
}

function Input({
  defaultValue,
  placeholder,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="text"
      defaultValue={defaultValue}
      placeholder={placeholder}
      className="h-9 flex-1 rounded-md bg-surface-2 px-3 text-body text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none"
      {...props}
    />
  );
}

/** Primary action button — solid brand fill on the same rounded-md
 *  corner the rest of the app's action chips use (Add, Layouts,
 *  Deposit). Reserved for the canonical action per section. */
function PrimaryButton({
  children,
  compact = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { compact?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
        compact ? "h-8 px-3 text-body" : "h-9 px-4 text-body",
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Neutral confirmation button (Add / Save) — same surface ramp as
 *  AddPanel and LayoutsMenu chips so the page reads as the same
 *  toolset. Primary actions stay visually loudest. */
function SubduedButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-surface-3 px-4 text-body font-medium text-foreground transition-[background-color,scale] duration-150 ease-out hover:bg-surface-4 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      {...props}
    >
      {children}
    </button>
  );
}

function VerifiedPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded-[3px] bg-surface-3 px-1.5 py-0.5 text-micro font-semibold uppercase tracking-[0.08em] text-primary">
      Verified
    </span>
  );
}

/** Auto-saving toggle row — label + description on the left, an
 *  iOS-style Switch on the right. Used by the Preferences section
 *  in lieu of the checkbox+save flow. */
function ToggleRow({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.04] py-3 last:border-b-0">
      <div className="flex min-w-0 flex-1 flex-col leading-snug">
        <span className="text-body font-medium text-foreground">{title}</span>
        <span className="text-caption text-muted-foreground">
          {description}
        </span>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

/** Small toggle switch — used inline in settings rows. Tap anywhere
 *  on the track to flip. */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-150 ease-out",
        checked ? "bg-primary" : "bg-surface-3",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-4 transform rounded-full bg-background shadow transition-transform duration-150 ease-out",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Brand glyphs                                                       */
/* ------------------------------------------------------------------ */

function XGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-foreground" aria-hidden>
      <path d="M18.244 2H21.5l-7.51 8.582L23 22h-6.844l-5.353-7.013L4.62 22H1.36l8.05-9.197L1 2h6.97l4.83 6.387L18.244 2zm-2.4 18h1.832L7.276 4H5.34l10.504 16z" />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.6 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.3 2.4-5.3 0-9.7-3.3-11.3-8L6.2 33C9.6 39.4 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.6l6.2 5.2c-.4.4 6.5-4.7 6.5-14.8 0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function DiscordGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 fill-[#5865F2]" aria-hidden>
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3l-.18.33a18.78 18.78 0 0 0-1.92.343c-2.21-.328-4.39-.328-6.557 0a18.78 18.78 0 0 0-1.92-.343L5.792 3a19.79 19.79 0 0 0-3.759 1.369C-.422 8.49-.84 12.502.073 16.46c1.49 1.1 2.93 1.768 4.348 2.205l.985-1.354a13.31 13.31 0 0 1-2.09-1.012c.175-.13.347-.265.514-.405 4.026 1.86 8.387 1.86 12.36 0 .168.14.34.275.515.405-.668.397-1.367.737-2.092 1.014l.986 1.352c1.418-.437 2.858-1.105 4.347-2.205.91-4.564.231-8.532-1.626-12.091zM8.02 14.331c-1.183 0-2.157-1.085-2.157-2.41 0-1.327.953-2.412 2.157-2.412 1.205 0 2.18 1.085 2.157 2.412.002 1.325-.952 2.41-2.157 2.41zm7.96 0c-1.183 0-2.157-1.085-2.157-2.41 0-1.327.953-2.412 2.157-2.412s2.158 1.085 2.158 2.412c0 1.325-.953 2.41-2.158 2.41z" />
    </svg>
  );
}
