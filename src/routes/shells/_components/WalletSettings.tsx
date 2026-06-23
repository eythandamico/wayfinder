"use client";

import { useState } from "react";
import {
  ChevronRight,
  Copy,
  ExternalLink,
  LogOut,
  RotateCcw,
} from "lucide-react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/lib/format";
import { WALLETS } from "../_data/mocks";
import { useLayoutDispatch } from "../_layout/LayoutContext";
import { useDensity, type Density } from "../_state/shells-context";

type WalletInstance = (typeof WALLETS)[number];

/**
 * Wallet / trading / notifications / privacy / advanced settings —
 * lifted out of the PortfolioSheet's old internal SettingsView so
 * the SettingsPage can host them under a Wallet tab. No header
 * chrome here — SettingsPage owns the tab strip and page padding.
 * Helpers (Section, SettingsRow, Switch, SegmentedRow,
 * DensitySetting, ConnectedWalletCard) live in this file because
 * nothing else in the app uses them.
 */
export function WalletSettings() {
  // Settings only ever shows the user's connected (primary) wallet —
  // never the agent wallets. Agent wallets live in the WalletSelector
  // on the main portfolio view.
  const connectedWallet = WALLETS.find((w) => w.primary) ?? WALLETS[0];
  // Local state until real preference persistence lands.
  const [hideBalances, setHideBalances] = useState(false);
  const [confirmOrders, setConfirmOrders] = useState(true);
  const [slippage, setSlippage] = useState<"0.1" | "0.5" | "1.0">("0.5");
  const [leverage, setLeverage] = useState<"1x" | "3x" | "5x">("3x");
  const [notifyFills, setNotifyFills] = useState(true);
  const [notifyAlerts, setNotifyAlerts] = useState(true);
  const [notifyMentions, setNotifyMentions] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [hidePnL, setHidePnL] = useState(false);
  const [anonymizeHandle, setAnonymizeHandle] = useState(false);

  const layoutDispatch = useLayoutDispatch();
  const resetLayout = () => layoutDispatch?.({ type: "resetLayout" });

  const openEtherscan = () =>
    window.open(
      `https://etherscan.io/address/${connectedWallet.address}`,
      "_blank",
    );

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(connectedWallet.address);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Wallet */}
      <Section label="Wallet">
        <ConnectedWalletCard
          wallet={connectedWallet}
          onCopy={copyAddress}
          onEtherscan={openEtherscan}
        />
        <SettingsRow
          label="Add wallet"
          description="Connect another address"
          onClick={() => {}}
          trailing={<ChevronRight strokeWidth={1.75} className="size-4" />}
        />
        <SettingsRow
          label="Disconnect"
          description="Sign out of this wallet"
          tone="danger"
          onClick={() => {}}
          trailing={<LogOut strokeWidth={1.75} className="size-4" />}
        />
      </Section>

      {/* Display */}
      <Section label="Display">
        <DensitySetting />
        <SettingsRow
          label="Hide balances"
          description="Mask amounts with ••• until you tap"
          trailing={
            <Switch
              checked={hideBalances}
              onChange={setHideBalances}
              label="Hide balances"
            />
          }
        />
      </Section>

      {/* Trading */}
      <Section label="Trading">
        <SettingsRow
          label="Confirm orders"
          description="Show a confirmation before submitting"
          trailing={
            <Switch
              checked={confirmOrders}
              onChange={setConfirmOrders}
              label="Confirm orders"
            />
          }
        />
        <SegmentedRow
          label="Default slippage"
          description="Max price drift you'll accept"
          value={slippage}
          options={[
            { value: "0.1", label: "0.1%" },
            { value: "0.5", label: "0.5%" },
            { value: "1.0", label: "1.0%" },
          ]}
          onChange={setSlippage}
        />
        <SegmentedRow
          label="Default leverage"
          description="Pre-fill the leverage slider"
          value={leverage}
          options={[
            { value: "1x", label: "1×" },
            { value: "3x", label: "3×" },
            { value: "5x", label: "5×" },
          ]}
          onChange={setLeverage}
        />
      </Section>

      {/* Notifications */}
      <Section label="Notifications">
        <SettingsRow
          label="Trade fills"
          description="Ping when an order fills"
          trailing={
            <Switch
              checked={notifyFills}
              onChange={setNotifyFills}
              label="Trade fills"
            />
          }
        />
        <SettingsRow
          label="Price alerts"
          description="Ping when alerts trigger"
          trailing={
            <Switch
              checked={notifyAlerts}
              onChange={setNotifyAlerts}
              label="Price alerts"
            />
          }
        />
        <SettingsRow
          label="Companion mentions"
          description="Ping when the companion @mentions you"
          trailing={
            <Switch
              checked={notifyMentions}
              onChange={setNotifyMentions}
              label="Companion mentions"
            />
          }
        />
        <SettingsRow
          label="Sound effects"
          description="Subtle audio on trade events"
          trailing={
            <Switch
              checked={soundEffects}
              onChange={setSoundEffects}
              label="Sound effects"
            />
          }
        />
      </Section>

      {/* Privacy */}
      <Section label="Privacy">
        <SettingsRow
          label="Hide PnL"
          description="Replace dollar PnL with %"
          trailing={
            <Switch
              checked={hidePnL}
              onChange={setHidePnL}
              label="Hide PnL"
            />
          }
        />
        <SettingsRow
          label="Anonymize handle"
          description="Show as a random name in group chats"
          trailing={
            <Switch
              checked={anonymizeHandle}
              onChange={setAnonymizeHandle}
              label="Anonymize handle"
            />
          }
        />
      </Section>

      {/* Advanced */}
      <Section label="Advanced">
        <SettingsRow
          label="Reset layout"
          description="Restore the default panel arrangement"
          onClick={resetLayout}
          trailing={<RotateCcw strokeWidth={1.75} className="size-4" />}
        />
      </Section>

      <div className="pb-4 pt-2 text-center text-micro uppercase tracking-[0.2em] text-muted-foreground">
        Wayfinder · v0.1
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Section card — same chrome as the Profile/API tabs in
 *  SettingsPage (rounded-lg bg-surface-1 with the 6%-white inset
 *  ring + a text-body font-semibold header). Rows inside are
 *  divider-separated. */
function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-lg bg-surface-1 px-4 py-4 ring-1 ring-inset ring-white/[0.06]">
      <h2 className="text-body font-semibold text-foreground">{label}</h2>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

function ConnectedWalletCard({
  wallet,
  onCopy,
  onEtherscan,
}: {
  wallet: WalletInstance;
  onCopy: () => void;
  onEtherscan: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    onCopy();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="flex items-center gap-3 border-b border-white/[0.04] py-3 last:border-b-0">
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full"
      >
        <Jazzicon diameter={40} seed={jsNumberForAddress(wallet.address)} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium text-foreground">
          {wallet.name}
        </span>
        <span className="truncate text-body text-muted-foreground tabular-nums">
          {shortAddress(wallet.address)}
        </span>
      </div>
      <button
        type="button"
        aria-label={copied ? "Copied" : "Copy address"}
        onClick={handleCopy}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-2 hover:text-foreground active:scale-[0.96]"
      >
        <Copy
          strokeWidth={1.75}
          className={cn(
            "size-3.5 transition-colors",
            copied && "text-primary",
          )}
        />
      </button>
      <button
        type="button"
        aria-label="View on Etherscan"
        onClick={onEtherscan}
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[background-color,color,scale] duration-150 ease-out hover:bg-surface-2 hover:text-foreground active:scale-[0.96]"
      >
        <ExternalLink strokeWidth={1.75} className="size-3.5" />
      </button>
    </div>
  );
}

function SettingsRow({
  label,
  description,
  trailing,
  onClick,
  tone,
}: {
  label: string;
  description?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  tone?: "danger";
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cn(
        "flex w-full items-center gap-3 border-b border-white/[0.04] py-3 text-left last:border-b-0 transition-colors -mx-2 px-2 rounded-md",
        onClick && "hover:bg-surface-2",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "text-body",
            tone === "danger" ? "text-tone-down" : "text-foreground",
          )}
        >
          {label}
        </span>
        {description && (
          <span className="text-caption text-muted-foreground">
            {description}
          </span>
        )}
      </div>
      {trailing && (
        <span
          className={cn(
            "shrink-0",
            tone === "danger" ? "text-tone-down" : "text-muted-foreground",
          )}
        >
          {trailing}
        </span>
      )}
    </Tag>
  );
}

function SegmentedRow<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-white/[0.04] py-3 last:border-b-0">
      <div className="flex min-w-0 flex-col">
        <span className="text-body text-foreground">{label}</span>
        {description && (
          <span className="text-caption text-muted-foreground">
            {description}
          </span>
        )}
      </div>
      <div
        role="radiogroup"
        className="flex items-center gap-1 rounded-md bg-surface-2 p-0.5"
      >
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex h-7 flex-1 items-center justify-center rounded-sm text-body transition-[background-color,color,scale] duration-150 ease-out active:scale-[0.96]",
                active
                  ? "bg-surface-3 font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DensitySetting() {
  const { density, setDensity } = useDensity();
  const options: { value: Density; label: string }[] = [
    { value: "small", label: "Compact" },
    { value: "medium", label: "Default" },
    { value: "large", label: "Roomy" },
  ];
  return (
    <SegmentedRow
      label="Display density"
      description="How tightly UI text and rows pack together"
      value={density}
      options={options}
      onChange={setDensity}
    />
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
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
          "absolute size-4 rounded-full bg-background transition-transform duration-150 ease-out",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
