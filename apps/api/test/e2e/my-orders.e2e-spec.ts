import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { type CustomerOrderDetails, ORDER_SOCKET_EVENTS } from '@tawsela/shared';
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

type Auth = { Authorization: string };

describe('the customer\'s orders: status, details and "اطلب تاني" (e2e, contract §8.8)', () => {
  let app: INestApplication<App>;
  let url: string;
  const http = () => request(app.getHttpServer());
  let admin: Auth;
  let customer: Auth;
  let other: Auth;
  let partner: Auth;
  let store: number;
  let otherStore: number;
  let category: number;
  let shawarma: number;
  let fries: number;
  let custom: { id: number; large: number; onion: number };
  let address: number;
  let requests = 0;
  const sockets: Socket[] = [];

  const signIn = async (phone: string) => ({
    Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone, password: PASSWORD }).expect(201)).body.accessToken}`,
  });
  const add = (productId: number, quantity = 1, optionIds: number[] = [], removedIngredientIds: number[] = [], as = customer) =>
    http().post('/v1/me/cart/lines').set(as).send({ productId, quantity, optionIds, removedIngredientIds }).expect(201);

  /** Places whatever is in the customer's cart as a delivery to the saved address. */
  async function place(as = customer, where: object = { addressId: address }): Promise<number> {
    const bill = (await http().post('/v1/me/checkout/quote').set(as).send(where).expect(200)).body;
    const requestId = `00000000-0000-4000-8000-${String(++requests).padStart(12, '0')}`;
    return (
      await http()
        .post('/v1/me/orders')
        .set(as)
        .send({ ...where, cartId: bill.cartId, slot: null, expectedTotal: bill.total, requestId })
        .expect(201)
    ).body.order.id;
  }

  /** 2 × شاورما فراخ, and a large بونبوني without onion, delivered. */
  async function deliveredOrder(): Promise<number> {
    await add(shawarma, 2);
    await add(custom.id, 1, [custom.large], [custom.onion]);
    const id = await place();
    await sql("UPDATE orders SET status = 'delivered' WHERE id = ?", [id]);
    return id;
  }

  async function connect(auth: Auth | null): Promise<Socket> {
    const socket = io(url, { transports: ['websocket'], reconnection: false, auth: auth ? { token: auth.Authorization.slice(7) } : {} });
    sockets.push(socket);
    await new Promise<void>((resolve, reject) => {
      socket.once('ready', () => resolve());
      socket.once('disconnect', () => reject(new Error('refused')));
      socket.once('connect_error', reject);
    });
    return socket;
  }

  const details = (id: number, as = customer) => http().get(`/v1/me/orders/${id}`).set(as);
  const reorder = (id: number, body: object = {}, as = customer) => http().post(`/v1/me/orders/${id}/reorder`).set(as).send(body);

  beforeAll(async () => {
    app = await createTestApp();
    await app.listen(0, '127.0.0.1');
    url = `http://127.0.0.1:${((app.getHttpServer() as unknown as Server).address() as AddressInfo).port}`;
  });
  beforeEach(async () => {
    await resetDb();
    await insertUser('admin', '01000000001', PASSWORD);
    await insertUser('customer', '01554459196', PASSWORD);
    await insertUser('customer', '01100000001', PASSWORD);
    admin = await signIn('01000000001');
    customer = await signIn('01554459196');
    other = await signIn('01100000001');
    const fayoum = (await http().post('/v1/admin/zones').set(admin).send({ name: 'الفيوم', polygon: FAYOUM, active: true }).expect(201)).body.id;
    store = await insertStore({ name: 'شاورما الساقية' });
    otherStore = await insertStore({ name: 'كشري الحادقة' });
    await sql('UPDATE stores SET zone_id = ?, lat = 29.3, lng = 30.82 WHERE id IN (?, ?)', [fayoum, store, otherStore]);
    category = await insertCategory(store);
    shawarma = await insertProduct(store, category, 'شاورما فراخ', 85);
    fries = await insertProduct(store, category, 'بطاطس', 25);
    const { body } = await http()
      .post(`/v1/admin/stores/${store}/products`)
      .set(admin)
      .send({
        categoryId: category,
        name: 'بونبوني',
        price: 30,
        ingredients: ['بصل'],
        optionGroups: [
          {
            title: 'الحجم',
            required: true,
            maxChoices: 1,
            options: [
              { name: 'صغير', priceDelta: 0 },
              { name: 'كبير', priceDelta: 15 },
            ],
          },
        ],
      })
      .expect(201);
    custom = { id: body.id, large: body.optionGroups[0].options[1].id, onion: body.ingredients[0].id };
    const p = await insertUser('partner', '01000000002', PASSWORD);
    await linkPartner(p, store);
    partner = await signIn('01000000002');
    address = (await http().post('/v1/me/addresses').set(customer).send(ADDRESS).expect(201)).body.id;
  });
  afterEach(() => {
    for (const s of sockets.splice(0)) s.disconnect();
  });
  afterAll(async () => {
    await app.close();
  });

  it("opens one of the customer's own orders with its lines, address, captain and payment", async () => {
    await add(shawarma, 2);
    await add(custom.id, 1, [custom.large], [custom.onion]);
    const id = await place();
    const first = (await details(id).expect(200)).body as CustomerOrderDetails;
    expect(first).toMatchObject({
      id,
      code: String(100000 + id),
      status: 'pending_review',
      store: { id: store, name: 'شاورما الساقية' },
      mode: 'delivery',
      count: 3,
      itemsTotal: 215,
      driver: null,
      paymentMethod: 'cash',
      lines: [
        { name: 'شاورما فراخ', options: [], removedIngredients: [], unitPrice: 85, quantity: 2 },
        { name: 'بونبوني', options: ['كبير'], removedIngredients: ['بصل'], unitPrice: 45, quantity: 1 },
      ],
    });
    expect(first.addressText).toContain('شارع 2');
    expect(first.total).toBe(first.itemsTotal + first.deliveryFee);

    await details(id, other).expect(404);
    await details(id, partner).expect(403);
    await details(999999).expect(404);

    // معلومات المندوب, once a captain has it.
    const driver = await insertUser('driver', '01011111111', PASSWORD);
    await sql("UPDATE users SET first_name = 'محمود', last_name = 'صبري' WHERE id = ?", [driver]);
    await http().post(`/v1/partner/orders/${id}/accept`).set(partner).expect(200);
    await http().post(`/v1/admin/orders/${id}/driver`).set(admin).send({ driverId: driver }).expect(204);
    expect((await details(id).expect(200)).body).toMatchObject({ status: 'preparing', driver: { name: 'محمود صبري' } });
  });

  it("tells only the order's customer, live, when its status or captain changes", async () => {
    await expect(connect(admin)).rejects.toThrow();
    const mine = await connect(customer);
    const theirs = await connect(other);
    const heard: unknown[] = [];
    theirs.on(ORDER_SOCKET_EVENTS.status, (e) => heard.push(e));
    await add(shawarma, 1);
    const id = await place();

    const accepted = new Promise((resolve) => mine.once(ORDER_SOCKET_EVENTS.status, resolve));
    await http().post(`/v1/partner/orders/${id}/accept`).set(partner).expect(200);
    expect(await accepted).toEqual({ id, status: 'preparing' });

    const driver = await insertUser('driver', '01011111111', PASSWORD);
    const assigned = new Promise((resolve) => mine.once(ORDER_SOCKET_EVENTS.status, resolve));
    await http().post(`/v1/admin/orders/${id}/driver`).set(admin).send({ driverId: driver }).expect(204);
    expect(await assigned).toEqual({ id });
    expect(heard).toEqual([]);
  });

  it('"اطلب تاني" puts a finished order\'s items back in the cart, with their choices', async () => {
    const id = await deliveredOrder();
    const { body } = await reorder(id).expect(200);
    expect(body.skipped).toBe(0);
    expect(body.cart).toMatchObject({
      store: { id: store },
      count: 3,
      total: 215,
      lines: [
        { product: { id: shawarma }, quantity: 2, optionIds: [], removedIngredientIds: [] },
        { product: { id: custom.id }, quantity: 1, optionIds: [custom.large], removedIngredientIds: [custom.onion], unitPrice: 45 },
      ],
    });
    // Twice adds to the same lines, as tapping "+" would.
    expect((await reorder(id).expect(200)).body.cart.count).toBe(6);
    await reorder(id, {}, other).expect(404);
    await reorder(id, {}, partner).expect(403);
  });

  it('leaves out what is gone from the menu or whose choices changed, and says how many', async () => {
    const id = await deliveredOrder();
    await sql('UPDATE products SET active = 0 WHERE id = ?', [shawarma]);
    await sql('DELETE FROM product_options WHERE id = ?', [custom.large]);
    await reorder(id)
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('CART_ITEM_UNAVAILABLE'));
    await sql('UPDATE products SET active = 1 WHERE id = ?', [shawarma]);
    const { body } = await reorder(id).expect(200);
    expect(body.skipped).toBe(1);
    expect(body.cart.lines).toMatchObject([{ product: { id: shawarma }, quantity: 2 }]);
  });

  it("asks before replacing another store's cart, and refuses while the store is closed or the order still runs", async () => {
    const id = await deliveredOrder();
    const kushari = await insertProduct(otherStore, await insertCategory(otherStore), 'كشري', 40);
    const { body: theirs } = await add(kushari, 2);
    await reorder(id)
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('CART_STORE_CONFLICT'));
    const { body } = await reorder(id, { replaceCartId: theirs.cart.id }).expect(200);
    expect(body.cart.store.id).toBe(store);

    await sql('UPDATE stores SET closed_now = 1 WHERE id = ?', [store]);
    await reorder(id)
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('CART_STORE_CLOSED'));
    await sql('UPDATE stores SET closed_now = 0 WHERE id = ?', [store]);

    await add(fries, 3);
    const running = await place();
    await reorder(running)
      .expect(409)
      .expect(({ body }) => expect(body.code).toBe('ORDER_STATUS'));
  });
});
