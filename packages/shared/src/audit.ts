// سجل التغييرات (review F70): who changed accounts, stores and zones, and when. Shared by the API and
// the dashboard. Passwords are never written to it.

export const AUDIT_ACTIONS = [
  'admin.create',
  'admin.password',
  'admin.disable',
  'admin.enable',
  'partner.create',
  'partner.password',
  'partner.disable',
  'partner.enable',
  'store.create',
  'store.update',
  'zone.create',
  'zone.update',
  'settings.delivery',
  'driver.create',
  'driver.password',
  'driver.disable',
  'driver.enable',
  'driver.schedule',
  'driver.shift',
  'order.assign',
  'settings.drivers',
  'ticket.done',
  'settings.support',
  'campaign.send',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditTargetType = 'account' | 'store' | 'zone' | 'settings' | 'order' | 'ticket' | 'campaign';

export interface AuditEntry {
  id: number;
  /** ISO time. */
  at: string;
  /** The admin who made the change, by the name they had then. */
  actor: { id: number; name: string };
  action: AuditAction;
  /** What changed, by the name it had then. */
  target: { type: AuditTargetType; id: number; name: string };
  /** The changed fields and their new values (a zone's outline as its corner count). */
  details: Record<string, unknown>;
}

/** One page, newest first; `next` asks for the older ones (`before`), null at the start of the log. */
export interface AuditPage {
  entries: AuditEntry[];
  next: number | null;
}

export const AUDIT_PAGE_SIZE = 50;
