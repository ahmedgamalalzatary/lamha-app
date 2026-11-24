import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from '../utils/app.js';
import { insertStore, linkPartner } from '../utils/catalog.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

const PASSWORD = 'secret123';

describe('partner accounts and the store guard (e2e, contract §2, §11.1, §11.2)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let token: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  let store: number;
  let partner: number;

  const signIn = async (phone: string, password = PASSWORD) =>
    (await http().post('/v1/auth/login').send({ phone, password }).expect(201)).body.accessToken as string;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb();
    await insertUser('admin', '01000000001', PASSWORD);
    token = await signIn('01000000001');
    store = await insertStore({ name: 'شاورما الساقية' });
    partner = await insertUser('partner', '01000000002', PASSWORD);
    await linkPartner(partner, store);
  });
  afterAll(async () => {
    await app.close();
  });

  describe('/v1/admin/partners', () => {
    it('lists partners with their store and searches by name, phone or store', async () => {
      const other = await insertStore({ name: 'كشري الحادقة' });
      const p2 = await insertUser('partner', '01000000012', PASSWORD);
      await linkPartner(p2, other);
      await insertUser('driver', '01000000003', PASSWORD);

      const all = await http().get('/v1/admin/partners').set(auth()).expect(200);
      expect(all.body).toEqual([
        expect.objectContaining({ id: partner, role: 'partner', store: { id: store, name: 'شاورما الساقية' } }),
        expect.objectContaining({ id: p2, store: { id: other, name: 'كشري الحادقة' } }),
      ]);
      const byStore = await http().get(`/v1/admin/partners?q=${encodeURIComponent('كشري')}`).set(auth()).expect(200);
      expect(byStore.body.map((p: { id: number }) => p.id)).toEqual([p2]);
      const byPhone = await http().get('/v1/admin/partners?q=0002').set(auth()).expect(200);
      expect(byPhone.body.map((p: { id: number }) => p.id)).toEqual([partner]);
      const byStoreId = await http().get(`/v1/admin/partners?storeId=${other}`).set(auth()).expect(200);
      expect(byStoreId.body.map((p: { id: number }) => p.id)).toEqual([p2]);
      // The full name as the card shows it, first and family name together.
      await sql("UPDATE users SET first_name = 'Ahmed', last_name = 'Ali' WHERE id = ?", [p2]);
      const byFullName = await http().get(`/v1/admin/partners?q=${encodeURIComponent('Ahmed Ali')}`).set(auth()).expect(200);
      expect(byFullName.body.map((p: { id: number }) => p.id)).toEqual([p2]);
    });

    it('adds another account to a store; its generated password signs in', async () => {
      const res = await http()
        .post('/v1/admin/partners')
        .set(auth())
        .send({ storeId: store, firstName: 'منى', phone: '01554459196' })
        .expect(201);
      expect(res.body.account).toMatchObject({ phone: '01554459196', role: 'partner', store: { id: store } });
      await signIn('01554459196', res.body.password);
      await http().post('/v1/admin/partners').set(auth()).send({ storeId: 9999, firstName: 'x', phone: '01554459197' }).expect(404);
    });

    it('resets the password (old sessions end) and disables the account', async () => {
      const old = await signIn('01000000002');
      const reset = await http().post(`/v1/admin/partners/${partner}/password`).set(auth()).expect(201);
      await signIn('01000000002', reset.body.password);
      await http().get('/v1/me').set('Authorization', `Bearer ${old}`).expect(401);

      const off = await http().patch(`/v1/admin/partners/${partner}`).set(auth()).send({ disabled: true }).expect(200);
      expect(off.body.disabled).toBe(true);
      await http().post('/v1/auth/login').send({ phone: '01000000002', password: reset.body.password }).expect(403);
    });

    it('only touches partner accounts', async () => {
      const driver = await insertUser('driver', '01000000003', PASSWORD);
      await http().post(`/v1/admin/partners/${driver}/password`).set(auth()).expect(404);
      await http().patch(`/v1/admin/partners/${driver}`).set(auth()).send({ disabled: true }).expect(404);
    });
  });

  describe('/v1/partner/store (the store guard)', () => {
    it("gives a partner their own store's settings", async () => {
      const res = await http().get('/v1/partner/store').set('Authorization', `Bearer ${await signIn('01000000002')}`).expect(200);
      expect(res.body).toMatchObject({ id: store, name: 'شاورما الساقية', isOpen: true });
      expect(res.body).not.toHaveProperty('partners');
    });

    it('refuses a partner without a store', async () => {
      await sql('UPDATE users SET store_id = NULL WHERE id = ?', [partner]);
      const res = await http().get('/v1/partner/store').set('Authorization', `Bearer ${await signIn('01000000002')}`).expect(403);
      expect(res.body.code).toBe('NO_STORE');
    });

    it.each(['customer', 'driver', 'admin'] as const)('refuses a %s', async (role) => {
      await insertUser(role, '01011111111', PASSWORD);
      await http().get('/v1/partner/store').set('Authorization', `Bearer ${await signIn('01011111111')}`).expect(403);
    });
  });
});
