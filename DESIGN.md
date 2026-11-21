# Lamha (لمحة) design system: "the honest bill"

Arabic RTL, mobile-only (440px column). Every screen is a working delivery app first; the world adds type, palette, density, and one signature move: **money and order state live on a receipt that gets stamped, never silently changed**.

## Color tokens (`src/app/globals.css` `@theme`)

| Token | Hex | Job |
|---|---|---|
| `paper` | `#f2f4fa` | App ground |
| `desk` | `#e4e8f3` | Outside the phone column |
| `sheet` | `#ffffff` | Receipts, cards, sheets |
| `ink` / `ink-2` / `ink-3` | `#121838` / `#444d72` / `#636b8c` | Text: primary, secondary, meta |
| `rule` / `leader` | `#dfe3ee` / `#c3c9dc` | Dividers / dotted leaders |
| `pen` (+`700`,`900`,`100`,`50`) | `#1c2fa8` | Ballpoint blue: shell, primary actions, selection, ETA |
| `stamp` (+`50`) | `#0b8a5f` | Approved, paid, refunded-to-you, free delivery |
| `void` (+`50`) | `#cf2f45` | Cancel, reject, late, sold out, errors |
| `marker` / `marker-soft` | `#ffe45c` / `#fff6bf` | Highlighter: only the total, promos, notes |

Partner app shell uses `ink` instead of `pen` so the store side reads as a back-office tool of the same family.

## Type

- **Readex Pro** (300–700) for all UI, `tnum` on globally; prices use `tabular-nums`.
- **Aref Ruqaa** (Egyptian handwriting script) only for the wordmark, rubber stamps, store monograms, and the live ETA number.
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
