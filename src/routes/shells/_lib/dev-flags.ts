"use client";

import { useEffect, useState } from "react";
import type { OpenerProfile } from "./opener";

/**
 * Dev-only feature flags driven by localStorage + a custom event
 * bus. DevTools writes the flags; consumers subscribe via the hook
 * so toggles are live without reloads.
 */

export const FORCE_THINKING_GLOW_KEY = "wf-dev-force-thinking-glow";
export const FORCE_FIRST_RUN_PROFILE_KEY = "wf-dev-force-first-run-profile";
export const PLAN_KEY = "wf-dev-plan";
export const DEV_FLAGS_EVENT = "wf:dev-flags-changed";

export function setForceThinkingGlow(on: boolean) {
  try {
    if (on) {
      window.localStorage.setItem(FORCE_THINKING_GLOW_KEY, "1");
    } else {
      window.localStorage.removeItem(FORCE_THINKING_GLOW_KEY);
    }
    window.dispatchEvent(new Event(DEV_FLAGS_EVENT));
  } catch {
    /* storage unavailable — flag is session-only */
  }
}

export function getForceThinkingGlow(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(FORCE_THINKING_GLOW_KEY) === "1";
  } catch {
    return false;
  }
}

/** Live-updating subscriber. Use in components that read the flag.
 *
 *  Lazy-initialised from localStorage so the first render already
 *  reflects the stored value — no setState inside effect needed. */
export function useForceThinkingGlow(): boolean {
  const [on, setOn] = useState(() => getForceThinkingGlow());
  useEffect(() => {
    const handler = () => setOn(getForceThinkingGlow());
    window.addEventListener(DEV_FLAGS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(DEV_FLAGS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return on;
}

/** Force a specific first-run profile for the opener. `null` means
 *  "use real detection from POSITIONS + MOCK_ACCOUNT". Stored as a
 *  literal string so DevTools radios can read/write it. */
export function setForceFirstRunProfile(profile: OpenerProfile | null) {
  try {
    if (profile) {
      window.localStorage.setItem(FORCE_FIRST_RUN_PROFILE_KEY, profile);
    } else {
      window.localStorage.removeItem(FORCE_FIRST_RUN_PROFILE_KEY);
    }
    window.dispatchEvent(new Event(DEV_FLAGS_EVENT));
  } catch {
    /* storage unavailable — flag is session-only */
  }
}

export function getForceFirstRunProfile(): OpenerProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(FORCE_FIRST_RUN_PROFILE_KEY);
    if (v === "active" || v === "funded" || v === "fresh") return v;
    return null;
  } catch {
    return null;
  }
}

export function useForceFirstRunProfile(): OpenerProfile | null {
  const [v, setV] = useState<OpenerProfile | null>(() =>
    getForceFirstRunProfile(),
  );
  useEffect(() => {
    const handler = () => setV(getForceFirstRunProfile());
    window.addEventListener(DEV_FLAGS_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(DEV_FLAGS_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return v;
}
