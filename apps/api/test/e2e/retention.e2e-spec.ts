import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import { RetentionService } from '../../src/modules/maintenance/retention.service.js';
import { createTestApp } from '../utils/app.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

/** The hourly sweep (review F15): expired codes (they hold a phone and an email) and expired sessions go. */
describe('retention sweep (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb();
  });
  afterAll(async () => {
    await app.close();
  });

  it('deletes codes expired over a day ago and refresh tokens past their expiry; keeps the rest', async () => {
    const id = await insertUser('customer', '01554459196', 'secret123', 'ahmed@gmail.com');
    const code = (phone: string, expires: string) =>
      sql(`INSERT INTO otp_codes (phone, email, purpose, code_hash, expires_at, created_at) VALUES (?, 'a@b.co', 'signup', ?, ${expires}, UTC_TIMESTAMP())`, [
        phone,
        'x'.repeat(64),
      ]);
    await code('01000000001', 'UTC_TIMESTAMP() - INTERVAL 2 DAY');
    await code('01000000002', 'UTC_TIMESTAMP() - INTERVAL 1 HOUR');
    await code('01000000003', 'UTC_TIMESTAMP() + INTERVAL 5 MINUTE');
    const token = (hash: string, expires: string, revoked: string) =>
      sql(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at, revoked_at, created_at) VALUES (?, ?, ${expires}, ${revoked}, UTC_TIMESTAMP())`, [
        id,
        hash.repeat(64),
      ]);
    await token('a', 'UTC_TIMESTAMP() - INTERVAL 1 MINUTE', 'NULL');
    // Revoked but not expired: kept, so a stolen copy still sets off the alarm.
    await token('b', 'UTC_TIMESTAMP() + INTERVAL 10 DAY', 'UTC_TIMESTAMP()');
    await token('c', 'UTC_TIMESTAMP() + INTERVAL 10 DAY', 'NULL');

    await app.get(RetentionService).sweep();

    const phones = await sql<{ phone: string }[]>('SELECT phone FROM otp_codes ORDER BY phone');
    expect(phones.map((r) => r.phone)).toEqual(['01000000002', '01000000003']);
    const hashes = await sql<{ token_hash: string }[]>('SELECT token_hash FROM refresh_tokens ORDER BY token_hash');
    expect(hashes.map((r) => r.token_hash[0])).toEqual(['b', 'c']);
  });
});
