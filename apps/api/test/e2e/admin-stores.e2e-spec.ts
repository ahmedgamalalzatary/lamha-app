import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from '../utils/app.js';
import { insertCategory, insertProduct, insertStore } from '../utils/catalog.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

const PASSWORD = 'secret123';

const NEW_STORE = {
  vertical: 'restaurant',
  name: ' شاورما الساقية ',
  logo: null,
  cover: '/uploads/catalog/cover.jpg',
  deliveryMinutes: 25,
  deliveryFee: 15,
  minimumOrder: 60,
  deliveredBy: 'platform',
  layout: 'list',
  pickupAllowed: true,
  opensAt: '10:00',
  closesAt: '02:00',
  closedNow: false,
  active: true,
  cuisineIds: [] as number[],
  partner: { firstName: 'حسن', lastName: 'الساقية', phone: '01554459196' },
};

describe('/v1/admin/stores (e2e, contract §11 الموردين, §2 partner accounts)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let token: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  async function signIn(phone: string, password = PASSWORD) {
    const res = await http().post('/v1/auth/login').send({ phone, password }).expect(201);
    return res.body as { accessToken: string; user: { role: string } };
  }

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb();
    await insertUser('admin', '01000000001', PASSWORD);
    token = (await signIn('01000000001')).accessToken;
  });
  afterAll(async () => {
    await app.close();
  });

  it('creates a store with its partner account; the password is shown once and signs in', async () => {
    const cuisine = (await sql<{ insertId: number }>("INSERT INTO cuisines (name) VALUES ('شاورما')")).insertId;
    const res = await http()
      .post('/v1/admin/stores')
      .set(auth())
      .send({ ...NEW_STORE, cuisineIds: [cuisine] })
      .expect(201);

    expect(res.body.store).toMatchObject({
      name: 'شاورما الساقية',
      vertical: 'restaurant',
      deliveryFee: 15,
      minimumOrder: 60,
      opensAt: '10:00',
      closesAt: '02:00',
      pickupAllowed: true,
      cuisineIds: [cuisine],
      productCount: 0,
    });
    expect(res.body.store.partners).toEqual([expect.objectContaining({ phone: '01554459196', firstName: 'حسن', role: 'partner' })]);
    expect(res.body.partner.password).toMatch(/^\S{10}$/);

    const partner = await signIn('01554459196', res.body.partner.password);
    expect(partner.user.role).toBe('partner');
    const [row] = await sql<{ store_id: number }[]>('SELECT store_id FROM users WHERE phone = ?', ['01554459196']);
    expect(row!.store_id).toBe(res.body.store.id);
  });

  it('makes no store when the partner phone already has an account', async () => {
    await insertUser('customer', '01554459196', PASSWORD);
    const res = await http().post('/v1/admin/stores').set(auth()).send(NEW_STORE).expect(409);
    expect(res.body.code).toBe('PHONE_TAKEN');
    expect(await sql<unknown[]>('SELECT id FROM stores')).toHaveLength(0);
  });

  it('refuses bad input: hours, money, vertical and unknown fields', async () => {
    for (const bad of [
      { opensAt: '25:00' },
      { deliveryFee: -1 },
      { minimumOrder: 'ten' },
      { vertical: 'bakery' },
      { layout: 'cards' },
      { partner: { firstName: 'x', phone: '0123' } },
      { rating: 5 },
    ]) {
      await http()
        .post('/v1/admin/stores')
        .set(auth())
        .send({ ...NEW_STORE, ...bad })
        .expect(400);
    }
  });

  it('lists stores with whether each is open now, and filters by type', async () => {
    const open = await insertStore({ name: 'مفتوح' });
    const closed = await insertStore({ name: 'مغلق', closedNow: true, vertical: 'pharmacy', layout: 'grid' });
    const all = await http().get('/v1/admin/stores').set(auth()).expect(200);
    expect(all.body.map((s: { id: number; isOpen: boolean }) => [s.id, s.isOpen])).toEqual([
      [open, true],
      [closed, false],
    ]);
    const pharmacies = await http().get('/v1/admin/stores?vertical=pharmacy').set(auth()).expect(200);
    expect(pharmacies.body.map((s: { id: number }) => s.id)).toEqual([closed]);
  });

  it('edits a store and its cuisines', async () => {
    const id = await insertStore();
    const res = await http()
      .patch(`/v1/admin/stores/${id}`)
      .set(auth())
      .send({ deliveryFee: 20.5, layout: 'grid', active: false, cuisineIds: [] })
      .expect(200);
    expect(res.body).toMatchObject({ id, deliveryFee: 20.5, layout: 'grid', active: false });
    await http().patch('/v1/admin/stores/9999').set(auth()).send({ active: true }).expect(404);
  });

  it('refuses null for a field that must have a value, while a field that may be empty still takes null (review F35)', async () => {
    const id = await insertStore();
    for (const field of ['name', 'deliveryFee', 'layout', 'active']) {
      await http().patch(`/v1/admin/stores/${id}`).set(auth()).send({ [field]: null }).expect(400);
    }
    await http().patch(`/v1/admin/stores/${id}`).set(auth()).send({ logo: null }).expect(200);
    await http().patch('/v1/admin/zones/1').set(auth()).send({ name: null }).expect(400);
  });

  it.each(['customer', 'partner', 'driver'] as const)('refuses a %s', async (role) => {
    await insertUser(role, '01011111111', PASSWORD);
    const { accessToken } = await signIn('01011111111');
    await http().get('/v1/admin/stores').set('Authorization', `Bearer ${accessToken}`).expect(403);
    await http().post('/v1/admin/stores').set('Authorization', `Bearer ${accessToken}`).send(NEW_STORE).expect(403);
  });

  describe('categories', () => {
    it('adds categories at the end, renames, reorders and deletes an empty one', async () => {
      const store = await insertStore();
      const a = (await http().post(`/v1/admin/stores/${store}/categories`).set(auth()).send({ name: 'سندوتشات' }).expect(201)).body;
      const b = (await http().post(`/v1/admin/stores/${store}/categories`).set(auth()).send({ name: 'وجبات', image: null }).expect(201)).body;
      expect([a.sortOrder, b.sortOrder]).toEqual([0, 1]);

      await http().patch(`/v1/admin/categories/${a.id}`).set(auth()).send({ name: 'سندوتشات الشاورما' }).expect(200);
      const ordered = await http().put(`/v1/admin/stores/${store}/categories/order`).set(auth()).send({ ids: [b.id, a.id] }).expect(200);
      expect(ordered.body.map((c: { name: string }) => c.name)).toEqual(['وجبات', 'سندوتشات الشاورما']);

      await http().delete(`/v1/admin/categories/${b.id}`).set(auth()).expect(204);
      const left = await http().get(`/v1/admin/stores/${store}/categories`).set(auth()).expect(200);
      expect(left.body).toEqual([expect.objectContaining({ id: a.id, productCount: 0 })]);
    });

    it('keeps a category that still has products', async () => {
      const store = await insertStore();
      const cat = await insertCategory(store);
      await insertProduct(store, cat);
      const res = await http().delete(`/v1/admin/categories/${cat}`).set(auth()).expect(409);
      expect(res.body.code).toBe('CATEGORY_NOT_EMPTY');
    });

    it("refuses an order that leaves out or adds another store's category", async () => {
      const store = await insertStore();
      const a = await insertCategory(store, 'أ');
      const other = await insertCategory(await insertStore({ name: 'آخر' }), 'ب');
      await http().put(`/v1/admin/stores/${store}/categories/order`).set(auth()).send({ ids: [a, other] }).expect(400);
    });
  });

  describe('products', () => {
    it('adds, edits, switches off and deletes a product', async () => {
      const store = await insertStore();
      const cat = await insertCategory(store);
      const created = await http()
        .post(`/v1/admin/stores/${store}/products`)
        .set(auth())
        .send({ categoryId: cat, name: 'شاورما فراخ', description: 'بالثومية', price: 85, unit: null, image: '/uploads/catalog/x.jpg' })
        .expect(201);
      expect(created.body).toMatchObject({ storeId: store, categoryId: cat, price: 85, active: true });

      const edited = await http().patch(`/v1/admin/products/${created.body.id}`).set(auth()).send({ price: 90.25, active: false }).expect(200);
      expect(edited.body).toMatchObject({ price: 90.25, active: false });

      const list = await http().get(`/v1/admin/stores/${store}/products`).set(auth()).expect(200);
      expect(list.body).toHaveLength(1);

      await http().delete(`/v1/admin/products/${created.body.id}`).set(auth()).expect(204);
      expect(await sql<unknown[]>('SELECT id FROM products')).toHaveLength(0);
    });

    it('lists products in menu order: by category, then inside it', async () => {
      const store = await insertStore();
      const second = await insertCategory(store, 'وجبات', 1);
      const first = await insertCategory(store, 'سندوتشات', 0);
      await insertProduct(store, second, 'وجبة');
      await insertProduct(store, first, 'سندوتش');
      const res = await http().get(`/v1/admin/stores/${store}/products`).set(auth()).expect(200);
      expect(res.body.map((p: { name: string }) => p.name)).toEqual(['سندوتش', 'وجبة']);
    });

    it("refuses another store's category", async () => {
      const store = await insertStore();
      const otherCat = await insertCategory(await insertStore({ name: 'آخر' }));
      const res = await http()
        .post(`/v1/admin/stores/${store}/products`)
        .set(auth())
        .send({ categoryId: otherCat, name: 'x', price: 10 })
        .expect(400);
      expect(res.body.code).toBe('CATEGORY_OTHER_STORE');
    });

    it('lists the switched-off products of every store (منتجات غير فعالة)', async () => {
      const store = await insertStore({ name: 'كشري الحادقة' });
      const cat = await insertCategory(store, 'الكشري');
      await insertProduct(store, cat, 'كشري', 35, true);
      const off = await insertProduct(store, cat, 'كشري باللحمة', 95, false);
      const res = await http().get('/v1/admin/products/inactive').set(auth()).expect(200);
      expect(res.body).toEqual([expect.objectContaining({ id: off, name: 'كشري باللحمة', storeName: 'كشري الحادقة', categoryName: 'الكشري', active: false })]);
    });
  });
});
