import { Injectable } from '@nestjs/common';
import { AUDIT_PAGE_SIZE, type AuditAction, type AuditEntry, type AuditPage, type AuditTargetType } from '@tawsela/shared';
import { desc, eq, lt } from 'drizzle-orm';
import { type Db, InjectDb } from '../../core/db/db.module.js';
import { users } from '../users/users.schema.js';
import { type AuditRow, auditLog } from './audit.schema.js';

const toEntry = (r: AuditRow): AuditEntry => ({
  id: r.id,
  at: r.createdAt.toISOString(),
  actor: { id: r.actorId, name: r.actorName },
  action: r.action as AuditAction,
  target: { type: r.targetType, id: r.targetId, name: r.targetName },
  details: r.details,
});

/** سجل التغييرات (review F70). Admin routes write to it after a change succeeds. */
@Injectable()
export class AuditService {
  constructor(@InjectDb() private readonly db: Db) {}

  /** Records a change. `details`: the changed fields and their new values, never a password. */
  async record(actorId: number, action: AuditAction, target: { type: AuditTargetType; id: number; name: string }, details: Record<string, unknown> = {}): Promise<void> {
    const [actor] = await this.db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, actorId));
    await this.db.insert(auditLog).values({
      actorId,
      actorName: actor ? `${actor.firstName} ${actor.lastName}`.trim() : '',
      action,
      targetType: target.type,
      targetId: target.id,
      targetName: target.name,
      details,
      createdAt: new Date(),
    });
  }

  /** A change to an admin or partner account, named as the account is now. */
  async recordAccount(actorId: number, action: AuditAction, accountId: number, details: Record<string, unknown> = {}): Promise<void> {
    const [account] = await this.db.select({ firstName: users.firstName, lastName: users.lastName }).from(users).where(eq(users.id, accountId));
    await this.record(actorId, action, { type: 'account', id: accountId, name: account ? nameOf(account) : '' }, details);
  }

  /** Newest first; `before` continues from an earlier page. */
  async list(before?: number): Promise<AuditPage> {
    const rows = await this.db
      .select()
      .from(auditLog)
      .where(before === undefined ? undefined : lt(auditLog.id, before))
      .orderBy(desc(auditLog.id))
      .limit(AUDIT_PAGE_SIZE + 1);
    const page = rows.slice(0, AUDIT_PAGE_SIZE);
    return { entries: page.map(toEntry), next: rows.length > AUDIT_PAGE_SIZE ? page.at(-1)!.id : null };
  }
}

/** "سارة حسن": an account's name as the log shows it. */
export const nameOf = (a: { firstName: string; lastName: string }) => `${a.firstName} ${a.lastName}`.trim();
