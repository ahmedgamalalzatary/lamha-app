import type { INestApplication } from '@nestjs/common';
import type { WeekSchedule } from '@tawsela/shared';
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
const ADDRESS = { type: 'apartment', building: 'مبنى 2', apartment: 'شقه 2', street: 'شارع 2', landmark: 'temp', phone: '01554459196', isDefault: false, lat: 29.3205, lng: 30.8364 };
const NOTE = 'استلم شنطة من محل الخياطة في شارع الحرية ووصلها للبيت';

const CAIRO = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const clock = (minutes: number) => CAIRO.format(new Date(Date.now() + minutes * 60_000));
/** Every day a 4-hour shift that started 10 minutes ago. */
const everyDay: WeekSchedule = Array.from({ length: 7 }, () => ({ start: clock(-10), end: clock(230) }));

describe('send anything: the "اطلب دليفري" store (e2e, contract §8.12)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  type Auth = { Authorization: string };
  let admin: Auth;
  let customer: Auth;
  let courier: number;
  let service: number;
  let address: number;
  const signIn = async (phone: string, password = PASSWORD): Promise<Auth> => ({
    Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone, password }).expect(201)).body.accessToken}`,
  });

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
    courier = await insertStore({ name: 'اطلب دليفري', vertical: 'courier' });
    await sql('UPDATE stores SET zone_id = ?, lat = 29.3, lng = 30.82, minimum_order = 0 WHERE id = ?', [zone, courier]);
    service = await insertProduct(courier, await insertCategory(courier, 'موتوسيكل'), 'اطلب دليفري', 1);
    address = (await http().post('/v1/me/addresses').set(customer).send(ADDRESS).expect(201)).body.id;
  });

  it('the order skips the store, goes straight to the working delivery men with its note, and he sees it on his order', async () => {
    await http().patch('/v1/admin/settings/drivers').set(admin).send({ schedule: everyDay }).expect(200);
    const made = (await http().post('/v1/admin/drivers').set(admin).send({ firstName: 'كريم', lastName: 'سعيد', phone: '01011111111' }).expect(201)).body;
    const driver = await signIn('01011111111', made.password);
    await http().post('/v1/driver/shift/start').set(driver).expect(200);

    const { cart } = (await http().post('/v1/me/cart/lines').set(customer).send({ productId: service, quantity: 1, optionIds: [], removedIngredientIds: [] }).expect(201)).body;
    await http().patch('/v1/me/cart').set(customer).send({ cartId: cart.id, note: NOTE }).expect(200);
    const bill = (await http().post('/v1/me/checkout/quote').set(customer).send({ cartId: cart.id, addressId: address }).expect(200)).body;
    expect(bill).toMatchObject({ itemsTotal: 1, deliveryFee: 30, total: 31 });
    const { order } = (await http().post('/v1/me/orders').set(customer)
      .send({ cartId: cart.id, addressId: address, slot: null, expectedTotal: bill.total, requestId: '00000000-0000-4000-8000-000000000001' }).expect(201)).body;
    expect(order.status).toBe('ready');

    const [offer] = (await http().get('/v1/driver/offers').set(driver).expect(200)).body;
    expect(offer).toMatchObject({ id: order.id, store: { name: 'اطلب دليفري' }, note: NOTE, total: 31 });
    const taken = (await http().post(`/v1/driver/offers/${order.id}/accept`).set(driver).expect(200)).body;
    expect(taken).toMatchObject({ id: order.id, status: 'ready', note: NOTE, lines: [{ name: 'اطلب دليفري', quantity: 1 }] });
    expect((await http().get('/v1/admin/orders').set(admin).expect(200)).body[0]).toMatchObject({ id: order.id, note: NOTE });
  });

  it('an order of any other store still waits for the store to accept it', async () => {
    const shop = await insertStore({ name: 'شاورما الساقية' });
    await sql('UPDATE stores SET zone_id = (SELECT id FROM zones LIMIT 1), lat = 29.3, lng = 30.82 WHERE id = ?', [shop]);
    const productId = await insertProduct(shop, await insertCategory(shop), 'شاورما', 85);
    const { cart } = (await http().post('/v1/me/cart/lines').set(customer).send({ productId, quantity: 1, optionIds: [], removedIngredientIds: [] }).expect(201)).body;
    const bill = (await http().post('/v1/me/checkout/quote').set(customer).send({ cartId: cart.id, addressId: address }).expect(200)).body;
    const { order } = (await http().post('/v1/me/orders').set(customer)
      .send({ cartId: cart.id, addressId: address, slot: null, expectedTotal: bill.total, requestId: '00000000-0000-4000-8000-000000000002' }).expect(201)).body;
    expect(order.status).toBe('pending_review');
  });
});
