# Wayfinder DS — Component Rules

Every component under `src/components/ds/` follows these rules. No exceptions.

## 1. No hardcoded colors

Use existing Tailwind tokens (`bg-card`, `text-muted-foreground`, `text-primary`, `border-border`) or `--wf-*` variables via arbitrary values (`bg-[var(--wf-accent-amber)]`).

Never use hex, `rgb()`, `rgba()`, or generic Tailwind color scales (`text-slate-500`, `bg-gray-900`). The only exceptions:

- `bg-white` on explicit knobs/chips where contrast demands it
- `text-black` / `text-white` on colored backgrounds where the background is a dynamic brand accent (e.g. per-card accent glow)
- Tailwind's semantic aliases that resolve to our tokens via `@theme inline` (`bg-background`, `text-foreground`, `bg-primary`, etc.)

## 2. No hardcoded shadows

Use the shadow tokens defined in `tokens.css`:

| Purpose | Variable |
|---------|----------|
| Subtle card elevation | `--wf-shadow-card` |
| Floating mockup cards | `--wf-shadow-mockup` |
| CTA glow | `--wf-shadow-cta` |

Reference via `shadow-[var(--wf-shadow-card)]` or `style={{ boxShadow: "var(--wf-shadow-card)" }}`.

## 3. Radius — concentric, scaled from `--radius`

`globals.css` defines `--radius: 0.875rem` (14px) and scales sm/md/lg/xl/2xl/3xl/4xl off it via `calc`. When a child sits inside a padded parent, its radius must equal `parent_radius - padding` (concentric rule).

Approved outer radii: `rounded-2xl` (25.2px) for cards, `rounded-3xl` (30.8px) for hero containers, `rounded-full` for pills/avatars. Children inside a `p-4`/`p-5`/`p-6` card use `rounded-sm` (7.7px).

Never introduce a new radius without justification.

## 4. Transitions — specific properties only

Never use `transition-all`. Always list the exact properties that animate. Reason: `all` transitions layout-affecting properties like `width`, `padding`, and `font-size` on hover, causing unintended jitter.

| Category | Duration | Easing |
|----------|----------|--------|
| color, background, border | 150ms | ease-out |
| scale, opacity | 200ms | ease-out |
| filter (brightness/blur) | 200ms | ease-out |
| width/height morph | 350ms | ease-out |

Active press: `active:scale-[0.96]` (never `translate-y-px` — that kicks off relayouts for neighbours).

## 5. Hit areas

Small interactive elements (`size-6`, `size-8`, `h-8` or smaller) must extend their pointer target via a `::before` pseudo-element so the tap target reaches ~40×40.

```tsx
"relative before:absolute before:content-[''] before:-inset-2"
```

The pseudo-element has no visual. Never grow the visible element itself.

## 6. Accessibility

Every interactive element must have:

- `aria-label` on icon-only buttons
- `aria-expanded` on toggles that reveal a panel
- `aria-haspopup="true"` + `aria-controls` on menu triggers
- `focus-visible:ring-2 focus-visible:ring-ring/60` for keyboard focus
- Native `<button>` or Base UI's `Button` primitive (never `<div onClick>`)

Decorative images (brand art, keyart, aurora backdrop) must have `alt=""` and `aria-hidden`.

## 7. Typography scale

Headings use the `font-heading` stack with `tracking-tight`. Body text uses `font-sans` with the project's default `letter-spacing: -0.005em`. Eyebrows/kickers/metric labels use `font-mono`.

| Use | Classes |
|-----|---------|
| Hero h1 | `font-heading text-[clamp(3rem,8vw,5rem)] font-semibold leading-[0.95] tracking-tight` |
| Section h2 | `font-heading text-[clamp(2.25rem,5vw,3.25rem)] font-semibold leading-[1.02] tracking-tight` |
| Card h3 | `font-heading text-lg font-medium tracking-tight` |
| Eyebrow | `font-mono text-[11px] uppercase tracking-[0.22em]` |
| Stat number | `font-heading text-3xl font-semibold tabular-nums tracking-tight` |
| Body | (default) `text-[15px] leading-relaxed text-muted-foreground` |
| Small meta | `font-mono text-[11px] text-muted-foreground` |

Numeric values (stats, prices, APYs, install counts) always get `tabular-nums`.

Long-running titles get `text-balance`; multi-line descriptions get `text-pretty`.

## 8. Spacing

Use Tailwind's native spacing scale (`gap-4`, `py-28`, `px-6`). DS layout primitives (`Stack`, `Row`) expose `gap="xs|sm|md|lg|xl"` which maps to the Tailwind scale; always prefer the primitive over raw flex.

Section verticals: `py-28 md:py-36` for most sections, `py-24 md:py-32` for dense ones, `py-40` only for hero + token finale.

## 9. Layout primitives

Never hand-roll a `<div className="flex flex-col gap-...">` when a primitive exists:

- **Stack** — vertical flex with `gap` + `as` props
- **Row** — horizontal flex with `gap`, `align`, `justify`, `wrap`
- **Surface** — padded rounded card background
- **PageSection** — `max-w-*` + `px-6` horizontal container
- **Divider** — semantic `<hr>` with spacing scale

When a section needs a centered max-w container use `<PageSection width="default">`; never `mx-auto max-w-6xl px-6` inline.

## 10. File conventions

- One component per file
- Kebab-case file names (`section-header.tsx`)
- PascalCase named exports (`export function SectionHeader`)
- TypeScript only, `.tsx` for components / `.ts` for pure logic
- Imports from outside the DS use path aliases (`@/lib/utils`), never relative `../../`
- Export every public symbol from `index.ts`

## 11. Variants — typed unions, not loose strings

```ts
type Gap = "xs" | "sm" | "md" | "lg" | "xl";
```

Variants resolve to class strings via a lookup `Record<Variant, string>`. Never concatenate classes with ternaries when a lookup is cleaner.

## 12. Accent system

Per-card accents (used on stack cards, section eyebrows) must route through `accent.ts`. Never inline a custom eyebrow color — add a new accent key to `ACCENT_STYLES` if a new palette is needed.

Approved accent keys: `mint` | `amber` | `sky` | `violet`.
