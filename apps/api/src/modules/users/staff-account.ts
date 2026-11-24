import type { StaffAccount } from '@tawsela/shared';
import type { UserRow } from './users.schema.js';

/** What the dashboard sees of an account it manages. */
export function toStaffAccount(row: UserRow, meId: number): StaffAccount {
  return {
    id: row.id,
    role: row.role,
    phone: row.phone,
    firstName: row.firstName,
    lastName: row.lastName,
    disabled: !!row.disabledAt,
    createdAt: row.createdAt.toISOString(),
    you: row.id === meId,
  };
}
