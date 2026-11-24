import { HttpStatus, Injectable } from '@nestjs/common';
import type { CreatedAccount, GeneratedPassword, StaffAccount } from '@tawsela/shared';
import { ApiException } from '../../common/api-exception.js';
import { hashPassword } from '../auth/password.js';
import { SessionsRepository } from '../auth/sessions.repository.js';
import { generatePassword } from '../users/generated-password.js';
import { UsersRepository } from '../users/users.repository.js';
import type { UserRow } from '../users/users.schema.js';
import { toStaffAccount } from '../users/staff-account.js';
import type { CreateAdminDto } from './dto/admins.dto.js';

/**
 * الإعدادات › حسابات الإدارة (contract §1.1 A23). Like partner and driver accounts (§2), an admin
 * account is made by another admin with a generated password shown once. An admin cannot reset or
 * disable their own account here, so the team is never left without a working admin.
 */
@Injectable()
export class AdminsService {
  constructor(
    private readonly users: UsersRepository,
    private readonly sessions: SessionsRepository,
  ) {}

  async list(meId: number): Promise<StaffAccount[]> {
    return (await this.users.listLiveByRole('admin')).map((row) => toStaffAccount(row, meId));
  }

  async create(meId: number, body: CreateAdminDto): Promise<CreatedAccount> {
    if (await this.users.phoneInUse(body.phone)) {
      throw new ApiException(HttpStatus.CONFLICT, 'PHONE_TAKEN', 'This phone already has an account');
    }
    const password = generatePassword();
    const id = await this.users.create({
      role: 'admin',
      phone: body.phone,
      firstName: body.firstName,
      lastName: body.lastName ?? '',
      passwordHash: await hashPassword(password),
    });
    return { account: toStaffAccount((await this.users.findLiveById(id))!, meId), password };
  }

  /** A new generated password; the old one and every session of the account stop working. */
  async resetPassword(meId: number, id: number): Promise<GeneratedPassword> {
    await this.other(meId, id);
    const password = generatePassword();
    await this.users.endSessions(id, { passwordHash: await hashPassword(password) });
    await this.sessions.revokeAllForUser(id);
    return { password };
  }

  /**
   * A disabled account is signed out at once (the access-token guard re-reads the account). The
   * last enabled admin cannot be disabled, even by two admins disabling each other at once.
   */
  async setDisabled(meId: number, id: number, disabled: boolean): Promise<StaffAccount> {
    await this.other(meId, id);
    if (!(await this.users.setAdminDisabled(id, disabled))) {
      throw new ApiException(HttpStatus.BAD_REQUEST, 'LAST_ADMIN', 'At least one admin must stay enabled');
    }
    if (disabled) await this.sessions.revokeAllForUser(id);
    return toStaffAccount((await this.users.findLiveById(id))!, meId);
  }

  private async other(meId: number, id: number): Promise<UserRow> {
    if (id === meId) throw new ApiException(HttpStatus.BAD_REQUEST, 'OWN_ACCOUNT', 'Another admin must change your own account');
    const row = await this.users.findLiveById(id);
    if (row?.role !== 'admin') throw new ApiException(HttpStatus.NOT_FOUND, 'ACCOUNT_NOT_FOUND', 'No admin has this id');
    return row;
  }
}
