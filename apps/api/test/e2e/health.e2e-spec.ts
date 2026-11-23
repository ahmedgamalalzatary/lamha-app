import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from '../utils/app.js';

describe('Foundation (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/health reports the API and the database as up', async () => {
    const res = await request(app.getHttpServer()).get('/v1/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
    expect(typeof res.body.version).toBe('string');
  });

  it('routes live under /v1 only', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });

  it('answers unknown routes with the standard error shape', async () => {
    const res = await request(app.getHttpServer()).get('/v1/nope').expect(404);
    expect(res.body).toMatchObject({ statusCode: 404, error: 'Not Found' });
  });

  it('serves the Swagger document with the health route', async () => {
    const res = await request(app.getHttpServer()).get('/docs-json').expect(200);
    expect(Object.keys(res.body.paths)).toContain('/v1/health');
  });

  it('allows the dashboard and the app to call it (CORS)', async () => {
    const res = await request(app.getHttpServer())
      .get('/v1/health')
      .set('Origin', 'http://localhost:3000');
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });
});
