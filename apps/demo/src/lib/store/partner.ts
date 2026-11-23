"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storeById } from "../data/stores";
import { ORDER_MONEY } from "../data/admin";

/**
 * Store-side orders, modelled on the Tawsilty partner app
 * (.impeccable/phone/partner/*): new orders wait "قيد المراجعة" until the store accepts,
 * then "قيد التجهيز" until the store presses "تم التجهيز"; the captain then picks the order
 * up ("جارية التوصيل") and delivers it ("تم التوصيل").
 */
export type POStatus = "new" | "preparing" | "ready" | "out" | "done" | "rejected";
export type Payment = "cash" | "card" | "ewallet";
export type PartnerLine = { name: string; qty: number; opts?: string; price: number; img: string };
export type PartnerOrder = {
  id: string;
  number: number;
  customer: string;
  phone: string;
  /** street or landmark the order goes to ("التوصيل إلى") */
  street: string;
  area: string;
  lines: PartnerLine[];
  /** items total ("الإجمالى") */
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  paymentFee: number;
  /** coupon or invite credit, shown in red under the fees */
  discount?: { label: string; amount: number };
  /** what the customer pays ("المجموع") */
  total: number;
  payment: Payment;
  placedAt: number;
  status: POStatus;
  acceptedAt?: number;
  readyAt?: number;
  outAt?: number;
  note?: string;
  rider?: string;
};

export const PARTNER_STORE_ID = "sakia-shawarma";

export const STATUS_LABEL: Record<POStatus, string> = {
  new: "قيد المراجعة",
  preparing: "قيد التجهيز",
  ready: "تم التجهيز",
  out: "جارية التوصيل",
  done: "تم التوصيل",
  rejected: "مرفوض",
};

/** How the customer pays, in the words the store sees. */
export const paymentLabel = (o: Pick<PartnerOrder, "payment" | "total">) =>
  o.total === 0 ? "مدفوع بالكامل" : { cash: "الدفع عند الاستلام", card: "بطاقة الإئتمان", ewallet: "محفظة الكترونية" }[o.payment];

/** What the store collects from the driver: the items total minus the commission. */
export const storeReceives = (o: Pick<PartnerOrder, "subtotal">) => Math.round(o.subtotal * (1 - ORDER_MONEY.commission) * 10) / 10;

const CUSTOMERS = ["احمد كمال", "سارة محمود", "يوسف حسن", "منة الله كريم", "عمر سامي", "هبة رضا", "كريم فتحي", "نورهان أشرف"];
const AREAS = ["الحادقة", "المسلة", "كيمان فارس", "الصوفي", "دار الرماد", "الشيخ حسن"];
const STREETS = ["الشارع الجديد", "كوافير قمر", "شارع الحرية", "بجوار مسجد الرحمة", "عمارات الأوقاف", "شارع البحر"];
const RIDERS = ["مصطفى صلاح مجاهد كامل", "أحمد صابر عبد الله", "محمود جمال حسين"];
const NOTES = [undefined, undefined, "من غير بصل لو سمحت", "ثومية زيادة", "رن الجرس مرتين"];

let seq = 506890;
function randomOrder(at: number, status: POStatus = "new", soldOut: Record<string, boolean> = { s3: true }): PartnerOrder {
  const store = storeById(PARTNER_STORE_ID)!;
  const items = store.menu.flatMap((c) => c.items).filter((i) => !soldOut[i.id]);
  seq += 1;
  const n = 1 + (seq % 3);
  const lines: PartnerLine[] = Array.from({ length: n }, (_, k) => {
    const it = items[(seq * 7 + k * 5) % items.length];
    const qty = 1 + ((seq + k) % 2);
    const g = it.options?.[0];
    const opt = g?.choices[(seq + k) % g.choices.length];
    return { name: it.name, qty, opts: opt?.name, price: (it.price + (opt?.price ?? 0)) * qty, img: it.img ?? store.cover };
  });
  const subtotal = lines.reduce((s, l) => s + l.price, 0);
  const payment = (["cash", "card", "ewallet"] as const)[seq % 3];
  const deliveryFee = ORDER_MONEY.deliveryFees[seq % ORDER_MONEY.deliveryFees.length];
  const serviceFee = ORDER_MONEY.serviceFee;
  const paymentFee = payment === "cash" ? 0 : Math.round(subtotal * ORDER_MONEY.paymentFeeRate * 10) / 10;
  const gross = subtotal + deliveryFee + serviceFee + paymentFee;
  const discount = seq % 4 === 1 ? { label: "كوبون خصم", amount: deliveryFee } : seq % 4 === 3 ? { label: "المدفوع من رصيد دعوة الأصدقاء", amount: gross } : undefined;
  const total = Math.max(0, Math.round((gross - (discount?.amount ?? 0)) * 10) / 10);
  const assigned = status === "ready" || status === "out" || status === "done";
  return {
    id: `p-${seq}`,
    number: seq,
    customer: CUSTOMERS[seq % CUSTOMERS.length],
    phone: `010${String(10_000_000 + ((seq * 7919) % 89_999_999)).padStart(8, "0")}`,
    street: STREETS[seq % STREETS.length],
    area: AREAS[seq % AREAS.length],
    lines, subtotal, deliveryFee, serviceFee, paymentFee, discount, total, payment,
    placedAt: at,
    status,
    note: NOTES[seq % NOTES.length],
    rider: assigned ? RIDERS[seq % RIDERS.length] : undefined,
    acceptedAt: status !== "new" ? at + 60_000 : undefined,
  };
}

function seedOrders(): PartnerOrder[] {
  const now = Date.now();
  const m = 60_000;
  return [
    randomOrder(now - 4 * m, "preparing"),
    randomOrder(now - 9 * m, "preparing"),
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
  accept: (id: string) => void;
  reject: (id: string) => void;
  /** "تم التجهيز": the order waits for the captain */
  markReady: (id: string) => void;
  /** Demo only: the captain picks ready orders up and delivers them after a while. */
  tick: (now: number) => void;
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

/** Demo timings for the captain after "تم التجهيز". */
const PICKUP_AFTER = 20_000;
const DELIVER_AFTER = 45_000;

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
      accept: (id) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status: "preparing", acceptedAt: Date.now() } : o)) })),
      reject: (id) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status: "rejected" } : o)) })),
      markReady: (id) => set((s) => ({
        orders: s.orders.map((o) => (o.id === id && o.status === "preparing" ? { ...o, status: "ready", readyAt: Date.now(), rider: RIDERS[o.number % RIDERS.length] } : o)),
      })),
      tick: (now) => {
        // Only orders the store moved itself (they carry readyAt/outAt) advance; seeded ones stay put.
        const pickUp = (o: PartnerOrder) => o.status === "ready" && o.readyAt !== undefined && now - o.readyAt > PICKUP_AFTER;
        const deliver = (o: PartnerOrder) => o.status === "out" && o.outAt !== undefined && now - o.outAt > DELIVER_AFTER;
        if (!get().orders.some((o) => pickUp(o) || deliver(o))) return;
        set((s) => ({
          orders: s.orders.map((o) => {
            if (pickUp(o)) return { ...o, status: "out", outAt: now };
            if (deliver(o)) return { ...o, status: "done" };
            return o;
          }),
        }));
      },
      toggleSoldOut: (itemId) => set((s) => ({ soldOut: { ...s.soldOut, [itemId]: !s.soldOut[itemId] } })),
      setPrice: (itemId, price) => set((s) => ({ priceOverride: { ...s.priceOverride, [itemId]: price } })),
      reply: (reviewId, text) => set((s) => ({ reviews: s.reviews.map((r) => (r.id === reviewId ? { ...r, reply: text } : r)) })),
      setSound: (sound) => set({ sound }),
      reset: () => set(initial()),
    }),
    {
      name: "lamha-partner",
      version: 2,
      // v1 orders lack the money breakdown; start fresh.
      migrate: () => initial(),
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
