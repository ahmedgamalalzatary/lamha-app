import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import {
  type AdminBanner,
  type AdminCoupon,
  type BannerInput,
  type CouponInput,
  type CouponProblem,
  couponDiscount,
  couponInputProblem,
  couponProblem,
  type CouponRule,
  discountRange,
  normalizeCode,
  productSaving,
  type StoreOffers,
  type Voucher,
} from '@tawsela/shared';
import { and, asc, count, desc, eq, gt, inArray, isNotNull, isNull, lte, or, gte, type SQL, sql } from 'drizzle-orm';
import { ApiException } from '../../common/api-exception.js';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import type { Tx } from '../catalog/catalog.repository.js';
import { type ProductRow, products, storeCategories, type StoreRow, stores } from '../catalog/catalog.schema.js';
import { banners, type BannerRow, couponUses, type CouponRow, coupons } from './offers.schema.js';

/** Products on a home rail (§8.2). */
const RAIL_PRODUCTS = 10;

const notFound = (what: string) => new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', `No ${what} has this id`);

/** A stored time as ISO, or null. */
const iso = (d: Date | null) => d?.toISOString() ?? null;
const toDate = (s: string | null) => (s === null ? null : new Date(s));

const toRule = (row: CouponRow): CouponRule => ({
  active: row.active,
  storeId: row.storeId,
  kind: row.kind,
  value: row.value,
  maxDiscount: row.maxDiscount,
  minOrder: row.minOrder,
  startsAt: iso(row.startsAt),
  endsAt: iso(row.endsAt),
  perCustomer: row.perCustomer,
  totalLimit: row.totalLimit,
});

const toVoucher = (row: CouponRow): Voucher => ({
  id: row.id,
  code: row.code,
  title: row.title,
  storeId: row.storeId,
  kind: row.kind,
  value: row.value,
  maxDiscount: row.maxDiscount,
  minOrder: row.minOrder,
  endsAt: iso(row.endsAt),
});

/** A code that works right now: switched on and in its dates (its use limits are checked apart). */
const liveNow = (now: Date): SQL =>
  and(eq(coupons.active, true), or(isNull(coupons.startsAt), lte(coupons.startsAt, now)), or(isNull(coupons.endsAt), gte(coupons.endsAt, now)))!;

/** A code applied at checkout. */
export interface AppliedCoupon {
  row: CouponRow;
  discount: number;
}

/**
 * Offers, codes and banners (contract §8.2, §8.4, §8.7, §8.10; §11 A14–A15). The admin makes all of
 * them [Owner, 2026-11-26]; who pays a discount is set per offer.
 */
@Injectable()
export class OffersService {
  constructor(@InjectDb() private readonly db: Db) {}

  // Codes: the admin's side

  async listCoupons(): Promise<AdminCoupon[]> {
    const rows = await this.db.select({ coupon: coupons, storeName: stores.name }).from(coupons).leftJoin(stores, eq(stores.id, coupons.storeId)).orderBy(desc(coupons.id));
    const used = await this.usesOf(rows.map((r) => r.coupon.id));
    return rows.map(({ coupon, storeName }) => this.toAdmin(coupon, storeName, used.get(coupon.id) ?? 0));
  }

  async coupon(id: number): Promise<AdminCoupon> {
    const [row] = await this.db.select({ coupon: coupons, storeName: stores.name }).from(coupons).leftJoin(stores, eq(stores.id, coupons.storeId)).where(eq(coupons.id, id));
    if (!row) throw notFound('code');
    return this.toAdmin(row.coupon, row.storeName, (await this.usesOf([id])).get(id) ?? 0);
  }

  async createCoupon(input: CouponInput): Promise<AdminCoupon> {
    await this.checkCoupon(input);
    const [made] = await this.db
      .insert(coupons)
      .values({ ...input, codeKey: normalizeCode(input.code), startsAt: toDate(input.startsAt), endsAt: toDate(input.endsAt) })
      .$returningId();
    return this.coupon(made!.id);
  }

  async updateCoupon(id: number, change: Partial<CouponInput>): Promise<AdminCoupon> {
    const current = await this.coupon(id);
    const { id: _id, storeName: _s, used: _u, createdAt: _c, ...saved } = current;
    await this.checkCoupon({ ...saved, ...change });
    const { startsAt, endsAt, ...rest } = change;
    const values = {
      ...rest,
      ...(rest.code === undefined ? {} : { codeKey: normalizeCode(rest.code) }),
      ...(startsAt === undefined ? {} : { startsAt: toDate(startsAt) }),
      ...(endsAt === undefined ? {} : { endsAt: toDate(endsAt) }),
    };
    if (Object.keys(values).length) await this.db.update(coupons).set(values).where(eq(coupons.id, id));
    return this.coupon(id);
  }

  /** Orders keep the code and discount they were placed with. */
  async deleteCoupon(id: number): Promise<AdminCoupon> {
    const current = await this.coupon(id);
    await this.db.delete(coupons).where(eq(coupons.id, id));
    return current;
  }

  private async checkCoupon(input: CouponInput): Promise<void> {
    const problem = couponInputProblem(input);
    if (problem) throw new BadRequestException(`Invalid ${problem}`);
    if (input.storeId !== null) await this.storeOrThrow(input.storeId);
  }

  private toAdmin(row: CouponRow, storeName: string | null, used: number): AdminCoupon {
    return { ...toRule(row), id: row.id, code: row.code, title: row.title, paidBy: row.paidBy, storeName, used, createdAt: row.createdAt.toISOString() };
  }

  /** Uses on orders that still stand, per code. */
  private async usesOf(ids: number[], db: Db | Tx = this.db): Promise<Map<number, number>> {
    if (!ids.length) return new Map();
    const rows = await db.select({ id: couponUses.couponId, n: count() }).from(couponUses).where(inArray(couponUses.couponId, ids)).groupBy(couponUses.couponId);
    return new Map(rows.map((r) => [r.id, r.n]));
  }

  // Codes: the customer's side

  /** قسائمي (§8.4): the codes that work at this store now, its own first, newest first; used-up ones left out. */
  async vouchersFor(storeId: number): Promise<Voucher[]> {
    const rows = await this.db
      .select()
      .from(coupons)
      .where(and(liveNow(new Date()), or(eq(coupons.storeId, storeId), isNull(coupons.storeId))))
      .orderBy(sql`${coupons.storeId} IS NULL`, desc(coupons.id));
    const used = await this.usesOf(rows.map((r) => r.id));
    return rows.filter((r) => r.totalLimit === null || (used.get(r.id) ?? 0) < r.totalLimit).map(toVoucher);
  }

  /**
   * The code typed at checkout (§8.7), or a 422 saying why it cannot be used. At placing (`lock`) the
   * code's row is locked, so the last use of a limited code goes to one order.
   */
  async apply(tx: Tx, userId: number, storeId: number, itemsTotal: number, code: string, lock = false): Promise<AppliedCoupon> {
    const query = tx.select().from(coupons).where(eq(coupons.codeKey, normalizeCode(code)));
    const [row] = lock ? await query.for('update') : await query;
    const fail = (problem: CouponProblem) => new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, problem, 'This code cannot be used on this order');
    if (!row) throw fail('COUPON_NOT_FOUND');
    const [mine] = await tx.select({ n: count() }).from(couponUses).where(and(eq(couponUses.couponId, row.id), eq(couponUses.userId, userId)));
    const all = (await this.usesOf([row.id], tx)).get(row.id) ?? 0;
    const problem = couponProblem(toRule(row), { now: new Date(), storeId, itemsTotal, usedByMe: mine?.n ?? 0, usedByAll: all });
    if (problem) throw fail(problem);
    return { row, discount: couponDiscount(row, itemsTotal) };
  }

  async use(tx: Tx, couponId: number, userId: number, orderId: number): Promise<void> {
    await tx.insert(couponUses).values({ couponId, userId, orderId });
  }

  /** A rejected or cancelled order gives its code's use back. */
  async release(tx: Tx, orderId: number): Promise<void> {
    await tx.delete(couponUses).where(eq(couponUses.orderId, orderId));
  }

  // Offers on stores

  /** Each store's offers (§8.3, §8.10): its newest own code, its free delivery and its product discounts. */
  async storeOffers(rows: StoreRow[]): Promise<Map<number, StoreOffers>> {
    const ids = rows.map((r) => r.id);
    const map = new Map<number, StoreOffers>(rows.map((r) => [r.id, { voucher: null, freeDeliveryFrom: r.freeDeliveryFrom, discount: null }]));
    if (!ids.length) return map;
    const [own, discounted] = await Promise.all([
      this.db.select().from(coupons).where(and(liveNow(new Date()), inArray(coupons.storeId, ids))).orderBy(desc(coupons.id)),
      this.db
        .select({ storeId: products.storeId, price: products.price, oldPrice: products.oldPrice })
        .from(products)
        .where(and(inArray(products.storeId, ids), eq(products.active, true), isNotNull(products.oldPrice), gt(products.oldPrice, products.price))),
    ]);
    const used = await this.usesOf(own.map((c) => c.id));
    for (const c of own) {
      const offers = map.get(c.storeId!)!;
      if (!offers.voucher && (c.totalLimit === null || (used.get(c.id) ?? 0) < c.totalLimit)) offers.voucher = toVoucher(c);
    }
    for (const id of ids) map.get(id)!.discount = discountRange(discounted.filter((p) => p.storeId === id).map(productSaving));
    return map;
  }

  /** The admin's product discount (§8.10): an old price above the price, or none. */
  async setDiscount(productId: number, oldPrice: number | null, paidBy: 'store' | 'app'): Promise<ProductRow> {
    const [row] = await this.db.select().from(products).where(eq(products.id, productId));
    if (!row) throw notFound('product');
    if (oldPrice !== null && oldPrice <= row.price) throw new BadRequestException('The old price must be above the price');
    await this.db.update(products).set({ oldPrice, discountPaidBy: paidBy }).where(eq(products.id, productId));
    return { ...row, oldPrice, discountPaidBy: paidBy };
  }

  // Banners

  async listBanners(): Promise<AdminBanner[]> {
    const rows = await this.db.select({ banner: banners, storeName: stores.name }).from(banners).innerJoin(stores, eq(stores.id, banners.storeId)).orderBy(asc(banners.place), asc(banners.sortOrder), asc(banners.id));
    return rows.map(({ banner, storeName }) => toAdminBanner(banner, storeName));
  }

  async banner(id: number): Promise<AdminBanner> {
    const [row] = await this.db.select({ banner: banners, storeName: stores.name }).from(banners).innerJoin(stores, eq(stores.id, banners.storeId)).where(eq(banners.id, id));
    if (!row) throw notFound('banner');
    return toAdminBanner(row.banner, row.storeName);
  }

  async createBanner(input: BannerInput): Promise<AdminBanner> {
    await this.storeOrThrow(input.storeId);
    const [made] = await this.db.insert(banners).values(input).$returningId();
    return this.banner(made!.id);
  }

  async updateBanner(id: number, change: Partial<BannerInput>): Promise<AdminBanner> {
    await this.banner(id);
    if (change.storeId !== undefined) await this.storeOrThrow(change.storeId);
    if (Object.keys(change).length) await this.db.update(banners).set(change).where(eq(banners.id, id));
    return this.banner(id);
  }

  async deleteBanner(id: number): Promise<AdminBanner> {
    const current = await this.banner(id);
    await this.db.delete(banners).where(eq(banners.id, id));
    return current;
  }

  /** Home (§8.2): the active banners of visible stores, the carousel first, each in the admin's order. */
  async homeBanners(): Promise<{ banner: BannerRow; store: Pick<StoreRow, 'id' | 'name' | 'vertical'> }[]> {
    return this.db
      .select({ banner: banners, store: { id: stores.id, name: stores.name, vertical: stores.vertical } })
      .from(banners)
      .innerJoin(stores, eq(stores.id, banners.storeId))
      .where(and(eq(banners.active, true), eq(stores.active, true)))
      .orderBy(asc(banners.place), asc(banners.sortOrder), asc(banners.id));
  }

  /** A rail's products: the store's first ones customers may order, in menu order. */
  async railProducts(storeId: number): Promise<ProductRow[]> {
    const rows = await this.db
      .select({ product: products })
      .from(products)
      .innerJoin(storeCategories, eq(storeCategories.id, products.categoryId))
      .where(and(eq(products.storeId, storeId), eq(products.active, true)))
      .orderBy(asc(storeCategories.sortOrder), asc(storeCategories.id), asc(products.sortOrder), asc(products.id))
      .limit(RAIL_PRODUCTS);
    return rows.map((r) => r.product);
  }

  private async storeOrThrow(id: number): Promise<void> {
    const [row] = await this.db.select({ id: stores.id }).from(stores).where(eq(stores.id, id));
    if (!row) throw notFound('store');
  }
}

const toAdminBanner = (row: BannerRow, storeName: string): AdminBanner => ({
  id: row.id,
  image: row.image,
  place: row.place,
  storeId: row.storeId,
  opens: row.opens,
  sortOrder: row.sortOrder,
  active: row.active,
  storeName,
});
