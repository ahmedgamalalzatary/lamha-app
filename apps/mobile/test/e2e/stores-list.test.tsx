import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { session } from '@/core/auth/session';
import { StoresScreen } from '@/features/stores/screens/StoresScreen';
import { insertCuisine, insertStore } from '../utils/catalog';
import { insertUser, resetDb, signInAs, sql } from '../utils/db';
import { renderApp, testQueryClient } from '../utils/render';

let client: QueryClient;
function Root() {
  return (
    <QueryClientProvider client={client}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}

/** The store page is Phase 7's. */
const Opened = () => <Text>opened</Text>;
const ROUTES = { _layout: Root, 'stores/[vertical]': StoresScreen, 'store/[id]': Opened };
const open = () => renderApp(ROUTES, { initialUrl: '/stores/restaurant?title=المطاعم' });

/** The store rows' names, top to bottom. */
const rows = () => screen.queryAllByTestId('store-row').map((b) => b.props.accessibilityLabel as string);

let sakia: number;
let kebda: number;

beforeEach(async () => {
  client = testQueryClient();
  await session.signOutLocally();
  await resetDb();
  await insertUser('customer', '01554459196');
  sakia = await insertStore('شاورما الساقية', 'restaurant', { deliveryMinutes: 50 });
  kebda = await insertStore('كبدة الحاج', 'restaurant', { deliveryMinutes: 20, pickupAllowed: true });
  await insertStore('أسماك الزعيم', 'restaurant', { closedNow: true });
  await insertStore('صيدلية', 'pharmacy');
  await insertCuisine('كبده', [kebda]);
  await session.signIn(await signInAs('01554459196'));
});

describe('a store list (contract §8.3; real API)', () => {
  it('uses English units and the default English title with the original catalog names', async () => {
    await sql("UPDATE users SET locale = 'en' WHERE phone = ?", ['01554459196']);
    await session.signIn(await signInAs('01554459196'));
    await renderApp(ROUTES, { initialUrl: '/stores/restaurant' });

    const row = await screen.findByRole('button', { name: 'شاورما الساقية' });
    expect(screen.getByPlaceholderText('Search Restaurants')).toBeTruthy();
    expect(within(row).getByText('50 min')).toBeTruthy();
    expect(within(row).getByText('15 EGP')).toBeTruthy();
  });

  it("lists the type's stores with their count, time, fee and the closed look; a row opens the store", async () => {
    await open();
    expect(await screen.findByText('3 المتاجر')).toBeTruthy();
    expect(rows()).toEqual(['شاورما الساقية', 'كبدة الحاج', 'أسماك الزعيم']);
    expect(screen.getByPlaceholderText('ابحث عن المطاعم')).toBeTruthy();

    const row = screen.getByRole('button', { name: 'شاورما الساقية' });
    expect(within(row).getByText('جديد')).toBeTruthy();
    expect(within(row).getByText('50 دقيقة')).toBeTruthy();
    expect(within(row).getByText('15 ج.م')).toBeTruthy();
    expect(within(screen.getByRole('button', { name: 'أسماك الزعيم' })).getByText('مغلق')).toBeTruthy();
    expect(within(row).queryByText('مغلق')).toBeNull();

    await fireEvent.press(row);
    await waitFor(() => expect(screen).toHavePathname(`/store/${sakia}`));
  });

  it('filters by cuisine, name, chips and the rating sheet, sorts, and shows the empty state', async () => {
    await open();
    await screen.findByText('3 المتاجر');

    await fireEvent.press(screen.getByRole('button', { name: 'كبده' }));
    await waitFor(() => expect(rows()).toEqual(['كبدة الحاج']));
    await fireEvent.press(screen.getByRole('button', { name: 'كبده' }));
    await waitFor(() => expect(rows()).toHaveLength(3));

    await fireEvent.changeText(screen.getByPlaceholderText('ابحث عن المطاعم'), 'أسماك');
    await waitFor(() => expect(rows()).toEqual(['أسماك الزعيم']));
    await fireEvent.changeText(screen.getByPlaceholderText('ابحث عن المطاعم'), '');
    await waitFor(() => expect(rows()).toHaveLength(3));

    await fireEvent.press(screen.getByRole('button', { name: 'رتب حسب' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'الأحدث' }));
    await waitFor(() => expect(rows()).toEqual(['أسماك الزعيم', 'كبدة الحاج', 'شاورما الساقية']));

    await fireEvent.press(screen.getByRole('button', { name: 'الاستلام' }));
    await waitFor(() => expect(rows()).toEqual(['كبدة الحاج']));
    await fireEvent.press(screen.getByRole('button', { name: 'توصيل سريع' }));
    await waitFor(() => expect(rows()).toEqual(['كبدة الحاج']));

    // New stores have no rating yet, so a rating floor leaves none.
    await fireEvent.press(screen.getByRole('button', { name: 'التقييم' }));
    await fireEvent.press(await screen.findByRole('radio', { name: '4.0 فأعلى' }));
    expect(await screen.findByText('لا توجد متاجر متاحة')).toBeTruthy();
    expect(screen.getByText('المتاجر')).toBeTruthy();
  });
});
