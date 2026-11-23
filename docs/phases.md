# Tawsela: build phases

The order in which the real product is built. Each phase points at the contract (`docs/project-contract.md`) for what it must do.

## Rules for every phase

**Definition of done ("full green"):**

1. **Database (when the phase changes the schema):** the Drizzle schema is changed and a migration generated (`db:generate`). The migration runs on an empty database and on the previous one.
2. **API:** endpoints work as listed, with role guards and validated input; Swagger is updated; unit tests cover every business rule; e2e tests cover the main flow, including forbidden and invalid cases.
3. **Mobile:** screens match Tawsilty (contract §6, §8–§10) and the approved demo; Arabic RTL and English LTR both work; loading, empty and error states use Tawsilty's patterns; data comes from the real API.
4. **Dashboard:** pages match the Tawsilty admin layout (contract §11); Arabic RTL.
5. **Green:** `pnpm build lint typecheck test test:e2e` passes at the repo root.
6. **Tests, written first, only where they matter:** business rules, formatters, guards, data rules and each screen's main flow. Not plumbing.
7. **Checked by hand:** the flow is run end to end on a phone or emulator against a local API and MySQL.
8. **Docs:** the phase's status is updated here; decided [Open] items are updated in the contract with a change log line.
9. **Commit:** each phase is its own commit.

**Order:** phases run in order. A phase blocked by an open decision (contract §15.1) waits for it; its "Decide first" column lists them.

**Status values:** ⬜ not started, 🟨 in progress, ✅ done, ⛔ excluded for now (not built until the owner says otherwise).

## Overview

| # | Phase | Status | Decide first (§15.1) |
|---|---|---|---|
| 0 | Foundation | ✅ | none |
| 1 | Accounts: phone, email code and password | ⬜ | none (#1 decided: email) |
| 2 | Production server and deploys (moved to just before the first real mobile build) | ⬜ | owner provides the VPS (#6) |
| 3 | Dashboard shell and sign-in (admin and partner areas) | ⬜ | |
| 4 | Catalog: verticals, stores, categories, products | ⬜ | |
| 5 | Customer home | ⬜ | |
| 6 | Store lists, filters and search | ⬜ | |
| 7 | Store page and product sheet | ⬜ | |
| 8 | Addresses, zones and the map picker | ⬜ | |
| 9 | Cart | ⬜ | |
| 10 | Checkout and placing an order (cash only) | ⬜ | 3, 11 |
| 11 | Partner: orders and products (mobile and `/partner`) | ⬜ | 9 (products and account screens), 11 |
| 12 | Driver: shifts, offers and skips | ⬜ | 5, 9 (driver home and current orders), 11 |
| 13 | Live tracking and the delivered view | ⬜ | 9 (live tracking; the delivered view is captured) |
| 14 | Ratings, complaints and support | ⬜ | |
| 15 | Notifications and push (Expo push) | ⬜ | none (#7 decided) |
| 16 | Wallet (top-up excluded for now) | ⬜ | none |
| 17 | Points | ⬜ | 4 |
| 18 | Invite friends | ⬜ | |
| 19 | Offers, coupons and banners | ⬜ | |
| 20 | Lucky wheel | ⛔ excluded for now | 10 |
| 21 | Pharmacy: prescriptions and product photos | ⬜ | |
| 22 | Send anything (اطلب دليفري) | ⬜ | |
| 23 | Driver: history and fines | ⬜ | none (history captured; fines follow the client's rules) |
| 24 | Admin: overview and reports | ⬜ | 9 (no admin overview or reports screens yet) |
| 25 | Release | ⬜ | 8 |

---

## Phase 0: Foundation

The skeleton every feature plugs into. The only visible result is that the apps show they reach the API.

- **API:** `@nestjs/config` loads the root `.env` and validates it; Drizzle MySQL module; `/v1` prefix, validation pipe, one error shape, CORS; Swagger at `/docs`; `GET /v1/health` checks the API and the database.
- **Shared:** enums and labels for roles, verticals, order statuses, address types; money, phone and time formatters (contract §7).
- **Mobile:** Expo Router root layout; Alexandria font; Tawsilty theme tokens (contract §6.1); i18n with Arabic default and RTL; API client using `EXPO_PUBLIC_API_URL` from the root `.env`; React Query; splash; empty role-based tab layouts (customer, partner, driver, admin); toast, bottom sheet, empty state and confirm dialog components (contract §6.3).
- **Dashboard:** RTL layout with the sidebar from contract §11, Alexandria, theme tokens, API client.
- **Tests:** health e2e; formatter unit tests.

**Done when** the mobile app and the dashboard launch in Arabic and show the API is healthy.

## Phase 1: Accounts: phone, OTP and password

Contract §2, §8.1, §8.14 (profile), §9 and §10 (sign-in).

No SMS: the code goes by email through Gmail SMTP (`nodemailer`); without `SMTP_HOST` the API writes it to its log (contract §8.1, §15.1 #1).

- **Database:** `users` (email required for customers), `otp_codes`, `refresh_tokens`.
- **API:** request a code (phone + email, sent by email), verify the code, complete profile (with optional invite code), sign in with phone + password, refresh, sign out, forgot password by email code (customers only); `GET/PATCH/DELETE /me`; role guard; rate limits. Partner and driver accounts cannot sign up or use forgot password: they only sign in with admin-generated credentials (contract §2). Seed: an admin, a partner and a driver.
- **Mobile:** phone, OTP, personal details and sign-in screens for customers; one sign-in screen (phone + password) for partners, drivers and admins; after sign-in the tab bar matches the role; profile screen; sign out; delete account (customers).
- **Tests:** OTP expiry and attempts; each role's guard; partners and drivers refused on sign-up and forgot password; refresh; deletion.

## Phase 2: Production server and deploys

Docker Compose (API + MySQL), nginx, Let's Encrypt, the dashboard build, backups before each deploy, migrations on deploy. Same pattern as the owner's other servers.

**Moved:** everything runs locally until the first real mobile build. This phase runs just before that build, on a VPS the owner provides then (contract §15.1 #6). Later phases don't wait for it.

## Phase 3: Dashboard shell and sign-in

Contract §11 and §11.1. One sign-in page; the role decides the area: admins land in the admin area (sidebar from §11, empty pages), partners in `/partner` (its own sidebar, empty pages). A partner can never open an admin page or another store's data (guard on every `/v1/partner/*` route by the account's store). Admin users (A23).

## Phase 4: Catalog

Contract §8.3–§8.5, §11 (الموردين, المنتجات والكتالوج).

- **Database:** `verticals`, `stores`, `store_categories`, `products`, `cuisines`, `zones`.
- **API:** public catalog reads; admin CRUD with image upload (`sharp`).
- **Dashboard:** stores (type, layout, pickup allowed, fees, minimum order, hours, cover), categories, products, inactive products, cuisines, home tiles (order and images).
- **Partner accounts:** creating a store generates its partner account; the password is shown once with a copy button; reset password and disable (contract §2, §11). The same actions in the mobile app for admins (contract §11.2, M2).
- Seed from the demo's data.

## Phase 5: Customer home

Contract §8.2: header with the address, rotating search, vertical tiles, invite card. (Banners and the wheel arrive in Phases 19–20.)

## Phase 6: Store lists, filters and search

Contract §8.3 and §8.13: per-vertical lists, cuisine circles, chips, sort and rating sheets, closed state, empty state, search tabs.

## Phase 7: Store page and product sheet

Contract §8.4–§8.5: cover, info row, category grid, category pages, product sheet, minimum-order bar, favourites, layout per store type.

## Phase 8: Addresses, zones and the map picker

Contract §8.9: saved addresses sheet, map picker with zoom gate and location banner, address form with validation, delivery zone check.

## Phase 9: Cart

Contract §8.6: one store per cart, steppers, delete confirm, upsell row, note sheet, payment summary, empty cart, service-closed toast, pickup only where allowed.

## Phase 10: Checkout and placing an order

Contract §8.6–§8.7: confirm the location on a map, delivery fee, payment method (cash on delivery only; card and e-wallet excluded for now), coupon, place order; server-side totals; order created for the store.

## Phase 11: Partner: orders and products

Contract §9 and §11.1: incoming orders live (socket), accept/prepare/ready, past orders with counts, product availability toggles, notifications, account with the orders-made count. Built twice on the same API: in the mobile app and in the web dashboard's partner area (`/partner`: orders, products, store settings the partner may edit). The partner edits only what contract §11.1 allows.

## Phase 12: Driver: shifts, offers and skips

Contract §10: driver accounts generated from the dashboard or the admin's mobile app (password shown once, reset, disable); shift schedule from the admin, start unlocks 30 min before, end and extend, offers with details, accept/skip with warning and suspension, order steps to delivered; dispatch from the dashboard (assign driver, "بدون كابتن" flag).

## Phase 13: Live tracking and the delivered view

Contract §8.8: live status and driver location while active; plain details view once delivered; reorder inside طلباتي.

## Phase 14: Ratings, complaints and support

Contract §8.8 and §8.14: star rating with good/bad chips and text; order problems open a support ticket; suggestions and complaints (general or about a past order); contact us; dashboard الشكاوى والاقتراحات.

## Phase 15: Notifications and push

Notification list, notification settings (push only; no SMS), push tokens sent through Expo's push HTTP API with no SDK, order status pushes, dashboard الإشعارات التفاعلية campaigns.

## Phase 16: Wallet

Contract §8.15: balance, additions and deductions, paying with the wallet. E-wallet top-up is excluded for now (§15.1 #2).

## Phase 17: Points

Contract §8.16: earning per order, progress to 240, value, earned and spent tabs, redeeming.

## Phase 18: Invite friends

Contract §8.17: codes, rewards with their limits and expiry, monthly cap, friends list, share sheet and WhatsApp.

## Phase 19: Offers, coupons and banners

Contract §8.2 and §8.10: offer banners, the mart banner with its product row, offer tiles, coupons, offers grouped by the customer's coupon, "عروض التوصيل" and "خصومات" filters; dashboard management.

## Phase 20: Lucky wheel

**Excluded for now** (contract §15.1 #10). Skipped until the owner says otherwise.

Contract §8.2: one spin a day, prizes (points or coupons) from the dashboard.

## Phase 21: Pharmacy

Contract §8.11: prescription and product-photo uploads, choose-a-pharmacy sheet, the pharmacy quotes and the customer confirms.

## Phase 22: Send anything

Contract §8.12: no new screens. Seed an "اطلب دليفري" store with one 1 ج.م product; make sure the cart note reaches the driver and the store's orders.

## Phase 23: Driver: history and fines

Contract §10: order history with a date range, totals and complaints; fines with reasons; dashboard fines.

## Phase 24: Admin: overview and reports

Contract §11: الرئيسية overview and التقارير.

## Phase 25: Release

Brand assets, store listings, Android and iOS builds, release checks on real phones.
