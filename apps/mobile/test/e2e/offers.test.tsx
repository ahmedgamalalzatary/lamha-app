import AsyncStorage from '@react-native-async-storage/async-storage';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { ToastHost, toast } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { OffersScreen } from '@/features/offers/screens/OffersScreen';
import { StoreProductsScreen } from '@/features/store/screens/StoreProductsScreen';
import { StoreScreen } from '@/features/store/screens/StoreScreen';
import { StoresScreen } from '@/features/stores/screens/StoresScreen';
import { insertCategory, insertMenuItem, insertStore } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';
import { renderApp, testQueryClient } from '../utils/render';

let client: QueryClient;
function Root() {
  return (
    <QueryClientProvider client={client}>
      <Stack screenOptions={{ headerShown: false }} />
      <ToastHost />
    </QueryClientProvider>
  );
}
const ROUTES = {
  _layout: Root,
  'customer/index': HomeScreen,
  offers: OffersScreen,
  'stores/[vertical]': StoresScreen,
  'store/[id]/index': StoreScreen,
  'store/[id]/products': StoreProductsScreen,
};

let kebab: number;
let mart: number;
let tomato: number;

/** A code as the admin's dashboard saves it. */
async function insertCoupon(code: string, storeId: number | null, value: number, minOrder: number, endsAt: string | null = null) {
  await sql(
    "INSERT INTO coupons (code, code_key, title, store_id, kind, value, min_order, ends_at, per_customer, paid_by, active) VALUES (?, ?, ?, ?, 'amount', ?, ?, ?, 1, 'app', true)",
    [code, code.toLowerCase(), code, storeId, value, minOrder, endsAt],
  );
}

beforeEach(async () => {
  client = testQueryClient();
  await AsyncStorage.clear();
  await session.signOutLocally();
  toast.clear();
  await resetDb();
  await insertUser('customer', '01554459196');
  kebab = await insertStore('كبابجي السنى');
  mart = await insertStore('توصيلتي مارت', 'market', { layout: 'grid' });
  const grill = await insertCategory(kebab, 'مشويات');
  await insertMenuItem(kebab, grill, 'كباب', 150);
  const veg = await insertCategory(mart, 'الخضار');
  tomato = await insertMenuItem(mart, veg, 'عرض الطماطم', 15);
  await insertMenuItem(mart, veg, 'خيار', 10, 1);
  await session.signIn(await signInAs('01554459196'));
});

describe('offers on stores (contract §8.3, §8.4, §8.10; real API)', () => {
  it('a store row shows its voucher, its free delivery and its product discounts', async () => {
    await insertCoupon('Black Friday', kebab, 6, 150);
    await sql('UPDATE stores SET free_delivery_from = 300 WHERE id = ?', [kebab]);
    // An old price below the price is no discount.
    await sql('UPDATE products SET old_price = 45 WHERE store_id = ?', [kebab]);
    await renderApp(ROUTES, { initialUrl: '/stores/restaurant' });
    const row = await screen.findByRole('button', { name: 'كبابجي السنى' });
    expect(within(row).getByText('قسيمة')).toBeTruthy();
    expect(within(row).getByText('خصم 6 ج.م على 150 ج.م')).toBeTruthy();
    expect(within(row).getByText('توصيل مجاني للطلبات من 300 ج.م')).toBeTruthy();
    expect(within(row).queryByText(/على منتجات/)).toBeNull();
  });

  it('خصومات and عروض التوصيل keep the stores with those offers', async () => {
    const other = await insertStore('روزانا');
    await sql('UPDATE products SET old_price = 30 WHERE id = ?', [tomato]);
    await sql("UPDATE stores SET vertical = 'restaurant' WHERE id = ?", [mart]);
    await sql('UPDATE stores SET free_delivery_from = 0 WHERE id = ?', [other]);
    await renderApp(ROUTES, { initialUrl: '/stores/restaurant' });
    expect(await screen.findByText('3 محل')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'خصومات' }));
    expect(await screen.findByText('1 محل')).toBeTruthy();
    expect(screen.getByText('خصم 15 ج.م على منتجات')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'خصومات' }));
    await fireEvent.press(screen.getByRole('button', { name: 'عروض التوصيل' }));
    expect(await screen.findByText('1 محل')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'روزانا' })).toBeTruthy();
  });

  it('the store page shows the voucher card; عرض القسائم lists its codes, and copy takes one', async () => {
    await insertCoupon('Black Friday', kebab, 6, 150, '2030-11-30 12:00:00');
    await insertCoupon('WELCOME', null, 10, 0);
    await renderApp(ROUTES, { initialUrl: `/store/${kebab}` });
    expect(await screen.findByText('خصم 6 ج.م على 150 ج.م')).toBeTruthy();
    expect(screen.getByText('قسائم خصم متاحة')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'عرض القسائم' }));
    expect(await screen.findByText('قسائمي')).toBeTruthy();
    expect(screen.getByText('الحد الأدنى للطلب 150 ج.م')).toBeTruthy();
    expect(screen.getByText('صالح حتى 30 نوفمبر 2030')).toBeTruthy();
    expect(screen.getAllByText('WELCOME').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole('button', { name: 'نسخ Black Friday' }));
    await waitFor(async () => expect(await Clipboard.getStringAsync()).toBe('Black Friday'));
    expect(await screen.findByText('تم نسخ الكود')).toBeTruthy();
  });

  it('a market shows the free-delivery card, its discounted products with "وفر", and all of them in one grid', async () => {
    await sql('UPDATE stores SET free_delivery_from = 1000 WHERE id = ?', [mart]);
    await sql('UPDATE products SET old_price = 20 WHERE id = ?', [tomato]);
    await renderApp(ROUTES, { initialUrl: `/store/${mart}` });
    expect(await screen.findByText('توصيل مجاني للطلبات من 1000 ج.م')).toBeTruthy();
    expect(screen.getByText('عند الطلب بقيمة 1000 ج.م أو أكثر')).toBeTruthy();
    expect(screen.getByText('خصم 5 ج.م على منتجات')).toBeTruthy();
    const deals = screen.getByTestId('store-deals');
    expect(within(deals).getByText('عرض الطماطم')).toBeTruthy();
    expect(within(deals).getByText('وفر 5.00 ج.م')).toBeTruthy();
    expect(within(deals).getByText('20.00 ج.م')).toBeTruthy();
    expect(within(deals).queryByText('خيار')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'عرض الكل' }));
    await waitFor(() => expect(screen).toHavePathname(`/store/${mart}/products`));
    expect(await screen.findByText('عرض الطماطم')).toBeTruthy();
    expect(screen.queryByText('خيار')).toBeNull();
  });
});

describe('the offers screen (contract §8.10; real API)', () => {
  it('opens from its home tile on its tab, and lists the stores with that kind of offer', async () => {
    await insertCoupon('Black Friday', kebab, 6, 150);
    await sql('UPDATE stores SET free_delivery_from = 0 WHERE id = ?', [mart]);
    await renderApp(ROUTES, { initialUrl: '/customer' });
    expect(await screen.findByText('العروض والكوبونات')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'استخدم كوبون' }));
    await waitFor(() => expect(screen).toHavePathname('/offers'));
    expect(await screen.findByText('كوبونات وقسائم')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'كبابجي السنى' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'توصيلتي مارت' })).toBeNull();

    await fireEvent.press(screen.getByRole('tab', { name: 'عروض التوصيل' }));
    expect(await screen.findByText('توصيل مجاني أو بسعر أقل لحد باب بيتك')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'توصيلتي مارت' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'مطاعم' }));
    expect(await screen.findByText('مفيش محلات هنا لسه')).toBeTruthy();
  });
});

describe('home banners (contract §8.2; real API)', () => {
  it('a carousel banner opens its store; a rail shows the store\'s products and opens them as one grid', async () => {
    await sql("INSERT INTO banners (image, place, store_id, opens, sort_order) VALUES ('/uploads/catalog/a.jpg', 'carousel', ?, 'store', 0)", [kebab]);
    await sql("INSERT INTO banners (image, place, store_id, opens, sort_order) VALUES ('/uploads/catalog/b.jpg', 'rail', ?, 'products', 0)", [mart]);
    await renderApp(ROUTES, { initialUrl: '/customer' });
    expect(await screen.findByText('العروض اللي تستاهل تجربها دلوقتي…')).toBeTruthy();
    const rail = screen.getByTestId('banner-rail');
    expect(within(rail).getByText('عرض الطماطم')).toBeTruthy();
    expect(within(rail).getByText('خيار')).toBeTruthy();

    await fireEvent.press(within(rail).getByRole('button', { name: 'توصيلتي مارت' }));
    await waitFor(() => expect(screen).toHavePathname(`/store/${mart}/products`));
    expect(await screen.findByText('خيار')).toBeTruthy();
  });

  it('a carousel banner opens its store page', async () => {
    await sql("INSERT INTO banners (image, place, store_id, opens, sort_order) VALUES ('/uploads/catalog/a.jpg', 'carousel', ?, 'store', 0)", [kebab]);
    await renderApp(ROUTES, { initialUrl: '/customer' });
    await fireEvent.press(await screen.findByRole('button', { name: 'كبابجي السنى' }));
    await waitFor(() => expect(screen).toHavePathname(`/store/${kebab}`));
  });
});
