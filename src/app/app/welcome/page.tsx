"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronRight, LocateFixed, MapPin, MessageSquareText, Phone } from "lucide-react";
import { Wordmark } from "@/components/ui/wordmark";
import { Button } from "@/components/ui/button";
import { Receipt, Row, Perf } from "@/components/ui/receipt";
import { Stamp } from "@/components/ui/stamp";
import { Photo } from "@/components/ui/bits";
import { useCustomer } from "@/lib/store/customer";
import { AREA_NAMES } from "@/lib/data/seed";
import { cx } from "@/lib/format";

type Step = "intro" | "phone" | "otp" | "name" | "area";

const SLIDES = [
  {
    title: "اللي تشوفه هو اللي تدفعه",
    body: "التوصيل والخصم وكل قرش مكتوب في الفاتورة قبل ما تأكد. مفيش مفاجآت على الباب.",
    art: (
      <Receipt className="mx-auto w-[260px] text-[14px]">
        <Row label="شاورما فراخ × 2" amount={170} />
        <Row label="التوصيل" amount={0} struck={15} tone="stamp" />
        <Row label="رسوم الخدمة" amount={0} />
        <Perf className="my-2" />
        <Row label={<span className="marked">الإجمالي</span>} amount={170} bold />
      </Receipt>
    ),
  },
  {
    title: "غيّرت رأيك؟ الغي أو عدّل",
    body: "قبل ما المحل يأكد تقدر تلغي ببلاش أو تعدّل طلبك. ولو جالك صنف غلط، فلوسه ترجع محفظتك فوراً.",
    art: (
      <div className="relative mx-auto w-[260px]">
        <Receipt className="text-[14px]">
          <Row label={<s className="decoration-void decoration-2">بطاطس كبير</s>} amount={35} tone="muted" />
          <Row label="سماش دبل" amount={225} />
          <Row label="رجع للمحفظة" amount={35} tone="stamp" />
        </Receipt>
        <Stamp tone="void" size="lg" className="absolute -top-3 start-6" animate>
          مسترد
        </Stamp>
      </div>
    ),
  },
  {
    title: "كل الفيوم في لمحة",
    body: "مطاعم وكافيهات، ماركت في 20 دقيقة، صيدليات 24 ساعة، وطيار يوصل أي حاجة من مكان لمكان.",
    art: (
      <div className="mx-auto grid w-[272px] grid-cols-3 gap-2">
        {["koshari1", "shawarma1", "kunafa1", "market1", "taameya1", "pharmacy1"].map((n, i) => (
          <Photo key={n} src={`/img/${n}.jpg`} alt="" className={cx("aspect-square rounded-2xl", i % 2 ? "translate-y-3" : "")} sizes="90px" />
        ))}
      </div>
    ),
  },
];

export default function Welcome() {
  const router = useRouter();
  const { signIn, finishOnboarding } = useCustomer();
  const [step, setStep] = useState<Step>("intro");
  const [slide, setSlide] = useState(0);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [area, setArea] = useState("الحادقة");

  const valid = /^1[0125]\d{8}$/.test(phone);

  const done = () => {
    signIn(name.trim(), `0${phone || "1012345678"}`);
    finishOnboarding();
    useCustomer.setState({ addressId: area === "المسلة" ? "work" : "home" });
    router.replace("/app");
  };

  const back = () => setStep(step === "phone" ? "intro" : step === "otp" ? "phone" : step === "name" ? "otp" : "name");

  return (
    <main className="flex min-h-dvh flex-col bg-paper">
      <AnimatePresence mode="wait" initial={false}>
        {step === "intro" && (
          <motion.section key="intro" exit={{ opacity: 0 }} className="flex min-h-dvh flex-col">
            <div className="flex items-center justify-between px-5 pt-6">
              <Wordmark className="text-[30px] text-pen" />
              <button onClick={() => setStep("phone")} className="tap rounded-full px-3 py-1.5 text-[14px] text-ink-2 hover:bg-pen-50">
                تخطي
              </button>
            </div>
            <div className="flex flex-1 flex-col justify-center">
              <AnimatePresence mode="wait">
                <motion.div key={slide} initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
                  <div className="flex h-[300px] items-center justify-center">{SLIDES[slide].art}</div>
                  <div className="px-7 pt-6">
                    <h1 className="text-[26px] font-bold leading-tight">{SLIDES[slide].title}</h1>
                    <p className="mt-3 text-[15.5px] leading-relaxed text-ink-2">{SLIDES[slide].body}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="pb-safe flex items-center gap-4 px-6 pt-4">
              <div className="flex flex-1 gap-1.5" role="tablist" aria-label="الشرائح">
                {SLIDES.map((_, i) => (
                  <button key={i} role="tab" aria-selected={slide === i} aria-label={`شريحة ${i + 1}`} onClick={() => setSlide(i)} className={cx("h-2 rounded-full transition-all duration-500", slide === i ? "w-8 bg-pen" : "w-2 bg-rule")} />
                ))}
              </div>
              <Button size="lg" onClick={() => (slide < SLIDES.length - 1 ? setSlide(slide + 1) : setStep("phone"))}>
                {slide < SLIDES.length - 1 ? "التالي" : "يلا نبدأ"}
              </Button>
            </div>
          </motion.section>
        )}

        {step !== "intro" && (
          <motion.section key="auth" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-dvh flex-col">
            <div className="bg-pen px-2 pb-10 pt-3 text-white">
              <button onClick={back} aria-label="رجوع" className="tap grid size-10 place-items-center rounded-full hover:bg-white/10">
                <ChevronRight className="size-6" />
              </button>
              <div className="px-4 pt-4">
                <Wordmark className="text-[34px]" />
              </div>
            </div>
            <div className="-mt-5 flex-1 rounded-t-[24px] bg-paper px-5 pt-7">
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
                  {step === "phone" && (
                    <PhoneStep phone={phone} setPhone={setPhone} valid={valid} onNext={() => setStep("otp")} onSocial={() => setStep("name")} onGuest={done} />
                  )}
                  {step === "otp" && <OtpStep phone={phone} onNext={() => setStep("name")} />}
                  {step === "name" && (
                    <div>
                      <h1 className="text-[24px] font-bold">نناديك بإيه؟</h1>
                      <p className="mt-1.5 text-[15px] text-ink-2">اسمك بيظهر للطيار عشان يعرفك.</p>
                      <label className="mt-6 block">
                        <span className="text-[13.5px] font-medium text-ink-2">الاسم</span>
                        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً: أحمد" className="mt-1.5 h-14 w-full rounded-2xl bg-sheet px-4 text-[17px] outline-none ring-1 ring-rule focus:ring-2 focus:ring-pen" />
                      </label>
                      <Button block size="lg" className="mt-6" onClick={() => setStep("area")}>
                        كمّل
                      </Button>
                    </div>
                  )}
                  {step === "area" && (
                    <div>
                      <h1 className="text-[24px] font-bold">نوصلك فين؟</h1>
                      <p className="mt-1.5 text-[15px] text-ink-2">اختار منطقتك عشان نوريك المحلات القريبة ومواعيد التوصيل الحقيقية.</p>
                      <Button variant="secondary" block size="lg" className="mt-6" onClick={() => setArea("الحادقة")}>
                        <LocateFixed className="size-5" /> استخدم موقعي الحالي
                      </Button>
                      <div className="mt-5 flex flex-wrap gap-2" role="radiogroup" aria-label="المنطقة">
                        {AREA_NAMES.map((a) => (
                          <button key={a} role="radio" aria-checked={area === a} onClick={() => setArea(a)} className={cx("tap inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14.5px] ring-1 ring-inset", area === a ? "bg-pen text-white ring-pen" : "bg-sheet text-ink ring-rule")}>
                            <MapPin className="size-4" /> {a}
                          </button>
                        ))}
                      </div>
                      <Button block size="lg" className="mt-8" onClick={done}>
                        يلا نطلب
                      </Button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}

function PhoneStep({ phone, setPhone, valid, onNext, onSocial, onGuest }: { phone: string; setPhone: (v: string) => void; valid: boolean; onNext: () => void; onSocial: () => void; onGuest: () => void }) {
  const touched = phone.length >= 10;
  return (
    <div>
      <h1 className="text-[24px] font-bold">أهلاً بيك</h1>
      <p className="mt-1.5 text-[15px] text-ink-2">اكتب رقم موبايلك وهنبعتلك كود تأكيد.</p>
      <label className="mt-6 block">
        <span className="text-[13.5px] font-medium text-ink-2">رقم الموبايل</span>
        <div className={cx("mt-1.5 flex h-14 items-center gap-3 rounded-2xl bg-sheet px-4 ring-1 focus-within:ring-2", touched && !valid ? "ring-void focus-within:ring-void" : "ring-rule focus-within:ring-pen")} dir="ltr">
          <span className="flex items-center gap-2 border-e border-rule pe-3 text-[16px] text-ink-2">
            <span aria-hidden className="inline-block h-3.5 w-5 overflow-hidden rounded-[3px] ring-1 ring-rule">
              <span className="block h-1/3 bg-[#ce1126]" />
              <span className="block h-1/3 bg-white" />
              <span className="block h-1/3 bg-black" />
            </span>
            +20
          </span>
          <input
            inputMode="numeric"
            autoComplete="tel-national"
            autoFocus
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").replace(/^0/, "").slice(0, 10))}
            placeholder="10 1234 5678"
            className="h-full min-w-0 flex-1 bg-transparent text-[18px] tracking-wide outline-none"
            aria-invalid={touched && !valid}
          />
        </div>
      </label>
      <p className={cx("mt-2 text-[13px]", touched && !valid ? "text-void" : "text-ink-3")}>
        {touched && !valid ? "الرقم لازم يبدأ بـ 10 أو 11 أو 12 أو 15" : "لتجربة الديمو اكتب أي رقم مصري"}
      </p>
      <Button block size="lg" className="mt-5" disabled={!valid} onClick={onNext}>
        ابعتلي الكود
      </Button>
      <div className="my-6 flex items-center gap-3 text-[13px] text-ink-3">
        <span className="h-px flex-1 bg-rule" /> أو <span className="h-px flex-1 bg-rule" />
      </div>
      <div className="grid gap-3">
        <Button variant="outline" block size="lg" onClick={onSocial}>
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.2 3.5-8.8Z" />
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z" />
            <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
            <path fill="#EA4335" d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z" />
          </svg>
          المتابعة بحساب Google
        </Button>
        <Button variant="ink" block size="lg" onClick={onSocial}>
          <svg viewBox="0 0 24 24" className="size-5 fill-white" aria-hidden>
            <path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7a4.6 4.6 0 0 0-3.6-2c-1.5-.2-3 .9-3.7.9-.8 0-2-.9-3.3-.8a4.9 4.9 0 0 0-4.1 2.5c-1.8 3-.5 7.5 1.2 10 .9 1.2 1.9 2.6 3.2 2.5 1.3 0 1.8-.8 3.3-.8s2 .8 3.3.8c1.4 0 2.3-1.2 3.1-2.5a10.5 10.5 0 0 0 1.4-2.9 4.4 4.4 0 0 1-2.9-4Zm-2.5-7.3A4.4 4.4 0 0 0 15 2a4.6 4.6 0 0 0-3 1.5 4.2 4.2 0 0 0-1 3.2 3.8 3.8 0 0 0 2.9-1.4Z" />
          </svg>
          المتابعة بحساب Apple
        </Button>
        <button onClick={onGuest} className="tap mt-1 h-11 rounded-xl text-[14.5px] text-pen hover:bg-pen-50">
          اتفرج على المحلات من غير حساب
        </button>
      </div>
      <p className="mt-6 pb-8 text-center text-[12px] leading-relaxed text-ink-3">بالمتابعة إنت موافق على الشروط وسياسة الخصوصية</p>
    </div>
  );
}

function OtpStep({ phone, onNext }: { phone: string; onNext: () => void }) {
  const [code, setCode] = useState("");
  const [arrived, setArrived] = useState(false);
  const [left, setLeft] = useState(30);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setArrived(true), 1400);
    const i = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => {
      clearTimeout(t);
      clearInterval(i);
    };
  }, []);

  useEffect(() => {
    if (!arrived) return;
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      setCode("2580".slice(0, n));
      if (n >= 4) clearInterval(t);
    }, 140);
    return () => clearInterval(t);
  }, [arrived]);

  useEffect(() => {
    if (code.length === 4) {
      const t = setTimeout(onNext, 550);
      return () => clearTimeout(t);
    }
  }, [code, onNext]);

  return (
    <div>
      <h1 className="text-[24px] font-bold">اكتب الكود</h1>
      <p className="mt-1.5 text-[15px] text-ink-2">
        بعتنا كود من 4 أرقام لـ <span dir="ltr" className="font-medium text-ink">+20 {phone}</span>
      </p>
      <AnimatePresence>
        {arrived && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-3 rounded-2xl bg-sheet p-3 shadow-sheet">
            <span className="grid size-9 place-items-center rounded-xl bg-stamp-50 text-stamp">
              <MessageSquareText className="size-5" />
            </span>
            <p className="text-[13.5px] text-ink-2">
              رسالة SMS: كود لمحة بتاعك <b className="text-ink">2580</b>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative mt-6" dir="ltr" onClick={() => ref.current?.focus()}>
        <input ref={ref} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" autoComplete="one-time-code" aria-label="كود التأكيد" className="absolute inset-0 opacity-0" />
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cx("grid h-16 place-items-center rounded-2xl bg-sheet text-[26px] font-semibold ring-1 transition-all", code.length === i ? "ring-2 ring-pen" : code[i] ? "ring-stamp" : "ring-rule")}>
              {code[i] && <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>{code[i]}</motion.span>}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between text-[14px]">
        <span className="text-ink-3">{left > 0 ? `تقدر تطلب كود جديد بعد ${left} ث` : "الكود موصلش؟"}</span>
        <div className="flex gap-1">
          <button disabled={left > 0} className="tap inline-flex items-center gap-1 rounded-lg px-2 py-1 text-pen disabled:text-ink-3">
            <MessageSquareText className="size-4" /> SMS
          </button>
          <button disabled={left > 0} className="tap inline-flex items-center gap-1 rounded-lg px-2 py-1 text-pen disabled:text-ink-3">
            <Phone className="size-4" /> مكالمة
          </button>
        </div>
      </div>
    </div>
  );
}
