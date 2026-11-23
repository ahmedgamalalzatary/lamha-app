# Lamha (لمحة) design system: "the honest bill"

Arabic RTL, mobile-only (440px column). Every screen is a working delivery app first; the world adds type, palette, density, and one signature move: **money and order state live on a receipt that gets stamped, never silently changed**.

## Color tokens (`src/app/globals.css` `@theme`)

| Token | Hex | Job |
|---|---|---|
Values are copied from talabat.com's published CSS variables (Tawsilty uses the same orange family, `#f16e02`–`#ff851d`).

| Token | Hex | Source variable | Job |
|---|---|---|---|
| `paper` | `#f5f5f5` | neutral4 | App ground |
| `desk` / `cream` | `#f4ede3` | tertiary100 | Outside the phone column |
| `sheet` | `#ffffff` | neutral-white | Receipts, cards, sheets |
| `ink` / `ink-2` / `ink-3` | `#262626` / `#6b6b6b` / `#767675` | neutral100 / neutral70 / muted | Text: primary, secondary, meta |
| `rule` / `leader` | `#e5e5e5` / `#bfbfbf` | neutral10 / neutral35 | Dividers / dotted leaders |
| `pen` (+`700`,`900`,`100`,`50`) | `#f55905` (`#d24803`, `#ab3601`, `#fdc3a4`, `#fee9dd`) | primary100… | Brand orange: shell, primary actions, selection, ETA |
| `cocoa` | `#411517` | secondary100 | Partner app shell |
| `stamp` (+`50`) | `#05a437` (`#ebf4e5`) | success | Approved, paid, refunded-to-you, free delivery |
| `void` (+`50`) | `#c01b21` (`#faebe9`) | danger | Cancel, reject, late, sold out, errors |
| `marker` / `marker-soft` | `#cfff00` / `#fef2d7` | promo100 / alert10 | Highlighter: only the total, promos, notes |
| `gold` | `#eaa407` | alert100 | Rating stars, "busy" state |

Partner app shell uses `cocoa` instead of `pen` so the store side reads as a back-office tool of the same family.

## Type

- **Noto Sans Arabic** for Arabic (the font talabat.com ships) and **Noto Sans** for Latin and digits, 300–800, `tnum` on globally; prices use `tabular-nums`. Talabat's Latin face, TT Commons, is a paid font, so Noto Sans stands in for it.
- The wordmark, stamps, store monograms and the live ETA use the same family in bold (`font-hand` now points at Noto).
- Western digits everywhere (`ar-EG-u-nu-latn` for dates), so prose and receipts match.
- Scale: 11.5 / 12.5 / 13.5 / 14.5 / 15 / 16 / 18 / 20–22 / 26–28 / 32–40 / 64 (ETA).

## Signature components

- **Receipt** (`components/ui/receipt.tsx`): white sheet with torn zigzag edge (CSS mask), `Row` = label · dotted leader · amount, `Perf` dashed perforation, `.marked` highlighter on totals. Every price breakdown in the product uses it (cart, order, rider earnings, partner payout, store agreement, courier fare).
- **Stamp** (`components/ui/stamp.tsx`): rotated double-ring Ruqaa stamp; `stamp-in` press animation is the one orchestrated motion moment, played on each order-status change.
- **FlipNumber**: odometer digits for the live ETA (`dir=ltr`).
- **Time bar**: its filled length is exactly the elapsed share of the order's time.
- **StoreLogo**: Ruqaa monogram tile (no third-party logos).

## Layout and interaction rules

- One phone column, 16px gutters, sticky top bars, bottom tab bar, bottom sheets (vaul) for every sub-task.
- Cards: radius 14–18, one soft shadow, no border+shadow ghosts. Receipts carry the drop-shadow via `filter`.
- Horizontal rails are positioned (`.no-scrollbar { position: relative }`) so nothing escapes them; the page never scrolls sideways.
- States are stamped, not deleted: refunded lines are struck through with a red stamp, cancelled orders keep their receipt.
- Motion: spring for layout indicators, exponential ease-out elsewhere; `prefers-reduced-motion` respected globally.
- Charts: single hue (`pen` for partner, `stamp` for rider), tap a bar to read its value, sequential `pen` ramp for peak hours.

## Imagery

Food/product photos are Unsplash (Unsplash License), cropped 4:3 to 720×540, served locally from `public/img`; provenance in `public/img/SOURCES.json`. Maps: OpenStreetMap tiles, desaturated toward the palette.
