import type { INestApplication } from '@nestjs/common';
import { deliveryFeeFor, distanceKm } from '@tawsela/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from '../utils/app.js';
import { insertCategory, insertProduct, insertStore } from '../utils/catalog.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

const PASSWORD = 'secret123';
const FAYOUM = [
  { lat: 29.25, lng: 30.78 },
  { lat: 29.36, lng: 30.78 },
  { lat: 29.36, lng: 30.9 },
  { lat: 29.25, lng: 30.9 },
];
const GIZA = [
  { lat: 29.9, lng: 31.1 },
  { lat: 30.1, lng: 31.1 },
  { lat: 30.1, lng: 31.25 },
  { lat: 29.9, lng: 31.25 },
];
const HOME = { lat: 29.3205, lng: 30.8364 };
const STORE_AT = { lat: 29.3, lng: 30.82 };
const ADDRESS = { type: 'apartment', building: 'مبنى 2', apartment: 'شقه 2', floor: '3', street: 'شارع 2', landmark: 'temp', phone: '01554459196', isDefault: false, ...HOME };
const RULE = { baseFee: 20, baseKm: 2, perKm: 10 };

describe('checkout and placing an order (e2e, contract §8.7)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let admin: { Authorization: string };
  let customer: { Authorization: string };
  let other: { Authorization: string };
  let fayoum: number;
  let store: number;
  let shawarma: number;
  let address: number;
  let requests = 0;

  const signIn = async (phone: string) => ({
    Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone, password: PASSWORD }).expect(201)).body.accessToken}`,
  });
  const addToCart = (productId: number, as = customer) =>
    http().post('/v1/me/cart/lines').set(as).send({ productId, quantity: 2, optionIds: [], removedIngredientIds: [] }).expect(201);
  const quote = (body: object, as = customer) => http().post('/v1/me/checkout/quote').set(as).send(body);
  const place = (body: object, as = customer) =>
    http()
      .post('/v1/me/orders')
      .set(as)
      .send({ slot: null, requestId: `00000000-0000-4000-8000-${String(++requests).padStart(12, '0')}`, ...body });
  const ready = async () => (await quote({ addressId: address }).expect(200)).body;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb();
    await insertUser('admin', '01000000001', PASSWORD);
    await insertUser('customer', '01554459196', PASSWORD);
    await insertUser('customer', '01100000001', PASSWORD);
    admin = await signIn('01000000001');
    customer = await signIn('01554459196');
    other = await signIn('01100000001');
    fayoum = (await http().post('/v1/admin/zones').set(admin).send({ name: 'الفيوم', polygon: FAYOUM, active: true }).expect(201)).body.id;
    store = await insertStore({ name: 'شاورما الساقية', pickupAllowed: true });
    await sql('UPDATE stores SET zone_id = ?, lat = ?, lng = ? WHERE id = ?', [fayoum, STORE_AT.lat, STORE_AT.lng, store]);
    shawarma = await insertProduct(store, await insertCategory(store), 'شاورما فراخ', 85);
    address = (await http().post('/v1/me/addresses').set(customer).send(ADDRESS).expect(201)).body.id;
  });
  afterAll(async () => {
    await app.close();
  });

  it('the admin sets the delivery fee rule and the global payment option (الإعدادات › رسوم التوصيل والدفع)', async () => {
    expect((await http().get('/v1/admin/settings/delivery').set(admin).expect(200)).body).toEqual({
      ...RULE,
      payoutOption: 'app_share',
      appPercent: 10,
    });
    await http().get('/v1/admin/settings/delivery').set(customer).expect(403);
    await http().patch('/v1/admin/settings/delivery').set(admin).send({ appPercent: 101 }).expect(400);
    await http().patch('/v1/admin/settings/delivery').set(admin).send({ payoutOption: 'cash' }).expect(400);
    const saved = await http().patch('/v1/admin/settings/delivery').set(admin).send({ baseFee: 15, perKm: 7.5, payoutOption: 'nothing' }).expect(200);
    expect(saved.body).toEqual({ baseFee: 15, baseKm: 2, perKm: 7.5, payoutOption: 'nothing', appPercent: 10 });
    const log = (await http().get('/v1/admin/audit').set(admin).expect(200)).body.entries;
    expect(log[0]).toMatchObject({ action: 'settings.delivery', target: { type: 'settings' }, details: { baseFee: 15, perKm: 7.5, payoutOption: 'nothing' } });
  });

  it('store lists and the store page show the fee to the chosen address, or the base fee without one', async () => {
    const fee = deliveryFeeFor(distanceKm(STORE_AT, HOME), RULE);
    expect(fee).toBe(30);
    const list = (query: string) => http().get(`/v1/catalog/stores?vertical=restaurant${query}`).set(customer).expect(200);
    expect((await list(`&addressId=${address}`)).body[0]).toMatchObject({ id: store, deliveryFee: fee });
    expect((await list('')).body[0]).toMatchObject({ id: store, deliveryFee: 20 });
    expect((await http().get(`/v1/catalog/stores/${store}?addressId=${address}`).set(customer).expect(200)).body.deliveryFee).toBe(fee);
    await http().get(`/v1/catalog/stores/${store}?addressId=${address}`).set(other).expect(404);
  });

  it('quotes the bill: items, the distance fee and today\'s later slots; a pickup has no fee', async () => {
    await quote({ addressId: address }).expect(404);
    await addToCart(shawarma);
    const bill = await ready();
    expect(bill).toMatchObject({ mode: 'delivery', count: 2, itemsTotal: 170, deliveryFee: 30, total: 200 });
    expect(bill.distanceKm).toBeCloseTo(distanceKm(STORE_AT, HOME), 3);
    expect(Array.isArray(bill.slots)).toBe(true);
    // The spot moved on the map is priced, not the saved one.
    expect((await quote({ addressId: address, location: STORE_AT }).expect(200)).body).toMatchObject({ deliveryFee: 20, total: 190 });
    await quote({ addressId: address, location: { lat: 30, lng: 31.2 } }).expect(422).expect(({ body }) => expect(body.code).toBe('CHECKOUT_ADDRESS'));
    await quote({}).expect(400);
    const { cart } = (await http().get('/v1/me/cart').set(customer).expect(200)).body;
    await http().patch('/v1/me/cart').set(customer).send({ cartId: cart.id, mode: 'pickup' }).expect(200);
    expect((await quote({}).expect(200)).body).toMatchObject({ mode: 'pickup', deliveryFee: 0, total: 170, distanceKm: null });
  });

  it('places the order at the bill the customer saw: lines copied, the cart emptied, who pays whom fixed', async () => {
    await sql("UPDATE stores SET payout_option = 'app_share', app_percent = 12.5 WHERE id = ?", [store]);
    await addToCart(shawarma);
    const bill = await ready();
    await place({ cartId: bill.cartId, addressId: address, expectedTotal: 150 })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('CHECKOUT_TOTAL_CHANGED'));
    await place({ cartId: bill.cartId + 1, addressId: address, expectedTotal: bill.total })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('CHECKOUT_CART_CHANGED'));
    const placed = await place({ cartId: bill.cartId, addressId: address, expectedTotal: bill.total }).expect(201);
    expect(placed.body.order).toMatchObject({
      status: 'pending_review',
      store: { id: store, name: 'شاورما الساقية' },
      mode: 'delivery',
      scheduledFor: null,
      count: 2,
      itemsTotal: 170,
      deliveryFee: 30,
      total: 200,
    });
    expect(placed.body.order.code).toMatch(/^\d{6}$/);
    expect((await http().get('/v1/me/cart').set(customer).expect(200)).body.cart).toBeNull();
    const [row] = await sql<Record<string, unknown>[]>('SELECT * FROM orders WHERE id = ?', [placed.body.order.id]);
    expect(row).toMatchObject({ payout_option: 'app_share', app_percent: '12.50', app_share: '21.25', store_gets: '148.75', store_from_driver: '148.75' });
    expect(row!.address_text).toContain('شارع 2');
    await sql('UPDATE products SET name = ?, price = 1 WHERE id = ?', ['تغير', shawarma]);
    const lines = await sql<Record<string, unknown>[]>('SELECT name, unit_price, quantity FROM order_lines WHERE order_id = ?', [placed.body.order.id]);
    expect(lines).toEqual([{ name: 'شاورما فراخ', unit_price: '85.00', quantity: 2 }]);
    const events = await sql<Record<string, unknown>[]>('SELECT status FROM order_events WHERE order_id = ?', [placed.body.order.id]);
    expect(events).toEqual([{ status: 'pending_review' }]);

    expect((await http().get('/v1/me/orders').set(customer).expect(200)).body).toMatchObject([{ id: placed.body.order.id, total: 200 }]);
    expect((await http().get('/v1/me/orders').set(other).expect(200)).body).toEqual([]);
    const table = (await http().get('/v1/admin/orders?status=pending_review').set(admin).expect(200)).body;
    expect(table).toMatchObject([
      { id: placed.body.order.id, customer: { phone: '01554459196' }, hasDriver: false, paymentMethod: 'cash', storeFromDriver: 148.75, appShare: 21.25 },
    ]);
    expect((await http().get('/v1/admin/orders?status=delivered').set(admin).expect(200)).body).toEqual([]);
    await http().get('/v1/admin/orders').set(customer).expect(403);
  });

  it('places one order for a repeated tap and for racing taps', async () => {
    await addToCart(shawarma);
    const bill = await ready();
    const body = { cartId: bill.cartId, addressId: address, expectedTotal: bill.total, slot: null, requestId: '11111111-1111-4111-8111-111111111111' };
    const send = () => http().post('/v1/me/orders').set(customer).send(body);
    const [a, b] = await Promise.all([send(), send()]);
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(a.body.order.id).toBe(b.body.order.id);
    expect((await send().expect(201)).body.order.id).toBe(a.body.order.id);
    expect((await sql<unknown[]>('SELECT id FROM orders')).length).toBe(1);
  });

  it('follows the global option when the store has none, and option 3 leaves the store nothing from the delivery man', async () => {
    await http().patch('/v1/admin/settings/delivery').set(admin).send({ payoutOption: 'nothing', appPercent: 10 }).expect(200);
    await addToCart(shawarma);
    const bill = await ready();
    const { order } = (await place({ cartId: bill.cartId, addressId: address, expectedTotal: bill.total }).expect(201)).body;
    const [row] = await sql<Record<string, unknown>[]>('SELECT payout_option, store_gets, store_from_driver FROM orders WHERE id = ?', [order.id]);
    expect(row).toEqual({ payout_option: 'nothing', store_gets: '153.00', store_from_driver: '0.00' });
  });

  it('refuses another customer\'s address, an address outside the store\'s zone, a store with no location and an old slot', async () => {
    await addToCart(shawarma);
    const bill = await ready();
    const otherAddress = (await http().post('/v1/me/addresses').set(other).send(ADDRESS).expect(201)).body.id;
    await place({ cartId: bill.cartId, addressId: otherAddress, expectedTotal: bill.total }).expect(404);
    await place({ cartId: bill.cartId, addressId: address, expectedTotal: bill.total, slot: 7 })
      .expect(422)
      .expect(({ body }) => expect(body.code).toBe('CHECKOUT_SLOT'));

    const giza = (await http().post('/v1/admin/zones').set(admin).send({ name: 'الجيزة', polygon: GIZA, active: true }).expect(201)).body.id;
    await sql('UPDATE stores SET zone_id = ? WHERE id = ?', [giza, store]);
    await quote({ addressId: address }).expect(422).expect(({ body }) => expect(body.code).toBe('CHECKOUT_ADDRESS'));
    await sql('UPDATE stores SET zone_id = ?, lat = NULL, lng = NULL WHERE id = ?', [fayoum, store]);
    await quote({ addressId: address }).expect(409).expect(({ body }) => expect(body.code).toBe('CHECKOUT_NO_STORE_LOCATION'));
    expect((await sql<unknown[]>('SELECT id FROM orders')).length).toBe(0);
  });

  it('a later slot from the quote is kept with the order; a pickup needs no address', async () => {
    await addToCart(shawarma);
    const { cart } = (await http().get('/v1/me/cart').set(customer).expect(200)).body;
    await http().patch('/v1/me/cart').set(customer).send({ cartId: cart.id, mode: 'pickup' }).expect(200);
    const bill = (await quote({}).expect(200)).body;
    const slot = bill.slots[0];
    const { order } = (await place({ cartId: bill.cartId, expectedTotal: bill.total, slot: slot ?? null }).expect(201)).body;
    expect(order).toMatchObject({ mode: 'pickup', deliveryFee: 0, total: 170 });
    if (slot === undefined) return; // Too close to midnight for a later slot today.
    expect(new Date(order.scheduledFor).getTime()).toBeGreaterThan(Date.now() + 29 * 60_000);
  });
});
