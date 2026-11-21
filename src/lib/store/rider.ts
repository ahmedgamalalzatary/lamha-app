"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { STORES, AREAS } from "../data/stores";

export type Stage = "offer" | "toStore" | "atStore" | "toCustomer" | "atCustomer";
export type Job = {
  id: string;
  number: number;
  storeId: string;
  storeName: string;
  storeArea: string;
  from: [number, number];
  to: [number, number];
  customer: string;
  customerArea: string;
  customerAddress: string;
  items: { name: string; qty: number }[];
  collect: number;
  fee: number;
  km: number;
  offeredAt: number;
  stage: Stage;
};
export type Trip = { id: string; number: number; storeName: string; area: string; fee: number; tip: number; at: number; km: number };

const CUST = ["هالة س.", "عمرو د.", "شيماء ن.", "مازن ع.", "رحاب ك."];
const ADDR = ["شارع الجيش، عمارة 4", "شارع الحرية، برج النور", "شارع السواقي، فيلا 9", "عمارات الأوقاف، بلوك 2"];

let n = 3300;
export function makeJob(): Job {
  const pool = STORES.filter((s) => s.lamhaRider && s.open);
  const s = pool[Math.floor(Math.random() * pool.length)];
  const areaNames = Object.keys(AREAS).filter((a) => a !== s.area);
  const area = areaNames[Math.floor(Math.random() * areaNames.length)];
  const to = AREAS[area];
  const items = s.menu.flatMap((c) => c.items).slice(0, 6);
  n += 1;
  const km = +(1.2 + Math.random() * 3).toFixed(1);
  return {
    id: `j-${n}`, number: n, storeId: s.id, storeName: s.name, storeArea: s.area,
    from: s.coords, to: [to[0] + (Math.random() - 0.5) * 0.004, to[1] + (Math.random() - 0.5) * 0.004],
    customer: CUST[n % CUST.length], customerArea: area, customerAddress: ADDR[n % ADDR.length],
    items: [{ name: items[n % items.length].name, qty: 2 }, { name: items[(n + 2) % items.length].name, qty: 1 }],
    collect: n % 3 === 0 ? 0 : 140 + (n % 7) * 35, fee: Math.round(18 + km * 6), km, offeredAt: Date.now(), stage: "offer",
  };
}

type State = { online: boolean; job: Job | null; trips: Trip[]; cashInHand: number; signedIn: boolean };
type Actions = {
  setOnline: (v: boolean) => void;
  offer: () => void;
  decline: () => void;
  accept: () => void;
  next: () => void;
  signIn: () => void;
  reset: () => void;
};

const ORDER: Stage[] = ["offer", "toStore", "atStore", "toCustomer", "atCustomer"];

const seedTrips = (): Trip[] => {
  const now = Date.now();
  return [
    { id: "t1", number: 3291, storeName: "كشري الحادقة", area: "المسلة", fee: 26, tip: 10, at: now - 50 * 60_000, km: 1.4 },
    { id: "t2", number: 3287, storeName: "قهوة المسلة", area: "الحادقة", fee: 24, tip: 0, at: now - 95 * 60_000, km: 1.1 },
    { id: "t3", number: 3280, storeName: "مشويات الواحة", area: "الصوفي", fee: 38, tip: 20, at: now - 150 * 60_000, km: 3.2 },
    { id: "t4", number: 3274, storeName: "لمحة ماركت", area: "دار الرماد", fee: 29, tip: 5, at: now - 210 * 60_000, km: 1.9 },
  ];
};

export const useRider = create<State & Actions>()(
  persist(
    (set, get) => ({
      online: false, job: null, trips: seedTrips(), cashInHand: 310, signedIn: false,
      setOnline: (online) => set({ online, job: online ? get().job : null }),
      offer: () => { if (get().online && !get().job) set({ job: makeJob() }); },
      decline: () => set({ job: null }),
      accept: () => set((s) => (s.job ? { job: { ...s.job, stage: "toStore" } } : s)),
      next: () => {
        const { job, trips, cashInHand } = get();
        if (!job) return;
        const i = ORDER.indexOf(job.stage);
        if (job.stage === "atCustomer") {
          const tip = [0, 5, 10, 15][job.number % 4];
          set({
            job: null,
            cashInHand: cashInHand + job.collect,
            trips: [{ id: job.id, number: job.number, storeName: job.storeName, area: job.customerArea, fee: job.fee, tip, at: Date.now(), km: job.km }, ...trips],
          });
          return;
        }
        set({ job: { ...job, stage: ORDER[i + 1] } });
      },
      signIn: () => set({ signedIn: true }),
      reset: () => set({ online: false, job: null, trips: seedTrips(), cashInHand: 310 }),
    }),
    { name: "lamha-rider", version: 1, storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
