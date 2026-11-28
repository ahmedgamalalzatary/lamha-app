import type { INestApplication } from '@nestjs/common';
import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from '../utils/app.js';
import { insertStore } from '../utils/catalog.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

const PASSWORD = 'secret123';

describe('cuisines, home tiles and uploads (e2e, contract §8.2, §8.3, §1.1 A12)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let token: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb();
    await insertUser('admin', '01000000001', PASSWORD);
    token = (await http().post('/v1/auth/login').send({ phone: '01000000001', password: PASSWORD })).body.accessToken;
  });
  afterAll(async () => {
    await app.close();
  });

  describe('/v1/admin/cuisines', () => {
    it('adds at the end, edits, reorders and deletes (the store loses the link)', async () => {
      const a = (await http().post('/v1/admin/cuisines').set(auth()).send({ name: 'بروست', image: null }).expect(201)).body;
      const b = (await http().post('/v1/admin/cuisines').set(auth()).send({ name: 'باستا' }).expect(201)).body;
      expect([a.sortOrder, b.sortOrder]).toEqual([0, 1]);
      await http().patch(`/v1/admin/cuisines/${a.id}`).set(auth()).send({ name: 'اكل صحى' }).expect(200);
      const ordered = await http().put('/v1/admin/cuisines/order').set(auth()).send({ ids: [b.id, a.id] }).expect(200);
      expect(ordered.body.map((c: { name: string }) => c.name)).toEqual(['باستا', 'اكل صحى']);

      const store = await insertStore();
      await sql('INSERT INTO store_cuisines (store_id, cuisine_id) VALUES (?, ?)', [store, b.id]);
      await http().delete(`/v1/admin/cuisines/${b.id}`).set(auth()).expect(204);
      expect(await sql<unknown[]>('SELECT * FROM store_cuisines')).toHaveLength(0);
    });
  });

  describe('/v1/admin/home-tiles', () => {
    it('adds tiles that open a vertical or a store, and reorders them', async () => {
      const store = await insertStore({ name: 'Maky' });
      const a = (
        await http().post('/v1/admin/home-tiles').set(auth()).send({ label: 'المطاعم', row: 'fixed', targetVertical: 'restaurant', badge: null }).expect(201)
      ).body;
      const b = (
        await http().post('/v1/admin/home-tiles').set(auth()).send({ label: 'Maky', row: 'scroll', targetStoreId: store, badge: 'الماكيز' }).expect(201)
      ).body;
      expect(b).toMatchObject({ targetStoreId: store, targetVertical: null, badge: 'الماكيز' });

      await http().patch(`/v1/admin/home-tiles/${a.id}`).set(auth()).send({ badge: 'سريع' }).expect(200);
      const ordered = await http().put('/v1/admin/home-tiles/order').set(auth()).send({ ids: [b.id, a.id] }).expect(200);
      // Each row keeps its own sequence; the list comes back row by row.
      expect(ordered.body.map((t: { id: number; sortOrder: number }) => [t.id, t.sortOrder])).toEqual([
        [a.id, 1],
        [b.id, 0],
      ]);
      await http().delete(`/v1/admin/home-tiles/${b.id}`).set(auth()).expect(204);
    });

    it('needs exactly one target that exists', async () => {
      const both = await http()
        .post('/v1/admin/home-tiles')
        .set(auth())
        .send({ label: 'x', row: 'fixed', targetVertical: 'restaurant', targetStoreId: 1 })
        .expect(400);
      expect(both.body.code).toBe('TILE_TARGET');
      const none = await http().post('/v1/admin/home-tiles').set(auth()).send({ label: 'x', row: 'fixed' }).expect(400);
      expect(none.body.code).toBe('TILE_TARGET');
      await http().post('/v1/admin/home-tiles').set(auth()).send({ label: 'x', row: 'fixed', targetStoreId: 9999 }).expect(404);
    });
  });

  describe('/v1/admin/home-sections (L1 #2, coloured store sections)', () => {
    const section = (storeIds: number[], extra: Record<string, unknown> = {}) => ({
      title: 'الأكثر طلباً 🔥',
      image: null,
      background: '#E8A33D',
      ink: '#3A1E00',
      storeIds,
      ...extra,
    });

    it('adds sections at the end with their stores in order, edits, reorders and deletes them', async () => {
      const [x, y] = [await insertStore({ name: 'شاورما الساقية' }), await insertStore({ name: 'كشري الحادقة' })];
      const a = (await http().post('/v1/admin/home-sections').set(auth()).send(section([y, x])).expect(201)).body;
      expect(a).toMatchObject({ title: 'الأكثر طلباً 🔥', background: '#E8A33D', ink: '#3A1E00', storeIds: [y, x], sortOrder: 0 });
      const b = (await http().post('/v1/admin/home-sections').set(auth()).send(section([x], { title: 'الجديد' })).expect(201)).body;
      expect(b.sortOrder).toBe(1);

      const edited = (await http().patch(`/v1/admin/home-sections/${a.id}`).set(auth()).send({ storeIds: [x], ink: '#FFFFFF' }).expect(200)).body;
      expect(edited).toMatchObject({ storeIds: [x], ink: '#FFFFFF', title: 'الأكثر طلباً 🔥' });

      const ordered = await http().put('/v1/admin/home-sections/order').set(auth()).send({ ids: [b.id, a.id] }).expect(200);
      expect(ordered.body.map((s: { title: string }) => s.title)).toEqual(['الجديد', 'الأكثر طلباً 🔥']);

      await http().delete(`/v1/admin/home-sections/${b.id}`).set(auth()).expect(204);
      expect((await http().get('/v1/admin/home-sections').set(auth()).expect(200)).body).toHaveLength(1);
    });

    it('refuses a missing store, a repeated store, a colour that is not #RRGGBB, and an unknown section', async () => {
      const x = await insertStore();
      await http().post('/v1/admin/home-sections').set(auth()).send(section([9999])).expect(404);
      await http().post('/v1/admin/home-sections').set(auth()).send(section([x, x])).expect(400);
      await http().post('/v1/admin/home-sections').set(auth()).send(section([])).expect(400);
      await http().post('/v1/admin/home-sections').set(auth()).send(section([x], { background: 'orange' })).expect(400);
      await http().patch('/v1/admin/home-sections/9999').set(auth()).send({ title: 'x' }).expect(404);
    });

    it('drops a deleted store from its sections', async () => {
      const [x, y] = [await insertStore(), await insertStore()];
      const a = (await http().post('/v1/admin/home-sections').set(auth()).send(section([x, y])).expect(201)).body;
      await sql('DELETE FROM stores WHERE id = ?', [x]);
      const [after] = (await http().get('/v1/admin/home-sections').set(auth()).expect(200)).body;
      expect(after).toMatchObject({ id: a.id, storeIds: [y] });
    });

    it('is for admins only', async () => {
      await insertUser('customer', '01000000002', PASSWORD);
      const customer = (await http().post('/v1/auth/login').send({ phone: '01000000002', password: PASSWORD })).body.accessToken;
      await http().get('/v1/admin/home-sections').set({ Authorization: `Bearer ${customer}` }).expect(403);
    });
  });

  describe('/v1/admin/uploads', () => {
    it('stores a photo as a JPEG no larger than 1600 px and returns its path', async () => {
      const png = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: '#F68B1D' } }).png().toBuffer();
      const res = await http().post('/v1/admin/uploads').set(auth()).attach('image', png, { filename: 'cover.png', contentType: 'image/png' }).expect(201);
      expect(res.body.url).toMatch(/^\/uploads\/catalog\/[0-9a-f-]{36}\.jpg$/);

      const name = path.basename(res.body.url);
      expect(await readdir(path.resolve('uploads/catalog'))).toContain(name);
      const meta = await sharp(path.resolve('uploads/catalog', name)).metadata();
      expect([meta.format, meta.width, meta.height]).toEqual(['jpeg', 1600, 800]);

      const served = await http().get(res.body.url).expect(200);
      expect(served.headers['content-type']).toBe('image/jpeg');
      // The tests share the dev uploads folder: leave nothing behind.
      await unlink(path.resolve('uploads/catalog', name));
    });

    it('refuses a file that is not an image', async () => {
      const res = await http()
        .post('/v1/admin/uploads')
        .set(auth())
        .attach('image', Buffer.from('not an image'), { filename: 'x.png', contentType: 'image/png' })
        .expect(400);
      expect(res.body.code).toBe('IMAGE_INVALID');
      await http().post('/v1/admin/uploads').set(auth()).expect(400);
    });

    it('is for admins only', async () => {
      await insertUser('partner', '01000000002', PASSWORD);
      const partner = (await http().post('/v1/auth/login').send({ phone: '01000000002', password: PASSWORD })).body.accessToken;
      await http().post('/v1/admin/uploads').set('Authorization', `Bearer ${partner}`).expect(403);
    });
  });
});
