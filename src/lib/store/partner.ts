"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storeById } from "../data/stores";

export type POStatus = "new" | "preparing" | "ready" | "out" | "done" | "rejected";
export type PartnerLine = { name: string; qty: number; opts?: string; price: number };
export type PartnerOrder = {
  id: string;
  number: number;
  customer: string;
  area: string;
  lines: PartnerLine[];
  total: number;
  payment: "cash" | "card" | "wallet";
  placedAt: number;
  status: POStatus;
  prepMin?: number;
  acceptedAt?: number;
  note?: string;
  rider?: string;
  rejectReason?: string;
};

export const PARTNER_STORE_ID = "sakia-shawarma";

const CUSTOMERS = ["محمد ع.", "سارة م.", "يوسف ح.", "منة الله ك.", "عمر س.", "هبة ر.", "كريم ف.", "نورهان أ."];
const AREAS = ["الحادقة", "المسلة", "كيمان فارس", "الصوفي", "دار الرماد", "الشيخ حسن"];
const RIDERS = ["محمود ج.", "أحمد ص.", "مصطفى ع."];

let seq = 2210;
function randomOrder(at: number, status: POStatus = "new", soldOut: Record<string, boolean> = { s3: true }): PartnerOrder {
  const store = storeById(PARTNER_STORE_ID)!;
  const items = store.menu.flatMap((c) => c.items).filter((i) => !soldOut[i.id]);
  const n = 1 + Math.floor(Math.random() * 3);
  const lines: PartnerLine[] = Array.from({ length: n }, () => {
    const it = items[Math.floor(Math.random() * items.length)];
    const qty = 1 + Math.floor(Math.random() * 2);
    const g = it.options?.[0];
    const opt = g?.choices[Math.floor(Math.random() * g.choices.length)];
    return { name: it.name, qty, opts: opt?.name, price: (it.price + (opt?.price ?? 0)) * qty };
  });
  const notes = [undefined, undefined, "من غير بصل لو سمحت", "ثومية زيادة", "رن الجرس مرتين"];
  seq += 1;
  return {
    id: `p-${seq}`, number: seq,
    customer: CUSTOMERS[seq % CUSTOMERS.length], area: AREAS[seq % AREAS.length],
    lines, total: lines.reduce((s, l) => s + l.price, 0),
    payment: (["cash", "card", "wallet"] as const)[seq % 3],
    placedAt: at, status, note: notes[seq % notes.length],
    rider: status === "out" || status === "done" ? RIDERS[seq % RIDERS.length] : undefined,
    prepMin: status !== "new" ? 15 : undefined, acceptedAt: status !== "new" ? at + 60_000 : undefined,
  };
}

function seedOrders(): PartnerOrder[] {
  const now = Date.now();
  const m = 60_000;
  return [
    randomOrder(now - 4 * m, "preparing"),
    randomOrder(now - 11 * m, "ready"),
    randomOrder(now - 19 * m, "out"),
    ...Array.from({ length: 9 }, (_, i) => randomOrder(now - (40 + i * 23) * m, "done")),
  ];
}

export type Review = { id: string; name: string; stars: number; text: string; at: number; reply?: string };

type State = {
  signedIn: boolean;
  applied: boolean;
  status: "open" | "busy" | "closed";
  orders: PartnerOrder[];
  soldOut: Record<string, boolean>;
  priceOverride: Record<string, number>;
  reviews: Review[];
  sound: boolean;
};

type Actions = {
  signIn: () => void;
  signOut: () => void;
  submitApplication: () => void;
  setStatus: (s: State["status"]) => void;
  incoming: () => PartnerOrder;
  accept: (id: string, prepMin: number) => void;
  reject: (id: string, reason: string) => void;
  advance: (id: string) => void;
  toggleSoldOut: (itemId: string) => void;
  setPrice: (itemId: string, price: number) => void;
  reply: (reviewId: string, text: string) => void;
  setSound: (v: boolean) => void;
  reset: () => void;
};

const initial = (): State => ({
  signedIn: false,
  applied: false,
  status: "open",
  orders: seedOrders(),
  soldOut: { s3: true },
  priceOverride: {},
  reviews: [
    { id: "r1", name: "مريم ح.", stars: 5, text: "الشاورما سخنة ومقرمشة والثومية تحفة، وصلت في 20 دقيقة", at: Date.now() - 3 * 3600_000 },
    { id: "r2", name: "أحمد ك.", stars: 4, text: "حلوة جداً بس البطاطس كانت محتاجة ملح", at: Date.now() - 26 * 3600_000 },
    { id: "r3", name: "إسلام م.", stars: 2, text: "الطلب اتأخر ساعة", at: Date.now() - 50 * 3600_000, reply: "آسفين جداً، كان في ضغط يوم الجمعة. ضفنالك كود خصم في حسابك." },
  ],
  sound: true,
});

const NEXT: Partial<Record<POStatus, POStatus>> = { preparing: "ready", ready: "out", out: "done" };

export const usePartner = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial(),
      signIn: () => set({ signedIn: true }),
      signOut: () => set({ signedIn: false }),
      submitApplication: () => set({ applied: true }),
      setStatus: (status) => set({ status }),
      incoming: () => {
        const o = randomOrder(Date.now(), "new", get().soldOut);
        set({ orders: [o, ...get().orders] });
        return o;
      },
      accept: (id, prepMin) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status: "preparing", prepMin, acceptedAt: Date.now() } : o)) })),
      reject: (id, reason) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status: "rejected", rejectReason: reason } : o)) })),
      advance: (id) => set((s) => ({
        orders: s.orders.map((o) => {
          if (o.id !== id || !NEXT[o.status]) return o;
          const status = NEXT[o.status]!;
          return { ...o, status, rider: status === "out" ? RIDERS[o.number % RIDERS.length] : o.rider };
        }),
      })),
      toggleSoldOut: (itemId) => set((s) => ({ soldOut: { ...s.soldOut, [itemId]: !s.soldOut[itemId] } })),
      setPrice: (itemId, price) => set((s) => ({ priceOverride: { ...s.priceOverride, [itemId]: price } })),
      reply: (reviewId, text) => set((s) => ({ reviews: s.reviews.map((r) => (r.id === reviewId ? { ...r, reply: text } : r)) })),
      setSound: (sound) => set({ sound }),
      reset: () => set(initial()),
    }),
    { name: "lamha-partner", version: 1, storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
