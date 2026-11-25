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

**Status values:** ⬜ not started, 🟨 in progress, 🔍 in-verify (built and full green, but its mobile screens are not yet checked by hand on a phone, rule 7), ✅ done (also checked on a phone), ⛔ excluded for now (not built until the owner says otherwise). A phase with mobile screens stays 🔍 until the owner checks it in the app.

## Overview

| # | Phase | Status | Decide first (§15.1) |
|---|---|---|---|
| 0 | Foundation | 🔍 in-verify | none |
| 1 | Accounts: phone, email code and password | 🔍 in-verify | none (#1 decided: email) |
| 2 | Production server and deploys (moved to just before the first real mobile build) | ⬜ | owner provides the VPS (#6) |
| 3 | Dashboard shell and sign-in (admin and partner areas) | ✅ | |
| 4 | Catalog: verticals, stores, categories, products | 🔍 in-verify | |
| 5 | Customer home | 🔍 in-verify | |
| 6 | Store lists, filters and search | 🔍 in-verify | |
| 7 | Store page and product sheet | 🔍 in-verify | |
| 8 | Addresses, zones and the map picker | 🔍 in-verify | Google Maps key |
| 9 | English LTR and the language switch (project review F47) | ⬜ | none |
| 10 | Cart | ⬜ | |
| 11 | Checkout and placing an order (cash only) | ⬜ | 3, 11 |
| 12 | Partner: orders and products (mobile and `/partner`) | ⬜ | 9 (products and account screens), 11 |
| 13 | Driver: shifts, offers and skips | ⬜ | 5, 9 (driver home and current orders), 11 |
| 14 | Live tracking and the delivered view | ⬜ | 9 (live tracking; the delivered view is captured) |
| 15 | Ratings, complaints and support | ⬜ | |
| 16 | Notifications and push (Expo push) | ⬜ | none (#7 decided) |
| 17 | Wallet (top-up excluded for now) | ⬜ | none |
| 18 | Points | ⬜ | 4 |
| 19 | Invite friends | ⬜ | |
| 20 | Offers, coupons and banners | ⬜ | |
| 21 | Lucky wheel | ⛔ excluded for now | 10 |
| 22 | Pharmacy: prescriptions and product photos | ⬜ | |
| 23 | Send anything (اطلب دليفري) | ⬜ | |
| 24 | Driver: history and fines | ⬜ | none (history captured; fines follow the client's rules) |
| 25 | Admin: overview and reports | ⬜ | 9 (no admin overview or reports screens yet) |
| 26 | Release | ⬜ | 8 |

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

**Built:**

- **API:** `/v1/admin/admins` (admins only): list, create with a generated password shown once, reset the password (old sessions end), disable or enable (signed out at once). An admin cannot reset or disable their own account (`OWN_ACCOUNT`), and the last enabled admin cannot be disabled even by two admins at once (`LAST_ADMIN`), so one admin always stays. Seed: two more admins.
- **Dashboard:** the session in `localStorage`, renewed once on a 401, one renewal across tabs (the realestate pattern); `/sign-in` for admins and partners (customers and drivers are turned away and their new session ended); the area gate; the admin sidebar as in the Tawsilty photo plus الإعدادات › حسابات الإدارة; the partner sidebar (الطلبات, المنتجات, المتجر, التقارير, الحساب); empty pages show "قريباً"; sign-out in the sidebar; partner الحساب (name, phone, sign-out).
- **Tests:** the dashboard tests run against the real API (built `apps/api`) on its own database `tawsela_web_test`, with no mocked requests.
- **Moved to Phase 4:** the store guard on `/v1/partner/*`. A partner belongs to a store, and stores arrive in Phase 4; until then `/v1/partner/*` has no routes.

## Phase 4: Catalog

Contract §8.3–§8.5, §11 (الموردين, المنتجات والكتالوج).

- **Database:** `verticals`, `stores`, `store_categories`, `products`, `cuisines`, `zones`.
- **API:** public catalog reads; admin CRUD with image upload (`sharp`).
- **Dashboard:** stores (type, layout, pickup allowed, fees, minimum order, hours, cover), categories, products, inactive products, cuisines, home tiles (order and images).
- **Partner store guard (from Phase 3):** every `/v1/partner/*` route reads the store from the signed-in partner's account; a partner never reaches another store's data.
- **Partner accounts:** creating a store generates its partner account; the password is shown once with a copy button; reset password and disable (contract §2, §11). The same actions in the mobile app for admins (contract §11.2, M2).
- Seed from the demo's data.

**Built:**

- **Database:** `stores` (one daily opening range in Cairo time plus "closed now"), `cuisines`, `store_cuisines`, `store_categories`, `products`, `home_tiles`; `users.store_id` puts a partner on a store.
- **API:**
  - `/v1/admin/stores`: list, by type, open now; a new store comes with its partner account, and the password is shown once.
  - `/v1/admin/stores/:id/categories`, `/v1/admin/categories/:id` (delete only when empty), `/v1/admin/stores/:id/products`, `/v1/admin/products/:id`, `/v1/admin/products/inactive`.
  - `/v1/admin/cuisines`, `/v1/admin/home-tiles`: a tile opens one vertical or one store. Every short list has a `PUT …/order`.
  - `/v1/admin/uploads`: sharp, at most 1600 px, JPEG.
  - `/v1/admin/partners`: list and search, add one to a store, reset, disable.
  - `/v1/catalog/*` for the apps: home tiles, cuisines, active stores by type and cuisine, a store page with its active products.
  - `/v1/partner/store` behind the **partner store guard**: the store always comes from the partner's own account.
- **Dashboard:**
  - الموردين: table with type tabs; add or edit a store, with its partner accounts.
  - منتجات الموردين: store picker, categories in order, products with photo and the متاح switch.
  - منتجات غير فعالة with تفعيل.
  - أنواع الأكل and مربعات الرئيسية (both new under المنتجات والكتالوج).
- **Mobile:** the admin's الحسابات tab: partner accounts with search; add one for a store, reset, disable. The password is shown once with نسخ and مشاركة.
- **Seed:**
  - The demo's 16 stores with their menus and photos, plus the 1 ج.م "اطلب دليفري" store.
  - 10 cuisines and 9 home tiles.
  - The seeded partner runs the first store.
- **Moved:**
  - `zones` go to Phase 8, with the map and the delivery-zone check.
  - Product option groups and ingredients (§8.5) go to Phase 7, with the product sheet.
  - Product discounts (old price) go to Phase 20.

## Phase 5: Customer home

Contract §8.2: header with the address, rotating search, vertical tiles, invite card. (Banners and the wheel arrive in Phases 20–21.)

**Built:**

- **API:** `GET /v1/catalog/home` gives the tiles customers may open (a tile pinned to a hidden store is left out) and the invite card's rewards. It replaces `GET /v1/catalog/home-tiles`. The rewards are Tawsilty's 300 and 25 ج.م (`INVITE_REWARDS` in shared) until Phase 19 makes them admin settings.
- **Shared:** `formatAmount` writes whole amounts without decimals ("300 ج.م"), as the invite card does.
- **Mobile (customer الرئيسية):**
  - The orange header with "التوصيل إلى" and the search box. The search word changes every 3 seconds: بيتزا · المطاعم · الأكلات المفضلة · أفضل العروض.
  - The tiles: a fixed first row, four across, then a row that scrolls sideways. Each tile has its image, its label (up to 2 lines) and an optional dark badge. A tile opens its type's store list (`/stores/<type>`) or its pinned store (`/store/<id>`); both are placeholders until Phases 6 and 7.
  - The invite card with ✕; pull to refresh; grey skeleton tiles while loading; the error with "إعادة المحاولة".
- **Tests:** React Query now hands its updates on in a microtask under Jest (`jest.setup.ts`). Before that, an update queued while `renderRouter`'s fake timers were on was lost, and the screen stayed on its skeleton.
- **[Open] stand-ins (contract §8.2):** the address reads "حدد موقعك" and opens nothing until Phase 8; the search box opens nothing until Phase 6; the invite card opens nothing until Phase 19, and once closed it stays hidden on that phone.

## Phase 6: Store lists, filters and search

Contract §8.3 and §8.13: per-vertical lists, cuisine circles, chips, sort and rating sheets, closed state, empty state, search tabs.

**Built:**

- **Shared:** `applyStoreFilter` (sort sheet, rating floor, توصيل سريع, الاستلام), `STORE_SORTS`, `RATING_FLOORS`, `FAST_DELIVERY_MINUTES`, the search tabs (`SEARCH_SCOPES`, `inSearchScope`), with unit tests that use real rating values.
- **API:**
  - `GET /v1/catalog/stores` adds `q` (name contains; `%` and `_` are matched as text), `sort`, `minRating`, `fast` and `pickup`.
  - `GET /v1/catalog/search?q=&scope=` returns each matching store with its matching products (a store matches by its name or by a product).
  - `GET /v1/catalog/search/suggestions` returns up to 8 product names with their store type.
- **Mobile:**
  - **Store list** (`/stores/<type>?title=`, opened from a home tile): the top bar (back, التوصيل إلى, cart), a search box "ابحث عن <tile label>", the cuisine circles (restaurants; tap again to clear), "<n> المتاجر", the chips رتب حسب ▾ · التقييم ▾ · توصيل سريع · الاستلام, the radio sheets, the store rows (picture with the logo, "مغلق" while closed, جديد or the rating, time, fee), and the empty state.
  - **Search** (`/search`, opened from the home search box): tabs الكل · مطاعم · متاجر أخرى, the empty prompt, "ابحث عن «…»" with suggestions ("في المطاعم", and ↖ to put the name in the box), and results as each store followed by its products.
- **Stand-ins and later work:** see contract §8.3 and §8.13.

## Phase 7: Store page and product sheet

Contract §8.4–§8.5: cover, info row, category grid, category pages, product sheet, minimum-order bar, favourites, layout per store type. Adds product option groups and base ingredients (moved from Phase 4), with their admin editing.

**Built:**

- **Database:** `product_option_groups`, `product_options`, `product_ingredients`, `favorite_stores`; `store_categories.parent_id` (a sub-category, one level deep).
- **Shared:** `product.ts` holds the sheet and cart rules, with unit tests:
  - Customizable items, "السعر حسب الاختيار" and picking in a group (a radio swaps; ticks stop at the limit).
  - Required groups, the item price and "تُطلب معًا".
  - Merging cart lines, the bar's count and total, and what is left to reach the minimum order.
- **API:**
  - Products carry `optionGroups` and `ingredients` everywhere. Creating or editing a product with them replaces the old ones (`OPTION_GROUP` when a group asks for more choices than it has rows).
  - Categories take `parentId` (`CATEGORY_DEPTH`, `CATEGORY_OTHER_STORE`). A category with sub-categories cannot be deleted.
  - The store page keeps a main category whose products are in its sub-categories.
  - `GET/PUT/DELETE /v1/me/favorites[/:storeId]` (customers).
- **Dashboard (منتجات الموردين):**
  - The category form picks a main category ("قسم فرعي من …" in the list).
  - The product form edits option groups (name, مطلوب, the most choices, rows with a price change) and base ingredients.
  - Dialogs scroll when long.
- **Mobile:**
  - **Store page** (`/store/<id>`):
    - Cover with back, search and the heart; "مغلق" pill; logo, name, rating; the info row مدة التوصيل · رسوم التوصيل · التوصيل بواسطة.
    - Restaurant layout: category tabs that pin under the white bar once scrolled, ☰ with item counts, and products as a list ("قابل للتخصيص", "+" or "‹").
    - Market layout: the "الأقسام" grid.
  - **Category page** (`/store/<id>/category/<id>`): product search, sub-category circles (الكل shows a section each), and the product grid.
  - **Product sheet:** option groups with "مطلوب" and "اختر 1", ingredient chips that strike through, "تُطلب معًا", the stepper and "أضف للسلة <price>" (grey with "أكمل الاختيارات للإضافة للسلة" until complete).
  - **Bottom bar:** the minimum order, then "عرض السلة · <count> · <total>" (opens the cart tab).
  - **المفضلة** from حسابي (الخدمات المفضلة).
- **Seed:** a few demo items get choices (شاورما فراخ, وجبة شاورما فراخ عربي, كلاسيك سماش, موز priced by weight). توصيلة ماركت's خضار وفاكهة gets الخضار and الفاكهة as sub-categories. This step also fills an existing dev database.
- **Stand-ins and later work:** see contract §8.4, §8.5 and §8.14. The cart stays in the app's memory until Phase 10.

## Phase 8: Addresses, zones and the map picker

Contract §8.9: saved addresses sheet, map picker with zoom gate and location banner, address form with validation, delivery zone check. Adds the `zones` table (moved from Phase 4) and each store's zone and location.

- **API:**
  - Migration 0006 adds `zones`, `addresses`, and `zone_id`, `lat` and `lng` on stores.
  - `/v1/me/addresses` lists, adds, replaces and deletes addresses; `POST /v1/zones/check` checks a spot.
  - `/v1/admin/zones` lists, adds and edits zones.
  - Store lists and search take `addressId`.
- **Dashboard:** الإعدادات › المناطق (outline on the map); the store form's zone and location.
- **App:**
  - The "العناوين المحفوظة" sheet, from the home, the store lists and حسابي › عناويني.
  - The map picker (`/address/map`).
  - The address form (`/address/new`, `/address/<id>`).
- **Seed:** one zone, الفيوم, holding every store, each at its own spot.
- **Stand-ins and later work:**
  - See contract §8.9.
  - The map needs `GOOGLE_MAPS_API_KEY` in the root `.env`, or as a CI secret, for Android builds.
  - Delivery fees per zone wait for checkout (§15.1 #3).

## Phase 9: English LTR and the language switch

Contract §7, §14 and S2 (it was due in Phase 0; the project review, F47, found it missing). Both dictionaries exist, but the app always uses Arabic and forces RTL.

- The visible language switch on the account screen [Client: "عايز اللغة تبان من بره"], saved in the profile's `locale` (`PATCH /v1/me`) and on the phone, so the next launch opens in it.
- `useT()` follows the chosen language; the layout turns LTR for English and back to RTL for Arabic (React Native needs a reload when the direction flips).
- Every screen checked in both directions: icons that point a way (back, chevrons) mirror, numbers and money keep their formats (§7).
- Catalog text (store, product, category names) stays as the admin typed it, one language, until the client decides whether merchants enter both (review F48).

## Phase 10: Cart

Contract §8.6: one store per cart, steppers, delete confirm, upsell row, note sheet, payment summary, empty cart, service-closed toast, pickup only where allowed.

## Phase 11: Checkout and placing an order

Contract §8.6–§8.7: confirm the location on a map, delivery fee, payment method (cash on delivery only; card and e-wallet excluded for now), coupon, place order; server-side totals; order created for the store.

## Phase 12: Partner: orders and products

Contract §9 and §11.1: incoming orders live (socket), accept/prepare/ready, past orders with counts, product availability toggles, notifications, account with the orders-made count. Built twice on the same API: in the mobile app and in the web dashboard's partner area (`/partner`: orders, products, store settings the partner may edit). The partner edits only what contract §11.1 allows.

## Phase 13: Driver: shifts, offers and skips

Contract §10: driver accounts generated from the dashboard or the admin's mobile app (password shown once, reset, disable); shift schedule from the admin, start unlocks 30 min before, end and extend, offers with details, accept/skip with warning and suspension, order steps to delivered; dispatch from the dashboard (assign driver, "بدون كابتن" flag).

## Phase 14: Live tracking and the delivered view

Contract §8.8: live status and driver location while active; plain details view once delivered; reorder inside طلباتي.

## Phase 15: Ratings, complaints and support

Contract §8.8 and §8.14: star rating with good/bad chips and text; order problems open a support ticket; suggestions and complaints (general or about a past order); contact us; dashboard الشكاوى والاقتراحات.

## Phase 16: Notifications and push

Notification list, notification settings (push only; no SMS), push tokens sent through Expo's push HTTP API with no SDK, order status pushes, dashboard الإشعارات التفاعلية campaigns.

## Phase 17: Wallet

Contract §8.15: balance, additions and deductions, paying with the wallet. E-wallet top-up is excluded for now (§15.1 #2).

## Phase 18: Points

Contract §8.16: earning per order, progress to 240, value, earned and spent tabs, redeeming.

## Phase 19: Invite friends

Contract §8.17: codes, rewards with their limits and expiry, monthly cap, friends list, share sheet and WhatsApp.

## Phase 20: Offers, coupons and banners

Contract §8.2 and §8.10: offer banners, the mart banner with its product row, offer tiles, coupons, offers grouped by the customer's coupon, "عروض التوصيل" and "خصومات" filters; dashboard management.

## Phase 21: Lucky wheel

**Excluded for now** (contract §15.1 #10). Skipped until the owner says otherwise.

Contract §8.2: one spin a day, prizes (points or coupons) from the dashboard.

## Phase 22: Pharmacy

Contract §8.11: prescription and product-photo uploads, choose-a-pharmacy sheet, the pharmacy quotes and the customer confirms.

## Phase 23: Send anything

Contract §8.12: no new screens. Seed an "اطلب دليفري" store with one 1 ج.م product; make sure the cart note reaches the driver and the store's orders.

## Phase 24: Driver: history and fines

Contract §10: order history with a date range, totals and complaints; fines with reasons; dashboard fines.

## Phase 25: Admin: overview and reports

Contract §11: الرئيسية overview and التقارير.

## Phase 26: Release

Brand assets, store listings, Android and iOS builds, release checks on real phones.
