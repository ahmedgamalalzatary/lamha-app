import type { INestApplication } from '@nestjs/common';
import type { ResultSetHeader } from 'mysql2/promise';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from '../utils/app.js';
import { insertCategory, insertProduct, insertStore } from '../utils/catalog.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

const PASSWORD = 'secret123';
type Auth = { Authorization: string };

describe('ratings, complaints, suggestions and contact numbers (e2e, contract §8.8, §8.14)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let admin: Auth;
  let customer: Auth;
  let other: Auth;
  let customerId: number;
  let store: number;
  let product: number;

  const signIn = async (phone: string) => ({
    Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone, password: PASSWORD }).expect(201)).body.accessToken}`,
  });

  /** An order straight in the table, at the status the test needs. */
  async function insertOrder(status: string, ownerId = customerId, createdAt = new Date()): Promise<number> {
    const res = await sql<ResultSetHeader>(
      `INSERT INTO orders (customer_id, store_id, request_id, status, mode, note, items_total, delivery_fee, total, payout_option, app_percent, app_share, store_gets, store_from_driver, created_at)
       VALUES (?, ?, UUID(), ?, 'delivery', '', 170, 30, 200, 'app_share', 10, 17, 153, 153, ?)`,
      [ownerId, store, status, createdAt],
    );
    await sql("INSERT INTO order_lines (order_id, product_id, name, options, removed_ingredients, unit_price, quantity) VALUES (?, ?, 'شاورما فراخ', '[]', '[]', 85, 2)", [
      res.insertId,
      product,
    ]);
    return res.insertId;
  }

  const rate = (id: number, body: object, as = customer) => http().post(`/v1/me/orders/${id}/rating`).set(as).send(body);
  const prompt = async (as = customer) => (await http().get('/v1/me/rate-prompt').set(as).expect(200)).body.order;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb();
    await insertUser('admin', '01000000001', PASSWORD);
    customerId = await insertUser('customer', '01554459196', PASSWORD);
    await insertUser('customer', '01100000001', PASSWORD);
    admin = await signIn('01000000001');
    customer = await signIn('01554459196');
    other = await signIn('01100000001');
    store = await insertStore({ name: 'بطاطس & دوريتوس' });
    product = await insertProduct(store, await insertCategory(store), 'شاورما فراخ', 85);
  });
  afterAll(async () => {
    await app.close();
  });

  it('rates a delivered order once: stars, chips that fit the stars and an optional text', async () => {
    const id = await insertOrder('delivered');
    await rate(id, { stars: 2, tags: [], text: '' }).expect(400);
    await rate(id, { stars: 5, tags: ['wrong_order'], text: '' }).expect(400);
    await rate(id, { stars: 6, tags: [], text: '' }).expect(400);
    await rate(id, { stars: 1, tags: ['missing_item', 'not_hot'], text: 'ناقص البطاطس' }, other).expect(404);
    await rate(id, { stars: 1, tags: ['missing_item', 'not_hot'], text: 'ناقص البطاطس' }).expect(201);
    await rate(id, { stars: 5, tags: [], text: '' })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('ALREADY_RATED'));
    expect((await http().get(`/v1/me/orders/${id}`).set(customer).expect(200)).body.rating).toEqual({ stars: 1 });

    const running = await insertOrder('preparing');
    await rate(running, { stars: 5, tags: [], text: '' })
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('ORDER_STATUS'));
    expect((await http().get(`/v1/me/orders/${running}`).set(customer).expect(200)).body.rating).toBeNull();
  });

  it('the store\'s stars become the average of its ratings, shown in the lists instead of "جديد"', async () => {
    const store1 = async () => (await http().get(`/v1/catalog/stores/${store}`).set(customer).expect(200)).body;
    expect(await store1()).toMatchObject({ rating: null, ratingCount: 0 });
    await rate(await insertOrder('delivered'), { stars: 5, tags: ['great_taste'], text: '' }).expect(201);
    await rate(await insertOrder('delivered'), { stars: 4, tags: [], text: '' }).expect(201);
    await rate(await insertOrder('delivered'), { stars: 2, tags: ['bad_taste'], text: '' }).expect(201);
    expect(await store1()).toMatchObject({ rating: 3.67, ratingCount: 3 });
  });

  it('asks once, when the app opens, for the latest delivered order not yet rated; ✕ stops it', async () => {
    expect(await prompt()).toBeNull();
    await insertOrder('delivered', customerId, new Date(Date.now() - 4 * 24 * 3600_000));
    await insertOrder('out_for_delivery');
    expect(await prompt()).toBeNull();
    const id = await insertOrder('delivered');
    expect(await prompt()).toEqual({ id, code: String(100000 + id), store: { name: 'بطاطس & دوريتوس', logo: null } });
    expect(await prompt(other)).toBeNull();

    await http().post(`/v1/me/orders/${id}/rating/skip`).set(other).expect(404);
    await http().post(`/v1/me/orders/${id}/rating/skip`).set(customer).expect(204);
    expect(await prompt()).toBeNull();
    // Skipping the popup still leaves "قيّم طلبك" in the order's details.
    await rate(id, { stars: 4, tags: [], text: '' }).expect(201);
  });

  it('a complaint (general or about a past order) and a suggestion reach الشكاوى والاقتراحات; the admin marks one done', async () => {
    const id = await insertOrder('delivered');
    const send = (body: object, as = customer) => http().post('/v1/me/tickets').set(as).send(body);
    await send({ type: 'complaint', text: '   ' }).expect(400);
    await send({ type: 'praise', text: 'x' }).expect(400);
    await send({ type: 'complaint', orderId: id, text: 'وصل بارد' }, other).expect(404);
    await send({ type: 'suggestion', orderId: id, text: 'x' }).expect(400);
    await send({ type: 'complaint', orderId: id, text: 'وصل بارد' }).expect(201);
    await send({ type: 'complaint', text: 'التطبيق بطيء' }).expect(201);
    await send({ type: 'suggestion', text: 'ضيفوا الدفع بالفيزا' }).expect(201);
    await http().get('/v1/admin/tickets').set(customer).expect(403);

    const all = (await http().get('/v1/admin/tickets').set(admin).expect(200)).body;
    expect(all).toHaveLength(3);
    expect(all[2]).toMatchObject({
      type: 'complaint',
      status: 'open',
      text: 'وصل بارد',
      customer: { id: customerId, phone: '01554459196' },
      order: { id, code: String(100000 + id), store: 'بطاطس & دوريتوس' },
      doneAt: null,
    });
    expect((await http().get('/v1/admin/tickets?type=suggestion').set(admin).expect(200)).body).toMatchObject([{ text: 'ضيفوا الدفع بالفيزا', order: null }]);

    const done = await http().patch(`/v1/admin/tickets/${all[2].id}`).set(admin).send({ status: 'done' }).expect(200);
    expect(done.body.status).toBe('done');
    expect(done.body.doneAt).not.toBeNull();
    expect((await http().get('/v1/admin/tickets?status=open').set(admin).expect(200)).body).toHaveLength(2);
    const log = (await http().get('/v1/admin/audit').set(admin).expect(200)).body.entries;
    expect(log[0]).toMatchObject({ action: 'ticket.done', target: { type: 'ticket', id: all[2].id } });
  });

  it('the admin lists ratings, newest first, with the order, store and customer', async () => {
    const id = await insertOrder('delivered');
    await rate(id, { stars: 1, tags: ['wrong_order'], text: 'طلب حد تاني' }).expect(201);
    await http().get('/v1/admin/ratings').set(customer).expect(403);
    expect((await http().get('/v1/admin/ratings').set(admin).expect(200)).body).toMatchObject([
      {
        stars: 1,
        tags: ['wrong_order'],
        text: 'طلب حد تاني',
        customer: { id: customerId, phone: '01554459196' },
        order: { id, code: String(100000 + id) },
        store: { id: store, name: 'بطاطس & دوريتوس' },
      },
    ]);
  });

  it('"تواصل معنا" shows the numbers the admin keeps', async () => {
    expect((await http().get('/v1/support/phones').set(customer).expect(200)).body).toEqual([]);
    const put = (phones: object[], as = admin) => http().put('/v1/admin/settings/support-phones').set(as).send({ phones });
    await put([{ label: 'هاتف 1', phone: '01021846434' }], customer).expect(403);
    await put([{ label: '', phone: '01021846434' }]).expect(400);
    await put([{ label: 'هاتف 1', phone: 'abc' }]).expect(400);
    await put([
      { label: 'هاتف 1', phone: '01021846434' },
      { label: 'واتساب', phone: '01100000009' },
    ]).expect(200);
    expect((await http().get('/v1/support/phones').set(customer).expect(200)).body).toEqual([
      { label: 'هاتف 1', phone: '01021846434' },
      { label: 'واتساب', phone: '01100000009' },
    ]);
    await put([{ label: 'هاتف 1', phone: '01021846435' }]).expect(200);
    expect((await http().get('/v1/admin/settings/support-phones').set(admin).expect(200)).body).toEqual([{ label: 'هاتف 1', phone: '01021846435' }]);
    const log = (await http().get('/v1/admin/audit').set(admin).expect(200)).body.entries;
    expect(log[0]).toMatchObject({ action: 'settings.support', target: { type: 'settings' } });
  });
});
