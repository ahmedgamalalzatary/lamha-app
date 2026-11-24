import type { INestApplication } from '@nestjs/common';
import type { AuditEntry, AuditPage } from '@tawsela/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from '../utils/app.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

const PASSWORD = 'secret123';
const SQUARE = [
  { lat: 29.25, lng: 30.78 },
  { lat: 29.36, lng: 30.78 },
  { lat: 29.36, lng: 30.9 },
  { lat: 29.25, lng: 30.9 },
];

/** سجل التغييرات (review F70): who changed accounts, stores and zones, and when. */
describe('/v1/admin/audit (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let admin: { Authorization: string };

  const signIn = async (phone: string) => ({
    Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone, password: PASSWORD }).expect(201)).body.accessToken}`,
  });

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb();
    await insertUser('admin', '01000000001', PASSWORD);
    await sql("UPDATE users SET first_name = 'أحمد', last_name = 'علي' WHERE phone = '01000000001'");
    admin = await signIn('01000000001');
  });
  afterAll(async () => {
    await app.close();
  });

  it('records each change to accounts, stores and zones with who made it, newest first, and never a password', async () => {
    const other = (await http().post('/v1/admin/admins').set(admin).send({ firstName: 'سارة', lastName: 'حسن', phone: '01000000009' }).expect(201)).body;
    await http().post(`/v1/admin/admins/${other.account.id}/password`).set(admin).expect(201);
    await http().patch(`/v1/admin/admins/${other.account.id}`).set(admin).send({ disabled: true }).expect(200);

    const zone = (await http().post('/v1/admin/zones').set(admin).send({ name: 'الفيوم', polygon: SQUARE, active: true }).expect(201)).body;
    await http().patch(`/v1/admin/zones/${zone.id}`).set(admin).send({ active: false }).expect(200);

    const created = (
      await http()
        .post('/v1/admin/stores')
        .set(admin)
        .send({
          vertical: 'restaurant',
          name: 'كشري التحرير',
          logo: null,
          cover: null,
          deliveryMinutes: 25,
          deliveryFee: 15,
          minimumOrder: 60,
          deliveredBy: 'platform',
          layout: 'list',
          pickupAllowed: false,
          opensAt: '10:00',
          closesAt: '23:00',
          closedNow: false,
          active: true,
          cuisineIds: [],
          zoneId: zone.id,
          partner: { firstName: 'حسن', lastName: 'التحرير', phone: '01554459196' },
        })
        .expect(201)
    ).body;
    await http().patch(`/v1/admin/stores/${created.store.id}`).set(admin).send({ active: false, deliveryFee: 20 }).expect(200);
    const partnerId = created.partner.account.id as number;
    await http().post(`/v1/admin/partners/${partnerId}/password`).set(admin).expect(201);
    await http().patch(`/v1/admin/partners/${partnerId}`).set(admin).send({ disabled: true }).expect(200);

    const page = (await http().get('/v1/admin/audit').set(admin).expect(200)).body as AuditPage;
    const brief = (e: AuditEntry) => [e.action, e.target.type, e.target.name];
    expect(page.entries.map(brief)).toEqual([
      ['partner.disable', 'account', 'حسن التحرير'],
      ['partner.password', 'account', 'حسن التحرير'],
      ['store.update', 'store', 'كشري التحرير'],
      ['partner.create', 'account', 'حسن التحرير'],
      ['store.create', 'store', 'كشري التحرير'],
      ['zone.update', 'zone', 'الفيوم'],
      ['zone.create', 'zone', 'الفيوم'],
      ['admin.disable', 'account', 'سارة حسن'],
      ['admin.password', 'account', 'سارة حسن'],
      ['admin.create', 'account', 'سارة حسن'],
    ]);
    expect(page.entries[0]).toMatchObject({ actor: { name: 'أحمد علي' }, at: expect.stringMatching(/^\d{4}-\d\d-\d\dT/) });
    expect(page.entries[2]!.details).toEqual({ active: false, deliveryFee: 20 });
    expect(page.entries[5]!.details).toEqual({ active: false });
    expect(page.entries[6]!.details).toMatchObject({ corners: 4, active: true });
    expect(page.next).toBeNull();
    // A generated password is shown once to the admin, never kept in the log.
    expect(JSON.stringify(page)).not.toContain(created.partner.password);
    expect(JSON.stringify(page)).not.toContain(other.password);
  });

  it('pages back through older entries, and is for admins only', async () => {
    for (let i = 0; i < 55; i++) {
      await sql(
        "INSERT INTO audit_log (actor_id, actor_name, action, target_type, target_id, target_name, details, created_at) VALUES (1, 'أحمد', 'zone.update', 'zone', 1, 'الفيوم', '{}', UTC_TIMESTAMP())",
      );
    }
    const first = (await http().get('/v1/admin/audit').set(admin).expect(200)).body as AuditPage;
    expect(first.entries).toHaveLength(50);
    expect(first.next).toEqual(expect.any(Number));
    const second = (await http().get(`/v1/admin/audit?before=${first.next}`).set(admin).expect(200)).body as AuditPage;
    expect(second.entries).toHaveLength(5);
    expect(second.next).toBeNull();

    await insertUser('partner', '01000000002', PASSWORD);
    await http().get('/v1/admin/audit').set(await signIn('01000000002')).expect(403);
  });
});
