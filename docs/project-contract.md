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
| C1 | Sign-up and sign-in | Phone and email, 4-digit code by email (no SMS), personal details with invite code, phone + password sign-in, forgot password by email code | 8.1 | Tawsilty, Owner | 1 |
| C2 | Home | Address header, rotating search, vertical tiles, invite card | 8.2 | Tawsilty, Client | 5 |
| C3 | Store lists | Per-vertical lists, cuisine circles, filter chips, sort and rating sheets, closed and empty states, order again | 8.3 | Tawsilty, Client | 6 |
| C4 | Search | Tabs all / restaurants / other stores, results | 8.13 | Tawsilty | 6 |
| C5 | Store page and products | Cover, info row, categories, product grid or list, product sheet, minimum-order bar, favourite | 8.4, 8.5 | Tawsilty, Client | 7 |
| C6 | Addresses and map | Saved addresses, map picker, address form, delivery-zone check | 8.9 | Tawsilty | 8 |
| C7 | Cart | Lines, upsell, note, payment summary, pickup where allowed | 8.6 | Tawsilty, Client | 10 |
| C8 | Checkout and payment | Address, now or scheduled slot, wallet toggle, cash on delivery only (e-wallet and card excluded for now), coupon code, place order (no service fee, owner 2026-11-25); location confirm on the map | 8.7 | Tawsilty, Client | 11 |
| C9 | Orders | Orders list, order status (live tracking out of scope), delivered details view, reorder | 8.8 | Tawsilty, Client | 14 |
| C10 | Ratings | Stars, good/bad suggestion chips, written reason | 8.8 | Client | 15 |
| C11 | Support | Order problem → ticket, suggestion, complaint (general or past order), contact us | 8.8, 8.14 | Tawsilty, Client | 15 |
| C12 | Notifications | Notification list, push, notification settings (no SMS toggle, since no SMS is sent) | 8.14 | Tawsilty | 16 |
| C13 | Wallet | Balance, additions and deductions, pay with wallet (e-wallet top-up excluded for now) | 8.15 | Tawsilty | 17 |
| C14 | Points | Balance, progress to redeem, earned and spent, redeem | 8.16 | Tawsilty | 18 |
| C15 | Invite friends | Code, share, rewards and their limits, friends list | 8.17 | Tawsilty | 19 |
| C16 | Offers and coupons | Offer banners, mart banner, offer tiles, coupons, offers by coupon | 8.2, 8.10 | Client | 20 |
| C17 | Lucky wheel | **Excluded for now** (owner, 2026-11-23). One spin a day, prizes | 8.2 | Client | 21 |
| C18 | Pharmacy | Prescription and product-photo requests, choose a pharmacy, pharmacy list | 8.11 | Tawsilty, Client | 22 |
| C19 | Send anything | A normal store with a 1 ج.م "اطلب دليفري" product; the need goes in the note | 8.12 | Tawsilty | 23 |
| C20 | Favourites | Favourite stores | 8.14 | Tawsilty | 7 |
| C21 | Account and profile | Account screen, profile, language, about, terms, privacy, share app, delete account, sign out | 8.14 | Tawsilty, Client | 1 |

**Mobile app: partner (store)**

| # | Module | What it covers | § | Source | Phase |
|---|---|---|---|---|---|
| P1 | Sign-in | Phone + password generated by the admin; no sign-up; reset by the admin | 2, 9 | Tawsilty, Client | 1 |
| P2 | Orders | New orders list, accept/reject popup with payment method, order details with call, money breakdown and "استلم من المندوب", "تم التجهيز", طلباتى by status | 9 | Tawsilty, Client | 12 |
| P3 | Products | Search, category tabs, availability toggle per product | 9 | Tawsilty | 12 |
| P4 | Notifications | Notification list and push | 9 | Tawsilty | 16 |
| P5 | Account | Profile, orders-made count (no bell toggle), sign out | 9 | Tawsilty, Client | 12 |
| P6 | Reports | Daily totals | 9 | Demo, Open | 25 |

**Mobile app: driver**

| # | Module | What it covers | § | Source | Phase |
|---|---|---|---|---|---|
| D1 | Sign-in | Phone + password generated by the admin; no sign-up; reset by the admin | 2, 10 | Client | 1 |
| D2 | Shifts | Scheduled shifts, start unlocks 30 min before, end, extend | 10 | Client | 13 |
| D3 | Offers and dispatch | Incoming offer, accept or skip, skip warning and temporary suspension | 10 | Client | 13 |
| D4 | Active delivery | Store and customer details, items, money to pay and collect, steps to delivered | 10 | Client | 13 |
| D5 | Order history | Date range, totals, complaint per order (replaces earnings) | 10 | Client | 24 |
| D6 | Fines and deductions | Each deduction with amount, reason, date and order | 10 | Client | 24 |
| D7 | Notifications | Notification list and push | 10 | Client | 16 |
| D8 | Account | Profile, documents, sign out | 10 | Demo | 13 |

**Mobile app: admin** (§11.2)

| # | Module | What it covers | § | Source | Phase |
|---|---|---|---|---|---|
| M1 | Sign-in | Admin phone + password; lands on accounts | 2 | Client | 1 |
| M2 | Accounts | List and search partner and driver accounts; create (password shown once, copy, share), reset password, disable | 11.2 | Client | 4, 13 |

**Shared across the mobile app**

| # | Module | What it covers | Phase |
|---|---|---|---|
| S1 | App shell | Role-based tabs after sign-in (customer, partner, driver, admin), splash, theme tokens, Alexandria font | 0 |
| S2 | Language | Arabic RTL default, English LTR, formatters | 0, 9 |
| S3 | Live updates | socket.io for order status and driver location | 12 |
| S4 | Push | Push tokens and delivery | 16 |

**Web dashboard: partner area** (`/partner`, §11.1). Same powers as the partner's mobile modules P2–P6.

| # | Module | What it covers | Source | Phase |
|---|---|---|---|---|
| W1 | Sign-in | The admin-generated phone + password; lands on `/partner` | Client | 3 |
| W2 | Orders | Live incoming orders, accept, prepare, ready, details, previous orders | Client | 12 |
| W3 | Products | Categories, products, prices, images, availability | Client | 12 |
| W4 | Store | Hours, open/closed now, cover (§11.1) | Client | 12 |
| W5 | Reports | The store's sales and orders | Client | 25 |

**Web dashboard: admin area** (sidebar groups as in the Tawsilty admin, §11)

| # | Group | Module | What it covers | Source | Phase |
|---|---|---|---|---|---|
| A1 | الرئيسية | Overview | Today's orders, sales, active drivers, open complaints | Tawsilty | 25 |
| A2 | الطلبات | Orders | Table with status tabs (قيد المراجعة, قيد التجهيز, جارية التوصيل, …), flags (بدون كابتن, عميل, ملاحظات), assign driver, notify, edit, details and timeline | Tawsilty | 11–14 |
| A3 | العملاء | Customers | List, profile, orders, block | Tawsilty | 15 |
| A4 | العملاء | Complaints and suggestions | الشكاوى والاقتراحات, order-problem tickets, replies | Tawsilty, Client | 15 |
| A5 | العملاء | Wallet and points adjustments | Add or deduct with a reason | Needed | 17–18 |
| A6 | الموردين | Stores | Store details, type, product layout, pickup allowed, fees, minimum order, hours, cover, open/closed; **generate the partner account** (password shown once), reset password, disable | Tawsilty, Client | 4 |
| A7 | المندوبين | Drivers | **Generate the driver account** (password shown once), reset password, disable; documents, live status | Tawsilty, Client | 13 |
| A8 | المندوبين | Shifts and rules | Shift schedules, unlock time, skip warning and suspension rules, extend time | Client | 13 |
| A9 | المندوبين | Fines | Add a fine with a reason; driver sees it | Client | 24 |
| A10 | المنتجات والكتالوج | Store products | Products per store, categories, images, prices | Tawsilty | 4 |
| A11 | المنتجات والكتالوج | Inactive products | منتجات غير فعالة: switched-off products | Tawsilty | 4 |
| A12 | المنتجات والكتالوج | Home tiles and cuisines | Vertical tiles (order, image, badge), cuisine circles | Client | 4 |
| A13 | التسويق والعروض | Interactive notifications | الإشعارات التفاعلية: push campaigns | Tawsilty | 16 |
| A14 | التسويق والعروض | Banners | Offer banners, the mart banner and its target store | Client | 20 |
| A15 | التسويق والعروض | Coupons and offers | Coupons, exclusive offers, delivery offers | Client | 20 |
| A16 | التسويق والعروض | Lucky wheel | Prizes and their odds | Client | 21 |
| A17 | التسويق والعروض | Invite rewards | Reward amounts, limits, monthly cap | Needed | 19 |
| A18 | التقارير | Reports | Sales, orders, stores, drivers | Tawsilty | 25 |
| A19 | الإعدادات | Zones and delivery fees | Delivery areas, fee rules | Needed | 8, 11 |
| A20 | الإعدادات | Service hours | When the service is open (the "الخدمة مغلقة" toast) | Needed | 10 |
| A21 | الإعدادات | Points rules | Earn rate, value, minimum to redeem | Needed | 18 |
| A22 | الإعدادات | App content | About text, terms, privacy, contact numbers, WhatsApp, social links | Needed | 15 |
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
| API | NestJS 12 (ESM) with `@nestjs/config`, `@nestjs/swagger`, `class-validator`, JWT + passport, argon2, throttler, helmet, `@nestjs/schedule` (shifts, timers), `@nestjs/websockets` + socket.io (live orders and driver location), `sharp`, `nodemailer` (sign-in codes by Gmail SMTP), `nestjs-pino`, `date-fns` + `@date-fns/tz` (Africa/Cairo) |
| Database | MySQL 8, Drizzle ORM, `drizzle-kit` migrations |
| Tests | API: vitest (`test/unit`, `test/e2e` with supertest against `tawsela_test`). Mobile: Jest + `jest-expo` + React Native Testing Library. Dashboard and shared: vitest. In every app `test` runs `test/unit` (no database, every core) and `test:e2e` runs `test/e2e` (the real API on the app's test database, one file at a time) |
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
| `ink` | `#1F1F1F` | Titles, prices |
| `ink-2` | `#8A8A8A` | Secondary text, placeholders |
| `success` | `#46B66F` | "التوصيل متاح لهذا الموقع", verified phone, wallet additions |
| `danger` | `#F44336` | Error toast, delete actions, account delete, validation messages |
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
- **Empty states**: two soft-orange circles (pale outer, light inner) with an orange icon, a bold title and a grey line. Used for no stores, no orders, empty cart, no favourites, no notifications, wallet tabs, points tabs.
- **Primary button**: full-width, rounded, orange; disabled state is a faded orange (OTP) or grey (map confirm).
- **Toasts**: red pill for errors ("عذراً الخدمة مغلقة الآن", "يرجى رفع صورة او كتابة طلبك"), green pill for success ("تم حذف العنوان"), dark pill with the app icon for hints ("من فضلك أدخل الكوبون أولا").
- **Badges on store rows**: lime pill "خصم 30 ج.م على منتجات" (product discount), green outline "توصيل مجاني للطلبات من 300 ج.م" (free delivery over an amount), cream pill with a purple "قسيمة" tag "خصم 6 ج.م على 150 ج.م" (voucher), struck-through fee + green "مجاني" (free delivery).
- **Product cards**: lime "وفر 60.0 ج.م" (save) tag on the image, red price with the old price struck through, "+" to add (or "‹" when the item has options), "السعر حسب الاختيار" when the price depends on a choice, "قابل للتخصيص" under customizable items.
- **Loading**: grey skeleton blocks in the shape of the content.
- **Confirm dialog**: white card, bold title, message, an action button and a "إلغاء" text button. Three looks: the cart's "حذف المنتج" is a rounded card with a red pill "حذف" and an orange "إلغاء"; the address's "حذف العنوان" is a square card with an orange rounded "تأكيد" and a red "إلغاء". A third look, sign-out's "هل أنت متأكد من تسجيل الخروج": a centred question over a line, an orange "تأكيد" pill and a red-outlined "إلغاء" pill of the same width.
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

[Owner, 2026-11-23] **No SMS.** The 4-digit code is sent by **email** (Gmail SMTP). The phone number stays the account's sign-in name, as in Tawsilty. Because the code goes to the email, the email is asked for with the phone and is **required**, not optional. Without SMTP settings (local development) the API writes the code to its log instead.

1. Enter phone number and email.
2. **OTP**: 4 boxes, "أرسلنا رمز التحقق إلى <email>", "تغيير" link (back to step 1), resend after a 00:59 countdown, "تأكيد" disabled until 4 digits.
3. **التفاصيل الشخصية**: phone and email (locked), first name and family name (100 chars each), password (8+ characters: letters, numbers or symbols), and an optional **invite code** box ("ستحصل على 25 ج.م في محفظتك… يُستخدم خلال 30 يومًا"). Links to terms and privacy. "متابعة".
4. Returning users sign in with phone + password. "نسيت كلمة المرور؟" sends a code to the account's email.

Built in Phase 1:

- [Tawsilty, captured 2026-11-24, `customer/auth/`] **One entry by phone, for every role.** Signed out, the app opens on the **welcome** screen: pictures on soft cards behind a white card with "توصيلة", "يمكننا توصيل كلّ ما تتمناه" and "المتابعة باستخدام رقم الهاتف". Then the **phone step**: "رقم الهاتف", "لن نستخدم رقم هاتفك إلا إذا احتجنا إلى التواصل معك بخصوص طلبيتك.", the number with a ✕ and the 🇪🇬 +2 box, "متابعة". The API says whether the phone has an account (`POST /v1/auth/phone`, limited like sign-in; as in Tawsilty, this tells anyone whether a number is registered).
  - A phone with an account goes to **"أهلاً بعودتك"**: a lock icon, "أدخل كلمة المرور لإتمام تسجيل الدخول", the phone locked with 11/11, the password ("ادخل كلمة المرور", eye), "هل نسيت كلمة المرور؟" and "سجل الدخول".
  - **Forgot password**: "إسترجاع بيانات الدخول" with the phone filled in, "إرسال", "تذكرت كلمة المرور؟ تسجيل الدخول"; then the code boxes; then **"كلمة مرور الحساب"** ("أدخل كلمة مرور خاصة بك للدخول بها لاحقاً"): the password, the "8 خانات على الأقل" box, **"تأكيد كلمة المرور"** (must match: "كلمتا المرور غير متطابقتين") and "حفظ".
  - Where Tawsilty texts the code, Tawsela emails it (no SMS, [Owner] above): the forgot-password line says the code goes to the email.
- [Open] A **new phone** goes on to sign-up. Tawsilty texts its code at this point (not captured: the test phone already has an account); Tawsela needs the email first, so a screen in the phone step's look asks for it ("البريد الإلكتروني", "سنرسل رمز التحقق إلى بريدك الإلكتروني", the phone locked), then the code and "التفاصيل الشخصية" as before.
- The pictures on the welcome screen are the home tiles' images [Open]: Tawsilty's are fixed food photos.
- The OTP screen says "أرسلنا رمز التحقق إلى <email>" with "تغيير"; the details screen shows the phone and the email locked.
- Errors come from the API as codes (PHONE_TAKEN, OTP_WRONG with the tries left, BAD_CREDENTIALS, STAFF_RESET_BY_ADMIN…) and the app shows them in Arabic or English as Tawsilty's red toast.
- A partner or driver who asks for a password reset is told to ask the admin. Deleting an account (customers only) needs the password; the phone can sign up again afterwards.
- The links to terms and privacy arrive with the app-content pages (§8.14).
- Sessions: every account has a session version. A password reset, a disable, a deletion or a copied refresh token moves it on, and every token issued under the old version stops working at once (access tokens too). A reset ticket is bound to its account and works once, and a reset code dies when the account's email changes. A rotated refresh token sent again within 30 seconds, while its replacement is unused, gets a fresh pair (the phone lost the answer); later, it counts as a copy. Writes that clash at the same moment answer 409 (`EMAIL_TAKEN`, `PHONE_TAKEN` or `CONFLICT`), never 500. Behind nginx, `TRUST_PROXY=1` makes rate limits count each client. Each try at a code is counted before the code is checked, so guesses sent at the same moment still get only 5 tries. Arabic-keyboard digits (٠-٩) are read as 0-9 in the code boxes and phone fields.
- [Tawsilty, `customer/app/no-connection-retry.png`] If the server cannot be reached at launch but a session is stored, the app shows the no-connection screen instead of sending the account to sign-in: the crossed Wi-Fi in a soft orange circle, "لا يوجد اتصال بالإنترنت", "تحقق من اتصالك وحاول مجدداً" and an orange "إعادة المحاولة" with ↻.

### 8.2 Home

- [Tawsilty] Orange header: "التوصيل إلى **<address label>**" with a chevron (opens the address sheet), and a search box.
- [Client] The search placeholder rotates: "ابحث عن **بيتزا** / **المطاعم** / **الأكلات المفضلة** / **أفضل العروض** …" (Tawsilty does this too).
- [Tawsilty] Tiles: two rows of square images with labels and an optional badge ("سريع", "الماكيز", "جودة طعم…"). The first row is fixed (المطاعم, a supermarket, خضار وفاكهة, توصيلتي مارت); the second row scrolls sideways and mixes verticals (حلويات, اللحوم والدواجن, صيدليات, اطلب دليفري) with **single stores pinned as tiles** (Maky, Biggy Burger…). [Client] Their **order and images are set by the admin**.
- [Tawsilty] "العروض والكوبونات" tiles (§8.10), then "استخدم ووفر" with نقاطي and المحفظة shortcuts.
- [Tawsilty] "العروض اللي تستاهل تجربها دلوووقتي ⚡" auto-sliding banner carousel with dots; a banner opens its store.
- [Tawsilty] **Coloured store sections**: a full-width coloured band with a title and a round image ("الأكثر طلبًا 🔥", "استمتع باختيارك 😍", …), holding a sideways-scrolling grid of three store rows (logo, name, rating, count, time). Admin-managed.
- [Tawsilty] **Product rails**: a banner ("كل احتياجات بيتك — منظفات • بقالة • أدوات منزلية") that opens a store, with a row of its products and "+" buttons.
- [Tawsilty] Invite card: "اربح 300 ج.م عن كل صديق — وصديقك يحصل على 25 ج.م فور تسجيله", dismissible ✕. The amount changes: the client's screenshots of 2026-11-22 show "اربح 50 ج.م", the adb capture of 2026-11-23 shows 300, so both rewards are admin settings.
- [Client] Auto-sliding **offer banners** managed by the admin.
- [Client] A **banner that opens the mart (or any chosen store) directly**, with a row of its products.
- [Client] **Lucky wheel** (عجلة الحظ): one spin a day; prizes set by the admin. **Excluded for now** [Owner, 2026-11-23]: not built until the owner says otherwise.
- [Client] Categories are not shown on the home screen; banners take their place.
- [Client] Discounts are not shown as a flat badge; offers are grouped by the customer's coupon (§8.10).

Built in Phase 5: the header, the rotating search (every 3 seconds), the two tile rows and the invite card, all from `GET /v1/catalog/home`. A tile opens its type's store list or its pinned store.

- The address reads "التوصيل إلى <landmark>" of the chosen address and opens the saved addresses (§8.9); with none saved it reads "حدد موقعك" and opens the map.
- [Open] Tawsilty's capture does not show when a closed invite card comes back. Here it stays hidden on that phone.
- The invite rewards are Tawsilty's 300 and 25 ج.م until Phase 19 makes them admin settings.
- The search box opens the search screen in Phase 6, and the invite card opens ادعُ أصدقاءك in Phase 19.

### 8.3 Store lists (per vertical) [Tawsilty]

- Top bar: back, "التوصيل إلى <address>", cart button.
- Search box scoped to the vertical ("ابحث عن المطاعم").
- Cuisine circles (restaurants only): بروست · اكل صحى · باستا · كبده … (admin-managed). Selected circle gets an orange ring.
- "<n> المتاجر" count, filter chips (§6.3), sort sheet: الافتراضي · الأقرب إليك · الأعلى تقييماً · الأحدث; rating sheet: الكل · 3.0+ · 3.5+ · 4.0+ · 4.5+.
- Store row: cover image (greyscale + "مغلق" when closed), name, rating or "جديد", time, delivery fee.
- Empty: "لا توجد متاجر متاحة — لم نجد متاجر قريبة منك حالياً، جرّب تغيير الموقع أو البحث مرة أخرى".
- [Client] "اطلب من جديد" (order again) row on the restaurants list only; not on the home screen.

Built in Phase 6: the list, opened from a home tile, with the tile's label as its title ("ابحث عن حلويات و desserts"). The search box narrows this list by name.

- [Open] **توصيل سريع** means delivery in 30 minutes or less (`FAST_DELIVERY_MINUTES`). Tawsilty does not say.
- **الأقرب إليك** sorts by straight-line distance from the chosen address; stores with no location go last (§8.9).
- Lists and search show only the stores of the chosen address's zone (§8.9). With no address saved, every store shows.
- New stores show "جديد", so every rating floor leaves them out until ratings exist (Phase 15).
- The "خصومات" and "عروض التوصيل" chips, and the voucher and free-delivery badges on the rows, arrive with the offers (Phase 20).
- "اطلب من جديد" arrives once customers have past orders.
- The pharmacy list's "سهلنا الطلب عليك" card arrives in Phase 22.
- [Open] A closed store's picture is darkened with "مغلق" on it, not turned grey: the app has no greyscale image filter.

### 8.4 Store page [Tawsilty]

- Cover image with back, search and favourite buttons; status pill ("مغلق"); logo, name, rating.
- Info row: مدة التوصيل (25 دقيقة) · رسوم التوصيل (80 ج.م) · التوصيل بواسطة (توصيلتي → Tawsela, or the store itself).
- Offer cards under the info row, scrolling sideways: "قسيمة" voucher card ("خصم 6 ج.م على 150 ج.م — قسائم خصم متاحة", "عرض القسائم"), free-delivery card ("توصيل مجاني للطلبات من 1000 ج.م", "المزيد من المعلومات"), product-discount card ("خصم حتى … منتجات", "عرض المنتجات").
- **قسائمي** sheet: each voucher with its name, minimum order, expiry ("صالح حتى 30 نوفمبر 2026") and its code with a copy button.
- **Restaurant layout**: sticky category tabs with a ☰ button that opens a sheet listing every category with its item count; products in a **list** (name, price on one side, image on the other).
- **Market layout**: "العروض" rail with "عرض الكل", then "الأقسام" grid of category images, then themed rails (banner + products). A category page has sub-category circles (الكل, الخضار, الفاكهة, …) and a **grid** of products.
- Category page: title, product search, product grid (image, + button, quantity badge, name, price).
- Bottom bar: minimum order progress "تسوّق الآن وأضف 50.00 ج.م أو أكثر إلى طلبك!" with a lock icon; turns into "عرض السلة · <count> · <total>" once items are added.
- [Client] The product layout (list or grid) is set per store type by the admin (restaurants list, markets and pharmacies grid).
- [Client] A store can have its own background/cover inside the store page.

Built in Phase 7: the store page at `/store/<id>` with both layouts, the category page at `/store/<id>/category/<id>`, the ☰ sheet, the product sheet (§8.5), the bottom bar and the heart (§8.14 المفضلة). Sub-categories are one level deep and set by the admin (`store_categories.parent_id`).

- Phase 10 stores one cart per customer on the server (§8.6). [Open] Tapping a simple product's count badge adds one more.
- [Tawsilty, `customer/store/store-search-*`] The search button opens **"البحث"** (`/store/<id>/search`): the title in orange, a white box "ابحث عن كل ما تريد عند <store>", and the matching products two to a row as you type. Nothing typed or nothing matching leaves the page blank. [Open] The bottom bar shows there once something is in the cart.
- [Tawsilty, `store-unavailable-products-grey.png`] A switched-off product (منتجات غير فعالة, §11) still shows on the store page, its picture grey with a white "غير متوفر" pill; it has no add button, does not open, and is never offered in "تُطلب معًا". Search leaves it out.
- [Tawsilty, `store-no-products-free-delivery.png`] A store with nothing on its menu shows a white card with a box icon and "لا توجد منتجات حاليا". A delivery fee of 0 shows a green "مجاني"; the struck-through usual fee beside it comes with the free-delivery offers (Phase 20).
- [Open] A store with no minimum order shows no bottom bar until something is in the cart.
- [Tawsilty] "التوصيل بواسطة" names the platform ("توصيلتي" there, "توصيلة" here) or "المتجر" when the store delivers.
- [Tawsilty] The heart turns red and filled once the store is a favourite.
- The voucher, free-delivery and discount cards, the قسائمي sheet, the market's "العروض" rail and its themed rails arrive with the offers and banners (Phase 20).
- [Open] A closed store's cover is darkened, not turned grey (as in the store lists).

### 8.5 Product sheet [Tawsilty]

Full-width image, ✕ close, name, optional description, quantity stepper (− 1 +), "أضف للسلة <price>".

- **Option groups**: a title ("الوزن"), a black "مطلوب" (required) tag, "اختر 1", and radio rows with a price change ("ربع كيلو (+58.75 ج.م)"). While a required group is empty the button is grey and the bar says "أكمل الاختيارات للإضافة للسلة".
- **Base ingredients** ("المكونات الاساسية"): outlined chips with ✓; tapping one strikes it through (removed). The cart line then shows a red "بدون: ٥ اسبايسي ليمون".
- **"تُطلب معًا"** row ("عادةً ما يطلب المستخدمون هذه المنتجات أيضًا"): other products with "+" buttons, on every product sheet.

Built in Phase 7: the admin sets each product's option groups (title, required, how many to pick, rows with a price change) and base ingredients in منتجات الموردين; saving replaces the old ones. The rules are in shared `product.ts`.

- [Open] Tawsilty only shows required "اختر 1" groups. Tawsela also allows optional groups and "اختر حتى N" (ticks instead of radios). The 2026-11-24 captures still show no optional group: one pizza store sells its extras as a category of their own ("اضافات البيتزا"), which a store can also do here.
- [Open] "السعر حسب الاختيار" shows when the product's own price is 0 and a required group sets it.
- [Open] "تُطلب معًا" shows the next 10 products of the store's menu after this one, wrapping round to the start. Tawsilty does not say how it picks them.
- [Open] The admin's product form for choices is not captured; its fields follow what the sheet shows.

### 8.6 Cart (السلة) [Tawsilty]

- One store per cart. Adding from a different store asks the customer to confirm replacing the current cart. [Open] The captures do not show the replacement dialog or the pickup selector.
- Header "سلة المشتريات" + store name.
- Lines: image with a stepper (trash icon at 1, with a "حذف المنتج" confirm dialog), name, price.
- "قد تعجبك أيضًا…" upsell row from the same store.
- "دوّن ملاحظة" note sheet (200 characters, "تم").
- "ملخص الدفع": عدد المنتجات, مجموع المنتجات, الإجمالي, and "سيتم احتساب التوصيل في الخطوة التالية".
- Buttons: "أضف المزيد" and "تابع للدفع". If the service is closed: red toast "عذراً الخدمة مغلقة الآن".
- Empty: "سلتك فارغة — أضف منتجات من المطاعم والمتاجر", "تصفح المنتجات".
- [Client] The customer **confirms the delivery location on a map before placing the order**.
- [Client] **Store pickup** (استلام من المحل) is offered only for stores the admin allows.

### 8.7 Checkout and payment [Tawsilty]

"إتمام الدفع" screen, top to bottom:

1. **عنوان التوصيل**: the selected address with "تغيير".
2. **When**: "سيصل خلال 30 دقيقة" (now) or "اختر وقتاً لاحقاً" (later), which opens "اختر وقت التوصيل": half-hour slots (8:30 PM, 9:00 PM, …) and "اختر وقتاً" (disabled until a slot is picked).
3. **رصيدك**: "رصيد المحفظة" toggle to pay with the wallet; "لا يوجد رصيد متاح" in red when empty, and "شحن المحفظة".
4. **طريقة الدفع**: Tawsilty shows الدفع عند الاستلام (cash, default) · محفظة الكترونية · بطاقة الإئتمان; "جميع عمليات الدفع آمنة ومشفّرة". [Owner, 2026-11-23] Tawsela shows **cash only** for now; e-wallet and card are excluded, so the payment-method fee is always 0. The money fields stay in the data model so they can return later.
5. **وفر على طلبك**: discount code field with "تطبيق" (empty → "من فضلك أدخل الكوبون أولا").
6. **ملخّص الدفع**: مجموع المنتجات, رسوم التوصيل, **رسوم الخدمة** (service fee, e.g. 10 ج.م), **رسوم طريقة الدفع** (payment-method fee, only for e-wallet/card, e.g. 5.60 ج.م), الإجمالي. [Owner, 2026-11-25] Tawsela has **no service fee**: the "رسوم الخدمة" line is removed, so the summary is مجموع المنتجات, رسوم التوصيل (§8.7 "Delivery fee") and الإجمالي.

[Owner, 2026-11-25] Also for Phase 11:
- **Later delivery:** today only. The slots run every half hour, starting at least 30 minutes from now, until the store closes.
- **Wallet and coupon:** "رصيدك" and "وفر على طلبك" stay hidden until the wallet (Phase 17) and coupons (Phase 20) are built.
- **Stores delivering with their own people:** "delivered by: store" pays the same delivery fee rule.
7. Bottom button "تنفيذ الطلب <total>".

E-wallet and card providers: excluded for now (§15.1 #2).

#### Delivery fee [Owner, 2026-11-25, §15.1 #3]

- Admin settings (الإعدادات): a **base fee** for the first **base distance**, then a fee **per extra km**. Example: 20 ج.م for the first 2 km, then 10 ج.م for each km over.
- The distance is a straight line from the store's location to the delivery address. A started kilometre counts as a whole one: 2.3 km costs 20 + 10 = 30 ج.م.
- The customer always pays this global fee. It is shown on the store lists and at checkout for the chosen address.
- The admin can give one delivery man his own base fee, base distance and per-km fee. That changes only **his earnings** on the order, never what the customer pays. A delivery man without his own setting earns the global fee.

#### Who pays whom (cash orders) [Owner, 2026-11-25, §15.1 #11]

The admin picks one of three options. It is a global setting, and a store can have its own; the app's percentage in option 2 works the same way (global, with a per-store value).

1. **Fee only:** the delivery man keeps his delivery fee and pays the store the rest (the full items total).
2. **Fee + app share:** the delivery man keeps his delivery fee and the app's percentage of the **items total**, which he owes to the app. He pays the store the items total minus that percentage. Example: 10% on 205 ج.م → the store gets 184.5 (the partner photos, §9).
3. **Nothing to the store:** the delivery man keeps his fee and hands the rest to the app. The app settles with the store later; the dashboard shows what the app owes each store.

Whatever the customer paid with points (§8.16), the app owes to the party that would have received that cash.

### 8.8 Orders (طلباتي)

- [Tawsilty] List of orders; empty "لا توجد طلبات — ابدأ بطلب منتجاتك المفضلة الآن".
- Live order tracking: **out of scope** [Owner, 2026-11-25] (§15.2). The order shows its status only.
- [Client] Once an order is **delivered**, the customer no longer sees the tracking; they see a plain details view (items, totals, address, store).
- [Tawsilty] That **delivered details view** ("تفاصيل الطلب", back arrow): a green "تم التوصيل" pill with a tick; the store logo and name, the date (11/13/2026) and "رقم الطلب 494358"; "عنوان التوصيل" with a pin; "معلومات المندوب" with "الاسم" and the captain's name; "تفاصيل الطلب": "1 × name" lines with prices; المجموع, رسوم التوصيل, رسوم الخدمة; **قيمة الطلب** (bold); طريقة الدفع ("الدفع عند الاستلام"); وقت التوصيل ("الآن"). Reference: `customer/orders/order-details-delivered-driver-fees-payment.jpg`.
- [Tawsilty] **Rating screen** (full screen, ✕ top-left, soft beige top): the store logo, "كيف كان طلبك من <store>؟", five stars with a word under them (1 star = "مخيبة للآمال"). For a low rating: "ما هي المشكلة التي واجهتها مع طلبك؟" with outlined chips عنصر مفقود · طلب خاطئ · الطعام غير ساخن · المذاق غير جيد · الكمية غير كافية · التغليف غير مناسب, the red hint "اختر سبب واحد على الأقل", a "أخبرنا المزيد" text box, and a grey "أكمل" button until a reason is picked. Reference: `customer/orders/rating-one-star-problem-chips-tell-more.jpg`. [Client] wants this, with the chips changing between good and bad ratings and the written reason always shown.
- [Client] "اطلب تاني" (reorder) lives only inside طلباتي, not as a one-tap button outside. [Derived] It sits at the bottom of تفاصيل الطلب once the order is over, adds the lines with their choices to the cart, and leaves out what is gone from the menu with a note.
- [Open] The order while it runs: the same details with a "حالة الطلب" list of steps; it refreshes live over the socket (status only).
- [Client] **Rating** after delivery: stars, then suggestion chips that change with the star count (good vs. bad), plus "أخبرنا المزيد" text for the reason.
- [Client] **Problem with an order** opens a support ticket ("تواصل مع الدعم الفني"); money is never refunded automatically from the app.
- [Owner, 2026-11-25] 1 to 3 stars is a bad rating (problem chips), 4 and 5 good (good chips). The rating screen opens by itself once, the next time the app opens after delivery, and from "قيّم طلبك" in the details. The rating moves the store's stars in the lists.

### 8.9 Addresses [Tawsilty]

- Saved addresses sheet: label, "شارع، مبنى، شقه - المنطقة", selected tick, "تعديل" and "حذف", and "التوصيل إلى عنوان آخر — اختر موقع على الخريطة".
- Map picker: Google Map, layers button, "تخطي", banner when location services are off ("خدمة الموقع غير مفعّلة… تفعيل"), centre pin, "قرّب الخريطة لتحديد الموقع بدقة", the plus code of the spot, and "تأكيد الموقع" disabled until zoomed in enough.
- Address form (عنوان جديد / تعديل العنوان): mini map, "الموقع" with "تعديل" and "التوصيل متاح لهذا الموقع" (green) when inside a delivery zone, type chips شقة · مكتب · فيلا, building name (optional), apartment number, floor (optional), street (optional), mobile number with +2, **landmark (required)** with the error "يرجى إدخال علامة مميزة للعنوان", "تعيين كعنوان افتراضي" toggle (the first address is set automatically), "حفظ العنوان".

**Built in Phase 8:**

- **Zones** (الإعدادات › المناطق in the dashboard): a name and an outline drawn on the map (three corners at least), switched on or off, never deleted. Each store has one zone and a map location (الموردين).
- **Addresses** (`/v1/me/addresses`): an address is saved only inside a switched-on zone (`OUT_OF_ZONE`). Its zone is the one its spot was in when saved. The first address is the default, and one address is the default at a time. Deleting the default makes the newest left the default. Deleting the account deletes its addresses.
- **Sheet:** the title line is the landmark. The second line is "شارع، مبنى، شقه - <zone name>" [Derived from the captures]. Tapping an address delivers there. The choice is remembered on the phone per account and starts as the default [Derived]. Delete asks "حذف العنوان — هل تريد حذف هذا العنوان؟" and then shows "تم حذف العنوان". حسابي › عناويني opens the same sheet.
- **Map picker:** "تخطي" replaces ✕ while no address is saved [Derived]. "تفعيل" asks for location, or opens the phone's settings when it can no longer ask. The plus code is computed on the phone, and the area name comes from the phone's reverse geocoding.
- **Form:** the phone starts as the account's. Outside every zone, the form shows "التوصيل غير متاح لهذا الموقع" in red and cannot save. A new address becomes the chosen one [Derived].
- [Open] **Google Maps key:** none yet. Android reads `GOOGLE_MAPS_API_KEY` at build time. Without it, the picker shows a stand-in and takes the phone's location as the spot. iOS uses Apple's map.
- [Open] **Not captured:**
  - the zoom level that turns "تأكيد الموقع" on (16 here);
  - the red "not available" line;
  - the apartment and phone error wording;
  - the empty sheet;
  - the dashboard zones page, which uses Leaflet with OpenStreetMap and needs no key.

### 8.10 Offers and coupons [Client]

- [Tawsilty] Offer tiles: عروض حصرية لك · استخدم كوبون · عروض التوصيل. Each opens one offers screen with an orange header (title and subtitle change: "خصومات على المنتجات", "كوبونات وقسائم", "عروض التوصيل"), three pill tabs خصومات · كوبونات · عروض التوصيل, and sub-tabs الكل · مطاعم · متاجر أخرى, listing the stores that have that kind of offer with their badges (§6.3).
- [Client] Offers are grouped by the coupon the customer holds.

### 8.11 Pharmacy [Tawsilty]

- "سهلنا الطلب عليك" card with "توصيل فوري" and "30 - 60 دقيقة", and two actions: **روشتة طبية** (upload a prescription) and **صورة المنتج** (photo of a product).
- Both first open "اختر صيدلية (<n>)" sheet: each pharmacy card (logo, name, rating, time, fee, voucher) with an "التالي ←" button; empty "لا توجد صيدليات حالياً".
- Next, the **الروشتة** screen: "أضف صورة الروشتة أو المنتج الذي تريده" with a camera box, "أو", "اكتب طلبك" with a text area ("مثال: علبة بنادول"), and "التالي". With neither a photo nor text: red toast "يرجى رفع صورة او كتابة طلبك".
- Below: the pharmacies list with the same filters as §8.3.
- [Client] The pharmacy page follows this layout exactly.

### 8.12 Send anything (اطلب دليفري) [Tawsilty]

Not a special form: it is an ordinary store ("اطلب دليفري", delivered by the platform) with one category "موتوسيكل" and one product "اطلب دليفري" priced **1 ج.م**, whose description holds the service terms. The customer adds it, writes what they need in the cart note, and pays the delivery fee at checkout. Tawsela builds it the same way: no extra screens, just a store the admin sets up.

### 8.13 Search [Tawsilty]

Tabs الكل · مطاعم · متاجر أخرى. Empty "ابحث عن الأكلات والأماكن المفضلة 🍔 — اكتب اسم الأكلة أو البائع للعثور على ما تريده بسرعة". While typing: "ابحث عن «…»" row plus suggestions (product name with "في المطاعم" and an ↖ arrow to fill the box). Results: each matching store (logo, name, rating, fee, voucher) followed by its matching products (image, name, price).

Built in Phase 6, from the home search box. A store matches by its name or by one of its products. The ↖ arrow puts the name in the box, and the row searches for it.

- [Tawsilty, `customer/search/search-no-results-no-stores.png`] Searching with no match shows the empty state "لا توجد متاجر متاحة" with "لم نجد متاجر قريبة منك حالياً" and "جرّب تغيير الموقع أو البحث مرة أخرى".
- [Tawsilty, `search-suggestions-in-stores-basket.png`] A suggestion from a restaurant reads "في المطاعم" with the cutlery icon; from any other store type "في المتاجر" with a basket.
- Product prices use two decimals ("110.00 ج.م", §7), where Tawsilty's search shows "110.0".
- A product opens its store until the product sheet arrives (Phase 7). The voucher on results arrives in Phase 20.

### 8.14 Account (حسابي) [Tawsilty]

- Header: bell (notifications), avatar, name, "عرض الملف الشخصي".
- Tiles: محفظتي (balance) and نقاطي (points).
- Invite card: "اربح 300 ج.م عن كل صديق", code with copy, "مشاركة".
- **الدعم والمساعدة**: تقديم مقترح · تقديم شكوى (menu: طلب سابق → pick from طلباتي / عامة → form) · التواصل معنا (sheet with phone numbers).
- **الحساب**: إعدادات حسابي · إعدادات الإشعارات · الخدمات المفضلة · عناويني.
- **التطبيق**: عن التطبيق · مشاركة التطبيق · شروط الاستخدام · سياسة الخصوصية · حذف الحساب (red).
- "تسجيل الخروج" (red soft button). [Tawsilty, `logout-confirm-dialog.png`] It asks first: "هل أنت متأكد من تسجيل الخروج" over a line, an orange "تأكيد" pill and a red-outlined "إلغاء" pill.
- [Client] Language switch visible on this screen (§7).
- [Client] "اعملي حساب العميل زي ابلكيشن توصيلتي بظبط": the account screen matches Tawsilty exactly.

Sub-screens [Tawsilty]:
- **الملف الشخصي**: avatar with camera, full name (locked), phone with "تغيير", email, gender ذكر/أنثى, region (locked). Phase 1 builds the email and gender edits.
  - The email is where password-reset codes go, so a new one moves only with a code sent to the new address [Owner, project review F01; Tawsilty saves it at once]: "حفظ" sends the code, the sheet shows "أرسلنا رمز التحقق إلى <email>" and the 4 boxes, then "تم تغيير البريد الإلكتروني"; the old address gets a notice. The sheet and the notice wording are not captured [Open]. API: `POST /v1/me/email/code`, `POST /v1/me/email` (customers; `PATCH /v1/me` no longer takes the email).
  - [Tawsilty, `profile-change-phone-sheet.png`] "تغيير" opens the sheet "تغيير رقم الهاتف" with "أدخل رقم الهاتف الجديد" and "تأكيد رقم الهاتف". Tawsilty texts the new number; Tawsela emails the code to the account (no SMS), so the line reads "سيتم إرسال رمز تحقق إلى بريدك الإلكتروني". The code step is not captured [Open]: the sheet then shows "أرسلنا رمز التحقق إلى <masked email>" and the 4 boxes. API: `POST /v1/me/phone/code`, `POST /v1/me/phone` (customers; a number in use is `PHONE_TAKEN`).
  - [Tawsilty, `profile-avatar-choose-photo-sheet.png`] The camera on the avatar opens "اختر صورة" with "التقاط صورة" and "من المعرض" (square crop). The photo shows on the profile and on حسابي. API: `POST /v1/me/avatar` (JPEG, PNG or WebP; stored as JPEG under /uploads/avatars).
- **إعدادات الإشعارات**: "تفعيل الإشعار" and "ايقاف رسائل SMS من التطبيق" toggles with explanations. Tawsela keeps only "تفعيل الإشعار" because it sends no SMS. Off stops the pushes; الإشعارات still fills [Derived].
- [Owner, 2026-11-25] Pushes: the customer's order status; the store's new order; a delivery man's new offer, his order ready, and the skip warning and block. الإشعارات التفاعلية go now (no scheduling) to every customer or those with an address in one zone.
- **المفضلة**: favourite stores; empty "لا توجد خدمات مفضلة". Built in Phase 7 (`/v1/me/favorites`, the الخدمات المفضلة row): store rows, the newest first [Tawsilty, `favorites-two-stores-newest-first.png`; the heart removes a store at once, with no confirm]; a store the admin hides drops out until it is shown again.
- **الإشعارات**: list; empty "لا توجد إشعارات".
- **عن توصيلتي**: logo, description, "تواصل معنا عبر واتساب", social links (Facebook, Twitter, Instagram, YouTube).
- **تقديم اقتراح / تقديم شكوى**: illustration, one text field, "ارسال".
- [Owner, 2026-11-25] The admin reads complaints and suggestions in الشكاوى والاقتراحات, calls or WhatsApps the customer and marks them done; there is no reply screen in the app. The admin keeps the "تواصل معنا" numbers.

### 8.15 Wallet (حركة المحفظة) [Tawsilty]

Orange balance card ("0.0 ج.م"), "شحن المحفظة"; tabs الإضافات / الخصومات with their empty states. Top-up: "حدد طريقة الشحن" → محفظة الكترونية → amount sheet (min 10, max 10,000 ج.م) → "تأكيد البيانات" → payment provider. [Owner, 2026-11-23] **Top-up is excluded for now**, so "شحن المحفظة" is not shown. The wallet still holds invite credit and admin additions and deductions, and pays at checkout.

[Owner, 2026-11-26] Before Phase 17:
- **Paying:** "رصيد المحفظة" pays as much as the wallet holds, up to the order total; cash on delivery pays the rest.
- **Rejected or cancelled:** the wallet's part goes back to the wallet at once.
- **The delivery man:** he collects only the cash part; the app owes him the wallet part, settled outside the app for now.
- **The admin:** adds or deducts with a reason (العملاء, §11 A5); a deduction never takes the balance below 0.

### 8.16 Points (نقاطي) [Tawsilty]

Orange card: balance, progress bar, "باقي <n> نقطة للاستبدال", قيمة نقاطك (EGP value) and الحد الأدنى للاستبدال (240 نقطة). Tabs المكتسبة / المنفقة. Points are earned per order.

[Owner, 2026-11-25, §15.1 #4] The rules are global admin settings, with nothing set per customer:
- **Rate:** "X ج.م = Y نقطة". It works the same both ways: what earns a point is also what a point pays.
- **Earning:** only the cash paid for the items earns points, once the order is delivered. The delivery fee and any part paid with points earn nothing.
- **Spending:** points can pay the whole order, delivery fee included. Example: an order of 120 ج.م, with points worth up to 100 ج.م, takes all 100 and leaves 20 to pay in cash.
- **Minimum to spend:** an admin setting (default 100 points). It replaces Tawsilty's 240.
- Points never expire.

[Owner, 2026-11-26] Before Phase 18:
- **Two settings, not one rate:** what earns a point (every X ج.م) and what one point pays (ج.م) are set apart, so the admin picks how much comes back (§11 A21).
- **The wallet** counts as cash for earning.
- **Both switched on:** the wallet pays first, then points, then cash.
- The delivery man's speed points (§10) are built in Phase 24.

### 8.17 Invite friends (ادعُ أصدقاءك) [Tawsilty]

Code with copy, WhatsApp and share buttons; ربحت / رصيدك المتاح; "كيف تعمل الدعوة؟" (share code → friend signs up → both rewarded); rules: you get 300 ج.م at most 30 ج.م per order, valid 30 days; friend gets 25 ج.م valid 30 days and must receive their first order within 30 days of signing up; invite credit is only for restaurant and store orders; "متبقٍ لك 1000 مكافآت هذا الشهر"; list of friends who joined.

---

## 9. Features: partner (store)

From the "شركاء توصيلتي" store listing [Tawsilty] and the client's requests:

A partner manages their store from **two places with the same powers** [Client]: the mobile app, and the partner area of the web dashboard (`/partner`, §11.1).

- Sign in with the phone + password the admin generated (§2); no sign-up. A forgotten password is reset by the admin.
- Tabs (from the owner's photos of the live partner app, which replace the older store-listing images): **الرئيسية · طلباتى · منتجات · حسابي**. Active tab orange, others grey.
- **الرئيسية = "الطلبات الجديده"** [Tawsilty]: a card per new order: dark-orange corner badge "#506898 - قيد المراجعة", "منذ 1 دقيقة" with a clock, an outlined "احصل على مساعدة" button (headset, opens support) and a light-orange "التفاصيل" button.
- **New order popup** [Tawsilty]: a white dialog over the list, opened as soon as an order arrives (with a ring): "طلب رقم # 506898", "هل تريد قبول أو رفض الطلب ?", print and mute icons, "ملاحظات العميل" with the note in red, "المنتجات <n>" in orange with a download icon, each product with a round photo, name, orange price and an outlined "<qty> عناصر" pill, then a green **قبول** and a red **رفض** button. [Client] It also shows **how the customer pays** (طريقة الدفع and the amount), so the store knows whether the money comes cash with the captain or is already paid.
- **Order details** [Tawsilty], a full screen without the tab bar:
  - Header: back arrow, "الطلب # 506898", the date with a calendar icon, and a print icon.
  - Status pill (green "تم التوصيل" with a tick when delivered), the customer's name, their phone with a green outlined "اتصال" button.
  - "التوصيل إلى" with the street and a pin icon; "موعد التوصيل" (الآن or the scheduled time); "ملاحظات العميل" in red with a notes icon.
  - "المنتجات" with "<n> منتج", each line "1 × name" and its price.
  - Money: الإجمالى (items), كلفة التوصيل, رسوم الخدمة, رسوم طريقة الدفع, then any discount in red ("كوبون خصم" or "المدفوع من رصيد دعوة الأصدقاء"); **المجموع** (what the customer pays) and **طريقة الدفع** ("الدفع عند الاستلام", "مدفوع بالكامل", or the e-wallet/card).
  - "معلومات المندوب" (captain's name), once a captain is assigned.
  - A light-orange box **"استلم من المندوب <amount>"**: what the store collects from the captain, the items total minus the commission (205 → 184.5, 95 → 85.5: **10%**). [Client] asked for exactly this ("عايزها تبان كده للمحل").
  - While preparing: "يرجى إرسال تجهيز الطلب قبل ٥ دقائق من موعد الاستلام ليتسنى للكابتن استلامه في الوقت المحدد." and a big orange **تم التجهيز** button.
- **Statuses** the store sees: قيد المراجعة (new) → قيد التجهيز (accepted) → تم التجهيز (ready, waiting for the captain) → جارية التوصيل (captain picked it up) → تم التوصيل; or مرفوض. [Owner, 2026-11-25] A pickup has no captain: after تم التجهيز the store taps **تم الاستلام** when the customer takes it, and it becomes تم التوصيل. [Owner, 2026-11-25, Phase 13] A store "delivered by: store" gets no captain either: after تم التجهيز it taps **خارج للتوصيل**, then **تم التوصيل**.
- **طلباتى**: the store's orders by status with the same cards. (The Tawsilty screen is not captured; it uses the status tabs of the admin orders page.)
- **Products** (المنتجات): search, category tabs, each product with image, name, price and an **availability toggle**.
- **Account**: [Client] no bell toggle there; instead a "الطلبات اللي اتعملت" row with the count of orders made.
- Reports: [Demo] daily totals. Exact Tawsilty screen: [Open].

---

## 10. Features: driver

Tawsilty's driver app is not public. Three of its screens came in the client's WhatsApp (2026-11-22, `.impeccable/phone/driver/`); the rules come from the client [Client] and the demo [Demo].

**Screens seen [Tawsilty]:**

- **Tabs:** الرئيسية · الطلبات الحالية (scooter icon) · حسابي. Active tab orange.
- **حسابي:** like the customer account: bell with a red count, avatar, name, "عرض الملف الشخصي". Two tiles: **فواتيري** (wallet icon, amount in green, e.g. "525.00 ج.م") and **نقاطي**. Groups: **العمل** (نوبات عملي with a clock, سجل الطلبات with a receipt), **الدعم والمساعدة** (تقديم مقترح, تقديم شكوى), **الحساب** (إعدادات حسابي). Footer credit.
- **Order details** ("تفاصيل الطلب #485804", back arrow), white cards on grey:
  - البائع (store name) with an orange "عرض الموقع" pin link, and عنوان البائع.
  - The customer's name with call, SMS and WhatsApp icons; their area with "عرض الموقع".
  - المنتجات, collapsible: "2 منتج" and the items total in orange; opens to "2× name" lines with prices. [Client] each line also shows the product photo next to the quantity.
  - **ادفع نقداً للبائع <amount>** in orange: what the captain pays the store.
  - **المبلغ — تحصيل النقود <amount>**: what the captain collects from the customer.
  - Orange button **خارج للتوصيل**.
  - In the example, the captain pays the store 270, which is the full items total (2 products, 270). The partner photos (§9) show the store collecting 90% of the items total. [Owner, 2026-11-25] Both are right: the amount follows the store's payment option (§8.7, "Who pays whom").
- **Order history** ("طلباتى", back arrow): two date pickers (from, to), an outlined blue "بحث" button; a card per order: "الطلب #500569", a status pill (ملغي red, تم التوصيل green), the store name, "الاجمالى <items count>", a red "تقديم شكوى" button, the date ("Wednesday, 18 November 2026") and the earning in green ("+ 25.0 ج.م"). A grey bottom panel: **اجمالى الارباح** and **عدد الطلبات المكتملة**.

**Rules:**

- **Sign-in** with the phone + password the admin generated (§2); no sign-up. A forgotten password is reset by the admin.
- **Shifts**: the driver cannot start work at any time. The admin sets shift times; the "ابدأ الشفت" button unlocks **30 minutes** before the shift starts. [Client] reference from another app (`client-requests/client-driver-shift-reserved-start-reference-other-app.jpg`): a "نوبة عمل محجوزة" card with "ستبدأ في 9 دقائق", the time range, the place, "عرض على الخريطة", and a "بدء نوبة العمل" button.
- [Owner, 2026-11-25, §15.1 #5] **Schedule:** a global weekly schedule. For each of the 7 days it holds one time range, which may pass midnight, or no shift that day. The admin can give one delivery man his own schedule; without one, he follows the global schedule.
- **Starting:** the delivery man can start from 30 minutes before the shift until 15 minutes after it starts. After that he cannot start it; only the admin can start it for him. Delivery men are paid by delivery fees only, so the early 30 minutes are not counted as shift time.
- When the shift ends, the driver gets no new orders unless they **extend the shift**: +60 minutes each time, at most 3 times (3 hours). Both numbers are admin settings.
- **Offers:** [Owner, 2026-11-25, Phase 13] an order is offered when the store accepts it (قبول), to **every delivery man on shift at once**; the first to accept takes it, and a man may hold as many orders as he accepts. The offer counts down **60 seconds** (an admin setting); when nobody took it, it shows again to all of them. Ignoring an offer is **not** a skip: only pressing "تخطي" counts, and a man who skipped an order does not see it again. The admin can still give any accepted order to a delivery man from الطلبات. (This replaces "then goes to another delivery man" and "an offer left unanswered counts as a skip".)
- **Skips**: skipping offers is counted. After **2** skips the driver gets a warning notification; after **3** they are **suspended for 15 minutes**. All three numbers are admin settings. [Owner, 2026-11-25] Only skips in a row count: accepting an order or the end of a block starts the count again.
- **Speed points** [Owner, 2026-11-25]: the time from accepting the offer to delivering it, divided by the store-to-customer km (§8.7), gives his minutes per km. The admin sets levels, for example up to 10 min/km earns X points and up to 12 min/km earns Y. The admin also sets what a point is worth in ج.م, and that cash is added to what the app owes him.
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
| الطلبات | Orders table: tabs قيد المراجعة · قيد التجهيز · جارية التوصيل · … ; orange header row; columns الكود (#504578) … العمليات (assign captain 🛵, notify 🔔, edit ✎). Under the code, outlined flag pills: "بدون كابتن" (red, no captain yet), "عميل" (purple with a person icon), "ملاحظات" (red); a flagged row gets a red bar beside the code. The middle columns are hidden in the photo [Open]; the demo shows store, customer, total, payment method and captain. Meaning of "عميل": [Open] (the demo uses "first order") |
| العملاء | Customers; الشكاوى والاقتراحات (complaints and suggestions) |
| الموردين | Stores: details, type (restaurant, market, pharmacy, courier), product layout (list/grid) [Client], pickup allowed [Client], fees, minimum order, hours, cover/background [Client] |
| المندوبين | Drivers: accounts, shifts and schedules [Client], skip rules [Client], fines [Client], live status |
| المنتجات والكتالوج | منتجات الموردين (store products), منتجات غير فعالة (inactive products) |
| التسويق والعروض | الإشعارات التفاعلية (push campaigns); banners [Client], home tiles order and images [Client], mart banner target [Client], coupons and offers [Client], lucky wheel prizes [Client], invite rewards |
| التقارير | Reports |
| الإعدادات [Needed] | Zones and delivery fees, service hours, points rules, invite rewards, app content (about, terms, privacy, contact numbers, social links), admin accounts |

The full list of dashboard modules, with sources and phases, is in §1.1.

**Built in Phase 3:**

- **Sign-in:** one page, `/sign-in`, for admins and partners. Tawsilty's admin sign-in is not captured [Open]; the page uses the app's sign-in words. Customers and drivers are told the dashboard is for admins and stores.
- **Sidebar:** exactly the sections and pages in the Tawsilty photo, plus الإعدادات › حسابات الإدارة (A23) [Needed]. The other §11 pages join the sidebar with their phases. The account's name and "تسجيل الخروج" sit at its foot.
- **حسابات الإدارة:** a table in the orders-table look (orange header row, actions in العمليات). Admins are added with a name and phone; the password is generated and shown once, like partner and driver accounts. Reset password and disable/enable ask first, using the address-delete confirm look (§6.3). An admin cannot reset or disable their own account, and the last enabled admin cannot be disabled.

**Built in Phase 4:**

- **الموردين:** a table in the orders-table look with type tabs (الكل · المطاعم · ماركت · صيدليات · اطلب دليفري), the partner's phone, fee, minimum order and مفتوح / مغلق / مخفي. "إضافة متجر" is one page:
  - type and product layout (the layout follows the type until changed);
  - cuisines (restaurants only), logo and cover;
  - delivery minutes, fee, minimum order, delivered by, pickup allowed;
  - hours and "مغلق الآن", shown to customers;
  - the partner's name and phone.
  Saving shows the partner's password once, then opens the store. The edit page adds the store's partner accounts (add, reset, disable).
- **Store hours** [Open]: one daily range in Cairo time (a closing time earlier than the opening time runs past midnight; the same time means all day) plus a "مغلق الآن" switch. Tawsilty's hours screen is not captured; per-day hours replace this if it shows them.
- **A store can have more than one partner account** [Derived from §11.2]: making a store makes the first; the store page and the admin's mobile app add more ("and for a partner the store it belongs to").
- **منتجات الموردين:** pick a store; its categories in menu order (add, rename, image for the market grid, move up/down, delete only when empty) and its products (photo, name, category, price, unit, description, the متاح switch). **منتجات غير فعالة:** every store's switched-off products with "تفعيل". Customers still see a switched-off product, greyed with "غير متوفر", and cannot order it (§8.4).
- **أنواع الأكل** and **مربعات الرئيسية** (A12) [Open: names and layout ours]: under المنتجات والكتالوج, after Tawsilty's two pages. Ordered lists with image, edit, delete. A home tile has a row (fixed or sideways), an optional badge and opens one vertical or one pinned store.
- [Open] Tawsilty's stores and products admin pages are not captured: they use its orders-table look (orange header row, actions in العمليات) and the address-delete confirm look.
- **Images** are uploaded once from the form (JPEG, PNG or WebP, up to 8 MB; the server cannot read HEIC, so iPhone photos must be sent as JPEG), stored as JPEG at most 1600 px.
- **حلويات** has no vertical of its own (§1 lists it as a home tile): the seed pins it to a dessert store. [Open] whether it becomes a vertical with its own list (Phase 6).
- **Send anything** is seeded as §8.12 says; its product's terms after the first line are not captured [Open] and are written by the admin.

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

Built in Phase 4 (partners; drivers join in Phase 13): "الحسابات" with a search by name, phone or store; cards with the name, store, phone, "موقوف", and the reset and disable/enable icons (both confirm first in the address-delete look). "إضافة حساب" opens a sheet: pick the store (searchable radio list), name, phone. The password sheet has "نسخ" and "مشاركة" (the phone and password as a message). [Open] Tawsilty has no such screen; it uses the account screen's cards and sheets.

---

## 12. Data model

First draft; each phase finalises its tables.

- `users` (phone, password hash, name, email, gender, region, role, locale, invite code, invited_by, store_id for partners, session_version), `otp_codes`, `refresh_tokens` (with the session_version it was issued under)
- `addresses` (label, type, building, apartment, floor, street, landmark, phone, lat/lng, is_default)
- `zones` (delivery areas; Phase 8, with each store's zone and location)
- `home_tiles` (label, image, badge, row fixed/scroll, order, target vertical or store) (built in Phase 4)
- `stores` (vertical, name, logo, cover, delivery minutes, fee, minimum order, delivered_by, layout, pickup_allowed, opens_at, closes_at, closed_now, active), `store_categories` (name, image, order, parent for a sub-category), `products` (category, name, description, price, unit, image, active, order), `cuisines` (name, image, order), `store_cuisines` (built in Phase 4; ratings come from `ratings`, Phase 15)
- `product_option_groups` (title, required, max choices, order), `product_options` (name, price change, order), `product_ingredients` (name, order), `favorite_stores` (customer, store) (built in Phase 7)
- `carts`, `cart_lines`
- `orders` (customer, store, driver, address, mode delivery/pickup, scheduled time, status, items total, delivery fee (no service fee: owner, 2026-11-25), payment-method fee, discount and its source (coupon or invite credit), customer total, payment method, store commission and the amount the store collects from the captain, note), `order_lines`, `order_events` (status history)
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

REST under `/v1`, Swagger at `/docs`, socket.io for live order status (no driver location: live tracking is out of scope). Modules follow the features: `auth`, `me`, `addresses`, `catalog` (verticals, stores, products, search), `cart`, `orders`, `ratings`, `support`, `wallet`, `points`, `invites`, `marketing` (banners, coupons, offers, wheel), `pharmacy`, `partner`, `driver` (shifts, offers, skips, fines), `notifications`, `admin/*`. Endpoints are listed in each phase.

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

| # | Decision | Status (owner, 2026-11-23) | Blocks |
|---|---|---|---|
| 1 | ~~SMS provider for OTP~~ | **Decided:** no SMS. Codes go by email through Gmail SMTP (§8.1). | — |
| 2 | ~~Payment methods at checkout and the e-wallet top-up provider~~ | **Excluded for now:** cash on delivery only; card, e-wallet and wallet top-up are not built (§8.7, §8.15). | — |
| 3 | ~~Delivery fee rules~~ | **Decided (2026-11-25):** base fee for a base distance, then a fee per started km, measured in a straight line from store to customer. These are admin settings; a delivery man's own values change only his earnings (§8.7). | — |
| 4 | ~~Points earn rate and EGP value~~ | **Decided (2026-11-25):** one admin rate for earning and spending; only cash paid for items earns points; points can pay the whole order, fee included; minimum to spend 100; points never expire. Delivery men earn speed points by level, paid in cash (§8.16, §10). | — |
| 5 | ~~Shift, skip and suspension defaults~~ | **Decided (2026-11-25):** a weekly schedule with a per-driver override; he can start from 30 min before until 15 min after the shift starts; extend by 60 min, at most 3 times; offers wait 60 s; warning after 2 skips, 15-minute block after 3. All admin settings (§10). Changed before Phase 13: every man on shift sees an offer at once, it shows again after 60 s, and only "تخطي" counts as a skip (in a row). | — |
| 6 | ~~Production server and domain~~ | **Decided:** everything stays local until the first real mobile build; the owner then provides a VPS. | Deploy (Phase 2), moved to just before that build |
| 7 | ~~Push provider~~ | **Decided:** Expo push service, called over its HTTP API with no SDK, as in the Maqar project. | — |
| 8 | App identity, asked of the client: name (ZTechX already publishes apps named "توصيلة" and "توصيلتي"), package/bundle ID (`com.<company>.<app>`), logo (to be designed; the icon, adaptive icon and splash come from it), footer credit, and who owns the Google Play and Apple developer accounts | Open | Store release (Phase 26); until then placeholders in `app.config.ts` |
| 9 | Screens not captured yet. The WhatsApp export (read 2026-11-23) brought the customer's delivered order details and rating screen (§8.8) and three driver screens (§10). Still missing: the partner products and account screens, the driver home and current-orders tabs, and admin pages beyond the orders list. Live tracking is out of scope (§15.2). | Partly cleared | Phases 12, 13, 25 |
| 10 | ~~Lucky wheel~~ | **Excluded for now.** Tawsilty has none; the client sent a reference from another app (`client-requests/client-lucky-wheel-reference-other-app.jpg`: "لفة الحظ", 8 prizes of points, discounts and free delivery, "لف العجلة", "متبقي 1 لفة اليوم"). | — |
| 11 | ~~What the captain pays the store~~ | **Decided (2026-11-25):** three admin options, set globally or per store: the full items total; the items total minus the app's percentage; or nothing, with the app paying the store later (§8.7). | — |

### 15.2 Out of scope (until this file says otherwise)

- Dark mode.
- Tablet and desktop layouts for the mobile app.
- Ride-hailing (ZTechX's other "توصيلة" app).
- Live order tracking (the delivery man's position on a map) [Owner, 2026-11-25].

---

## 16. Reference material

- `.impeccable/phone/`: 125 Tawsilty screenshots, git-ignored, sorted into `customer/<area>/`, `partner/`, `driver/`, `admin/` and `client-requests/`, each file named after what it shows. `.impeccable/phone/INDEX.md` lists them all; open only the ones a task needs.
- `whatsapp-export/`: the client's WhatsApp chat with all its media (the full chat file plus about 1,000 files). Git-ignored. The useful Tawsilty screens from it are copied into `.impeccable/phone/`.
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
| 2026-11-23 | Second phone capture (open stores in Fayoum): checkout (§8.7) is no longer open; product options and removable ingredients (§8.5); restaurant vs. market store layouts and vouchers (§8.4); offers screen (§8.10); pharmacy request screen (§8.11); send-anything is a 1 ج.م product (§8.12); search results (§8.13); home sections and badges (§6.3, §8.2). |
| 2026-11-23 | Partner app from the owner's photos (§9): tabs الرئيسية · طلباتى · منتجات · حسابي, new-orders list, accept/reject popup, order details with the money breakdown and "استلم من المندوب" (10% commission), "تم التجهيز". Client: the store sees the payment method. Admin orders table details (§11). Screenshots sorted into folders with an index (§16). |
| 2026-11-23 | Owner's decisions (§15.1): sign-in codes by email through Gmail, no SMS (§8.1); cash only, with card, e-wallet and wallet top-up excluded for now (§8.7, §8.15); local only until the first real mobile build; Expo push; lucky wheel excluded for now (#10). Missing screens wait for the owner's WhatsApp export. |
| 2026-11-23 | Read the client's WhatsApp from 2026-11-22 17:28 on (§16): Tawsilty delivered order details and rating screen (§8.8), driver tabs, account, order details and order history (§10), invite reward is an admin setting (§8.2). New open item: what the captain pays the store (§15.1 #11). |
| 2026-11-23 | Phase 0 done: §6.1 ink, ink-2 and danger measured (`#1F1F1F`, `#8A8A8A`, `#F44336`); §6.3 the two confirm-dialog looks and the double-circle empty state, from the screenshots. |
| 2026-11-23 | Phase 1 done (§8.1): the app opens on sign-in [Derived]; the uncaptured sign-in, sign-up step 1, forgot and new-password screens follow Tawsilty's sign-up pattern [Open]; errors are codes the app translates; admins also get the حسابي tab to sign out; profile phone change and avatar photo [Open]. |
| 2026-11-23 | Phase 3 done (§11): one `/sign-in` for admins and partners [Open look]; the admin sidebar as in the Tawsilty photo plus حسابات الإدارة (A23); the partner sidebar (§11.1); admin accounts with a generated password shown once. The partner store guard moves to Phase 4, with the stores. |
| 2026-11-24 | Phase 4 done (§11, §11.2, §12): stores with their partner accounts (a store may have several), categories, products, inactive products, cuisines and home tiles in the dashboard; the admin's الحسابات tab in the app. Stand-ins marked [Open]: one daily hours range, the stores and products admin pages, the أنواع الأكل and مربعات الرئيسية names, the accounts tab, حلويات as a pinned store, the send-anything terms. `verticals` became `home_tiles`; zones move to Phase 8, product options to Phase 7. |
| 2026-11-24 | Phase 5 done (§8.2): the customer home with the header, rotating search, tiles and invite card. Stand-ins marked [Open]: the address line until Phase 8, and the closed invite card staying hidden. |
| 2026-11-24 | Phase 6 done (§8.3, §8.13): store lists with the cuisine circles, chips, sort and rating sheets, closed look and empty state; search with tabs, suggestions and results. Stand-ins marked [Open]: توصيل سريع as 30 minutes or less, the darkened closed picture, the no-results screen, "في <type>" suggestions. Offer chips and badges wait for Phase 20. |
| 2026-11-24 | Phase 7 done (§8.4, §8.5, §8.14, §12): the store page in both layouts, category pages with sub-categories, the product sheet with option groups, removable ingredients and "تُطلب معًا", the bottom bar, favourites; the admin sets choices and sub-categories. Stand-ins marked [Open]: the in-memory cart until Phase 10, the store search as a category page, optional and multi-choice groups, "تُطلب معًا" as the next items of the menu. Store offer cards and rails wait for Phase 20. |
| 2026-11-24 | CodeRabbit review of Phases 0–7 (§8.1, §11, §12): sessions end through a per-account session version (reset, disable, deletion, copied token), reset tickets work once and only for their account, code tries are counted before the check, the last enabled admin cannot be disabled (`LAST_ADMIN`), Arabic-keyboard digits in the code boxes. Both apps drop answers that arrive after sign-out and start an empty data cache for each account. The app shows a retry when the server cannot be reached at launch [Open]. Dashboard dialogs keep keyboard focus inside. |
| 2026-11-24 | Third phone capture (signed out, offline, store details): screens built from it. §8.1: the welcome screen and one phone step for every role (`POST /v1/auth/phone`), "أهلاً بعودتك", "إسترجاع بيانات الدخول" and "كلمة مرور الحساب" with the confirm field; the new-phone email step stays [Open] (no SMS: codes go by email). The no-connection screen. §8.4: the store's "البحث" page, switched-off products greyed with "غير متوفر" (no longer hidden, §11), "لا توجد منتجات حاليا", "مجاني" for a 0 fee, the heart and "التوصيل بواسطة" confirmed. §8.13: the no-results screen and "في المتاجر". §8.14: the phone change by an emailed code and the avatar photo (`/v1/me/phone`, `/v1/me/avatar`, migration 0004), the sign-out confirm (§6.3 third dialog look), favourites newest first confirmed. |
| 2026-11-24 | CodeRabbit round 2 (§8.4, §8.5, §8.13, §11, §12): partner search matches the full name; search lists every store with a matching product (not only those among the first 200 products); category changes of one store run one at a time and a main category with sub-categories cannot be deleted even by a racing request (migration 0005, `CATEGORY_NOT_EMPTY`); saving a product with unchanged choices keeps their ids; a growing cart line takes the current price; HEIC is no longer offered (the server cannot read it); the seed's catalog runs in one transaction. Apps: a late launch restore or sign-in no longer overrides a newer sign-in or sign-out; the dashboard keeps a session the browser would not store when it renews it; dashboard Save waits for an image upload; the store picker and the cuisines list show a retry when they fail. |
| 2026-11-24 | Phase 8 built (§8.2, §8.3, §8.9, §11): delivery zones outlined in the dashboard (الإعدادات › المناطق), each store's zone and location, saved addresses (migration 0006) with the sheet, map picker and form, store lists and search limited to the chosen address's zone, "الأقرب إليك" by distance. Stand-ins marked [Open]: no Google Maps key yet (a stand-in instead of the map on Android), the confirm zoom level, the uncaptured wording and the dashboard map. |
| 2026-11-24 | Project review, batch A (§8.1, §8.9, §8.14, §14): a new email needs a code sent to it (`/v1/me/email`, migration 0007); reset codes die with an email change; phone-change codes are per account; a 30-second refresh retry; account deletion is one transaction and address writes lock the account; clashing writes answer 409; update forms refuse null for required fields; production refuses to start without mail; `TRUST_PROXY`. |
| 2026-11-24 | Project review, batch A2 (§8.14, §14): data that has served its purpose goes. A replaced or deleted profile photo's file is removed; deleting an account also removes its favourites and the codes sent to its phone or email; an hourly sweep deletes codes a day after they expire and refresh tokens past their expiry (revoked ones stay until then, for the reuse alarm). |
| 2026-11-24 | Project review, batch B (§8.9, §8.13, §11): an address in a switched-off zone lists no stores, search or suggestions; search and suggestions limit by the chosen address's zone before their own limits (suggestions now take `addressId`); a zone outline with repeated corners, no area or crossing edges is refused (`ZONE_SHAPE`); every store has a delivery zone [Owner, review F21]: the store form needs one and the API refuses a store without it. |
| 2026-11-24 | Project review, batch C (§8.4, §8.9, §8.13, §8.14): the cart empties on sign-in and sign-out; sign-out clears the phone first, then tells the server; when the saved addresses cannot load, store lists, search and the sheet say "تعذر تحميل العناوين" with a retry (never every store); a list never keeps another address's stores while loading; the edit screen says "العنوان غير موجود" for a gone address; the map keeps a spot the customer moved to when the location fix comes late, shows the banner when no fix can be had, rechecks on return from settings, and its plus code always matches the pin; the form waits for "التوصيل متاح" ("جارٍ التحقق من التوصيل…", "تعذر التحقق من التوصيل" with a retry); a late save never chooses for another account; a search product opens its store on that product's sheet; search boxes stop at the API's 100 characters; a failed heart says so. New wording not captured from Tawsilty [Open]. |
| 2026-11-24 | Project review, batch D (§5, §5.1): the dashboard reads the root `.env` (NEXT_PUBLIC_API_URL) in dev and build; the seed refuses to run in production; the AAB build refuses the placeholder app ID and any API URL that is not `https://<host>/v1` or is local; the iOS archive fails on xcodebuild's own exit status and checks the app's Info.plist; `.env.example` and the README cover NODE_ENV, CORS_ORIGINS, TRUST_PROXY, production mail, the phone's Wi-Fi address, migrations, the seed and the test databases. |
| 2026-11-24 | Project review, batch E (§5, §11, §14): the dashboard no longer keeps any token in localStorage [Owner, review F11]. With the `X-Session: cookie` header (dashboard only) the API puts the refresh token in an HttpOnly, SameSite=Strict cookie `tawsela_rt` on `/v1/auth` (Secure in production) and leaves it out of the body; refresh and sign-out read it from there. The page keeps the account and the 15-minute access token in memory, signs in again from the cookie on load, and tells its other tabs about sign-in and sign-out. The old localStorage entry is removed. Two renewals of one token at the same moment (two tabs) both go through. Production needs the dashboard and the API on the same site (for example dashboard.<domain> and api.<domain>) and the dashboard's origin in CORS_ORIGINS. The phone app is unchanged. |
| 2026-11-24 | Project review F70 [Owner]: الإعدادات › سجل التغييرات (`/settings/audit`, `GET /v1/admin/audit`, migration 0008 `audit_log`). Every admin change to admin accounts, partner accounts (create, password reset, disable or enable), stores (create, and each save with the fields it sent, availability included) and zones (create, edit; the outline as its corner count) is recorded with the admin, the time and the target, by the names they had then. Generated passwords are never recorded. Newest first, 50 at a time with "عرض المزيد". Kept for good until the owner sets a retention [Open]; the page's name and wording are ours [Open]. Also: store builds run from main only and refuse a bad build number (F56); `db:push` removed (F68). |
| 2026-11-25 | Phases renumbered [Owner]: "8a" (English LTR and the language switch) is now Phase 9, and every later phase moves up one (Cart 10 … Release 26). Every phase reference here, in `docs/phases.md` and in code comments follows; §15.1 decision numbers and § section numbers are unchanged. |
| 2026-11-25 | Phase 10 cart (§8.6, §12): migration 0009 stores one cart per customer and persists its lines, note and fulfillment choice. Store changes require confirmation, prices come from the catalog, and checkout readiness checks availability and the minimum order. Pickup is offered only where allowed. Uncaptured details are listed in the phase plan. |
| 2026-11-25 | Owner's decisions (§15.1 #3, #4, #5, #11): the delivery fee by straight-line distance, with a per-driver override for his earnings only (§8.7); three per-store options for who pays whom (§8.7); customer points rules and the delivery man's speed points (§8.16, §10); the weekly shift schedule, start window, extend limit, offer timeout and skip rules (§10). Live tracking is out of scope (§8.8, §15.2). |
| 2026-11-25 | Owner, before Phase 11 (§8.7): no service fee ("رسوم الخدمة" line removed); later delivery is today only, in half-hour slots until the store closes; the wallet and coupon sections stay hidden until Phases 17 and 20; stores delivering with their own people use the same fee rule. |
| 2026-11-25 | Phase 11 built (§8.6, §8.7, §8.8, §11): checkout with the distance fee, the map confirm, today's later slots and cash on delivery; orders with their amounts and who pays whom fixed when placed; الإعدادات › رسوم التوصيل والدفع; the store's own payment option; الطلبات table; طلباتي list. Uncaptured wording marked [Open] in the phase plan. [Derived] option 3 still takes the app's percentage before the app pays the store. |
| 2026-11-25 | Phase 12 built (§9, §11.1, §12 S3): the store's orders in the partner app and `/partner`, live over socket.io (a partner hears only their store); قبول, رفض, تم التجهيز, and تم الاستلام for a pickup [Owner], each step once and kept in the history; the new-order popup (vibration now, ring with Phase 16); the details with "استلم من المندوب"; طلباتى by status; the menu with the متاح switch; hours, مغلق الآن and the cover for the partner; "الطلبات اللي اتعملت" ([Derived] delivered orders). Print on `/partner` only. Uncaptured screens marked [Open] in the phase plan. |
| 2026-11-25 | Phase 13 built (§9, §10, §11, §11.2, §12 S3), migration 0012: delivery men accounts in المندوبين and the admin's app; the global week and the rules in المندوبين › نوبات العمل والقواعد, and one man's own week; starting a shift (30 min before to 15 min after), extending and ending it, the admin starting it late; offers to every man on shift at once over the live socket, the first to accept takes it, shown again after 60 s, only "تخطي" counts (in a row), warning and block [Owner]; وصلت للمتجر, خارج للتوصيل (once ready) and تم التوصيل; the admin's 🛵 in الطلبات; a store delivering itself sends its orders out and closes them [Owner]. Uncaptured screens marked [Open] in the phase plan. |
| 2026-11-25 | Phase 14 built (§8.8, §12 S3), migration 0013: تفاصيل الطلب as in the photo (no service fee); the order's steps while it runs [Open], refreshed live for the customer; "اطلب تاني" inside the details once the order is over [Derived], with another store's cart asked first and missing items left out. |
| 2026-11-25 | Phase 15 built (§8.8, §8.14, §11), migration 0014: the rating screen as in the photo with the owner's split (1-3 bad, 4-5 good), opened once by itself after delivery and from the details; the store's average in the lists; complaints (عامة or a past order, and from the order's details) and suggestions; التواصل معنا from the admin's numbers; الشكاوى والاقتراحات (mark done, no in-app reply) and أرقام التواصل in the dashboard [Owner]. Good chips and star words 2-5 marked [Open]. |
| 2026-11-25 | Phase 16 built (§8.14, §9, §10, §11, §15.1 #7), migration 0015: push through Expo's HTTP API with no SDK; tokens per phone; الإشعارات with the unread dot; إعدادات الإشعارات (تفعيل الإشعار only); the owner's push events; الإشعارات التفاعلية sent now to every customer or one zone [Owner]. Real pushes wait for the Expo project ID [Open]. |
| 2026-11-26 | Phase 17 built (§8.15, §8.7, §9, §10, §11 A3, A5), migration 0016: حركة المحفظة as in the photos without top-up; محفظتي on حسابي; "رصيدك" at checkout paying as much as the wallet holds [Owner]; a rejected order's wallet money back at once [Owner]; the delivery man collects the cash part only, the app owes him the rest [Owner]; العملاء in the dashboard with add and deduct, never below 0 [Owner]. The movement rows and the العملاء page are not captured [Open]. |
| 2026-11-26 | Phase 18 built (§8.16, §8.2, §8.7, §11 A5, A21), migration 0017: نقاطي as in the photo; نقاطي on حسابي and "استخدم ووفر" on الرئيسية; two point settings [Owner] in الإعدادات › النقاط; points earned on the items once delivered, the wallet counting as cash [Owner]; spent at checkout after the wallet [Owner], down to the minimum; a rejected order's points back; the admin adds or deducts points in العملاء. The delivery man's speed points moved to Phase 24 [Owner]. |
