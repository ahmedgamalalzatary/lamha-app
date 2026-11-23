import type { INestApplication } from '@nestjs/common';
import { AUTH } from '@tawsela/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from '../utils/app.js';
import { resetDb } from '../utils/db.js';

describe('Rate limits on sign-in and code routes (e2e, contract §14)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    await resetDb();
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it(`allows ${AUTH.rateLimitPerMinute} sign-in tries a minute from one address, then 429`, async () => {
    const tryOnce = () =>
      request(app.getHttpServer())
        .post('/v1/auth/login')
        // Other test files skip the limit; this header turns it on (test mode only).
        .set('X-Test-Rate-Limit', '1')
        .send({ phone: '01099999999', password: 'wrongpass' });
    for (let i = 0; i < AUTH.rateLimitPerMinute; i++) expect((await tryOnce()).status).toBe(401);
    expect((await tryOnce()).status).toBe(429);
  });
});
