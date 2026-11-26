import type { INestApplication } from '@nestjs/common';
import type { CustomerAccount, DriverOffer, Wallet } from '@tawsela/shared';
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

describe('the wallet (e2e, contract §8.15, §11 A5)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let admin: { Authorization: string };
  let customer: { Authorization: string };
  let partner: { Authorization: string };
  let customerId: number;
  let adminId: number;
  let shawarma: number;
  let address: number;
  let requests = 0;

  const signIn = async (phone: string) => ({
    Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone, password: PASSWORD }).expect(201)).body.accessToken}`,
  });
  const wallet = async (): Promise<Wallet> => (await http().get('/v1/me/wallet').set(customer).expect(200)).body;
  const adjust = (body: object, id = customerId) => http().post(`/v1/admin/customers/${id}/wallet`).set(admin).send(body);
  const nextRequest = () => `00000000-0000-4000-8000-${String(++requests).padStart(12, '0')}`;

  /** 2 × شاورما فراخ (85) delivered for 30: a bill of 200. */
  async function bill() {
    await http().post('/v1/me/cart/lines').set(customer).send({ productId: shawarma, quantity: 2, optionIds: [], removedIngredientIds: [] }).expect(201);
    return (await http().post('/v1/me/checkout/quote').set(customer).send({ addressId: address }).expect(200)).body;
  }
  const place = (body: object) => http().post('/v1/me/orders').set(customer).send({ addressId: address, slot: null, requestId: nextRequest(), ...body });

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb();
    adminId = await insertUser('admin', '01000000001', PASSWORD);
    customerId = await insertUser('customer', '01554459196', PASSWORD, 'mona@example.com');
    await sql("UPDATE users SET first_name = 'منى', last_name = 'علي' WHERE id = ?", [customerId]);
    admin = await signIn('01000000001');
    customer = await signIn('01554459196');
    const fayoum = (await http().post('/v1/admin/zones').set(admin).send({ name: 'الفيوم', polygon: FAYOUM, active: true }).expect(201)).body.id;
    const store = await insertStore({ name: 'شاورما الساقية' });
    await sql('UPDATE stores SET zone_id = ?, lat = 29.3, lng = 30.82 WHERE id = ?', [fayoum, store]);
    shawarma = await insertProduct(store, await insertCategory(store), 'شاورما فراخ', 85);
    await linkPartner(await insertUser('partner', '01000000002', PASSWORD), store);
    partner = await signIn('01000000002');
    address = (await http().post('/v1/me/addresses').set(customer).send(ADDRESS).expect(201)).body.id;
  });
  afterAll(async () => {
    await app.close();
  });

  it('starts empty; the admin finds the customer in العملاء and adds or deducts with a reason', async () => {
    expect(await wallet()).toEqual({ balance: 0, entries: [] });
    await http().get('/v1/admin/customers').set(customer).expect(403);
    await http().get('/v1/me/wallet').set(admin).expect(403);

    const found: CustomerAccount[] = (await http().get('/v1/admin/customers?q=0155445').set(admin).expect(200)).body;
    expect(found).toEqual([{ id: customerId, name: 'منى علي', phone: '01554459196', email: 'mona@example.com', walletBalance: 0, pointsBalance: 0, createdAt: expect.any(String) }]);
    expect((await http().get('/v1/admin/customers?q=منى').set(admin).expect(200)).body).toHaveLength(1);
    expect((await http().get('/v1/admin/customers?q=nobody').set(admin).expect(200)).body).toEqual([]);

    expect((await adjust({ kind: 'add', amount: 100, note: 'تعويض عن تأخير' }).expect(201)).body).toEqual({ balance: 100 });
    expect((await adjust({ kind: 'deduct', amount: 30.5, note: '  خصم بالخطأ  ' }).expect(201)).body).toEqual({ balance: 69.5 });

    const { balance, entries } = await wallet();
    expect(balance).toBe(69.5);
    expect(entries).toEqual([
      { id: expect.any(Number), kind: 'deduct', reason: 'admin', amount: 30.5, note: 'خصم بالخطأ', orderCode: null, createdAt: expect.any(String) },
      { id: expect.any(Number), kind: 'add', reason: 'admin', amount: 100, note: 'تعويض عن تأخير', orderCode: null, createdAt: expect.any(String) },
    ]);
    expect((await http().get('/v1/admin/customers?q=منى').set(admin).expect(200)).body[0].walletBalance).toBe(69.5);

    const log = (await http().get('/v1/admin/audit').set(admin).expect(200)).body.entries;
    expect(log[0]).toMatchObject({ action: 'customer.wallet', target: { type: 'account', id: customerId, name: 'منى علي' }, details: { kind: 'deduct', amount: 30.5, balance: 69.5 } });
  });

  it('refuses a deduction over the balance [Owner: never below 0], a bad amount, no reason, or a non-customer', async () => {
    await adjust({ kind: 'add', amount: 20, note: 'هدية' }).expect(201);
    await adjust({ kind: 'deduct', amount: 20.01, note: 'خصم' })
      .expect(422)
      .expect(({ body }) => expect(body.code).toBe('WALLET_BALANCE'));
    await adjust({ kind: 'add', amount: 0, note: 'x' }).expect(400);
    await adjust({ kind: 'add', amount: 10_000.01, note: 'x' }).expect(400);
    await adjust({ kind: 'add', amount: 1.005, note: 'x' }).expect(400);
    await adjust({ kind: 'add', amount: 5, note: '   ' }).expect(400);
    await adjust({ kind: 'gift', amount: 5, note: 'x' }).expect(400);
    await adjust({ kind: 'add', amount: 5, note: 'x' }, adminId).expect(404);
    expect((await wallet()).balance).toBe(20);
  });

  it('"رصيد المحفظة" pays as much as it holds; cash pays the rest; the store, the admin and the customer see it', async () => {
    await adjust({ kind: 'add', amount: 70, note: 'هدية' }).expect(201);
    const quoted = await bill();
    expect(quoted).toMatchObject({ total: 200, walletBalance: 70 });

    // The balance moved since the screen loaded: the bill changed, nothing is taken.
    await place({ cartId: quoted.cartId, expectedTotal: 200, expectedWalletPaid: 50 })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('CHECKOUT_TOTAL_CHANGED'));
    expect((await wallet()).balance).toBe(70);

    const requestId = nextRequest();
    const placed = await place({ cartId: quoted.cartId, expectedTotal: 200, expectedWalletPaid: 70, requestId }).expect(201);
    expect(placed.body.order).toMatchObject({ total: 200, walletPaid: 70 });
    const id = placed.body.order.id;
    // The same tap again gives the order back and takes nothing more.
    await place({ cartId: quoted.cartId, expectedTotal: 200, expectedWalletPaid: 70, requestId }).expect(201);

    const after = await wallet();
    expect(after.balance).toBe(0);
    expect(after.entries[0]).toMatchObject({ kind: 'deduct', reason: 'order', amount: 70, note: '', orderCode: placed.body.order.code });
    expect(after.entries).toHaveLength(2);

    expect((await http().get(`/v1/me/orders/${id}`).set(customer).expect(200)).body).toMatchObject({ total: 200, walletPaid: 70 });
    expect((await http().get(`/v1/partner/orders/${id}`).set(partner).expect(200)).body).toMatchObject({ total: 200, walletPaid: 70 });
    expect((await http().get('/v1/admin/orders').set(admin).expect(200)).body[0]).toMatchObject({ id, walletPaid: 70 });
  });

  it('pays the whole order when it holds enough; with the switch off it takes nothing', async () => {
    await adjust({ kind: 'add', amount: 500, note: 'هدية' }).expect(201);
    const first = await bill();
    const paid = await place({ cartId: first.cartId, expectedTotal: 200, expectedWalletPaid: 200 }).expect(201);
    expect(paid.body.order.walletPaid).toBe(200);
    expect((await wallet()).balance).toBe(300);

    const second = await bill();
    const cash = await place({ cartId: second.cartId, expectedTotal: 200 }).expect(201);
    expect(cash.body.order.walletPaid).toBe(0);
    expect((await wallet()).balance).toBe(300);
  });

  it('a rejected order gives its wallet money back at once [Owner, 2026-11-26]', async () => {
    await adjust({ kind: 'add', amount: 50, note: 'هدية' }).expect(201);
    const quoted = await bill();
    const placed = await place({ cartId: quoted.cartId, expectedTotal: 200, expectedWalletPaid: 50 }).expect(201);
    expect((await wallet()).balance).toBe(0);
    await http().post(`/v1/partner/orders/${placed.body.order.id}/reject`).set(partner).expect(200);
    const after = await wallet();
    expect(after.balance).toBe(50);
    expect(after.entries[0]).toMatchObject({ kind: 'add', reason: 'refund', amount: 50, orderCode: placed.body.order.code });
  });

  it('the delivery man collects only the cash part; the wallet part is recorded on the order', async () => {
    await adjust({ kind: 'add', amount: 70, note: 'هدية' }).expect(201);
    const made = await http().post('/v1/admin/drivers').set(admin).send({ firstName: 'كريم', lastName: 'سعيد', phone: '01011111111' }).expect(201);
    const driver = { Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone: '01011111111', password: made.body.password }).expect(201)).body.accessToken}` };
    // A shift starting in 10 minutes, every day: he may start it now (30 minutes before).
    const at = (minutes: number) => CAIRO.format(new Date(Date.now() + minutes * 60_000));
    const schedule = Array.from({ length: 7 }, () => ({ start: at(10), end: at(250) }));
    await http().patch('/v1/admin/settings/drivers').set(admin).send({ schedule }).expect(200);
    await http().post('/v1/driver/shift/start').set(driver).expect(200);

    const quoted = await bill();
    const placed = await place({ cartId: quoted.cartId, expectedTotal: 200, expectedWalletPaid: 70 }).expect(201);
    const id = placed.body.order.id;
    await http().post(`/v1/partner/orders/${id}/accept`).set(partner).expect(200);

    const offers: DriverOffer[] = (await http().get('/v1/driver/offers').set(driver).expect(200)).body;
    expect(offers[0]).toMatchObject({ id, total: 130 });
    const taken = (await http().post(`/v1/driver/offers/${id}/accept`).set(driver).expect(200)).body;
    expect(taken).toMatchObject({ total: 130, walletPaid: 70 });
    expect((await http().get('/v1/driver/orders').set(driver).expect(200)).body[0]).toMatchObject({ id, total: 130 });
  });
});
