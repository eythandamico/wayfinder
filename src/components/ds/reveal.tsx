"use client";

import { useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP, ScrollTrigger);

type RevealProps = {
  children: ReactNode;
  /** Delay in seconds before the animation starts once triggered. */
  delay?: number;
  /** Y-offset in pixels to travel from. Defaults to 40. */
  y?: number;
  /**
   * ScrollTrigger start position. See the ScrollTrigger docs.
   * Defaults to "top 85%" — fires when the top of the element passes
   * the 85% line of the viewport.
   */
  start?: string;
  /**
   * Stagger direct children instead of fading the whole wrapper as
   * one block. Use when the children are distinct items (e.g., a
   * grid of cards).
   */
  stagger?: boolean;
  className?: string;
  as?: "div" | "section";
};

/**
 * Fades and slides children up when they enter the viewport. Fires
 * once, plays through, and does not reverse on scroll-up. Respects
 * prefers-reduced-motion.
 */
export function Reveal({
  children,
  delay = 0,
  y = 40,
  start = "top 85%",
  stagger = false,
  className,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const targets = stagger ? Array.from(el.children) : el;

      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduce) {
        gsap.set(targets, { opacity: 1, y: 0 });
        return;
      }

      gsap.set(targets, { opacity: 0, y });

      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.55,
        ease: "expo.out",
        delay,
        stagger: stagger ? 0.08 : 0,
        scrollTrigger: {
          trigger: el,
          start,
          toggleActions: "play none none none",
          once: true,
        },
      });
    },
    { scope: ref, dependencies: [delay, y, start, stagger] },
  );

  return (
    <Tag ref={ref} className={cn(className)}>
      {children}
    </Tag>
  );
}
