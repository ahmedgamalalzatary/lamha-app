import type { INestApplication } from '@nestjs/common';
import type { CustomerAccount, DriverOffer, MyPoints } from '@tawsela/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from '../utils/app.js';
import { insertCategory, insertProduct, insertStore, linkPartner } from '../utils/catalog.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

const PASSWORD = 'secret123';
const CAIRO = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
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

describe('points (e2e, contract §8.16, §11 A5, A21)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let admin: { Authorization: string };
  let customer: { Authorization: string };
  let partner: { Authorization: string };
  let customerId: number;
  let store: number;
  let shawarma: number;
  let address: number;
  let requests = 0;

  const signIn = async (phone: string) => ({
    Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone, password: PASSWORD }).expect(201)).body.accessToken}`,
  });
  const points = async (): Promise<MyPoints> => (await http().get('/v1/me/points').set(customer).expect(200)).body;
  const adjust = (body: object) => http().post(`/v1/admin/customers/${customerId}/points`).set(admin).send(body);
  const nextRequest = () => `00000000-0000-4000-8000-${String(++requests).padStart(12, '0')}`;
  const step = (id: number, action: string) => http().post(`/v1/partner/orders/${id}/${action}`).set(partner).expect(200);

  /** 2 × شاورما فراخ (85): items 170; a delivery adds 30. */
  async function bill(mode: 'delivery' | 'pickup' = 'delivery') {
    const { cart } = (await http().post('/v1/me/cart/lines').set(customer).send({ productId: shawarma, quantity: 2, optionIds: [], removedIngredientIds: [] }).expect(201)).body;
    await http().patch('/v1/me/cart').set(customer).send({ cartId: cart.id, mode }).expect(200);
    return (await http().post('/v1/me/checkout/quote').set(customer).send(mode === 'delivery' ? { cartId: cart.id, addressId: address } : { cartId: cart.id }).expect(200)).body;
  }
  const place = (body: object) => http().post('/v1/me/orders').set(customer).send({ addressId: address, slot: null, requestId: nextRequest(), ...body });

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb();
    await insertUser('admin', '01000000001', PASSWORD);
    customerId = await insertUser('customer', '01554459196', PASSWORD);
    await sql("UPDATE users SET first_name = 'منى', last_name = 'علي' WHERE id = ?", [customerId]);
    admin = await signIn('01000000001');
    customer = await signIn('01554459196');
    const fayoum = (await http().post('/v1/admin/zones').set(admin).send({ name: 'الفيوم', polygon: FAYOUM, active: true }).expect(201)).body.id;
    store = await insertStore({ name: 'شاورما الساقية', pickupAllowed: true });
    await sql('UPDATE stores SET zone_id = ?, lat = 29.3, lng = 30.82 WHERE id = ?', [fayoum, store]);
    shawarma = await insertProduct(store, await insertCategory(store), 'شاورما فراخ', 85);
    await linkPartner(await insertUser('partner', '01000000002', PASSWORD), store);
    partner = await signIn('01000000002');
    address = (await http().post('/v1/me/addresses').set(customer).send(ADDRESS).expect(201)).body.id;
  });
  afterAll(async () => {
    await app.close();
  });

  it('the admin sets the rules: what earns a point, what a point pays, the minimum [Owner: two settings]', async () => {
    expect((await http().get('/v1/admin/settings/points').set(admin).expect(200)).body).toEqual({ earnEvery: 10, pointValue: 0.1, minimum: 100 });
    await http().get('/v1/admin/settings/points').set(customer).expect(403);
    await http().patch('/v1/admin/settings/points').set(admin).send({ earnEvery: 0 }).expect(400);
    await http().patch('/v1/admin/settings/points').set(admin).send({ minimum: 2.5 }).expect(400);
    expect((await http().patch('/v1/admin/settings/points').set(admin).send({ pointValue: 0.25, minimum: 240 }).expect(200)).body).toEqual({
      earnEvery: 10,
      pointValue: 0.25,
      minimum: 240,
    });
    const log = (await http().get('/v1/admin/audit').set(admin).expect(200)).body.entries;
    expect(log[0]).toMatchObject({ action: 'settings.points', target: { type: 'settings' }, details: { pointValue: 0.25, minimum: 240 } });
    expect(await points()).toEqual({ balance: 0, worth: 0, earnEvery: 10, pointValue: 0.25, minimum: 240, entries: [] });
  });

  it('earns on the items once delivered, never on the fee; the wallet part counts [Owner]', async () => {
    await sql("UPDATE stores SET delivered_by = 'store' WHERE id = ?", [store]);
    await sql('UPDATE users SET wallet_balance = 50 WHERE id = ?', [customerId]);
    const quoted = await bill();
    expect(quoted).toMatchObject({ total: 200, pointsBalance: 0, points: { earnEvery: 10, pointValue: 0.1, minimum: 100 } });
    const placed = await place({ cartId: quoted.cartId, expectedTotal: 200, expectedWalletPaid: 50 }).expect(201);
    const id = placed.body.order.id;
    for (const action of ['accept', 'ready', 'out']) await step(id, action);
    expect((await points()).balance).toBe(0);
    await step(id, 'delivered');
    const after = await points();
    expect(after).toMatchObject({ balance: 17, worth: 1.7 });
    expect(after.entries).toEqual([{ id: expect.any(Number), kind: 'add', reason: 'order', points: 17, note: '', orderCode: placed.body.order.code, createdAt: expect.any(String) }]);
  });

  it('spends after the wallet, up to what is due; cash pays the rest; the store and the customer see it', async () => {
    await adjust({ kind: 'add', points: 1500, note: 'هدية' }).expect(201);
    await sql('UPDATE users SET wallet_balance = 50 WHERE id = ?', [customerId]);
    const quoted = await bill('pickup');
    expect(quoted).toMatchObject({ total: 170, pointsBalance: 1500 });
    // Wallet 50 first; 120 is left, which 1200 points pay.
    await place({ cartId: quoted.cartId, expectedTotal: 170, expectedWalletPaid: 50, expectedPointsSpent: 1500 })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('CHECKOUT_TOTAL_CHANGED'));
    const placed = await place({ cartId: quoted.cartId, expectedTotal: 170, expectedWalletPaid: 50, expectedPointsSpent: 1200 }).expect(201);
    expect(placed.body.order).toMatchObject({ total: 170, walletPaid: 50, pointsSpent: 1200, pointsPaid: 120 });
    const id = placed.body.order.id;

    const now = await points();
    expect(now.balance).toBe(300);
    expect(now.entries[0]).toMatchObject({ kind: 'deduct', reason: 'order', points: 1200, orderCode: placed.body.order.code });
    expect((await http().get(`/v1/me/orders/${id}`).set(customer).expect(200)).body).toMatchObject({ pointsSpent: 1200, pointsPaid: 120 });
    expect((await http().get(`/v1/partner/orders/${id}`).set(partner).expect(200)).body).toMatchObject({ walletPaid: 50, pointsPaid: 120 });
    expect((await http().get('/v1/admin/orders').set(admin).expect(200)).body[0]).toMatchObject({ id, pointsPaid: 120 });

    // What points paid earns nothing: 170 - 120 = 50 earns 5.
    for (const action of ['accept', 'ready', 'collected']) await step(id, action);
    expect((await points()).balance).toBe(305);
  });

  it('spends nothing below the minimum', async () => {
    await adjust({ kind: 'add', points: 99, note: 'هدية' }).expect(201);
    const quoted = await bill('pickup');
    await place({ cartId: quoted.cartId, expectedTotal: 170, expectedPointsSpent: 99 }).expect(409);
    const placed = await place({ cartId: quoted.cartId, expectedTotal: 170 }).expect(201);
    expect(placed.body.order).toMatchObject({ pointsSpent: 0, pointsPaid: 0 });
    expect((await points()).balance).toBe(99);
  });

  it('a rejected order gives its points back [Derived from the wallet\'s rule]', async () => {
    await adjust({ kind: 'add', points: 500, note: 'هدية' }).expect(201);
    const quoted = await bill('pickup');
    const placed = await place({ cartId: quoted.cartId, expectedTotal: 170, expectedPointsSpent: 500 }).expect(201);
    expect((await points()).balance).toBe(0);
    await step(placed.body.order.id, 'reject');
    const after = await points();
    expect(after.balance).toBe(500);
    expect(after.entries[0]).toMatchObject({ kind: 'add', reason: 'refund', points: 500, orderCode: placed.body.order.code });
  });

  it('the delivery man collects the cash after the wallet and the points', async () => {
    await adjust({ kind: 'add', points: 1000, note: 'هدية' }).expect(201);
    await sql('UPDATE users SET wallet_balance = 50 WHERE id = ?', [customerId]);
    const made = await http().post('/v1/admin/drivers').set(admin).send({ firstName: 'كريم', lastName: 'سعيد', phone: '01011111111' }).expect(201);
    const driver = { Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone: '01011111111', password: made.body.password }).expect(201)).body.accessToken}` };
    const at = (minutes: number) => CAIRO.format(new Date(Date.now() + minutes * 60_000));
    await http()
      .patch('/v1/admin/settings/drivers')
      .set(admin)
      .send({ schedule: Array.from({ length: 7 }, () => ({ start: at(10), end: at(250) })) })
      .expect(200);
    await http().post('/v1/driver/shift/start').set(driver).expect(200);

    const quoted = await bill();
    const placed = await place({ cartId: quoted.cartId, expectedTotal: 200, expectedWalletPaid: 50, expectedPointsSpent: 1000 }).expect(201);
    const id = placed.body.order.id;
    await step(id, 'accept');
    const offers: DriverOffer[] = (await http().get('/v1/driver/offers').set(driver).expect(200)).body;
    expect(offers[0]).toMatchObject({ id, total: 50 });
    expect((await http().post(`/v1/driver/offers/${id}/accept`).set(driver).expect(200)).body).toMatchObject({ total: 50, walletPaid: 50, pointsPaid: 100 });

    // Delivered by him: 170 - 100 earns 7.
    await step(id, 'ready');
    for (const action of ['arrived', 'out', 'delivered']) await http().post(`/v1/driver/orders/${id}/${action}`).set(driver).expect(200);
    expect((await points()).balance).toBe(7);
  });

  it('the admin adds or deducts points with a reason, never below 0; العملاء shows them', async () => {
    await adjust({ kind: 'add', points: 120, note: 'تعويض' }).expect(201).expect(({ body }) => expect(body).toEqual({ balance: 120 }));
    await adjust({ kind: 'deduct', points: 121, note: 'خصم' })
      .expect(422)
      .expect(({ body }) => expect(body.code).toBe('POINTS_BALANCE'));
    await adjust({ kind: 'add', points: 1.5, note: 'x' }).expect(400);
    await adjust({ kind: 'add', points: 5, note: '' }).expect(400);
    await adjust({ kind: 'deduct', points: 20, note: 'خصم بالخطأ' }).expect(201);
    expect((await points()).entries.map((e) => [e.kind, e.reason, e.points, e.note])).toEqual([
      ['deduct', 'admin', 20, 'خصم بالخطأ'],
      ['add', 'admin', 120, 'تعويض'],
    ]);
    const [row]: CustomerAccount[] = (await http().get('/v1/admin/customers?q=منى').set(admin).expect(200)).body;
    expect(row).toMatchObject({ pointsBalance: 100, walletBalance: 0 });
    const log = (await http().get('/v1/admin/audit').set(admin).expect(200)).body.entries;
    expect(log[0]).toMatchObject({ action: 'customer.points', target: { type: 'account', id: customerId, name: 'منى علي' }, details: { kind: 'deduct', points: 20, balance: 100 } });
  });
});
