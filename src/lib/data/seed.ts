import type { CartLine, Order, Promo } from "../types";
import { quote } from "../pricing";
import { storeById, AREAS } from "./stores";
import { TOTAL_MS } from "../order-sim";

/* Synthetic demo profile and history. */

export const PROMOS: Promo[] = [
  { code: "LAMHA20", label: "خصم 20٪ لحد 60 ج.م", kind: "percent", value: 20, maxDiscount: 60, minSubtotal: 150 },
  { code: "FAYOUM", label: "توصيل مجاني", kind: "freeDelivery", value: 0, minSubtotal: 0 },
  { code: "WELCOME50", label: "خصم 50 ج.م", kind: "flat", value: 50, minSubtotal: 200 },
  { code: "SPIN5", label: "خصم 5 ج.م من لفة الحظ", kind: "flat", value: 5, minSubtotal: 50 },
  { code: "SPIN10", label: "خصم 10 ج.م من لفة الحظ", kind: "flat", value: 10, minSubtotal: 80 },
  { code: "SPIN20", label: "خصم 20 ج.م من لفة الحظ", kind: "flat", value: 20, minSubtotal: 120 },
];

export type Address = {
  id: string;
  label: string;
  icon: "home" | "work" | "pin";
  area: string;
  street: string;
  details: string;
  landmark?: string;
  coords: [number, number];
};

export const SEED_ADDRESSES: Address[] = [
  { id: "home", label: "البيت", icon: "home", area: "الحادقة", street: "شارع الجيش", details: "عمارة 12، الدور 3، شقة 7", landmark: "قدام مسجد الحادقة", coords: [29.3168, 30.8402] },
  { id: "work", label: "الشغل", icon: "work", area: "المسلة", street: "شارع الحرية", details: "برج النور، الدور 5", landmark: "جنب البنك الأهلي", coords: [29.3044, 30.8478] },
];

export type WalletTx = { id: string; label: string; amount: number; at: number };
export type Notice = { id: string; title: string; body: string; at: number; read: boolean; kind: "order" | "offer" | "wallet" | "system"; href?: string };

const H = 3600_000;
const D = 24 * H;

function pastOrder(id: string, number: number, storeId: string, lines: CartLine[], daysAgo: number, rated?: Order["rated"]): Order {
  const s = storeById(storeId)!;
  const q = quote({ lines, store: s });
  const placedAt = Date.now() - daysAgo * D - TOTAL_MS;
  return {
    id, number, storeId, lines, quote: q, payment: "cash",
    addressLabel: "البيت", addressText: "الحادقة، شارع الجيش",
    placedAt, offsetMs: 0, etaMinutes: s.etaMax, refunds: [], rated,
  };
}

export function seedOrders(): Order[] {
  return [
    pastOrder("o-1031", 1031, "sakia-shawarma", [
      { key: "s1|s1-p0-صاج,s1-s0|", itemId: "s1", name: "شاورما فراخ", img: "/img/wrap1.jpg", basePrice: 85, choices: [{ id: "s1-p0-صاج", name: "صاج", price: 0 }, { id: "s1-s0", name: "عادي", price: 0 }], qty: 2 },
      { key: "s7|s7-s0|", itemId: "s7", name: "بطاطس", img: "/img/fries2.jpg", basePrice: 35, choices: [{ id: "s7-s0", name: "وسط", price: 0 }], qty: 1 },
    ], 2, { store: 5, rider: 5 }),
    pastOrder("o-1018", 1018, "am-saber", [
      { key: "f5||", itemId: "f5", name: "فطار العيلة", img: "/img/taameya2.jpg", basePrice: 165, choices: [], qty: 1 },
    ], 5, { store: 5, rider: 4 }),
    pastOrder("o-0994", 994, "lamha-mart", [
      { key: "m5||", itemId: "m5", name: "لبن كامل الدسم", img: "/img/milk1.jpg", basePrice: 48, choices: [], qty: 2 },
      { key: "m9||", itemId: "m9", name: "عيش بلدي", img: "/img/bread1.jpg", basePrice: 15, choices: [], qty: 1 },
      { key: "m7||", itemId: "m7", name: "بيض أحمر", img: "/img/eggsraw1.jpg", basePrice: 175, choices: [], qty: 1 },
    ], 9),
  ];
}

export function seedWallet(): WalletTx[] {
  const now = Date.now();
  return [
    { id: "w1", label: "استرداد: بطاطس ناقصة من طلب #980", amount: 35, at: now - 12 * D },
    { id: "w2", label: "شحن رصيد بالكارت", amount: 100, at: now - 20 * D },
    { id: "w3", label: "دفع طلب #971", amount: -50, at: now - 21 * D },
  ];
}

export function seedNotices(): Notice[] {
  const now = Date.now();
  return [
    { id: "n1", title: "كود جديد ليك", body: "استخدم LAMHA20 وخد خصم 20٪ على البرجر والبيتزا لحد آخر الأسبوع", at: now - 3 * H, read: false, kind: "offer", href: "/app/offers" },
    { id: "n2", title: "فلوسك رجعت المحفظة", body: "رجعنالك 35 ج.م عن البطاطس الناقصة في طلب #980", at: now - 12 * D, read: true, kind: "wallet", href: "/app/account/wallet" },
    { id: "n3", title: "طلب #1031 وصل", body: "بالهنا والشفا. قيّم الطلب وخد 10 نقط", at: now - 2 * D, read: true, kind: "order", href: "/app/orders/o-1031" },
  ];
}

export const SEED_USER = { name: "أحمد", phone: "01012345678", wallet: 85, points: 340 };

export const AREA_NAMES = Object.keys(AREAS);
