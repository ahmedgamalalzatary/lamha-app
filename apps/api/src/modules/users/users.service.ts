import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Me } from '@tawsela/shared';
import { ApiException } from '../../common/api-exception.js';
import { verifyPassword } from '../auth/password.js';
import { SessionsRepository } from '../auth/sessions.repository.js';
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
    inviteCode: row.inviteCode,
  };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly sessions: SessionsRepository,
  ) {}

  async getMe(id: number): Promise<Me> {
    const row = await this.users.findLiveById(id);
    if (!row) throw new UnauthorizedException();
    return toMe(row);
  }

  /** The profile screen (contract §8.14): email, gender and language. Name, phone and region stay locked. */
  async updateMe(id: number, body: UpdateMeDto): Promise<Me> {
    if (body.email && (await this.users.emailInUse(body.email, id))) {
      throw new ApiException(HttpStatus.CONFLICT, 'EMAIL_TAKEN', 'This email already has an account');
    }
    await this.users.update(id, body);
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
    const now = new Date();
    await this.users.update(id, {
      phone: `deleted-${id}`,
      email: null,
      firstName: '',
      lastName: '',
      passwordHash: '',
      gender: null,
      inviteCode: null,
      deletedAt: now,
      credentialsChangedAt: now,
    });
    await this.sessions.revokeAllForUser(id);
  }

  /** A fresh invite code no one has yet. */
  async uniqueInviteCode(): Promise<string> {
    for (;;) {
      const code = newInviteCode();
      if (!(await this.users.inviteCodeInUse(code))) return code;
    }
  }
}
