# Tawsela (توصيلة): project contract

This is the single source of truth for what Tawsela is, what it does and how it is built.

**Rules for this file**

1. Anything new (a feature, screen, endpoint, table, rule or tool) is added here **before** it is built, or in the same commit.
2. If the code and this file disagree, this file wins. Either fix the code, or change this file on purpose in the same commit.
3. Removing or changing an agreed item means editing it here and adding a line to the [change log](#17-change-log).
4. **Tawsilty is the reference.** The look, the flows and the rules follow the Tawsilty (توصيلتي) apps by ZTechX exactly. We do not invent features. The only additions are the ones the client asked for (tagged [Client]).
5. Source tags used below:
   - **[Tawsilty]**: seen in the real Tawsilty app (screenshots in `.impeccable/phone/`, git-ignored because they show personal data)
   - **[Client]**: asked for by the client on WhatsApp (22–23 Nov 2026)
   - **[Demo]**: built in `apps/demo`, simulated on the device
   - **[Open]**: not decided yet; decide before building it
   - **[Needed]**: not seen in Tawsilty and not asked for, but required so the admin can run a feature that is (dashboard only)

---

## Contents

1. [Product](#1-product)
2. [Users and roles](#2-users-and-roles)
3. [Platforms and repository](#3-platforms-and-repository)
4. [Tech stack](#4-tech-stack)
5. [Working rules](#5-working-rules)
6. [Brand and design](#6-brand-and-design)
7. [Language, numbers and formats](#7-language-numbers-and-formats)
8. [Features: customer](#8-features-customer)
9. [Features: partner (store)](#9-features-partner-store)
10. [Features: driver](#10-features-driver)
11. [Features: admin dashboard](#11-features-admin-dashboard)
12. [Data model](#12-data-model)
13. [API](#13-api)
14. [Non-functional requirements](#14-non-functional-requirements)
15. [Open decisions and out of scope](#15-open-decisions-and-out-of-scope)
16. [Reference material](#16-reference-material)
17. [Change log](#17-change-log)

---

## 1. Product

**Tawsela (توصيلة)** is a delivery app for Egypt: order from restaurants, dessert shops, supermarkets and pharmacies, or ask a driver to deliver anything. It is a full copy of **Tawsilty (توصيلتي)** by ZTechX (Play Store: `com.ztechx.TawsiltyEgypt`, and the partners app "شركاء توصيلتي"), plus the client's changes.

- Market: Egypt. Currency is EGP (`ج.م`). Arabic first.
- Verticals on the home screen [Tawsilty]: المطاعم (restaurants), حلويات و desserts, اطلب دليفري (send anything, tagged "سريع"), صيدليات (pharmacies). Supermarkets ("مارت") are reached from a banner [Client].
- Stores are called **موردين** (suppliers) and drivers **مندوبين** / **كابتن** in Tawsilty's own words; the UI keeps those words.

### 1.1 Module map

Every feature module of the product. Each one is detailed in the section shown and built in the phase shown (`docs/phases.md`).

**Mobile app: customer**

| # | Module | What it covers | § | Source | Phase |
|---|---|---|---|---|---|
| C1 | Sign-up and sign-in | Phone, 4-digit OTP, personal details with invite code, phone + password sign-in, forgot password | 8.1 | Tawsilty | 1 |
| C2 | Home | Address header, rotating search, vertical tiles, invite card | 8.2 | Tawsilty, Client | 5 |
| C3 | Store lists | Per-vertical lists, cuisine circles, filter chips, sort and rating sheets, closed and empty states, order again | 8.3 | Tawsilty, Client | 6 |
| C4 | Search | Tabs all / restaurants / other stores, results | 8.13 | Tawsilty | 6 |
| C5 | Store page and products | Cover, info row, categories, product grid or list, product sheet, minimum-order bar, favourite | 8.4, 8.5 | Tawsilty, Client | 7 |
| C6 | Addresses and map | Saved addresses, map picker, address form, delivery-zone check | 8.9 | Tawsilty | 8 |
| C7 | Cart | Lines, upsell, note, payment summary, pickup where allowed | 8.6 | Tawsilty, Client | 9 |
| C8 | Checkout and payment | Location confirm on the map, delivery fee, payment method, coupon, place order | 8.7 | Client, Open | 10 |
| C9 | Orders | Orders list, live tracking, delivered details view, reorder | 8.8 | Tawsilty, Client | 13 |
| C10 | Ratings | Stars, good/bad suggestion chips, written reason | 8.8 | Client | 14 |
| C11 | Support | Order problem → ticket, suggestion, complaint (general or past order), contact us | 8.8, 8.14 | Tawsilty, Client | 14 |
| C12 | Notifications | Notification list, push, notification and SMS settings | 8.14 | Tawsilty | 15 |
| C13 | Wallet | Balance, additions and deductions, e-wallet top-up, pay with wallet | 8.15 | Tawsilty | 16 |
| C14 | Points | Balance, progress to redeem, earned and spent, redeem | 8.16 | Tawsilty | 17 |
| C15 | Invite friends | Code, share, rewards and their limits, friends list | 8.17 | Tawsilty | 18 |
| C16 | Offers and coupons | Offer banners, mart banner, offer tiles, coupons, offers by coupon | 8.2, 8.10 | Client | 19 |
| C17 | Lucky wheel | One spin a day, prizes | 8.2 | Client | 20 |
| C18 | Pharmacy | Prescription and product-photo requests, choose a pharmacy, pharmacy list | 8.11 | Tawsilty, Client | 21 |
| C19 | Send anything | Courier list and order form | 8.12 | Tawsilty, Open | 22 |
| C20 | Favourites | Favourite stores | 8.14 | Tawsilty | 7 |
| C21 | Account and profile | Account screen, profile, language, about, terms, privacy, share app, delete account, sign out | 8.14 | Tawsilty, Client | 1 |

**Mobile app: partner (store)**

| # | Module | What it covers | § | Source | Phase |
|---|---|---|---|---|---|
| P1 | Sign-in | Phone + password generated by the admin; no sign-up; reset by the admin | 2, 9 | Tawsilty, Client | 1 |
| P2 | Orders | Live incoming orders, accept, prepare, ready for pickup, details, previous orders with count | 9 | Tawsilty | 11 |
| P3 | Products | Search, category tabs, availability toggle per product | 9 | Tawsilty | 11 |
| P4 | Notifications | Notification list and push | 9 | Tawsilty | 15 |
| P5 | Account | Profile, orders-made count (no bell toggle), sign out | 9 | Tawsilty, Client | 11 |
| P6 | Reports | Daily totals | 9 | Demo, Open | 24 |

**Mobile app: driver**

| # | Module | What it covers | § | Source | Phase |
|---|---|---|---|---|---|
| D1 | Sign-in | Phone + password generated by the admin; no sign-up; reset by the admin | 2, 10 | Client | 1 |
| D2 | Shifts | Scheduled shifts, start unlocks 30 min before, end, extend | 10 | Client | 12 |
| D3 | Offers and dispatch | Incoming offer, accept or skip, skip warning and temporary suspension | 10 | Client | 12 |
| D4 | Active delivery | Store and customer details, items, money to pay and collect, steps to delivered | 10 | Client | 12 |
| D5 | Order history | Date range, totals, complaint per order (replaces earnings) | 10 | Client | 23 |
| D6 | Fines and deductions | Each deduction with amount, reason, date and order | 10 | Client | 23 |
| D7 | Notifications | Notification list and push | 10 | Client | 15 |
| D8 | Account | Profile, documents, sign out | 10 | Demo | 12 |

**Mobile app: admin** (§11.2)

| # | Module | What it covers | § | Source | Phase |
|---|---|---|---|---|---|
| M1 | Sign-in | Admin phone + password; lands on accounts | 2 | Client | 1 |
| M2 | Accounts | List and search partner and driver accounts; create (password shown once, copy, share), reset password, disable | 11.2 | Client | 4, 12 |

**Shared across the mobile app**

| # | Module | What it covers | Phase |
|---|---|---|---|
| S1 | App shell | Role-based tabs after sign-in (customer, partner, driver, admin), splash, theme tokens, Alexandria font | 0 |
| S2 | Language | Arabic RTL default, English LTR, formatters | 0 |
| S3 | Live updates | socket.io for order status and driver location | 11 |
| S4 | Push | Push tokens and delivery | 15 |

**Web dashboard: partner area** (`/partner`, §11.1). Same powers as the partner's mobile modules P2–P6.

| # | Module | What it covers | Source | Phase |
|---|---|---|---|---|
| W1 | Sign-in | The admin-generated phone + password; lands on `/partner` | Client | 3 |
| W2 | Orders | Live incoming orders, accept, prepare, ready, details, previous orders | Client | 11 |
| W3 | Products | Categories, products, prices, images, availability | Client | 11 |
| W4 | Store | Hours, open/closed now, cover (§11.1) | Client | 11 |
| W5 | Reports | The store's sales and orders | Client | 24 |

**Web dashboard: admin area** (sidebar groups as in the Tawsilty admin, §11)

| # | Group | Module | What it covers | Source | Phase |
|---|---|---|---|---|---|
| A1 | الرئيسية | Overview | Today's orders, sales, active drivers, open complaints | Tawsilty | 24 |
| A2 | الطلبات | Orders | Table with status tabs (قيد المراجعة, قيد التجهيز, جارية التوصيل, …), flags (بدون كابتن, عميل, ملاحظات), assign driver, notify, edit, details and timeline | Tawsilty | 10–13 |
| A3 | العملاء | Customers | List, profile, orders, block | Tawsilty | 14 |
| A4 | العملاء | Complaints and suggestions | الشكاوى والاقتراحات, order-problem tickets, replies | Tawsilty, Client | 14 |
| A5 | العملاء | Wallet and points adjustments | Add or deduct with a reason | Needed | 16–17 |
| A6 | الموردين | Stores | Store details, type, product layout, pickup allowed, fees, minimum order, hours, cover, open/closed; **generate the partner account** (password shown once), reset password, disable | Tawsilty, Client | 4 |
| A7 | المندوبين | Drivers | **Generate the driver account** (password shown once), reset password, disable; documents, live status | Tawsilty, Client | 12 |
| A8 | المندوبين | Shifts and rules | Shift schedules, unlock time, skip warning and suspension rules, extend time | Client | 12 |
| A9 | المندوبين | Fines | Add a fine with a reason; driver sees it | Client | 23 |
| A10 | المنتجات والكتالوج | Store products | Products per store, categories, images, prices | Tawsilty | 4 |
| A11 | المنتجات والكتالوج | Inactive products | منتجات غير فعالة: switched-off products | Tawsilty | 4 |
| A12 | المنتجات والكتالوج | Home tiles and cuisines | Vertical tiles (order, image, badge), cuisine circles | Client | 4 |
| A13 | التسويق والعروض | Interactive notifications | الإشعارات التفاعلية: push campaigns | Tawsilty | 15 |
| A14 | التسويق والعروض | Banners | Offer banners, the mart banner and its target store | Client | 19 |
| A15 | التسويق والعروض | Coupons and offers | Coupons, exclusive offers, delivery offers | Client | 19 |
| A16 | التسويق والعروض | Lucky wheel | Prizes and their odds | Client | 20 |
| A17 | التسويق والعروض | Invite rewards | Reward amounts, limits, monthly cap | Needed | 18 |
| A18 | التقارير | Reports | Sales, orders, stores, drivers | Tawsilty | 24 |
| A19 | الإعدادات | Zones and delivery fees | Delivery areas, fee rules | Needed | 8, 10 |
| A20 | الإعدادات | Service hours | When the service is open (the "الخدمة مغلقة" toast) | Needed | 9 |
| A21 | الإعدادات | Points rules | Earn rate, value, minimum to redeem | Needed | 17 |
| A22 | الإعدادات | App content | About text, terms, privacy, contact numbers, WhatsApp, social links | Needed | 14 |
| A23 | الإعدادات | Admins | Admin accounts and sign-in | Needed | 3 |

---

## 2. Users and roles

| Role | Who | Where | Can |
|---|---|---|---|
| **Customer** | Signs up with their phone | Mobile app | Browse, order, track, rate, complain, wallet, points, invite friends |
| **Partner** | A restaurant or store (مورد). Account generated by an admin, no sign-up | Same mobile app **and** the partner area of the web dashboard (`/partner`) | Handle incoming orders, manage products and availability, see past orders, reports and notifications |
| **Driver** | A delivery driver (مندوب). Account generated by an admin, no sign-up | Same mobile app | Work shifts, accept or skip offers, pick up and deliver, see order history and fines |
| **Admin** | Tawsela team | Web dashboard (admin area), and the mobile app for accounts | Everything in §11 on the web. In the mobile app: create partner and driver accounts, reset their passwords, disable them (§11.2) |

Rules:

- **One mobile build holds all four roles**: customer, partner, driver and admin (decided 2026-11-23). After sign-in, the account's role picks the screens and the tab bar.
- One account has one role.
- Tawsilty publishes the partner side as a separate store listing. Tawsela ships one app instead, on the client's request.
- **Partner and driver accounts are generated by an admin** (decided 2026-11-23) [Client]:
  - The admin creates the account from the dashboard (A6 stores, A7 drivers) or from the mobile app (M2) with the person's name and phone. The system generates the password and shows it once, so the admin can hand the credentials over.
  - Partners and drivers sign in with those credentials (phone + password) in the mobile app; partners can also sign in to the web dashboard's partner area.
  - The admin can reset the password (a new one is generated and shown once) and disable the account. There is no self sign-up and no self-service "forgot password" for these roles; a forgotten password is reset by the admin.
- **One web dashboard, two areas** (decided 2026-11-23) [Client]: `apps/web` serves the admin area and the partner area (`/partner`). The signed-in account's role decides which area opens; a partner only ever sees their own store's data.

---

## 3. Platforms and repository

- **Mobile** for customers, partners and drivers: phone layout, portrait.
- **Web dashboard** for admins and partners: desktop, Arabic RTL.
- One pnpm + Turborepo monorepo: `github.com/ahmedgamalalzatary/lamha-app` (public).

| Path | Package | Purpose | Dev port |
|---|---|---|---|
| `apps/web` | `@tawsela/web` | Web dashboard: the admin area and the partner area (`/partner`). Next.js 16 + Tailwind 4 | 3000 |
| `apps/demo` | `@tawsela/demo` | The clickable web demo (reference for flows the client already approved) | 3001 |
| `apps/mobile` | `@tawsela/mobile` | The real app: Expo SDK 58 + Expo Router, iOS and Android | 3002 |
| `apps/api` | `@tawsela/api` | The backend: NestJS 12, MySQL through Drizzle | 4000 (tests 4001) |
| `packages/shared` | `@tawsela/shared` | Enums, labels, API types and formatters used by all apps. Built to `dist/` first | |
| `packages/tsconfig` | `@tawsela/tsconfig` | Shared TypeScript configs | |
| `docs/` | | This contract and the phases | |

---

## 4. Tech stack

The same setup as the owner's Maqar project, so both are run the same way.

| Area | Choice |
|---|---|
| Package manager | pnpm 12 (pinned in the root `package.json`) |
| Monorepo tasks | Turborepo 2: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e` |
| Language | TypeScript, strict. Node 22 or newer |
| Mobile | Expo SDK 58, Expo Router (`src/app` holds routes only), React Native 0.88, React 19.3, React Compiler, typed routes. Packages installed with `npx expo install` |
| Mobile libraries | `@tanstack/react-query`, `zustand` + AsyncStorage, `expo-secure-store` (tokens), `expo-image`, `react-native-maps` (Google Maps, as Tawsilty), `expo-location`, `expo-notifications`, `expo-image-picker` (pharmacy photos), `expo-haptics`, `react-native-svg`, `lucide-react-native`, Reanimated + Gesture Handler |
| Dashboard | Next.js 16 (App Router), Tailwind 4, React Query |
| API | NestJS 12 (ESM) with `@nestjs/config`, `@nestjs/swagger`, `class-validator`, JWT + passport, argon2, throttler, helmet, `@nestjs/schedule` (shifts, timers), `@nestjs/websockets` + socket.io (live orders and driver location), `sharp`, `nestjs-pino`, `date-fns` + `@date-fns/tz` (Africa/Cairo) |
| Database | MySQL 8, Drizzle ORM, `drizzle-kit` migrations |
| Tests | API: vitest (`test/unit`, `test/e2e` with supertest against `tawsela_test`). Mobile: Jest + `jest-expo` + React Native Testing Library (`test/unit`, `test/ui`). Dashboard and shared: vitest |
| Lint | API and shared: oxlint. Mobile: ESLint 9 + `eslint-config-expo`. Dashboard: ESLint 9 + `eslint-config-next` |
| Production | Docker Compose on a server (see §15.1 #6), nginx with Let's Encrypt in front |

---

## 5. Working rules

- Commit straight to `main`. Commit and push only when asked.
- Commit messages: a short imperative subject and a body that says what and why.
- `pnpm build lint typecheck test` must pass before pushing.
- **One `.env` at the repo root** is used by every app. Tests use the root `.env.test`. Both are git-ignored; `.env.example` lists every variable.
- **Test first, only where it matters:** business rules (order states, shift and skip rules, fees, wallet, points, coupons), guards, formatters, and each screen's main flow. Not plumbing.
- **Code layout.** API: `src/modules/<feature>/`, plus `src/core` and `src/common`. Mobile: `src/features/<feature>/` (`api/`, `hooks/`, `components/`, `screens/`), `src/core`, `src/components`, and `src/app` for routes only. Dashboard: `src/app` routes, `src/features/<feature>/`.
- Database changes only through Drizzle migrations.
- The phone screenshots and the client's WhatsApp export never go into git.
- `.env` holds only secrets and values that change between machines. Fixed rules (OTP, token lifetimes, rate limits) live in `packages/shared/src/constants.ts`.

### 5.1 App identity, builds and signing

- **Identity in one place:** `apps/mobile/app.config.ts`, the `IDENTITY` block (name, Arabic name, slug, scheme, package/bundle ID, brand colour). Every value is a placeholder until the client decides (§15.1 #8). The ID can never change once the app is on a store.
- **Version:** `VERSION` in the same file, raised for each store release. The **build number** is the commit count on `main`, set by CI (`APP_BUILD_NUMBER`), so every upload is higher than the last.
- **Builds run only when started by hand** (GitHub Actions, `workflow_dispatch`). A push never builds.

| Workflow | Output | Notes |
|---|---|---|
| Android APK (`android-apk.yml`) | `tawsela-<n>.apk`, signed | For phones. The API URL comes from the `api_url` input, else the `EXPO_PUBLIC_API_URL` repo variable, else the emulator's local address |
| Android AAB (`android-aab.yml`) | `tawsela-<n>.aab`, signed | For Google Play. Refuses to build without an `https` production API URL |
| iOS archive (`ios-archive.yml`) | `.xcarchive` + unsigned `.ipa` | Signed later by whoever owns the Apple Developer account |

- **Android signing:** our own upload key (RSA 4096, alias `upload`), generated on 2026-11-23 into the git-ignored `keys/` folder (`upload.jks` + `upload.properties` with the passwords). Back that folder up outside the repo. Upload certificate SHA-256: `5F:A8:16:3C:0A:24:24:E9:23:F5:38:05:54:B6:72:2E:D9:92:33:71:E9:64:09:0F:19:4A:B3:0B:87:BC:CF:05`.
- On GitHub the key lives only in repo secrets: `ANDROID_UPLOAD_KEYSTORE_BASE64` (the `.jks` as base64), `ANDROID_UPLOAD_STORE_PASSWORD`, `ANDROID_UPLOAD_KEY_ALIAS`, `ANDROID_UPLOAD_KEY_PASSWORD`. The config plugin `apps/mobile/plugins/with-release-signing.js` signs release builds from those values; without them a local release build falls back to the debug key.
- `android/` and `ios/` are generated by `expo prebuild` and never committed or edited by hand.

---

## 6. Brand and design

**Everything visual follows Tawsilty** (decided 2026-11-23): colours, type, spacing, components and flows. The values below were measured from the real app's screenshots. A value marked "verify" is checked against the app again before Phase 0 ends.

### 6.1 Colours [Tawsilty]

| Token | Value | Used for |
|---|---|---|
| `primary` | `#F68B1D` | Buttons, active tab, links, prices in the cart, selected radio |
| `primary-700` | `#DB760F` | Pressed state, active tab icon |
| `primary-400` | `#F8A24A` | Header gradient start, search icon tile, empty-state icons |
| `primary-50` | `#FEF3E8` | Soft cards (invite card), icon tiles |
| `primary-100` | `#FDE6D0` | Soft card borders |
| `header` | gradient `#F8A24A` → `#F38920` | Home header behind the address and search |
| `bg` | `#FFFFFF` | Screens |
| `bg-warm` | `#F8F5EF` | Cart "قد تعجبك أيضًا" band (wavy top edge) |
| `surface` | `#F9FAFB` | Cards on white (wallet, points tiles) |
| `input` | `#F2F3F7` | Text fields, search box on inner pages |
| `ink` | near black (verify) | Titles, prices |
| `ink-2` | grey (verify) | Secondary text, placeholders |
| `success` | `#46B66F` | "التوصيل متاح لهذا الموقع", verified phone, wallet additions |
| `danger` | red (verify) | Error toast, delete actions, account delete, validation messages |
| `info` | blue (verify) | Values in the store info row (time, "توصيلتي") |
| `chip-selected` | dark navy (verify) | Selected address type chip |

Dark mode: Tawsilty has none; Tawsela has none.

### 6.2 Type [Tawsilty]

- Arabic font: **Alexandria** (geometric, squarish; verify against the app's font file). Latin digits are used for prices and phone numbers ("285.00 ج.م", "01554459196").
- Sizes seen: screen titles ~24, section titles ~19, list titles ~16, body ~14, captions ~12.

### 6.3 Components and patterns [Tawsilty]

- **Tab bar**, 4 tabs for customers: الرئيسية · السلة · طلباتي · حسابي. Active tab is `primary` icon and label.
- **Bottom sheets** with a grabber: address list, sort, rating filter, contact us, note, complaint type, e-wallet amount, pharmacy picker.
- **Radio sheets** for sort and rating filters (checked radio is a filled orange circle with a tick).
- **Filter chips** row, scrollable: رتب حسب ▾ · خصومات · عروض التوصيل · التقييم ▾ · توصيل سريع · الاستلام.
- **Empty states**: big soft-orange circle with an icon, a bold title and a grey line. Used for no stores, no orders, empty cart, no favourites, no notifications, wallet tabs, points tabs.
- **Primary button**: full-width, rounded, orange; disabled state is a faded orange (OTP) or grey (map confirm).
- **Error toast**: red pill near the bottom ("عذراً الخدمة مغلقة الآن").
- **Confirm dialog**: white card, title, message, "إلغاء" text button and a red action pill ("حذف").
- **Store "closed"** state: greyscale cover and a dark "مغلق" pill.
- **Footer credit** on the account screen: "تمت البرمجة بواسطة شركة ZTechX". Tawsela replaces it with its own (see §15.1 #8).

---

## 7. Language, numbers and formats

- Arabic RTL is the default. English is offered from a language switch on the account screen [Client: "عايز اللغة تبان من بره"]. All UI text exists in both.
- Money: `285.00 ج.م` (two decimals, Latin digits) [Tawsilty].
- Phone numbers: Egyptian mobile, shown with `+2` and the flag; OTP is 4 digits [Tawsilty].
- Times: minutes for delivery time ("25 دقيقة"), ranges for pharmacy ("30 - 60 دقيقة").
- Time zone: Africa/Cairo.

---

## 8. Features: customer

### 8.1 Sign-up and sign-in [Tawsilty]

1. Enter phone number.
2. **OTP**: 4 boxes, "أرسلنا رمز التحقق إلى +2 …", "تغيير الرقم" link, resend after a 00:59 countdown, "تأكيد" disabled until 4 digits.
3. **التفاصيل الشخصية**: phone (locked), first name and family name (100 chars each), email (optional), password (8+ characters: letters, numbers or symbols), and an optional **invite code** box ("ستحصل على 25 ج.م في محفظتك… يُستخدم خلال 30 يومًا"). Links to terms and privacy. "متابعة".
4. Returning users sign in with phone + password. "نسيت كلمة المرور؟" resets by OTP.

### 8.2 Home

- [Tawsilty] Orange header: "التوصيل إلى **<address label>**" with a chevron (opens the address sheet), and a search box.
- [Client] The search placeholder rotates: "ابحث عن **بيتزا** / **المطاعم** / **الأكلات المفضلة** / **أفضل العروض** …" (Tawsilty does this too).
- [Tawsilty] Vertical tiles: square images with labels and an optional badge ("سريع"). [Client] Their **order and images are set by the admin**.
- [Tawsilty] Invite card: "اربح 300 ج.م عن كل صديق — وصديقك يحصل على 25 ج.م فور تسجيله", dismissible ✕.
- [Client] Auto-sliding **offer banners** managed by the admin.
- [Client] A **banner that opens the mart (or any chosen store) directly**, with a row of its products.
- [Client] **Lucky wheel** (عجلة الحظ): one spin a day; prizes set by the admin.
- [Client] Categories are not shown on the home screen; banners take their place.
- [Client] Discounts are not shown as a flat badge; offers are grouped by the customer's coupon (§8.10).

### 8.3 Store lists (per vertical) [Tawsilty]

- Top bar: back, "التوصيل إلى <address>", cart button.
- Search box scoped to the vertical ("ابحث عن المطاعم").
- Cuisine circles (restaurants only): بروست · اكل صحى · باستا · كبده … (admin-managed). Selected circle gets an orange ring.
- "<n> المتاجر" count, filter chips (§6.3), sort sheet: الافتراضي · الأقرب إليك · الأعلى تقييماً · الأحدث; rating sheet: الكل · 3.0+ · 3.5+ · 4.0+ · 4.5+.
- Store row: cover image (greyscale + "مغلق" when closed), name, rating or "جديد", time, delivery fee.
- Empty: "لا توجد متاجر متاحة — لم نجد متاجر قريبة منك حالياً، جرّب تغيير الموقع أو البحث مرة أخرى".
- [Client] "اطلب من جديد" (order again) row on the restaurants list only; not on the home screen.

### 8.4 Store page [Tawsilty]

- Cover image with back, search and favourite buttons; status pill ("مغلق"); logo, name, rating.
- Info row: مدة التوصيل (25 دقيقة) · رسوم التوصيل (80 ج.م) · التوصيل بواسطة (توصيلتي → Tawsela, or the store itself).
- "الأقسام" grid of the store's categories with images.
- Category page: title, product search, product grid (image, + button, quantity badge, name, price).
- Bottom bar: minimum order progress "تسوّق الآن وأضف 50.00 ج.م أو أكثر إلى طلبك!" with a lock icon; turns into "عرض السلة · <count> · <total>" once items are added.
- [Client] The product layout (list or grid) is set per store type by the admin (restaurants list, markets and pharmacies grid).
- [Client] A store can have its own background/cover inside the store page.

### 8.5 Product sheet [Tawsilty]

Full-width image, ✕ close, name, quantity stepper (− 1 +), "أضف للسلة <price>". Options and add-ons: [Open] (none seen; the only open store had none).

### 8.6 Cart (السلة) [Tawsilty]

- Header "سلة المشتريات" + store name.
- Lines: image with a stepper (trash icon at 1, with a "حذف المنتج" confirm dialog), name, price.
- "قد تعجبك أيضًا…" upsell row from the same store.
- "دوّن ملاحظة" note sheet (200 characters, "تم").
- "ملخص الدفع": عدد المنتجات, مجموع المنتجات, الإجمالي, and "سيتم احتساب التوصيل في الخطوة التالية".
- Buttons: "أضف المزيد" and "تابع للدفع". If the service is closed: red toast "عذراً الخدمة مغلقة الآن".
- Empty: "سلتك فارغة — أضف منتجات من المطاعم والمتاجر", "تصفح المنتجات".
- [Client] The customer **confirms the delivery location on a map before placing the order**.
- [Client] **Store pickup** (استلام من المحل) is offered only for stores the admin allows.

### 8.7 Checkout and payment [Open]

Not seen yet (the service was closed during capture). To be filled from new screenshots: delivery fee step, payment methods (cash, wallet, card?), coupon entry, order placement.

### 8.8 Orders (طلباتي)

- [Tawsilty] List of orders; empty "لا توجد طلبات — ابدأ بطلب منتجاتك المفضلة الآن".
- Live order tracking: [Open] (not seen yet).
- [Client] Once an order is **delivered**, the customer no longer sees the tracking; they see a plain details view (items, totals, address, store).
- [Client] "اطلب تاني" (reorder) lives only inside طلباتي, not as a one-tap button outside.
- [Client] **Rating** after delivery: stars, then suggestion chips that change with the star count (good vs. bad), plus "أخبرنا المزيد" text for the reason.
- [Client] **Problem with an order** opens a support ticket ("تواصل مع الدعم الفني"); money is never refunded automatically from the app.

### 8.9 Addresses [Tawsilty]

- Saved addresses sheet: label, "شارع، مبنى، شقه - المنطقة", selected tick, "تعديل" and "حذف", and "التوصيل إلى عنوان آخر — اختر موقع على الخريطة".
- Map picker: Google Map, layers button, "تخطي", banner when location services are off ("خدمة الموقع غير مفعّلة… تفعيل"), centre pin, "قرّب الخريطة لتحديد الموقع بدقة", the plus code of the spot, and "تأكيد الموقع" disabled until zoomed in enough.
- Address form (عنوان جديد / تعديل العنوان): mini map, "الموقع" with "تعديل" and "التوصيل متاح لهذا الموقع" (green) when inside a delivery zone, type chips شقة · مكتب · فيلا, building name (optional), apartment number, floor (optional), street (optional), mobile number with +2, **landmark (required)** with the error "يرجى إدخال علامة مميزة للعنوان", "تعيين كعنوان افتراضي" toggle (the first address is set automatically), "حفظ العنوان".

### 8.10 Offers and coupons [Client]

- Offer tiles: عروض حصرية لك · استخدم كوبون · عروض التوصيل, each opening a filtered offers list.
- Offers are grouped by the coupon the customer holds.

### 8.11 Pharmacy [Tawsilty]

- "سهلنا الطلب عليك" card with "توصيل فوري" and "30 - 60 دقيقة", and two actions: **روشتة طبية** (upload a prescription) and **صورة المنتج** (photo of a product).
- Both first open "اختر صيدلية (<n>)" sheet; empty "لا توجد صيدليات حالياً".
- Below: the pharmacies list with the same filters as §8.3.
- [Client] The pharmacy page follows this layout exactly.

### 8.12 Send anything (اطلب دليفري) [Open]

A list of courier "stores" in the same layout as §8.3 (empty in the captured area). The order form is not seen yet.

### 8.13 Search [Tawsilty]

Tabs الكل · مطاعم · متاجر أخرى. Empty "ابحث عن الأكلات والأماكن المفضلة 🍔 — اكتب اسم الأكلة أو البائع للعثور على ما تريده بسرعة". While typing: "ابحث عن «…»" row. Results: [Open] (none in the area).

### 8.14 Account (حسابي) [Tawsilty]

- Header: bell (notifications), avatar, name, "عرض الملف الشخصي".
- Tiles: محفظتي (balance) and نقاطي (points).
- Invite card: "اربح 300 ج.م عن كل صديق", code with copy, "مشاركة".
- **الدعم والمساعدة**: تقديم مقترح · تقديم شكوى (menu: طلب سابق → pick from طلباتي / عامة → form) · التواصل معنا (sheet with phone numbers).
- **الحساب**: إعدادات حسابي · إعدادات الإشعارات · الخدمات المفضلة · عناويني.
- **التطبيق**: عن التطبيق · مشاركة التطبيق · شروط الاستخدام · سياسة الخصوصية · حذف الحساب (red).
- "تسجيل الخروج" (red soft button).
- [Client] Language switch visible on this screen (§7).
- [Client] "اعملي حساب العميل زي ابلكيشن توصيلتي بظبط": the account screen matches Tawsilty exactly.

Sub-screens [Tawsilty]:
- **الملف الشخصي**: avatar with camera, full name (locked), phone with "تغيير", email, gender ذكر/أنثى, region (locked).
- **إعدادات الإشعارات**: "تفعيل الإشعار" and "ايقاف رسائل SMS من التطبيق" toggles with explanations.
- **المفضلة**: favourite stores; empty "لا توجد خدمات مفضلة".
- **الإشعارات**: list; empty "لا توجد إشعارات".
- **عن توصيلتي**: logo, description, "تواصل معنا عبر واتساب", social links (Facebook, Twitter, Instagram, YouTube).
- **تقديم اقتراح / تقديم شكوى**: illustration, one text field, "ارسال".

### 8.15 Wallet (حركة المحفظة) [Tawsilty]

Orange balance card ("0.0 ج.م"), "شحن المحفظة"; tabs الإضافات / الخصومات with their empty states. Top-up: "حدد طريقة الشحن" → محفظة الكترونية → amount sheet (min 10, max 10,000 ج.م) → "تأكيد البيانات" → payment provider [Open].

### 8.16 Points (نقاطي) [Tawsilty]

Orange card: balance, progress bar, "باقي <n> نقطة للاستبدال", قيمة نقاطك (EGP value) and الحد الأدنى للاستبدال (240 نقطة). Tabs المكتسبة / المنفقة. Points are earned per order. Earn and redeem rates: [Open].

### 8.17 Invite friends (ادعُ أصدقاءك) [Tawsilty]

Code with copy, WhatsApp and share buttons; ربحت / رصيدك المتاح; "كيف تعمل الدعوة؟" (share code → friend signs up → both rewarded); rules: you get 300 ج.م at most 30 ج.م per order, valid 30 days; friend gets 25 ج.م valid 30 days and must receive their first order within 30 days of signing up; invite credit is only for restaurant and store orders; "متبقٍ لك 1000 مكافآت هذا الشهر"; list of friends who joined.

---

## 9. Features: partner (store)

From the "شركاء توصيلتي" store listing [Tawsilty] and the client's requests:

A partner manages their store from **two places with the same powers** [Client]: the mobile app, and the partner area of the web dashboard (`/partner`, §11.1).

- Sign in with the phone + password the admin generated (§2); no sign-up. A forgotten password is reset by the admin.
- Tabs: الرئيسية · المنتجات · الإشعارات · حسابي.
- **Orders**: current and previous ("السابقة" with a count), each with total and "التفاصيل". Accept, prepare, ready for pickup.
- **Products** (المنتجات): search, category tabs, each product with image, name, price and an **availability toggle**.
- **Account**: [Client] no bell toggle there; instead a "الطلبات اللي اتعملت" row with the count of orders made.
- Reports: [Demo] daily totals. Exact Tawsilty screen: [Open].

---

## 10. Features: driver

Tawsilty's driver app is not public; these rules come from the client [Client] and the demo [Demo].

- **Sign-in** with the phone + password the admin generated (§2); no sign-up. A forgotten password is reset by the admin.
- **Shifts**: the driver cannot start work at any time. The admin sets shift times; the "ابدأ الشفت" button unlocks **30 minutes** before the shift starts.
- When the shift ends, the driver gets no new orders unless they **extend the shift** (by 60 minutes).
- **Skips**: skipping offers is counted. After **2** skips the driver gets a warning notification; after **3** they are **suspended for 15 minutes**. (The numbers are admin settings; confirm the defaults with the client.)
- **Order offer and details**: store name and address, customer name, phone and address, items with prices, what to pay the store and what to collect. Steps: accept → at the store → "خارج للتوصيل" → delivered.
- **Order history** (سجل الطلبات) with a date range and totals, and a complaint button per order. It replaces the earnings screen.
- **Fines and deductions** (الخصومات والغرامات): every deduction with its amount, reason, date and order, so the driver always knows why money was taken.
- **Account**: profile, documents, logout.

---

## 11. Features: admin dashboard

Layout follows the Tawsilty admin (`admin.talbatelfayoum.com`, same platform) [Tawsilty]: a right-hand sidebar with search ("ابحث عن شاشة…") and these sections. The client may add more.

| Section | Pages |
|---|---|
| الرئيسية | Overview |
| الطلبات | Orders table: tabs قيد المراجعة · قيد التجهيز · جارية التوصيل · … ; columns code (#504578), …, actions (assign driver, notify, edit). Flags on a row: "بدون كابتن" (no driver), "عميل" (customer note), "ملاحظات" |
| العملاء | Customers; الشكاوى والاقتراحات (complaints and suggestions) |
| الموردين | Stores: details, type (restaurant, market, pharmacy, courier), product layout (list/grid) [Client], pickup allowed [Client], fees, minimum order, hours, cover/background [Client] |
| المندوبين | Drivers: accounts, shifts and schedules [Client], skip rules [Client], fines [Client], live status |
| المنتجات والكتالوج | منتجات الموردين (store products), منتجات غير فعالة (inactive products) |
| التسويق والعروض | الإشعارات التفاعلية (push campaigns); banners [Client], home tiles order and images [Client], mart banner target [Client], coupons and offers [Client], lucky wheel prizes [Client], invite rewards |
| التقارير | Reports |
| الإعدادات [Needed] | Zones and delivery fees, service hours, points rules, invite rewards, app content (about, terms, privacy, contact numbers, social links), admin accounts |

The full list of dashboard modules, with sources and phases, is in §1.1.

**Account creation** (الموردين and المندوبين): "إضافة" creates the partner or driver account with name and phone; the generated password is shown once with a copy button; "إعادة تعيين كلمة المرور" generates a new one; an account can be disabled (§2).

### 11.1 Partner area (`/partner`) [Client]

The restaurant's own part of the web dashboard. Same look as the admin area, its own sidebar, and only the signed-in partner's store:

| Page | What it covers |
|---|---|
| الطلبات | Live incoming orders, accept, prepare, ready for pickup, details, previous orders |
| المنتجات | Categories and products, prices, images, availability on/off |
| المتجر | Opening hours, open/closed now, cover |
| التقارير | The store's sales and orders |
| الحساب | Profile and sign out |

**What a partner may edit** (decided 2026-11-23), the same in the mobile app and in `/partner`:

| Partner edits | Only the admin sets |
|---|---|
| Opening hours, open/closed now, cover image, product prices, product availability (and products and categories) | Delivery fee, minimum order, store type, product layout, pickup permission, delivered by, zone |

### 11.2 Admin in the mobile app [Client]

An admin who signs in to the mobile app gets one area only: **accounts**. It lists partner and driver accounts with search, and offers the same actions as the dashboard: create a partner or driver account (name, phone, and for a partner the store it belongs to), show the generated password once with copy and share, reset the password, disable or enable. Everything else stays on the web dashboard.

---

## 12. Data model

First draft; each phase finalises its tables.

- `users` (phone, password hash, name, email, gender, region, role, locale, invite code, invited_by), `otp_codes`, `refresh_tokens`
- `addresses` (label, type, building, apartment, floor, street, landmark, phone, lat/lng, is_default)
- `zones` (delivery areas)
- `verticals` (home tiles: label, image, badge, order, target)
- `stores` (vertical, name, logo, cover, rating, delivery time, fee, minimum order, delivered_by, layout, pickup_allowed, hours, zone, status), `store_categories`, `products` (price, image, unit, is_active), `cuisines`
- `carts`, `cart_lines`
- `orders` (customer, store, driver, address, mode delivery/pickup, status, totals, fee, note, coupon, payment method), `order_lines`, `order_events` (status history)
- `ratings` (stars, tags, text)
- `tickets` (complaints, suggestions, order problems)
- `wallet_transactions` (add/deduct, reason), `points_transactions`, `invites`
- `coupons`, `offers`, `banners`, `wheel_prizes`, `wheel_spins`
- `prescriptions` (pharmacy uploads)
- `drivers` (vehicle, documents, status), `shifts`, `shift_sessions`, `skips`, `suspensions`, `fines`
- `notifications`, `push_tokens`, `campaigns`
- `settings` (one row per admin setting, e.g. shift rules)

---

## 13. API

REST under `/v1`, Swagger at `/docs`, socket.io for live order status and driver location. Modules follow the features: `auth`, `me`, `addresses`, `catalog` (verticals, stores, products, search), `cart`, `orders`, `ratings`, `support`, `wallet`, `points`, `invites`, `marketing` (banners, coupons, offers, wheel), `pharmacy`, `partner`, `driver` (shifts, offers, skips, fines), `notifications`, `admin/*`. Endpoints are listed in each phase.

---

## 14. Non-functional requirements

- Arabic RTL first; every screen works in English LTR too.
- Cold start under 3 s on a mid-range Android; lists scroll at 60 fps.
- Loading, empty and error states on every screen (Tawsilty's empty-state pattern, §6.3).
- Prices and totals are computed on the server; the app never trusts its own totals.
- Rate limits on sign-in, OTP and invite routes.
- Personal data (phones, addresses) only shown to the people who need it (the driver sees the customer's phone only during an active order).

---

## 15. Open decisions and out of scope

### 15.1 Open decisions

| # | Decision | Blocks |
|---|---|---|
| 1 | SMS provider for OTP | Phase 1 |
| 2 | Payment methods at checkout and the e-wallet top-up provider | Checkout, wallet |
| 3 | Delivery fee rules (per store, per distance, per zone) | Checkout |
| 4 | Points earn rate and EGP value | Points |
| 5 | Exact shift, skip and suspension defaults (2 / 3 / 15 min / 60 min extend) | Driver shifts |
| 6 | Production server and domain (Biscofa VPS or a new one) | Deploy |
| 7 | Push provider (Expo push vs. FCM directly) | Notifications |
| 8 | App identity, asked of the client: name (ZTechX already publishes apps named "توصيلة" and "توصيلتي"), package/bundle ID (`com.<company>.<app>`), logo (to be designed; the icon, adaptive icon and splash come from it), footer credit, and who owns the Google Play and Apple developer accounts | Store release; until then placeholders in `app.config.ts` |
| 9 | Screens not captured yet: checkout, tracking, order details, options/add-ons, partner and driver apps, admin pages | Their phases |

### 15.2 Out of scope (until this file says otherwise)

- Dark mode.
- Tablet and desktop layouts for the mobile app.
- Ride-hailing (ZTechX's other "توصيلة" app).

---

## 16. Reference material

- `.impeccable/phone/`: 65 Tawsilty screenshots (customer app, sign-up, address, Play Store pages). Git-ignored.
- `whatsapp-export/`: the client's requests with pictures. Git-ignored.
- `apps/demo`: the approved clickable demo.
- Tawsilty admin photo: sidebar and orders table (§11).

---

## 17. Change log

| Date | Change |
|---|---|
| 2026-11-23 | First version. One mobile build for all three roles; design follows Tawsilty; ports 3000 (dashboard), 3001 (demo), 3002 (mobile), 4000 (API). |
| 2026-11-23 | §5.1 added: identity in `app.config.ts` (placeholders), manual-only build workflows, our own Android upload key. §15.1 #8 widened to the full app identity. |
| 2026-11-23 | §1.1 module map added: 21 customer, 6 partner, 8 driver, 4 shared and 23 dashboard modules, each with its section, source and phase. New tag [Needed]. |
| 2026-11-23 | Partner and driver accounts are generated by an admin (password shown once, reset by the admin, no sign-up). Partners manage their store from the mobile app and from the web dashboard's partner area `/partner` (§11.1, modules W1–W5). |
| 2026-11-23 | Admins can also create, reset and disable partner and driver accounts from the mobile app (§11.2, modules M1–M2); the app now has four roles. What a partner may edit is decided (§11.1). Repo renamed to `lamha-app`. |
