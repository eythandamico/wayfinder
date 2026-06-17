"use client";

import { useId, useState } from "react";
import { motion } from "motion/react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS, type BillingPeriod, type Plan } from "../_data/plans";
import { usePlan } from "../_state/plan-context";
import { ThinkingGlow } from "./ThinkingGlow";

/**
 * Canonical pricing surface — opened by every Pro gate in the app
 * via plan-context's openPricing(). Full-viewport takeover on the
 * page background (no backdrop, no card chrome), content centered
 * vertically. Close affordance pinned to the top-right of the
 * viewport.
 *
 * Mount once at the page root; never instantiate per call site.
 */
export function PricingModal() {
  const { pricingOpen, closePricing, setPlan, isPro } = usePlan();
  // Default to yearly — nudges users toward the discounted option
  // and is the standard pricing-page default. The toggle's enter
  // state respects this default.
  const [billing, setBilling] = useState<BillingPeriod>("yearly");

  const handleUpgrade = () => {
    setPlan("pro");
    closePricing();
  };

  // Any plan that exposes yearly pricing earns the toggle. Today
  // that's just Pro, but the modal stays generic.
  const yearlySavings = PLANS.find((p) => p.yearlySavingsLabel)
    ?.yearlySavingsLabel;

  return (
    <Dialog.Root
      open={pricingOpen}
      onOpenChange={(o) => (o ? null : closePricing())}
    >
      <Dialog.Portal>
        <Dialog.Popup className="fixed inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center overflow-y-auto bg-background transition-[opacity,transform] duration-300 ease-[var(--ease-strong)] data-[ending-style]:opacity-0 data-[ending-style]:translate-y-1 data-[starting-style]:opacity-0 data-[starting-style]:translate-y-1">
          {/* Close — pinned to top-right of the viewport. */}
          <Dialog.Close
            aria-label="Close pricing"
            className="fixed right-6 top-6 z-[1] inline-flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <X strokeWidth={1.75} className="size-5" aria-hidden />
          </Dialog.Close>

          {/* Centered content column — vertically centered via the
              parent's justify-center; horizontally centered + capped
              at a comfortable reading width. py-16 keeps a generous
              gap from the close button at small viewport heights. */}
          <div className="flex w-full max-w-[760px] flex-col gap-6 px-6 py-16">
            {/* Title kept as sr-only for assistive tech — the visible
                hero block was removed so the cards do the talking. */}
            <Dialog.Title className="sr-only">Pricing</Dialog.Title>

            {/* Billing period toggle — sliding pill matches the rest
                of the app's segmented controls. Yearly advertises
                the savings inline so the deal is visible even on
                Monthly. */}
            <BillingToggle
              value={billing}
              onChange={setBilling}
              yearlySavings={yearlySavings}
            />

            {/* Plan cards — features live INSIDE each card, no separate
                comparison table. Each card flex-column so the CTA sits
                at the bottom regardless of bullet count. */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PLANS.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  billing={billing}
                  isCurrent={(p.id === "pro") === isPro}
                  onUpgrade={handleUpgrade}
                />
              ))}
            </div>

            <p className="text-caption text-pretty text-center text-muted-foreground">
              Cancel anytime. Pro unlocks instantly — no waiting.
            </p>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function BillingToggle({
  value,
  onChange,
  yearlySavings,
}: {
  value: BillingPeriod;
  onChange: (v: BillingPeriod) => void;
  yearlySavings?: string;
}) {
  // Per-instance layoutId so the sliding pill stays scoped if a
  // second BillingToggle is ever mounted simultaneously.
  const layoutId = useId();
  const options: { id: BillingPeriod; label: string }[] = [
    { id: "monthly", label: "Monthly" },
    { id: "yearly", label: "Yearly" },
  ];
  return (
    <div className="flex justify-center">
      <div
        role="tablist"
        aria-label="Billing period"
        className="relative inline-flex items-center gap-1 rounded-md bg-surface-1 p-0.5"
      >
        {options.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(o.id)}
              className={cn(
                "relative inline-flex h-8 items-center justify-center gap-2 rounded-sm px-4 text-body transition-[color,scale] duration-150 ease-out active:scale-[0.96]",
                active
                  ? "font-semibold text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  aria-hidden
                  className="absolute inset-0 rounded-sm bg-surface-3"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 32,
                    mass: 0.6,
                  }}
                />
              )}
              <span className="relative z-[1]">{o.label}</span>
              {o.id === "yearly" && yearlySavings && (
                // Inline savings pill — solid mint to match ProTag,
                // visible regardless of active state so users see
                // the deal even while Monthly is selected.
                <span
                  className="relative z-[1] inline-flex items-center justify-center rounded-sm bg-primary px-1.5 py-px text-micro font-semibold uppercase tracking-[0.12em] text-primary-foreground"
                >
                  {yearlySavings}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  billing,
  isCurrent,
  onUpgrade,
}: {
  plan: Plan;
  billing: BillingPeriod;
  isCurrent: boolean;
  onUpgrade: () => void;
}) {
  const isProCol = plan.id === "pro";
  // Resolve the visible price from the active period. Plans
  // without yearlyPrice (Free) fall back to the flat price
  // regardless of toggle state; the inline meta block handles the
  // "USD / month · billed monthly / annually" lines.
  const showYearly = billing === "yearly" && !!plan.yearlyPrice;
  const displayPrice = showYearly ? plan.yearlyPrice! : plan.price;
  return (
    <div
      className={cn(
        "relative flex min-h-[520px] flex-col overflow-hidden rounded-lg",
        isProCol
          ? "bg-popover ring-1 ring-inset ring-white/10 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.45)]"
          : "bg-surface-1",
      )}
    >
      {/* Brand ThinkingGlow on the Pro card — rises from the top
          edge with both side rises, subdued via opacity + a damped
          brightness/saturate filter so it sits as atmosphere behind
          the gold accents rather than competing with them. Matches
          the PhoneNumberModal pattern so the agent's signature glow
          identifies Pro as "the agent at full power." Only mounts
          while the modal is open since PlanCard lives inside
          Dialog.Portal. */}
      {isProCol && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg opacity-60"
          style={{ filter: "brightness(0.85) saturate(0.9)" }}
        >
          <ThinkingGlow
            active
            edge="top"
            heightClass="h-full"
            sides="both"
          />
        </span>
      )}

      {/* Content — relative z-[1] above the glow layer so the
          accents stay readable. The glow lives in the parent's
          absolute inset so the padding doesn't push content off-
          center. */}
      <div className="relative z-[1] flex flex-1 flex-col gap-5 p-6">
        {/* Top block — plan name + tagline. Title-size name (no
            uppercase eyebrow) so the card opens with a clear
            headline; tagline sits directly beneath. */}
        <div className="flex flex-col gap-1.5">
          <span className="text-title font-semibold leading-none text-foreground">
            {plan.name}
          </span>
          <p className="text-body text-pretty text-muted-foreground">
            {plan.blurb}
          </p>
        </div>

        {/* Price + 2-line meta — display-size number left, billing
            cadence + period stacked right. items-center vertically
            centers the 2-line meta block against the digit so the
            two lines sit balanced across the price's mid-line
            rather than baseline-anchored to its descender. Extra
            top margin opens up breathing room between the tagline
            and the price so the digit reads as its own section
            rather than a third line under the blurb. */}
        <div className="mt-3 flex items-center gap-3">
          <span className="text-display font-semibold leading-none tabular-nums text-foreground">
            {displayPrice}
          </span>
          {plan.yearlyPrice && (
            <div className="flex flex-col text-caption leading-tight text-muted-foreground">
              <span>USD / month</span>
              <span>
                {showYearly
                  ? (plan.yearlyBillingNote ?? "billed annually")
                  : "billed monthly"}
              </span>
            </div>
          )}
        </div>

        {/* Feature list block — lead-in + bullets are tightly grouped
            so the "Everything in Free, plus:" sits with its list,
            not floating between sections. Pro uses mint check marks
            (the agent identity); Free uses neutral foreground so
            color carries the tier read at a glance. */}
        <div className="flex flex-1 flex-col gap-2.5">
          {isProCol && (
            <p className="text-body text-muted-foreground">
              Everything in{" "}
              {PLANS.find((p) => p.id === "free")?.name ?? "Free"}, plus:
            </p>
          )}
          <ul className="flex flex-col gap-2.5">
            {plan.features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2.5 text-body text-foreground"
              >
                <Check
                  strokeWidth={2.25}
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    isProCol ? "text-primary" : "text-muted-foreground",
                  )}
                  aria-hidden
                />
                <span className="text-pretty">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA — pinned to the bottom via the ul's flex-1 above.
            Canonical primary brand button (mint bg + dark text) so
            the upgrade CTA matches every other "go" action in the
            app. */}
        {isProCol ? (
          <button
            type="button"
            onClick={onUpgrade}
            disabled={isCurrent}
            className="mt-1 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-body font-semibold text-primary-foreground transition-[filter,scale] duration-150 ease-out hover:brightness-[1.04] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCurrent ? `You're on ${plan.name}` : `Upgrade to ${plan.name}`}
          </button>
        ) : (
          <div
            aria-hidden
            className="mt-1 inline-flex h-10 items-center justify-center rounded-md bg-surface-2 px-4 text-body text-muted-foreground"
          >
            {isCurrent ? "Current plan" : "Default"}
          </div>
        )}
      </div>
    </div>
  );
}
