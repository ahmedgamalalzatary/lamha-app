import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { session } from '@/core/auth/session';
import { SearchScreen } from '@/features/search/screens/SearchScreen';
import { insertProduct, insertStore } from '../utils/catalog';
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

const Opened = () => <Text>opened</Text>;
const ROUTES = { _layout: Root, search: SearchScreen, 'store/[id]': Opened };

let crinkle: number;

beforeEach(async () => {
  client = testQueryClient();
  await session.signOutLocally();
  await resetDb();
  await insertUser('customer', '01554459196');
  crinkle = await insertStore('كرينكل - CRINKLE');
  await insertProduct(crinkle, 'مايو بيتزا فرايز', 110);
  await insertProduct(await insertStore('ماركت الخير', 'market'), 'صوص بيتزا', 30);
  await session.signIn(await signInAs('01554459196'));
});

describe('search (contract §8.13; real API)', () => {
  it('suggests while typing, then shows each store with its matching products, by tab', async () => {
    await renderApp(ROUTES, { initialUrl: '/search' });
    expect(screen.getByText('ابحث عن الأكلات والأماكن المفضلة 🍔')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('بحث'), 'بيتزا');
    expect(await screen.findByRole('button', { name: 'ابحث عن «بيتزا»' })).toBeTruthy();
    const suggestion = await screen.findByRole('button', { name: 'مايو بيتزا فرايز' });
    expect(within(suggestion).getByText('في المطاعم')).toBeTruthy();
    // Every other store type reads "في المتاجر", as in Tawsilty.
    expect(within(await screen.findByRole('button', { name: 'صوص بيتزا' })).getByText('في المتاجر')).toBeTruthy();
    // Another tab never shows the last tab's suggestions while its own load.
    await fireEvent.press(screen.getByRole('tab', { name: 'مطاعم' }));
    expect(screen.queryByRole('button', { name: 'صوص بيتزا' })).toBeNull();
    expect(await screen.findByRole('button', { name: 'مايو بيتزا فرايز' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'الكل' }));

    // ↖ fills the box with the suggestion; the row itself searches for it.
    await fireEvent.press(screen.getAllByRole('button', { name: 'املأ البحث' })[0]!);
    expect(screen.getByLabelText('بحث').props.value).toBe('مايو بيتزا فرايز');

    await fireEvent.changeText(screen.getByLabelText('بحث'), 'بيتزا');
    await fireEvent.press(await screen.findByRole('button', { name: 'ابحث عن «بيتزا»' }));
    expect(await screen.findByRole('button', { name: 'كرينكل - CRINKLE' })).toBeTruthy();
    expect(screen.getByText('110.00 ج.م')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ماركت الخير' })).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'متاجر أخرى' }));
    expect(await screen.findByRole('button', { name: 'ماركت الخير' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'كرينكل - CRINKLE' })).toBeNull();

    await fireEvent.press(screen.getByRole('tab', { name: 'مطاعم' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'كرينكل - CRINKLE' }));
    await waitFor(() => expect(screen).toHavePathname(`/store/${crinkle}`));
  });

  it('says so when nothing matches', async () => {
    await renderApp(ROUTES, { initialUrl: '/search' });
    await fireEvent.changeText(screen.getByLabelText('بحث'), 'fish');
    await fireEvent(screen.getByLabelText('بحث'), 'submitEditing');
    expect(await screen.findByText('لا توجد متاجر متاحة')).toBeTruthy();
    expect(screen.getByText('لم نجد متاجر قريبة منك حالياً\nجرّب تغيير الموقع أو البحث مرة أخرى')).toBeTruthy();
  });
});
