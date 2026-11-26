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
| 13 | Driver: shifts, offers and skips | 🔍 in-verify | none (driver home and current orders marked [Open], #9) |
| 14 | Order status and the delivered view (live tracking out of scope) | 🔍 in-verify | none (the active order view marked [Open]) |
| 15 | Ratings, complaints and support | 🔍 in-verify | none (good chips and star words marked [Open]) |
| 16 | Notifications and push (Expo push) | 🔍 in-verify | none (Expo project made; real pushes need a workflow-built app and FCM) |
| 17 | Wallet (top-up excluded for now) | 🔍 in-verify | none (movement rows and the العملاء page marked [Open]) |
| 18 | Points | ⬜ | none (#4 decided) |
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
  - `POST /v1/me/orders/:id/reorder` (`replaceCartId` optional): the order's lines back in the cart with their choices, added like "+" (up to the quantity limit). Lines gone from the menu or whose choices changed are left out and counted (`skipped`); none left is `CART_ITEM_UNAVAILABLE`. Another store's cart needs the customer's yes (`CART_STORE_CONFLICT`); a closed store is `CART_STORE_CLOSED`; an order still running is `ORDER_STATUS`.
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
  - The Expo project exists (2026-11-26); its ID is in `app.config.ts`. Real pushes need an app built by the GitHub workflows (not Expo Go) and, on Android, Firebase (FCM) set up.
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
