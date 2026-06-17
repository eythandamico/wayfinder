"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PLAN_KEY, DEV_FLAGS_EVENT } from "../_lib/dev-flags";
import type { PlanId } from "../_data/plans";

/**
 * Plan / Pro-gating context — the single source of truth for "is the
 * user on Free or Pro?" and for opening the canonical PricingModal.
 *
 * Mock-only: there is no real billing layer (see docs/MOCKING.md).
 * `setPlan("pro")` is the whole "upgrade" — the DevTools toggle and
 * the modal's CTA both call it.
 *
 * Gate idiom: `if (!requirePro("jobs")) return;` — if the user is
 * Pro it returns true and you proceed; if Free it opens the modal
 * with the source recorded and returns false so you bail.
 */

type PricingSource =
  | "jobs"
  | "charts"
  | "alerts"
  | "auto"
  | "model"
  | "banner"
  | "panel"
  | "manual"
  | (string & {});

type PlanContextValue = {
  plan: PlanId;
  isPro: boolean;
  /** Open the PricingModal. The optional `source` tells the modal
   *  which gate fired it — used for analytics + future per-source
   *  copy variants. No-op if already pro. */
  openPricing: (source?: PricingSource) => void;
  /** Used by the PricingModal itself to close. Consumers don't
   *  usually need this — the modal owns its own close affordance. */
  closePricing: () => void;
  /** Returns true if Pro; otherwise opens the modal and returns
   *  false. Call sites then bail when this returns false. */
  requirePro: (feature: PricingSource) => boolean;
  /** Mock "upgrade" — the DevTools toggle and the modal CTA both
   *  call this. Persists to localStorage so reload keeps state. */
  setPlan: (plan: PlanId) => void;
  /** Pricing modal open state — the page-root PricingModal reads
   *  this. Don't drive your own modal off it. */
  pricingOpen: boolean;
  pricingSource: PricingSource | null;
};

const PlanContext = createContext<PlanContextValue | null>(null);

function readPlanFromStorage(): PlanId {
  if (typeof window === "undefined") return "free";
  try {
    return window.localStorage.getItem(PLAN_KEY) === "pro" ? "pro" : "free";
  } catch {
    return "free";
  }
}

function writePlanToStorage(plan: PlanId) {
  try {
    if (plan === "pro") {
      window.localStorage.setItem(PLAN_KEY, "pro");
    } else {
      window.localStorage.removeItem(PLAN_KEY);
    }
    window.dispatchEvent(new Event(DEV_FLAGS_EVENT));
  } catch {
    /* storage unavailable — flag is session-only */
  }
}

export function PlanProvider({ children }: { children: ReactNode }) {
  // Start at "free" on both server + first client paint to avoid a
  // hydration mismatch. Real value gets read from localStorage in
  // the post-mount effect, which is fine for a client-only UX gate.
  const [plan, setPlanState] = useState<PlanId>("free");
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricingSource, setPricingSource] = useState<PricingSource | null>(
    null,
  );

  useEffect(() => {
    setPlanState(readPlanFromStorage());
    const onChange = () => setPlanState(readPlanFromStorage());
    window.addEventListener(DEV_FLAGS_EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(DEV_FLAGS_EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const setPlan = useCallback((next: PlanId) => {
    setPlanState(next);
    writePlanToStorage(next);
  }, []);

  const openPricing = useCallback(
    (source?: PricingSource) => {
      // Already pro — no-op. Prevents accidental modal pops from a
      // gate that should have short-circuited at the caller.
      if (plan === "pro") return;
      setPricingSource(source ?? null);
      setPricingOpen(true);
    },
    [plan],
  );

  const closePricing = useCallback(() => {
    setPricingOpen(false);
    // Don't clear source synchronously — the modal exit animation
    // still reads it. The next openPricing overwrites it.
  }, []);

  const requirePro = useCallback(
    (feature: PricingSource) => {
      if (plan === "pro") return true;
      openPricing(feature);
      return false;
    },
    [plan, openPricing],
  );

  const value = useMemo<PlanContextValue>(
    () => ({
      plan,
      isPro: plan === "pro",
      openPricing,
      closePricing,
      requirePro,
      setPlan,
      pricingOpen,
      pricingSource,
    }),
    [plan, openPricing, closePricing, requirePro, setPlan, pricingOpen, pricingSource],
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    throw new Error("usePlan must be used within <PlanProvider>");
  }
  return ctx;
}
