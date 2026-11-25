import type { INestApplication } from '@nestjs/common';
import type { ResultSetHeader } from 'mysql2/promise';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp, pushOutbox } from '../utils/app.js';
import { insertCategory, insertProduct, insertStore, linkPartner } from '../utils/catalog.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

const PASSWORD = 'secret123';
const FAYOUM = [
  { lat: 29.25, lng: 30.78 },
  { lat: 29.36, lng: 30.78 },
  { lat: 29.36, lng: 30.9 },
  { lat: 29.25, lng: 30.9 },
];
const ADDRESS = { type: 'apartment', building: 'مبنى 2', apartment: 'شقه 2', floor: '3', street: 'شارع 2', landmark: 'temp', phone: '01554459196', isDefault: false };
type Auth = { Authorization: string };

describe('notifications and push (e2e, contract §8.14, §9, §10, §11)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let admin: Auth;
  let customer: Auth;
  let partner: Auth;
  let customerId: number;
  let store: number;
  let product: number;
  let fayoum: number;
  let address: number;
  let requests = 0;

  const signIn = async (phone: string) => ({
    Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone, password: PASSWORD }).expect(201)).body.accessToken}`,
  });
  const register = (token: string, as: Auth) => http().post('/v1/me/push-tokens').set(as).send({ token });
  const pushedTo = (token: string) => pushOutbox.filter((m) => m.to === token);
  const list = async (as: Auth) => (await http().get('/v1/me/notifications').set(as).expect(200)).body;

  async function placeOrder(): Promise<number> {
    await http().post('/v1/me/cart/lines').set(customer).send({ productId: product, quantity: 2, optionIds: [], removedIngredientIds: [] }).expect(201);
    const bill = (await http().post('/v1/me/checkout/quote').set(customer).send({ addressId: address }).expect(200)).body;
    const requestId = `00000000-0000-4000-8000-${String(++requests).padStart(12, '0')}`;
    return (
      await http().post('/v1/me/orders').set(customer).send({ addressId: address, cartId: bill.cartId, slot: null, expectedTotal: bill.total, requestId }).expect(201)
    ).body.order.id;
  }

  /** A delivery man with a shift running now, straight in the tables. */
  async function driverOnShift(phone: string): Promise<{ id: number; auth: Auth }> {
    const id = await insertUser('driver', phone, PASSWORD);
    await sql('INSERT INTO drivers (user_id) VALUES (?)', [id]);
    const now = Date.now();
    await sql('INSERT INTO shifts (driver_id, starts_at, ends_at, started_at) VALUES (?, ?, ?, ?)', [id, new Date(now - 3600_000), new Date(now + 3 * 3600_000), new Date(now)]);
    return { id, auth: await signIn(phone) };
  }

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    pushOutbox.length = 0;
    await resetDb();
    await insertUser('admin', '01000000001', PASSWORD);
    customerId = await insertUser('customer', '01554459196', PASSWORD);
    admin = await signIn('01000000001');
    customer = await signIn('01554459196');
    fayoum = (await http().post('/v1/admin/zones').set(admin).send({ name: 'الفيوم', polygon: FAYOUM, active: true }).expect(201)).body.id;
    store = await insertStore({ name: 'بطاطس & دوريتوس' });
    await sql('UPDATE stores SET zone_id = ?, lat = 29.3, lng = 30.82 WHERE id = ?', [fayoum, store]);
    product = await insertProduct(store, await insertCategory(store), 'شاورما فراخ', 85);
    const p = await insertUser('partner', '01000000002', PASSWORD);
    await linkPartner(p, store);
    partner = await signIn('01000000002');
    address = (await http().post('/v1/me/addresses').set(customer).send({ ...ADDRESS, lat: 29.3205, lng: 30.8364 }).expect(201)).body.id;
  });
  afterAll(async () => {
    await app.close();
  });

  it('keeps one Expo token per phone, moving it to whoever signed in last; removes it on sign-out', async () => {
    await register('fcm-token', customer).expect(400);
    await register('ExponentPushToken[aaa]', customer).expect(204);
    await register('ExponentPushToken[aaa]', customer).expect(204);
    await register('ExponentPushToken[aaa]', partner).expect(204);
    expect(await sql('SELECT user_id FROM push_tokens')).toEqual([{ user_id: (await sql<{ id: number }[]>("SELECT id FROM users WHERE phone = '01000000002'"))[0]!.id }]);
    await http().delete('/v1/me/push-tokens').set(customer).send({ token: 'ExponentPushToken[aaa]' }).expect(204);
    expect(await sql('SELECT id FROM push_tokens')).toHaveLength(1);
    await http().delete('/v1/me/push-tokens').set(partner).send({ token: 'ExponentPushToken[aaa]' }).expect(204);
    expect(await sql('SELECT id FROM push_tokens')).toHaveLength(0);
  });

  it('signing out with the phone\'s token takes the token back, even if the app forgot it was sent', async () => {
    const login = (await http().post('/v1/auth/login').send({ phone: '01554459196', password: PASSWORD }).expect(201)).body;
    await register('ExponentPushToken[shared-phone]', { Authorization: `Bearer ${login.accessToken}` }).expect(204);
    await register('ExponentPushToken[other-phone]', partner).expect(204);
    await http().post('/v1/auth/logout').send({ refreshToken: login.refreshToken, pushToken: 'not a token' }).expect(400);
    // Another account's phone is never touched by this sign-out.
    await http().post('/v1/auth/logout').send({ refreshToken: login.refreshToken, pushToken: 'ExponentPushToken[other-phone]' }).expect(204);
    expect(await sql('SELECT token FROM push_tokens ORDER BY token')).toEqual([{ token: 'ExponentPushToken[other-phone]' }, { token: 'ExponentPushToken[shared-phone]' }]);

    const again = (await http().post('/v1/auth/login').send({ phone: '01554459196', password: PASSWORD }).expect(201)).body;
    await http().post('/v1/auth/logout').send({ refreshToken: again.refreshToken, pushToken: 'ExponentPushToken[shared-phone]' }).expect(204);
    expect(await sql('SELECT token FROM push_tokens')).toEqual([{ token: 'ExponentPushToken[other-phone]' }]);
  });

  it('the store hears of a new order and the customer of each step they care about, in الإشعارات too', async () => {
    await register('ExponentPushToken[customer]', customer).expect(204);
    await register('ExponentPushToken[store]', partner).expect(204);
    const id = await placeOrder();
    const code = String(100000 + id);
    await expect.poll(() => pushedTo('ExponentPushToken[store]')).toHaveLength(1);
    expect(pushedTo('ExponentPushToken[store]')[0]).toMatchObject({ title: 'طلب جديد', body: `وصلك طلب جديد #${code}`, data: { path: `/partner-order/${id}` } });
    expect((await list(partner)).items[0]).toMatchObject({ kind: 'new_order', path: `/partner-order/${id}`, read: false });

    await http().post(`/v1/partner/orders/${id}/accept`).set(partner).expect(200);
    await http().post(`/v1/partner/orders/${id}/ready`).set(partner).expect(200);
    await expect.poll(() => pushedTo('ExponentPushToken[customer]')).toHaveLength(1);
    expect(pushedTo('ExponentPushToken[customer]')[0]).toMatchObject({ title: 'تم قبول طلبك', data: { path: `/order/${id}` } });

    const mine = await list(customer);
    expect(mine.unread).toBe(1);
    expect(mine.items).toMatchObject([{ kind: 'order_accepted', title: 'تم قبول طلبك', body: `طلبك #${code} قيد التجهيز الآن`, path: `/order/${id}`, read: false }]);
    await http().post('/v1/me/notifications/read').set(customer).expect(204);
    expect(await list(customer)).toMatchObject({ unread: 0, items: [{ read: true }] });
  });

  it('"تفعيل الإشعار" off stops the pushes but الإشعارات still fills; the language follows the account', async () => {
    await register('ExponentPushToken[customer]', customer).expect(204);
    expect((await http().patch('/v1/me').set(customer).send({ notificationsEnabled: false }).expect(200)).body.notificationsEnabled).toBe(false);
    const id = await placeOrder();
    await http().post(`/v1/partner/orders/${id}/reject`).set(partner).expect(200);
    await expect.poll(async () => (await list(customer)).items.length).toBe(1);
    expect(pushedTo('ExponentPushToken[customer]')).toEqual([]);

    await http().patch('/v1/me').set(customer).send({ notificationsEnabled: true, locale: 'en' }).expect(200);
    const second = await placeOrder();
    await http().post(`/v1/partner/orders/${second}/accept`).set(partner).expect(200);
    await expect.poll(() => pushedTo('ExponentPushToken[customer]')).toHaveLength(1);
    expect(pushedTo('ExponentPushToken[customer]')[0]!.title).toBe('Your order was accepted');
  });

  it('a new offer pushes every working delivery man (not kept); his order ready is pushed and kept', async () => {
    const a = await driverOnShift('01011111111');
    const b = await driverOnShift('01022222222');
    const off = await insertUser('driver', '01033333333', PASSWORD);
    await sql('INSERT INTO drivers (user_id) VALUES (?)', [off]);
    const offAuth = await signIn('01033333333');
    await register('ExponentPushToken[a]', a.auth).expect(204);
    await register('ExponentPushToken[b]', b.auth).expect(204);
    await register('ExponentPushToken[off]', offAuth).expect(204);
    await sql('UPDATE drivers SET blocked_until = ? WHERE user_id = ?', [new Date(Date.now() + 600_000), b.id]);

    const id = await placeOrder();
    await http().post(`/v1/partner/orders/${id}/accept`).set(partner).expect(200);
    await expect.poll(() => pushedTo('ExponentPushToken[a]')).toHaveLength(1);
    expect(pushedTo('ExponentPushToken[a]')[0]).toMatchObject({ title: 'طلب جديد متاح', data: { path: '/driver' } });
    expect(pushedTo('ExponentPushToken[b]')).toEqual([]);
    expect(pushedTo('ExponentPushToken[off]')).toEqual([]);
    expect((await list(a.auth)).items).toEqual([]);

    await http().post(`/v1/driver/offers/${id}/accept`).set(a.auth).expect(200);
    await http().post(`/v1/partner/orders/${id}/ready`).set(partner).expect(200);
    await expect.poll(() => pushedTo('ExponentPushToken[a]')).toHaveLength(2);
    expect(pushedTo('ExponentPushToken[a]')[1]).toMatchObject({ title: 'الطلب جاهز', data: { path: `/driver-order/${id}` } });
    expect((await list(a.auth)).items).toMatchObject([{ kind: 'order_ready' }]);
  });

  it('a removed app\'s token is dropped when Expo says DeviceNotRegistered', async () => {
    await register('ExponentPushToken[gone-1]', customer).expect(204);
    const id = await placeOrder();
    await http().post(`/v1/partner/orders/${id}/accept`).set(partner).expect(200);
    await expect.poll(async () => sql<unknown[]>('SELECT id FROM push_tokens')).toHaveLength(0);
  });

  it('الإشعارات التفاعلية: the admin sends to every customer or one zone\'s, at once', async () => {
    const other = await insertUser('customer', '01100000001', PASSWORD);
    await register('ExponentPushToken[customer]', customer).expect(204);
    await register('ExponentPushToken[other]', await signIn('01100000001')).expect(204);
    await register('ExponentPushToken[store]', partner).expect(204);
    const send = (body: object, as = admin) => http().post('/v1/admin/campaigns').set(as).send(body);
    await send({ title: 'خصم', body: 'x', zoneId: null }, customer).expect(403);
    await send({ title: '', body: 'x', zoneId: null }).expect(400);
    await send({ title: 'خصم', body: 'x', zoneId: 99999 }).expect(404);

    const zone = await send({ title: 'خصم 20%', body: 'على كل المطاعم النهارده', zoneId: fayoum }).expect(201);
    expect(zone.body).toMatchObject({ recipients: 1, zone: { id: fayoum, name: 'الفيوم' }, title: 'خصم 20%' });
    // Kept in الإشعارات before the answer, not after it.
    expect(await sql("SELECT COUNT(*) AS n FROM notifications WHERE kind = 'campaign'")).toEqual([{ n: 1 }]);
    await expect.poll(() => pushedTo('ExponentPushToken[customer]')).toHaveLength(1);
    expect(pushedTo('ExponentPushToken[customer]')[0]).toMatchObject({ title: 'خصم 20%', body: 'على كل المطاعم النهارده', data: { path: null } });
    expect(pushedTo('ExponentPushToken[other]')).toEqual([]);

    expect((await send({ title: 'أهلاً', body: 'جرب توصيلة', zoneId: null }).expect(201)).body.recipients).toBe(2);
    await expect.poll(() => pushedTo('ExponentPushToken[other]')).toHaveLength(1);
    expect(pushedTo('ExponentPushToken[store]')).toEqual([]);
    expect((await list(customer)).items.map((n: { kind: string }) => n.kind)).toEqual(['campaign', 'campaign']);
    expect(await sql('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?', [other])).toEqual([{ n: 1 }]);

    const sent = (await http().get('/v1/admin/campaigns').set(admin).expect(200)).body;
    expect(sent.map((c: { title: string }) => c.title)).toEqual(['أهلاً', 'خصم 20%']);
    const log = (await http().get('/v1/admin/audit').set(admin).expect(200)).body.entries;
    expect(log[0]).toMatchObject({ action: 'campaign.send', target: { type: 'campaign', name: 'أهلاً' } });
  });

  it('a deleted or disabled account gets nothing', async () => {
    await register('ExponentPushToken[customer]', customer).expect(204);
    await sql('UPDATE users SET disabled_at = NOW() WHERE id = ?', [customerId]);
    await http().post('/v1/admin/campaigns').set(admin).send({ title: 'x', body: 'y', zoneId: null }).expect(201);
    expect(pushedTo('ExponentPushToken[customer]')).toEqual([]);
  });

  it('pages الإشعارات, newest first, and only one\'s own', async () => {
    const insert = (title: string) =>
      sql<ResultSetHeader>("INSERT INTO notifications (user_id, kind, title, body) VALUES (?, 'campaign', ?, 'b')", [customerId, title]);
    for (let i = 1; i <= 3; i++) await insert(`n${i}`);
    expect((await list(customer)).items.map((n: { title: string }) => n.title)).toEqual(['n3', 'n2', 'n1']);
    expect((await list(partner)).items).toEqual([]);
    const page = (await http().get('/v1/me/notifications?limit=2').set(customer).expect(200)).body.items;
    expect(page).toHaveLength(2);
    const next = (await http().get(`/v1/me/notifications?limit=2&before=${page[1].id}`).set(customer).expect(200)).body.items;
    expect(next.map((n: { title: string }) => n.title)).toEqual(['n1']);
  });
});
