import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from '../utils/app.js';
import { insertCategory, insertProduct, insertStore } from '../utils/catalog.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

describe('customer cart (contract §8.6)', () => {
  let app: INestApplication<App>;
  let customer: string;
  let otherCustomer: string;
  let admin: string;
  let store: number;
  let product: number;
  const http = () => request(app.getHttpServer());
  const path = '/v1/me/cart';
  const signIn = async (phone: string) =>
    (await http().post('/v1/auth/login').send({ phone, password: 'secret123' }).expect(201)).body.accessToken as string;
  const item = (id: number) => ({ productId: id, quantity: 1, optionIds: [], removedIngredientIds: [] });
  const get = (token = customer) => http().get(path).auth(token, { type: 'bearer' });
  const add = (body: object) => http().post(`${path}/lines`).auth(customer, { type: 'bearer' }).send(body);

  beforeAll(async () => { app = await createTestApp(); });
  afterAll(async () => { await app.close(); });
  beforeEach(async () => {
    await resetDb();
    await insertUser('customer', '01554459196', 'secret123');
    await insertUser('customer', '01100000001', 'secret123');
    await insertUser('admin', '01000000001', 'secret123');
    customer = await signIn('01554459196');
    otherCustomer = await signIn('01100000001');
    admin = await signIn('01000000001');
    store = await insertStore({ pickupAllowed: true });
    product = await insertProduct(store, await insertCategory(store), 'شاورما', 85);
  });

  it('isolates customers, merges racing adds and reprices from the catalog', async () => {
    await http().get(path).expect(401);
    await get(admin).expect(403);
    await add({ ...item(product), quantity: 0 }).expect(400);
    await add({ ...item(product), unitPrice: 1 }).expect(400);
    await Promise.all([add(item(product)).expect(201), add(item(product)).expect(201)]);
    await sql('UPDATE products SET price = 93.25 WHERE id = ?', [product]);
    const { cart } = (await get().expect(200)).body;
    expect(cart).toMatchObject({ store: { id: store }, count: 2, total: 186.5 });
    expect(cart.lines).toMatchObject([{ product: { id: product }, quantity: 2, unitPrice: 93.25 }]);
    const line = cart.lines[0].id;
    await http().patch(`${path}/lines/${line}`).auth(otherCustomer, { type: 'bearer' }).send({ delta: -1 }).expect(404);
    const changed = await http().patch(`${path}/lines/${line}`).auth(customer, { type: 'bearer' }).send({ delta: -1 }).expect(200);
    expect(changed.body.cart.count).toBe(1);
    await http().delete(`${path}/lines/${line}`).auth(customer, { type: 'bearer' }).expect(200);
    expect((await get().expect(200)).body.cart).toBeNull();
    expect((await get(otherCustomer).expect(200)).body.cart).toBeNull();
  });

  it('replaces the earlier store only with explicit confirmation and clears its note and pickup', async () => {
    const secondStore = await insertStore({ pickupAllowed: false });
    const second = await insertProduct(secondStore, await insertCategory(secondStore));
    const first = (await add(item(product)).expect(201)).body.cart;
    await http().patch(path).auth(customer, { type: 'bearer' }).send({ cartId: first.id, note: 'بدون صوص', mode: 'pickup' }).expect(200);
    await add(item(second)).expect(409).expect(({ body }) => expect(body.code).toBe('CART_STORE_CONFLICT'));
    await add({ ...item(second), replaceCartId: first.id + 1 }).expect(409);
    expect((await get().expect(200)).body.cart).toMatchObject({ id: first.id, note: 'بدون صوص', mode: 'pickup' });
    const replaced = (await add({ ...item(second), replaceCartId: first.id }).expect(201)).body.cart;
    expect(replaced).toMatchObject({ store: { id: secondStore }, note: '', mode: 'delivery', count: 1 });
    await http().patch(path).auth(customer, { type: 'bearer' }).send({ cartId: replaced.id, mode: 'pickup' }).expect(409);
  });

  it('validates current availability and never accepts options from another product', async () => {
    await add({ ...item(product), optionIds: [999] }).expect(400);
    await add(item(product)).expect(201);
    const validate = () => http().post(`${path}/validate`).auth(customer, { type: 'bearer' });
    await validate().expect(200);
    await sql('UPDATE stores SET closed_now = true WHERE id = ?', [store]);
    await validate().expect(409).expect(({ body }) => expect(body.code).toBe('CART_STORE_CLOSED'));
    await sql('UPDATE stores SET closed_now = false WHERE id = ?', [store]);
    await sql('UPDATE products SET active = false WHERE id = ?', [product]);
    await validate().expect(409).expect(({ body }) => expect(body.code).toBe('CART_ITEM_UNAVAILABLE'));
    expect((await get().expect(200)).body.cart.lines[0].available).toBe(false);
  });

  it('keeps delivery selected after an admin disables and re-enables pickup', async () => {
    const { body: { cart } } = await add(item(product)).expect(201);
    await http().patch(path).auth(customer, { type: 'bearer' }).send({ cartId: cart.id, mode: 'pickup' }).expect(200);
    const allowPickup = (pickupAllowed: boolean) =>
      http().patch(`/v1/admin/stores/${store}`).auth(admin, { type: 'bearer' }).send({ pickupAllowed }).expect(200);
    await allowPickup(false);
    expect((await get().expect(200)).body.cart.mode).toBe('delivery');
    await allowPickup(true);
    expect((await get().expect(200)).body.cart.mode).toBe('delivery');

    // Simulate a cart saved before pickup choices were cleared on disable.
    await http().patch(path).auth(customer, { type: 'bearer' }).send({ cartId: cart.id, mode: 'pickup' }).expect(200);
    await sql('UPDATE stores SET pickup_allowed = false WHERE id = ?', [store]);
    await allowPickup(true);
    expect((await get().expect(200)).body.cart.mode).toBe('delivery');
  });

  it('prices chosen options and preserves separate customizations', async () => {
    const categoryId = await insertCategory(store, 'حلويات');
    const { body: custom } = await http().post(`/v1/admin/stores/${store}/products`).auth(admin, { type: 'bearer' }).send({
      categoryId, name: 'بونبوني', price: 30, ingredients: ['سكر'],
      optionGroups: [{ title: 'الوزن', required: true, maxChoices: 1, options: [{ name: 'صغير', priceDelta: 5 }, { name: 'كبير', priceDelta: 15 }] }],
    }).expect(201);
    const [small, large] = custom.optionGroups[0].options;
    const ingredient = custom.ingredients[0].id;
    await add(item(custom.id)).expect(400);
    await add({ ...item(custom.id), optionIds: [small.id, large.id] }).expect(400);
    await add({ ...item(custom.id), optionIds: [small.id], removedIngredientIds: [ingredient] }).expect(201);
    const { body: { cart } } = await add({ ...item(custom.id), optionIds: [large.id] }).expect(201);
    expect(cart.total).toBe(80);
    expect(cart.lines).toMatchObject([
      { optionIds: [small.id], removedIngredientIds: [ingredient], unitPrice: 35 },
      { optionIds: [large.id], removedIngredientIds: [], unitPrice: 45 },
    ]);
  });
});
