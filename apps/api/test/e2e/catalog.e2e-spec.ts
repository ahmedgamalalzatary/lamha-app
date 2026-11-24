import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from '../utils/app.js';
import { insertCategory, insertProduct, insertStore } from '../utils/catalog.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

const PASSWORD = 'secret123';

describe('/v1/catalog (e2e, what the apps read; contract §8.2–§8.4)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let token: string;
  const get = (url: string) => http().get(url).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb();
    await insertUser('customer', '01554459196', PASSWORD, 'a@b.co');
    token = (await http().post('/v1/auth/login').send({ phone: '01554459196', password: PASSWORD })).body.accessToken;
  });
  afterAll(async () => {
    await app.close();
  });

  it('needs a signed-in account', async () => {
    await http().get('/v1/catalog/stores').expect(401);
  });

  it('lists active stores only, by type and cuisine, with "جديد" (no rating yet) and open now', async () => {
    const shawarma = await insertStore({ name: 'شاورما' });
    const closed = await insertStore({ name: 'مغلق', closedNow: true });
    await insertStore({ name: 'مخفي', active: false });
    const pharmacy = await insertStore({ name: 'صيدلية', vertical: 'pharmacy', layout: 'grid' });
    const [cuisine] = [(await sql<{ insertId: number }>("INSERT INTO cuisines (name) VALUES ('شاورما')")).insertId];
    await sql('INSERT INTO store_cuisines (store_id, cuisine_id) VALUES (?, ?)', [shawarma, cuisine]);

    const restaurants = await get('/v1/catalog/stores?vertical=restaurant').expect(200);
    expect(restaurants.body.map((s: { id: number; isOpen: boolean }) => [s.id, s.isOpen])).toEqual([
      [shawarma, true],
      [closed, false],
    ]);
    expect(restaurants.body[0]).toMatchObject({ rating: null, ratingCount: 0, cuisineIds: [cuisine], deliveryFee: 15 });
    expect(restaurants.body[0]).not.toHaveProperty('partners');

    const byCuisine = await get(`/v1/catalog/stores?cuisineId=${cuisine}`).expect(200);
    expect(byCuisine.body.map((s: { id: number }) => s.id)).toEqual([shawarma]);
    const pharmacies = await get('/v1/catalog/stores?vertical=pharmacy').expect(200);
    expect(pharmacies.body.map((s: { id: number }) => s.id)).toEqual([pharmacy]);
  });

  it("opens a store page with its categories in order and only the products customers may see", async () => {
    const store = await insertStore();
    const meals = await insertCategory(store, 'وجبات', 1);
    const sandwiches = await insertCategory(store, 'سندوتشات', 0);
    await insertCategory(store, 'فاضي', 2);
    await insertProduct(store, sandwiches, 'شاورما فراخ', 85);
    await insertProduct(store, meals, 'وجبة عربي', 175);
    await insertProduct(store, meals, 'مخفي', 10, false);

    const res = await get(`/v1/catalog/stores/${store}`).expect(200);
    expect(res.body.categories.map((c: { name: string; products: { name: string }[] }) => [c.name, c.products.map((p) => p.name)])).toEqual([
      ['سندوتشات', ['شاورما فراخ']],
      ['وجبات', ['وجبة عربي']],
    ]);
    expect(res.body.categories[1].productCount).toBe(1);
  });

  it('does not open a hidden store', async () => {
    const hidden = await insertStore({ active: false });
    await get(`/v1/catalog/stores/${hidden}`).expect(404);
    await get('/v1/catalog/stores/9999').expect(404);
  });

  it('gives the home tiles by row and order, leaving out tiles of hidden stores', async () => {
    const hidden = await insertStore({ active: false });
    const shown = await insertStore({ name: 'Maky' });
    await sql(
      `INSERT INTO home_tiles (label, tile_row, sort_order, target_vertical, target_store_id) VALUES
       ('صيدليات', 'scroll', 1, 'pharmacy', NULL), ('Maky', 'scroll', 0, NULL, ?), ('مخفي', 'scroll', 2, NULL, ?), ('المطاعم', 'fixed', 0, 'restaurant', NULL)`,
      [shown, hidden],
    );
    const res = await get('/v1/catalog/home-tiles').expect(200);
    expect(res.body.map((t: { label: string }) => t.label)).toEqual(['المطاعم', 'Maky', 'صيدليات']);
  });

  it('gives the cuisines in order', async () => {
    await sql("INSERT INTO cuisines (name, sort_order) VALUES ('باستا', 1), ('بروست', 0)");
    const res = await get('/v1/catalog/cuisines').expect(200);
    expect(res.body.map((c: { name: string }) => c.name)).toEqual(['بروست', 'باستا']);
  });
});
