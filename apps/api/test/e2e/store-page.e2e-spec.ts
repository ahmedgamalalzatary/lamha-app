import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from '../utils/app.js';
import { insertCategory, insertProduct, insertStore } from '../utils/catalog.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

const PASSWORD = 'secret123';

// بونبوني توفيكس (item-sheet-required-option-group.png) and كومبو الفرايد (item-sheet-base-ingredients.png).
const WEIGHT = {
  title: 'الوزن',
  required: true,
  maxChoices: 1,
  options: [
    { name: 'ربع كيلو', priceDelta: 58.75 },
    { name: 'نصف كيلو', priceDelta: 116 },
  ],
};

describe('store page, product choices and favourites (e2e, contract §8.4, §8.5, §8.14)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let admin: string;
  let customer: string;
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });
  const signIn = async (phone: string) => (await http().post('/v1/auth/login').send({ phone, password: PASSWORD })).body.accessToken as string;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb();
    await insertUser('admin', '01000000001', PASSWORD);
    await insertUser('customer', '01554459196', PASSWORD, 'a@b.co');
    admin = await signIn('01000000001');
    customer = await signIn('01554459196');
  });
  afterAll(async () => {
    await app.close();
  });

  it('the admin sets option groups and ingredients; the store page sends them in order; saving replaces them', async () => {
    const store = await insertStore({ name: 'توصيلة ماركت', vertical: 'market', layout: 'grid' });
    const sweets = await insertCategory(store, 'حلويات');
    const toffee = await http()
      .post(`/v1/admin/stores/${store}/products`)
      .set(as(admin))
      .send({ categoryId: sweets, name: 'بونبوني توفيكس', price: 0, optionGroups: [WEIGHT], ingredients: [] })
      .expect(201);
    expect(toffee.body.optionGroups).toMatchObject([{ title: 'الوزن', required: true, maxChoices: 1, options: [{ name: 'ربع كيلو', priceDelta: 58.75 }, { name: 'نصف كيلو' }] }]);

    const combo = (
      await http()
        .post(`/v1/admin/stores/${store}/products`)
        .set(as(admin))
        .send({ categoryId: sweets, name: 'كومبو الفرايد', price: 350, ingredients: ['٥ اسبايسي ليمون', '٥ كراب اتشيز'] })
        .expect(201)
    ).body;
    expect(combo.optionGroups).toEqual([]);

    const page = (await http().get(`/v1/catalog/stores/${store}`).set(as(customer)).expect(200)).body;
    const [first, second] = page.categories[0].products;
    expect(first.optionGroups[0].options.map((o: { name: string }) => o.name)).toEqual(['ربع كيلو', 'نصف كيلو']);
    expect(second.ingredients.map((i: { name: string }) => i.name)).toEqual(['٥ اسبايسي ليمون', '٥ كراب اتشيز']);

    // A PATCH with ingredients replaces them; one without leaves the choices alone.
    await http().patch(`/v1/admin/products/${combo.id}`).set(as(admin)).send({ ingredients: ['٥ جولدن'] }).expect(200);
    const renamed = await http().patch(`/v1/admin/products/${combo.id}`).set(as(admin)).send({ name: 'كومبو' }).expect(200);
    expect(renamed.body.ingredients.map((i: { name: string }) => i.name)).toEqual(['٥ جولدن']);
    // The dashboard sends the choices on every save: unchanged ones keep their ids (carts point at them).
    const ids = (p: { optionGroups: { id: number; options: { id: number }[] }[] }) => p.optionGroups.flatMap((g) => [g.id, ...g.options.map((o) => o.id)]);
    const resaved = await http()
      .patch(`/v1/admin/products/${toffee.body.id}`)
      .set(as(admin))
      .send({ name: 'بونبوني', optionGroups: [WEIGHT], ingredients: [] })
      .expect(200);
    expect(resaved.body.name).toBe('بونبوني');
    expect(ids(resaved.body)).toEqual(ids(toffee.body));
    await http().delete(`/v1/admin/products/${toffee.body.id}`).set(as(admin)).expect(204);
    expect(await sql<unknown[]>('SELECT * FROM product_options')).toHaveLength(0);

    const bad = [
      { ...WEIGHT, maxChoices: 3 }, // more than its options
      { ...WEIGHT, options: [] },
      { ...WEIGHT, title: ' ' },
      { ...WEIGHT, options: [{ name: 'ربع', priceDelta: -1 }] },
    ];
    for (const group of bad) {
      await http().patch(`/v1/admin/products/${combo.id}`).set(as(admin)).send({ optionGroups: [group] }).expect(400);
    }
  });

  it('sub-categories: one level, same store; the store page keeps a main category whose products are in its sub-categories', async () => {
    const store = await insertStore({ name: 'توصيلة ماركت', vertical: 'market', layout: 'grid' });
    const other = await insertStore({ name: 'ماركت آخر', vertical: 'market', layout: 'grid' });
    const fruitVeg = (await http().post(`/v1/admin/stores/${store}/categories`).set(as(admin)).send({ name: 'فاكهه وخضروات' }).expect(201)).body;
    expect(fruitVeg.parentId).toBeNull();
    const veg = (await http().post(`/v1/admin/stores/${store}/categories`).set(as(admin)).send({ name: 'الخضار', parentId: fruitVeg.id }).expect(201)).body;
    expect(veg.parentId).toBe(fruitVeg.id);
    await insertProduct(store, veg.id, 'طماطم فرز أول', 20);

    const deeper = await http().post(`/v1/admin/stores/${store}/categories`).set(as(admin)).send({ name: 'x', parentId: veg.id }).expect(400);
    expect(deeper.body.code).toBe('CATEGORY_DEPTH');
    const foreign = await http().post(`/v1/admin/stores/${other}/categories`).set(as(admin)).send({ name: 'x', parentId: fruitVeg.id }).expect(400);
    expect(foreign.body.code).toBe('CATEGORY_OTHER_STORE');
    // A main category with sub-categories cannot become a sub-category itself.
    const drinks = (await http().post(`/v1/admin/stores/${store}/categories`).set(as(admin)).send({ name: 'المشروبات' }).expect(201)).body;
    const moved = await http().patch(`/v1/admin/categories/${fruitVeg.id}`).set(as(admin)).send({ parentId: drinks.id }).expect(400);
    expect(moved.body.code).toBe('CATEGORY_DEPTH');
    const notEmpty = await http().delete(`/v1/admin/categories/${fruitVeg.id}`).set(as(admin)).expect(409);
    expect(notEmpty.body.code).toBe('CATEGORY_NOT_EMPTY');

    const page = (await http().get(`/v1/catalog/stores/${store}`).set(as(customer)).expect(200)).body;
    expect(page.categories.map((c: { name: string; parentId: number | null }) => [c.name, c.parentId])).toEqual([
      ['فاكهه وخضروات', null],
      ['الخضار', fruitVeg.id],
    ]);
  });

  it('category changes at the same moment never make a loop or silently delete a new sub-category', async () => {
    const store = await insertStore({ name: 'ماركت', vertical: 'market', layout: 'grid' });
    const add = async (name: string, parentId?: number) =>
      (await http().post(`/v1/admin/stores/${store}/categories`).set(as(admin)).send({ name, parentId }).expect(201)).body.id as number;
    for (let round = 0; round < 5; round++) {
      const a = await add(`a${round}`);
      const b = await add(`b${round}`);
      // Each moved under the other at once: one of them must be refused.
      await Promise.all([
        http().patch(`/v1/admin/categories/${a}`).set(as(admin)).send({ parentId: b }),
        http().patch(`/v1/admin/categories/${b}`).set(as(admin)).send({ parentId: a }),
      ]);
      const rows = await sql<{ id: number; parent_id: number | null }[]>('SELECT id, parent_id FROM store_categories WHERE id IN (?, ?)', [a, b]);
      expect(rows.filter((r) => r.parent_id !== null).length).toBeLessThanOrEqual(1);

      // Deleted while a sub-category is added under it: the sub-category is never lost.
      const c = await add(`c${round}`);
      const [, created] = await Promise.all([
        http().delete(`/v1/admin/categories/${c}`).set(as(admin)),
        http().post(`/v1/admin/stores/${store}/categories`).set(as(admin)).send({ name: `sub${round}`, parentId: c }),
      ]);
      if (created.status === 201) {
        expect(await sql('SELECT id FROM store_categories WHERE id = ?', [created.body.id])).toHaveLength(1);
      }
    }
    // The database itself refuses to drop a main category that still has sub-categories.
    const main = await add('رئيسي');
    await add('فرعي', main);
    await expect(sql('DELETE FROM store_categories WHERE id = ?', [main])).rejects.toThrow();
  });

  it('favourites (المفضلة): customers add and remove stores; hidden stores drop out of the list', async () => {
    const maky = await insertStore({ name: 'Maky' });
    const hidden = await insertStore({ name: 'مخفي' });
    expect((await http().get('/v1/me/favorites').set(as(customer)).expect(200)).body).toEqual([]);

    await http().put(`/v1/me/favorites/${maky}`).set(as(customer)).expect(204);
    await http().put(`/v1/me/favorites/${maky}`).set(as(customer)).expect(204); // twice is fine
    await http().put(`/v1/me/favorites/${hidden}`).set(as(customer)).expect(204);
    await sql('UPDATE stores SET active = false WHERE id = ?', [hidden]);
    const list = await http().get('/v1/me/favorites').set(as(customer)).expect(200);
    expect(list.body.map((s: { id: number; name: string }) => s.name)).toEqual(['Maky']);

    await http().delete(`/v1/me/favorites/${maky}`).set(as(customer)).expect(204);
    expect((await http().get('/v1/me/favorites').set(as(customer)).expect(200)).body).toEqual([]);
    await http().put('/v1/me/favorites/9999').set(as(customer)).expect(404);
    await http().get('/v1/me/favorites').set(as(admin)).expect(403);
  });
});
