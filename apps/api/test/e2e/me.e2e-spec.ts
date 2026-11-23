import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from '../utils/app.js';
import { insertUser, resetDb } from '../utils/db.js';

const PASSWORD = 'secret123';

describe('/v1/me (e2e, contract §8.14 profile)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  async function signIn(phone: string) {
    const res = await http().post('/v1/auth/login').send({ phone, password: PASSWORD }).expect(201);
    return res.body as { accessToken: string; refreshToken: string };
  }

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await app.close();
  });

  it('returns the signed-in account without its password', async () => {
    await insertUser('customer', '01554459196', PASSWORD, 'ahmed@gmail.com');
    const { accessToken } = await signIn('01554459196');
    const res = await http().get('/v1/me').set('Authorization', `Bearer ${accessToken}`).expect(200);
    expect(res.body).toMatchObject({ phone: '01554459196', email: 'ahmed@gmail.com', role: 'customer' });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('updates email, gender and language; the name stays locked', async () => {
    await insertUser('customer', '01554459196', PASSWORD, 'ahmed@gmail.com');
    const { accessToken } = await signIn('01554459196');
    const res = await http()
      .patch('/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'New@Gmail.com', gender: 'male', locale: 'en' })
      .expect(200);
    expect(res.body).toMatchObject({ email: 'new@gmail.com', gender: 'male', locale: 'en' });
    await http().patch('/v1/me').set('Authorization', `Bearer ${accessToken}`).send({ firstName: 'x' }).expect(400);
  });

  it("refuses another account's email", async () => {
    await insertUser('customer', '01000000001', PASSWORD, 'taken@gmail.com');
    await insertUser('customer', '01554459196', PASSWORD, 'ahmed@gmail.com');
    const { accessToken } = await signIn('01554459196');
    const res = await http().patch('/v1/me').set('Authorization', `Bearer ${accessToken}`).send({ email: 'taken@gmail.com' }).expect(409);
    expect(res.body.code).toBe('EMAIL_TAKEN');
  });

  it('deletes a customer account with its password: sessions end and the phone is free again', async () => {
    await insertUser('customer', '01554459196', PASSWORD, 'ahmed@gmail.com');
    const { accessToken, refreshToken } = await signIn('01554459196');
    const wrong = await http().delete('/v1/me').set('Authorization', `Bearer ${accessToken}`).send({ password: 'wrongpass' }).expect(403);
    expect(wrong.body.code).toBe('WRONG_PASSWORD');

    await http().delete('/v1/me').set('Authorization', `Bearer ${accessToken}`).send({ password: PASSWORD }).expect(204);
    await http().get('/v1/me').set('Authorization', `Bearer ${accessToken}`).expect(401);
    await http().post('/v1/auth/refresh').send({ refreshToken }).expect(401);
    await http().post('/v1/auth/login').send({ phone: '01554459196', password: PASSWORD }).expect(401);
    await http().post('/v1/auth/signup/code').send({ phone: '01554459196', email: 'ahmed@gmail.com' }).expect(201);
  });

  it.each(['partner', 'driver', 'admin'] as const)('does not let a %s delete their account', async (role) => {
    await insertUser(role, '01011111111', PASSWORD);
    const { accessToken } = await signIn('01011111111');
    await http().delete('/v1/me').set('Authorization', `Bearer ${accessToken}`).send({ password: PASSWORD }).expect(403);
  });
});
