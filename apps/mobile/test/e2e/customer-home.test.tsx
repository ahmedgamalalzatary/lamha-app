import AsyncStorage from '@react-native-async-storage/async-storage';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { session } from '@/core/auth/session';
import { HomeScreen } from '@/features/home/screens/HomeScreen';
import { insertStore, insertTile } from '../utils/catalog';
import { insertUser, resetDb, signInAs } from '../utils/db';
import { renderApp, testQueryClient } from '../utils/render';

let client: QueryClient;
function Root() {
  return (
    <QueryClientProvider client={client}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}

/** Stand-ins for the routes the tiles open (Phases 6 and 7 build them). */
const Opened = () => <Text>opened</Text>;
const ROUTES = { _layout: Root, 'customer/index': HomeScreen, 'stores/[vertical]': Opened, 'store/[id]': Opened, search: Opened };

let maky: number;

beforeEach(async () => {
  client = testQueryClient();
  await AsyncStorage.clear();
  await session.signOutLocally();
  await resetDb();
  await insertUser('customer', '01554459196');
  maky = await insertStore('Maky');
  await insertTile('توصيلتي مارت', { row: 'fixed', sortOrder: 1, badge: 'سريع', vertical: 'market' });
  await insertTile('المطاعم', { row: 'fixed', sortOrder: 0, vertical: 'restaurant' });
  await insertTile('صيدليات', { row: 'scroll', sortOrder: 1, vertical: 'pharmacy' });
  await insertTile('ماكي - Maky', { row: 'scroll', sortOrder: 0, badge: 'الماكيز', storeId: maky });
  await session.signIn(await signInAs('01554459196'));
});

describe('customer home (contract §8.2; real API)', () => {
  it('shows the tiles in two rows, in the order the admin set, with their badges', async () => {
    await renderApp(ROUTES, { initialUrl: '/customer' });

    const fixed = await screen.findByTestId('tiles-fixed');
    const scroll = screen.getByTestId('tiles-scroll');
    const labels = (row: typeof fixed) => within(row).getAllByRole('button').map((b) => b.props.accessibilityLabel as string);
    expect(labels(fixed)).toEqual(['المطاعم', 'توصيلتي مارت']);
    expect(labels(scroll)).toEqual(['ماكي - Maky', 'صيدليات']);
    expect(within(fixed).getByText('سريع')).toBeTruthy();
    expect(within(scroll).getByText('الماكيز')).toBeTruthy();
  });

  it('shows the delivery header; the search box opens search', async () => {
    await renderApp(ROUTES, { initialUrl: '/customer' });
    expect(await screen.findByText('التوصيل إلى')).toBeTruthy();
    expect(screen.getByText(/ابحث عن/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'بحث' }));
    await waitFor(() => expect(screen).toHavePathname('/search'));
  });

  it("opens a type's store list from its tile", async () => {
    await renderApp(ROUTES, { initialUrl: '/customer' });
    await fireEvent.press(await screen.findByRole('button', { name: 'المطاعم' }));
    await waitFor(() => expect(screen).toHavePathname('/stores/restaurant'));
  });

  it('opens a pinned store from its tile', async () => {
    await renderApp(ROUTES, { initialUrl: '/customer' });
    await fireEvent.press(await screen.findByRole('button', { name: 'ماكي - Maky' }));
    await waitFor(() => expect(screen).toHavePathname(`/store/${maky}`));
  });

  it('shows the invite card with the rewards from the API, and ✕ hides it for good', async () => {
    const first = await renderApp(ROUTES, { initialUrl: '/customer' });
    expect(await screen.findByText('اربح 300 ج.م عن كل صديق')).toBeTruthy();
    expect(screen.getByText('وصديقك يحصل على 25 ج.م فور تسجيله')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'اقفل' }));
    await waitFor(() => expect(screen.queryByText('اربح 300 ج.م عن كل صديق')).toBeNull());
    first.unmount();

    await renderApp(ROUTES, { initialUrl: '/customer' });
    await screen.findByRole('button', { name: 'المطاعم' });
    expect(screen.queryByText('اربح 300 ج.م عن كل صديق')).toBeNull();
  });
});
