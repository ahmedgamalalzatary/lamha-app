import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from '../utils/app.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

const PASSWORD = 'secret123';

describe('/v1/admin/admins (e2e, contract §1.1 A23: admin accounts)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let token: string;
  let adminId: number;

  async function signIn(phone: string, password = PASSWORD) {
    const res = await http().post('/v1/auth/login').send({ phone, password }).expect(201);
    return res.body as { accessToken: string; refreshToken: string };
  }

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb();
    adminId = await insertUser('admin', '01000000001', PASSWORD);
    token = (await signIn('01000000001')).accessToken;
  });
  afterAll(async () => {
    await app.close();
  });

  it('lists only admin accounts, marking the signed-in one', async () => {
    await insertUser('partner', '01000000002', PASSWORD);
    const other = await insertUser('admin', '01000000009', PASSWORD);
    const res = await http().get('/v1/admin/admins').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body).toEqual([
      expect.objectContaining({ id: adminId, phone: '01000000001', role: 'admin', disabled: false, you: true }),
      expect.objectContaining({ id: other, phone: '01000000009', you: false }),
    ]);
    expect(res.body[0]).not.toHaveProperty('passwordHash');
  });

  it.each(['customer', 'partner', 'driver'] as const)('refuses a %s', async (role) => {
    await insertUser(role, '01011111111', PASSWORD);
    const { accessToken } = await signIn('01011111111');
    await http().get('/v1/admin/admins').set('Authorization', `Bearer ${accessToken}`).expect(403);
    await http().post('/v1/admin/admins').set('Authorization', `Bearer ${accessToken}`).send({ firstName: 'x', phone: '01022222222' }).expect(403);
  });

  it('creates an admin with a generated password, shown once, that signs in', async () => {
    const res = await http()
      .post('/v1/admin/admins')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: ' سارة ', lastName: 'علي', phone: '+20 155 445 9196' })
      .expect(201);
    expect(res.body.account).toMatchObject({ role: 'admin', phone: '01554459196', firstName: 'سارة', lastName: 'علي', disabled: false });
    expect(res.body.password).toMatch(/^\S{10,}$/);
    await signIn('01554459196', res.body.password);
  });

  it('refuses a phone that already has an account', async () => {
    await insertUser('customer', '01554459196', PASSWORD);
    const res = await http().post('/v1/admin/admins').set('Authorization', `Bearer ${token}`).send({ firstName: 'سارة', phone: '01554459196' }).expect(409);
    expect(res.body.code).toBe('PHONE_TAKEN');
  });

  it('validates the name and phone', async () => {
    await http().post('/v1/admin/admins').set('Authorization', `Bearer ${token}`).send({ firstName: '', phone: '0123' }).expect(400);
  });

  it('resets a password: the old one and its sessions stop working', async () => {
    const other = await insertUser('admin', '01000000009', PASSWORD);
    const old = await signIn('01000000009');
    const res = await http().post(`/v1/admin/admins/${other}/password`).set('Authorization', `Bearer ${token}`).expect(201);
    expect(res.body.password).toMatch(/^\S{10,}$/);
    await http().post('/v1/auth/login').send({ phone: '01000000009', password: PASSWORD }).expect(401);
    await http().get('/v1/me').set('Authorization', `Bearer ${old.accessToken}`).expect(401);
    await http().post('/v1/auth/refresh').send({ refreshToken: old.refreshToken }).expect(401);
    await signIn('01000000009', res.body.password);
  });

  it('disables and enables an admin; a disabled one is signed out at once', async () => {
    const other = await insertUser('admin', '01000000009', PASSWORD);
    const session = await signIn('01000000009');
    const off = await http().patch(`/v1/admin/admins/${other}`).set('Authorization', `Bearer ${token}`).send({ disabled: true }).expect(200);
    expect(off.body).toMatchObject({ id: other, disabled: true });
    await http().get('/v1/me').set('Authorization', `Bearer ${session.accessToken}`).expect(401);
    await http().post('/v1/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);
    expect((await http().post('/v1/auth/login').send({ phone: '01000000009', password: PASSWORD }).expect(403)).body.code).toBe('ACCOUNT_DISABLED');

    const on = await http().patch(`/v1/admin/admins/${other}`).set('Authorization', `Bearer ${token}`).send({ disabled: false }).expect(200);
    expect(on.body.disabled).toBe(false);
    await signIn('01000000009');
  });

  it('does not let an admin reset or disable their own account, so one admin always stays', async () => {
    const reset = await http().post(`/v1/admin/admins/${adminId}/password`).set('Authorization', `Bearer ${token}`).expect(400);
    expect(reset.body.code).toBe('OWN_ACCOUNT');
    const off = await http().patch(`/v1/admin/admins/${adminId}`).set('Authorization', `Bearer ${token}`).send({ disabled: true }).expect(400);
    expect(off.body.code).toBe('OWN_ACCOUNT');
  });

  it('answers 404 for an account that is not an admin', async () => {
    const partner = await insertUser('partner', '01000000002', PASSWORD);
    const res = await http().post(`/v1/admin/admins/${partner}/password`).set('Authorization', `Bearer ${token}`).expect(404);
    expect(res.body.code).toBe('ACCOUNT_NOT_FOUND');
    await http().patch('/v1/admin/admins/999').set('Authorization', `Bearer ${token}`).send({ disabled: true }).expect(404);
    const [row] = await sql<{ disabled_at: Date | null }[]>('SELECT disabled_at FROM users WHERE id = ?', [partner]);
    expect(row?.disabled_at).toBeNull();
  });
});
