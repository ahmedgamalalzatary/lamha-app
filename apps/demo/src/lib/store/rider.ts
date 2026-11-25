"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { STORES, AREAS } from "../data/stores";
import { SHIFT_RULES } from "../data/admin";

export type Stage = "offer" | "toStore" | "atStore" | "toCustomer" | "atCustomer";
export type Job = {
  id: string;
  number: number;
  storeId: string;
  storeName: string;
  storeArea: string;
  storeAddress: string;
  from: [number, number];
  to: [number, number];
  customer: string;
  customerPhone: string;
  customerArea: string;
  customerAddress: string;
  /** img: the product's photo [Client: "صوره المنتجات تبان هنا"]; jobs saved before it have none */
  items: { name: string; qty: number; price: number; img?: string }[];
  /** paid to the store in cash at pickup (0 when the store is paid online) */
  storePay: number;
  collect: number;
  fee: number;
  km: number;
  offeredAt: number;
  stage: Stage;
};
export type Trip = { id: string; number: number; storeName: string; area: string; fee: number; tip: number; at: number; km: number; status?: "delivered" | "cancelled"; items?: number };
export type Shift = { id: string; start: number; end: number; zone: string };
export type Fine = { id: string; reason: string; amount: number; at: number; order?: number };
export type RiderNotice = { id: string; text: string; at: number; tone: "warn" | "bad" | "info" };

const CUST = ["هالة سيد", "عمرو درويش", "شيماء نبيل", "مازن علي", "رحاب كمال"];
const ADDR = ["شارع الجيش، عمارة 4", "شارع الحرية، برج النور", "شارع السواقي، فيلا 9", "عمارات الأوقاف، بلوك 2"];
const STREET: Record<string, string> = { "الحادقة": "شارع الجيش", "المسلة": "ميدان المسلة", "حي الجامعة": "طريق الجامعة", "الصوفي": "شارع الصوفي", "كيمان فارس": "شارع كيمان فارس", "قحافة": "طريق قحافة", "دار الرماد": "شارع دار الرماد", "الشيخ حسن": "شارع الشيخ حسن" };

let n = 3300;
export function makeJob(): Job {
  const pool = STORES.filter((s) => s.lamhaRider && s.open);
  const s = pool[Math.floor(Math.random() * pool.length)];
  const areaNames = Object.keys(AREAS).filter((a) => a !== s.area);
  const area = areaNames[Math.floor(Math.random() * areaNames.length)];
  const to = AREAS[area];
  const all = s.menu.flatMap((c) => c.items).slice(0, 6);
  n += 1;
  const km = +(1.2 + Math.random() * 3).toFixed(1);
  const a = all[n % all.length];
  const b = all[(n + 2) % all.length];
  const items = [{ name: a.name, qty: 2, price: a.price * 2, img: a.img }, { name: b.name, qty: 1, price: b.price, img: b.img }];
  const sub = items.reduce((a, i) => a + i.price, 0);
  const fee = Math.round(18 + km * 6);
  const paid = n % 3 === 0;
  return {
    id: `j-${n}`, number: n, storeId: s.id, storeName: s.name, storeArea: s.area, storeAddress: `${s.area}، ${STREET[s.area] ?? "الشارع الرئيسي"}`,
    from: s.coords, to: [to[0] + (Math.random() - 0.5) * 0.004, to[1] + (Math.random() - 0.5) * 0.004],
    customer: CUST[n % CUST.length], customerPhone: "01012345678", customerArea: area, customerAddress: ADDR[n % ADDR.length],
    items, storePay: paid ? 0 : sub, collect: paid ? 0 : sub + fee, fee, km, offeredAt: Date.now(), stage: "offer",
  };
}

const M = 60_000;
const H = 60 * M;
const D = 24 * H;

/** Next shift: starts a few minutes from now so the demo can open it right away. */
const seedShifts = (): Shift[] => {
  const now = Date.now();
  const s = now + 9 * M;
  return [
    { id: "sh1", start: s, end: s + 5 * H + 45 * M, zone: "الحادقة والمسلة" },
    { id: "sh2", start: s + D, end: s + D + 5 * H, zone: "الحادقة والمسلة" },
    { id: "sh3", start: s + 2 * D, end: s + 2 * D + 6 * H, zone: "حي الجامعة" },
  ];
};

type State = {
  online: boolean;
  job: Job | null;
  trips: Trip[];
  cashInHand: number;
  signedIn: boolean;
  shifts: Shift[];
  /** the shift currently being worked (by id) */
  activeShift: string | null;
  /** consecutive offers skipped */
  skips: number;
  suspendedUntil: number;
  fines: Fine[];
  notices: RiderNotice[];
};
type Actions = {
  setOnline: (v: boolean) => void;
  startShift: (id: string) => void;
  endShift: () => void;
  extendShift: () => void;
  offer: () => void;
  decline: (auto?: boolean) => void;
  accept: () => void;
  next: () => void;
  signIn: () => void;
  reset: () => void;
};

const ORDER: Stage[] = ["offer", "toStore", "atStore", "toCustomer", "atCustomer"];

const seedTrips = (): Trip[] => {
  const now = Date.now();
  return [
    { id: "t1", number: 3291, storeName: "كشري الحادقة", area: "المسلة", fee: 26, tip: 10, at: now - 50 * M, km: 1.4, status: "delivered", items: 3 },
    { id: "t2", number: 3287, storeName: "قهوة المسلة", area: "الحادقة", fee: 24, tip: 0, at: now - 95 * M, km: 1.1, status: "delivered", items: 2 },
    { id: "t3", number: 3280, storeName: "مشويات الواحة", area: "الصوفي", fee: 38, tip: 20, at: now - 150 * M, km: 3.2, status: "delivered", items: 4 },
    { id: "t4", number: 3274, storeName: "لمحة ماركت", area: "دار الرماد", fee: 29, tip: 5, at: now - 210 * M, km: 1.9, status: "delivered", items: 6 },
    { id: "t5", number: 3251, storeName: "سماش لاب", area: "حي الجامعة", fee: 0, tip: 0, at: now - 1 * D - 3 * H, km: 2.8, status: "cancelled", items: 2 },
    { id: "t6", number: 3240, storeName: "شاورما الساقية", area: "كيمان فارس", fee: 31, tip: 10, at: now - 1 * D - 6 * H, km: 2.2, status: "delivered", items: 3 },
    { id: "t7", number: 3198, storeName: "حلواني الفيوم", area: "الحادقة", fee: 25, tip: 0, at: now - 3 * D, km: 1.3, status: "delivered", items: 1 },
    { id: "t8", number: 3150, storeName: "فول وطعمية عم صابر", area: "المسلة", fee: 22, tip: 5, at: now - 6 * D, km: 0.9, status: "delivered", items: 5 },
  ];
};

const seedFines = (): Fine[] => {
  const now = Date.now();
  return [
    { id: "f1", reason: "تأخير 15 دقيقة عن ميعاد بداية النوبة", amount: 20, at: now - 2 * D },
    { id: "f2", reason: "طلب اتلغى بعد القبول من غير سبب", amount: 15, at: now - 1 * D - 3 * H, order: 3251 },
  ];
};

const uid = () => Math.random().toString(36).slice(2, 8);

export const useRider = create<State & Actions>()(
  persist(
    (set, get) => ({
      online: false, job: null, trips: seedTrips(), cashInHand: 310, signedIn: false,
      shifts: seedShifts(), activeShift: null, skips: 0, suspendedUntil: 0, fines: seedFines(), notices: [],

      setOnline: (online) => set({ online, job: online ? get().job : null }),

      startShift: (id) => {
        const sh = get().shifts.find((x) => x.id === id);
        if (!sh || Date.now() < sh.start - SHIFT_RULES.unlockBeforeMin * M || Date.now() > sh.end) return;
        set({ activeShift: id, online: true });
      },
      endShift: () => set((s) => ({ activeShift: null, online: false, job: s.job?.stage === "offer" ? null : s.job, shifts: s.shifts.filter((x) => x.id !== s.activeShift) })),
      extendShift: () => set((s) => ({
        shifts: s.shifts.map((x) => (x.id === s.activeShift ? { ...x, end: Math.max(x.end, Date.now()) + SHIFT_RULES.extendMin * M } : x)),
        notices: [{ id: uid(), text: `اتمدت نوبتك ${SHIFT_RULES.extendMin} دقيقة`, at: Date.now(), tone: "info" as const }, ...s.notices],
      })),

      offer: () => {
        const s = get();
        const sh = s.shifts.find((x) => x.id === s.activeShift);
        // No orders outside a shift, after it ends (unless extended), or while suspended
        if (!s.online || s.job || !sh || Date.now() > sh.end || Date.now() < s.suspendedUntil) return;
        set({ job: makeJob() });
      },

      decline: (auto) => set((s) => {
        const skips = s.skips + 1;
        const now = Date.now();
        if (skips >= SHIFT_RULES.skipsSuspend) {
          return {
            job: null, skips: 0, suspendedUntil: now + SHIFT_RULES.suspendMin * M,
            notices: [{ id: uid(), text: `إيقاف مؤقت ${SHIFT_RULES.suspendMin} دقيقة بسبب تخطي ${skips} طلبات ورا بعض`, at: now, tone: "bad" as const }, ...s.notices],
          };
        }
        return {
          job: null, skips,
          notices: skips >= SHIFT_RULES.skipsWarn
            ? [{ id: uid(), text: `تنبيه: تخطيت ${skips} طلبات${auto ? " (الوقت خلص)" : ""}. لو تخطيت كمان هيتعمل إيقاف مؤقت`, at: now, tone: "warn" as const }, ...s.notices]
            : s.notices,
        };
      }),

      accept: () => set((s) => (s.job ? { job: { ...s.job, stage: "toStore" }, skips: 0 } : s)),

      next: () => {
        const { job, trips, cashInHand } = get();
        if (!job) return;
        const i = ORDER.indexOf(job.stage);
        if (job.stage === "atCustomer") {
          const tip = [0, 5, 10, 15][job.number % 4];
          set({
            job: null,
            cashInHand: cashInHand + job.collect - job.storePay,
            trips: [{ id: job.id, number: job.number, storeName: job.storeName, area: job.customerArea, fee: job.fee, tip, at: Date.now(), km: job.km, status: "delivered", items: job.items.reduce((a, it) => a + it.qty, 0) }, ...trips],
          });
          return;
        }
        set({ job: { ...job, stage: ORDER[i + 1] } });
      },
      signIn: () => set({ signedIn: true }),
      reset: () => set({ online: false, job: null, trips: seedTrips(), cashInHand: 310, shifts: seedShifts(), activeShift: null, skips: 0, suspendedUntil: 0, fines: seedFines(), notices: [] }),
    }),
    { name: "lamha-rider", version: 2, storage: createJSONStorage(() => localStorage), skipHydration: true, migrate: () => ({}) as never },
  ),
);
