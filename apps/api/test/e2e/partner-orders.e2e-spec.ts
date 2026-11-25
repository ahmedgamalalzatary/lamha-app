import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { ORDER_SOCKET_EVENTS, type PartnerOrder } from '@tawsela/shared';
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

describe('the store\'s orders, products and hours (e2e, contract §9, §11.1)', () => {
  let app: INestApplication<App>;
  let url: string;
  const http = () => request(app.getHttpServer());
  let customer: { Authorization: string };
  let partner: { Authorization: string };
  let rival: { Authorization: string };
  let store: number;
  let otherStore: number;
  let shawarma: number;
  let address: number;
  let requests = 0;
  const sockets: Socket[] = [];

  const signIn = async (phone: string) => ({
    Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone, password: PASSWORD }).expect(201)).body.accessToken}`,
  });

  /** The customer orders 2 × شاورما فراخ (85) with a note, as a delivery or a pickup. */
  async function order(mode: 'delivery' | 'pickup' = 'delivery'): Promise<number> {
    await http().post('/v1/me/cart/lines').set(customer).send({ productId: shawarma, quantity: 2, optionIds: [], removedIngredientIds: [] }).expect(201);
    const { cart } = (await http().get('/v1/me/cart').set(customer).expect(200)).body;
    await http().patch('/v1/me/cart').set(customer).send({ cartId: cart.id, mode, note: '01021327197 ده رقم الاستلام' }).expect(200);
    const where = mode === 'delivery' ? { addressId: address } : {};
    const bill = (await http().post('/v1/me/checkout/quote').set(customer).send(where).expect(200)).body;
    const requestId = `00000000-0000-4000-8000-${String(++requests).padStart(12, '0')}`;
    const placed = await http()
      .post('/v1/me/orders')
      .set(customer)
      .send({ ...where, cartId: bill.cartId, slot: null, expectedTotal: bill.total, requestId })
      .expect(201);
    return placed.body.order.id;
  }

  /** A live connection, as the partner app and /partner open one. */
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

  const step = (id: number, action: string, as = partner) => http().post(`/v1/partner/orders/${id}/${action}`).set(as);

  beforeAll(async () => {
    app = await createTestApp();
    await app.listen(0, '127.0.0.1');
    url = `http://127.0.0.1:${((app.getHttpServer() as unknown as Server).address() as AddressInfo).port}`;
  });
  beforeEach(async () => {
    await resetDb();
    await insertUser('admin', '01000000001', PASSWORD);
    await insertUser('customer', '01554459196', PASSWORD);
    const admin = await signIn('01000000001');
    customer = await signIn('01554459196');
    const fayoum = (await http().post('/v1/admin/zones').set(admin).send({ name: 'الفيوم', polygon: FAYOUM, active: true }).expect(201)).body.id;
    store = await insertStore({ name: 'شاورما الساقية', pickupAllowed: true });
    otherStore = await insertStore({ name: 'كشري الحادقة' });
    await sql("UPDATE stores SET zone_id = ?, lat = 29.3, lng = 30.82, payout_option = 'app_share', app_percent = 10 WHERE id = ?", [fayoum, store]);
    shawarma = await insertProduct(store, await insertCategory(store), 'شاورما فراخ', 85);
    const p1 = await insertUser('partner', '01000000002', PASSWORD);
    const p2 = await insertUser('partner', '01000000003', PASSWORD);
    await linkPartner(p1, store);
    await linkPartner(p2, otherStore);
    partner = await signIn('01000000002');
    rival = await signIn('01000000003');
    address = (await http().post('/v1/me/addresses').set(customer).send(ADDRESS).expect(201)).body.id;
  });
  afterEach(() => {
    for (const s of sockets.splice(0)) s.disconnect();
  });
  afterAll(async () => {
    await app.close();
  });

  it('a new order reaches only its own store\'s partners, live', async () => {
    await expect(connect(null)).rejects.toThrow();
    await expect(connect(customer)).rejects.toThrow();
    const mine = await connect(partner);
    const theirs = await connect(rival);
    const heard: unknown[] = [];
    theirs.on(ORDER_SOCKET_EVENTS.placed, (e) => heard.push(e));

    const arrived = new Promise<{ order: PartnerOrder }>((resolve) => mine.once(ORDER_SOCKET_EVENTS.placed, resolve));
    const id = await order();
    const { order: card } = await arrived;
    expect(card).toMatchObject({ id, code: String(100000 + id), status: 'pending_review', count: 2, itemsTotal: 170, note: '01021327197 ده رقم الاستلام', paymentMethod: 'cash' });

    const moved = new Promise((resolve) => mine.once(ORDER_SOCKET_EVENTS.status, resolve));
    await step(id, 'accept').expect(200);
    expect(await moved).toEqual({ id, status: 'preparing' });
    expect(heard).toEqual([]);
  });

  it('lists the store\'s orders by status and opens one with what the store needs', async () => {
    const id = await order();
    await order('pickup');
    const list = (await http().get('/v1/partner/orders?status=pending_review').set(partner).expect(200)).body;
    expect(list.map((o: PartnerOrder) => o.mode)).toEqual(['pickup', 'delivery']);
    expect((await http().get('/v1/partner/orders?status=preparing').set(partner).expect(200)).body).toEqual([]);
    expect((await http().get('/v1/partner/orders').set(rival).expect(200)).body).toEqual([]);
    await http().get('/v1/partner/orders').set(customer).expect(403);
    await http().get('/v1/partner/orders?status=lost').set(partner).expect(400);

    const details = (await http().get(`/v1/partner/orders/${id}`).set(partner).expect(200)).body;
    expect(details).toMatchObject({
      id,
      status: 'pending_review',
      mode: 'delivery',
      customer: { name: 'Test customer', phone: '01554459196' },
      itemsTotal: 170,
      deliveryFee: 30,
      total: 200,
      payoutOption: 'app_share',
      // 170 less the app's 10%.
      storeFromDriver: 153,
      driver: null,
      lines: [{ name: 'شاورما فراخ', quantity: 2, unitPrice: 85, options: [], removedIngredients: [] }],
    });
    expect(details.addressText).toContain('شارع 2');
    await http().get(`/v1/partner/orders/${id}`).set(rival).expect(404);
    await step(id, 'accept', rival).expect(404);
  });

  it('a delivery is accepted, then ready; each step only once, and the history is kept', async () => {
    const id = await order();
    await step(id, 'ready').expect(409).expect(({ body }) => expect(body.code).toBe('ORDER_STATUS'));
    expect((await step(id, 'accept').expect(200)).body).toMatchObject({ id, status: 'preparing' });
    await step(id, 'accept').expect(409);
    await step(id, 'reject').expect(409);
    expect((await step(id, 'ready').expect(200)).body.status).toBe('ready');
    // The delivery man takes a delivery from here (Phase 13); the store cannot close it.
    await step(id, 'collected').expect(409);
    await step(id, 'cook').expect(404);

    const events = await sql<{ status: string }[]>('SELECT status FROM order_events WHERE order_id = ? ORDER BY id', [id]);
    expect(events.map((e) => e.status)).toEqual(['pending_review', 'preparing', 'ready']);
    expect((await http().get('/v1/me/orders').set(customer).expect(200)).body[0].status).toBe('ready');
  });

  it('a pickup is closed by the store when the customer takes it; a rejected order stops there', async () => {
    const pickup = await order('pickup');
    await step(pickup, 'accept').expect(200);
    await step(pickup, 'ready').expect(200);
    expect((await step(pickup, 'collected').expect(200)).body.status).toBe('delivered');

    const refused = await order();
    expect((await step(refused, 'reject').expect(200)).body.status).toBe('rejected');
    await step(refused, 'accept').expect(409);

    const counts = (await http().get('/v1/partner/orders/counts').set(partner).expect(200)).body;
    expect(counts).toEqual({ pending_review: 0, preparing: 0, ready: 0, out_for_delivery: 0, delivered: 1, rejected: 1, cancelled: 0 });
  });

  it('racing taps on two phones move the order once', async () => {
    const id = await order();
    const [a, b] = await Promise.all([step(id, 'accept'), step(id, 'reject')]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    expect((await sql<unknown[]>('SELECT id FROM order_events WHERE order_id = ?', [id])).length).toBe(2);
  });

  it('the partner edits their own menu: categories, products, prices and availability', async () => {
    const categories = (await http().get('/v1/partner/categories').set(partner).expect(200)).body;
    expect(categories).toMatchObject([{ name: 'سندوتشات', productCount: 1 }]);
    const drinks = (await http().post('/v1/partner/categories').set(partner).send({ name: 'مشروبات' }).expect(201)).body;
    const cola = (
      await http().post('/v1/partner/products').set(partner).send({ categoryId: drinks.id, name: 'كولا', price: 15, active: true }).expect(201)
    ).body;
    expect(cola).toMatchObject({ storeId: store, name: 'كولا', price: 15 });
    expect((await http().patch(`/v1/partner/products/${shawarma}`).set(partner).send({ price: 90, active: false }).expect(200)).body).toMatchObject({
      price: 90,
      active: false,
    });
    await http().put('/v1/partner/categories/order').set(partner).send({ ids: [drinks.id, categories[0].id] }).expect(200);
    expect((await http().get('/v1/partner/products').set(partner).expect(200)).body.map((p: { name: string }) => p.name).sort()).toEqual(['شاورما فراخ', 'كولا']);

    // Another store's menu is out of reach.
    const theirs = await insertCategory(otherStore, 'كشري');
    const koshary = await insertProduct(otherStore, theirs, 'كشري وسط', 30);
    await http().patch(`/v1/partner/products/${koshary}`).set(partner).send({ price: 1 }).expect(404);
    await http().delete(`/v1/partner/products/${koshary}`).set(partner).expect(404);
    await http().patch(`/v1/partner/categories/${theirs}`).set(partner).send({ name: 'x' }).expect(404);
    await http().post('/v1/partner/products').set(partner).send({ categoryId: theirs, name: 'x', price: 1, active: true }).expect(400);
    await http().delete(`/v1/partner/products/${cola.id}`).set(partner).expect(204);
    await http().get('/v1/partner/products').set(rival).expect(200).expect(({ body }) => expect(body.map((p: { name: string }) => p.name)).toEqual(['كشري وسط']));
  });

  it('the partner sets hours, open now and the cover, and nothing the admin sets', async () => {
    const saved = await http().patch('/v1/partner/store').set(partner).send({ opensAt: '10:00', closesAt: '02:00', closedNow: true, cover: null }).expect(200);
    expect(saved.body).toMatchObject({ id: store, opensAt: '10:00', closesAt: '02:00', closedNow: true, cover: null, isOpen: false });
    await http().patch('/v1/partner/store').set(partner).send({ deliveryMinutes: 5 }).expect(400);
    await http().patch('/v1/partner/store').set(partner).send({ minimumOrder: 0 }).expect(400);
    await http().patch('/v1/partner/store').set(partner).send({ opensAt: '25:00' }).expect(400);
    const [row] = await sql<{ delivery_minutes: number }[]>('SELECT delivery_minutes FROM stores WHERE id = ?', [store]);
    expect(row!.delivery_minutes).toBe(25);
  });
});
