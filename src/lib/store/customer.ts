"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartLine, Order } from "../types";
import { lineKey } from "../options";
import { lineTotal, quote } from "../pricing";
import { orderState, skipToNext } from "../order-sim";
import { storeById } from "../data/stores";
import {
  PROMOS, SEED_ADDRESSES, SEED_USER, seedNotices, seedOrders, seedWallet,
  type Address, type Notice, type WalletTx,
} from "../data/seed";

export type Payment = "cash" | "card" | "wallet";
export type Ticket = { id: string; kind: "suggestion" | "complaint"; topic: string; text: string; at: number; status: "open" | "answered"; reply?: string };

type NewLine = Omit<CartLine, "key">;

type State = {
  onboarded: boolean;
  signedIn: boolean;
  name: string;
  phone: string;
  addresses: Address[];
  addressId: string;
  mode: "delivery" | "pickup";
  cart: { storeId: string | null; lines: CartLine[]; note: string; cutlery: boolean };
  promoCode: string | null;
  tip: number;
  useWallet: boolean;
  usePoints: boolean;
  payment: Payment;
  scheduledFor: string | null;
  orders: Order[];
  wallet: number;
  walletTx: WalletTx[];
  points: number;
  favorites: string[];
  notices: Notice[];
  tickets: Ticket[];
  recent: string[];
  nextNumber: number;
};

type Actions = {
  signIn: (name: string, phone: string) => void;
  finishOnboarding: () => void;
  signOut: () => void;
  addLine: (storeId: string, line: NewLine) => "added" | "conflict";
  setQty: (key: string, qty: number) => void;
  clearCart: () => void;
  setCartNote: (note: string) => void;
  setCutlery: (v: boolean) => void;
  applyPromo: (code: string) => "ok" | "unknown";
  removePromo: () => void;
  placeOrder: () => string | null;
  placeCourier: (c: NonNullable<Order["courier"]>, fee: number) => string;
  cancelOrder: (id: string) => boolean;
  editOrder: (id: string, lines: CartLine[]) => boolean;
  refundLines: (id: string, keys: string[], reason: string) => number;
  rateOrder: (id: string, r: NonNullable<Order["rated"]>) => void;
  skipOrder: (id: string) => void;
  reorder: (id: string) => void;
  toggleFavorite: (storeId: string) => void;
  saveAddress: (a: Address) => void;
  removeAddress: (id: string) => void;
  topUp: (amount: number) => void;
  markNoticesRead: () => void;
  addTicket: (t: Omit<Ticket, "id" | "at" | "status">) => void;
  pushRecent: (q: string) => void;
  resetDemo: () => void;
};

const initial = (): State => ({
  onboarded: false,
  signedIn: false,
  name: SEED_USER.name,
  phone: SEED_USER.phone,
  addresses: SEED_ADDRESSES,
  addressId: "home",
  mode: "delivery",
  cart: { storeId: null, lines: [], note: "", cutlery: false },
  promoCode: null,
  tip: 0,
  useWallet: false,
  usePoints: false,
  payment: "cash",
  scheduledFor: null,
  orders: seedOrders(),
  wallet: SEED_USER.wallet,
  walletTx: seedWallet(),
  points: SEED_USER.points,
  favorites: ["sakia-shawarma", "am-saber"],
  notices: seedNotices(),
  tickets: [],
  recent: ["شاورما", "كشري", "كنافة"],
  nextNumber: 1045,
});

const uid = () => Math.random().toString(36).slice(2, 9);

export function currentQuote(s: State) {
  const store = s.cart.storeId ? storeById(s.cart.storeId) : undefined;
  if (!store) return null;
  const promo = PROMOS.find((p) => p.code === s.promoCode) ?? null;
  const pickup = s.mode === "pickup";
  return quote({
    lines: s.cart.lines,
    store: pickup ? { ...store, deliveryFee: 0, freeDeliveryOver: undefined } : store,
    promo,
    tip: pickup ? 0 : s.tip,
    pointsToRedeem: s.usePoints ? s.points : 0,
    walletBalance: s.wallet,
    useWallet: s.useWallet,
  });
}

export const useCustomer = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial(),

      signIn: (name, phone) => set({ signedIn: true, name: name || SEED_USER.name, phone }),
      finishOnboarding: () => set({ onboarded: true }),
      signOut: () => set({ signedIn: false, onboarded: false }),

      addLine: (storeId, line) => {
        const { cart } = get();
        if (cart.storeId && cart.storeId !== storeId && cart.lines.length > 0) return "conflict";
        const key = lineKey(line.itemId, line.choices, line.note);
        const existing = cart.lines.find((l) => l.key === key);
        const lines = existing
          ? cart.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + line.qty } : l))
          : [...cart.lines, { ...line, key }];
        set({ cart: { ...cart, storeId, lines } });
        return "added";
      },

      setQty: (key, qty) => {
        const { cart } = get();
        const lines = qty <= 0 ? cart.lines.filter((l) => l.key !== key) : cart.lines.map((l) => (l.key === key ? { ...l, qty } : l));
        set({ cart: { ...cart, lines, storeId: lines.length ? cart.storeId : null } });
      },

      clearCart: () => set({ cart: { storeId: null, lines: [], note: "", cutlery: false }, promoCode: null, tip: 0, usePoints: false }),
      setCartNote: (note) => set((s) => ({ cart: { ...s.cart, note } })),
      setCutlery: (v) => set((s) => ({ cart: { ...s.cart, cutlery: v } })),

      applyPromo: (code) => {
        const p = PROMOS.find((x) => x.code === code.trim().toUpperCase());
        if (!p) return "unknown";
        set({ promoCode: p.code });
        return "ok";
      },
      removePromo: () => set({ promoCode: null }),

      placeOrder: () => {
        const s = get();
        const store = s.cart.storeId ? storeById(s.cart.storeId) : undefined;
        const q = currentQuote(s);
        if (!store || !q || q.belowMinimumBy > 0 || s.cart.lines.length === 0) return null;
        const addr = s.addresses.find((a) => a.id === s.addressId) ?? s.addresses[0];
        const id = `o-${s.nextNumber}`;
        const order: Order = {
          id, number: s.nextNumber, storeId: store.id, lines: s.cart.lines, quote: q,
          payment: q.dueOnDelivery === 0 ? "wallet" : s.payment,
          addressLabel: s.mode === "pickup" ? "استلام من المحل" : addr.label,
          addressText: s.mode === "pickup" ? store.area : `${addr.area}، ${addr.street}، ${addr.details}`,
          placedAt: Date.now(), offsetMs: 0, etaMinutes: s.mode === "pickup" ? store.etaMin : store.etaMax,
          refunds: [], scheduledFor: s.scheduledFor ?? undefined, kind: "store",
        };
        const earned = Math.floor(q.subtotal / 10) * 10 / 10;
        set({
          orders: [order, ...s.orders],
          nextNumber: s.nextNumber + 1,
          wallet: +(s.wallet - q.walletApplied).toFixed(2),
          walletTx: q.walletApplied > 0 ? [{ id: uid(), label: `دفع طلب #${order.number}`, amount: -q.walletApplied, at: Date.now() }, ...s.walletTx] : s.walletTx,
          points: s.points - q.pointsUsed + Math.round(earned),
          cart: { storeId: null, lines: [], note: "", cutlery: false },
          promoCode: null, tip: 0, usePoints: false, scheduledFor: null,
        });
        return id;
      },

      placeCourier: (c, fee) => {
        const s = get();
        const id = `o-${s.nextNumber}`;
        const line: CartLine = { key: "courier", itemId: "courier", name: `توصيل ${c.what}`, basePrice: fee, choices: [], qty: 1 };
        const q = quote({ lines: [line], store: { deliveryFee: 0, minOrder: 0 } });
        q.lines = [{ key: "delivery", label: "توصيل مشوار", amount: fee, note: `${c.size} • من ${c.from}` }, { key: "service", label: "رسوم الخدمة", amount: 0 }];
        const order: Order = {
          id, number: s.nextNumber, storeId: "courier", lines: [line], quote: q, payment: "cash",
          addressLabel: "التسليم", addressText: c.to, placedAt: Date.now(), offsetMs: 0, etaMinutes: 35,
          refunds: [], kind: "courier", courier: c,
        };
        set({ orders: [order, ...s.orders], nextNumber: s.nextNumber + 1 });
        return id;
      },

      cancelOrder: (id) => {
        const s = get();
        const o = s.orders.find((x) => x.id === id);
        if (!o || !orderState(o, Date.now()).canCancel) return false;
        const back = o.quote.walletApplied;
        set({
          orders: s.orders.map((x) => (x.id === id ? { ...x, cancelledAt: Date.now() } : x)),
          wallet: +(s.wallet + back).toFixed(2),
          points: s.points + o.quote.pointsUsed,
          walletTx: back > 0 ? [{ id: uid(), label: `استرداد طلب ملغي #${o.number}`, amount: back, at: Date.now() }, ...s.walletTx] : s.walletTx,
          notices: [{ id: uid(), title: `طلب #${o.number} اتلغى`, body: back > 0 ? `رجعنا ${back} ج.م لمحفظتك` : "مفيش أي رسوم عليك", at: Date.now(), read: false, kind: "order" }, ...s.notices],
        });
        return true;
      },

      editOrder: (id, lines) => {
        const s = get();
        const o = s.orders.find((x) => x.id === id);
        if (!o || !orderState(o, Date.now()).canEdit || lines.length === 0) return false;
        const store = storeById(o.storeId);
        if (!store) return false;
        const q = quote({ lines, store, walletBalance: s.wallet + o.quote.walletApplied, useWallet: o.quote.walletApplied > 0 });
        const walletDiff = q.walletApplied - o.quote.walletApplied;
        set({
          orders: s.orders.map((x) => (x.id === id ? { ...x, lines, quote: q } : x)),
          wallet: +(s.wallet - walletDiff).toFixed(2),
        });
        return true;
      },

      refundLines: (id, keys, reason) => {
        const s = get();
        const o = s.orders.find((x) => x.id === id);
        if (!o) return 0;
        const fresh = o.lines.filter((l) => keys.includes(l.key) && !o.refunds.some((r) => r.lineKey === l.key));
        const amount = fresh.reduce((sum, l) => sum + lineTotal(l), 0);
        if (amount === 0) return 0;
        const now = Date.now();
        set({
          orders: s.orders.map((x) => (x.id === id ? { ...x, refunds: [...x.refunds, ...fresh.map((l) => ({ lineKey: l.key, amount: lineTotal(l), reason, at: now }))] } : x)),
          wallet: +(s.wallet + amount).toFixed(2),
          walletTx: [{ id: uid(), label: `استرداد: ${reason} من طلب #${o.number}`, amount, at: now }, ...s.walletTx],
          notices: [{ id: uid(), title: "فلوسك رجعت المحفظة", body: `رجعنالك ${amount} ج.م عن طلب #${o.number}`, at: now, read: false, kind: "wallet", href: "/app/account/wallet" }, ...s.notices],
        });
        return amount;
      },

      rateOrder: (id, r) => set((s) => ({ orders: s.orders.map((x) => (x.id === id ? { ...x, rated: r } : x)), points: s.points + 10 })),

      skipOrder: (id) => set((s) => ({ orders: s.orders.map((x) => (x.id === id ? { ...x, offsetMs: skipToNext(x, Date.now()) } : x)) })),

      reorder: (id) => {
        const o = get().orders.find((x) => x.id === id);
        if (!o || o.kind === "courier") return;
        set((s) => ({ cart: { storeId: o.storeId, lines: o.lines.map((l) => ({ ...l })), note: "", cutlery: s.cart.cutlery }, promoCode: null }));
      },

      toggleFavorite: (storeId) => set((s) => ({ favorites: s.favorites.includes(storeId) ? s.favorites.filter((f) => f !== storeId) : [...s.favorites, storeId] })),

      saveAddress: (a) => set((s) => ({ addresses: s.addresses.some((x) => x.id === a.id) ? s.addresses.map((x) => (x.id === a.id ? a : x)) : [...s.addresses, a], addressId: a.id })),
      removeAddress: (id) => set((s) => {
        const addresses = s.addresses.filter((a) => a.id !== id);
        return { addresses, addressId: s.addressId === id ? addresses[0]?.id ?? "" : s.addressId };
      }),

      topUp: (amount) => set((s) => ({ wallet: s.wallet + amount, walletTx: [{ id: uid(), label: "شحن رصيد بالكارت", amount, at: Date.now() }, ...s.walletTx] })),
      markNoticesRead: () => set((s) => ({ notices: s.notices.map((n) => ({ ...n, read: true })) })),
      addTicket: (t) => set((s) => ({ tickets: [{ ...t, id: `T-${2400 + s.tickets.length + 1}`, at: Date.now(), status: "open" }, ...s.tickets] })),
      pushRecent: (q) => set((s) => ({ recent: [q, ...s.recent.filter((r) => r !== q)].slice(0, 6) })),
      resetDemo: () => set(initial()),
    }),
    {
      name: "lamha-customer",
      version: 1,
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          return { getItem: () => null, setItem: () => {}, removeItem: () => {} };
        }
      }),
      skipHydration: true,
    },
  ),
);
