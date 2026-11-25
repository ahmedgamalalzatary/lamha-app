import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Me } from '@tawsela/shared';
import { ApiException } from '../../common/api-exception.js';
import { verifyPassword } from '../auth/password.js';
import { UploadsService } from '../uploads/uploads.service.js';
import type { UpdateMeDto } from './dto/me.dto.js';
import { newInviteCode } from './invite-code.js';
import { UsersRepository } from './users.repository.js';
import type { UserRow } from './users.schema.js';

/** What the apps see of an account: never the password hash or internal dates. */
export function toMe(row: UserRow): Me {
  return {
    id: row.id,
    role: row.role,
    phone: row.phone,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    gender: row.gender,
    region: row.region,
    locale: row.locale,
    avatar: row.avatar,
    inviteCode: row.inviteCode,
    notificationsEnabled: row.notificationsEnabled,
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly uploads: UploadsService,
  ) {}

  async getMe(id: number): Promise<Me> {
    const row = await this.users.findLiveById(id);
    if (!row) throw new UnauthorizedException();
    return toMe(row);
  }

  /** The profile screen (contract §8.14): gender and language. Name and region stay locked; phone and email change with a code. */
  async updateMe(id: number, body: UpdateMeDto): Promise<Me> {
    await this.users.update(id, body);
    return this.getMe(id);
  }

  /** The profile photo ("اختر صورة"): the path of the saved image. The old photo's file goes (review F13). */
  async setAvatar(id: number, avatar: string): Promise<Me> {
    const before = await this.users.findLiveById(id);
    await this.users.update(id, { avatar });
    if (before?.avatar && before.avatar !== avatar) await this.uploads.remove(before.avatar);
    return this.getMe(id);
  }

  /**
   * "حذف الحساب" (customers only). The row stays for the orders that point at it, but the phone,
   * email, name and password go, so the number can sign up again. Every session ends.
   */
  async deleteMe(id: number, password: string): Promise<void> {
    const row = await this.users.findLiveById(id);
    if (!row) throw new UnauthorizedException();
    if (!(await verifyPassword(row.passwordHash, password))) {
      throw new ApiException(HttpStatus.FORBIDDEN, 'WRONG_PASSWORD', 'Wrong password');
    }
    const deleted = await this.users.deleteAccount(id, {
      phone: `deleted-${id}`,
      email: null,
      firstName: '',
      lastName: '',
      passwordHash: '',
      gender: null,
      avatar: null,
      inviteCode: null,
      deletedAt: new Date(),
    });
    if (!deleted) throw new UnauthorizedException();
    await this.uploads.remove(row.avatar);
  }

  /** A fresh invite code no one has yet. */
  async uniqueInviteCode(): Promise<string> {
    for (;;) {
      const code = newInviteCode();
      if (!(await this.users.inviteCodeInUse(code))) return code;
    }
  }
}
