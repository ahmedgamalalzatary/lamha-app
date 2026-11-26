import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { act, fireEvent, screen, waitFor, within } from 'expo-router/testing-library';
import MyCarts from '@/app/customer/cart';
import { ToastHost } from '@/components/Toast';
import { session } from '@/core/auth/session';
import { cartApi } from '@/features/cart/api/cart';
import { CartScreen } from '@/features/cart/screens/CartScreen';
import { FavoritesScreen } from '@/features/favorites/screens/FavoritesScreen';
import { CategoryScreen } from '@/features/store/screens/CategoryScreen';
import { StoreScreen } from '@/features/store/screens/StoreScreen';
import { StoreSearchScreen } from '@/features/store/screens/StoreSearchScreen';
import { insertCategory, insertIngredients, insertMenuItem, insertOptionGroup, insertStore } from '../utils/catalog';
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
  'store/[id]/index': StoreScreen,
  'store/[id]/category/[categoryId]': CategoryScreen,
  'store/[id]/search': StoreSearchScreen,
  favorites: FavoritesScreen,
  'customer/cart': MyCarts,
  'cart/[storeId]': CartScreen,
};

/** The bottom bar's text, read as one line. */
const bar = () => screen.getByTestId('cart-bar');
/** The bar once it has appeared: an add can resolve before the bar mounts. */
const barShown = () => screen.findByTestId('cart-bar');

beforeEach(async () => {
  client = testQueryClient();
  await session.signOutLocally();
  await resetDb();
  await insertUser('customer', '01554459196');
  await session.signIn(await signInAs('01554459196'));
});

describe('store page and product sheet (contract §8.4, §8.5; real API)', () => {
  it('refreshes a stale cart when its line no longer exists', async () => {
    const store = await insertStore('ماكي');
    const productId = await insertMenuItem(store, await insertCategory(store, 'الوجبات'), 'برجر', 85);
    const { cart } = await cartApi.add({ productId, quantity: 1, optionIds: [], removedIngredientIds: [] });
    await renderApp(ROUTES, { initialUrl: `/cart/${store}` });
    const increase = await screen.findByRole('button', { name: 'زيادة كمية برجر' });
    await cartApi.remove(cart!.lines[0]!.id);
    await fireEvent.press(increase);
    expect(await screen.findByText('سلتك فارغة')).toBeTruthy();
  });

  it("a closed store's item goes in its own cart beside another store's; add failures show inside the sheet (§8.6)", async () => {
    const first = await insertStore('ماكي');
    const second = await insertStore('الساقية');
    const productId = await insertMenuItem(first, await insertCategory(first, 'الوجبات'), 'برجر', 85);
    const category = await insertCategory(second, 'السندوتشات');
    const custom = await insertMenuItem(second, category, 'شاورما', 100);
    const gone = await insertMenuItem(second, category, 'كفتة', 90, 1);
    await insertOptionGroup(custom, 'الحجم', true, 1, [['كبير', 20]]);
    await insertOptionGroup(gone, 'الحجم', true, 1, [['كبير', 20]]);
    await cartApi.add({ productId, quantity: 1, optionIds: [], removedIngredientIds: [] });
    await sql('UPDATE stores SET closed_now = true WHERE id = ?', [second]);
    await renderApp(ROUTES, { initialUrl: `/store/${second}?product=${custom}` });
    await fireEvent.press(await screen.findByRole('radio', { name: 'كبير (+20.00 ج.م)' }));
    await fireEvent.press(screen.getByRole('button', { name: 'أضف للسلة 120.00 ج.م' }));
    expect(await screen.findByText('تمت الاضافة الى السلة')).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId('product-sheet')).toBeNull());
    expect((await cartApi.get(second)).cart).toMatchObject({ total: 120, store: { isOpen: false } });
    expect((await cartApi.get(first)).cart?.total).toBe(85);

    await fireEvent.press(screen.getByRole('button', { name: 'كفتة' }));
    await fireEvent.press(await screen.findByRole('radio', { name: 'كبير (+20.00 ج.م)' }));
    await sql('UPDATE products SET active = false WHERE id = ?', [gone]);
    await fireEvent.press(screen.getByRole('button', { name: 'أضف للسلة 110.00 ج.م' }));
    const alert = await within(screen.getByTestId('product-sheet')).findByText('هذا المنتج أو اختياراته غير متاحة الآن');
    expect(alert).toHaveProp('accessibilityRole', 'alert');
  });

  it('"سلاتي" lists a card per store cart, opens it, and "حذف كل السلات؟" empties them all (§8.6)', async () => {
    const first = await insertStore('ماكي');
    const second = await insertStore('الساقية');
    await cartApi.add({ productId: await insertMenuItem(first, await insertCategory(first, 'الوجبات'), 'برجر', 85), quantity: 2, optionIds: [], removedIngredientIds: [] });
    await cartApi.add({ productId: await insertMenuItem(second, await insertCategory(second, 'السندوتشات'), 'شاورما', 100), quantity: 1, optionIds: [], removedIngredientIds: [] });
    await renderApp(ROUTES, { initialUrl: '/customer/cart' });

    expect(await screen.findByRole('header', { name: 'سلاتي' })).toBeTruthy();
    const cards = await screen.findAllByRole('button', { name: /أصناف$/ });
    expect(cards.map((c) => c.props.accessibilityLabel)).toEqual(['الساقية, 1 أصناف', 'ماكي, 1 أصناف']);
    await fireEvent.press(cards[1]!);
    expect(await screen.findByText('سلة المشتريات')).toBeTruthy();
    expect(screen).toHavePathname(`/cart/${first}`);
    await act(async () => router.back());

    await fireEvent.press(await screen.findByRole('button', { name: 'حذف كل السلات' }));
    expect(screen.getByText('سيتم حذف جميع السلات المعلقة')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'إلغاء' }));
    expect(screen.getAllByRole('button', { name: /أصناف$/ })).toHaveLength(2);
    await fireEvent.press(screen.getByRole('button', { name: 'حذف كل السلات' }));
    await fireEvent.press(screen.getByRole('button', { name: 'حذف' }));
    expect(await screen.findByText('سلتك فارغة')).toBeTruthy();
    expect((await cartApi.list()).carts).toEqual([]);
  });

  it('opens the persisted cart, edits quantities and the note, and handles a store closing', async () => {
    const store = await insertStore('ماكي', 'restaurant', { pickupAllowed: true });
    const category = await insertCategory(store, 'الوجبات');
    await insertMenuItem(store, category, 'برجر', 85);
    await insertMenuItem(store, category, 'بطاطس', 20, 1);
    await renderApp(ROUTES, { initialUrl: `/store/${store}` });

    await fireEvent.press(await screen.findByRole('button', { name: 'أضف برجر' }));
    await fireEvent.press(await screen.findByRole('button', { name: /عرض السلة/ }));
    expect(await screen.findByText('سلة المشتريات')).toBeTruthy();
    expect(screen.getByText('بطاطس')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'زيادة كمية برجر' }));
    expect(await screen.findAllByText('170.00 ج.م')).toHaveLength(2);
    await fireEvent.press(screen.getByRole('radio', { name: 'استلام من المحل' }));
    await waitFor(() => expect(screen.getByRole('radio', { name: 'استلام من المحل' })).toBeChecked());
    await fireEvent.press(screen.getByRole('button', { name: 'دوّن ملاحظة' }));
    await fireEvent.changeText(screen.getByPlaceholderText('دوّن ملاحظة'), 'اتصل قبل الوصول');
    await fireEvent.press(screen.getByRole('button', { name: 'تم' }));
    expect(await screen.findByText('اتصل قبل الوصول')).toBeTruthy();

    await sql('UPDATE stores SET closed_now = true WHERE id = ?', [store]);
    await fireEvent.press(screen.getByRole('button', { name: 'تابع للدفع' }));
    expect(await screen.findByText('عذراً الخدمة مغلقة الآن')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'تقليل كمية برجر' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'حذف برجر' }));
    await fireEvent.press(screen.getByRole('button', { name: 'إلغاء' }));
    expect(screen.getByRole('button', { name: 'حذف برجر' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'حذف برجر' }));
    await fireEvent.press(screen.getByRole('button', { name: 'حذف' }));
    expect(await screen.findByText('سلتك فارغة')).toBeTruthy();
  });

  it('"قد تعجبك أيضًا" also offers what is already in the cart, with its "+" (capture 2026-11-26)', async () => {
    const store = await insertStore('ماكي');
    const category = await insertCategory(store, 'الوجبات');
    const burger = await insertMenuItem(store, category, 'برجر', 85);
    await insertMenuItem(store, category, 'بطاطس', 20, 1);
    await cartApi.add({ productId: burger, quantity: 1, optionIds: [], removedIngredientIds: [] });
    await renderApp(ROUTES, { initialUrl: `/cart/${store}` });

    expect(await screen.findByRole('button', { name: 'أضف بطاطس' })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'أضف برجر' }));
    expect(await screen.findAllByText('170.00 ج.م')).toHaveLength(2);
  });

  it('a slow note save does not close a newer note being written', async () => {
    const store = await insertStore('ماكي');
    const productId = await insertMenuItem(store, await insertCategory(store, 'الوجبات'), 'برجر', 85);
    await cartApi.add({ productId, quantity: 1, optionIds: [], removedIngredientIds: [] });
    const realEdit = cartApi.edit;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const spy = jest.spyOn(cartApi, 'edit').mockImplementation(async (body) => {
      await gate;
      return realEdit(body);
    });
    try {
      await renderApp(ROUTES, { initialUrl: `/cart/${store}` });
      await fireEvent.press(await screen.findByRole('button', { name: 'دوّن ملاحظة' }));
      await fireEvent.changeText(screen.getByPlaceholderText('دوّن ملاحظة'), 'أ');
      await fireEvent.press(screen.getByRole('button', { name: 'تم' }));
      await fireEvent.press(screen.getAllByRole('button', { name: 'إغلاق' })[0]!);
      await fireEvent.press(screen.getByRole('button', { name: 'دوّن ملاحظة' }));
      await fireEvent.changeText(screen.getByPlaceholderText('دوّن ملاحظة'), 'ب');
      release();
      await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
      await waitFor(async () => expect((await cartApi.get(store)).cart?.note).toBe('أ'));
      expect(await screen.findByDisplayValue('ب')).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });

  it('an ordered-together add from another store starts that store cart and keeps the product sheet open', async () => {
    const first = await insertStore('ماكي');
    const second = await insertStore('الساقية');
    const burger = await insertMenuItem(first, await insertCategory(first, 'الوجبات'), 'برجر', 85);
    const category = await insertCategory(second, 'السندوتشات');
    const shawarma = await insertMenuItem(second, category, 'شاورما', 100);
    await insertOptionGroup(shawarma, 'إضافات', false, 1, [['ثومية', 5]]);
    await insertMenuItem(second, category, 'بطاطس', 20, 1);
    await cartApi.add({ productId: burger, quantity: 1, optionIds: [], removedIngredientIds: [] });
    await renderApp(ROUTES, { initialUrl: `/store/${second}?product=${shawarma}` });

    await fireEvent.press(await within(await screen.findByTestId('product-sheet')).findByRole('button', { name: 'أضف بطاطس' }));
    await waitFor(async () => expect((await cartApi.get(second)).cart?.count).toBe(1));
    expect((await cartApi.get(first)).cart?.count).toBe(1);
    expect(within(screen.getByTestId('product-sheet')).getByRole('header', { name: 'شاورما' })).toBeTruthy();
  });

  it('keeps a cart per store and opens that store cart in English', async () => {
    await sql("UPDATE users SET locale = 'en' WHERE phone = ?", ['01554459196']);
    await session.signIn(await signInAs('01554459196'));
    const first = await insertStore('First store', 'restaurant', { pickupAllowed: true });
    const second = await insertStore('Second store');
    await insertMenuItem(first, await insertCategory(first, 'Meals'), 'Burger', 85);
    await insertMenuItem(second, await insertCategory(second, 'Meals'), 'Pizza', 95);
    await renderApp(ROUTES, { initialUrl: `/store/${first}` });

    await fireEvent.press(await screen.findByRole('button', { name: 'Add Burger' }));
    await within(await barShown()).findByText('85.00 EGP');
    await act(async () => router.push(`/store/${second}`));
    await fireEvent.press(await screen.findByRole('button', { name: 'Add Pizza' }));
    expect(await screen.findByText('Added to the cart')).toBeTruthy();
    expect((await cartApi.get(first)).cart?.total).toBe(85);
    await fireEvent.press(await screen.findByRole('button', { name: /View cart/ }));
    expect(await screen.findByText('Shopping cart')).toBeTruthy();
    expect(screen.getByText('Second store')).toBeTruthy();
    expect(screen.queryByRole('radio', { name: 'Store pickup' })).toBeNull();
  });

  it('restaurant: info row, menu list, categories sheet, quick add, the sheet with a required choice and ingredients; the bar follows the cart', async () => {
    const sara = await insertStore('سارة سوشي - Sara sushi');
    const sushi = await insertCategory(sara, 'السوشي', 0);
    const sauces = await insertCategory(sara, 'صوصات', 1);
    const combo = await insertMenuItem(sara, sushi, 'كومبو الفرايد(20)', 350, 0);
    await insertIngredients(combo, ['٥ اسبايسي ليمون', '٥ كراب اتشيز']);
    await insertMenuItem(sara, sushi, 'جولدن(8)', 160, 1);
    const off = await insertMenuItem(sara, sushi, 'اوشي', 90, 2);
    await sql('UPDATE products SET active = false WHERE id = ?', [off]);
    const toffee = await insertMenuItem(sara, sauces, 'بونبوني', 0, 0);
    await insertOptionGroup(toffee, 'الوزن', true, 1, [
      ['ربع كيلو', 58.75],
      ['نصف كيلو', 116],
    ]);
    await renderApp(ROUTES, { initialUrl: `/store/${sara}` });

    expect(await screen.findByRole('header', { name: 'سارة سوشي - Sara sushi' })).toBeTruthy();
    expect(screen.getByText('25 دقيقة')).toBeTruthy();
    expect(screen.getByText('20 ج.م')).toBeTruthy();
    expect(screen.getByText('وصّل')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'السوشي', selected: true })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'صوصات' })).toBeTruthy();
    expect(screen.getAllByText('قابل للتخصيص')).toHaveLength(2); // the combo and the toffee
    expect(screen.getByText('السعر حسب الاختيار')).toBeTruthy();
    // A switched-off product is greyed with "غير متوفر": no add button, no sheet.
    expect(screen.getByText('غير متوفر')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'اوشي' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'أضف اوشي' })).toBeNull();
    expect(within(bar()).getByText('تسوّق الآن وأضف 60.00 ج.م أو أكثر إلى طلبك!')).toBeTruthy();

    // ☰ lists every category with its count.
    await fireEvent.press(screen.getByRole('button', { name: 'كل الأقسام' }));
    const sauceRow = await screen.findByRole('button', { name: 'صوصات (1)' });
    expect(screen.getByRole('button', { name: 'السوشي (3)' })).toBeTruthy();
    await fireEvent.press(sauceRow);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'صوصات (1)' })).toBeNull());

    // "+" adds a simple item at once; the bar turns into the cart.
    await fireEvent.press(screen.getByRole('button', { name: 'أضف جولدن(8)' }));
    expect(await within(await barShown()).findByText('عرض السلة')).toBeTruthy();
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
    expect(within(screen.getByTestId('ordered-together')).queryByText('اوشي')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'أضف للسلة 350.00 ج.م' }));
    await waitFor(() => expect(within(bar()).getByText('627.50 ج.م')).toBeTruthy());

    await fireEvent.press(within(bar()).getByRole('button'));
    await waitFor(() => expect(screen).toHavePathname(`/cart/${sara}`));
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
    expect(await within(await barShown()).findByText('عرض السلة')).toBeTruthy();
    expect(within(bar()).getByText('20.00 ج.م')).toBeTruthy();
  });

  it('a store closed by its hours says when it opens: "يفتح الساعة" (capture 2026-11-26)', async () => {
    const later = await insertStore('Maky');
    // Opens two hours from now in Cairo, for one minute.
    const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .format(new Date()).split(':').map(Number) as [number, number];
    const opens = (h + 2) % 24;
    await sql('UPDATE stores SET opens_at = ?, closes_at = ? WHERE id = ?', [`${opens}:${m}`, `${opens}:${(m + 1) % 60}`, later]);
    await renderApp(ROUTES, { initialUrl: `/store/${later}` });
    const clock = `${opens % 12 || 12}:${String(m).padStart(2, '0')} ${opens < 12 ? 'ص' : 'م'}`;
    expect(await screen.findByText(`يفتح الساعة ${clock}`)).toBeTruthy();
    expect(screen.getByText('مغلق')).toBeTruthy();
  });

  it('a store closed by its switch reads "مغلق" without an opening time', async () => {
    const switched = await insertStore('ماكي', 'restaurant', { closedNow: true });
    await renderApp(ROUTES, { initialUrl: `/store/${switched}` });
    expect(await screen.findByText('مغلق')).toBeTruthy();
    expect(screen.queryByText(/يفتح الساعة/)).toBeNull();
  });

  it('an item in the cart shows its count, and tapping the count does nothing (capture 2026-11-26)', async () => {
    const maky = await insertStore('Maky');
    const sandwiches = await insertCategory(maky, 'سندوتشات');
    await insertMenuItem(maky, sandwiches, 'تويستر', 90);
    await renderApp(ROUTES, { initialUrl: `/store/${maky}` });

    await fireEvent.press(await screen.findByRole('button', { name: 'أضف تويستر' }));
    const badge = await screen.findByLabelText('تويستر: 1 في السلة');
    await fireEvent.press(badge);
    await waitFor(() => expect(within(bar()).getByText('90.00 ج.م')).toBeTruthy());
    expect(screen.queryByTestId('product-sheet')).toBeNull();
    expect(screen.getByLabelText('تويستر: 1 في السلة')).toBeTruthy();
  });

  it('the search button opens "البحث": products as you type; nothing typed or nothing matching leaves it blank', async () => {
    const maky = await insertStore('Maky');
    const sandwiches = await insertCategory(maky, 'سندوتشات');
    await insertMenuItem(maky, sandwiches, 'سموكي ميلت', 160, 0);
    await insertMenuItem(maky, sandwiches, 'سموكي فرايز', 110, 1);
    await insertMenuItem(maky, sandwiches, 'تويستر', 90, 2);
    await renderApp(ROUTES, { initialUrl: `/store/${maky}` });

    await fireEvent.press(await screen.findByRole('button', { name: 'ابحث عن منتج' }));
    await waitFor(() => expect(screen).toHavePathname(`/store/${maky}/search`));
    expect(await screen.findByRole('header', { name: 'البحث' })).toBeTruthy();
    const box = screen.getByPlaceholderText('ابحث عن كل ما تريد عند Maky');
    expect(screen.queryByText('تويستر')).toBeNull();

    await fireEvent.changeText(box, 'سموكي');
    expect(screen.getByText('سموكي ميلت')).toBeTruthy();
    expect(screen.queryByText('تويستر')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'أضف سموكي فرايز' }));
    await waitFor(() => expect(within(bar()).getByText('110.00 ج.م')).toBeTruthy());

    await fireEvent.changeText(box, 'zzqq');
    expect(screen.queryByText('سموكي ميلت')).toBeNull();
  });

  it('a store with no products says so; a free delivery fee reads "مجاني"', async () => {
    const kebab = await insertStore('كبابجي السنى');
    // The fee is the admin's distance rule (§8.7): a base fee of 0 delivers for free.
    await sql('INSERT INTO delivery_settings (id, base_fee, per_km) VALUES (1, 0, 0) ON DUPLICATE KEY UPDATE base_fee = 0, per_km = 0');
    await renderApp(ROUTES, { initialUrl: `/store/${kebab}` });
    expect(await screen.findByText('لا توجد منتجات حاليا')).toBeTruthy();
    expect(screen.getByText('مجاني')).toBeTruthy();
  });

  it('opens straight on the product a search result named (review F81)', async () => {
    const maky = await insertStore('Maky');
    const category = await insertCategory(maky, 'برجر');
    await insertMenuItem(maky, category, 'تشيز برجر', 90);
    const burger = await insertMenuItem(maky, category, 'ماكي برجر', 120, 1);
    await renderApp(ROUTES, { initialUrl: `/store/${maky}?product=${burger}` });
    expect(await screen.findByRole('button', { name: 'أضف للسلة 120.00 ج.م' })).toBeTruthy();
  });

  it('says so when the heart cannot be saved (review F44)', async () => {
    const maky = await insertStore('Maky');
    await insertMenuItem(maky, await insertCategory(maky, 'برجر'), 'ماكي برجر', 120);
    await renderApp(ROUTES, { initialUrl: `/store/${maky}` });
    const heart = await screen.findByRole('button', { name: 'أضف إلى المفضلة' });
    await sql('RENAME TABLE favorite_stores TO favorite_stores_away');
    try {
      await fireEvent.press(heart);
      expect(await screen.findByText('حدث خطأ، حاول مرة أخرى')).toBeTruthy();
    } finally {
      await sql('RENAME TABLE favorite_stores_away TO favorite_stores');
    }
    expect(screen.getByRole('button', { name: 'أضف إلى المفضلة' })).toBeEnabled();
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
