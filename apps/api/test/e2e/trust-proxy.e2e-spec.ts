import type { INestApplication } from '@nestjs/common';
import { AUTH } from '@tawsela/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { resetDb } from '../utils/db.js';

/**
 * Behind nginx every request comes from 127.0.0.1. With TRUST_PROXY=1 the API reads the customer's
 * address from X-Forwarded-For, so one customer's tries never use up everyone's limit (review F14).
 */
describe('TRUST_PROXY (e2e, contract §14 rate limits behind a proxy)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    await resetDb();
    process.env.TRUST_PROXY = '1';
    // Imported after the variable is set: the config is read when the app module loads.
    const { createTestApp } = await import('../utils/app.js');
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
    delete process.env.TRUST_PROXY;
  });

  it('counts sign-in tries per forwarded client address', async () => {
    const tryFrom = (ip: string) =>
      request(app.getHttpServer())
        .post('/v1/auth/login')
        .set('X-Test-Rate-Limit', '1')
        .set('X-Forwarded-For', ip)
        .send({ phone: '01099999999', password: 'wrongpass' });
    for (let i = 0; i < AUTH.rateLimitPerMinute; i++) expect((await tryFrom('203.0.113.1')).status).toBe(401);
    expect((await tryFrom('203.0.113.1')).status).toBe(429);
    expect((await tryFrom('203.0.113.2')).status).toBe(401);
  });
});
