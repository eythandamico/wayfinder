"use client";

import { useSyncExternalStore } from "react";

/** Mobile breakpoint — anything below tailwind's `md` (768px) is
 *  treated as mobile. Matches the boundary `page.tsx` uses to swap
 *  DesktopShell ↔ MobileLayout. */
const MOBILE_QUERY = "(max-width: 767px)";

function subscribe(cb: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", cb);
  return () => mql.removeEventListener("change", cb);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

/** Returns true when the viewport is narrower than the `md` breakpoint.
 *  Dialogs and panels can flip presentation (centered modal ↔ bottom
 *  sheet, multi-column ↔ stacked) based on this. */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
