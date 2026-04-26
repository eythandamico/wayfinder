# Wayfinder

Marketing site + Shells trading terminal, built with Next.js 16 (App Router),
React 19, and Tailwind CSS v4.

The repo holds **two products** under one Next.js app:

- **Marketing site** — `/`, `/paths`, plus the design-system showcase at
  `/ds`. Sourced from `src/app/page.tsx`, `src/app/paths/`, and the section
  components in `src/components/sections/`. (`/openclaw` and `/community`
  are linked from the nav but not yet implemented as routes.)
- **Shells terminal** — `/shells`, the agent-driven trading interface. Lives
  in `src/app/shells/` with its own state, mocks, and component tree. Mobile
  variant under `src/app/shells/_components/mobile/`.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the non-obvious bits a
new dev needs to know (density tokens, custom resizable panel system, GSAP
scroll-linked animation, the tailwind-merge custom font-size group, iOS
text-size-adjust fix). See [`docs/MOCKING.md`](docs/MOCKING.md) for what's
mocked vs real.

## Local development

```bash
npm install
npm run dev          # Next dev server on http://localhost:3000
```

Useful scripts:

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build        # production build
```

## Environment

All env vars are `NEXT_PUBLIC_*` prefixed (inlined at build time, not secrets).
Every var has a fallback in `src/lib/links.ts` so the app builds and runs
without an `.env` file. To override, copy `.env.example` to `.env.local`.

If you add server-only secrets (Stripe, DB, etc.), drop the `NEXT_PUBLIC_`
prefix and document them in both `.env.example` and `docs/ARCHITECTURE.md`.

## Deploy

Project targets static-friendly hosts (Vercel, Cloudflare Pages). For
Cloudflare Pages, set the **`nodejs_compat`** compatibility flag for both
production and preview.

CI lives at `.github/workflows/ci.yml` — it runs `lint` and `typecheck` on
every PR and on pushes to `main`.

## Project layout

```
src/
├── app/
│   ├── page.tsx            # Marketing home
│   ├── globals.css         # Theme tokens, density scale, iOS fixes
│   ├── layout.tsx          # Root layout, fonts
│   ├── ds/                 # Design system showcase route
│   ├── paths/              # /paths catalog page
│   └── shells/             # /shells trading terminal
│       ├── page.tsx              # Desktop/mobile router + custom resize
│       ├── _components/          # Terminal panels (Chart, Chat, Trade, ...)
│       │   ├── mobile/           # Mobile bottom-sheet variants
│       │   └── icons.tsx         # Lucide wrappers (use these, not raw lucide)
│       ├── _state/               # ShellsProvider — activeMarket, command, density
│       ├── _hooks/               # useVoiceInput
│       ├── _types/               # Shells-specific types
│       └── _data/mocks.ts        # All mock data
├── components/
│   ├── ds/                 # Design system primitives + RULES.md
│   ├── sections/           # Marketing sections (hero, features, sdk, ...)
│   ├── site-header.tsx
│   └── site-footer.tsx
└── lib/
    ├── utils.ts            # cn() — tailwind-merge configured for our custom utilities
    ├── links.ts            # External URLs, env-driven with fallbacks
    ├── format.ts           # shortAddress(), formatTokens()
    ├── paths.ts            # Path catalog data + types
    └── hooks/
        └── useClickOutside.ts
```

`@/` is the path alias for `src/` (configured in `tsconfig.json`).
