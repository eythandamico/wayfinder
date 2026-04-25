"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ArrowUpRight, Home } from "lucide-react";
import { Button } from "@/components/ds";
import { cn } from "@/lib/utils";

type NavItem =
  | { type: "icon"; href: string; label: string }
  | { type: "link"; href: string; label: string; external?: boolean };

const navItems: NavItem[] = [
  { type: "icon", href: "/", label: "Home" },
  { type: "link", href: "/paths", label: "Paths" },
  { type: "link", href: "/openclaw", label: "Openclaw" },
  { type: "link", href: "/community", label: "Community", external: true },
  {
    type: "link",
    href: "https://wayfinder-1.gitbook.io/wayfinder",
    label: "Read Docs",
    external: true,
  },
];

export function SiteHeader() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const ctasRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [indicatorMounted, setIndicatorMounted] = useState(false);
  const [indicator, setIndicator] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    opacity: 0,
  });

  const activeIndex = navItems.findIndex((item) => {
    if (item.href === "/") return pathname === "/";
    return pathname === item.href || pathname?.startsWith(item.href + "/");
  });
  const targetIndex = hoveredIndex ?? (activeIndex >= 0 ? activeIndex : null);

  useLayoutEffect(() => {
    const measure = () => {
      if (targetIndex === null || !navRef.current) {
        setIndicator((i) => ({ ...i, opacity: 0 }));
        return;
      }
      const el = itemRefs.current[targetIndex];
      if (!el) return;
      const navRect = navRef.current.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      setIndicator({
        left: rect.left - navRect.left,
        top: rect.top - navRect.top,
        width: rect.width,
        height: rect.height,
        opacity: 1,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [targetIndex]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIndicatorMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useGSAP(
    () => {
      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) return;
      const tl = gsap.timeline();
      if (logoRef.current) {
        tl.from(logoRef.current, {
          opacity: 0,
          y: -8,
          duration: 0.32,
          ease: "expo.out",
        });
      }
      if (navRef.current) {
        tl.from(
          navRef.current,
          { opacity: 0, y: -10, duration: 0.38, ease: "expo.out" },
          "-=0.22",
        );
      }
      if (ctasRef.current) {
        tl.from(
          Array.from(ctasRef.current.children),
          {
            opacity: 0,
            y: -8,
            duration: 0.28,
            stagger: 0.06,
            ease: "expo.out",
          },
          "-=0.26",
        );
      }
    },
    { scope: headerRef },
  );

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-30 isolate pt-[env(safe-area-inset-top)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[calc(100%+2.5rem)]"
      >
        <div className="absolute inset-0 backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,black_0%,black_65%,transparent_100%)]" />
        <div className="absolute inset-0 backdrop-blur-[6px] [mask-image:linear-gradient(to_bottom,black_0%,black_45%,transparent_80%)]" />
        <div className="absolute inset-0 backdrop-blur-[14px] [mask-image:linear-gradient(to_bottom,black_0%,black_25%,transparent_60%)]" />
        <div className="absolute inset-0 backdrop-blur-[24px] [mask-image:linear-gradient(to_bottom,black_0%,black_10%,transparent_40%)]" />
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-b via-background/10 to-transparent transition-colors duration-300 motion-reduce:transition-none",
            scrolled ? "from-background/60" : "from-background/40",
          )}
        />
      </div>

      <div
        className={cn(
          "grid w-full grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 transition-[padding] duration-300 motion-reduce:transition-none",
          scrolled ? "py-3" : "py-5",
        )}
      >
        <Link
          ref={logoRef}
          href="/"
          className="group/mark flex items-center justify-self-start"
          aria-label="Wayfinder home"
        >
          <Image
            src="/brand/wayfinder-logomark.svg"
            alt="Wayfinder"
            width={141}
            height={32}
            className="h-7 w-auto opacity-95 transition-opacity group-hover/mark:opacity-100"
            priority
          />
        </Link>

        <nav
          ref={navRef}
          onMouseLeave={() => setHoveredIndex(null)}
          className={cn(
            "relative hidden items-center gap-1 justify-self-center rounded-full p-1.5 ring-1 ring-inset backdrop-blur-xl transition-[box-shadow,background-color] duration-300 motion-reduce:transition-none md:flex",
            scrolled
              ? "bg-card/85 ring-white/15"
              : "bg-card/70 ring-white/5",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-0 top-0 rounded-full bg-white/10",
              indicatorMounted
                ? "transition-[transform,opacity] duration-[180ms] ease-out motion-reduce:transition-none"
                : "transition-none",
            )}
            style={{
              transform: `translate3d(${indicator.left}px, ${indicator.top}px, 0)`,
              width: `${indicator.width}px`,
              height: `${indicator.height}px`,
              opacity: indicatorMounted ? indicator.opacity : 0,
            }}
          />
          {navItems.map((item, i) => {
            const isHome = item.type === "icon";
            const isExternal = item.type === "link" && item.external;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                href={item.href}
                onMouseEnter={() => setHoveredIndex(i)}
                aria-label={isHome ? item.label : undefined}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className={cn(
                  "relative z-10 flex items-center justify-center gap-1 rounded-full transition-colors",
                  isHome
                    ? "size-9 text-primary"
                    : "px-4 py-2 text-sm text-muted-foreground hover:text-foreground",
                )}
              >
                {isHome ? (
                  <HomeIcon active={!!isActive} />
                ) : (
                  <>
                    {item.label}
                    {isExternal && <ExternalIcon />}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        <div ref={ctasRef} className="flex items-center gap-2 justify-self-end">
          <Button size="sm" render={<Link href="/shells" />}>
            Launch app
          </Button>
        </div>
      </div>
    </header>
  );
}

function ExternalIcon() {
  return (
    <ArrowUpRight
      strokeWidth={1.5}
      className="size-3 opacity-70"
      aria-hidden
    />
  );
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <Home
      aria-hidden
      className="size-[18px] transition-[fill] duration-200 motion-reduce:transition-none"
      fill={active ? "currentColor" : "none"}
      strokeWidth={active ? 0 : 1.75}
    />
  );
}
