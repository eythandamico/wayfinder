import Link from "next/link";
import Image from "next/image";
import { Eyebrow, Stack } from "@/components/ds";

const columns = [
  {
    title: "Ecosystem",
    links: [
      { label: "Products", href: "/products" },
      { label: "Paths", href: "/paths" },
      { label: "Staking", href: "/staking" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Twitter", href: "https://twitter.com" },
      { label: "Discord", href: "https://discord.com" },
      { label: "GitHub", href: "https://github.com" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy-policy" },
      { label: "Terms", href: "/terms" },
      { label: "Whitepaper", href: "/whitepaper" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-24 md:flex-row md:items-start md:justify-between">
        <Stack gap="md">
          <Link
            href="/"
            className="flex items-center"
            aria-label="Wayfinder home"
          >
            <Image
              src="/brand/wayfinder-logomark.svg"
              alt="Wayfinder"
              width={141}
              height={32}
              className="h-6 w-auto opacity-95"
            />
          </Link>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            High-performance infrastructure for the next generation of digital
            finance.
          </p>
        </Stack>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:gap-16">
          {columns.map((col) => (
            <Stack key={col.title} gap="sm">
              <Eyebrow>{col.title}</Eyebrow>
              <ul className="flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-sm text-foreground/80 transition-colors hover:text-primary"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Stack>
          ))}
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pb-8 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        <span>© 2026 Wayfinder</span>
        <span className="hidden md:inline">Velocity Protocol</span>
      </div>
    </footer>
  );
}
