import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp } from '../utils/app.js';
import { insertCategory, insertProduct, insertStore } from '../utils/catalog.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

const PASSWORD = 'secret123';
const FAYOUM = [
  { lat: 29.25, lng: 30.78 },
  { lat: 29.36, lng: 30.78 },
  { lat: 29.36, lng: 30.9 },
  { lat: 29.25, lng: 30.9 },
];
const GIZA = [
  { lat: 29.9, lng: 31.1 },
  { lat: 30.1, lng: 31.1 },
  { lat: 30.1, lng: 31.25 },
  { lat: 29.9, lng: 31.25 },
];
// new-address-form-filled.png
const TEMP = {
  type: 'apartment',
  building: 'مبنى 2',
  apartment: 'شقه 2',
  floor: null,
  street: 'شارع 2',
  landmark: 'temp',
  phone: '01554459196',
  lat: 29.3205,
  lng: 30.8364,
  isDefault: false,
};

describe('addresses and delivery zones (e2e, contract §8.9)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let admin: { Authorization: string };
  let customer: { Authorization: string };

  const signIn = async (phone: string) => ({
    Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone, password: PASSWORD }).expect(201)).body.accessToken}`,
  });
  const addZone = async (name: string, polygon: object[]) =>
    (await http().post('/v1/admin/zones').set(admin).send({ name, polygon, active: true }).expect(201)).body as { id: number };
  const ids = (body: { id: number }[]) => body.map((s) => s.id);

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb();
    await insertUser('admin', '01000000001', PASSWORD);
    await insertUser('customer', '01554459196', PASSWORD);
    admin = await signIn('01000000001');
    customer = await signIn('01554459196');
  });
  afterAll(async () => {
    await app.close();
  });

  it('the admin outlines zones and switches them off; a customer checks a spot (الإعدادات › المناطق)', async () => {
    await http().post('/v1/admin/zones').set(admin).send({ name: 'خط', polygon: FAYOUM.slice(0, 2), active: true }).expect(400);
    await http().post('/v1/admin/zones').set(customer).send({ name: 'الفيوم', polygon: FAYOUM, active: true }).expect(403);
    const fayoum = await addZone('الفيوم', FAYOUM);
    const giza = await addZone('الجيزة', GIZA);
    expect((await http().get('/v1/admin/zones').set(admin).expect(200)).body).toMatchObject([
      { id: fayoum.id, name: 'الفيوم', polygon: FAYOUM, active: true },
      { id: giza.id, name: 'الجيزة' },
    ]);

    const check = (lat: number, lng: number) => http().post('/v1/zones/check').set(customer).send({ lat, lng }).expect(200);
    expect((await check(29.3205, 30.8364)).body).toEqual({ zone: { id: fayoum.id, name: 'الفيوم' } });
    expect((await check(31.2, 29.9)).body).toEqual({ zone: null });

    await http().patch(`/v1/admin/zones/${fayoum.id}`).set(admin).send({ active: false }).expect(200);
    expect((await check(29.3205, 30.8364)).body).toEqual({ zone: null });
  });

  it('saves, edits and deletes addresses: the first is the default, one default at a time, spots outside every zone refused', async () => {
    const fayoum = await addZone('الفيوم', FAYOUM);
    const out = await http().post('/v1/me/addresses').set(customer).send({ ...TEMP, lat: 31.2, lng: 29.9 }).expect(422);
    expect(out.body.code).toBe('OUT_OF_ZONE');
    await http().post('/v1/me/addresses').set(customer).send({ ...TEMP, landmark: ' ' }).expect(400);

    const first = (await http().post('/v1/me/addresses').set(customer).send({ ...TEMP, landmark: 'علامه' }).expect(201)).body;
    expect(first).toMatchObject({ landmark: 'علامه', isDefault: true, zone: { id: fayoum.id, name: 'الفيوم' } });
    const second = (await http().post('/v1/me/addresses').set(customer).send({ ...TEMP, isDefault: true }).expect(201)).body;
    const list = async () => (await http().get('/v1/me/addresses').set(customer).expect(200)).body as { id: number; isDefault: boolean; floor: string | null }[];
    expect((await list()).map((a) => [a.id, a.isDefault])).toEqual([
      [second.id, true],
      [first.id, false],
    ]);

    await http().put(`/v1/me/addresses/${first.id}`).set(customer).send({ ...TEMP, landmark: 'علامه', floor: '3', isDefault: true }).expect(200);
    expect((await list()).map((a) => [a.id, a.isDefault, a.floor])).toEqual([
      [first.id, true, '3'],
      [second.id, false, null],
    ]);

    // Another customer cannot see or touch them.
    await insertUser('customer', '01000000009', PASSWORD);
    const other = await signIn('01000000009');
    await http().delete(`/v1/me/addresses/${first.id}`).set(other).expect(404);
    expect((await http().get('/v1/me/addresses').set(other).expect(200)).body).toEqual([]);

    // Deleting the default makes the one left the default.
    await http().delete(`/v1/me/addresses/${first.id}`).set(customer).expect(204);
    expect((await list()).map((a) => [a.id, a.isDefault])).toEqual([[second.id, true]]);
  });

  it('keeps one default when first addresses are saved at the same moment, and answers 404 for an edit that loses to a delete (review F22, F23)', async () => {
    await addZone('الفيوم', FAYOUM);
    const saves = await Promise.all(Array.from({ length: 5 }, () => http().post('/v1/me/addresses').set(customer).send(TEMP)));
    expect(saves.map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);
    const rows = await sql<{ is_default: number }[]>('SELECT is_default FROM addresses');
    expect(rows.filter((r) => r.is_default)).toHaveLength(1);

    const id = saves[0]!.body.id as number;
    const [edit] = await Promise.all([
      http().put(`/v1/me/addresses/${id}`).set(customer).send({ ...TEMP, floor: '4' }),
      http().delete(`/v1/me/addresses/${id}`).set(customer).expect(204),
    ]);
    if (edit.status === 200) expect(edit.body).toMatchObject({ id, floor: '4' });
    else expect(edit.status).toBe(404);
  });

  it('leaves no address behind when saves race the account deletion (review F04)', async () => {
    await addZone('الفيوم', FAYOUM);
    await http().post('/v1/me/addresses').set(customer).send(TEMP).expect(201);
    const res = await Promise.all([
      ...Array.from({ length: 4 }, () => http().post('/v1/me/addresses').set(customer).send(TEMP)),
      http().delete('/v1/me').set(customer).send({ password: PASSWORD }),
      ...Array.from({ length: 4 }, () => http().post('/v1/me/addresses').set(customer).send(TEMP)),
    ]);
    expect(res[4]!.status).toBe(204);
    expect(res.map((r) => r.status)).not.toContain(500);
    expect(await sql<unknown[]>('SELECT id FROM addresses')).toHaveLength(0);
  });

  it("lists only the stores of the chosen address's zone, nearest first, in lists and search (§8.3, §8.13)", async () => {
    const fayoum = await addZone('الفيوم', FAYOUM);
    const giza = await addZone('الجيزة', GIZA);
    const far = await insertStore({ name: 'كشري بعيد' });
    const near = await insertStore({ name: 'كشري قريب' });
    const inGiza = await insertStore({ name: 'كشري الجيزة' });
    await sql('UPDATE stores SET zone_id = ?, lat = ?, lng = ? WHERE id = ?', [fayoum.id, 29.35, 30.89, far]);
    await sql('UPDATE stores SET zone_id = ?, lat = ?, lng = ? WHERE id = ?', [fayoum.id, 29.321, 30.837, near]);
    await sql('UPDATE stores SET zone_id = ? WHERE id = ?', [giza.id, inGiza]);
    await insertProduct(inGiza, await insertCategory(inGiza), 'كشري');
    const home = (await http().post('/v1/me/addresses').set(customer).send(TEMP).expect(201)).body as { id: number };

    const get = async (url: string) => (await http().get(url).set(customer).expect(200)).body;
    expect(ids(await get('/v1/catalog/stores?vertical=restaurant'))).toEqual([far, near, inGiza]);
    expect(ids(await get(`/v1/catalog/stores?vertical=restaurant&addressId=${home.id}`))).toEqual([far, near]);
    expect(ids(await get(`/v1/catalog/stores?vertical=restaurant&addressId=${home.id}&sort=nearest`))).toEqual([near, far]);
    expect((await get(`/v1/catalog/stores?addressId=${home.id}`))[0].location).toEqual({ lat: 29.35, lng: 30.89 });
    expect((await get(`/v1/catalog/search?q=${encodeURIComponent('كشري')}&addressId=${home.id}`)).map((r: { store: { id: number } }) => r.store.id)).toEqual([far, near]);

    await insertUser('customer', '01000000009', PASSWORD);
    await http().get(`/v1/catalog/stores?addressId=${home.id}`).set(await signIn('01000000009')).expect(404);
  });

  it("the admin sets a store's zone and location (الموردين)", async () => {
    const fayoum = await addZone('الفيوم', FAYOUM);
    const id = await insertStore();
    const res = await http()
      .patch(`/v1/admin/stores/${id}`)
      .set(admin)
      .send({ zoneId: fayoum.id, location: { lat: 29.31, lng: 30.84 } })
      .expect(200);
    expect(res.body).toMatchObject({ zoneId: fayoum.id, location: { lat: 29.31, lng: 30.84 } });
    await http().patch(`/v1/admin/stores/${id}`).set(admin).send({ zoneId: 999 }).expect(404);
    await http().patch(`/v1/admin/stores/${id}`).set(admin).send({ location: { lat: 200, lng: 0 } }).expect(400);
  });
});
