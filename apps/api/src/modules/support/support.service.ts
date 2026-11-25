import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import {
  type AdminRating,
  type AdminTicket,
  type RatePrompt,
  type RatingInput,
  ratingProblem,
  type SupportPhone,
  type TicketInput,
  type TicketStatus,
  type TicketType,
} from '@tawsela/shared';
import { and, asc, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import { ApiException } from '../../common/api-exception.js';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import { nameOf } from '../audit/audit.service.js';
import { stores } from '../catalog/catalog.schema.js';
import { orders } from '../orders/orders.schema.js';
import { users } from '../users/users.schema.js';
import { ratings, supportPhones, type TicketRow, tickets } from './support.schema.js';

const codeOf = (id: number) => String(100000 + id);
const orderNotFound = () => new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'You have no order with this id');
/** The popup asks only about orders from the last few days [Derived]. */
const PROMPT_DAYS = 3;

/** Ratings, complaints, suggestions and "تواصل معنا" (contract §8.8, §8.14, §11 الشكاوى والاقتراحات). */
@Injectable()
export class SupportService {
  constructor(@InjectDb() private readonly db: Db) {}

  // The customer's side.

  /**
   * One rating per delivered order. The order row is locked, so a double tap rates once; the store's
   * sum and count move in the same transaction, so its average never drifts.
   */
  async rate(userId: number, orderId: number, input: RatingInput): Promise<void> {
    const problem = ratingProblem(input);
    if (problem) throw new BadRequestException(problem === 'reason' ? 'Pick at least one reason for a low rating' : `Invalid rating ${problem}`);
    await this.db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.customerId, userId)))
        .for('update');
      if (!order) throw orderNotFound();
      if (order.status !== 'delivered') throw new ApiException(HttpStatus.CONFLICT, 'ORDER_STATUS', 'Only a delivered order can be rated');
      const [already] = await tx.select({ id: ratings.id }).from(ratings).where(eq(ratings.orderId, orderId));
      if (already) throw new ApiException(HttpStatus.CONFLICT, 'ALREADY_RATED', 'This order is rated already');
      await tx.insert(ratings).values({ orderId, customerId: userId, storeId: order.storeId, stars: input.stars, tags: input.tags, text: input.text.trim() });
      await tx
        .update(stores)
        .set({ ratingSum: sql`${stores.ratingSum} + ${input.stars}`, ratingCount: sql`${stores.ratingCount} + 1` })
        .where(eq(stores.id, order.storeId));
    });
  }

  /** The popup when the app opens: the newest delivered order of the last days, not rated or closed. */
  async prompt(userId: number): Promise<RatePrompt | null> {
    const since = new Date(Date.now() - PROMPT_DAYS * 24 * 3600_000);
    const [row] = await this.db
      .select({ id: orders.id, store: { name: stores.name, logo: stores.logo } })
      .from(orders)
      .innerJoin(stores, eq(stores.id, orders.storeId))
      .leftJoin(ratings, eq(ratings.orderId, orders.id))
      .where(
        and(eq(orders.customerId, userId), eq(orders.status, 'delivered'), gte(orders.createdAt, since), isNull(orders.ratingSkippedAt), isNull(ratings.id)),
      )
      .orderBy(desc(orders.id))
      .limit(1);
    return row ? { id: row.id, code: codeOf(row.id), store: row.store } : null;
  }

  /** ✕ on the popup: it does not come back for this order; the details keep "قيّم طلبك". */
  async skipPrompt(userId: number, orderId: number): Promise<void> {
    const [res] = await this.db
      .update(orders)
      .set({ ratingSkippedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.customerId, userId)));
    if (res.affectedRows === 0) throw orderNotFound();
  }

  async createTicket(userId: number, input: TicketInput): Promise<void> {
    if (input.orderId !== undefined) {
      if (input.type !== 'complaint') throw new BadRequestException('Only a complaint is about an order');
      const [order] = await this.db
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.id, input.orderId), eq(orders.customerId, userId)));
      if (!order) throw orderNotFound();
    }
    await this.db.insert(tickets).values({ customerId: userId, type: input.type, orderId: input.orderId ?? null, text: input.text.trim() });
  }

  async phones(): Promise<SupportPhone[]> {
    const rows = await this.db.select().from(supportPhones).orderBy(asc(supportPhones.sortOrder));
    return rows.map(({ label, phone }) => ({ label, phone }));
  }

  // The admin's side.

  async adminTickets(filter: { type?: TicketType; status?: TicketStatus }): Promise<AdminTicket[]> {
    const rows = await this.ticketRows(and(filter.type ? eq(tickets.type, filter.type) : undefined, filter.status ? eq(tickets.status, filter.status) : undefined));
    return rows;
  }

  async setTicketStatus(adminId: number, id: number, status: TicketStatus): Promise<AdminTicket> {
    const [res] = await this.db
      .update(tickets)
      .set(status === 'done' ? { status, doneAt: new Date(), doneById: adminId } : { status, doneAt: null, doneById: null })
      .where(eq(tickets.id, id));
    if (res.affectedRows === 0) throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No ticket has this id');
    const [row] = await this.ticketRows(eq(tickets.id, id));
    return row!;
  }

  async adminRatings(): Promise<AdminRating[]> {
    const rows = await this.db
      .select({ rating: ratings, store: { id: stores.id, name: stores.name }, customer: { id: users.id, firstName: users.firstName, lastName: users.lastName, phone: users.phone } })
      .from(ratings)
      .innerJoin(stores, eq(stores.id, ratings.storeId))
      .innerJoin(users, eq(users.id, ratings.customerId))
      .orderBy(desc(ratings.id))
      .limit(300);
    return rows.map(({ rating, store, customer }) => ({
      id: rating.id,
      stars: rating.stars,
      tags: rating.tags,
      text: rating.text,
      customer: { id: customer.id, name: nameOf(customer), phone: customer.phone },
      order: { id: rating.orderId, code: codeOf(rating.orderId) },
      store,
      createdAt: rating.createdAt.toISOString(),
    }));
  }

  /** Replaces the whole list, in the order given. */
  async setPhones(phones: SupportPhone[]): Promise<SupportPhone[]> {
    const saved = phones.map(({ label, phone }) => ({ label, phone }));
    await this.db.transaction(async (tx) => {
      await tx.delete(supportPhones);
      if (saved.length) await tx.insert(supportPhones).values(saved.map((p, i) => ({ ...p, sortOrder: i })));
    });
    // What this call saved, not a later read another admin's save may have replaced (the audit uses it).
    return saved;
  }

  private async ticketRows(where: ReturnType<typeof and>): Promise<AdminTicket[]> {
    const rows = await this.db
      .select({
        ticket: tickets,
        customer: { id: users.id, firstName: users.firstName, lastName: users.lastName, phone: users.phone },
        storeName: stores.name,
      })
      .from(tickets)
      .innerJoin(users, eq(users.id, tickets.customerId))
      .leftJoin(orders, eq(orders.id, tickets.orderId))
      .leftJoin(stores, eq(stores.id, orders.storeId))
      .where(where)
      .orderBy(desc(tickets.id))
      .limit(300);
    return rows.map(({ ticket, customer, storeName }) => toAdminTicket(ticket, customer, storeName));
  }
}

function toAdminTicket(t: TicketRow, customer: { id: number; firstName: string; lastName: string; phone: string }, storeName: string | null): AdminTicket {
  return {
    id: t.id,
    type: t.type,
    status: t.status,
    text: t.text,
    customer: { id: customer.id, name: nameOf(customer), phone: customer.phone },
    order: t.orderId !== null ? { id: t.orderId, code: codeOf(t.orderId), store: storeName ?? '' } : null,
    createdAt: t.createdAt.toISOString(),
    doneAt: t.doneAt?.toISOString() ?? null,
  };
}
