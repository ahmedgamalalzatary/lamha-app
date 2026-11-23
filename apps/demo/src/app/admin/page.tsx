"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BarChart3, Bell, Bike, ChevronUp, ClipboardList, Home, Megaphone, Menu, Package, Search, SquarePen, Store as StoreIcon, Users, UserRound,
} from "lucide-react";
import { STORES } from "@/lib/data/stores";
import { usePartner, PARTNER_STORE_ID, paymentLabel, STATUS_LABEL, type POStatus } from "@/lib/store/partner";
import { cx } from "@/lib/format";

/*
 * Admin dashboard, orders page, copied from the Tawsilty admin
 * (.impeccable/phone/admin/admin-orders-list-sidebar-status-tabs-flags.png):
 * right sidebar with screen search and grouped links, status tabs, orange table header,
 * order code with flags (بدون كابتن, عميل, ملاحظات) and row actions (assign captain, notify, edit).
 * Only the code and actions columns are visible in the photo; the middle columns are the order
 * fields the store screens already show.
 */
const NAV: { label: string; icon: typeof Home; items?: { label: string; href?: string }[] }[] = [
  { label: "الرئيسية", icon: Home },
  { label: "الطلبات", icon: ClipboardList, items: [{ label: "الطلبات", href: "/admin" }] },
  { label: "العملاء", icon: Users, items: [{ label: "الشكاوى والاقتراحات" }] },
  { label: "الموردين", icon: StoreIcon, items: [{ label: "الموردين" }] },
  { label: "المندوبين", icon: Bike, items: [{ label: "المندوبين" }] },
  { label: "المنتجات والكتالوج", icon: Package, items: [{ label: "منتجات الموردين" }, { label: "منتجات غير فعالة" }] },
  { label: "التسويق والعروض", icon: Megaphone, items: [{ label: "الإشعارات التفاعلية" }] },
  { label: "التقارير", icon: BarChart3, items: [{ label: "التقارير" }] },
];

const TABS: { id: POStatus; label: string }[] = [
  { id: "new", label: "قيد المراجعة" },
  { id: "preparing", label: "قيد التجهيز" },
  { id: "out", label: "جارية التوصيل" },
  { id: "done", label: "تم التوصيل" },
];

const CAPTAINS = ["مصطفى صلاح", "أحمد صابر", "محمود جمال", "كريم عادل"];

type Row = {
  id: string; code: number; store: string; customer: string; total: number; pay: string; status: POStatus;
  captain?: string; note?: string; firstOrder?: boolean; at: number;
};

/** Orders from other stores, so the table looks like a live platform; the partner demo store's orders are added live. */
function otherOrders(): Row[] {
  const names = ["محمد علي", "رحمة سيد", "عمرو خالد", "دينا مصطفى", "إسلام حسن", "ياسمين فوزي", "مازن أشرف", "شيماء عادل"];
  const statuses: POStatus[] = ["new", "preparing", "preparing", "out", "out", "done", "done", "preparing", "new", "out"];
  const stores = STORES.filter((s) => s.id !== PARTNER_STORE_ID);
  const now = Date.now();
  return statuses.map((status, i) => ({
    id: `a-${i}`,
    code: 504578 - i * 2,
    store: stores[i % stores.length].name,
    customer: names[i % names.length],
    total: 95 + ((i * 47) % 260),
    pay: ["الدفع عند الاستلام", "محفظة الكترونية", "بطاقة الإئتمان"][i % 3],
    status,
    captain: status === "out" || status === "done" ? CAPTAINS[i % CAPTAINS.length] : i === 3 || i === 7 ? undefined : CAPTAINS[(i + 1) % CAPTAINS.length],
    note: i % 4 === 1 ? "من غير بصل" : undefined,
    firstOrder: i % 5 === 3,
    at: now - (i + 1) * 7 * 60_000,
  }));
}

export default function AdminOrders() {
  const partnerOrders = usePartner((s) => s.orders);
  const [tab, setTab] = useState<POStatus>("preparing");
  const [q, setQ] = useState("");
  const [assigned, setAssigned] = useState<Record<string, string>>({});
  const [assigning, setAssigning] = useState<Row | null>(null);
  const [others] = useState(otherOrders);
  const partnerStore = STORES.find((s) => s.id === PARTNER_STORE_ID)!.name;

  const rows = useMemo<Row[]>(() => {
    const live = partnerOrders
      .filter((o) => o.status !== "rejected")
      .map((o) => ({
        id: o.id, code: o.number, store: partnerStore, customer: o.customer, total: o.total, pay: paymentLabel(o),
        status: (o.status === "ready" ? "preparing" : o.status) as POStatus, captain: o.rider, note: o.note, at: o.placedAt,
      }));
    return [...live, ...others].map((r) => ({ ...r, captain: assigned[r.id] ?? r.captain })).sort((a, b) => b.at - a.at);
  }, [partnerOrders, others, assigned, partnerStore]);

  const list = rows.filter((r) => r.status === tab);

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden bg-[#f4f5f7] font-tw text-tw-ink" dir="rtl">
      {/* Sidebar */}
      <aside className="flex w-[290px] shrink-0 flex-col border-s border-tw-line bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href="/" className="grid size-10 place-items-center rounded-lg bg-tw text-[18px] font-bold text-white" aria-label="الرئيسية">ت</Link>
          <Menu className="size-5 text-tw-ink-2" />
        </div>
        <label className="mx-4 flex h-11 items-center gap-2 rounded-lg bg-tw-input px-3 text-[14px] text-tw-ink-2">
          <Search className="size-4.5" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن شاشة..." className="min-w-0 flex-1 bg-transparent outline-none" />
        </label>
        <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-6">
          {NAV.filter((g) => !q || g.label.includes(q) || g.items?.some((i) => i.label.includes(q))).map((g) => (
            <div key={g.label} className="mb-1">
              <div className="flex items-center gap-3 px-3 py-2.5 text-[15px] font-medium">
                <g.icon className="size-5 text-tw" />
                <span className="flex-1">{g.label}</span>
                {g.items && <ChevronUp className="size-4 text-tw-ink-2" />}
              </div>
              {g.items?.map((i) => {
                const on = i.href === "/admin";
                return (
                  <button
                    key={i.label}
                    onClick={() => !i.href && toast(`${i.label}: الشاشة دي في المرحلة الجاية`)}
                    className={cx("tap relative block w-full rounded-lg py-2.5 pe-3 ps-11 text-start text-[14px]", on ? "bg-tw-50 text-tw-700" : "text-tw-ink-2 hover:bg-tw-surface")}
                  >
                    {on && <span className="absolute inset-y-2 start-6 w-[3px] rounded-full bg-tw" />}
                    {i.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Orders */}
      <main className="flex min-w-0 flex-1 flex-col p-6">
        <h1 className="text-[22px] font-semibold">الطلبات</h1>
        <div className="mt-4 flex gap-6 border-b border-tw-line" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cx("relative pb-3 text-[15px]", tab === t.id ? "font-semibold text-tw-700" : "text-tw-ink-2")}>
              {t.label} ({rows.filter((r) => r.status === t.id).length})
              {tab === t.id && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-t-full bg-tw" />}
            </button>
          ))}
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-xl bg-white shadow-sm">
          <table className="w-full min-w-[820px] text-[14px]">
            <thead className="sticky top-0 bg-tw text-white">
              <tr>
                {["الكود", "المورد", "العميل", "الإجمالي", "طريقة الدفع", "الكابتن", "العمليات"].map((h) => <th key={h} className="px-4 py-3 text-start font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const noCaptain = !r.captain && r.status !== "done";
                const flagged = noCaptain || r.firstOrder || r.note;
                return (
                  <tr key={r.id} className="border-b border-tw-line last:border-0">
                    <td className={cx("relative px-4 py-3", flagged && "before:absolute before:inset-y-2 before:end-0 before:w-[3px] before:rounded-full before:bg-tw-danger")}>
                      <p className="font-medium tabular-nums">#{r.code}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {noCaptain && <span className="rounded-md border border-tw-danger px-1.5 text-[11.5px] text-tw-danger">بدون كابتن</span>}
                        {r.firstOrder && <span className="inline-flex items-center gap-0.5 rounded-md border border-violet-400 bg-violet-50 px-1.5 text-[11.5px] text-violet-700"><UserRound className="size-3" /> عميل</span>}
                        {r.note && <span title={r.note} className="rounded-md border border-tw-danger px-1.5 text-[11.5px] text-tw-danger">ملاحظات</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">{r.store}</td>
                    <td className="px-4 py-3">{r.customer}</td>
                    <td className="px-4 py-3 tabular-nums">{r.total.toFixed(1)} ج.م</td>
                    <td className="px-4 py-3">{r.pay}</td>
                    <td className="px-4 py-3">{r.captain ?? <span className="text-tw-ink-2">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-tw-ink-2">
                        <button onClick={() => setAssigning(r)} aria-label="عيّن كابتن" className="tap hover:text-tw"><Bike className="size-5" /></button>
                        <button onClick={() => toast(`تم إرسال إشعار للطلب #${r.code}`)} aria-label="إشعار" className="tap hover:text-tw"><Bell className="size-5" /></button>
                        <button onClick={() => toast(`تعديل الطلب #${r.code}`)} aria-label="تعديل" className="tap hover:text-tw"><SquarePen className="size-5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={7} className="py-16 text-center text-tw-ink-2">لا توجد طلبات {STATUS_LABEL[tab]}</td></tr>}
            </tbody>
          </table>
        </div>
      </main>

      {assigning && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40" onClick={() => setAssigning(null)}>
          <div className="w-[360px] rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="عيّن كابتن">
            <p className="text-[17px] font-semibold">عيّن كابتن للطلب #{assigning.code}</p>
            <ul className="mt-3 divide-y divide-tw-line">
              {CAPTAINS.map((c) => (
                <li key={c}>
                  <button onClick={() => { setAssigned((s) => ({ ...s, [assigning.id]: c })); toast.success(`${c} اتعين على الطلب #${assigning.code}`); setAssigning(null); }} className="tap flex w-full items-center gap-3 py-3 text-start text-[15px]">
                    <Bike className="size-5 text-tw" /> {c}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
