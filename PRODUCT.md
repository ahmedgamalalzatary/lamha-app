# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router, TypeScript, Tailwind), deployed on Vercel (`*.vercel.app`). Frontend-only demo: static data, no backend, all flows simulated in the browser. Mobile layout only (the product becomes a native mobile app later); on wide screens the app sits in a phone-width column.

## Users

- **Customers in Fayoum, Egypt** ordering food, groceries, medicine, or sending a package, mostly on Android phones, in Arabic (Egyptian colloquial).
- **Partners** (restaurants, cafés, shops, pharmacies) receiving orders, managing their menu and availability, and tracking sales.
- **Riders** who pick up and deliver orders.
- **The client** (business buyer) evaluating this demo to decide whether to fund the real product.

## Product Purpose

Lamha (لمحة) is a delivery super-app for Fayoum: restaurants and cafés, a mart/supermarket, pharmacy (including prescription upload), and "send anything" courier errands. This demo exists to win the client's deal by showing every feature the competitor (توصيلتي by ZTechX) has, done better, plus what it lacks.

## Positioning

Trust. Where the competitor's reviews complain of "free delivery" that still charges, wrong orders, no way to cancel or edit, and ignored support, Lamha shows the full price before you order and charges exactly that, lets you cancel or edit during a grace window, refunds a wrong or missing item to the wallet in one tap, and puts live support one tap away.

## Operating Context

- Customer app: onboarding/sign-in (phone OTP, Google), address and location, home with services, search, store menus with required/optional item options, cart and checkout, live order tracking, order history, wallet, points, favorites, addresses, notifications, suggestions and complaints.
- Partner app: self sign-up (competitor lacks it), incoming orders, order statuses, product availability and menu, sales reports, support.
- Rider app: jobs, pickup and drop-off flow, earnings.
- Market: Fayoum city and its neighborhoods; prices in EGP (ج.م).

## Capabilities and Constraints

- No backend: every state change (order progress, chat replies, refunds) is simulated client-side and may persist in browser storage.
- Arabic RTL first. English is undecided.
- Brand name "Lamha / لمحة" was invented for the demo and lives in one config file for easy renaming.

## Brand Commitments

- Must not look like or reuse the competitor's name (توصيلتي / توصيلة) or its orange identity.

## Evidence on Hand

- Competitor research: store listings and screenshots of توصيلتي customer and partner apps (scratchpad, not shipped).
- No real stores, menus, prices, ratings, or customers exist. All store names, menu items, prices, ratings and reviews in the demo are synthetic demo data and must read as such to the client (no claims of real partners or user counts).

## Product Principles

1. The price you see is the price you pay: every fee is itemized before checkout.
2. The customer is never stuck: cancel, edit, report, and reach a human are always visible when relevant.
3. One tap to the most likely next action (reorder, track, add again).
4. Local first: Fayoum places, Egyptian food, Egyptian Arabic copy.
5. Every partner and rider task is completable one-handed on a cheap phone.

## Accessibility & Inclusion

Large touch targets, high-contrast text on mid-range Android screens outdoors, respects reduced motion, Arabic typography sized for legibility.
