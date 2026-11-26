import type { INestApplication } from '@nestjs/common';
import type { AuthResponse, InviteOverview, Wallet } from '@tawsela/shared';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createTestApp, lastCodeTo } from '../utils/app.js';
import { insertCategory, insertProduct, insertStore, linkPartner } from '../utils/catalog.js';
import { insertUser, resetDb, sql } from '../utils/db.js';

const PASSWORD = 'secret123';
type Auth = { Authorization: string };

describe('invite friends (e2e, contract §8.17, §11 A17)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());
  let admin: Auth;
  let partner: Auth;
  let pharmacyPartner: Auth;
  let shawarma: number;
  let medicine: number;
  let requests = 0;

  const bearer = (auth: AuthResponse): Auth => ({ Authorization: `Bearer ${auth.accessToken}` });
  const signIn = async (phone: string) => ({
    Authorization: `Bearer ${(await http().post('/v1/auth/login').send({ phone, password: PASSWORD }).expect(201)).body.accessToken}`,
  });

  /** Phone + email → emailed code → ticket → personal details, as the app signs up. */
  async function signUp(phone: string, email: string, firstName: string, inviteCode?: string): Promise<AuthResponse> {
    await http().post('/v1/auth/signup/code').send({ phone, email }).expect(201);
    const { body } = await http().post('/v1/auth/code/verify').send({ phone, purpose: 'signup', code: lastCodeTo(email) }).expect(201);
    return (await http().post('/v1/auth/signup').send({ ticket: body.ticket, firstName, lastName: 'علي', password: PASSWORD, inviteCode }).expect(201)).body;
  }
  const overview = async (auth: Auth): Promise<InviteOverview> => (await http().get('/v1/me/invite').set(auth).expect(200)).body;
  const wallet = async (auth: Auth): Promise<Wallet> => (await http().get('/v1/me/wallet').set(auth).expect(200)).body;

  /** A pickup of 2 × the product, placed (with the wallet when asked) and returned. */
  async function order(auth: Auth, productId: number, wallet = false) {
    const { cart } = (await http().post('/v1/me/cart/lines').set(auth).send({ productId, quantity: 2, optionIds: [], removedIngredientIds: [] }).expect(201)).body;
    await http().patch('/v1/me/cart').set(auth).send({ cartId: cart.id, mode: 'pickup' }).expect(200);
    const quote = (await http().post('/v1/me/checkout/quote').set(auth).send({ cartId: cart.id }).expect(200)).body;
    const requestId = `00000000-0000-4000-8000-${String(++requests).padStart(12, '0')}`;
    const expectedWalletPaid = wallet ? Math.min(quote.walletBalance, quote.total) : 0;
    const placed = await http()
      .post('/v1/me/orders')
      .set(auth)
      .send({ cartId: quote.cartId, slot: null, expectedTotal: quote.total, expectedWalletPaid, requestId })
      .expect(201);
    return { quote, order: placed.body.order };
  }
  async function deliver(id: number, by = partner) {
    for (const action of ['accept', 'ready', 'collected']) await http().post(`/v1/partner/orders/${id}/${action}`).set(by).expect(200);
  }

  beforeAll(async () => {
    app = await createTestApp();
  });
  beforeEach(async () => {
    await resetDb();
    await insertUser('admin', '01000000001', PASSWORD);
    admin = await signIn('01000000001');
    const store = await insertStore({ name: 'شاورما الساقية', pickupAllowed: true });
    shawarma = await insertProduct(store, await insertCategory(store), 'شاورما فراخ', 85);
    await linkPartner(await insertUser('partner', '01000000002', PASSWORD), store);
    partner = await signIn('01000000002');
    const pharmacy = await insertStore({ name: 'صيدلية', vertical: 'pharmacy', pickupAllowed: true });
    medicine = await insertProduct(pharmacy, await insertCategory(pharmacy), 'بنادول', 50);
    await linkPartner(await insertUser('partner', '01000000003', PASSWORD), pharmacy);
    pharmacyPartner = await signIn('01000000003');
  });
  afterAll(async () => {
    await app.close();
  });

  it('the admin keeps Tawsilty\'s rules as settings; the home card shows them [Owner]', async () => {
    const defaults = { reward: 300, rewardPerOrder: 30, rewardDays: 30, friendReward: 25, friendDays: 30, firstOrderDays: 30, monthlyCap: 1000, expires: true };
    expect((await http().get('/v1/admin/settings/invites').set(admin).expect(200)).body).toEqual(defaults);
    await http().patch('/v1/admin/settings/invites').set(admin).send({ rewardPerOrder: 400 }).expect(400);
    await http().patch('/v1/admin/settings/invites').set(admin).send({ friendDays: 0 }).expect(400);
    expect((await http().patch('/v1/admin/settings/invites').set(admin).send({ reward: 50, expires: false }).expect(200)).body).toEqual({
      ...defaults,
      reward: 50,
      rewardPerOrder: 30,
      expires: false,
    });
    const log = (await http().get('/v1/admin/audit').set(admin).expect(200)).body.entries;
    expect(log[0]).toMatchObject({ action: 'settings.invites', target: { type: 'settings' }, details: { reward: 50, expires: false } });
    const me = bearer(await signUp('01011111111', 'a@gmail.com', 'منى'));
    expect((await http().get('/v1/catalog/home').set(me).expect(200)).body.invite).toEqual({ reward: 50, friendReward: 25 });
  });

  it('the friend gets 25 at sign-up; the inviter gets 300 once the friend\'s first order is delivered, once', async () => {
    const mona = await signUp('01011111111', 'a@gmail.com', 'منى');
    const inviter = bearer(mona);
    const karim = bearer(await signUp('01022222222', 'b@gmail.com', 'كريم', mona.user.inviteCode!));

    const welcome = await wallet(karim);
    expect(welcome.balance).toBe(25);
    expect(welcome.entries[0]).toMatchObject({ kind: 'add', reason: 'invite_welcome', amount: 25 });
    expect(await overview(inviter)).toMatchObject({
      code: mona.user.inviteCode,
      earned: 0,
      available: 0,
      leftThisMonth: 1000,
      friends: [{ name: 'كريم', joinedAt: expect.any(String), status: 'waiting', reward: 0 }],
    });

    const { order: first } = await order(karim, shawarma);
    await deliver(first.id);
    const after = await overview(inviter);
    expect(after).toMatchObject({ earned: 300, available: 300, leftThisMonth: 700, friends: [{ name: 'كريم', status: 'rewarded', reward: 300 }] });
    expect((await wallet(inviter)).entries[0]).toMatchObject({ kind: 'add', reason: 'invite_reward', amount: 300 });

    const { order: second } = await order(karim, shawarma);
    await deliver(second.id);
    expect((await overview(inviter)).earned).toBe(300);
  });

  it('invite money pays 30 an order for the reward and only restaurant and market orders; a rejection gives it back', async () => {
    const mona = await signUp('01011111111', 'a@gmail.com', 'منى');
    const inviter = bearer(mona);
    const karim = bearer(await signUp('01022222222', 'b@gmail.com', 'كريم', mona.user.inviteCode!));
    await deliver((await order(karim, shawarma)).order.id);
    await sql("UPDATE users SET wallet_balance = wallet_balance + 20 WHERE phone = '01011111111'");

    const pharmacy = await order(inviter, medicine, true);
    expect(pharmacy.quote.walletBalance).toBe(20);
    expect(pharmacy.order).toMatchObject({ walletPaid: 20, invitePaid: 0 });
    await http().post(`/v1/partner/orders/${pharmacy.order.id}/reject`).set(pharmacyPartner).expect(200);

    const food = await order(inviter, shawarma, true);
    expect(food.quote.walletBalance).toBe(50);
    expect(food.order).toMatchObject({ walletPaid: 50, invitePaid: 30 });
    expect((await http().get(`/v1/partner/orders/${food.order.id}`).set(partner).expect(200)).body).toMatchObject({ walletPaid: 50, invitePaid: 30 });
    expect((await overview(inviter)).available).toBe(270);

    await http().post(`/v1/partner/orders/${food.order.id}/reject`).set(partner).expect(200);
    expect((await overview(inviter)).available).toBe(300);
    expect((await wallet(inviter)).balance).toBe(320);
  });

  it('the friend\'s welcome money has no per-order limit', async () => {
    const mona = await signUp('01011111111', 'a@gmail.com', 'منى');
    const karim = bearer(await signUp('01022222222', 'b@gmail.com', 'كريم', mona.user.inviteCode!));
    const { quote, order: placed } = await order(karim, shawarma, true);
    expect(quote.walletBalance).toBe(25);
    expect(placed).toMatchObject({ walletPaid: 25, invitePaid: 25 });
  });

  it('a first order after the days gives nothing; the month\'s cap limits the rewards', async () => {
    await http().patch('/v1/admin/settings/invites').set(admin).send({ monthlyCap: 400 }).expect(200);
    const mona = await signUp('01011111111', 'a@gmail.com', 'منى');
    const inviter = bearer(mona);
    const late = bearer(await signUp('01022222222', 'b@gmail.com', 'كريم', mona.user.inviteCode!));
    await sql("UPDATE invites SET created_at = NOW() - INTERVAL 31 DAY WHERE friend_id = (SELECT id FROM users WHERE phone = '01022222222')");
    await deliver((await order(late, shawarma)).order.id);
    expect((await overview(inviter)).friends[0]).toMatchObject({ name: 'كريم', status: 'missed', reward: 0 });

    for (const [phone, email, name] of [
      ['01033333333', 'c@gmail.com', 'سامح'],
      ['01044444444', 'd@gmail.com', 'هاني'],
    ] as const) {
      const friend = bearer(await signUp(phone, email, name, mona.user.inviteCode!));
      await deliver((await order(friend, shawarma)).order.id);
    }
    const capped = await overview(inviter);
    expect(capped).toMatchObject({ earned: 400, leftThisMonth: 0 });
    expect(capped.friends.map((f) => [f.name, f.reward])).toEqual([
      ['هاني', 100],
      ['سامح', 300],
      ['كريم', 0],
    ]);
  });

  it('expired invite money leaves the wallet; with expiry off it stays [Owner: a switch]', async () => {
    const mona = await signUp('01011111111', 'a@gmail.com', 'منى');
    const karim = bearer(await signUp('01022222222', 'b@gmail.com', 'كريم', mona.user.inviteCode!));
    // The app keeps times in UTC (datetime columns), so the test does too.
    await sql('UPDATE invite_credits SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 MINUTE');
    const after = await wallet(karim);
    expect(after.balance).toBe(0);
    expect(after.entries[0]).toMatchObject({ kind: 'deduct', reason: 'invite_expired', amount: 25 });

    await http().patch('/v1/admin/settings/invites').set(admin).send({ expires: false }).expect(200);
    const sara = bearer(await signUp('01033333333', 'c@gmail.com', 'سارة', mona.user.inviteCode!));
    expect(await sql("SELECT expires_at FROM invite_credits WHERE user_id = (SELECT id FROM users WHERE phone = '01033333333')")).toEqual([{ expires_at: null }]);
    expect((await wallet(sara)).balance).toBe(25);
  });
});
