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

---

## 2. Users and roles

| Role | Who | Where | Can |
|---|---|---|---|
| **Customer** | Signs up with their phone | Mobile app | Browse, order, track, rate, complain, wallet, points, invite friends |
| **Partner** | A store (مورد). Account made by an admin, no sign-up [Tawsilty] | Same mobile app | See and handle incoming orders, switch products on and off, see past orders and notifications |
| **Driver** | A delivery driver (مندوب). Account made by an admin | Same mobile app | Work shifts, accept or skip offers, pick up and deliver, see order history and fines |
| **Admin** | Tawsela team | Web dashboard | Everything in §11 |

Rules:

- **One mobile build holds all three roles** (decided 2026-11-23). After sign-in, the account's role picks the screens and the tab bar.
- One account has one role.
- Tawsilty publishes the partner side as a separate store listing. Tawsela ships one app instead, on the client's request.

---

## 3. Platforms and repository

- **Mobile** for customers, partners and drivers: phone layout, portrait.
- **Web dashboard** for admins: desktop, Arabic RTL.
- One pnpm + Turborepo monorepo: `github.com/ahmedgamalalzatary/lamha-demo` (to be renamed).

| Path | Package | Purpose | Dev port |
|---|---|---|---|
| `apps/web` | `@tawsela/web` | Admin dashboard: Next.js 16 + Tailwind 4 | 3000 |
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

- Sign in with phone + password; "نسيت كلمة المرور؟"; no sign-up.
- Tabs: الرئيسية · المنتجات · الإشعارات · حسابي.
- **Orders**: current and previous ("السابقة" with a count), each with total and "التفاصيل". Accept, prepare, ready for pickup.
- **Products** (المنتجات): search, category tabs, each product with image, name, price and an **availability toggle**.
- **Account**: [Client] no bell toggle there; instead a "الطلبات اللي اتعملت" row with the count of orders made.
- Reports: [Demo] daily totals. Exact Tawsilty screen: [Open].

---

## 10. Features: driver

Tawsilty's driver app is not public; these rules come from the client [Client] and the demo [Demo].

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
| 8 | Brand: Tawsela name, logo and footer credit | Release |
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
