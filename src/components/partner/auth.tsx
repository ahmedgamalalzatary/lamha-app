"use client";
import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronRight, Eye, EyeOff, FileImage, Store as StoreIcon } from "lucide-react";
import { usePartner } from "@/lib/store/partner";
import { Wordmark } from "@/components/ui/wordmark";
import { Button } from "@/components/ui/button";
import { Receipt, Row, Perf } from "@/components/ui/receipt";
import { Stamp } from "@/components/ui/stamp";
import { AREA_NAMES } from "@/lib/data/seed";
import { cx } from "@/lib/format";

const KINDS = ["مطعم", "كافيه", "حلواني", "سوبر ماركت", "صيدلية", "عصاير"];

export function PartnerAuth() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  return (
    <main className="min-h-dvh bg-paper">
      <div className="bg-ink px-2 pb-12 pt-3 text-white">
        <Link href="/" aria-label="رجوع" className="tap grid size-10 place-items-center rounded-full hover:bg-white/10"><ChevronRight className="size-6" /></Link>
        <div className="px-4 pt-3">
          <Wordmark className="text-[32px]" />
          <p className="mt-2 text-[15px] text-white/75">لمحة للشركاء: محلك في إيد كل الفيوم</p>
        </div>
      </div>
      <div className="-mt-6 rounded-t-[24px] bg-paper px-5 pt-6">
        <AnimatePresence mode="wait">
          {mode === "login" ? <Login key="l" onSignup={() => setMode("signup")} /> : <Signup key="s" onBack={() => setMode("login")} />}
        </AnimatePresence>
      </div>
    </main>
  );
}

function Login({ onSignup }: { onSignup: () => void }) {
  const signIn = usePartner((s) => s.signIn);
  const [phone, setPhone] = useState("01098765432");
  const [pass, setPass] = useState("lamha2026");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <h1 className="text-[24px] font-bold">دخول المحل</h1>
      <p className="mt-1 text-[14.5px] text-ink-2">الديمو داخل بحساب «شاورما الساقية».</p>
      <label className="mt-6 block">
        <span className="text-[13.5px] font-medium text-ink-2">رقم الموبايل</span>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" inputMode="tel" className="mt-1.5 h-14 w-full rounded-2xl bg-sheet px-4 text-end text-[17px] outline-none ring-1 ring-rule focus:ring-2 focus:ring-pen" />
      </label>
      <label className="mt-4 block">
        <span className="text-[13.5px] font-medium text-ink-2">كلمة السر</span>
        <span className="mt-1.5 flex h-14 items-center rounded-2xl bg-sheet ring-1 ring-rule focus-within:ring-2 focus-within:ring-pen">
          <input type={show ? "text" : "password"} value={pass} onChange={(e) => setPass(e.target.value)} dir="ltr" className="h-full min-w-0 flex-1 bg-transparent px-4 text-end text-[17px] outline-none" />
          <button type="button" aria-label={show ? "اخفي كلمة السر" : "اظهر كلمة السر"} onClick={() => setShow(!show)} className="tap grid size-12 place-items-center text-ink-3">{show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}</button>
        </span>
      </label>
      <button className="mt-2 text-[13.5px] text-pen">نسيت كلمة السر؟</button>
      <Button block size="lg" className="mt-6" loading={busy} disabled={!phone || !pass} onClick={() => { setBusy(true); setTimeout(signIn, 700); }}>ادخل</Button>
      <div className="mt-8 rounded-[18px] bg-sheet p-4 shadow-sheet">
        <p className="text-[15px] font-semibold">محلك لسه مش على لمحة؟</p>
        <p className="mt-1 text-[13.5px] text-ink-2">سجّل من موبايلك في 3 دقايق، من غير ما حد يزورك.</p>
        <Button variant="secondary" block className="mt-3" onClick={onSignup}><StoreIcon className="size-4.5" /> سجّل محلك</Button>
      </div>
    </motion.div>
  );
}

function Signup({ onBack }: { onBack: () => void }) {
  const { submitApplication, signIn } = usePartner();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: "", kind: "مطعم", area: "الحادقة", owner: "", phone: "", commission: "12" });
  const [doc, setDoc] = useState(false);
  const steps = ["المحل", "صاحب المحل", "الأوراق", "خلاص"];
  const can = step === 0 ? f.name.trim().length > 1 : step === 1 ? f.owner.trim().length > 1 && /^01[0125]\d{8}$/.test(f.phone) : step === 2 ? doc : true;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pb-10">
      <ol className="flex items-center gap-2" aria-label="خطوات التسجيل">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col gap-1.5">
            <span className={cx("h-1.5 rounded-full", i <= step ? "bg-pen" : "bg-rule")} />
            <span className={cx("text-[12px]", i === step ? "font-semibold text-pen" : "text-ink-3")}>{s}</span>
          </li>
        ))}
      </ol>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="mt-6">
          {step === 0 && (
            <div className="space-y-4">
              <h1 className="text-[22px] font-bold">عرّفنا بمحلك</h1>
              <In label="اسم المحل" value={f.name} onChange={(v) => setF({ ...f, name: v })} placeholder="مثلاً: فطاطري الحرية" />
              <div>
                <span className="text-[13.5px] font-medium text-ink-2">النوع</span>
                <div className="mt-2 flex flex-wrap gap-2">{KINDS.map((k) => <button key={k} aria-pressed={f.kind === k} onClick={() => setF({ ...f, kind: k })} className={cx("tap h-10 rounded-full px-4 text-[14px] ring-1 ring-inset", f.kind === k ? "bg-pen text-white ring-pen" : "bg-sheet ring-rule")}>{k}</button>)}</div>
              </div>
              <label className="block"><span className="text-[13.5px] font-medium text-ink-2">المنطقة</span>
                <select value={f.area} onChange={(e) => setF({ ...f, area: e.target.value })} className="mt-1.5 h-14 w-full rounded-2xl bg-sheet px-4 text-[16px] outline-none ring-1 ring-rule">{AREA_NAMES.map((a) => <option key={a}>{a}</option>)}</select>
              </label>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <h1 className="text-[22px] font-bold">مين صاحب المحل؟</h1>
              <In label="الاسم بالكامل" value={f.owner} onChange={(v) => setF({ ...f, owner: v })} placeholder="الاسم زي البطاقة" />
              <In label="رقم الموبايل" value={f.phone} onChange={(v) => setF({ ...f, phone: v.replace(/\D/g, "").slice(0, 11) })} placeholder="01xxxxxxxxx" ltr />
              {f.phone.length === 11 && !/^01[0125]\d{8}$/.test(f.phone) && <p className="text-[13px] text-void">الرقم لازم يبدأ بـ 010 أو 011 أو 012 أو 015</p>}
            </div>
          )}
          {step === 2 && (
            <div>
              <h1 className="text-[22px] font-bold">صورة السجل التجاري</h1>
              <p className="mt-1 text-[14px] text-ink-2">أو البطاقة الضريبية. بنستخدمها للتأكد بس.</p>
              <button onClick={() => setDoc(true)} className={cx("tap mt-4 grid h-44 w-full place-items-center rounded-[18px] border-2 border-dashed", doc ? "border-stamp bg-stamp-50" : "border-leader bg-sheet")}>
                {doc ? <span className="flex flex-col items-center gap-2 text-stamp"><Check className="size-9" /><span className="text-[15px] font-medium">السجل_التجاري.jpg</span></span> : <span className="flex flex-col items-center gap-2 text-ink-2"><FileImage className="size-9 text-pen" /><span className="text-[15px] font-medium">صوّر الورقة</span></span>}
              </button>
              <div className="mt-5">
                <Receipt>
                  <p className="text-[15px] font-semibold">الاتفاق بوضوح</p>
                  <div className="mt-1 text-[14px]">
                    <Row label="عمولة لمحة على الطلب">12%</Row>
                    <Row label="رسوم اشتراك">مفيش</Row>
                    <Row label="تحويل الفلوس">كل أسبوع</Row>
                    <Row label="الطيارين">علينا</Row>
                  </div>
                  <Perf className="my-2" />
                  <p className="text-[12.5px] text-ink-3">تقدر توقف التعامل في أي وقت من غير شرط جزائي.</p>
                </Receipt>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="flex flex-col items-center pt-6 text-center">
              <Stamp tone="stamp" size="lg" animate>اتبعت للمراجعة</Stamp>
              <h1 className="mt-8 text-[22px] font-bold">طلب «{f.name}» وصلنا</h1>
              <p className="mt-2 max-w-[32ch] text-[14.5px] leading-relaxed text-ink-2">فريقنا هيراجع الأوراق ويكلمك على {f.phone} خلال 24 ساعة. بعدها ترفع المنيو وتبدأ تستقبل طلبات.</p>
              <Button className="mt-8" block size="lg" onClick={signIn}>اتفرج على لوحة المحل (ديمو)</Button>
              <button onClick={onBack} className="mt-3 text-[14px] text-pen">رجوع لتسجيل الدخول</button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      {step < 3 && (
        <div className="mt-8 flex gap-3">
          <Button variant="secondary" onClick={() => (step === 0 ? onBack() : setStep(step - 1))}>رجوع</Button>
          <Button block disabled={!can} onClick={() => { if (step === 2) submitApplication(); setStep(step + 1); }}>{step === 2 ? "ابعت الطلب" : "التالي"}</Button>
        </div>
      )}
    </motion.div>
  );
}

function In({ label, value, onChange, placeholder, ltr }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; ltr?: boolean }) {
  return (
    <label className="block">
      <span className="text-[13.5px] font-medium text-ink-2">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} dir={ltr ? "ltr" : undefined} className={cx("mt-1.5 h-14 w-full rounded-2xl bg-sheet px-4 text-[16px] outline-none ring-1 ring-rule focus:ring-2 focus:ring-pen", ltr && "text-end")} />
    </label>
  );
}
