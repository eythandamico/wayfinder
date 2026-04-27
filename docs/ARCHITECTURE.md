# Architecture

The Wayfinder repo is a single Next.js 16 (App Router) app serving two products: a marketing site and the **Shells** trading terminal at `/shells`. This doc covers the non-obvious systems — patterns easy to break or "fix" if you don't know why they're there.

For mock-vs-real status of each surface, see [`MOCKING.md`](MOCKING.md). For DS component rules, see [`../src/components/ds/RULES.md`](../src/components/ds/RULES.md).

## 1. Type scale & density tokens

Shells uses a deliberately compressed **two-tier** type scale:

- `text-body` — default for ~95% of UI (nav, tables, buttons, labels, inputs)
- `text-display` — large hero numbers only (account balance, etc.)

Both are custom Tailwind utilities defined in `src/app/globals.css`:

```css
@layer utilities {
  .text-body    { font-size: var(--text-body); }
  .text-display { font-size: var(--text-display); }
}
```

`--text-body` and `--text-display` (plus chrome heights `--ui-h-input`, `--ui-h-pill`, `--ui-y`, etc.) are switched by a **density attribute on `<html>`**:

```css
:root            { --text-body: 14px; ... }
[data-density="small"] { --text-body: 13px; ... }
[data-density="large"] { --text-body: 16px; ... }
```

`ShellsProvider` (`src/app/shells/_state/shells-context.tsx`) sets the attribute on `document.documentElement` while the Shells route is mounted, removes it on unmount so marketing renders at its own scale, and persists to `localStorage` under `wf-shells-density`.

**Hierarchy comes from color and weight, not size** — `text-foreground` vs `text-muted-foreground`, `font-medium` vs `font-semibold`. Resist sprinkling `text-[12px]` or `text-[15px]`; if you need an exception, comment why.

## 2. tailwind-merge + custom utilities — IMPORTANT

`src/lib/utils.ts` extends tailwind-merge with a custom font-size group:

```ts
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": ["text-body", "text-display"],
    },
  },
})
```

**Why:** without that registration, tailwind-merge sees `text-body` and `text-foreground` as conflicting (both start with `text-`) and silently **drops** the size class. Took hours to catch the first time. If you add new custom text-size utilities, register them here too.

## 3. Custom resizable panel system

Shells desktop is a 3-column / 2-row flex grid where each region resizes by dragging handles. Implementation lives entirely in `src/app/shells/page.tsx`.

The original implementation used `react-resizable-panels` v4. That library sets unitless `flexBasis` on initial render, which browsers treat as pixels until a `ResizeObserver` fires — so panels appear ~50px wide on first paint. We replaced it with a custom system that:

- stores sizes as **percentages** in state and persists to `localStorage` (`wf-shells-layout-v1`)
- uses `flex-basis: NN%` directly (no unitless values)
- uses **Pointer Capture** (`setPointerCapture`) on the drag handle so `pointermove` doesn't get hijacked by the TradingView iframe

If you touch the resize logic, keep these three properties — losing any of them brings back hard-to-debug behaviors.

## 4. GSAP scroll-linked animation

Two places use GSAP + `ScrollTrigger`:

- `src/components/sections/shell-showcase.tsx` — desktop laptop-frame unfold tied to scroll progress.
- `src/components/sections/features.tsx` — pinned scroll-stack of the four feature cards (desktop only).

Both respect `prefers-reduced-motion` and are registered with `useGSAP()` from `@gsap/react`, which handles cleanup. The pinned stack also calls `ScrollTrigger.refresh(true)` on `pageshow` and after late-loading content so back-navigation doesn't land on stale start/end positions.

## 5. iOS Safari text-size-adjust fix

`src/app/globals.css` pins `-webkit-text-size-adjust: 100%` on `<html>`. Without it, Safari's "text autosizing" inflates font-size in long readable blocks (chat messages, paragraphs) but leaves short UI labels (tabs, buttons) alone — making the same `text-body` class render at different sizes.

A separate rule for inputs:

```css
@media (max-width: 767px) {
  input, textarea, select { font-size: 16px !important; }
  input::placeholder, textarea::placeholder { font-size: var(--text-body); }
}
```

That prevents iOS from auto-zooming on input focus (Safari zooms when font-size < 16px). The placeholder override re-shrinks placeholder text so it visually matches the rest of the density-scaled chrome. Don't remove either.

## 6. Color tokens

Trading uses two distinct reds:

- `--destructive` (oklch) — generic error/delete UI (rarely used in shells)
- `--tone-down` (`#f07575`) — trading semantic for **short side / asks / sells / price-down**, exposed as `text-tone-down`, `bg-tone-down`, etc.

Don't introduce a third red. For a "warning" shade, use opacity (`bg-tone-down/15`).

The Pro mode palette (`--wf-pro-gold`, `--wf-pro-magenta`, etc.) and per-card accents (`--wf-accent-mint/amber/sky/violet`) live in `src/components/ds/tokens.css`.

## 7. State management

Shells global state lives in one provider: `src/app/shells/_state/shells-context.tsx`.

Four independent slices, each via its own hook:

- `useActiveMarket()` — selected market + setter
- `useCommandBar()` — command palette open state, `openCommand`, `closeCommand`, `toggleCommand` (also handles ⌘K)
- `useDensity()` — `density` + `setDensity`
- `useViewMode()` — `"trading" | "paths"` toggle, drives the in-app Trade/Paths swap

Each hook throws if used outside `<ShellsProvider>`. The provider wraps everything under `/shells`.

## 8. Mobile / desktop switch (Shells)

`src/app/shells/page.tsx` uses `useSyncExternalStore` to read `window.matchMedia("(min-width: 768px)")` and renders either `<DesktopShell>` (custom resize layout) or `<MobileLayout>` (chart + bottom sheets).

The server snapshot returns `true`, so SSR ships the desktop tree. On mount the real media query takes over — single render swap on mobile, no hydration mismatch.

Mobile components (`_components/mobile/`) reuse the same panels (`ChatPanel`, `TradePanel`, etc.) inside a Base UI `Dialog`-based bottom sheet. The chat sheet is full-height; trade/portfolio/order book are 90vh.

## 9. Marketing site patterns

Two pieces of the marketing site swap by breakpoint and are easy to miss:

- **Shell preview** — `sections/shell-showcase.tsx` (desktop laptop-unfold) vs `sections/mobile-shell-showcase.tsx` (phone-shaped frame mirroring the live mobile shells layout). `app/page.tsx` swaps via `md:hidden` / `hidden md:block` wrappers.
- **Feature cards** (`sections/features.tsx`) — render real-fidelity slices of Wayfinder UI (ChatPanel tab strip + a message exchange, CommandBar filter chips + token rows, PortfolioPanel header + hero + sparkline + venue rows, an ExplorePathsPanel article). Each slice sits behind a shared `FADE_MASK` (top/bottom mask-image gradient) for the "slice of UI" feel. The art components are intentionally thin re-renders of the real panels — when the underlying components drift, update these too.

The `/paths` `PathCard` and the in-app `ExplorePathsPanel` `PathCard` are kept as one component family (both ship a procedural kind-tinted header + glyph). Keep them in sync.

## 10. Mobile menu z-index — IMPORTANT

`src/components/site-header.tsx` ships a hamburger drawer on mobile. The header element creates an **isolated stacking context** (`isolate` class). Inside that context, the menu is a backdrop-blurred overlay at `z-40`, and the inner header content (logo, Launch app, hamburger) is lifted to **`z-50`** so the X close button sits above the backdrop and can dismiss the menu.

If you remove the `relative z-50` from the inner header content `<div>`, the menu's backdrop will swallow the close button and there will be no way to dismiss the menu. Don't.

## 11. Icons

All icons in Shells flow through `src/app/shells/_components/icons.tsx`, which wraps `lucide-react` with `strokeWidth={1.5}` (or `2` for emphasis, `0` with `fill="currentColor"` for solid). Use these wrappers — don't import from `lucide-react` directly inside Shells. Consistent stroke + sizing.

Marketing components import from `lucide-react` directly since they have different styling needs.

## 12. Things you'll want to know later

- **Pro banner** (ChatPanel) persists dismissal to `localStorage` (`wayfinder:pro-banner-dismissed`). Clear the key to see it again.
- **Resize layout reset:** clear `wf-shells-layout-v1`.
- **Density reset:** clear `wf-shells-density`.
- The `eslint-disable-next-line react-hooks/set-state-in-effect` comments are intentional — they exist for SSR-safe `localStorage` hydration in `useLayoutEffect` to avoid visual flash.
- Bitcoin orange `#f7931a` is left as inline style in TradePanel — it's specifically the BTC logo color, not a theme token.
- Hero supported-models row uses inline SVG marks at `currentColor` (rendered white via `text-foreground`). Two are official press-kit paths (DeepSeek, Kimi, OpenAI); the dev can swap any of them by replacing the inline `<path>` content.
