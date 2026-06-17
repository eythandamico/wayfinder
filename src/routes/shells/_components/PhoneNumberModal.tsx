"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useActivity } from "../_state/activity-context";
import { ThinkingGlow } from "./ThinkingGlow";

/**
 * "Wayfinder wants to text you signals" — opt-in modal triggered by
 * the Activity dropdown / panel's "Get live updates" CTA.
 *
 * Brand-grounded:
 *   - HeroMark reuses the AskAgentButton living-surface language
 *     (boxShadow inset edges, three-layer breath, twin shimmer) so
 *     the modal reads as the SAME agent affordance scaled up.
 *   - ThinkingGlow rises from the dialog's bottom edge — the brand's
 *     signature "agent at work" visual, gated on open state so no
 *     WebGL cost while idle.
 *
 * Mounted once at the page root; open state lives in ActivityContext.
 */
export function PhoneNumberModal() {
  const { phoneModalOpen, closePhoneModal, confirmSmsOptIn } = useActivity();
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);

  // Reset local state shortly after close so a reopening starts from
  // a clean slate but the success state stays visible during the
  // closing animation.
  useEffect(() => {
    if (phoneModalOpen) return;
    const id = window.setTimeout(() => {
       
      setPhone("");
       
      setSent(false);
    }, 240);
    return () => window.clearTimeout(id);
  }, [phoneModalOpen]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || sent) return;
    setSent(true);
    confirmSmsOptIn();
    window.setTimeout(() => closePhoneModal(), 1400);
  };

  return (
    <Dialog.Root
      open={phoneModalOpen}
      onOpenChange={(open) => {
        if (!open) closePhoneModal();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[90] bg-background/55 backdrop-blur-md transition-opacity duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed left-1/2 top-[8vh] z-[91] w-[min(94vw,440px)] -translate-x-1/2 origin-top overflow-hidden rounded-2xl bg-popover backdrop-blur-md ring-1 ring-inset ring-white/10 shadow-2xl transition-[opacity,transform,scale] duration-200 ease-[var(--ease-strong)] data-[ending-style]:-translate-y-2 data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[starting-style]:-translate-y-2 data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0">
          {/* Brand glow rising from the dialog's bottom edge. Replaces
              the generic dual-blur ornament with the agentic
              ThinkingGlow signature. Gated on phoneModalOpen so the
              WebGL rAF only runs while visible; the popup unmounts on
              close so context allocation matches lifetime. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-60"
            style={{ filter: "brightness(0.85) saturate(0.9)" }}
          >
            <ThinkingGlow
              active={phoneModalOpen}
              edge="top"
              heightClass="h-full"
              sides="both"
            />
          </span>

          <form onSubmit={onSubmit} className="relative flex flex-col">
            {/* Hero — Wayfinder mark inside a glass surface that uses
                AskAgentButton's exact glow language (inset boxShadow
                stack, three desynced breath layers, twin shimmer).
                Drops the chat-bubble badge: the Smartphone glyph in
                the input card carries the SMS cue, and removing the
                badge lets the brand surface stand alone. */}
            <div className="relative flex h-36 items-center justify-center pt-2">
              <HeroMark active={phoneModalOpen} />
            </div>

            {/* Headline + body — key word highlighted in primary so the
                offer reads at a glance. */}
            <div className="flex flex-col items-center gap-3 px-6 pt-4 text-center">
              <Dialog.Title className="text-balance text-display font-semibold leading-tight text-foreground">
                Step away.{" "}
                <span className="text-primary">Stay informed.</span>
              </Dialog.Title>
              <p className="text-pretty text-body text-muted-foreground">
                Get fills, agent signals, and liquidation warnings the
                moment they happen. Texted traders never miss a setup.
              </p>
            </div>

            {/* Phone field — single clean input. Icon + eyebrow dropped
                so the field reads as one object; the placeholder
                carries the format hint. */}
            <div className="px-6 pt-5">
              <input
                type="tel"
                inputMode="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoFocus
                disabled={sent}
                aria-label="Mobile number for SMS alerts"
                className="w-full rounded-lg bg-surface-1 px-4 py-3.5 text-center text-title font-semibold tabular-nums text-foreground outline-none ring-1 ring-inset ring-white/[0.06] transition-colors placeholder:text-muted-foreground focus:bg-surface-2 focus:ring-white/[0.10] disabled:opacity-50"
              />
            </div>

            {/* Fine print — legal copy under the field. Terms / Privacy
                Policy tinted to read as inline links. */}
            <p className="px-6 pt-3 text-caption text-pretty text-center text-muted-foreground">
              Automated texts. Msg &amp; data rates may apply. Reply STOP
              anytime. <span className="text-primary">Terms</span> &amp;{" "}
              <span className="text-primary">Privacy Policy</span>.
            </p>

            {/* Primary CTA — rounded-lg to match the brand button family
                (AskAgentButton, panel chrome controls) rather than the
                consumer-app rounded-full pill. Mint glow shadow carries
                the brand accent. */}
            <div className="px-6 pt-5">
              <button
                type="submit"
                disabled={!phone.trim() || sent}
                className={cn(
                  "group relative inline-flex h-12 w-full items-center justify-center overflow-hidden rounded-lg text-body font-semibold transition-[filter,scale,box-shadow] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
                  sent
                    ? "bg-primary/25 text-primary"
                    : "bg-primary text-primary-foreground shadow-[0_0_24px_-4px_color-mix(in_oklch,var(--primary)_60%,transparent),0_0_36px_-8px_color-mix(in_oklch,var(--primary)_45%,transparent)] hover:brightness-[1.05] active:scale-[0.97]",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {sent ? "Code sent ✓" : "Get notified"}
              </button>
            </div>

            {/* Out — quiet text close so the user doesn't feel
                cornered. */}
            <div className="px-6 pb-5 pt-3 text-center">
              <Dialog.Close className="rounded-md px-3 py-1.5 text-body text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                Maybe later
              </Dialog.Close>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Scaled-up AskAgentButton — same boxShadow inset edges (dark ring +
 * white rim + mint edges + blue inset top), same three-layer breathing
 * surface glow, same twin shimmer. Drop-shadow under the card grounds
 * it on the dialog. Animations gated on `active` so the costs land
 * with the modal lifecycle.
 */
function HeroMark({ active }: { active: boolean }) {
  return (
    <span
      style={{
        boxShadow:
          // Outer dark ring for definition against the popover.
          "0 0 0 1px rgba(0,0,0,0.35), " +
          // White inset rim for the glass-edge read.
          "inset 0 0 0 1px rgba(255,255,255,0.18), " +
          // Mint insets — bottom + left + right edges. Scaled up
          // from the button (offsets 4px → 10px, blur 8px → 22px)
          // so the color band still hugs the perimeter at this
          // larger size.
          "inset 0 -10px 22px -8px color-mix(in oklch, var(--primary) 55%, transparent), " +
          "inset 10px 0 22px -10px color-mix(in oklch, var(--primary) 36%, transparent), " +
          "inset -10px 0 22px -10px color-mix(in oklch, var(--primary) 36%, transparent), " +
          // Blue inset from top — matches the mint footprint.
          "inset 0 10px 22px -8px color-mix(in oklch, var(--signal) 52%, transparent), " +
          // Outer drop-shadow grounds the card on the dialog.
          "0 16px 36px -10px color-mix(in oklch, var(--primary) 30%, transparent), " +
          "0 8px 20px -6px rgba(0,0,0,0.45)",
      }}
      className="relative inline-flex size-24 items-center justify-center overflow-hidden rounded-2xl bg-popover backdrop-blur-md"
    >
      {active && (
        <>
          {/* Mint pool from below + bottom corner accents — the
              shader's "sides green" pose. */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
            style={{
              background:
                "radial-gradient(ellipse 130% 70% at 50% 110%, color-mix(in oklch, var(--primary) 55%, transparent) 0%, color-mix(in oklch, var(--primary) 20%, transparent) 35%, transparent 70%), " +
                "radial-gradient(ellipse 50% 90% at 0% 100%, color-mix(in oklch, var(--primary) 35%, transparent) 0%, transparent 65%), " +
                "radial-gradient(ellipse 50% 90% at 100% 100%, color-mix(in oklch, var(--primary) 35%, transparent) 0%, transparent 65%)",
            }}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: [0.8, 1, 0.8] }}
            transition={{
              duration: 3.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
          />
          {/* White sparkle peak in the upper-mid — the shader's
              "pool highlights" where noise crests hit white. */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
            style={{
              background:
                "radial-gradient(ellipse 50% 35% at 50% 30%, rgba(255,255,255,0.4) 0%, transparent 80%)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0] }}
            transition={{
              duration: 3.0,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.1,
            }}
          />
          {/* Twin shimmer — two back-to-back sweeps with a long
              pause. Same rhythm as AskAgentButton so the modal
              breathes in time with the in-app affordance. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
          >
            <motion.span
              className="absolute -inset-y-2"
              style={{
                width: "60%",
                background:
                  "linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
                transform: "skewX(-14deg)",
              }}
              initial={{ x: "-180%", opacity: 0 }}
              animate={{
                x: ["-180%", "200%", "-180%", "200%"],
                opacity: [0, 0.4, 0, 0, 0.4, 0],
              }}
              transition={{
                duration: 4.5,
                ease: [0.4, 0, 0.2, 1],
                x: { times: [0, 0.2, 0.2, 0.4], duration: 4.5 },
                opacity: {
                  times: [0, 0.1, 0.2, 0.2, 0.3, 0.4],
                  duration: 4.5,
                },
                repeat: Infinity,
                repeatType: "loop",
              }}
            />
          </span>
        </>
      )}
      {/* Inner top highlight — 1px glass-edge line. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-white/40 to-transparent"
      />
      <img
        src="/brand/wayfinder-icon-white.png"
        alt=""
        width={56}
        height={56}
        // White backlight matches the shader's pool-highlight peak;
        // dark drop underneath keeps the mark legible against the
        // blue/white field.
        style={{
          filter:
            "drop-shadow(0 0 8px rgba(255,255,255,0.5)) " +
            "drop-shadow(0 2px 4px rgba(0,0,0,0.55))",
        }}
        className="relative size-12 select-none"
        aria-hidden
      />
    </span>
  );
}
