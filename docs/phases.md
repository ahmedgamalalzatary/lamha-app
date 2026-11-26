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
| 9 | English LTR and the language switch (project review F47) | 🔍 in-verify | none |
| 10 | Cart | 🔍 in-verify | none |
| 11 | Checkout and placing an order (cash only) | 🔍 in-verify | none (#3, #11 decided) |
| 12 | Partner: orders and products (mobile and `/partner`) | 🔍 in-verify | none (uncaptured screens marked [Open]) |
| 13 | Driver: shifts, offers and skips | 🔍 in-verify | none (home and current orders rebuilt from the 2026-11-26 captures; the offer card stays [Open]) |
| 14 | Order status and the delivered view (live tracking out of scope) | 🔍 in-verify | none (the active order view marked [Open]) |
| 15 | Ratings, complaints and support | 🔍 in-verify | none (good chips and star words marked [Open]) |
| 16 | Notifications and push (Expo push) | 🔍 in-verify | none (Expo project and Android FCM set up; real pushes need a workflow-built app) |
| 17 | Wallet (top-up excluded for now) | 🔍 in-verify | none (movement rows and the العملاء page marked [Open]) |
| 18 | Points | 🔍 in-verify | none (movement rows and the checkout row marked [Open]) |
| 19 | Invite friends | 🔍 in-verify | none (friends' rows and the share message marked [Open]) |
| 20 | Offers, coupons and banners | 🔍 in-verify | none (dashboard pages and code error texts marked [Open]) |
| 21 | Lucky wheel | ⛔ excluded for now | 10 |
| 22 | Pharmacy: prescriptions and product photos | 🔍 in-verify | none (the partner side and the notice wording marked [Open]) |
| 23 | Send anything (اطلب دليفري) | 🔍 in-verify | none (the customer's first status marked [Derived]) |
| 24 | Driver: history and fines | 🔍 in-verify | none (history rebuilt from the 2026-11-26 captures; the dashboard pages marked [Open]) |
| 25 | Admin: overview and reports | ⬜ | 9 (no admin overview or reports screens yet) |
| 26 | Release | ⬜ | 8 |
| 27 | Codebase folder layout | ✅ done | none |

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

**Must not be forgotten (found since):**
- nginx forwards the live socket: `/socket.io/` to the API with `proxy_http_version 1.1` and the `Upgrade` and `Connection` headers. The apps and `/partner` connect over WebSocket only; without them live orders, offers and status stop (CodeRabbit review, 2026-11-25).
- If push security is on, `EXPO_ACCESS_TOKEN` (Phase 16). The Expo project ID is in `app.config.ts`.
- Migrations are not transactional in MySQL: take the database backup before each deploy, and restore it if a migration stops halfway.

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

Contract §7, §14 and S2. Phase 0 added both dictionaries. The project review (F47) found that the app still forced Arabic RTL.

- The visible language switch on the account screen [Client: "عايز اللغة تبان من بره"], saved in the profile's `locale` (`PATCH /v1/me`) and on the phone, so the next launch opens in it.
- **[Open]** The Tawsilty account captures do not show a language switch. Tawsela uses an account-group row and the existing confirmation dialog pattern, with a warning that the app will reload to apply the change.
- `useT()` follows the chosen language; the layout turns LTR for English and back to RTL for Arabic (React Native needs a reload when the direction flips).
- Back arrows and chevrons mirror. Prices keep their precision and numbers keep Latin digits (§7).
- Catalog text (store, product, category names) stays as the admin typed it, one language, until the client decides whether merchants enter both (review F48).
- Phone verification: use a fresh native build that includes the RTL configuration change. Check both switch directions and reopening the app, then walk through the mobile screens in Arabic and English.

## Phase 10: Cart

Contract §8.6: one store per cart, steppers, delete confirm, upsell row, note sheet, payment summary, empty cart, service-closed toast, pickup only where allowed.

- Migration `0009_customer-cart` adds `carts` and `cart_lines`. Each customer has one cart. Its items, note and fulfillment choice survive signing out and reopening the app. Account deletion clears the cart.
- The customer-only API reads or edits `/v1/me/cart`, adds at `POST /v1/me/cart/lines`, adjusts or removes at `PATCH` or `DELETE /v1/me/cart/lines/:id`, and checks readiness at `POST /v1/me/cart/validate`. The server checks product choices, price, store hours and minimum order.
- **[Open]** The same-store suggestions use the first ten available menu products outside the cart. The captures do not show the store replacement dialog, pickup selector, retry and validation wording, or the per-line cap of 99. Adding or increasing items while the store is closed also uses the service-closed message.
- “تابع للدفع” validates the cart and shows the service-closed toast when applicable. A successful check shows a checkout availability message **[Open]** until Phase 11 adds checkout.
- Phone verification: run against an API with migration 0009 applied. Check store replacement, item editing, note entry with the keyboard open, pickup, and the closed-store toast in Arabic and English.

## Phase 11: Checkout and placing an order

Contract §8.6–§8.7: confirm the location on a map, the distance-based delivery fee and the store's payment option (§8.7), points as payment once Phase 18 exists, payment method (cash on delivery only; card and e-wallet excluded for now), coupon, place order; server-side totals; order created for the store.

- **Migrations:**
  - `0010_orders` adds `delivery_settings` (one row: base fee 20 for 2 km, 10 per km, option 2 at 10%), `orders`, `order_lines`, `order_events`, and each store's own `payout_option` and `app_percent`.
  - `0011_store-fee-and-audit` removes the per-store `delivery_fee` and lets the audit log name the settings.
- **Shared (TDD):** `deliveryFeeFor` (a started km counts whole), `payout` (the 3 options), `deliverySlots` (today's half-hour slots, at least 30 minutes ahead, while the store is open), `slotLabel`.
- **API:**
  - `GET`/`PATCH /v1/admin/settings/delivery`, recorded in سجل التغييرات.
  - `POST /v1/me/checkout/quote` and `POST /v1/me/orders` (customers). The order rechecks the cart, the address (the customer's own, in the store's zone), a spot moved on the map (in the same zone), the store's location, the slot and the total the customer saw.
  - A repeated request id gives back the same order; racing taps place one.
  - Every amount and who pays whom is copied into the order; lines keep the product's name, choices and price. The cart empties.
  - `GET /v1/me/orders`, `GET /v1/admin/orders?status=`.
  - Store lists, search and the store page give the fee to the chosen address (`addressId`), or the base fee without one.
- **Dashboard:**
  - الإعدادات › رسوم التوصيل والدفع, with a worked example.
  - The store form drops the fee and adds who pays the store and the app's percentage (empty follows الإعدادات). It warns when the store has no location.
  - الطلبات: status tabs, "#code", "بدون كابتن" and "ملاحظات" flags with the red bar, store, customer, total, payment method.
- **App:**
  - "تابع للدفع" opens **إتمام الدفع** (`/checkout`).
  - "تنفيذ الطلب" opens the map on the address's spot; "تأكيد الموقع" prices that spot and places the order. A changed bill is shown first, and the next tap places it.
  - A pickup skips the address, the map and the fee.
  - Then طلباتي lists the orders.
- **[Open] not captured:**
  - the pickup wording ("الاستلام من <store>", "جاهز خلال …")
  - "لا توجد أوقات متاحة اليوم"
  - "تم إرسال طلبك"
  - the طلباتي cards
  - the changed-bill and checkout error wording
  - the order code as 100000 + id.
- **[Derived]** In option 3, the store is owed the items total minus the app's percentage. The app pays it later.
- **Changed from the plan:** a store's location stays optional in the form. Without it, the store cannot take delivery orders (`CHECKOUT_NO_STORE_LOCATION`), and the form says so.
- **Phone verification:**
  - Place a delivery order (the map confirm, then طلباتي) and a pickup for later today.
  - Change the fee in the dashboard while checkout is open.
  - Check the orders table.

## Phase 12: Partner: orders and products

Contract §9 and §11.1: incoming orders live (socket), accept/prepare/ready, past orders with counts, product availability toggles, notifications, account with the orders-made count. Built twice on the same API: in the mobile app and in the web dashboard's partner area (`/partner`: orders, products, store settings the partner may edit). The partner edits only what contract §11.1 allows.

Owner's answers before the phase (2026-11-25):
- A pickup is closed by the store: after "تم التجهيز" it taps **تم الاستلام** when the customer takes it.
- A new order vibrates the phone now; the ring sound comes with notifications (Phase 16).
- `/partner` gets live orders through `socket.io-client` (installed in the web app).
- Print: on `/partner` it opens the browser's print page; hidden on the phone.

- **No migration.** The order's status and its history (`order_events`) already exist.
- **Shared (TDD):** `nextStatus`: قبول and رفض on a new order, تم التجهيز on an accepted one, تم الاستلام only on a ready pickup. A delivery leaves "تم التجهيز" with the delivery man (Phase 13). The types for the cards, the details and the counts; the socket events; error `ORDER_STATUS`.
- **API:**
  - `GET /v1/partner/orders?status=`, `GET /v1/partner/orders/counts`, `GET /v1/partner/orders/:id`, `POST /v1/partner/orders/:id/{accept|reject|ready|collected}`. Only the partner's own store; another store's order is "not found".
  - Each step locks the order, so two phones tapping at once move it once; the other gets 409 `ORDER_STATUS`. Each step is added to the history with who made it.
  - Live socket (socket.io, same CORS rule as the API): a partner connects with the access token and hears only their store: `order.placed` with the card, `order.status` with the new status. Anyone else is disconnected.
  - `PATCH /v1/partner/store` takes only hours, closed now and the cover; any other field is refused. `/v1/partner/categories` and `/v1/partner/products` are the admin's menu code held to the partner's store.
- **Dashboard `/partner`:**
  - الطلبات: status tabs in the admin table's look, "متصل" while live. A new order opens the popup (قبول, رفض). التفاصيل opens the details with the next step and طباعة.
  - المنتجات: the admin's menu page for the partner's own store, without the store picker.
  - المتجر: hours, مغلق الآن, cover.
  - الحساب: "الطلبات اللي اتعملت".
  - التقارير stays "coming soon" until Phase 25.
- **App (partner tabs):**
  - الرئيسية: "الطلبات الجديده" with the cards. A new order vibrates and opens the popup over any tab.
  - The details screen (`/partner-order/:id`) as in the photo, with "استلم من المندوب" and the 5-minute note, then تم التجهيز, or تم الاستلام for a ready pickup.
  - طلباتى: status tabs, same cards. منتجات: search, category tabs, the متاح switch.
  - حسابي: "الطلبات اللي اتعملت" with the count; it opens طلباتى.
- **[Open] not captured:**
  - طلباتى, منتجات and every `/partner` page (they use the admin pages' look).
  - The live connection dot and "متصل"/"غير متصل".
  - "احصل على مساعدة" shows "الدعم متاح قريباً" until support exists (Phase 15).
  - "لا توجد طلبات جديدة", the pickup wording on the details ("استلام من المحل", "موعد الاستلام").
  - The print and mute icons on the phone wait for a printer and the ring sound.
- **[Derived]**
  - "الطلبات اللي اتعملت" counts the store's delivered orders.
  - "استلم من المندوب" shows on deliveries unless the store's option is 3 (the delivery man pays nothing).
  - The popup shows the oldest unanswered new order; closing it (back button, Escape) leaves it in قيد المراجعة.
- **Changed from the plan:** "notifications" (push) stays with Phase 16; the live socket covers the open app.
- **Phone verification:**
  - Sign in as a partner, place an order from a customer phone: the partner phone vibrates and the popup opens; قبول.
  - Open the details, تم التجهيز. A pickup: تم الاستلام.
  - منتجات: switch a product off and see it greyed for the customer.
  - The same on `/partner` in the browser, and طباعة.

## Phase 13: Driver: shifts, offers and skips

Contract §10: driver accounts generated from the dashboard or the admin's mobile app (password shown once, reset, disable); shift schedule from the admin, start unlocks 30 min before, end and extend, offers with details, accept/skip with warning and suspension, order steps to delivered; dispatch from the dashboard (assign driver, "بدون كابتن" flag).

Owner's answers before the phase (2026-11-25):
- Build it without the driver home and current-orders screenshots; those parts are [Open].
- **Rebuilt 2026-11-26** from a Fayoum delivery man's account (contract §10): the location gate ("يرجى تفعيل الموقع" and the "تفعيل خدمة الموقع" dialog), "طلباتى" with the "نشط" pill, "لا يوجد طلبات حاليا" with "اعادة التحميل" on الرئيسية and الطلبات الحالية, "نوبات العمل المتوفرة" with the week strip, and the "نوع الشكوى" menu on حسابي. The offer card and the in-shift screens stay [Open]. The profile's documents, vehicle type and area are not built yet.
- An order is offered when the store accepts it, to **every delivery man on shift at once**; the first to accept takes it.
- A delivery man may hold as many orders as he accepts.
- Nobody accepts in 60 s: it shows again to all of them. Ignoring it is not a skip; only "تخطي" counts.
- Skips count in a row: accepting an order or the end of a block starts the count again.
- A store "delivered by: store" gets no offers: the store taps خارج للتوصيل, then تم التوصيل.

- **Migration 0012:** `driver_settings` (the global week and the 8 rule numbers, one row), `drivers` (his own week, skips in a row, blocked until), `shifts` (scheduled start and end, extensions, who started it, ended), `order_skips`; `orders.driver_id` and `orders.at_store_at`; the audit log's target may be an order.
- **Shared (TDD):** the week from Sunday in Cairo time (a range past midnight, the same time = all day), `shiftAt` (the shift running now or the next, Egypt's summer time included), the start window, `skipOutcome`, `driverStep` (وصلت للمتجر → خارج للتوصيل once ready → تم التوصيل), the store's own `out` and `delivered`; the API shapes, socket events and error codes.
- **API:**
  - `GET /v1/driver/shift`, `POST /v1/driver/shift/{start|extend|end}`; `GET /v1/driver/offers`, `POST /v1/driver/offers/:id/{accept|skip}`; `GET /v1/driver/orders`, `GET /v1/driver/orders/:id`, `POST /v1/driver/orders/:id/{arrived|out|delivered}`.
  - Admin: `/v1/admin/drivers` (list, create, password, disable), `PUT /v1/admin/drivers/:id/schedule`, `POST /v1/admin/drivers/:id/shift`, `GET|PATCH /v1/admin/settings/drivers`, `POST /v1/admin/orders/:id/driver`. Each change goes in سجل التغييرات.
  - Accepting locks the order, so of several men tapping at once one takes it and the rest get `OFFER_TAKEN`. A man off shift or blocked sees no offers and cannot accept. He sees the customer's phone only on his own orders (§14).
  - Live socket: delivery men join the drivers' room (`offer.new`, `offer.gone`) and their own (`driver.order` when the store marks it ready or the admin moves it). The store hears when a man takes its order.
- **Dashboard:**
  - المندوبين: the table (name, phone, account, الشفت: في الشفت / خارج الشفت / موقوف حتى, own or global week), إضافة with the password once, reset, disable, the week dialog, and بدء الشفت for a man who missed his window.
  - المندوبين › نوبات العمل والقواعد: the global week and the numbers.
  - الطلبات: الكابتن shows his name; 🛵 (العمليات) gives an accepted delivery to a man, working ones first. "بدون كابتن" shows only on deliveries the app's captains bring.
  - `/partner`: خارج للتوصيل and تم التوصيل for a store delivering itself.
- **App:**
  - الرئيسية: the status pill (يعمل / لا يعمل), "نوبة عمل محجوزة" with "ستبدأ في … دقيقة", the time range and بدء نوبة العمل (locked outside the window, with why); while working "نوبة العمل الحالية", تمديد and إنهاء; the block notice; الطلبات الجديدة as cards with قبول and تخطي.
  - The offer popup over every tab: it vibrates, counts down, and rings again each round; back leaves it on الرئيسية until the next round. A skip shows the warning or the block at once (push in Phase 16).
  - الطلبات الحالية: his orders not yet delivered.
  - تفاصيل الطلب as in the photo: البائع with عرض الموقع, the customer with call, SMS and WhatsApp, المنتجات folded with each line's photo [Client], ادفع نقداً للبائع, المبلغ — تحصيل النقود, then the step button.
  - حسابي › العمل › نوبات عملي: his week.
  - The admin's الحسابات: a المندوبين tab; a driver account has no store.
- **[Open] not captured:**
  - The driver's الرئيسية and الطلبات الحالية (§15.1 #9): the status pill and the shift card follow the client's reference from another app; the cards use the store's card look.
  - The offer popup (the store's popup look), the warning and block wording, and the نوبات عملي screen.
  - المندوبين and نوبات العمل والقواعد in the dashboard (the orders-table look; names ours).
  - Stores have no written address: عنوان البائع shows the store's zone, and the customer's area is their address's zone.
- **[Derived]**
  - The admin may start a man's shift from 30 minutes before it until it ends; a shift he already worked (ended early) does not start again, the next one does.
  - تمديد is offered during the shift; ending it keeps the orders he holds.
  - He goes out (خارج للتوصيل) only once the store marked the order ready; the admin's 🛵 works until then and may replace the man who had it.
  - Disabling a delivery man ends his shift.
- **Changed from the plan:** speed points (§10) wait for Points (Phase 18); his own fee values (§8.7) and earnings wait for history and fines (Phase 24); the warning goes by push with Phase 16.
- **Phone verification:**
  - Set a week in نوبات العمل والقواعد; sign in as the delivery man and start the shift in its window; extend; end.
  - Two delivery men on shift: a store accepts an order; both phones vibrate and pop up; one accepts, the other's popup goes.
  - Skip three offers: the warning, then the block.
  - وصلت للمتجر, wait for تم التجهيز, خارج للتوصيل, تم التوصيل; call and WhatsApp the customer; عرض الموقع.
  - In the dashboard: 🛵 on an order, and بدء الشفت for a late man. In the admin's app: add a delivery man.

## Phase 14: Order status and the delivered view

Contract §8.8: the order's status while it is active (no driver location: live tracking is out of scope); the plain details view once delivered; reorder inside طلباتي.

- **Migration 0013:** order lines also keep the chosen options and struck-out ingredients by id, so "اطلب تاني" can rebuild them. Lines placed before this have none and come back without choices.
- **Shared (TDD):** `customerSteps` (review → preparing → ready → out for delivery → delivered; a pickup has no "out for delivery"; none for a rejected or cancelled order), `customerStatusLabel` (a pickup reads "جاهز للاستلام" and "تم الاستلام"), `canReorder`; the details and reorder shapes.
- **API:**
  - `GET /v1/me/orders/:id`: the customer's own order with its lines, address, captain and payment (404 for anyone else's).
  - `POST /v1/me/orders/:id/reorder` (`replaceCartId` optional): the order's lines back in the cart with their choices, added like "+" (up to the quantity limit). Lines gone from the menu or whose choices changed are left out and counted (`skipped`); none left is `CART_ITEM_UNAVAILABLE`. An order still running is `ORDER_STATUS`. (Changed 2026-11-26: the lines go in that store's own cart beside any other, also while it is closed, and `replaceCartId` is gone; see the rework below.)
  - Live socket: a customer joins their own room and hears `order.status` when the store moves the order, a delivery man takes it or moves it, or the admin assigns one.
- **App:**
  - طلباتي: a card opens تفاصيل الطلب; the list and the open order refresh live.
  - تفاصيل الطلب as in the photo: the arrow back, the green "تم التوصيل" pill with a tick, the store's logo, name, date and "رقم الطلب", عنوان التوصيل with a pin, معلومات المندوب (الاسم), the lines "2 × name" with prices and choices, المجموع, رسوم التوصيل, **قيمة الطلب**, طريقة الدفع, وقت التوصيل. No رسوم الخدمة (owner, 2026-11-25).
  - "اطلب تاني" fills the cart and opens it; a cart from another store asks first; what was left out is said in a toast.
- **[Open] not captured:** the order screen while it runs: the same details with a "حالة الطلب" list of steps (done, now, next) under the store.
- **[Derived]**
  - "اطلب تاني" shows once the order is over (delivered, rejected or cancelled), at the bottom of تفاصيل الطلب; never as a one-tap button outside طلباتي [Client].
  - It adds to a cart of the same store rather than emptying it.
  - A pickup shows "استلام من المحل" with the store's name instead of the address, and وقت الاستلام.
- **Phone verification:**
  - Place an order; open it from طلباتي and watch its steps move as the store accepts and marks it ready, and as a delivery man takes it (his name appears).
  - Once delivered: the plain view matches the photo.
  - "اطلب تاني": with an empty cart, with another store's cart (the question), and with an item turned off in the menu (the toast).

## Phase 15: Ratings, complaints and support

Contract §8.8 and §8.14: star rating with good/bad chips and text; order problems open a support ticket; suggestions and complaints (general or about a past order); contact us; dashboard الشكاوى والاقتراحات.

Owner's answers before the phase (2026-11-25):
- 1 to 3 stars is a bad rating (the problem chips); 4 and 5 is good (the good chips).
- The rating screen opens by itself once, the next time the app opens after delivery; "قيّم طلبك" in the order's details too.
- The admin reads complaints and suggestions, calls or WhatsApps the customer and marks them done. No reply screen in the app.
- The admin keeps the "تواصل معنا" numbers in the dashboard.

- **Migration 0014:** `ratings` (one per order: stars, chips, text), `tickets` (complaint or suggestion, an optional order, open or done, who closed it), `support_phones`; the store's `rating_sum` and `rating_count`; `orders.rating_skipped_at` (✕ on the popup); the audit log's target may be a ticket.
- **Shared (TDD):** Tawsilty's 6 problem chips and 6 good chips, the word under each star, `isBadRating`, `ratingProblem` (a bad rating needs a chip; the chips must fit the stars), `ticketProblem`; the API shapes; `ALREADY_RATED`.
- **API:**
  - `POST /v1/me/orders/:id/rating` (delivered orders, once; the store's sum and count move in the same transaction), `GET /v1/me/rate-prompt`, `POST /v1/me/orders/:id/rating/skip`; the order's details carry `rating`.
  - `POST /v1/me/tickets` (a complaint may name the customer's own order; a suggestion may not), `GET /v1/support/phones`.
  - Admin: `GET /v1/admin/tickets` (by type and status), `PATCH /v1/admin/tickets/:id` (done or open again), `GET /v1/admin/ratings`, `GET|PUT /v1/admin/settings/support-phones`. Changes go in سجل التغييرات.
  - Store lists and the store page show the average of the ratings (2 decimals) instead of "جديد".
- **Dashboard:** العملاء › الشكاوى والاقتراحات with الشكاوى, الاقتراحات and التقييمات tabs: the customer with call and WhatsApp, the text, the order and store, مفتوحة / تم الحل; التقييمات with the stars, the chips and the comment. الإعدادات › أرقام التواصل.
- **App:**
  - The rating screen as in the photo: ✕ on the beige top, the logo, "كيف كان طلبك من …؟", the stars and their word, the chips, the red "اختر سبب واحد على الأقل", "أخبرنا المزيد" and "أكمل" (grey until complete). It opens by itself once when the app opens; ✕ stops it for that order.
  - تفاصيل الطلب: "قيّم طلبك" once delivered, "تقييمك" with the stars after; "تواصل مع الدعم الفني" opens a complaint about the order.
  - حسابي › الدعم والمساعدة: تقديم مقترح, تقديم شكوى (the "نوع الشكوى" menu: طلب سابق → pick the order, عامة), التواصل معنا (the sheet of numbers; a tap calls).
  - تقديم شكوى / تقديم اقتراح as in the photos: "ما هو شكواك", the underlined field, "ارسال".
- **[Open] not captured:**
  - The good chips and the words for 2 to 5 stars (سيئة, مقبولة, جيدة, ممتازة), and "ما الذي أعجبك؟".
  - The forms' drawings (an icon stands in), the order picker, the thank-you and sent toasts.
  - الشكاوى والاقتراحات and أرقام التواصل in the dashboard (the orders table's look; names ours).
- **[Derived]**
  - The popup asks about delivered orders of the last 3 days only.
  - The rating is of the store; it moves the store's stars. The delivery man is not rated here (his speed points come with Phase 18).
  - The complaint-type menu floats in the middle of the screen.
  - A complaint about an order names it under the question.
- **Phone verification:**
  - Deliver an order, close and open the app: the rating screen comes up. Rate 2 stars (needs a chip), and another order 5 stars (no chip needed). The store's stars change in the list.
  - ✕ on the popup: it does not come back; "قيّم طلبك" in the details still works.
  - Send a complaint (عامة and طلب سابق) and a suggestion; see them in the dashboard; WhatsApp the customer; mark one done.
  - Add numbers in أرقام التواصل; open التواصل معنا and call one.

## Phase 16: Notifications and push

Notification list, notification settings (push only; no SMS), push tokens sent through Expo's push HTTP API with no SDK, order status pushes, dashboard الإشعارات التفاعلية campaigns.

Owner's answers before the phase (2026-11-25):
- Pushes: the customer's order status; the store's new order; a delivery man's new offer, his order ready, and the skip warning and block.
- Campaigns go to every customer, or to customers with an address in one zone.
- Campaigns are sent now only (no scheduling).

- **Migration 0015:** `push_tokens` (one per phone, moving to whoever signed in last), `notifications` (الإشعارات, read or not, where a tap goes), `campaigns`; `users.notifications_enabled`; the audit log's target may be a campaign.
- **Shared (TDD):** every notice's wording in Arabic and English, `customerStatusNotice` (accepted, rejected, on its way, delivered; a pickup's ready and picked up), `isExpoPushToken`; the API shapes.
- **API:**
  - Expo's push HTTP API, no SDK, in chunks of 100, with EXPO_ACCESS_TOKEN when set; a DeviceNotRegistered answer drops the token. Nothing is sent while NODE_ENV is test; the API tests catch the pushes in memory.
  - `POST|DELETE /v1/me/push-tokens`, `GET /v1/me/notifications` (newest first, `limit`, `before`, the unread count), `POST /v1/me/notifications/read`; `PATCH /v1/me` takes `notificationsEnabled`.
  - Who is told: the store's partners of a new order; the customer when the store or the delivery man moves the order; every delivery man on shift and not blocked of a new offer (push only, not kept); his order ready; his skip warning and block. Each notice goes in الإشعارات, in the account's language, after the change is saved; disabled and deleted accounts get nothing; "تفعيل الإشعار" off stops the push only.
  - `POST /v1/admin/campaigns` (title, message, a zone or every customer), `GET /v1/admin/campaigns`; recorded in سجل التغييرات.
- **Dashboard:** التسويق والعروض › الإشعارات التفاعلية: the title, the message, "إلى" (كل العملاء or a zone), a confirm, "تم الإرسال إلى N عميل", and the sent ones.
- **App:**
  - After sign-in the app asks for permission once and sends the phone's token; signing out takes it back. A push shows on top even with the app open; tapping one opens its order (or الرئيسية for an offer).
  - حسابي: the bell opens الإشعارات and shows a red dot for new ones; "إعدادات الإشعارات" in الحساب, for every account.
  - الإشعارات as in the photo: the white header with the chevron, the pale page, and "لا توجد إشعارات — ستظهر هنا إشعاراتك عند وصولها" with the violet bell.
  - إعدادات الإشعارات as in the photo, without the SMS switch: "حسابي  اعدادات الخدمات والإشعارات", the orange bell tile, "تفعيل الإشعار".
- **[Open]**
  - The Expo project exists (2026-11-26); its ID is in `app.config.ts`. Real pushes need an app built by the GitHub workflows (not Expo Go).
  - Android FCM set up (2026-11-26): Firebase project `wassal-app`, its `google-services.json` in the git-ignored `keys/` (the `GOOGLE_SERVICES_JSON_BASE64` secret on CI, written by the APK and AAB workflows), and its FCM V1 service account key uploaded to the Expo project's credentials for `com.wassal.app`. iOS push waits for the Apple developer account (contract §15.1 #8).
  - The notices' wording, the list's rows, the dashboard page (not captured).
- **[Derived]**
  - An offer pushes once, when the store accepts; the 60-second rounds do not push again.
  - Opening الإشعارات marks them read.
  - A pickup's "ready" pushes the customer.
- **Changed from the plan:** the store's ring sound for a new order (Phase 12) is the push's sound for now.
- **Phone verification (needs an app built by the GitHub workflows, and FCM on Android):**
  - Allow notifications; place an order: the store's phone gets "طلب جديد"; accept it: the customer's gets "تم قبول طلبك"; tap it: the order opens.
  - Two delivery men on shift get "طلب جديد متاح"; the one who takes it gets "الطلب جاهز" when the store marks it ready; three skips bring the warning and the block.
  - Turn "تفعيل الإشعار" off: no more pushes, the list still fills.
  - Send a campaign to a zone from the dashboard; only that zone's customers get it.

## Phase 17: Wallet

Contract §8.15: balance, additions and deductions, paying with the wallet. E-wallet top-up is excluded for now (§15.1 #2).

Owner's answers before the phase (2026-11-26):
- "رصيد المحفظة" pays as much as the wallet holds, up to the order total; cash on delivery pays the rest.
- A rejected or cancelled order's wallet money goes back to the wallet at once.
- The delivery man collects only the cash part; the app owes him the wallet part (settled outside the app for now).
- The admin adds or deducts with a reason; a deduction never takes the balance below 0.

- **Migration 0016:** `wallet_transactions` (add or deduct; admin, order or refund; the amount, the reason, the order, who added it); `users.wallet_balance`; `orders.wallet_paid`.
- **Shared (TDD):** `walletPays` (as much as it holds, up to the total, in piastres), `cashDue`, `adjustProblem` (above 0, up to 10,000, piastres, a reason, never over the balance); the API shapes; the audit action `customer.wallet`.
- **API:**
  - `GET /v1/me/wallet`: the balance and the movements, newest first.
  - The checkout quote gives `walletBalance`; `POST /v1/me/orders` takes `expectedWalletPaid`, and a balance that moved since the screen loaded is a changed bill (409 CHECKOUT_TOTAL_CHANGED). The payment and the order are saved together, with the customer's row locked; a retried tap takes nothing more.
  - A store's رفض gives the wallet money back in the same save.
  - Orders carry `walletPaid` for the customer, the store and the admin; the delivery man's "تحصيل النقود" is the cash part only.
  - `GET /v1/admin/customers?q=` (name, phone or email) and `POST /v1/admin/customers/:id/wallet` (422 WALLET_BALANCE over the balance), recorded in سجل التغييرات.
- **Dashboard:** العملاء › العملاء: the customers with their wallet balance and the search; the wallet button adds or deducts with the amount and the reason. The store's order details show "المدفوع من المحفظة" in red and المجموع as what is left to collect ("مدفوع بالكامل" when nothing is); the admin's الطلبات shows the wallet's part under the total.
- **App:**
  - حسابي: the محفظتي tile with the balance opens حركة المحفظة.
  - حركة المحفظة as in the photos, without "شحن المحفظة": the orange "رصيد المحفظة" card, الإضافات and الخصومات with their empty states (the green and the red arrow).
  - إتمام الدفع: "رصيدك" with "رصيد المحفظة" and its switch, "المتاح <amount>", or "لا يوجد رصيد متاح" in red with the switch off; switched on, "المدفوع من المحفظة" shows in the summary and الإجمالي and "تنفيذ الطلب" show the cash left.
  - The order details (customer and store) show the wallet's part; the delivery man's details show it under "تحصيل النقود".
- **[Open]**
  - The movements' rows (not captured): the reason ("دفع الطلب #…", "استرداد الطلب #…", or the admin's reason), how long ago, and the amount in green or red.
  - The dashboard's العملاء page (not captured); the customer's profile, orders and block are not built yet (§11 A3).
- **[Derived]**
  - The switch starts off.
  - The customer sees the admin's reason on the row.
  - The most the admin adds or deducts at once: 10,000 ج.م (Tawsilty's top-up limit).
  - The app shows the newest 200 movements.
- **Phone verification:**
  - With an empty wallet, محفظتي shows 0.00 ج.م; حركة المحفظة shows both empty states and no "شحن المحفظة"; checkout shows "لا يوجد رصيد متاح" with the switch off.
  - The admin adds 50 with a reason in the dashboard: the tile, the card and الإضافات show it.
  - Order for more than 50 with the switch on: the summary takes 50 and "تنفيذ الطلب" shows the rest; الخصومات shows "دفع الطلب #…"; the store's details show "المدفوع من المحفظة" and the rest as المجموع; the delivery man's "تحصيل النقود" is the rest.
  - The store rejects such an order: the 50 comes back in الإضافات as "استرداد الطلب #…".

## Phase 18: Points

Contract §8.16: earning per order, progress to 240, value, earned and spent tabs, redeeming.

Owner's answers before the phase (2026-11-26):
- Two settings, not one rate: what earns a point (كل X ج.م = نقطة) and what a point pays (ج.م). One rate both ways would give back 100% of what is spent.
- The part paid from the wallet earns points like cash.
- With both switched on, the wallet pays first, then points, then cash.
- The delivery man's speed points move to Phase 24, with his history and money.

- **Migration 0017:** `points_settings` (one row: earn every, point value, minimum), `points_transactions` (add or deduct; order, refund or admin); `users.points_balance`; `orders.points_spent`, `points_paid` and `points_earned`.
- **Shared (TDD):** `pointsEarned`, `earnBase` (the items only; what points paid earns nothing), `pointsPay` (whole points, after the wallet, up to what is due, the fee included, none below the minimum), `pointsWorth`, `pointsToGo`, `pointsAdjustProblem`; `cashDue` takes the points too; the audit actions `customer.points` and `settings.points`.
- **API:**
  - `GET /v1/me/points`: the balance, its value, the rules and the movements.
  - The quote gives `pointsBalance` and the rules; `POST /v1/me/orders` takes `expectedPointsSpent`, checked like the wallet's. What an order earns is fixed when it is placed and given when it is delivered (by the store, a pickup, or the delivery man); a rejected order gives its points back.
  - Orders carry `pointsSpent` and `pointsPaid`; the delivery man's "تحصيل النقود" leaves out what points paid.
  - `GET|PATCH /v1/admin/settings/points`; `POST /v1/admin/customers/:id/points` (422 POINTS_BALANCE over the balance); both recorded in سجل التغييرات.
- **Dashboard:** الإعدادات › النقاط with the three fields and an example; العملاء shows each customer's points and adds or deducts them with a reason; the store's details and the admin's الطلبات show what points paid.
- **App:**
  - نقاطي as in the photo: the orange card with رصيد النقاط, the bar to the minimum, "باقي <n> نقطة للاستبدال", قيمة نقاطك and الحد الأدنى للاستبدال; المكتسبة / المنفقة with "لا توجد نقاط مكتسبة".
  - حسابي: نقاطي beside محفظتي. الرئيسية: "استخدم ووفر" with نقاطي and المحفظة, as in the photo.
  - إتمام الدفع: a نقاطي row under رصيد المحفظة with its switch, "<n> نقطة = <amount>", or "باقي <n> نقطة للاستبدال" in red with the switch off; switched on, "المدفوع بالنقاط" shows in the summary.
  - The order details (customer, store, delivery man) show what points paid.
- **[Open]**
  - المنفقة's empty state, the movement rows and the checkout's points row are not captured.
  - The dashboard's النقاط page (not captured).
- **[Derived]**
  - The defaults: 10 ج.م earn a point and a point pays 0.10 ج.م (1% back); 100 points to spend (owner's default).
  - Points pay the items before the fee when working out what earns.
  - What an order earns is fixed when placed; a rejected order gives its points back; the admin's deduction never goes below 0.
  - "يمكنك استبدال نقاطك الآن" once the minimum is reached.
- **Phone verification:**
  - With no points, نقاطي shows 0, "باقي 100 نقطة للاستبدال", 0.00 ج.م and "لا توجد نقاط مكتسبة"; حسابي and الرئيسية open it.
  - Order 170 ج.م of items for delivery and have it delivered: 17 points come in المكتسبة.
  - The admin adds 1000 points: checkout shows "1000 نقطة = 100.00 ج.م"; switched on, the summary takes them, and the delivery man's "تحصيل النقود" is the rest.
  - The store rejects such an order: the points come back.

## Phase 19: Invite friends

Contract §8.17: codes, rewards with their limits and expiry, monthly cap, friends list, share sheet and WhatsApp.

Owner's answers before the phase (2026-11-26):
- Tawsilty's rules, as admin settings: the inviter gets 300 ج.م (at most 30 an order, 30 days) once the friend's first order is delivered; the friend gets 25 ج.م at sign-up (30 days) and must get a first order within 30 days; invite money pays restaurant and market orders only.
- The monthly cap is in ج.م: 1000 ج.م of rewards a month.
- Expiry is a switch in the settings.

- **Migration 0018:** `invite_settings` (one row with Tawsilty's numbers), `invites` (inviter, friend, waiting / rewarded / missed, the reward), `invite_credits` (each piece of invite money: what is left, the per-order limit, the expiry), `invite_credit_uses` (what an order took, so a rejection puts it back); `orders.invite_paid`; the wallet's reasons gain the invite reward, the welcome money and expiry.
- **Shared (TDD):** `walletPlan` (invite money first, the soonest to expire first, each piece within its per-order limit, restaurant and market orders only, then the regular balance), `inviteRewardFor` (the month's cap), `firstOrderInTime`, `inviteExpiry`, `inviteSettingsProblem`, `INVITE_DEFAULTS`; the overview shapes; the audit action `settings.invites`.
- **API:**
  - Sign-up with a code keeps the invite and gives the friend the welcome money.
  - A friend's first delivered order (by the store, a pickup, or the delivery man), within the days, gives the inviter the reward up to what the month allows; otherwise the invite is missed. One step after every delivery does this and the points.
  - The checkout quote's `walletBalance` is what the wallet can pay on this order; placing takes invite money piece by piece and records `invitePaid`; a rejection puts it back on its pieces.
  - Expired invite money leaves the wallet with its own row, when a wallet is read or every hour; with the switch off it never expires.
  - `GET /v1/me/invite` (the code, the rules, ربحت, رصيدك المتاح, what the month still allows, the friends); `GET|PATCH /v1/admin/settings/invites`, recorded in سجل التغييرات; the home card's amounts come from the settings.
- **Dashboard:** التسويق والعروض › مكافآت الدعوة with every amount, the days and the expiry switch; the store's details show "المدفوع من رصيد دعوة الأصدقاء" in red.
- **App:**
  - ادعُ أصدقاءك as in the photos: the orange card with the reward, رمز دعوتك with نسخ, واتساب and مشاركة; ربحت and رصيدك المتاح (opening the wallet); "كيف تعمل الدعوة؟" with the admin's rules (without the days when nothing expires) and "متبقٍ لك <n> مكافآت هذا الشهر."; the friends, or "لم يسجّل أحد برمزك بعد".
  - حسابي: the orange invite card with رمزك and مشاركة, as in the photo; الرئيسية's invite card opens ادعُ أصدقاءك.
  - حركة المحفظة names the invite rows; the order details show what invite money paid.
- **[Open]**
  - The friends' rows, the shared message's wording and the dashboard page (not captured).
- **[Derived]**
  - Invite money pays before the regular balance, the soonest to expire first.
  - A reward the month's cap leaves at 0 counts as missed; a partial one is paid.
  - Friends show by first name only.
  - The admin's deduction takes regular money first, then invite money.
  - The month is Cairo's calendar month.
- **Phone verification:**
  - Customer A shares the code by WhatsApp; customer B signs up with it: B's wallet shows 25 ج.م as "رصيد دعوة صديق"; A's ادعُ أصدقاءك lists B as "بانتظار أول طلب".
  - B's first order is delivered: A gets 300 ج.م ("مكافأة دعوة صديق"), ربحت shows 300, and "متبقٍ لك 700 مكافآت هذا الشهر.".
  - A orders from a restaurant with the wallet on: only 30 of the 300 is taken; from a pharmacy none of it is.

## Phase 20: Offers, coupons and banners

Contract §8.2 and §8.10: offer banners, the mart banner with its product row, offer tiles, coupons, offers grouped by the customer's coupon, "عروض التوصيل" and "خصومات" filters; dashboard management.

Owner's answers before the phase (2026-11-26):
- Vouchers (قسائم) and checkout coupons are one kind of code: one naming a store shows in its قسائمي sheet; any code can be typed at checkout.
- Who pays a discount (the app or the store) is set per offer.
- The admin sets how often a customer may use a code, and an optional total for everyone.
- The admin alone makes offers, codes and banners; stores cannot.
- A code takes a fixed amount or a percentage with an optional cap.
- A product discount is a new price per product, with the old price struck through.
- At checkout the code comes first, then the wallet, then points, then cash.
- A banner opens a store, or the store's products as one grid (the mart banner).

- **Migration 0019:** `coupons` (the code as typed and as matched, its store or none, amount or percentage, cap, minimum, dates, uses per customer and in all, who pays, on/off), `coupon_uses` (one per order; a rejection deletes it), `banners` (image, carousel or rail, store, what it opens, order, on/off); `products.old_price` and `discount_paid_by`; `stores.free_delivery_from` and `free_delivery_paid_by`; on `orders` the code, its discount and payer, the waived delivery fee and its payer, and the product discounts the app pays; audit targets for codes, banners and products.
- **Shared (TDD):** `couponDiscount`, `couponProblem` (not found, other store, below the minimum, used, used up), `couponInputProblem`, `normalizeCode`, `deliveryDiscount`, `productSaving`, `discountRange`, `storeItemsBase` (what the store is paid on, by who pays each discount), `hasOffer`; the `خصومات` and `عروض التوصيل` filters; `formatDay` ("30 نوفمبر 2026").
- **API:**
  - `GET|POST /v1/admin/coupons`, `PATCH|DELETE /v1/admin/coupons/:id` (a code matching another however it is typed is 409 `COUPON_CODE_TAKEN`); `GET|POST /v1/admin/banners`, `PATCH|DELETE /v1/admin/banners/:id`; `PUT /v1/admin/products/:id/discount`; the store's free delivery on `PATCH /v1/admin/stores/:id`. Each change is in سجل التغييرات. A partner's product form refuses an old price.
  - Every store a customer sees carries its offers: its newest own code, its free delivery and its product discounts. The store page adds قسائمي: the codes that work there now, its own first, then the app's.
  - `GET /v1/catalog/offers?kind=&scope=` lists the stores with that kind of offer; `/v1/catalog/stores` takes `discounts` and `freeDelivery`.
  - `GET /v1/catalog/home` adds the active banners of visible stores; a rail brings the store's first 10 products.
  - The quote and the order take `couponCode`: a code that cannot be used is 422 with its reason; placing locks the code, so a limited code's last use goes once. Free delivery waives the fee and the quote shows the usual one. The store is paid on its full prices less what it pays itself; points are earned on the items less the code.
- **Dashboard:** التسويق والعروض › البنرات, الكوبونات والقسائم and خصومات المنتجات; the store form's توصيل مجاني; the store's order details show "خصم الكوبون".
- **App:**
  - الرئيسية: "العروض والكوبونات" (three tiles opening the offers screen on their tab), the banner carousel with its dots, and the rails with their products' "+".
  - The offers screen as in the photos: the orange header following the tab, خصومات · كوبونات · عروض التوصيل and الكل · مطاعم · متاجر أخرى.
  - Store rows: the lime discount, the green free delivery and the voucher badge; free delivery on every order strikes the fee through beside "مجاني". The chips خصومات and عروض التوصيل.
  - The store page: the voucher, free-delivery and discount cards; قسائمي with copy; the market's "العروض" rail with "وفر …" and the struck old price; one grid for "عرض الكل" and "عرض المنتجات".
  - Checkout: "وفر على طلبك" with تطبيق and "من فضلك أدخل الكوبون أولا"; "خصم الكوبون" in the summary; the usual fee struck through on a free delivery. The order details show the code's discount.
- **[Open]**
  - The dashboard pages, the code error texts and "المزيد من المعلومات" (not captured; it shows the rule).
  - Tawsilty's coloured store sections ("الأكثر طلبًا 🔥") and the market's themed rails are not built.
  - "Offers grouped by the customer's coupon" is read as the كوبونات tab: the stores with their own codes.
- **[Derived]**
  - The row's voucher is the store's newest own code; codes for every store show only in قسائمي.
  - Free delivery from 0 is every order; it counts the items after product discounts, before the code.
  - A store-paid free delivery costs the store the fee only when the app's captains deliver.
  - "صالح حتى" ends at the end of that day in Cairo.
  - An applied code reads "إزالة"; a code that stops working is taken off with its reason.
- **Phone verification:**
  - The admin adds a carousel banner and a rail for the mart: الرئيسية slides the banner, the rail shows the products, and the rail's banner opens them as one grid.
  - The admin makes "Black Friday" (6 ج.م from 150 ج.م) for a store: its row shows the voucher badge; its page shows the card; قسائمي copies the code; at checkout it takes 6 ج.م off, and a second order is told it was used.
  - The admin sets free delivery from 300 ج.م and an old price on one product: the row shows both badges, the product shows "وفر …", and an order of 300 ج.م has the fee struck through.

## Phase 21: Lucky wheel

**Excluded for now** (contract §15.1 #10). Skipped until the owner says otherwise.

Contract §8.2: one spin a day, prizes (points or coupons) from the dashboard.

## Phase 22: Pharmacy

Contract §8.11: prescription and product-photo requests, the "اختر صيدلية" sheet, and checkout before the price is known (the 2026-11-26 capture showed there is no step where the customer confirms a price).

Owner's answers before the phase (2026-11-26):
- The pharmacy types the medicine price when it taps "قبول" (app and `/partner`). That fixes the order's total, the app's share and what the delivery man pays the store, and the customer gets a notice with the price.
- On a request the wallet may pay the delivery fee; the medicine is cash on delivery. Codes and points are not offered on requests.

- **Migration 0021:** on `orders`, `request_kind` (prescription or product), `request_image`, `request_text` and `priced_at`.
- **Shared (TDD):** `PharmacyRequest`, `OrderRequest` (with `priced`), `requestComplete` (a photo or a text), `REQUEST_IMAGE_PATTERN`, `parseRequestPrice` (Latin or Arabic digits, two decimals at most), `requestPricedNotice`. Customer, partner and admin orders carry `request`.
- **API:**
  - `POST /v1/me/uploads` (customers): the request's photo, kept at up to 1600 px under an unguessable name.
  - The quote and the order take `request` (`storeId`, `kind`, `image`, `text`) instead of `cartId`: an open, active pharmacy; a delivery; items 0; no minimum order and no free delivery; a code is 400; points are 400 on placing. The order has no lines.
  - `POST /v1/partner/orders/:id/accept` takes `{ price }`: required for an unpriced request (422 `ORDER_PRICE_REQUIRED`), refused on an order of products. It sets the items total, the total, the app's share, what the store is owed and the points earned, then sends "تم قبول طلبك" with the price and the total.
  - Fixed on the way: the delivery and points settings reads looped forever when their row was missing and two requests added it at once (a read in a transaction kept its old snapshot). The reread is now a locking read.
- **App (customer):** the pharmacies page's "سهلنا الطلب عليك" card (توصيل فوري, 30 - 60 دقيقة, روشتة طبية, صورة المنتج); "اختر صيدلية (<n>)" with "التالي" per pharmacy and "لا توجد صيدليات حالياً"; "الروشتة" with the camera box, "اختر الصورة" (التقط صورة · اختر من المعرض), "أو", "اكتب طلبك" and the red "يرجى رفع صورة او كتابة طلبك"; checkout with the red "سيتم إعلامك بسعر الطلب من قبل الصيدلية", the fees only, the wallet and no code or points; the order shows the request, and offers no "اطلب تاني".
- **App (partner) and `/partner`:** the popup and the order details show the request (its kind, its photo full size on tap, its text) instead of products, and "سعر الطلب" before "قبول".
- **[Open]**
  - The partner side of a request, the price notice wording and the "صورة المنتج" screen title are not captured.
  - The delivery man's screens show a request as an order with no lines.
  - Tawsilty's limit for "اكتب طلبك" is not captured; 500 characters [Derived].

## Phase 23: Send anything

Contract §8.12: no new screens. Seed an "اطلب دليفري" store with one 1 ج.م product; make sure the cart note reaches the driver and the store's orders.

Owner's answer before the phase (2026-11-26): an "اطلب دليفري" order has nothing to prepare and no store staff, so it goes straight to the delivery men.

- **Already there:** the seed's "اطلب دليفري" store (courier, no minimum, open all day, "موتوسيكل" with the 1 ج.م "اطلب دليفري" and its terms), given the zone and a spot like every seeded store; the cart note on the store's orders, the dashboard's الطلبات and the delivery man's order.
- **API:** a delivery from a courier store is placed as "تم التجهيز" and offered to every working delivery man at once (socket and push), skipping قبول and تم التجهيز; any other store still waits for the store. Offers carry the customer's note.
- **App:** the delivery man's offer shows "ملاحظات العميل" with the note in red.
- **[Derived]** The customer's order starts at "تم التجهيز", with the review and preparing steps already done.

## Phase 24: Driver: history and fines

Contract §10: order history with a date range, totals and complaints; fines with reasons; dashboard fines.

Moved here from Phase 18 [Owner, 2026-11-26]: the delivery man's speed points (minutes per km, levels set by the admin, paid in cash) and his نقاطي tile. And from Phase 13: his own fee values (§8.7) and his earnings.

Owner's answers before the phase (2026-11-26):
- فواتيري is his net earnings: delivery earnings plus speed points cash, less fines.
- The admin adds fines (amount, reason, maybe an order) and may delete one; the delivery man is told.
- Speed points are a balance until the admin taps "تم الصرف" when he pays them in cash; the balance starts again and the payout is listed.
- The native date picker (`@react-native-community/datetimepicker`) may be installed; the next phone check needs a new dev build.

- **Migration 0022:** on `orders`, `taken_at`, `driver_fee`, `minutes_per_km` and `driver_points`; on `drivers`, his own `base_fee`, `base_km`, `per_km`; on `driver_settings`, `speed_levels` and `point_value`; the tables `driver_fines` and `driver_payouts`; the `driver_fine` notice.
- **Shared (TDD):** `minutesPerKm`, `speedPoints` (the fastest level reached), `isSpeedLevels`, `driverEarning` (his own rule on the order's distance, else the fee before a free delivery), `isFeeRuleOrNull`, `netEarnings`, `isDayString`, `cairoDayRange` (Cairo days; the earlier day first), `fineProblem`.
- **API:**
  - Taking an order (قبول, or the admin's 🛵) fixes his earning and the time; delivering it gives his speed points from the admin's levels.
  - `GET /v1/driver/history?from=&to=`: his delivered, cancelled or rejected orders placed in those Cairo days, with the items count, the earning on a delivered one, اجمالى الارباح and عدد الطلبات المكتملة.
  - `GET /v1/driver/money` (فواتيري) and `GET /v1/driver/points` (نقاطي).
  - `PUT /v1/admin/drivers/:id/fee`, `GET /v1/admin/drivers/:id/money`, `POST` and `DELETE /v1/admin/drivers/:id/fines`, `POST /v1/admin/drivers/:id/payouts` (409 `NO_POINTS` without a balance; his row is locked so two taps pay once); each in سجل التغييرات.
  - `PATCH /v1/admin/settings/drivers` takes `speedLevels` (up to 10) and `pointValue`.
  - `POST /v1/me/tickets` takes delivery men too: a complaint names one of his orders; the admin's list says who sent it.
- **App:** حسابي as in the photo: فواتيري (net, green) and نقاطي tiles; العمل › نوبات عملي and سجل الطلبات; الدعم والمساعدة › تقديم مقترح and تقديم شكوى. "طلباتى" as in the photo: the two date boxes (the phone's date dialog), the outlined blue "بحث", the cards (code, status pill, store, "الاجمالى", the red "تقديم شكوى" opening a complaint about that order, the date in English, "+ <earning>" in green) and the grey panel. فواتيري: the net, what makes it, and الخصومات والغرامات. نقاطي: the balance and its value, the levels, the orders and payouts.
- **Dashboard:** المندوبين gets a الرسوم column and two actions: "حساب" (his net and what makes it, "تم الصرف", "إضافة خصم" with an optional order code, the fines with delete) and "رسوم" (his own fee rule). نوبات العمل والقواعد gets نقاط السرعة (levels and the point value). الشكاوى والاقتراحات marks a delivery man's ticket "مندوب".
- **[Derived]**
  - طلباتى opens on 1 January to today, as in the photo; the list changes on "بحث" only. The date is when the order was placed; a stopped order's card has the photo's pale orange band.
  - Amounts show two decimals like the rest of the app (the photo shows "25.0").
  - An order taken before this phase earns the fee the customer was asked for and no speed points.
  - Speed is from his taking the order (or the admin giving it to him) to تم التوصيل, over the store-to-customer line.
- **[Open]** The fine notice wording and the dashboard pages are not captured. In Tawsilty فواتيري opens nothing and نقاطي is the customer's points screen; ours keep their pages [Derived].
- **Rebuilt 2026-11-26:** طلباتى starts on today, reads "لا يوجد طلبات" when empty, and a card opens the order without the step button; "مدفوعة مسبقاً" when nothing is to be collected [Derived]; a complaint about an order asks "ما هو شكواك لطلب رقم …#" (customer too).
- **Phone verification (new dev build):**
  - As the admin, set speed levels and a point value; give one delivery man his own fee.
  - Deliver an order quickly: نقاطي goes up; فواتيري adds the earning and the points.
  - Fine him with a reason: the push arrives; فواتيري lists it and takes it off. "تم الصرف" in the dashboard empties نقاطي.
  - سجل الطلبات: pick the dates in the phone's dialog, "بحث", the totals; "تقديم شكوى" on a card reaches الشكاوى والاقتراحات marked "مندوب".

## Phase 25: Admin: overview and reports

Contract §11: الرئيسية overview and التقارير.

## Phase 26: Release

Brand assets, store listings, Android and iOS builds, release checks on real phones.

Brand applied early (owner, 2026-11-26; contract §6, §15.1 #8):
- The name وصّل / Wassal, `com.wassal.app`, the scheme `wassal://`; phones set to Arabic show وصّل under the icon. The Expo slug stays `tawsela` (it names the push project; only the owner sees it).
- [Open] The Google Maps key: the owner has no card for Google Cloud billing yet; the map shows its stand-in until then.
- The logo's rust replaces Tawsilty's orange in the app and the dashboard.
- The icon, Android adaptive icon (with its monochrome layer), splash and favicons are cut from the owner's 1254 px PNG (`docs/brand/`). iOS uses the plain icon until there is a vector for an Icon Composer one.
- The welcome screen and the dashboard sign-in show the Arabic logo; the sidebar shows the mark. [Open] English screens show the word "Wassal" until the English logo comes.
- Still to come: the English logo and a vector file (then redraw every icon), the footer credit, the store accounts.
- A new dev build is needed to see the new icon, splash, name and package; the new package installs beside the old app.

## Phase 27: Codebase folder layout

Contract §5, Code layout. Use the existing test suites after all four steps. The demo is outside this phase.

1. Mobile. Organize feature APIs, components, screens and hooks by responsibility.
2. API. Put module request DTOs in `dto/` and module guards in `guards/`.
3. Dashboard. Use the same feature folders as mobile. Route entry points live in `src/app/`.
4. Shared. Move unit tests to `test/unit/` and keep the build scoped to `src/`.

Build, lint, typecheck and all 346 unit tests passed. The mobile and dashboard end-to-end suites passed. The API run passed 207 of 208 tests, with one five-second timeout. All four tests in that file passed on an isolated retry with the original timeout. Verification for this phase was automated.

## Rework from the capture 2026-11-26

The phone showed that some guesses were wrong. The contract now follows Tawsilty; the code still has to change. Each item reopens its phase's phone check.

**Done (2026-11-26):**
- Several carts, one per store (contract §8.6). Migration 0020 makes a cart unique per customer and store. `GET /me/carts` lists them, `DELETE /me/carts` empties them all, and `GET /me/carts/:storeId` and `POST /me/carts/:storeId/validate` work on one store's cart. The quote takes `cartId`. The replace dialog, `CART_STORE_CONFLICT` and `replaceCartId` are gone. The السلة tab is "سلاتي", and a store's cart opens at `/cart/<storeId>`. "اطلب تاني" fills that store's cart beside the others.
- Items from a closed store go in the cart; "تابع للدفع" says "عذراً الخدمة مغلقة الآن".
- The first item of a store's cart shows the dark toast "تمت الاضافة الى السلة".
- "قد تعجبك أيضًا" lists the store's first ten products, those already in the cart too, each with its "+".
- Tapping a count badge does nothing; it still takes the tap, so the product behind it does not open.
- A store closed by its hours shows "يفتح الساعة 11:00 ص" on its cover (`opensAt` on every store the apps read, null while open or closed by the switch); "مغلق" sits on its logo.
- Closed stores' pictures are greyscale on Android. [Derived] React Native has no greyscale filter on iOS, so iOS keeps the dark shade.
- An unknown code reads "الكود الذى أدخلته غير صحيح"; code errors show in the dark toast.
- The empty المنفقة tab reads "استبدل نقاطك بخصومات على طلباتك".
- "مشاركة التطبيق" under التطبيق opens the phone's share sheet. [Open] Tawsilty's shared text is not captured; ours reads "جرّب تطبيق توصيلة لطلب الأكل والبقالة والأدوية." until the app's store links exist (§15.1 #8).

Kept on purpose (owner or client decisions): no رسوم الخدمة (§8.7, also on pharmacy requests), the language row (§7, client).
