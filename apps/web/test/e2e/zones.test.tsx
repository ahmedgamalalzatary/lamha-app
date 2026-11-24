import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { LatLng } from '@tawsela/shared';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { forgetSession } from '@/core/api/client';
import { StoreFormPage } from '@/features/stores/StoreFormPage';
import { ZonesPage } from '@/features/zones/ZonesPage';
import { insertStore } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }), usePathname: () => '/settings/zones' }));

// Leaflet cannot draw in jsdom. Only the map widget is swapped: a button stands for a click on the map.
const CORNERS: LatLng[] = [
  { lat: 29.27, lng: 30.79 },
  { lat: 29.35, lng: 30.79 },
  { lat: 29.35, lng: 30.89 },
];
vi.mock('@/components/MapView', () => ({
  MapView: (props: { label: string; outline?: LatLng[]; onOutline?: (p: LatLng[]) => void; pin?: LatLng | null; onPin?: (p: LatLng) => void }) => (
    <button
      type="button"
      onClick={() => (props.onOutline ? props.onOutline([...(props.outline ?? []), CORNERS[props.outline?.length ?? 0]!]) : props.onPin?.({ lat: 29.31, lng: 30.84 }))}
    >
      {`نقرة على الخريطة: ${props.label}`}
    </button>
  ),
}));

function renderWith(page: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

beforeEach(async () => {
  forgetSession();
  await resetDb();
  await insertUser('admin', '01000000001');
  await signInAs('01000000001');
});

describe('الإعدادات › المناطق: delivery zones outlined on the map (contract §8.9; real API)', () => {
  it('outlines a zone (three corners at least), then switches it off', async () => {
    renderWith(<ZonesPage />);
    const user = userEvent.setup();
    expect(await screen.findByText('لا توجد مناطق')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'إضافة منطقة' }));
    await user.type(screen.getByLabelText('اسم المنطقة'), 'الفيوم');
    const map = await screen.findByRole('button', { name: 'نقرة على الخريطة: حدود المنطقة' });
    await user.click(map);
    await user.click(map);
    expect(screen.getByText('2 نقاط')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'حفظ' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'حذف آخر نقطة' }));
    await user.click(map);
    await user.click(map);
    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    const row = (await screen.findByRole('cell', { name: 'الفيوم' })).closest('tr')!;
    expect(within(row).getByText('مفعلة')).toBeInTheDocument();
    const [zone] = await sql<{ polygon: LatLng[]; active: number }[]>('SELECT polygon, active FROM zones');
    expect(zone).toEqual({ polygon: CORNERS, active: 1 });

    await user.click(within(row).getByRole('button', { name: 'تعديل' }));
    await user.click(screen.getByRole('switch', { name: 'مفعلة' }));
    await user.click(screen.getByRole('button', { name: 'حفظ' }));
    expect(within((await screen.findByRole('cell', { name: 'الفيوم' })).closest('tr')!).getByText('موقوفة')).toBeInTheDocument();
  });
});

describe("الموردين: a store's zone and location (contract §8.9; real API)", () => {
  it('puts the store in a zone and pins it on the map', async () => {
    const [{ id: zoneId }] = [await sql<{ insertId: number }>(`INSERT INTO zones (name, polygon) VALUES ('الفيوم', '${JSON.stringify(CORNERS)}')`)].map((r) => ({ id: r.insertId }));
    const id = await insertStore({ name: 'شاورما الساقية' });
    renderWith(<StoreFormPage storeId={id} />);
    const user = userEvent.setup();

    await screen.findByRole('option', { name: 'الفيوم' });
    await user.selectOptions(screen.getByLabelText('منطقة التوصيل'), String(zoneId));
    await user.click(await screen.findByRole('button', { name: 'نقرة على الخريطة: موقع المتجر' }));
    expect(screen.getByText('29.310000, 30.840000')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    expect(await screen.findByText('تم حفظ التغييرات')).toBeInTheDocument();
    const [row] = await sql<{ zone_id: number; lat: string; lng: string }[]>('SELECT zone_id, lat, lng FROM stores WHERE id = ?', [id]);
    expect(row).toEqual({ zone_id: zoneId, lat: '29.310000', lng: '30.840000' });
  });
});
