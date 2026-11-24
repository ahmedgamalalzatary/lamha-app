import type { INestApplication } from '@nestjs/common';
import type { AuthResponse } from '@tawsela/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp, lastCodeTo, mailbox } from '../utils/app.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

const PASSWORD = 'secret123';

describe('Accounts (e2e, contract §8.1)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  /** Phone + email → emailed code → ticket → personal details. */
  async function signUp(phone: string, email: string, extra: Record<string, unknown> = {}): Promise<AuthResponse> {
    await http().post('/v1/auth/signup/code').send({ phone, email }).expect(201);
    const { body } = await http()
      .post('/v1/auth/code/verify')
      .send({ phone, purpose: 'signup', code: lastCodeTo(email) })
      .expect(201);
    const res = await http()
      .post('/v1/auth/signup')
      .send({ ticket: body.ticket, firstName: 'احمد', lastName: 'الزعتري', password: PASSWORD, ...extra })
      .expect(201);
    return res.body;
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

  describe('sign-up', () => {
    it('emails a 4-digit code and creates a customer with an invite code', async () => {
      const res = await http().post('/v1/auth/signup/code').send({ phone: '+20 101 234 5678', email: 'Other@Gmail.com' }).expect(201);
      expect(res.body).toEqual({ email: 'other@gmail.com', resendIn: 59 });
      expect(mailbox.at(-1)?.to).toBe('other@gmail.com');
      await http()
        .post('/v1/auth/code/verify')
        .send({ phone: '01012345678', purpose: 'signup', code: lastCodeTo('other@gmail.com') })
        .expect(201);

      const auth = await signUp('01554459196', 'ahmed@gmail.com');
      expect(auth.user).toMatchObject({
        role: 'customer',
        phone: '01554459196',
        email: 'ahmed@gmail.com',
        firstName: 'احمد',
        lastName: 'الزعتري',
        locale: 'ar',
      });
      expect(auth.user.inviteCode).toMatch(/^[A-Z0-9]{6}$/);
      expect(auth.accessToken).toBeTruthy();
      expect(auth.refreshToken).toBeTruthy();
    });

    it('refuses a phone or an email that is already used', async () => {
      await signUp('01554459196', 'ahmed@gmail.com');
      const phone = await http().post('/v1/auth/signup/code').send({ phone: '01554459196', email: 'new@gmail.com' }).expect(409);
      expect(phone.body.code).toBe('PHONE_TAKEN');
      const email = await http().post('/v1/auth/signup/code').send({ phone: '01012345678', email: 'ahmed@gmail.com' }).expect(409);
      expect(email.body.code).toBe('EMAIL_TAKEN');
    });

    it('refuses a partner or driver phone: they never sign up (contract §2)', async () => {
      await insertUser('partner', '01011111111', PASSWORD);
      await insertUser('driver', '01022222222', PASSWORD);
      for (const phone of ['01011111111', '01022222222']) {
        const res = await http().post('/v1/auth/signup/code').send({ phone, email: `${phone}@x.com` }).expect(409);
        expect(res.body.code).toBe('PHONE_TAKEN');
      }
    });

    it('refuses a bad phone, a bad email and unknown fields', async () => {
      await http().post('/v1/auth/signup/code').send({ phone: '0123', email: 'a@b.co' }).expect(400);
      await http().post('/v1/auth/signup/code').send({ phone: '01012345678', email: 'nope' }).expect(400);
      await http().post('/v1/auth/signup/code').send({ phone: '01012345678', email: 'a@b.co', role: 'admin' }).expect(400);
    });

    it('waits 59 seconds before another code', async () => {
      await http().post('/v1/auth/signup/code').send({ phone: '01012345678', email: 'a@b.co' }).expect(201);
      const res = await http().post('/v1/auth/signup/code').send({ phone: '01012345678', email: 'a@b.co' }).expect(429);
      expect(res.body.code).toBe('OTP_TOO_SOON');
      expect(res.body.retryIn).toBeGreaterThan(50);
    });

    it('counts wrong codes and locks after 5', async () => {
      await http().post('/v1/auth/signup/code').send({ phone: '01012345678', email: 'a@b.co' }).expect(201);
      const right = lastCodeTo('a@b.co');
      const wrong = right === '0000' ? '1111' : '0000';
      const first = await http().post('/v1/auth/code/verify').send({ phone: '01012345678', purpose: 'signup', code: wrong }).expect(400);
      expect(first.body).toMatchObject({ code: 'OTP_WRONG', triesLeft: 4 });
      for (let i = 0; i < 4; i++) await http().post('/v1/auth/code/verify').send({ phone: '01012345678', purpose: 'signup', code: wrong });
      const locked = await http().post('/v1/auth/code/verify').send({ phone: '01012345678', purpose: 'signup', code: right }).expect(429);
      expect(locked.body.code).toBe('OTP_LOCKED');
    });

    it('counts guesses sent at the same moment too: 10 at once use up the 5 tries', async () => {
      await http().post('/v1/auth/signup/code').send({ phone: '01012345678', email: 'a@b.co' }).expect(201);
      const right = lastCodeTo('a@b.co');
      const wrong = right === '0000' ? '1111' : '0000';
      const guesses = await Promise.all(
        Array.from({ length: 10 }, () => http().post('/v1/auth/code/verify').send({ phone: '01012345678', purpose: 'signup', code: wrong })),
      );
      expect(guesses.filter((r) => r.body.code === 'OTP_WRONG')).toHaveLength(5);
      const locked = await http().post('/v1/auth/code/verify').send({ phone: '01012345678', purpose: 'signup', code: right }).expect(429);
      expect(locked.body.code).toBe('OTP_LOCKED');
    });

    it('refuses an expired code', async () => {
      await http().post('/v1/auth/signup/code').send({ phone: '01012345678', email: 'a@b.co' }).expect(201);
      // The app stores UTC (core/db); this connection may run in Cairo time.
      await sql('UPDATE otp_codes SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 SECOND');
      const res = await http()
        .post('/v1/auth/code/verify')
        .send({ phone: '01012345678', purpose: 'signup', code: lastCodeTo('a@b.co') })
        .expect(400);
      expect(res.body.code).toBe('OTP_EXPIRED');
    });

    it('uses a code only once', async () => {
      await http().post('/v1/auth/signup/code').send({ phone: '01012345678', email: 'a@b.co' }).expect(201);
      const code = lastCodeTo('a@b.co');
      await http().post('/v1/auth/code/verify').send({ phone: '01012345678', purpose: 'signup', code }).expect(201);
      await http().post('/v1/auth/code/verify').send({ phone: '01012345678', purpose: 'signup', code }).expect(400);
    });

    it('refuses to finish without a valid ticket, or with a short password', async () => {
      await http()
        .post('/v1/auth/signup')
        .send({ ticket: 'forged', firstName: 'a', lastName: 'b', password: PASSWORD })
        .expect(401);
      await http().post('/v1/auth/signup/code').send({ phone: '01012345678', email: 'a@b.co' }).expect(201);
      const { body } = await http()
        .post('/v1/auth/code/verify')
        .send({ phone: '01012345678', purpose: 'signup', code: lastCodeTo('a@b.co') });
      await http().post('/v1/auth/signup').send({ ticket: body.ticket, firstName: 'a', lastName: 'b', password: '1234567' }).expect(400);
    });

    it('links the friend whose invite code was typed', async () => {
      const friend = await signUp('01554459196', 'friend@gmail.com');
      const me = await signUp('01012345678', 'me@gmail.com', { inviteCode: friend.user.inviteCode!.toLowerCase() });
      const [row] = await sql<{ invited_by_id: number }[]>('SELECT invited_by_id FROM users WHERE id = ?', [me.user.id]);
      expect(row!.invited_by_id).toBe(friend.user.id);
    });

    it('refuses an invite code nobody has', async () => {
      await http().post('/v1/auth/signup/code').send({ phone: '01012345678', email: 'a@b.co' }).expect(201);
      const { body } = await http()
        .post('/v1/auth/code/verify')
        .send({ phone: '01012345678', purpose: 'signup', code: lastCodeTo('a@b.co') });
      const res = await http()
        .post('/v1/auth/signup')
        .send({ ticket: body.ticket, firstName: 'a', lastName: 'b', password: PASSWORD, inviteCode: 'ZZZZZZ' })
        .expect(400);
      expect(res.body.code).toBe('INVITE_CODE_INVALID');
    });
  });

  describe('sign-in', () => {
    it('tells the phone step whether the phone has an account, as Tawsilty does', async () => {
      await insertUser('partner', '01000000002', PASSWORD);
      const deleted = await insertUser('customer', '01000000005', PASSWORD, 'd@x.com');
      await sql('UPDATE users SET deleted_at = NOW() WHERE id = ?', [deleted]);
      const ask = (phone: string) => http().post('/v1/auth/phone').send({ phone }).expect(201);
      expect((await ask('+20 100 000 0002')).body).toEqual({ registered: true });
      expect((await ask('01099999999')).body).toEqual({ registered: false });
      expect((await ask('01000000005')).body).toEqual({ registered: false });
      await http().post('/v1/auth/phone').send({ phone: '123' }).expect(400);
    });

    it('signs every role in with phone + password', async () => {
      for (const [role, phone] of [['customer', '01000000001'], ['partner', '01000000002'], ['driver', '01000000003'], ['admin', '01000000004']] as const) {
        await insertUser(role, phone, PASSWORD, role === 'customer' ? `${phone}@x.com` : null);
        const res = await http().post('/v1/auth/login').send({ phone, password: PASSWORD }).expect(201);
        expect(res.body.user.role).toBe(role);
      }
    });

    it('gives the same answer for an unknown phone and a wrong password', async () => {
      await insertUser('customer', '01000000001', PASSWORD, 'c@x.com');
      const wrong = await http().post('/v1/auth/login').send({ phone: '01000000001', password: 'wrongpass' }).expect(401);
      const unknown = await http().post('/v1/auth/login').send({ phone: '01099999999', password: PASSWORD }).expect(401);
      expect(wrong.body.code).toBe('BAD_CREDENTIALS');
      expect(unknown.body).toEqual(wrong.body);
    });

    it('refuses a disabled account', async () => {
      const id = await insertUser('driver', '01000000003', PASSWORD);
      await sql('UPDATE users SET disabled_at = NOW() WHERE id = ?', [id]);
      const res = await http().post('/v1/auth/login').send({ phone: '01000000003', password: PASSWORD }).expect(403);
      expect(res.body.code).toBe('ACCOUNT_DISABLED');
    });
  });

  describe('sessions', () => {
    it('rotates the refresh token, and a reused one ends every session', async () => {
      const auth = await signUp('01554459196', 'ahmed@gmail.com');
      const next = await http().post('/v1/auth/refresh').send({ refreshToken: auth.refreshToken }).expect(201);
      expect(next.body.refreshToken).not.toBe(auth.refreshToken);

      const reused = await http().post('/v1/auth/refresh').send({ refreshToken: auth.refreshToken }).expect(401);
      expect(reused.body.code).toBe('SESSION_EXPIRED');
      // The stolen copy took the rotated one down too, and its access token.
      await http().post('/v1/auth/refresh').send({ refreshToken: next.body.refreshToken }).expect(401);
      await http().get('/v1/me').set('Authorization', `Bearer ${next.body.accessToken}`).expect(401);
    });

    it('signs out: the refresh token stops working', async () => {
      const auth = await signUp('01554459196', 'ahmed@gmail.com');
      await http().post('/v1/auth/logout').send({ refreshToken: auth.refreshToken }).expect(204);
      await http().post('/v1/auth/refresh').send({ refreshToken: auth.refreshToken }).expect(401);
    });

    it('needs an access token for /v1/me, and refuses a sign-up ticket as one', async () => {
      await http().get('/v1/me').expect(401);
      await http().post('/v1/auth/signup/code').send({ phone: '01012345678', email: 'a@b.co' });
      const { body } = await http()
        .post('/v1/auth/code/verify')
        .send({ phone: '01012345678', purpose: 'signup', code: lastCodeTo('a@b.co') });
      await http().get('/v1/me').set('Authorization', `Bearer ${body.ticket}`).expect(401);
    });
  });

  describe('forgot password (customers only)', () => {
    it('emails a code to the account, then sets the new password and ends old sessions', async () => {
      const auth = await signUp('01554459196', 'ahmed@gmail.com');
      const sent = await http().post('/v1/auth/password/code').send({ phone: '01554459196' }).expect(201);
      expect(sent.body).toEqual({ email: 'a***d@gmail.com', resendIn: 59 });

      const { body } = await http()
        .post('/v1/auth/code/verify')
        .send({ phone: '01554459196', purpose: 'reset', code: lastCodeTo('ahmed@gmail.com') })
        .expect(201);
      const reset = await http().post('/v1/auth/password/reset').send({ ticket: body.ticket, password: 'newpass99' }).expect(201);
      expect(reset.body.user.phone).toBe('01554459196');

      await http().post('/v1/auth/refresh').send({ refreshToken: auth.refreshToken }).expect(401);
      await http().post('/v1/auth/login').send({ phone: '01554459196', password: PASSWORD }).expect(401);
      await http().post('/v1/auth/login').send({ phone: '01554459196', password: 'newpass99' }).expect(201);
    });

    it('uses a reset ticket once, and a session from before the reset never comes back', async () => {
      const auth = await signUp('01554459196', 'ahmed@gmail.com');
      await http().post('/v1/auth/password/code').send({ phone: '01554459196' }).expect(201);
      const { body } = await http()
        .post('/v1/auth/code/verify')
        .send({ phone: '01554459196', purpose: 'reset', code: lastCodeTo('ahmed@gmail.com') });
      await http().post('/v1/auth/password/reset').send({ ticket: body.ticket, password: 'newpass99' }).expect(201);
      const again = await http().post('/v1/auth/password/reset').send({ ticket: body.ticket, password: 'other999' }).expect(401);
      expect(again.body.code).toBe('TICKET_INVALID');

      // Even if the old token had escaped the sign-out (a refresh racing the reset), it is from before it.
      await sql('UPDATE refresh_tokens SET revoked_at = NULL');
      await http().post('/v1/auth/refresh').send({ refreshToken: auth.refreshToken }).expect(401);
      await http().get('/v1/me').set('Authorization', `Bearer ${auth.accessToken}`).expect(401);
    });

    it('does not let a ticket reset a new account that took the number of a deleted one', async () => {
      const auth = await signUp('01554459196', 'ahmed@gmail.com');
      await http().post('/v1/auth/password/code').send({ phone: '01554459196' }).expect(201);
      const { body } = await http()
        .post('/v1/auth/code/verify')
        .send({ phone: '01554459196', purpose: 'reset', code: lastCodeTo('ahmed@gmail.com') });
      await http().delete('/v1/me').set('Authorization', `Bearer ${auth.accessToken}`).send({ password: PASSWORD }).expect(204);
      await sql('DELETE FROM otp_codes');
      await signUp('01554459196', 'new@gmail.com');
      await http().post('/v1/auth/password/reset').send({ ticket: body.ticket, password: 'newpass99' }).expect(401);
      await http().post('/v1/auth/login').send({ phone: '01554459196', password: PASSWORD }).expect(201);
    });

    it('tells partners and drivers to ask the admin', async () => {
      await insertUser('partner', '01011111111', PASSWORD);
      const res = await http().post('/v1/auth/password/code').send({ phone: '01011111111' }).expect(403);
      expect(res.body.code).toBe('STAFF_RESET_BY_ADMIN');
      expect(mailbox).toHaveLength(0);
    });

    it('says when no account has the phone', async () => {
      const res = await http().post('/v1/auth/password/code').send({ phone: '01099999999' }).expect(404);
      expect(res.body.code).toBe('PHONE_NOT_FOUND');
    });

    it('does not let a sign-up ticket reset a password', async () => {
      await signUp('01554459196', 'ahmed@gmail.com');
      await http().post('/v1/auth/signup/code').send({ phone: '01012345678', email: 'a@b.co' });
      const { body } = await http()
        .post('/v1/auth/code/verify')
        .send({ phone: '01012345678', purpose: 'signup', code: lastCodeTo('a@b.co') });
      await http().post('/v1/auth/password/reset').send({ ticket: body.ticket, password: 'newpass99' }).expect(401);
    });
  });
});
