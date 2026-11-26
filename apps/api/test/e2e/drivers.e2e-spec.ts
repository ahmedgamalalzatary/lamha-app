import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { DRIVER_SOCKET_EVENTS, type DriverAccount, ORDER_SOCKET_EVENTS, type DriverOffer, type WeekSchedule } from '@tawsela/shared';
import { io, type Socket } from 'socket.io-client';
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

const CAIRO = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
/** Cairo's "HH:MM" this many minutes from now. */
const clock = (minutes: number) => CAIRO.format(new Date(Date.now() + minutes * 60_000));
/** Every day the same shift, starting `from` minutes from now and lasting 4 hours. */
const everyDay = (from: number): WeekSchedule => Array.from({ length: 7 }, () => ({ start: clock(from), end: clock(from + 240) }));

describe('delivery men: accounts, shifts, offers and steps (e2e, contract §10, §15.1 #5)', () => {
  let app: INestApplication<App>;
  let url: string;
  const http = () => request(app.getHttpServer());
  let admin: { Authorization: string };
  let customer: { Authorization: string };
  let partner: { Authorization: string };
  let store: number;
  let shawarma: number;
  let address: number;
  let requests = 0;
  const sockets: Socket[] = [];

  const signIn = async (phone: string) => ({
    Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone, password: PASSWORD }).expect(201)).body.accessToken}`,
  });

  /** A delivery man made by the admin, signed in. */
  async function newDriver(phone: string, firstName = 'كريم'): Promise<{ id: number; auth: { Authorization: string } }> {
    const res = await http().post('/v1/admin/drivers').set(admin).send({ firstName, lastName: 'سعيد', phone }).expect(201);
    const auth = {
      Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone, password: res.body.password }).expect(201)).body.accessToken}`,
    };
    return { id: res.body.account.id, auth };
  }

  const setWeek = (schedule: WeekSchedule) => http().patch('/v1/admin/settings/drivers').set(admin).send({ schedule }).expect(200);

  /** The customer orders 2 × شاورما فراخ (85); the store accepts it, so it is offered. */
  async function acceptedOrder(): Promise<number> {
    const { cart } = (await http().post('/v1/me/cart/lines').set(customer).send({ productId: shawarma, quantity: 2, optionIds: [], removedIngredientIds: [] }).expect(201)).body;
    await http().patch('/v1/me/cart').set(customer).send({ cartId: cart.id, mode: 'delivery', note: '' }).expect(200);
    const bill = (await http().post('/v1/me/checkout/quote').set(customer).send({ cartId: cart.id, addressId: address }).expect(200)).body;
    const requestId = `00000000-0000-4000-8000-${String(++requests).padStart(12, '0')}`;
    const placed = await http()
      .post('/v1/me/orders')
      .set(customer)
      .send({ addressId: address, cartId: bill.cartId, slot: null, expectedTotal: bill.total, requestId })
      .expect(201);
    const id = placed.body.order.id;
    await http().post(`/v1/partner/orders/${id}/accept`).set(partner).expect(200);
    return id;
  }

  async function connect(auth: { Authorization: string } | null): Promise<Socket> {
    const socket = io(url, { transports: ['websocket'], reconnection: false, auth: auth ? { token: auth.Authorization.slice(7) } : {} });
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('ready', () => resolve());
      socket.once('disconnect', () => reject(new Error('refused')));
      socket.once('connect_error', reject);
    });
    return socket;
  }

  const startShift = (auth: { Authorization: string }) => http().post('/v1/driver/shift/start').set(auth);
  const offers = async (auth: { Authorization: string }): Promise<DriverOffer[]> => (await http().get('/v1/driver/offers').set(auth).expect(200)).body;

  beforeAll(async () => {
    app = await createTestApp();
    await app.listen(0, '127.0.0.1');
    url = `http://127.0.0.1:${((app.getHttpServer() as unknown as Server).address() as AddressInfo).port}`;
  });
  beforeEach(async () => {
    await resetDb();
    await insertUser('admin', '01000000001', PASSWORD);
    await insertUser('customer', '01554459196', PASSWORD);
    admin = await signIn('01000000001');
    customer = await signIn('01554459196');
    const fayoum = (await http().post('/v1/admin/zones').set(admin).send({ name: 'الفيوم', polygon: FAYOUM, active: true }).expect(201)).body.id;
    store = await insertStore({ name: 'شاورما الساقية' });
    await sql("UPDATE stores SET zone_id = ?, lat = 29.3, lng = 30.82, payout_option = 'app_share', app_percent = 10 WHERE id = ?", [fayoum, store]);
    shawarma = await insertProduct(store, await insertCategory(store), 'شاورما فراخ', 85);
    await linkPartner(await insertUser('partner', '01000000002', PASSWORD), store);
    partner = await signIn('01000000002');
    address = (await http().post('/v1/me/addresses').set(customer).send(ADDRESS).expect(201)).body.id;
  });
  afterEach(() => {
    for (const s of sockets.splice(0)) s.disconnect();
  });
  afterAll(async () => {
    await app.close();
  });

  it('the admin makes, lists, resets and disables delivery men; only admins may', async () => {
    const made = await http().post('/v1/admin/drivers').set(admin).send({ firstName: 'كريم', lastName: 'سعيد', phone: '01011111111' }).expect(201);
    expect(made.body.password).toMatch(/\S{8,}/);
    expect(made.body.account).toMatchObject({ role: 'driver', firstName: 'كريم', onShift: false, blockedUntil: null, schedule: null });
    await http().post('/v1/admin/drivers').set(admin).send({ firstName: 'تاني', phone: '01011111111' }).expect(409);
    await http().post('/v1/auth/login').send({ phone: '01011111111', password: made.body.password }).expect(201);

    const id = made.body.account.id;
    const list: DriverAccount[] = (await http().get('/v1/admin/drivers?q=كريم').set(admin).expect(200)).body;
    expect(list.map((d) => d.id)).toEqual([id]);
    expect((await http().get('/v1/admin/drivers?q=nobody').set(admin).expect(200)).body).toEqual([]);

    const reset = (await http().post(`/v1/admin/drivers/${id}/password`).set(admin).expect(201)).body.password;
    await http().post('/v1/auth/login').send({ phone: '01011111111', password: made.body.password }).expect(401);
    await http().post('/v1/auth/login').send({ phone: '01011111111', password: reset }).expect(201);

    expect((await http().patch(`/v1/admin/drivers/${id}`).set(admin).send({ disabled: true }).expect(200)).body.disabled).toBe(true);
    await http().post('/v1/auth/login').send({ phone: '01011111111', password: reset }).expect(403);
    await http().post(`/v1/admin/drivers/${await insertUser('customer', '01022222222', PASSWORD)}/password`).set(admin).expect(404);

    await http().get('/v1/admin/drivers').set(partner).expect(403);
    await http().get('/v1/driver/shift').set(customer).expect(403);
    const actions = await sql<{ action: string }[]>('SELECT action FROM audit_log ORDER BY id');
    expect(actions.map((a) => a.action)).toEqual(expect.arrayContaining(['driver.create', 'driver.password', 'driver.disable']));
  });

  it('starts a shift from 30 minutes before it until 15 after; extends 3 times; ends', async () => {
    const { auth } = await newDriver('01011111111');
    const defaults = (await http().get('/v1/admin/settings/drivers').set(admin).expect(200)).body;
    expect(defaults).toMatchObject({ startEarlyMinutes: 30, startLateMinutes: 15, extendMinutes: 60, extendMax: 3, offerSeconds: 60, skipWarn: 2, skipBlock: 3, blockMinutes: 15 });
    expect(defaults.schedule).toEqual([null, null, null, null, null, null, null]);
    expect((await http().get('/v1/driver/shift').set(auth).expect(200)).body).toMatchObject({ status: 'off', shift: null, canStart: false });
    await startShift(auth).expect(409, /SHIFT_NOT_OPEN/);

    // In an hour: the button is still locked.
    await setWeek(everyDay(60));
    expect((await http().get('/v1/driver/shift').set(auth).expect(200)).body).toMatchObject({ status: 'off', canStart: false });
    await startShift(auth).expect(409);

    // In 20 minutes: it is open.
    const week = everyDay(20);
    await setWeek(week);
    const before = (await http().get('/v1/driver/shift').set(auth).expect(200)).body;
    expect(before).toMatchObject({ status: 'off', canStart: true, week });
    const on = (await startShift(auth).expect(200)).body;
    expect(on).toMatchObject({ status: 'on', extensionsLeft: 3, endsAt: before.shift.endsAt });

    const ends = new Date(on.endsAt).getTime();
    for (const left of [2, 1, 0]) {
      expect((await http().post('/v1/driver/shift/extend').set(auth).expect(200)).body.extensionsLeft).toBe(left);
    }
    const extended = (await http().get('/v1/driver/shift').set(auth).expect(200)).body;
    expect(new Date(extended.endsAt).getTime() - ends).toBe(3 * 60 * 60_000);
    await http().post('/v1/driver/shift/extend').set(auth).expect(409, /EXTEND_LIMIT/);

    // Ended: the shift he worked does not start again; the next is tomorrow's.
    expect((await http().post('/v1/driver/shift/end').set(auth).expect(200)).body).toMatchObject({ status: 'off', canStart: false });
    const next = (await http().get('/v1/driver/shift').set(auth).expect(200)).body;
    expect(new Date(next.shift.startsAt).getTime() - new Date(before.shift.startsAt).getTime()).toBe(24 * 60 * 60_000);
    await http().post('/v1/driver/shift/end').set(auth).expect(409, /NOT_ON_SHIFT/);
  });

  it('late: only the admin starts it; his own week replaces the global one', async () => {
    const late = await newDriver('01011111111');
    const own = await newDriver('01033333333', 'سامح');
    await setWeek(everyDay(-20));
    expect((await http().get('/v1/driver/shift').set(late.auth).expect(200)).body).toMatchObject({ status: 'off', canStart: false });
    await startShift(late.auth).expect(409);
    expect((await http().post(`/v1/admin/drivers/${late.id}/shift`).set(admin).expect(200)).body.onShift).toBe(true);
    expect((await http().get('/v1/driver/shift').set(late.auth).expect(200)).body.status).toBe('on');

    await http()
      .put(`/v1/admin/drivers/${own.id}/schedule`)
      .set(admin)
      .send({ schedule: [{ start: '25:00', end: '02:00' }] })
      .expect(400);
    expect((await http().put(`/v1/admin/drivers/${own.id}/schedule`).set(admin).send({ schedule: everyDay(10) }).expect(200)).body.schedule).toEqual(everyDay(10));
    await startShift(own.auth).expect(200);
    await http().put(`/v1/admin/drivers/${own.id}/schedule`).set(admin).send({ schedule: null }).expect(200);
    await http().put(`/v1/admin/drivers/${own.id}/schedule`).set(admin).send({}).expect(400);
    await http().patch('/v1/admin/settings/drivers').set(admin).send({ schedule: [null] }).expect(400);
  });

  it('every working man sees a new order at once; the first to accept takes it', async () => {
    await setWeek(everyDay(10));
    const a = await newDriver('01011111111');
    const b = await newDriver('01022222222', 'سامح');
    const off = await newDriver('01033333333', 'هاني');
    await startShift(a.auth).expect(200);
    await startShift(b.auth).expect(200);
    // The customer hears their own order's captain arrive (§8.8), never offers.
    const shopper = await connect(customer);
    const shopperHeard: string[] = [];
    shopper.onAny((event: string) => shopperHeard.push(event));
    const [sa, sb] = [await connect(a.auth), await connect(b.auth)];
    const heardA = new Promise((resolve) => sa.once(DRIVER_SOCKET_EVENTS.offer, resolve));
    const heardB = new Promise((resolve) => sb.once(DRIVER_SOCKET_EVENTS.offer, resolve));

    const id = await acceptedOrder();
    expect(await heardA).toEqual({ id });
    await heardB;
    const [offer] = await offers(a.auth);
    expect(offer).toMatchObject({ id, code: String(100000 + id), store: { name: 'شاورما الساقية', area: 'الفيوم' }, area: 'الفيوم', count: 2, itemsTotal: 170, storeFromDriver: 153 });
    expect(offer!.total).toBe(170 + offer!.deliveryFee);
    expect(JSON.stringify(offer)).not.toContain('01554459196');
    expect(await offers(off.auth)).toEqual([]);
    await http().post(`/v1/driver/offers/${id}/accept`).set(off.auth).expect(409, /NOT_ON_SHIFT/);

    const gone = new Promise((resolve) => sb.once(DRIVER_SOCKET_EVENTS.offerGone, resolve));
    const results = await Promise.all([a, b].map((d) => http().post(`/v1/driver/offers/${id}/accept`).set(d.auth)));
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    const winner = results[0]!.status === 200 ? a : b;
    expect(results.find((r) => r.status === 409)!.body.code).toBe('OFFER_TAKEN');
    expect(await gone).toEqual({ id });
    expect(await offers(a.auth)).toEqual([]);
    await expect.poll(() => shopperHeard).toContain(ORDER_SOCKET_EVENTS.status);
    expect(shopperHeard).not.toContain(DRIVER_SOCKET_EVENTS.offer);

    expect((await http().get(`/v1/partner/orders/${id}`).set(partner).expect(200)).body.driver).toEqual({ name: winner === a ? 'كريم سعيد' : 'سامح سعيد' });
    const [row] = (await http().get('/v1/admin/orders?status=preparing').set(admin).expect(200)).body;
    expect(row).toMatchObject({ hasDriver: true, driver: { id: winner.id }, deliveredBy: 'platform' });
  });

  it('skips in a row: a warning after 2, a 15-minute block after 3; an accept starts the count again', async () => {
    await setWeek(everyDay(10));
    const { auth } = await newDriver('01011111111');
    await startShift(auth).expect(200);
    const ids = [await acceptedOrder(), await acceptedOrder(), await acceptedOrder(), await acceptedOrder(), await acceptedOrder()];
    const skip = (id: number) => http().post(`/v1/driver/offers/${id}/skip`).set(auth).expect(200);

    expect((await skip(ids[0]!)).body).toMatchObject({ outcome: null, skipsInRow: 1 });
    expect((await skip(ids[0]!)).body).toMatchObject({ outcome: null, skipsInRow: 1 });
    expect((await offers(auth)).map((o) => o.id)).toEqual(ids.slice(1));
    await http().post(`/v1/driver/offers/${ids[1]}/accept`).set(auth).expect(200);
    expect((await skip(ids[2]!)).body).toMatchObject({ outcome: null, skipsInRow: 1 });
    expect((await skip(ids[3]!)).body).toMatchObject({ outcome: 'warn', skipsInRow: 2 });
    const blocked = (await skip(ids[4]!)).body;
    expect(blocked).toMatchObject({ outcome: 'block', skipsInRow: 0 });
    expect(new Date(blocked.blockedUntil).getTime() - Date.now()).toBeGreaterThan(14 * 60_000);

    const another = await acceptedOrder();
    expect(await offers(auth)).toEqual([]);
    await http().post(`/v1/driver/offers/${another}/accept`).set(auth).expect(409, /DRIVER_BLOCKED/);
    expect((await http().get('/v1/driver/shift').set(auth).expect(200)).body.blockedUntil).toBe(blocked.blockedUntil);
  });

  it('his steps: at the store, out once ready, delivered; only his own order', async () => {
    await setWeek(everyDay(10));
    const me = await newDriver('01011111111');
    const other = await newDriver('01022222222', 'سامح');
    await startShift(me.auth).expect(200);
    const id = await acceptedOrder();
    await http().post(`/v1/driver/offers/${id}/accept`).set(me.auth).expect(200);
    const socket = await connect(me.auth);

    const details = (await http().get(`/v1/driver/orders/${id}`).set(me.auth).expect(200)).body;
    expect(details).toMatchObject({
      status: 'preparing',
      atStore: false,
      store: { name: 'شاورما الساقية', area: 'الفيوم', location: { lat: 29.3, lng: 30.82 } },
      customer: { name: 'Test customer', phone: '01554459196', address: expect.stringContaining('شارع 2') },
      count: 2,
      itemsTotal: 170,
      storeFromDriver: 153,
    });
    expect(details.lines).toEqual([expect.objectContaining({ name: 'شاورما فراخ', quantity: 2, unitPrice: 85 })]);
    await http().get(`/v1/driver/orders/${id}`).set(other.auth).expect(404);
    await http().post(`/v1/driver/orders/${id}/arrived`).set(other.auth).expect(404);
    await http().post(`/v1/driver/orders/${id}/fly`).set(me.auth).expect(404);

    await http().post(`/v1/driver/orders/${id}/out`).set(me.auth).expect(409, /ORDER_STATUS/);
    expect((await http().post(`/v1/driver/orders/${id}/arrived`).set(me.auth).expect(200)).body.atStore).toBe(true);
    await http().post(`/v1/driver/orders/${id}/out`).set(me.auth).expect(409);
    const told = new Promise((resolve) => socket.once(DRIVER_SOCKET_EVENTS.order, resolve));
    await http().post(`/v1/partner/orders/${id}/ready`).set(partner).expect(200);
    expect(await told).toEqual({ id });
    expect((await http().post(`/v1/driver/orders/${id}/out`).set(me.auth).expect(200)).body.status).toBe('out_for_delivery');
    expect((await http().get('/v1/driver/orders').set(me.auth).expect(200)).body.map((o: { id: number }) => o.id)).toEqual([id]);
    expect((await http().post(`/v1/driver/orders/${id}/delivered`).set(me.auth).expect(200)).body.status).toBe('delivered');
    expect((await http().get('/v1/driver/orders').set(me.auth).expect(200)).body).toEqual([]);
    const events = await sql<{ status: string; by_user_id: number }[]>('SELECT status, by_user_id FROM order_events WHERE order_id = ? ORDER BY id', [id]);
    expect(events.slice(-2)).toEqual([
      { status: 'out_for_delivery', by_user_id: me.id },
      { status: 'delivered', by_user_id: me.id },
    ]);
  });

  it('the admin assigns an order; a store delivering itself sends it out and closes it', async () => {
    const off = await newDriver('01011111111');
    const id = await acceptedOrder();
    expect((await http().get('/v1/admin/orders?status=preparing').set(admin).expect(200)).body[0]).toMatchObject({ hasDriver: false, driver: null });
    await http().post(`/v1/admin/orders/${id}/driver`).set(admin).send({ driverId: await insertUser('customer', '01099999999', PASSWORD) }).expect(404);
    await http().post(`/v1/admin/orders/${id}/driver`).set(admin).send({ driverId: off.id }).expect(204);
    expect((await http().get(`/v1/driver/orders/${id}`).set(off.auth).expect(200)).body.id).toBe(id);
    expect((await http().get('/v1/admin/orders?status=preparing').set(admin).expect(200)).body[0].driver).toEqual({ id: off.id, name: 'كريم سعيد' });
    await http().post(`/v1/admin/orders/${id}/driver`).set(partner).send({ driverId: off.id }).expect(403);

    // Its own delivery: no offer, and the store's own steps.
    await sql("UPDATE stores SET delivered_by = 'store' WHERE id = ?", [store]);
    await setWeek(everyDay(10));
    await startShift(off.auth).expect(200);
    const own = await acceptedOrder();
    expect(await offers(off.auth)).toEqual([]);
    await http().post(`/v1/admin/orders/${own}/driver`).set(admin).send({ driverId: off.id }).expect(409);
    await http().post(`/v1/partner/orders/${own}/out`).set(partner).expect(409);
    await http().post(`/v1/partner/orders/${own}/ready`).set(partner).expect(200);
    expect((await http().get(`/v1/partner/orders/${own}`).set(partner).expect(200)).body.deliveredBy).toBe('store');
    expect((await http().post(`/v1/partner/orders/${own}/out`).set(partner).expect(200)).body.status).toBe('out_for_delivery');
    expect((await http().post(`/v1/partner/orders/${own}/delivered`).set(partner).expect(200)).body.status).toBe('delivered');
  });
});
