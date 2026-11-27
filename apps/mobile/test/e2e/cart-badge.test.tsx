import AsyncStorage from '@react-native-async-storage/async-storage';
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { screen, waitFor } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { session } from '@/core/auth/session';
import { cartApi } from '@/features/cart/api/cart';
import { CustomerTabs } from '@/features/cart/components/CustomerTabs';
import { insertProduct, insertStore } from '../utils/catalog';
import { insertUser, resetDb, signInAs } from '../utils/db';
import { renderApp, testQueryClient } from '../utils/render';

// The السلة tab shows how many stores the customer has a cart at (one cart per store), not how many
// items: four stores in سلاتي, 4 on the tab (2026-11-27).
let client: QueryClient;
function Root() {
  return (
    <QueryClientProvider client={client}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
const Page = () => <Text>page</Text>;
const ROUTES = { _layout: Root, 'customer/_layout': CustomerTabs, 'customer/index': Page, 'customer/cart': Page, 'customer/orders': Page, 'customer/account': Page };

let stores: number[];

beforeEach(async () => {
  client = testQueryClient();
  await AsyncStorage.clear();
  await session.signOutLocally();
  await resetDb();
  await insertUser('customer', '01554459196');
  stores = [await insertStore('شاورما الساقية'), await insertStore('حلويات الشام')];
  await session.signIn(await signInAs('01554459196'));
});

afterEach(async () => {
  await waitFor(() => expect(client.isFetching()).toBe(0));
});

const add = async (store: number, name: string, quantity: number) =>
  cartApi.add({ productId: await insertProduct(store, name), quantity, optionIds: [], removedIngredientIds: [] });

describe('the cart tab badge (real API)', () => {
  it('counts the stores with a cart, not the items in them', async () => {
    await add(stores[0]!, 'شاورما فراخ', 3);
    await add(stores[0]!, 'شاورما لحم', 2);
    await add(stores[1]!, 'كنافة', 4);
    await renderApp(ROUTES, { initialUrl: '/customer' });
    expect(await screen.findByText('2')).toBeTruthy();
    expect(screen.queryByText('9')).toBeNull();
  });

  it('shows no badge with no carts', async () => {
    await renderApp(ROUTES, { initialUrl: '/customer' });
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(screen.queryByText('0')).toBeNull();
  });
});
