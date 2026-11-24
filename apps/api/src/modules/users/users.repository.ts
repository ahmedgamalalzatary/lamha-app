import { Injectable } from '@nestjs/common';
import type { Role } from '@tawsela/shared';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import { type NewUser, type UserRow, users } from './users.schema.js';

/** Database access for accounts. "Live" means not deleted (a disabled account is still live). */
@Injectable()
export class UsersRepository {
  constructor(@InjectDb() private readonly db: Db) {}

  async findLiveById(id: number): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(and(eq(users.id, id), isNull(users.deletedAt)));
    return row;
  }

  /** Oldest first. */
  async listLiveByRole(role: Role): Promise<UserRow[]> {
    return this.db.select().from(users).where(and(eq(users.role, role), isNull(users.deletedAt))).orderBy(asc(users.id));
  }

  /** The partner accounts of these stores, oldest first (contract §2). */
  async listLivePartnersOf(storeIds: number[]): Promise<UserRow[]> {
    if (!storeIds.length) return [];
    return this.db
      .select()
      .from(users)
      .where(and(eq(users.role, 'partner'), inArray(users.storeId, storeIds), isNull(users.deletedAt)))
      .orderBy(asc(users.id));
  }

  async findLiveByPhone(phone: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(and(eq(users.phone, phone), isNull(users.deletedAt)));
    return row;
  }

  async phoneInUse(phone: string): Promise<boolean> {
    const [row] = await this.db.select({ id: users.id }).from(users).where(eq(users.phone, phone));
    return !!row;
  }

  /** Whether another account already has this email. */
  async emailInUse(email: string, exceptId?: number): Promise<boolean> {
    const [row] = await this.db.select({ id: users.id }).from(users).where(eq(users.email, email));
    return !!row && row.id !== exceptId;
  }

  async findByInviteCode(code: string): Promise<UserRow | undefined> {
    const [row] = await this.db.select().from(users).where(and(eq(users.inviteCode, code), isNull(users.deletedAt)));
    return row;
  }

  async inviteCodeInUse(code: string): Promise<boolean> {
    const [row] = await this.db.select({ id: users.id }).from(users).where(eq(users.inviteCode, code));
    return !!row;
  }

  async create(values: NewUser): Promise<number> {
    const [res] = await this.db.insert(users).values(values).$returningId();
    return res!.id;
  }

  async update(id: number, values: Partial<NewUser>): Promise<void> {
    await this.db.update(users).set(values).where(eq(users.id, id));
  }

  /** Saves the changes and moves the session version on in one statement: every token stops working. */
  async endSessions(id: number, values: Partial<NewUser> = {}): Promise<void> {
    await this.db
      .update(users)
      .set({ ...values, sessionVersion: sql`${users.sessionVersion} + 1` })
      .where(eq(users.id, id));
  }

  /**
   * The forgotten-password reset: only while the account is still at the version the emailed code
   * was checked under, so a ticket works once and never for an account made since.
   */
  async resetPasswordAt(id: number, version: number, passwordHash: string): Promise<boolean> {
    const [res] = await this.db
      .update(users)
      .set({ passwordHash, sessionVersion: sql`${users.sessionVersion} + 1` })
      .where(and(eq(users.id, id), eq(users.sessionVersion, version), isNull(users.deletedAt)));
    return res.affectedRows === 1;
  }

  /**
   * Disables or enables an admin. The enabled admins are locked first, so two admins disabling
   * each other at the same moment cannot leave none: false when this would disable the last one.
   */
  async setAdminDisabled(id: number, disabled: boolean): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const enabled = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, 'admin'), isNull(users.deletedAt), isNull(users.disabledAt)))
        .for('update');
      if (disabled && !enabled.some((a) => a.id !== id)) return false;
      await tx
        .update(users)
        .set(disabled ? { disabledAt: new Date(), sessionVersion: sql`${users.sessionVersion} + 1` } : { disabledAt: null })
        .where(eq(users.id, id));
      return true;
    });
  }
}
