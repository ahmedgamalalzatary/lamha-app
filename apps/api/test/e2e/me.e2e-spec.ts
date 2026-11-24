import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { existsSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { createTestApp, lastCodeTo, mailbox } from '../utils/app.js';
import type { ResultSetHeader } from 'mysql2/promise';
import { insertStore } from '../utils/catalog.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

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
    mailbox.length = 0;
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

  it('updates gender and language; the name stays locked', async () => {
    await insertUser('customer', '01554459196', PASSWORD, 'ahmed@gmail.com');
    const { accessToken } = await signIn('01554459196');
    const res = await http()
      .patch('/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ gender: 'male', locale: 'en' })
      .expect(200);
    expect(res.body).toMatchObject({ email: 'ahmed@gmail.com', gender: 'male', locale: 'en' });
    await http().patch('/v1/me').set('Authorization', `Bearer ${accessToken}`).send({ firstName: 'x' }).expect(400);
  });

  it('changes the recovery email only with a code sent to the new address, and tells the old one (review F01)', async () => {
    await insertUser('customer', '01554459196', PASSWORD, 'ahmed@gmail.com');
    await insertUser('customer', '01000000009', PASSWORD, 'taken@gmail.com');
    const { accessToken } = await signIn('01554459196');
    const auth = { Authorization: `Bearer ${accessToken}` };

    // The profile save no longer moves the email, and it can never be removed.
    await http().patch('/v1/me').set(auth).send({ email: 'new@gmail.com' }).expect(400);
    await http().post('/v1/me/email/code').set(auth).send({ email: null }).expect(400);
    const taken = await http().post('/v1/me/email/code').set(auth).send({ email: 'taken@gmail.com' }).expect(409);
    expect(taken.body.code).toBe('EMAIL_TAKEN');

    const sent = await http().post('/v1/me/email/code').set(auth).send({ email: 'New@Gmail.com' }).expect(201);
    expect(sent.body).toEqual({ email: 'new@gmail.com', resendIn: 59 });
    const code = lastCodeTo('new@gmail.com');
    // Another address cannot borrow the code.
    await http().post('/v1/me/email').set(auth).send({ email: 'other@gmail.com', code }).expect(400);
    expect((await http().get('/v1/me').set(auth).expect(200)).body.email).toBe('ahmed@gmail.com');

    const res = await http().post('/v1/me/email').set(auth).send({ email: 'new@gmail.com', code }).expect(201);
    expect(res.body.email).toBe('new@gmail.com');
    expect(mailbox.at(-1)?.to).toBe('ahmed@gmail.com');
    await http().post('/v1/me/email').set(auth).send({ email: 'new@gmail.com', code }).expect(400);
  });

  it('answers 409, not a server error, when two sign-ups take the same email at the same moment (review F12)', async () => {
    for (const [i, phone] of ['01000000001', '01000000002'].entries()) {
      await http().post('/v1/auth/signup/code').send({ phone, email: 'same@gmail.com' }).expect(201);
      mailbox[i] = mailbox.at(-1)!;
    }
    const tickets = await Promise.all(
      ['01000000001', '01000000002'].map(async (phone, i) => {
        const code = mailbox[i]!.text.match(/\b\d{4}\b/)![0];
        return (await http().post('/v1/auth/code/verify').send({ phone, purpose: 'signup', code }).expect(201)).body.ticket as string;
      }),
    );
    const res = await Promise.all(
      tickets.map((ticket) => http().post('/v1/auth/signup').send({ ticket, firstName: 'احمد', lastName: 'علي', password: PASSWORD })),
    );
    expect(res.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(res.find((r) => r.status === 409)?.body.code).toBe('EMAIL_TAKEN');
  });

  it('deletes a customer account with its password: sessions end, addresses go and the phone is free again', async () => {
    const id = await insertUser('customer', '01554459196', PASSWORD, 'ahmed@gmail.com');
    const zone = await sql<ResultSetHeader>(`INSERT INTO zones (name, polygon) VALUES ('الفيوم', '[]')`);
    await sql(
      "INSERT INTO addresses (user_id, zone_id, type, apartment, landmark, phone, lat, lng) VALUES (?, ?, 'apartment', '2', 'علامه', '01554459196', 29.3, 30.8)",
      [id, zone.insertId],
    );
    const store = await insertStore();
    await sql('INSERT INTO favorite_stores (user_id, store_id) VALUES (?, ?)', [id, store]);
    const { accessToken, refreshToken } = await signIn('01554459196');
    await http().post('/v1/me/phone/code').set('Authorization', `Bearer ${accessToken}`).send({ phone: '01550000001' }).expect(201);
    const wrong = await http().delete('/v1/me').set('Authorization', `Bearer ${accessToken}`).send({ password: 'wrongpass' }).expect(403);
    expect(wrong.body.code).toBe('WRONG_PASSWORD');

    await http().delete('/v1/me').set('Authorization', `Bearer ${accessToken}`).send({ password: PASSWORD }).expect(204);
    await http().get('/v1/me').set('Authorization', `Bearer ${accessToken}`).expect(401);
    await http().post('/v1/auth/refresh').send({ refreshToken }).expect(401);
    expect(await sql<unknown[]>('SELECT id FROM addresses WHERE user_id = ?', [id])).toHaveLength(0);
    // Its favourites and the codes sent to its phone or email go too (review F13).
    expect(await sql<unknown[]>('SELECT store_id FROM favorite_stores WHERE user_id = ?', [id])).toHaveLength(0);
    expect(await sql<unknown[]>("SELECT id FROM otp_codes WHERE phone = '01554459196' OR email = 'ahmed@gmail.com'")).toHaveLength(0);
    await http().post('/v1/auth/login').send({ phone: '01554459196', password: PASSWORD }).expect(401);
    await http().post('/v1/auth/signup/code').send({ phone: '01554459196', email: 'ahmed@gmail.com' }).expect(201);
  });

  it.each(['partner', 'driver', 'admin'] as const)('does not let a %s delete their account', async (role) => {
    await insertUser(role, '01011111111', PASSWORD);
    const { accessToken } = await signIn('01011111111');
    await http().delete('/v1/me').set('Authorization', `Bearer ${accessToken}`).send({ password: PASSWORD }).expect(403);
  });

  it('changes the phone ("تغيير" sheet): the code for the new number goes to the account email, never by SMS', async () => {
    await insertUser('customer', '01554459196', PASSWORD, 'ahmed@gmail.com');
    await insertUser('customer', '01000000009', PASSWORD, 'taken@gmail.com');
    const { accessToken } = await signIn('01554459196');
    const auth = { Authorization: `Bearer ${accessToken}` };

    const taken = await http().post('/v1/me/phone/code').set(auth).send({ phone: '01000000009' }).expect(409);
    expect(taken.body.code).toBe('PHONE_TAKEN');
    const sent = await http().post('/v1/me/phone/code').set(auth).send({ phone: '+20 155 000 0001' }).expect(201);
    expect(sent.body).toEqual({ email: 'a***d@gmail.com', resendIn: 59 });
    const code = lastCodeTo('ahmed@gmail.com');

    const wrong = await http().post('/v1/me/phone').set(auth).send({ phone: '01550000001', code: code === '1111' ? '2222' : '1111' }).expect(400);
    expect(wrong.body.code).toBe('OTP_WRONG');
    const res = await http().post('/v1/me/phone').set(auth).send({ phone: '01550000001', code }).expect(201);
    expect(res.body.phone).toBe('01550000001');
    // The new number signs in; the code was used up.
    await signIn('01550000001');
    await http().post('/v1/me/phone').set(auth).send({ phone: '01550000001', code }).expect(400);
  });

  it('keeps each phone-change code to the account that asked: two customers can ask for the same number (review F05)', async () => {
    await insertUser('customer', '01554459196', PASSWORD, 'ahmed@gmail.com');
    await insertUser('customer', '01000000009', PASSWORD, 'other@gmail.com');
    const mine = { Authorization: `Bearer ${(await signIn('01554459196')).accessToken}` };
    const theirs = { Authorization: `Bearer ${(await signIn('01000000009')).accessToken}` };

    await http().post('/v1/me/phone/code').set(mine).send({ phone: '01550000001' }).expect(201);
    // The other customer's request neither waits on mine nor replaces my code.
    await http().post('/v1/me/phone/code').set(theirs).send({ phone: '01550000001' }).expect(201);
    const theirCode = lastCodeTo('other@gmail.com');
    const myCode = lastCodeTo('ahmed@gmail.com');
    if (theirCode !== myCode) await http().post('/v1/me/phone').set(mine).send({ phone: '01550000001', code: theirCode }).expect(400);
    const res = await http().post('/v1/me/phone').set(mine).send({ phone: '01550000001', code: myCode }).expect(201);
    expect(res.body.phone).toBe('01550000001');
  });

  it('sets the avatar from a photo ("اختر صورة")', async () => {
    await insertUser('customer', '01554459196', PASSWORD, 'ahmed@gmail.com');
    const { accessToken } = await signIn('01554459196');
    const png = await sharp({ create: { width: 900, height: 900, channels: 3, background: '#F68B1D' } }).png().toBuffer();
    const res = await http()
      .post('/v1/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('image', png, { filename: 'me.png', contentType: 'image/png' })
      .expect(201);
    expect(res.body.avatar).toMatch(/^\/uploads\/avatars\/[\w-]+\.jpg$/);
    const me = await http().get('/v1/me').set('Authorization', `Bearer ${accessToken}`).expect(200);
    expect(me.body.avatar).toBe(res.body.avatar);

    // A new photo removes the old file, and so does deleting the account (review F13).
    const next = await http()
      .post('/v1/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('image', png, { filename: 'me.png', contentType: 'image/png' })
      .expect(201);
    const first = path.resolve(res.body.avatar.slice(1));
    const latest = path.resolve(next.body.avatar.slice(1));
    try {
      expect(existsSync(first)).toBe(false);
      expect(existsSync(latest)).toBe(true);
      await http().delete('/v1/me').set('Authorization', `Bearer ${accessToken}`).send({ password: PASSWORD }).expect(204);
      expect(existsSync(latest)).toBe(false);
    } finally {
      // The test API saves into the dev uploads folder: leave nothing behind.
      for (const file of [first, latest]) if (existsSync(file)) await unlink(file);
    }
  });
});
