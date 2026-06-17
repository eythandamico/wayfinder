/**
 * Dopamine animation registry + window-event trigger.
 *
 * Anything in the app can fire `triggerDopamine(id)` and the
 * <DopamineLayer/> mounted in /shells/page.tsx will render that
 * webm at a random viewport position, then self-remove on end.
 *
 * Assets live under /media/dopamine-v3/ — the path keeps the version
 * suffix as opaque versioning, not a route reference.
 */

export const DOPAMINE_ANIMATIONS = [
  // Trade lifecycle
  { id: "buy", label: "Buy", file: "/media/dopamine-v3/buy.webm" },
  { id: "sell-green", label: "Sell · Green", file: "/media/dopamine-v3/sell-green.webm" },
  { id: "sell-red", label: "Sell · Red", file: "/media/dopamine-v3/sell-red.webm" },
  { id: "order-placed", label: "Order placed", file: "/media/dopamine-v3/order-placed.webm" },
  { id: "trigger-event", label: "Trigger event hit", file: "/media/dopamine-v3/trigger-event-hit.webm" },
  // Leverage stingers
  { id: "lev-2x", label: "Leverage · 2x", file: "/media/dopamine-v3/2x.webm" },
  { id: "lev-5x", label: "Leverage · 5x", file: "/media/dopamine-v3/5x.webm" },
  { id: "lev-10x", label: "Leverage · 10x", file: "/media/dopamine-v3/10x.webm" },
  // Move milestones
  { id: "up-25", label: "Up 25%", file: "/media/dopamine-v3/up-25.webm" },
  { id: "up-50", label: "Up 50%", file: "/media/dopamine-v3/up-50.webm" },
  { id: "majors-up-5", label: "Majors up 5%", file: "/media/dopamine-v3/majors-up-5.webm" },
  { id: "majors-down-5", label: "Majors down 5%", file: "/media/dopamine-v3/majors-down-5.webm" },
  // Account + content
  { id: "new-strategy", label: "New strategy online", file: "/media/dopamine-v3/new-strategy-online.webm" },
  { id: "new-skill", label: "New skill installed", file: "/media/dopamine-v3/new-skill-installed.webm" },
  { id: "new-trade-idea", label: "New trade idea", file: "/media/dopamine-v3/new-trade-idea.webm" },
  { id: "news-alert", label: "News alert", file: "/media/dopamine-v3/news-alert.webm" },
  // Rewards / paywall
  { id: "pro-unlocked", label: "Pro unlocked", file: "/media/dopamine-v3/pro-unlocked.webm" },
  { id: "free-casino-pull", label: "Free casino pull", file: "/media/dopamine-v3/free-casino-pull.webm" },
  { id: "prompt-rewards", label: "PROMPT rewards available", file: "/media/dopamine-v3/prompt-rewards-available.webm" },
] as const;

export type DopamineId = (typeof DOPAMINE_ANIMATIONS)[number]["id"];

export type DopamineEventDetail = {
  id: string;
  file: string;
};

export const DOPAMINE_EVENT = "wf:dopamine";

export function triggerDopamine(id: DopamineId | "random") {
  if (typeof window === "undefined") return;
  const target =
    id === "random"
      ? DOPAMINE_ANIMATIONS[
          Math.floor(Math.random() * DOPAMINE_ANIMATIONS.length)
        ]
      : DOPAMINE_ANIMATIONS.find((a) => a.id === id);
  if (!target) return;
  window.dispatchEvent(
    new CustomEvent<DopamineEventDetail>(DOPAMINE_EVENT, {
      detail: { id: target.id, file: target.file },
    }),
  );
}
