# Wayfinder

Marketing site + **Shells** trading terminal. Single Next.js 16 app, React 19, Tailwind v4.

Two products under one repo:

- **Marketing** — `/`, `/paths`, `/ds` (design-system showcase). Sources: `src/app/page.tsx`, `src/app/paths/`, `src/components/sections/`. (`/openclaw` and `/community` link out from the nav but don't have routes yet.)
- **Shells terminal** — `/shells`, the agent-driven trading interface. Lives in `src/app/shells/` with its own state, mocks, and component tree. Mobile variant under `src/app/shells/_components/mobile/`.

For non-obvious systems (density tokens, the custom resize layout, GSAP scroll triggers, the tailwind-merge gotcha, mobile menu z-index), see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). For what's mocked vs wired, see [`docs/MOCKING.md`](docs/MOCKING.md). DS component conventions: [`src/components/ds/RULES.md`](src/components/ds/RULES.md).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build        # production build
```

## Environment

All env vars are `NEXT_PUBLIC_*` (inlined at build, not secrets). Every var has a fallback in `src/lib/links.ts` so the app builds without an `.env` file. Override by copying `.env.example` → `.env.local`.

Server-only secrets (when added) drop the `NEXT_PUBLIC_` prefix and must be documented in both `.env.example` and `docs/ARCHITECTURE.md`.

## Deploy

Targets static-friendly hosts (Vercel, Cloudflare Pages). For Cloudflare Pages set the **`nodejs_compat`** flag for production *and* preview.

CI (`.github/workflows/ci.yml`) runs `lint` + `typecheck` on every PR and on pushes to `main`.

## Project layout

```
src/
├── app/
│   ├── page.tsx               # Marketing home
│   ├── globals.css            # Theme tokens, density scale, iOS fixes
│   ├── layout.tsx             # Root layout, fonts
│   ├── ds/                    # DS showcase route (/ds)
│   ├── paths/                 # /paths catalog
│   └── shells/                # /shells trading terminal
│       ├── page.tsx              # Desktop/mobile router + custom resize
│       ├── _components/          # Panels (Chart, Chat, Trade, OrderBook, …)
│       │   ├── mobile/              # Mobile bottom-sheet variants
│       │   └── icons.tsx            # Lucide wrappers — use these inside Shells
│       ├── _state/               # ShellsProvider — market, command, density, viewMode
│       ├── _hooks/               # useVoiceInput
│       ├── _types/               # Shells-specific types
│       └── _data/mocks.ts        # All mock data
├── components/
│   ├── ds/                    # Design system primitives + RULES.md
│   ├── sections/              # Marketing sections (hero, features, shell-showcase, …)
│   ├── site-header.tsx        # Nav + mobile drawer menu
│   └── site-footer.tsx
└── lib/
    ├── utils.ts               # cn() — tailwind-merge with custom font-size group
    ├── links.ts               # External URLs, env-driven w/ fallbacks
    ├── format.ts              # shortAddress, formatTokens
    ├── paths.ts               # Path catalog data + types
    └── hooks/useClickOutside.ts
```

`@/` is the path alias for `src/` (`tsconfig.json`).
