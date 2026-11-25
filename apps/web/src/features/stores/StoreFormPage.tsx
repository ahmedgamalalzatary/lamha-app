'use client';

import {
  type AdminStore,
  DELIVERED_BY,
  defaultLayout,
  isEgyptianMobile,
  isTimeOfDay,
  normalizePhone,
  PAYOUT_OPTIONS,
  type PayoutOption,
  STORE_LAYOUTS,
  type StoreInput,
  VERTICALS,
  verticalLabel,
} from '@tawsela/shared';
import { ArrowRight } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useRef, useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { ImageField, useUploading } from '@/components/ImageField';
import { PasswordShown } from '@/components/PasswordShown';
import { Button, ErrorLine, LoadState, SelectField, Switch, TextField } from '@/components/ui';
import { useCreateStore, useCuisines, useStore, useUpdateStore } from '../catalog/api';
import { isMoney, isPercent, PAYOUT_LABELS } from '../settings/payout';
import { useZones } from '../zones/api';
import { PartnerAccounts } from './PartnerAccounts';

const MapView = dynamic(() => import('@/components/MapView').then((m) => m.MapView), { ssr: false });

const LAYOUT_LABELS = { list: 'قائمة (مطاعم)', grid: 'شبكة (ماركت وصيدليات)' } as const;
const DELIVERED_BY_LABELS = { platform: 'توصيلة', store: 'المتجر نفسه' } as const;

/** The form's text boxes hold strings; numbers are read on save. An empty percentage follows الإعدادات. */
interface Draft extends Omit<StoreInput, 'deliveryMinutes' | 'minimumOrder' | 'appPercent'> {
  deliveryMinutes: string;
  minimumOrder: string;
  appPercent: string;
}

const EMPTY: Draft = {
  vertical: 'restaurant',
  name: '',
  logo: null,
  cover: null,
  deliveryMinutes: '30',
  minimumOrder: '0',
  payoutOption: null,
  appPercent: '',
  deliveredBy: 'platform',
  layout: 'list',
  pickupAllowed: false,
  opensAt: '10:00',
  closesAt: '23:00',
  closedNow: false,
  active: true,
  cuisineIds: [],
  zoneId: null,
  location: null,
};

/** Only the fields the admin edits; the API refuses the read-only ones (id, partners…). */
const toDraft = (s: AdminStore): Draft => ({
  vertical: s.vertical,
  name: s.name,
  logo: s.logo,
  cover: s.cover,
  deliveredBy: s.deliveredBy,
  layout: s.layout,
  pickupAllowed: s.pickupAllowed,
  opensAt: s.opensAt,
  closesAt: s.closesAt,
  closedNow: s.closedNow,
  active: s.active,
  cuisineIds: s.cuisineIds,
  zoneId: s.zoneId,
  location: s.location,
  deliveryMinutes: String(s.deliveryMinutes),
  minimumOrder: String(s.minimumOrder),
  payoutOption: s.payoutOption,
  appPercent: s.appPercent === null ? '' : String(s.appPercent),
});

/** The select's value for "حسب الإعدادات العامة". */
const GLOBAL = '';

/** الموردين › إضافة متجر / تعديل متجر (contract §11, §1.1 A6). */
export function StoreFormPage({ storeId }: { storeId?: number }) {
  const store = useStore(storeId);
  if (storeId === undefined) return <StoreForm />;
  if (store.isPending || store.isError) {
    return <LoadState error={store.isError ? errorMessage(store.error) : undefined} onRetry={() => void store.refetch()} />;
  }
  return <StoreForm key={store.data.id} store={store.data} />;
}

function StoreForm({ store }: { store?: AdminStore }) {
  const router = useRouter();
  const cuisines = useCuisines();
  const zones = useZones();
  const create = useCreateStore();
  const update = useUpdateStore();
  const [draft, setDraft] = useState<Draft>(store ? toDraft(store) : EMPTY);
  const [partner, setPartner] = useState({ firstName: '', lastName: '', phone: '' });
  const [created, setCreated] = useState<{ id: number; password: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const upload = useUploading();
  // Counts edits, so a save confirms only if nothing was typed while it was on its way.
  const edits = useRef(0);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    edits.current++;
    setSaved(false);
    setDraft((d) => ({ ...d, [k]: v }));
  };

  const minutes = Number(draft.deliveryMinutes);
  const ready =
    draft.name.trim() !== '' &&
    Number.isInteger(minutes) &&
    minutes >= 1 &&
    isMoney(draft.minimumOrder) &&
    (draft.appPercent.trim() === '' || isPercent(draft.appPercent)) &&
    isTimeOfDay(draft.opensAt) &&
    isTimeOfDay(draft.closesAt) &&
    // Every store delivers in a zone (review F21, owner).
    draft.zoneId !== null &&
    (store !== undefined || (partner.firstName.trim() !== '' && isEgyptianMobile(normalizePhone(partner.phone))));

  const input = (): StoreInput => ({
    ...draft,
    name: draft.name.trim(),
    deliveryMinutes: minutes,
    minimumOrder: Number(draft.minimumOrder),
    appPercent: draft.appPercent.trim() === '' ? null : Number(draft.appPercent),
    cuisineIds: draft.vertical === 'restaurant' ? draft.cuisineIds : [],
  });

  const save = () => {
    if (store) {
      const sent = edits.current;
      update.mutate({ id: store.id, ...input() }, { onSuccess: () => setSaved(edits.current === sent) });
    } else {
      create.mutate(
        { ...input(), partner: { firstName: partner.firstName.trim(), lastName: partner.lastName.trim(), phone: normalizePhone(partner.phone) } },
        { onSuccess: (res) => setCreated({ id: res.store.id, password: res.partner.password }) },
      );
    }
  };
  const failed = store ? update.error : create.error;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link href="/stores" aria-label="رجوع" className="grid size-10 place-items-center rounded-full hover:bg-tw-50">
          <ArrowRight className="size-5" aria-hidden />
        </Link>
        <h1 className="text-2xl font-bold">{store ? store.name : 'إضافة متجر'}</h1>
      </div>

      <Section title="بيانات المتجر">
        <TextField label="اسم المتجر" value={draft.name} onChange={(e) => set('name', e.target.value)} maxLength={120} />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="النوع"
            value={draft.vertical}
            options={VERTICALS.map((v) => ({ value: v, label: verticalLabel(v) }))}
            onChange={(v) => {
              set('vertical', v);
              set('layout', defaultLayout(v));
            }}
          />
          <SelectField label="طريقة عرض المنتجات" value={draft.layout} options={STORE_LAYOUTS.map((v) => ({ value: v, label: LAYOUT_LABELS[v] }))} onChange={(v) => set('layout', v)} />
        </div>
        {draft.vertical === 'restaurant' ? (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">أنواع الأكل</span>
            {cuisines.isError ? <LoadState error={errorMessage(cuisines.error)} onRetry={() => void cuisines.refetch()} /> : null}
            <div className="flex flex-wrap gap-2">
              {cuisines.data?.map((c) => {
                const on = draft.cuisineIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set('cuisineIds', on ? draft.cuisineIds.filter((id) => id !== c.id) : [...draft.cuisineIds, c.id])}
                    className={`h-9 rounded-full border px-4 text-sm ${on ? 'border-tw bg-tw-50 font-semibold text-tw-700' : 'border-tw-line text-tw-ink-2'}`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageField label="الشعار" value={draft.logo} onChange={(v) => set('logo', v)} onBusyChange={upload.onBusyChange} />
          <ImageField label="صورة الغلاف" value={draft.cover} onChange={(v) => set('cover', v)} onBusyChange={upload.onBusyChange} />
        </div>
      </Section>

      <Section title="التوصيل">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="مدة التوصيل (دقيقة)" type="number" min={1} value={draft.deliveryMinutes} onChange={(e) => set('deliveryMinutes', e.target.value)} />
          <TextField label="الحد الأدنى للطلب (ج.م)" type="number" min={0} step="0.01" value={draft.minimumOrder} onChange={(e) => set('minimumOrder', e.target.value)} />
        </div>
        <p className="text-xs text-tw-ink-2">
          رسوم التوصيل تُحسب بالمسافة من موقع المتجر إلى العميل حسب{' '}
          <Link href="/settings/delivery" className="font-semibold text-tw underline">
            إعدادات رسوم التوصيل والدفع
          </Link>
          .
        </p>
        <SelectField
          label="التوصيل بواسطة"
          value={draft.deliveredBy}
          options={DELIVERED_BY.map((v) => ({ value: v, label: DELIVERED_BY_LABELS[v] }))}
          onChange={(v) => set('deliveredBy', v)}
        />
        <Switch label="الاستلام من المحل" checked={draft.pickupAllowed} onChange={(v) => set('pickupAllowed', v)} />
      </Section>

      <Section title="الدفع للمتجر" note="الطلبات كاش. اتركها «حسب الإعدادات العامة» ليتبع المتجر إعدادات رسوم التوصيل والدفع.">
        <SelectField
          label="ما يدفعه المندوب للمتجر"
          value={draft.payoutOption ?? GLOBAL}
          options={[{ value: GLOBAL, label: 'حسب الإعدادات العامة' }, ...PAYOUT_OPTIONS.map((v) => ({ value: v, label: PAYOUT_LABELS[v] }))]}
          onChange={(v) => set('payoutOption', v === GLOBAL ? null : (v as PayoutOption))}
        />
        <TextField
          label="نسبة التطبيق من المنتجات (%)"
          type="number"
          min={0}
          max={100}
          step="0.01"
          placeholder="حسب الإعدادات العامة"
          value={draft.appPercent}
          onChange={(e) => set('appPercent', e.target.value)}
        />
      </Section>

      <Section title="المنطقة والموقع" note="كل متجر له منطقة توصيل، ويظهر للعملاء الذين عنوانهم داخلها فقط. الموقع يرتّب «الأقرب إليك» وتُحسب منه رسوم التوصيل.">
        {zones.isError ? <LoadState error={errorMessage(zones.error)} onRetry={() => void zones.refetch()} /> : null}
        {draft.location ? null : <p className="text-sm font-semibold text-tw-danger">بدون موقع لا يستطيع العملاء طلب التوصيل من هذا المتجر.</p>}
        <SelectField
          label="منطقة التوصيل"
          value={draft.zoneId === null ? '' : String(draft.zoneId)}
          options={[
            ...(draft.zoneId === null ? [{ value: '', label: 'اختر منطقة' }] : []),
            ...(zones.data ?? []).map((z) => ({ value: String(z.id), label: z.active ? z.name : `${z.name} (موقوفة)` })),
          ]}
          onChange={(v) => set('zoneId', v === '' ? null : Number(v))}
        />
        <MapView label="موقع المتجر" pin={draft.location} onPin={(p) => set('location', p)} />
        <div className="flex items-center gap-3 text-sm">
          <span dir="ltr" className="font-semibold">
            {draft.location ? `${draft.location.lat.toFixed(6)}, ${draft.location.lng.toFixed(6)}` : 'لم يُحدد الموقع'}
          </span>
          {draft.location ? (
            <Button tone="soft" className="h-9 px-4" onClick={() => set('location', null)}>
              إزالة الموقع
            </Button>
          ) : null}
        </div>
      </Section>

      <Section title="المواعيد" note="بتوقيت القاهرة. إذا كان الإغلاق قبل الفتح فالمواعيد تمتد بعد منتصف الليل.">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="يفتح الساعة" type="time" value={draft.opensAt} onChange={(e) => set('opensAt', e.target.value)} />
          <TextField label="يغلق الساعة" type="time" value={draft.closesAt} onChange={(e) => set('closesAt', e.target.value)} />
        </div>
        <Switch label="مغلق الآن" checked={draft.closedNow} onChange={(v) => set('closedNow', v)} />
        <Switch label="ظاهر للعملاء" checked={draft.active} onChange={(v) => set('active', v)} />
      </Section>

      {store ? null : (
        <Section title="حساب المورد" note="تُنشأ كلمة المرور تلقائياً وتظهر مرة واحدة بعد الحفظ.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="الاسم الأول" value={partner.firstName} onChange={(e) => setPartner((p) => ({ ...p, firstName: e.target.value }))} />
            <TextField label="اسم العائلة" value={partner.lastName} onChange={(e) => setPartner((p) => ({ ...p, lastName: e.target.value }))} />
          </div>
          <TextField
            label="رقم الهاتف"
            value={partner.phone}
            onChange={(e) => setPartner((p) => ({ ...p, phone: e.target.value }))}
            inputMode="tel"
            dir="ltr"
            placeholder="01xxxxxxxxx"
          />
        </Section>
      )}

      {failed ? <ErrorLine>{errorMessage(failed)}</ErrorLine> : null}
      <div className="flex items-center gap-4">
        <Button disabled={!ready || upload.uploading} loading={create.isPending || update.isPending} onClick={save} className="min-w-40">
          حفظ
        </Button>
        {saved ? (
          <p role="status" className="text-sm font-semibold text-tw-ok">
            تم حفظ التغييرات
          </p>
        ) : null}
      </div>

      {store ? <PartnerAccounts storeId={store.id} /> : null}

      {created ? (
        <PasswordShown
          password={created.password}
          onClose={() => {
            setCreated(null);
            router.push(`/stores/${created.id}`);
          }}
        />
      ) : null}
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-tw-line p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold">{title}</h2>
        {note ? <p className="text-xs text-tw-ink-2">{note}</p> : null}
      </div>
      {children}
    </section>
  );
}
