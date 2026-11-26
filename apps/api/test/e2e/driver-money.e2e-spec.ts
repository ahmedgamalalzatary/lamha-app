import type { INestApplication } from '@nestjs/common';
import { type AdminDriverMoney, type DriverHistory, type DriverMoney, type DriverPoints, deliveryFeeFor, type WeekSchedule } from '@tawsela/shared';
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
const ADDRESS = { type: 'apartment', building: 'مبنى 2', apartment: 'شقه 2', street: 'شارع 2', landmark: 'temp', phone: '01554459196', isDefault: false, lat: 29.3205, lng: 30.8364 };

const CAIRO = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const clock = (minutes: number) => CAIRO.format(new Date(Date.now() + minutes * 60_000));
/** Every day a 4-hour shift that started 10 minutes ago. */
const everyDay: WeekSchedule = Array.from({ length: 7 }, () => ({ start: clock(-10), end: clock(230) }));
/** Today in Cairo, "YYYY-MM-DD". */
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());

type Auth = { Authorization: string };

describe("the delivery man's money: earnings, history, speed points and fines (e2e, contract §10, §8.7)", () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let admin: Auth;
  let customer: Auth;
  let partner: Auth;
  let shawarma: number;
  let address: number;
  let requests = 0;

  const signIn = async (phone: string, password = PASSWORD): Promise<Auth> => ({
    Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone, password }).expect(201)).body.accessToken}`,
  });

  async function newDriver(phone: string): Promise<{ id: number; auth: Auth }> {
    const made = (await http().post('/v1/admin/drivers').set(admin).send({ firstName: 'كريم', lastName: 'سعيد', phone }).expect(201)).body;
    const auth = await signIn(phone, made.password);
    await http().post('/v1/driver/shift/start').set(auth).expect(200);
    return { id: made.account.id, auth };
  }

  /** The customer orders 1 × شاورما (85); the store accepts it and the delivery man takes it. */
  async function taken(driver: Auth): Promise<number> {
    const { cart } = (await http().post('/v1/me/cart/lines').set(customer).send({ productId: shawarma, quantity: 1, optionIds: [], removedIngredientIds: [] }).expect(201)).body;
    const bill = (await http().post('/v1/me/checkout/quote').set(customer).send({ cartId: cart.id, addressId: address }).expect(200)).body;
    const requestId = `00000000-0000-4000-8000-${String(++requests).padStart(12, '0')}`;
    const { order } = (await http().post('/v1/me/orders').set(customer).send({ cartId: cart.id, addressId: address, slot: null, expectedTotal: bill.total, requestId }).expect(201)).body;
    await http().post(`/v1/partner/orders/${order.id}/accept`).set(partner).expect(200);
    await http().post(`/v1/driver/offers/${order.id}/accept`).set(driver).expect(200);
    return order.id;
  }

  async function deliver(driver: Auth, id: number): Promise<void> {
    await http().post(`/v1/partner/orders/${id}/ready`).set(partner).expect(200);
    for (const step of ['arrived', 'out', 'delivered']) await http().post(`/v1/driver/orders/${id}/${step}`).set(driver).expect(200);
  }

  const distanceOf = async (id: number) => (await sql<{ km: string }[]>('SELECT distance_km AS km FROM orders WHERE id = ?', [id]))[0]!.km;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(async () => {
    await resetDb();
    await insertUser('admin', '01000000001', PASSWORD);
    await insertUser('customer', '01554459196', PASSWORD);
    admin = await signIn('01000000001');
    customer = await signIn('01554459196');
    const zone = (await http().post('/v1/admin/zones').set(admin).send({ name: 'الفيوم', polygon: FAYOUM, active: true }).expect(201)).body.id;
    const store = await insertStore({ name: 'شاورما الساقية' });
    await sql('UPDATE stores SET zone_id = ?, lat = 29.3, lng = 30.82 WHERE id = ?', [zone, store]);
    shawarma = await insertProduct(store, await insertCategory(store), 'شاورما', 85);
    await linkPartner(await insertUser('partner', '01000000002', PASSWORD), store);
    partner = await signIn('01000000002');
    address = (await http().post('/v1/me/addresses').set(customer).send(ADDRESS).expect(201)).body.id;
    await http().patch('/v1/admin/settings/drivers').set(admin).send({ schedule: everyDay }).expect(200);
  });

  it('he earns the fee, or his own rule; طلباتى lists his finished orders in the dates with the totals', async () => {
    const karim = await newDriver('01011111111');
    const sameh = await newDriver('01022222222');
    const own = { baseFee: 15, baseKm: 1, perKm: 4 };
    const account = (await http().put(`/v1/admin/drivers/${sameh.id}/fee`).set(admin).send({ fee: own }).expect(200)).body;
    expect(account.fee).toEqual(own);
    await http().put(`/v1/admin/drivers/${sameh.id}/fee`).set(admin).send({ fee: { baseFee: 15 } }).expect(400);

    const first = await taken(karim.auth);
    await deliver(karim.auth, first);
    const fee = (await sql<{ fee: string }[]>('SELECT delivery_fee AS fee FROM orders WHERE id = ?', [first]))[0]!.fee;
    const second = await taken(sameh.auth);
    await deliver(sameh.auth, second);
    const open = await taken(karim.auth);

    const range = `from=2026-01-01&to=${today()}`;
    const mine: DriverHistory = (await http().get(`/v1/driver/history?${range}`).set(karim.auth).expect(200)).body;
    expect(mine.orders).toEqual([
      expect.objectContaining({ id: first, code: String(100000 + first), status: 'delivered', store: { name: 'شاورما الساقية' }, count: 1, earning: Number(fee) }),
    ]);
    expect(mine).toMatchObject({ earnings: Number(fee), delivered: 1 });
    expect(mine.orders.map((o) => o.id)).not.toContain(open);

    const his: DriverHistory = (await http().get(`/v1/driver/history?${range}`).set(sameh.auth).expect(200)).body;
    expect(his.orders[0]).toMatchObject({ id: second, earning: deliveryFeeFor(Number(await distanceOf(second)), own) });

    expect((await http().get('/v1/driver/history?from=2025-01-01&to=2025-12-31').set(karim.auth).expect(200)).body).toEqual({ orders: [], earnings: 0, delivered: 0 });
    await http().get('/v1/driver/history?from=2026-02-30&to=2026-03-01').set(karim.auth).expect(400);
    await http().get(`/v1/driver/history?${range}`).set(customer).expect(403);
  });

  it('speed points by level once delivered; the admin pays them out in cash and the balance starts again', async () => {
    const karim = await newDriver('01011111111');
    const settings = (
      await http()
        .patch('/v1/admin/settings/drivers')
        .set(admin)
        .send({ speedLevels: [{ maxMinutesPerKm: 12, points: 2 }, { maxMinutesPerKm: 5, points: 3 }], pointValue: 2.5 })
        .expect(200)
    ).body;
    expect(settings).toMatchObject({ pointValue: 2.5, speedLevels: [{ maxMinutesPerKm: 12, points: 2 }, { maxMinutesPerKm: 5, points: 3 }] });
    await http().patch('/v1/admin/settings/drivers').set(admin).send({ speedLevels: [{ maxMinutesPerKm: 5, points: 1.5 }] }).expect(400);

    // Delivered at once: the fastest level.
    const fast = await taken(karim.auth);
    await deliver(karim.auth, fast);
    // Taken two hours ago: slower than every level.
    const slow = await taken(karim.auth);
    await sql('UPDATE orders SET taken_at = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 2 HOUR) WHERE id = ?', [slow]);
    await deliver(karim.auth, slow);

    const points: DriverPoints = (await http().get('/v1/driver/points').set(karim.auth).expect(200)).body;
    expect(points).toMatchObject({ balance: 3, value: 7.5, pointValue: 2.5 });
    expect(points.entries).toEqual([expect.objectContaining({ kind: 'order', points: 3, order: { id: fast, code: String(100000 + fast) } })]);

    const paid = (await http().post(`/v1/admin/drivers/${karim.id}/payouts`).set(admin).expect(201)).body;
    expect(paid).toEqual({ points: 3, value: 7.5 });
    await http().post(`/v1/admin/drivers/${karim.id}/payouts`).set(admin).expect(409);
    const after: DriverPoints = (await http().get('/v1/driver/points').set(karim.auth).expect(200)).body;
    expect(after).toMatchObject({ balance: 0, value: 0 });
    expect(after.entries[0]).toMatchObject({ kind: 'payout', points: 3, value: 7.5 });

    // Paid-out points still count in فواتيري.
    const money: DriverMoney = (await http().get('/v1/driver/money').set(karim.auth).expect(200)).body;
    expect(money.pointsCash).toBe(7.5);
  });

  it('the admin fines him with a reason; he is told and sees it in فواتيري, whose net takes it off', async () => {
    const karim = await newDriver('01011111111');
    const other = await newDriver('01022222222');
    const id = await taken(karim.auth);
    await deliver(karim.auth, id);
    const elsewhere = await taken(other.auth);

    await http().post(`/v1/admin/drivers/${karim.id}/fines`).set(admin).send({ amount: 0, reason: 'تأخير' }).expect(400);
    await http().post(`/v1/admin/drivers/${karim.id}/fines`).set(admin).send({ amount: 20, reason: 'تأخير', orderId: elsewhere }).expect(404);
    await http().post(`/v1/admin/drivers/${karim.id}/fines`).set(karim.auth).send({ amount: 20, reason: 'تأخير' }).expect(403);
    const fine = (await http().post(`/v1/admin/drivers/${karim.id}/fines`).set(admin).send({ amount: 20, reason: 'تأخير في التوصيل', orderId: id }).expect(201)).body;
    expect(fine).toMatchObject({ amount: 20, reason: 'تأخير في التوصيل', order: { id, code: String(100000 + id) } });
    await http().post(`/v1/admin/drivers/${karim.id}/fines`).set(admin).send({ amount: 5.5, reason: 'الزي' }).expect(201);

    await vi.waitFor(async () => {
      const notes = (await http().get('/v1/me/notifications').set(karim.auth).expect(200)).body.items;
      const fines = notes.filter((n: { kind: string }) => n.kind === 'driver_fine');
      expect(fines.map((n: { body: string }) => n.body)).toEqual(['تم خصم 5.50 ج.م: الزي', 'تم خصم 20.00 ج.م: تأخير في التوصيل']);
    });

    const money: DriverMoney = (await http().get('/v1/driver/money').set(karim.auth).expect(200)).body;
    expect(money).toMatchObject({ fines: 25.5, pointsCash: 0 });
    expect(money.net).toBe(Math.round((money.earnings - 25.5) * 100) / 100);
    expect(money.list.map((f) => f.reason)).toEqual(['الزي', 'تأخير في التوصيل']);

    const seen: AdminDriverMoney = (await http().get(`/v1/admin/drivers/${karim.id}/money`).set(admin).expect(200)).body;
    expect(seen).toMatchObject({ fines: 25.5, net: money.net, points: { balance: 0, value: 0 } });

    await http().delete(`/v1/admin/drivers/${other.id}/fines/${fine.id}`).set(admin).expect(404);
    await http().delete(`/v1/admin/drivers/${karim.id}/fines/${fine.id}`).set(admin).expect(204);
    expect((await http().get('/v1/driver/money').set(karim.auth).expect(200)).body.fines).toBe(5.5);
    const actions = await sql<{ action: string }[]>("SELECT action FROM audit_log WHERE action LIKE 'driver.f%' ORDER BY id");
    expect(actions.map((a) => a.action)).toEqual(['driver.fine', 'driver.fine', 'driver.fine.delete']);
  });

  it('he complains about one of his orders from طلباتى, or suggests; the admin sees it is from a delivery man', async () => {
    const karim = await newDriver('01011111111');
    const other = await newDriver('01022222222');
    const id = await taken(karim.auth);
    const elsewhere = await taken(other.auth);
    await http().post('/v1/me/tickets').set(karim.auth).send({ type: 'complaint', orderId: elsewhere, text: 'x' }).expect(404);
    await http().post('/v1/me/tickets').set(karim.auth).send({ type: 'complaint', orderId: id, text: 'المحل اتأخر ساعة' }).expect(201);
    await http().post('/v1/me/tickets').set(karim.auth).send({ type: 'suggestion', text: 'زرار اتصال بالمحل' }).expect(201);
    await http().post('/v1/me/tickets').set(partner).send({ type: 'suggestion', text: 'x' }).expect(403);
    const tickets = (await http().get('/v1/admin/tickets').set(admin).expect(200)).body;
    expect(tickets[1]).toMatchObject({ type: 'complaint', customer: { name: 'كريم سعيد', role: 'driver' }, order: { id } });
  });
});
