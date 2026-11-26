import type { INestApplication } from '@nestjs/common';
import type { AdminCoupon, CatalogStore, HomeScreen, StorePage } from '@tawsela/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from '../utils/app.js';
import { insertCategory, insertProduct, insertStore, linkPartner } from '../utils/catalog.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

const PASSWORD = 'secret123';
const FAYOUM = [
  { lat: 29.25, lng: 30.78 },
  { lat: 29.36, lng: 30.78 },
  { lat: 29.36, lng: 30.9 },
  { lat: 29.25, lng: 30.9 },
];
const ADDRESS = {
  type: 'apartment',
  building: 'مبنى 2',
  apartment: 'شقه 2',
  floor: '3',
  street: 'شارع 2',
  landmark: 'temp',
  phone: '01554459196',
  isDefault: false,
  lat: 29.3205,
  lng: 30.8364,
};
const BLACK_FRIDAY = {
  code: 'Black Friday',
  title: 'Black Friday',
  kind: 'amount',
  value: 6,
  maxDiscount: null,
  minOrder: 150,
  startsAt: null,
  endsAt: null,
  perCustomer: 1,
  totalLimit: null,
  paidBy: 'app',
  active: true,
};

describe('offers, codes and banners (e2e, contract §8.2, §8.4, §8.7, §8.10, §11 A14–A15)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let admin: { Authorization: string };
  let customer: { Authorization: string };
  let partner: { Authorization: string };
  let customerId: number;
  let store: number;
  let market: number;
  let shawarma: number;
  let address: number;
  let requests = 0;

  const signIn = async (phone: string) => ({
    Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone, password: PASSWORD }).expect(201)).body.accessToken}`,
  });
  const nextRequest = () => `00000000-0000-4000-8000-${String(++requests).padStart(12, '0')}`;
  const step = (id: number, action: string) => http().post(`/v1/partner/orders/${id}/${action}`).set(partner).expect(200);
  const newCoupon = async (over: object = {}): Promise<AdminCoupon> =>
    (await http().post('/v1/admin/coupons').set(admin).send({ ...BLACK_FRIDAY, storeId: store, ...over }).expect(201)).body;

  /** 2 × شاورما فراخ (85): items 170; a delivery adds 30. */
  async function fillCart(mode: 'delivery' | 'pickup' = 'delivery') {
    const { cart } = (await http().post('/v1/me/cart/lines').set(customer).send({ productId: shawarma, quantity: 2, optionIds: [], removedIngredientIds: [] }).expect(201)).body;
    await http().patch('/v1/me/cart').set(customer).send({ cartId: cart.id, mode }).expect(200);
    cartId = cart.id;
    return cart.id as number;
  }
  let cartId = 0;
  const quote = (body: object = {}) => http().post('/v1/me/checkout/quote').set(customer).send({ cartId, addressId: address, ...body });
  const place = (body: object) => http().post('/v1/me/orders').set(customer).send({ addressId: address, slot: null, requestId: nextRequest(), ...body });
  const storeFromDriver = async (id: number): Promise<number> => (await http().get(`/v1/partner/orders/${id}`).set(partner).expect(200)).body.storeFromDriver;
  const row = async (id: number): Promise<CatalogStore> => {
    const list: CatalogStore[] = (await http().get('/v1/catalog/stores').set(customer).expect(200)).body;
    return list.find((s) => s.id === id)!;
  };

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb();
    await insertUser('admin', '01000000001', PASSWORD);
    customerId = await insertUser('customer', '01554459196', PASSWORD);
    admin = await signIn('01000000001');
    customer = await signIn('01554459196');
    const fayoum = (await http().post('/v1/admin/zones').set(admin).send({ name: 'الفيوم', polygon: FAYOUM, active: true }).expect(201)).body.id;
    store = await insertStore({ name: 'شاورما الساقية', pickupAllowed: true });
    market = await insertStore({ name: 'توصيلتي مارت', vertical: 'market', layout: 'grid' });
    await sql("UPDATE stores SET zone_id = ?, lat = 29.3, lng = 30.82, payout_option = 'fee_only', app_percent = 0", [fayoum]);
    shawarma = await insertProduct(store, await insertCategory(store), 'شاورما فراخ', 85);
    await linkPartner(await insertUser('partner', '01000000002', PASSWORD), store);
    partner = await signIn('01000000002');
    address = (await http().post('/v1/me/addresses').set(customer).send(ADDRESS).expect(201)).body.id;
  });
  afterAll(async () => {
    await app.close();
  });

  describe('codes', () => {
    it('the admin makes, lists, changes and deletes codes; one code however it is typed', async () => {
      await http().post('/v1/admin/coupons').set(customer).send(BLACK_FRIDAY).expect(403);
      await http().post('/v1/admin/coupons').set(admin).send({ ...BLACK_FRIDAY, kind: 'percent', value: 120 }).expect(400);
      await http().post('/v1/admin/coupons').set(admin).send({ ...BLACK_FRIDAY, storeId: 9999 }).expect(404);
      const made = await newCoupon();
      expect(made).toMatchObject({ code: 'Black Friday', storeId: store, storeName: 'شاورما الساقية', used: 0, paidBy: 'app' });
      await http()
        .post('/v1/admin/coupons')
        .set(admin)
        .send({ ...BLACK_FRIDAY, code: ' black  FRIDAY ' })
        .expect(409)
        .expect(({ body }) => expect(body.code).toBe('COUPON_CODE_TAKEN'));

      const changed = (await http().patch(`/v1/admin/coupons/${made.id}`).set(admin).send({ value: 10, endsAt: '2030-01-01T00:00:00.000Z' }).expect(200)).body;
      expect(changed).toMatchObject({ value: 10, minOrder: 150, endsAt: '2030-01-01T00:00:00.000Z' });
      await http().patch(`/v1/admin/coupons/${made.id}`).set(admin).send({ startsAt: '2031-01-01T00:00:00.000Z' }).expect(400);
      expect((await http().get('/v1/admin/coupons').set(admin).expect(200)).body).toHaveLength(1);

      await http().delete(`/v1/admin/coupons/${made.id}`).set(admin).expect(204);
      expect((await http().get('/v1/admin/coupons').set(admin).expect(200)).body).toEqual([]);
      const log = (await http().get('/v1/admin/audit').set(admin).expect(200)).body.entries;
      expect(log.slice(0, 3).map((e: { action: string }) => e.action)).toEqual(['coupon.delete', 'coupon.update', 'coupon.create']);
      expect(log[2]).toMatchObject({ target: { type: 'coupon', id: made.id, name: 'Black Friday' } });
    });

    it('a store shows its own codes as the "قسيمة" badge, and the app\'s codes in its قسائمي sheet', async () => {
      await newCoupon();
      await newCoupon({ code: 'WELCOME', title: 'أهلاً', storeId: null, kind: 'percent', value: 20, maxDiscount: 50, minOrder: 0 });
      await newCoupon({ code: 'OLD', endsAt: '2020-01-01T00:00:00.000Z' });
      await newCoupon({ code: 'OFF', active: false });

      expect((await row(store)).offers.voucher).toMatchObject({ code: 'Black Friday', value: 6, minOrder: 150 });
      expect((await row(market)).offers.voucher).toBeNull();
      const page: StorePage = (await http().get(`/v1/catalog/stores/${store}`).set(customer).expect(200)).body;
      expect(page.vouchers.map((v) => v.code)).toEqual(['Black Friday', 'WELCOME']);
      const other: StorePage = (await http().get(`/v1/catalog/stores/${market}`).set(customer).expect(200)).body;
      expect(other.vouchers.map((v) => v.code)).toEqual(['WELCOME']);
    });

    it('"وفر على طلبك" takes the code off before the wallet; a wrong code says why', async () => {
      await newCoupon();
      await fillCart();
      const plain = (await quote().expect(200)).body;
      expect(plain).toMatchObject({ itemsTotal: 170, deliveryFee: 30, usualDeliveryFee: 30, total: 200, coupon: null });
      expect((await quote({ couponCode: 'black friday' }).expect(200)).body).toMatchObject({
        total: 194,
        coupon: { code: 'Black Friday', title: 'Black Friday', discount: 6 },
      });
      const problem = async (body: object, code: string) =>
        quote(body)
          .expect(422)
          .expect(({ body }) => expect(body.code).toBe(code));
      await problem({ couponCode: 'NOPE' }, 'COUPON_NOT_FOUND');
      await newCoupon({ code: 'BIG', minOrder: 500 });
      await problem({ couponCode: 'BIG' }, 'COUPON_MIN_ORDER');
      await newCoupon({ code: 'MART', storeId: market });
      await problem({ couponCode: 'MART' }, 'COUPON_STORE');
    });

    it('places the order with the code once per customer; a rejected order gives the use back', async () => {
      await newCoupon();
      await sql('UPDATE users SET wallet_balance = 500 WHERE id = ?', [customerId]);
      const cartId = await fillCart();
      // The wallet pays what the code left: 194.
      await place({ cartId, expectedTotal: 200, couponCode: 'Black Friday' }).expect(409);
      const placed = await place({ cartId, expectedTotal: 194, expectedWalletPaid: 194, couponCode: 'Black Friday' }).expect(201);
      expect(placed.body.order).toMatchObject({ total: 194, couponDiscount: 6, couponCode: 'Black Friday', walletPaid: 194 });
      const id = placed.body.order.id;
      expect((await http().get(`/v1/partner/orders/${id}`).set(partner).expect(200)).body).toMatchObject({ couponDiscount: 6, total: 194 });
      // The app pays it: the store is paid its full 170.
      expect(await storeFromDriver(id)).toBe(170);
      expect((await http().get('/v1/admin/coupons').set(admin).expect(200)).body[0].used).toBe(1);

      await fillCart();
      await quote({ couponCode: 'Black Friday' })
        .expect(422)
        .expect(({ body }) => expect(body.code).toBe('COUPON_USED'));
      await step(id, 'reject');
      expect((await quote({ couponCode: 'Black Friday' }).expect(200)).body.coupon.discount).toBe(6);
    });

    it('a code the store pays for lowers what the store is paid; the last use of a limited code goes once', async () => {
      await newCoupon({ paidBy: 'store', totalLimit: 1, perCustomer: 5 });
      const cartId = await fillCart();
      const placed = await place({ cartId, expectedTotal: 194, couponCode: 'Black Friday' }).expect(201);
      expect(await storeFromDriver(placed.body.order.id)).toBe(164);
      await fillCart();
      await quote({ couponCode: 'Black Friday' })
        .expect(422)
        .expect(({ body }) => expect(body.code).toBe('COUPON_GONE'));
    });
  });

  describe('free delivery', () => {
    it('the admin sets it on the store; from its amount the fee is waived and struck through', async () => {
      const set = (await http().patch(`/v1/admin/stores/${store}`).set(admin).send({ freeDeliveryFrom: 150, freeDeliveryPaidBy: 'store' }).expect(200)).body;
      expect(set).toMatchObject({ freeDeliveryFrom: 150, freeDeliveryPaidBy: 'store' });
      expect((await row(store)).offers.freeDeliveryFrom).toBe(150);

      const cartId = await fillCart();
      expect((await quote().expect(200)).body).toMatchObject({ itemsTotal: 170, deliveryFee: 0, usualDeliveryFee: 30, total: 170 });
      const placed = await place({ cartId, expectedTotal: 170 }).expect(201);
      expect(placed.body.order).toMatchObject({ deliveryFee: 0, total: 170 });
      // The store pays the waived 30.
      expect(await storeFromDriver(placed.body.order.id)).toBe(140);
    });

    it('stays off below its amount', async () => {
      await http().patch(`/v1/admin/stores/${store}`).set(admin).send({ freeDeliveryFrom: 1000 }).expect(200);
      await fillCart();
      expect((await quote().expect(200)).body).toMatchObject({ deliveryFee: 30, usualDeliveryFee: 30, total: 200 });
    });
  });

  describe('product discounts', () => {
    it('are the admin\'s: the old price is struck through, and the app\'s share is paid to the store', async () => {
      await http().put(`/v1/admin/products/${shawarma}/discount`).set(admin).send({ oldPrice: 80, paidBy: 'app' }).expect(400);
      await http().put(`/v1/admin/products/${shawarma}/discount`).set(partner).send({ oldPrice: 100, paidBy: 'app' }).expect(403);
      await http().patch(`/v1/partner/products/${shawarma}`).set(partner).send({ oldPrice: 100 }).expect(400);
      const product = (await http().put(`/v1/admin/products/${shawarma}/discount`).set(admin).send({ oldPrice: 100, paidBy: 'app' }).expect(200)).body;
      expect(product).toMatchObject({ price: 85, oldPrice: 100, discountPaidBy: 'app' });
      const log = (await http().get('/v1/admin/audit').set(admin).expect(200)).body.entries;
      expect(log[0]).toMatchObject({ action: 'product.discount', target: { type: 'product', id: shawarma, name: 'شاورما فراخ' } });

      expect((await row(store)).offers.discount).toEqual({ upTo: 15, same: true });
      const cartId = await fillCart('pickup');
      const placed = await place({ cartId, expectedTotal: 170 }).expect(201);
      // 2 × 15 the app pays: the store is paid 200.
      expect(await storeFromDriver(placed.body.order.id)).toBe(200);

      await http().put(`/v1/admin/products/${shawarma}/discount`).set(admin).send({ oldPrice: null, paidBy: 'store' }).expect(200);
      expect((await row(store)).offers.discount).toBeNull();
    });
  });

  describe('the offers screen and chips (§8.10, §6.3)', () => {
    it('lists the stores with each kind of offer, by tab', async () => {
      await http().put(`/v1/admin/products/${shawarma}/discount`).set(admin).send({ oldPrice: 100, paidBy: 'store' }).expect(200);
      await http().patch(`/v1/admin/stores/${market}`).set(admin).send({ freeDeliveryFrom: 0 }).expect(200);
      await newCoupon({ storeId: market });
      const offers = async (query: string) => ((await http().get(`/v1/catalog/offers?${query}`).set(customer).expect(200)).body as CatalogStore[]).map((s) => s.id);
      expect(await offers('kind=discounts')).toEqual([store]);
      expect(await offers('kind=delivery')).toEqual([market]);
      expect(await offers('kind=coupons')).toEqual([market]);
      expect(await offers('kind=coupons&scope=restaurants')).toEqual([]);
      expect(await offers('kind=coupons&scope=others')).toEqual([market]);
      await http().get('/v1/catalog/offers?kind=wheel').set(customer).expect(400);

      const chips = async (query: string) => ((await http().get(`/v1/catalog/stores?${query}`).set(customer).expect(200)).body as CatalogStore[]).map((s) => s.id);
      expect(await chips('discounts=true')).toEqual([store]);
      expect(await chips('freeDelivery=true')).toEqual([market]);
    });
  });

  describe('banners (§8.2)', () => {
    it('the admin orders the carousel and the rails; home shows the active ones of visible stores', async () => {
      const banner = (body: object) => http().post('/v1/admin/banners').set(admin).send({ image: '/uploads/catalog/b.jpg', sortOrder: 0, active: true, opens: 'store', ...body });
      await banner({ place: 'carousel', storeId: store }).set(customer).expect(403);
      await banner({ place: 'carousel', storeId: 9999 }).expect(404);
      await banner({ place: 'carousel', storeId: store, image: 'https://x.test/a.jpg' }).expect(400);
      const second = (await banner({ place: 'carousel', storeId: store, sortOrder: 2 }).expect(201)).body;
      const first = (await banner({ place: 'carousel', storeId: market, sortOrder: 1 }).expect(201)).body;
      const rail = (await banner({ place: 'rail', storeId: market, opens: 'products' }).expect(201)).body;
      expect(rail).toMatchObject({ place: 'rail', storeName: 'توصيلتي مارت', opens: 'products' });
      await banner({ place: 'carousel', storeId: store, active: false }).expect(201);
      const veg = await insertCategory(market, 'الخضار');
      const tomato = await insertProduct(market, veg, 'طماطم فرز أول', 20);
      await insertProduct(market, veg, 'خيار', 15, false);

      const home: HomeScreen = (await http().get('/v1/catalog/home').set(customer).expect(200)).body;
      expect(home.banners.map((b) => [b.id, b.place])).toEqual([
        [first.id, 'carousel'],
        [second.id, 'carousel'],
        [rail.id, 'rail'],
      ]);
      expect(home.banners[0]).toMatchObject({ store: { id: market, name: 'توصيلتي مارت', vertical: 'market' }, products: [] });
      expect(home.banners[2]!.products.map((p) => p.id)).toEqual([tomato]);

      await http().patch(`/v1/admin/banners/${first.id}`).set(admin).send({ active: false }).expect(200);
      await sql('UPDATE stores SET active = false WHERE id = ?', [store]);
      expect(((await http().get('/v1/catalog/home').set(customer).expect(200)).body as HomeScreen).banners.map((b) => b.id)).toEqual([rail.id]);
      expect((await http().get('/v1/admin/banners').set(admin).expect(200)).body).toHaveLength(4);
      await http().delete(`/v1/admin/banners/${rail.id}`).set(admin).expect(204);
      expect((await http().get('/v1/admin/banners').set(admin).expect(200)).body).toHaveLength(3);
    });
  });
});
