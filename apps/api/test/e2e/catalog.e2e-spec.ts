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

  it('searches a list by name, sorts it and keeps fast or pickup stores (§8.3)', async () => {
    const shawarma = await insertStore({ name: 'شاورما الساقية', deliveryMinutes: 45 });
    const fast = await insertStore({ name: 'بيتزا سريعة', deliveryMinutes: 20, pickupAllowed: true });
    const pizza = await insertStore({ name: 'Pizza Hut', deliveryMinutes: 40 });
    const list = async (query: string) => (await get(`/v1/catalog/stores?vertical=restaurant&${query}`).expect(200)).body.map((s: { id: number }) => s.id);

    expect(await list('q=%D8%A8%D9%8A%D8%AA%D8%B2%D8%A7')).toEqual([fast]); // بيتزا
    expect(await list('q=pizza')).toEqual([pizza]); // case does not matter
    expect(await list('q=%25')).toEqual([]); // "%" is a character, not a wildcard
    expect(await list('sort=newest')).toEqual([pizza, fast, shawarma]);
    expect(await list('fast=true')).toEqual([fast]);
    expect(await list('pickup=true')).toEqual([fast]);
    expect(await list('minRating=4')).toEqual([]); // new stores have no rating yet
    for (const bad of ['sort=cheapest', 'minRating=2', 'fast=yes']) await get(`/v1/catalog/stores?${bad}`).expect(400);
  });

  it('searches stores and products: each store with its matching products, by tab (§8.13)', async () => {
    const crinkle = await insertStore({ name: 'Crinkle' });
    const pizzaPlace = await insertStore({ name: 'بيتزا كينج' });
    const market = await insertStore({ name: 'ماركت', vertical: 'market', layout: 'grid' });
    const hidden = await insertStore({ name: 'بيتزا مخفي', active: false });
    const crinkleCat = await insertCategory(crinkle);
    await insertProduct(crinkle, crinkleCat, 'مايو بيتزا فرايز', 110);
    await insertProduct(crinkle, crinkleCat, 'برجر', 90);
    await insertProduct(crinkle, crinkleCat, 'بيتزا قديمة', 50, false);
    const marketCat = await insertCategory(market);
    await insertProduct(market, marketCat, 'صوص بيتزا', 30);
    await insertProduct(hidden, await insertCategory(hidden), 'بيتزا', 10);
    const search = (query: string) => get(`/v1/catalog/search?q=${encodeURIComponent('بيتزا')}${query}`).expect(200);

    const all = (await search('')).body as { store: { id: number }; products: { name: string }[] }[];
    expect(all.map((r) => [r.store.id, r.products.map((p) => p.name)])).toEqual([
      [crinkle, ['مايو بيتزا فرايز']],
      [pizzaPlace, []],
      [market, ['صوص بيتزا']],
    ]);
    expect((await search('&scope=restaurants')).body.map((r: { store: { id: number } }) => r.store.id)).toEqual([crinkle, pizzaPlace]);
    expect((await search('&scope=others')).body.map((r: { store: { id: number } }) => r.store.id)).toEqual([market]);

    const suggestions = await get(`/v1/catalog/search/suggestions?q=${encodeURIComponent('بيتزا')}&scope=all`).expect(200);
    expect(suggestions.body).toEqual([
      { name: 'مايو بيتزا فرايز', vertical: 'restaurant' },
      { name: 'صوص بيتزا', vertical: 'market' },
    ]);
    await get('/v1/catalog/search?q=%20').expect(400);
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

  it('gives the home screen: tiles by row and order, leaving out tiles of hidden stores (§8.2)', async () => {
    const hidden = await insertStore({ active: false });
    const shown = await insertStore({ name: 'Maky' });
    await sql(
      `INSERT INTO home_tiles (label, tile_row, sort_order, target_vertical, target_store_id) VALUES
       ('صيدليات', 'scroll', 1, 'pharmacy', NULL), ('Maky', 'scroll', 0, NULL, ?), ('مخفي', 'scroll', 2, NULL, ?), ('المطاعم', 'fixed', 0, 'restaurant', NULL)`,
      [shown, hidden],
    );
    const res = await get('/v1/catalog/home').expect(200);
    expect(res.body.tiles.map((t: { label: string; row: string }) => [t.row, t.label])).toEqual([
      ['fixed', 'المطاعم'],
      ['scroll', 'Maky'],
      ['scroll', 'صيدليات'],
    ]);
    expect(res.body.tiles[1]).toMatchObject({ targetStoreId: shown, targetVertical: null });
  });

  it("gives the invite card's rewards with the home screen (§8.2: 300 for you, 25 for your friend)", async () => {
    const res = await get('/v1/catalog/home').expect(200);
    expect(res.body.invite).toEqual({ reward: 300, friendReward: 25 });
  });

  it('gives the cuisines in order', async () => {
    await sql("INSERT INTO cuisines (name, sort_order) VALUES ('باستا', 1), ('بروست', 0)");
    const res = await get('/v1/catalog/cuisines').expect(200);
    expect(res.body.map((c: { name: string }) => c.name)).toEqual(['بروست', 'باستا']);
  });
});
