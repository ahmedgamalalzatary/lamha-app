import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
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
}
