import { datetime, int, json, mysqlEnum, mysqlTable, varchar } from 'drizzle-orm/mysql-core';

/**
 * سجل التغييرات (review F70): one row per change an admin makes to accounts, stores or zones. The
 * actor and target keep the names they had then, and no foreign keys, so the record outlives them.
 * Kept for good until the owner sets a retention [Open]. Never holds a password.
 */
export const auditLog = mysqlTable('audit_log', {
  id: int('id', { unsigned: true }).autoincrement().primaryKey(),
  actorId: int('actor_id', { unsigned: true }).notNull(),
  actorName: varchar('actor_name', { length: 210 }).notNull(),
  action: varchar('action', { length: 40 }).notNull(),
  targetType: mysqlEnum('target_type', ['account', 'store', 'zone', 'settings', 'order', 'ticket']).notNull(),
  targetId: int('target_id', { unsigned: true }).notNull(),
  targetName: varchar('target_name', { length: 255 }).notNull(),
  details: json('details').$type<Record<string, unknown>>().notNull(),
  createdAt: datetime('created_at').notNull(),
});

export type AuditRow = typeof auditLog.$inferSelect;
