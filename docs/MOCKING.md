# Mocking & integration points

Every Shells flow except the TradingView chart embed is currently mocked. This doc lists what's stubbed, where the data lives, and where a real API plugs in.

## Where the mocks live

- `src/app/shells/_data/mocks.ts` — all Shells fixtures (markets, venues, sessions, jobs, chat messages, market metrics, timeframes, wallets, usage, models).
- `src/lib/paths.ts` — Path catalog fixtures (the "Paths" feature on `/paths` and inside the Command palette).

`mocks.ts` re-exports `PATHS` and `PATHS_CATALOG_URL` from `lib/paths.ts` so Shells components have one import surface.

## What's mocked

| Surface | Data source | Where it renders |
| --- | --- | --- |
| Markets list | `MARKETS` in `mocks.ts` | `CommandBar`, `ChartPanel` market header |
| Venue filters | `VENUES` in `mocks.ts` | `CommandBar` filter chips |
| Active session | `activeSession` from `ShellsProvider` | `ChatPanel` history dropdown |
| Chat messages | `SAMPLE_MESSAGES` in `mocks.ts` | `ChatPanel` body |
| Sessions list | `SAMPLE_SESSIONS` in `mocks.ts` | `ChatPanel` history dropdown |
| Jobs list | `SAMPLE_JOBS` in `mocks.ts` | `ChatPanel` jobs tab, `JobCard` |
| Models list | `MODELS` in `mocks.ts` | `ChatPanel` model picker |
| Paths catalog | `PATHS` in `lib/paths.ts` | `/paths` page, `ChatPanel` paths tab, `CommandBar` |
| Order book | `ASKS` / `BIDS` in `mocks.ts` | `OrderBook` panel |
| Trade execution | none — form is local-state only | `TradePanel` Place button |
| Portfolio positions | `WALLETS` + hardcoded UI | `PortfolioPanel` |
| Wallet address | `WALLET_ADDRESS` in `mocks.ts` | `MarketHeader`, `MobileTopBar` |
| Usage / token meter | `MOCK_USAGE` in `mocks.ts` | `MarketHeader` UsagePill |
| Market metrics (24h vol, OI, funding, etc.) | `MARKET_METRICS` in `mocks.ts` | `ChartPanel` strip |

## What's wired to real services

- **TradingView chart** — `ChartPanel` injects the public TradingView embed script (no API key, public CDN). Pulls live price data for each market's `tvSymbol`.

That's it. Everything else is mocks.

## Integration points

When real backends land, the smallest-blast-radius path:

1. **Replace exports in `mocks.ts`** with calls to your API client. Keep the same export names and shapes; consumers don't change.
2. **For server-side fetches**, convert the relevant panel to a Server Component (drop `"use client"`) and pass data in as props. Interactive shells (drag-to-resize, ⌘K, command palette) stay client.
3. **For real-time data** (order book, prices), introduce a hook like `useMarketStream(market.id)` and have the panels read from it instead of the static `ASKS` / `BIDS` constants.

### Specific files to touch

- **Markets** — `CommandBar.tsx` consumes `MARKETS` and `VENUES`. A real catalog endpoint feeds both. `ChartPanel.tsx` reads the active market via `useActiveMarket()`.
- **Order book** — `OrderBook.tsx` consumes `ASKS` / `BIDS`. Add a stream subscription, hold rows in state.
- **Trade execution** — `TradePanel.tsx` Place button is a no-op. Wire to your order endpoint and surface success / error in the bottom CTA area.
- **Chat** — `ChatPanel.tsx` has a `thinking` state that toggles via `setTimeout`. Replace `startThinking()` with a real agent call; `SAMPLE_MESSAGES` becomes session-derived state.
- **Sessions / Jobs** — same file, both lists come from `mocks.ts`.
- **Paths catalog** — `lib/paths.ts` `PATHS` array. Replace with an API fetch in `paths/page.tsx` (or a hook) and the in-app `ExplorePathsPanel`.

## Hardcoded URLs (env-driven)

External URLs live in `src/lib/links.ts`, sourced from `NEXT_PUBLIC_*` env vars with fallbacks to current dev/prod targets. See `.env.example`.

These are *not* mocks but worth knowing during integration — the "Create Path" CTA, "View all" links, "Read Docs", the SDK repo, etc. point at external products that may move.

## What's not present yet

No code exists for:

- Stripe checkout (Pro upsell banner is text + dismiss; no payment flow)
- WebSocket / streaming feeds
- Authentication (no login UI; the wallet pill is decorative — Jazzicon seeded from the mocked address)
- Path install / run (UI gestures exist; backend doesn't)
- Trade execution
- Portfolio sync

When these land, update this doc and `ARCHITECTURE.md`.
