import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { session } from '@/core/auth/session';
import { FavoritesScreen } from '@/features/favorites/screens/FavoritesScreen';
import { CategoryScreen } from '@/features/store/screens/CategoryScreen';
import { StoreScreen } from '@/features/store/screens/StoreScreen';
import { insertCategory, insertIngredients, insertMenuItem, insertOptionGroup, insertStore } from '../utils/catalog';
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

const Cart = () => <Text>cart</Text>;
const ROUTES = {
  _layout: Root,
  'store/[id]/index': StoreScreen,
  'store/[id]/category/[categoryId]': CategoryScreen,
  favorites: FavoritesScreen,
  'customer/cart': Cart,
};

/** The bottom bar's text, read as one line. */
const bar = () => screen.getByTestId('cart-bar');

beforeEach(async () => {
  client = testQueryClient();
  await session.signOutLocally();
  await resetDb();
  await insertUser('customer', '01554459196');
  await session.signIn(await signInAs('01554459196'));
});

describe('store page and product sheet (contract §8.4, §8.5; real API)', () => {
  it('restaurant: info row, menu list, categories sheet, quick add, the sheet with a required choice and ingredients; the bar follows the cart', async () => {
    const sara = await insertStore('سارة سوشي - Sara sushi');
    const sushi = await insertCategory(sara, 'السوشي', 0);
    const sauces = await insertCategory(sara, 'صوصات', 1);
    const combo = await insertMenuItem(sara, sushi, 'كومبو الفرايد(20)', 350, 0);
    await insertIngredients(combo, ['٥ اسبايسي ليمون', '٥ كراب اتشيز']);
    await insertMenuItem(sara, sushi, 'جولدن(8)', 160, 1);
    const toffee = await insertMenuItem(sara, sauces, 'بونبوني', 0, 0);
    await insertOptionGroup(toffee, 'الوزن', true, 1, [
      ['ربع كيلو', 58.75],
      ['نصف كيلو', 116],
    ]);
    await renderApp(ROUTES, { initialUrl: `/store/${sara}` });

    expect(await screen.findByRole('header', { name: 'سارة سوشي - Sara sushi' })).toBeTruthy();
    expect(screen.getByText('25 دقيقة')).toBeTruthy();
    expect(screen.getByText('15 ج.م')).toBeTruthy();
    expect(screen.getByText('توصيلة')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'السوشي', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'صوصات' })).toBeTruthy();
    expect(screen.getAllByText('قابل للتخصيص')).toHaveLength(2); // the combo and the toffee
    expect(screen.getByText('السعر حسب الاختيار')).toBeTruthy();
    expect(within(bar()).getByText('تسوّق الآن وأضف 60.00 ج.م أو أكثر إلى طلبك!')).toBeTruthy();

    // ☰ lists every category with its count.
    await fireEvent.press(screen.getByRole('button', { name: 'كل الأقسام' }));
    const sauceRow = await screen.findByRole('button', { name: 'صوصات (1)' });
    expect(screen.getByRole('button', { name: 'السوشي (2)' })).toBeTruthy();
    await fireEvent.press(sauceRow);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'صوصات (1)' })).toBeNull());

    // "+" adds a simple item at once; the bar turns into the cart.
    await fireEvent.press(screen.getByRole('button', { name: 'أضف جولدن(8)' }));
    expect(within(bar()).getByText('عرض السلة')).toBeTruthy();
    expect(within(bar()).getByText('160.00 ج.م')).toBeTruthy();

    // "‹" opens the sheet: the button waits for the required choice.
    await fireEvent.press(screen.getByRole('button', { name: 'اختر بونبوني' }));
    expect(await screen.findByText('مطلوب')).toBeTruthy();
    expect(screen.getByText('اختر 1')).toBeTruthy();
    expect(screen.getByText('أكمل الاختيارات للإضافة للسلة')).toBeTruthy();
    expect(screen.getByRole('button', { name: /أضف للسلة/ })).toBeDisabled();
    await fireEvent.press(screen.getByRole('radio', { name: 'ربع كيلو (+58.75 ج.م)' }));
    await fireEvent.press(screen.getByRole('button', { name: 'زيادة الكمية' }));
    expect(screen.getByText('2')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'أضف للسلة 117.50 ج.م' }));
    await waitFor(() => expect(screen.queryByText('مطلوب')).toBeNull());
    expect(within(bar()).getByText('277.50 ج.م')).toBeTruthy();
    expect(within(bar()).getByText('3')).toBeTruthy();

    // A struck-out ingredient; "تُطلب معًا" shows the next items of the menu.
    await fireEvent.press(screen.getByRole('button', { name: 'اختر كومبو الفرايد(20)' }));
    const chip = await screen.findByRole('checkbox', { name: '٥ اسبايسي ليمون' });
    expect(chip).toBeChecked();
    await fireEvent.press(chip);
    expect(screen.getByRole('checkbox', { name: '٥ اسبايسي ليمون' })).not.toBeChecked();
    expect(screen.getByText('تُطلب معًا')).toBeTruthy();
    expect(within(screen.getByTestId('ordered-together')).getByText('جولدن(8)')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'أضف للسلة 350.00 ج.م' }));
    await waitFor(() => expect(within(bar()).getByText('627.50 ج.م')).toBeTruthy());

    await fireEvent.press(within(bar()).getByRole('button'));
    await waitFor(() => expect(screen).toHavePathname('/customer/cart'));
  });

  it('market: the الأقسام grid opens a category page with sub-category circles and a product search', async () => {
    const mart = await insertStore('توصيلة ماركت', 'market', { layout: 'grid' });
    const fresh = await insertCategory(mart, 'فاكهه وخضروات', 0);
    const veg = await insertCategory(mart, 'الخضار', 1, fresh);
    const fruit = await insertCategory(mart, 'الفاكهة', 2, fresh);
    const drinks = await insertCategory(mart, 'المشروبات', 3);
    await insertMenuItem(mart, veg, 'طماطم فرز أول', 20);
    await insertMenuItem(mart, veg, 'بصل ابيض', 28);
    await insertMenuItem(mart, fruit, 'موز', 38);
    await insertMenuItem(mart, drinks, 'مياه معدنية', 10);
    await renderApp(ROUTES, { initialUrl: `/store/${mart}` });

    expect(await screen.findByRole('header', { name: 'الأقسام' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'المشروبات' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'الخضار' })).toBeNull(); // sub-categories are inside
    await fireEvent.press(screen.getByRole('button', { name: 'فاكهه وخضروات' }));
    await waitFor(() => expect(screen).toHavePathname(`/store/${mart}/category/${fresh}`));

    // الكل shows each sub-category as a section.
    expect(await screen.findByRole('tab', { name: 'الكل', selected: true })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'الخضار' })).toBeTruthy();
    expect(screen.getByText('موز')).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: 'الفاكهة' }));
    expect(screen.queryByText('طماطم فرز أول')).toBeNull();
    expect(screen.getByText('موز')).toBeTruthy();

    await fireEvent.press(screen.getByRole('tab', { name: 'الكل' }));
    await fireEvent.changeText(screen.getByPlaceholderText('ابحث عن منتج'), 'طماطم');
    expect(await screen.findByText('طماطم فرز أول')).toBeTruthy();
    expect(screen.queryByText('بصل ابيض')).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: 'أضف طماطم فرز أول' }));
    expect(within(bar()).getByText('عرض السلة')).toBeTruthy();
    expect(within(bar()).getByText('20.00 ج.م')).toBeTruthy();
  });

  it('the heart saves the store in المفضلة; the list is empty again once removed', async () => {
    const maky = await insertStore('Maky');
    await insertMenuItem(maky, await insertCategory(maky, 'برجر'), 'ماكي برجر', 120);
    await renderApp(ROUTES, { initialUrl: `/store/${maky}` });

    await fireEvent.press(await screen.findByRole('button', { name: 'أضف إلى المفضلة' }));
    expect(await screen.findByRole('button', { name: 'إزالة من المفضلة' })).toBeTruthy();

    await act(async () => router.push('/favorites'));
    expect(await screen.findByRole('button', { name: 'Maky' })).toBeTruthy();
    await act(async () => router.back());
    await fireEvent.press(await screen.findByRole('button', { name: 'إزالة من المفضلة' }));
    await screen.findByRole('button', { name: 'أضف إلى المفضلة' });
    await act(async () => router.push('/favorites'));
    expect(await screen.findByText('لا توجد خدمات مفضلة')).toBeTruthy();
  });
});
