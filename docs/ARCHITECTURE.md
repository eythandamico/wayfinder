# Architecture

The Wayfinder repo is a single Next.js 16 (App Router) app that serves two
products: a marketing site and the **Shells** trading terminal at `/shells`.
This doc covers the non-obvious systems — patterns that are easy to break or
"fix" if you don't know why they're there.

If you're looking for what's mocked vs wired to real services, see
[`MOCKING.md`](MOCKING.md).

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

The CSS variables `--text-body` and `--text-display` (plus chrome heights
`--ui-h-input`, `--ui-h-pill`, `--ui-y`, etc.) are switched by a **density
attribute on `<html>`**:

```css
:root            { --text-body: 14px; ... }
[data-density="small"] { --text-body: 13px; ... }
[data-density="large"] { --text-body: 16px; ... }
```

The attribute is set by `ShellsProvider` (`src/app/shells/_state/shells-context.tsx`)
on `document.documentElement` while the Shells route is mounted, and removed
on unmount so the marketing pages render at their own scale. Persists to
`localStorage` under `wf-shells-density`.

**Hierarchy comes from color and weight, not size** — `text-foreground` vs
`text-muted-foreground`, `font-medium` vs `font-semibold`. Resist the urge to
sprinkle `text-[12px]` or `text-[15px]`; if you need an exception document
why with a comment.

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

**Why this matters:** without that registration, tailwind-merge sees `text-body`
and `text-foreground` as conflicting (both start with `text-`) and silently
**drops** the size class. We hit this for hours before catching it. If you add
new custom text size utilities, register them here too.

## 3. Custom resizable panel system

The Shells desktop layout is a 3-column / 2-row flex grid where each region
can be resized by dragging handles. Implementation lives entirely in
`src/app/shells/page.tsx`.

The original implementation used `react-resizable-panels` v4. That library
sets unitless `flexBasis` on initial render, which browsers treat as pixels
until a `ResizeObserver` fires — so panels appear ~50px wide on first paint.
We replaced it with a custom system that:

- stores sizes as **percentages** in state and persists to `localStorage`
  (`wf-shells-layout-v1`)
- uses `flex-basis: NN%` directly (no unitless values)
- uses **Pointer Capture** (`setPointerCapture`) on the drag handle so
  `pointermove` doesn't get hijacked by the TradingView iframe

If you touch the resize logic, keep these three properties — losing any of
them brings back hard-to-debug behaviors.

## 4. GSAP scroll-linked animation

`src/components/sections/shell-showcase.tsx` uses GSAP + `ScrollTrigger` for
the scroll-driven unfold of the laptop frame on the marketing home. It
respects `prefers-reduced-motion` — if you change the animation, keep the
guard.

GSAP is registered with `useGSAP()` from `@gsap/react`, which handles cleanup
on unmount.

## 5. iOS Safari text-size-adjust fix

`src/app/globals.css` pins `-webkit-text-size-adjust: 100%` on `<html>`.
Without it, Safari's "text autosizing" inflates font-size in long readable
blocks (chat messages, paragraphs) but leaves short UI labels (tabs, buttons)
alone — making the same `text-body` class render at different sizes.

There's also a separate rule for inputs:

```css
@media (max-width: 767px) {
  input, textarea, select { font-size: 16px !important; }
}
```

That one prevents iOS from auto-zooming on input focus (Safari zooms when
font-size < 16px). Don't remove it.

## 6. Color tokens

Trading uses two distinct reds:

- `--destructive` (oklch) — generic error/delete UI (rarely used in shells)
- `--tone-down` (`#f07575`) — trading semantic for **short side / asks /
  sells / price-down**, exposed as the Tailwind utility `text-tone-down`,
  `bg-tone-down`, etc.

Don't introduce a third red. If you want a different shade for a "warning"
state, use opacity (`bg-tone-down/15`).

The Pro mode palette (`--wf-pro-gold`, `--wf-pro-magenta`, etc.) and
per-card accents (`--wf-accent-mint/amber/sky/violet`) live in
`src/components/ds/tokens.css`.

## 7. State management

Shells global state is in one provider: `src/app/shells/_state/shells-context.tsx`.

It exposes three independent slices via separate hooks:

- `useActiveMarket()` — currently-selected market + setter
- `useCommandBar()` — command palette open state, `openCommand`, `closeCommand`,
  `toggleCommand` (also handles ⌘K)
- `useDensity()` — `density` + `setDensity`

Each hook throws if used outside `<ShellsProvider>`. `ShellsProvider` wraps
everything under `/shells`.

## 8. Mobile / desktop switch

`src/app/shells/page.tsx` uses `useSyncExternalStore` to read
`window.matchMedia("(min-width: 1024px)")` and renders either `<DesktopShell>`
(custom resize layout) or `<MobileLayout>` (chart + bottom sheets).

The server snapshot returns `true`, so SSR ships the desktop tree. On mount,
the real media query takes over — there's a single render swap on mobile but
no hydration mismatch.

Mobile components (`_components/mobile/`) reuse the same panels (`ChatPanel`,
`TradePanel`, etc.) inside a Base UI `Dialog`-based bottom sheet. The chat
sheet is full-height; trade/portfolio/order book are 90vh.

## 9. Icons

All icons in Shells flow through `src/app/shells/_components/icons.tsx`,
which wraps `lucide-react` with `strokeWidth={1.5}` (or `2` for emphasis,
`0` with `fill="currentColor"` for solid). Use these wrappers — don't import
from `lucide-react` directly inside Shells. Consistent stroke + sizing.

Marketing components import from `lucide-react` directly since they have
different styling needs.

## 10. Things you'll want to know later

- **Pro banner** in ChatPanel persists dismissal to `localStorage`
  (`wayfinder:pro-banner-dismissed`). Clear the key to see it again.
- **Resize layout reset:** clear `wf-shells-layout-v1`.
- **Density reset:** clear `wf-shells-density`.
- The `eslint-disable-next-line react-hooks/set-state-in-effect` comments
  are intentional — they're for SSR-safe `localStorage` hydration in
  `useLayoutEffect` to avoid visual flash.
- The Bitcoin orange `#f7931a` is left as inline style in `TradePanel` since
  it's specifically the Bitcoin logo color, not a theme token.
