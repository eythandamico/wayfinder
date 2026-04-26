# Mocking & integration points

Every Shells flow except the TradingView chart embed is currently mocked. This
doc lists what's stubbed, where the data lives, and where a real API would
plug in.

## Where the mocks live

- `src/app/shells/_data/mocks.ts` — all Shells fixtures (markets, sessions,
  jobs, chat messages, market metrics, timeframes, wallets, paths re-export)
- `src/lib/paths.ts` — Path catalog fixtures (the "Paths" feature on `/paths`
  and inside the Command palette)

`mocks.ts` re-exports `PATHS` and `PATHS_CATALOG_URL` from `lib/paths.ts` so
Shells components have one import surface.

## What's mocked

| Surface | Data source | Where it renders |
| --- | --- | --- |
| Markets list | `MARKETS` in `mocks.ts` | `MarketPicker`, `CommandBar`, market header |
| Active session | `activeSession` from `ShellsProvider` | `ChatPanel` history dropdown |
| Chat messages | `SAMPLE_MESSAGES` in `mocks.ts` | `ChatPanel` body |
| Sessions list | `SAMPLE_SESSIONS` in `mocks.ts` | `ChatPanel` history dropdown |
| Jobs list | `SAMPLE_JOBS` in `mocks.ts` | `ChatPanel` jobs tab, `JobCard` |
| Paths catalog | `PATHS` in `lib/paths.ts` | `/paths` page, `ChatPanel` paths tab, `CommandBar` |
| Order book | `ASKS` / `BIDS` in `mocks.ts` | `OrderBook` panel |
| Trade execution | none — form is local-state only | `TradePanel` Place button |
| Portfolio positions | `WALLETS` + hardcoded UI | `PortfolioPanel` |
| Wallet address | `WALLET_ADDRESS` in `mocks.ts` | `MarketHeader`, `MobileTopBar` |
| Usage / token meter | `MOCK_USAGE` in `mocks.ts` | `MarketHeader` UsagePill |
| Market metrics (24h vol, OI, funding, etc.) | `MARKET_METRICS` in `mocks.ts` | `ChartPanel` strip |

## What's wired to real services

- **TradingView chart** — `ChartPanel` injects the public TradingView embed
  script (no API key, public CDN). Pulls live price data from TradingView for
  the `tvSymbol` field on each market.

That's it. Everything else is mocks.

## Integration points (where a dev plugs in real data)

When real backends land, the smallest-blast-radius path is:

1. **Replace exports in `mocks.ts`** with calls to your API client. Keep the
   same exported names and shapes; consumers don't need to change.
2. **For server-side fetches**, use Next.js Server Components — convert the
   relevant panel from `"use client"` and pass data down as props. The
   client wrappers (interactions, drag-to-resize, ⌘K) can stay client.
3. **For real-time data** (order book, prices), introduce a hook like
   `useMarketStream(market.id)` that the panels read from instead of the
   static `ASKS` / `BIDS` constants.

### Specific files to touch

- **Markets** — `_components/MarketPicker.tsx`, `CommandBar.tsx` both consume
  `MARKETS`. A real catalog endpoint feeds both.
- **Order book** — `OrderBook.tsx` consumes `ASKS` / `BIDS`. Add a stream
  subscription, hold rows in state.
- **Trade execution** — `TradePanel.tsx` Place button is a no-op. Wire to
  your order-placement endpoint and surface success / error state in the
  bottom CTA area.
- **Chat** — `ChatPanel.tsx` has a `thinking` state that toggles via
  `setTimeout`. Replace `startThinking()` with a real agent call;
  `SAMPLE_MESSAGES` becomes session-derived state.
- **Sessions / Jobs** — same file, both lists come from `mocks.ts`.
- **Paths catalog** — `lib/paths.ts` `PATHS` array. Replace with API fetch in
  the page (`paths/page.tsx`) or expose a hook.

## Hardcoded URLs (env-driven)

External URLs live in `src/lib/links.ts`, sourced from `NEXT_PUBLIC_*` env
vars with fallbacks to current dev/prod targets. See `.env.example`.

These are *not* mocks but worth knowing about during integration — the
"Create Path" CTA, "View all" links, "Read Docs", etc. point at external
products that may move.

## What's not present yet

No code exists for:

- Stripe checkout (the Pro upsell banner in `ChatPanel` is text + dismiss; no
  payment flow)
- WebSocket / streaming feeds
- Authentication (no login UI; the wallet pill is decorative)
- Path install/run (UI gestures exist; backend doesn't)
- Trade execution
- Portfolio sync

When these land, update this doc and `ARCHITECTURE.md`.
