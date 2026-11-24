'use client';

import type { LatLng, Zone } from '@tawsela/shared';
import { MapPinned, Plus } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { errorMessage } from '@/core/api/error-message';
import { Button, EmptyState, ErrorLine, LoadState, Pill, Switch, Table, TextField } from '@/components/ui';
import { useSaveZone, useZones } from './api';

const MapView = dynamic(() => import('@/components/MapView').then((m) => m.MapView), { ssr: false });

/**
 * الإعدادات › المناطق (contract §8.9, §11 [Needed]): the delivery zones, each outlined on the map. A
 * customer's address must be inside a switched-on zone, and sees only the stores of its zone. Zones are
 * switched off, never deleted. [Open] Tawsilty's admin page for this is not captured.
 */
export function ZonesPage() {
  const zones = useZones();
  const [editing, setEditing] = useState<Zone | 'new' | null>(null);

  if (editing) return <ZoneEditor zone={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />;
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">المناطق</h1>
          <p className="text-sm text-tw-ink-2">مناطق التوصيل: يحفظ العميل عنوانه داخلها، ويرى متاجر منطقته فقط.</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" aria-hidden />
          إضافة منطقة
        </Button>
      </div>
      {zones.isPending || zones.isError ? (
        <LoadState error={zones.isError ? errorMessage(zones.error) : undefined} onRetry={() => void zones.refetch()} />
      ) : zones.data.length === 0 ? (
        <EmptyState icon={MapPinned} title="لا توجد مناطق" message="أضف منطقة وارسم حدودها على الخريطة" />
      ) : (
        <Table headers={['المنطقة', 'الحالة', 'العمليات']}>
          {zones.data.map((z) => (
            <tr key={z.id} className="border-t border-tw-line">
              <td className="px-4 py-3 font-semibold">{z.name}</td>
              <td className="px-4 py-3">{z.active ? <Pill tone="ok">مفعلة</Pill> : <Pill tone="muted">موقوفة</Pill>}</td>
              <td className="px-4 py-2">
                <Button tone="soft" className="h-9 px-4" onClick={() => setEditing(z)}>
                  تعديل
                </Button>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function ZoneEditor({ zone, onDone }: { zone?: Zone; onDone: () => void }) {
  const save = useSaveZone();
  const [name, setName] = useState(zone?.name ?? '');
  const [outline, setOutline] = useState<LatLng[]>(zone?.polygon ?? []);
  const [active, setActive] = useState(zone?.active ?? true);

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <h1 className="text-2xl font-bold">{zone ? 'تعديل منطقة' : 'إضافة منطقة'}</h1>
      <TextField label="اسم المنطقة" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoFocus />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">اضغط على الخريطة لإضافة نقاط حدود المنطقة بالترتيب (3 نقاط على الأقل).</p>
        <MapView label="حدود المنطقة" outline={outline} onOutline={setOutline} />
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold">{outline.length} نقاط</span>
          <Button tone="soft" className="h-9 px-4" disabled={!outline.length} onClick={() => setOutline((o) => o.slice(0, -1))}>
            حذف آخر نقطة
          </Button>
          <Button tone="soft" className="h-9 px-4" disabled={!outline.length} onClick={() => setOutline([])}>
            مسح النقاط
          </Button>
        </div>
      </div>
      <Switch label="مفعلة" checked={active} onChange={setActive} />
      {save.isError ? <ErrorLine>{errorMessage(save.error)}</ErrorLine> : null}
      <div className="flex items-center gap-3">
        <Button
          disabled={name.trim() === '' || outline.length < 3}
          loading={save.isPending}
          className="min-w-40"
          onClick={() => save.mutate({ id: zone?.id, name: name.trim(), polygon: outline, active }, { onSuccess: onDone })}
        >
          حفظ
        </Button>
        <button type="button" onClick={onDone} className="h-11 rounded-full px-6 text-sm font-semibold text-tw-ink-2">
          إلغاء
        </button>
      </div>
    </div>
  );
}
