# لمحة · Lamha: delivery super-app demo (Fayoum)

A frontend-only client demo (Next.js 16, static data, no backend). The layout is mobile-only; on a laptop it shows in a phone-width column. Everything is simulated in the browser and saved in localStorage.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build (deploys as-is to Vercel)
```

## Demo map

| Route | What it is |
|---|---|
| `/` | Hub: the "honest bill" promise + entry to the 3 apps + reset demo |
| `/app` | Customer app (onboarding → home → store → receipt/cart → live tracking) |
| `/partner` | Store app: incoming orders with chime, orders board, menu control, sales |
| `/rider` | Rider app: go online, job offers, pickup checklist, cash, earnings |

## Presenter script (5 minutes)

1. **Hub** (`/`): read the receipt: zero hidden fees, free cancel, instant refunds.
2. **Customer** → onboarding (OTP auto-fills) → home → *سماش لاب* → *كلاسيك سماش*: required options must be chosen, then add it.
3. **Receipt**: tap *LAMHA20*, toggle wallet/points, add a tip. Every line updates live and the total is final.
4. **Confirm** → stamp moment → tracking. Show **cancel/edit** during the countdown, then tap *تقديم الحالة (للعرض)* to fast-forward: rider moves on the map, ETA flips.
5. After delivery: **في مشكلة؟** → pick an item → money lands in the wallet instantly, and the receipt line gets stamped *مسترد*.
6. **Partner** (`/partner`): tap *طلب تجريبي* (chime + countdown), accept with prep time. In **المنيو**, switch off an item, then open *شاورما الساقية* in the customer app: it shows as sold out.
7. **Rider** (`/rider`): *ابدأ الشغل* → offer shows the exact fare → pickup checklist → collect cash → earnings.

## Rebrand

Change the name in `src/lib/brand.ts` and colors in `src/app/globals.css` (`@theme`). See `DESIGN.md`.

All stores, menus, prices, ratings and reviews are synthetic demo data.
