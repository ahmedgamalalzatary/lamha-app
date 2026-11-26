import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import sharp from 'sharp';
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
const ADDRESS = { type: 'apartment', building: 'مبنى 2', apartment: 'شقه 2', street: 'شارع 2', landmark: 'temp', phone: '01554459196', isDefault: false, lat: 29.3205, lng: 30.8364 };

describe('pharmacy requests (e2e, contract §8.11)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  type Auth = { Authorization: string };
  let admin: Auth;
  let customer: Auth;
  let partner: Auth;
  let pharmacy: number;
  let restaurant: number;
  let address: number;
  let requests = 0;
  const signIn = async (phone: string): Promise<Auth> => ({
    Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone, password: PASSWORD }).expect(201)).body.accessToken}`,
  });
  const nextRequest = () => `00000000-0000-4000-8000-${String(++requests).padStart(12, '0')}`;
  let png: Buffer;
  const upload = (as: Auth = customer) =>
    http().post('/v1/me/uploads').set(as).attach('image', png, { filename: 'roshetta.png', contentType: 'image/png' });
  const ask = (over: object = {}) => ({ storeId: pharmacy, kind: 'prescription', image: null, text: 'علبة بنادول', ...over });
  const quote = (req: object = ask(), body: object = {}) => http().post('/v1/me/checkout/quote').set(customer).send({ request: req, addressId: address, ...body });
  const place = (bill: { total: number }, req: object = ask(), body: object = {}) =>
    http().post('/v1/me/orders').set(customer).send({ request: req, addressId: address, slot: null, expectedTotal: bill.total, requestId: nextRequest(), ...body });

  beforeAll(async () => {
    app = await createTestApp();
    png = await sharp({ create: { width: 600, height: 800, channels: 3, background: '#FFFFFF' } }).png().toBuffer();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    await insertUser('admin', '01000000001', PASSWORD);
    await insertUser('customer', '01554459196', PASSWORD);
    const p = await insertUser('partner', '01000000002', PASSWORD);
    admin = await signIn('01000000001');
    customer = await signIn('01554459196');
    const zone = (await http().post('/v1/admin/zones').set(admin).send({ name: 'الفيوم', polygon: FAYOUM, active: true }).expect(201)).body.id;
    pharmacy = await insertStore({ name: 'صيدلية علاجي', vertical: 'pharmacy' });
    restaurant = await insertStore({ name: 'شاورما الساقية' });
    // 2.8 km from the address: 20 for the first 2 km and 10 for the started third.
    await sql("UPDATE stores SET zone_id = ?, lat = 29.3, lng = 30.82, payout_option = 'app_share', app_percent = 10 WHERE id IN (?, ?)", [zone, pharmacy, restaurant]);
    await linkPartner(p, pharmacy);
    partner = await signIn('01000000002');
    address = (await http().post('/v1/me/addresses').set(customer).send(ADDRESS).expect(201)).body.id;
  });

  it('a customer uploads a photo for a request; nobody else can', async () => {
    const { body } = await upload().expect(201);
    expect(body.url).toMatch(/^\/uploads\/requests\/[\w-]+\.jpg$/);
    await upload(partner).expect(403);
    await http().post('/v1/me/uploads').set(customer).attach('image', Buffer.from('not an image'), { filename: 'x.png', contentType: 'image/png' }).expect(400);
  });

  it('quotes only the delivery fee: no items price, no code, no points; the wallet may pay the fee', async () => {
    const { body: bill } = await quote().expect(200);
    expect(bill).toMatchObject({ cartId: null, mode: 'delivery', count: 0, itemsTotal: 0, deliveryFee: 30, total: 30, coupon: null });

    await quote(ask({ text: '  ', image: null })).expect(400);
    await quote(ask({ image: '/uploads/catalog/x.jpg', text: '' })).expect(400);
    await quote(ask({ kind: 'medicine' })).expect(400);
    await quote(ask({ storeId: restaurant })).expect(404);
    await quote(ask(), { couponCode: 'Black Friday' }).expect(400);
    await http().post('/v1/me/checkout/quote').set(customer).send({ addressId: address }).expect(400);
    await http().post('/v1/me/checkout/quote').set(customer).send({ request: ask() }).expect(400);
    await sql('UPDATE stores SET closed_now = true WHERE id = ?', [pharmacy]);
    await quote().expect(409).expect(({ body }) => expect(body.code).toBe('CART_STORE_CLOSED'));
  });

  it('places the request; the pharmacy accepts it with its price, which fixes the bill and tells the customer', async () => {
    const image = (await upload().expect(201)).body.url as string;
    const req = ask({ image, text: '' });
    const bill = (await quote(req).expect(200)).body;
    await place(bill, req, { expectedPointsSpent: 10 }).expect(400);
    const { order } = (await place(bill, req).expect(201)).body;
    expect(order).toMatchObject({ status: 'pending_review', itemsTotal: 0, deliveryFee: 30, total: 30, count: 0, request: { kind: 'prescription', image, text: '', priced: false } });

    const card = (await http().get(`/v1/partner/orders/${order.id}`).set(partner).expect(200)).body;
    expect(card).toMatchObject({ itemsTotal: 0, lines: [], request: { image, priced: false } });
    await http().post(`/v1/partner/orders/${order.id}/accept`).set(partner).send({}).expect(422)
      .expect(({ body }) => expect(body.code).toBe('ORDER_PRICE_REQUIRED'));
    await http().post(`/v1/partner/orders/${order.id}/accept`).set(partner).send({ price: -1 }).expect(400);
    const accepted = (await http().post(`/v1/partner/orders/${order.id}/accept`).set(partner).send({ price: 120 }).expect(200)).body;
    expect(accepted).toMatchObject({ status: 'preparing', itemsTotal: 120, total: 150, storeFromDriver: 108, request: { priced: true } });

    const mine = (await http().get(`/v1/me/orders/${order.id}`).set(customer).expect(200)).body;
    expect(mine).toMatchObject({ itemsTotal: 120, total: 150, request: { priced: true } });
    const [row] = await sql<Record<string, unknown>[]>('SELECT app_share, store_gets, points_earned FROM orders WHERE id = ?', [order.id]);
    expect(row).toMatchObject({ app_share: '12.00', store_gets: '108.00' });
    const { items } = (await http().get('/v1/me/notifications').set(customer).expect(200)).body;
    expect(items[0]).toMatchObject({ kind: 'order_accepted', body: `سعر طلبك #${order.code} من الصيدلية 120.00 ج.م، والإجمالي مع التوصيل 150.00 ج.م` });
  });

  it('the wallet pays the fee only; the medicine is paid in cash on delivery', async () => {
    const customerId = (await sql<{ id: number }[]>("SELECT id FROM users WHERE phone = '01554459196'"))[0]!.id;
    await http().post(`/v1/admin/customers/${customerId}/wallet`).set(admin).send({ kind: 'add', amount: 100, note: 'هدية' }).expect(201);
    const bill = (await quote().expect(200)).body;
    expect(bill.walletBalance).toBe(100);
    const { order } = (await place(bill, ask(), { expectedWalletPaid: 30 }).expect(201)).body;
    expect(order.walletPaid).toBe(30);
    const accepted = (await http().post(`/v1/partner/orders/${order.id}/accept`).set(partner).send({ price: 55.5 }).expect(200)).body;
    expect(accepted).toMatchObject({ itemsTotal: 55.5, total: 85.5, walletPaid: 30 });
  });

  it("a pharmacy's products still go through its cart, accepted without a price; a price sent with them is refused", async () => {
    const productId = await insertProduct(pharmacy, await insertCategory(pharmacy, 'مسكنات'), 'بنادول', 60);
    const { cart } = (await http().post('/v1/me/cart/lines').set(customer).send({ productId, quantity: 1, optionIds: [], removedIngredientIds: [] }).expect(201)).body;
    const bill = (await http().post('/v1/me/checkout/quote').set(customer).send({ cartId: cart.id, addressId: address }).expect(200)).body;
    await http().post('/v1/me/checkout/quote').set(customer).send({ cartId: cart.id, request: ask(), addressId: address }).expect(400);
    const { order } = (await http().post('/v1/me/orders').set(customer)
      .send({ cartId: cart.id, addressId: address, slot: null, expectedTotal: bill.total, requestId: nextRequest() }).expect(201)).body;
    expect(order.request).toBeNull();
    await http().post(`/v1/partner/orders/${order.id}/accept`).set(partner).send({ price: 10 }).expect(400);
    expect((await http().post(`/v1/partner/orders/${order.id}/accept`).set(partner).expect(200)).body).toMatchObject({ itemsTotal: 60, status: 'preparing' });
  });
});
