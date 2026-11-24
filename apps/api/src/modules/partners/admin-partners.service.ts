import { HttpStatus, Injectable } from '@nestjs/common';
import type { CreatedAccount, GeneratedPassword, PartnerAccount } from '@tawsela/shared';
import { ApiException } from '../../common/api-exception.js';
import { hashPassword } from '../auth/password.js';
import { SessionsRepository } from '../auth/sessions.repository.js';
import { CatalogRepository } from '../catalog/catalog.repository.js';
import { generatePassword } from '../users/generated-password.js';
import { toStaffAccount } from '../users/staff-account.js';
import { UsersRepository } from '../users/users.repository.js';
import type { CreatePartnerDto } from './dto/partners.dto.js';
import { type PartnerRow, PartnersRepository } from './partners.repository.js';

const toPartnerAccount = (row: PartnerRow, meId: number): PartnerAccount => ({ ...toStaffAccount(row.user, meId), store: row.store });

/**
 * Partner accounts (contract §2, §11.2): made by an admin with a generated password shown once,
 * reset by the admin, disabled by the admin. The dashboard's store page and the admin's mobile
 * accounts tab both use these routes.
 */
@Injectable()
export class AdminPartnersService {
  constructor(
    private readonly partners: PartnersRepository,
    private readonly users: UsersRepository,
    private readonly sessions: SessionsRepository,
    private readonly catalog: CatalogRepository,
  ) {}

  async list(meId: number, filter: { q?: string; storeId?: number }): Promise<PartnerAccount[]> {
    return (await this.partners.list(filter)).map((r) => toPartnerAccount(r, meId));
  }

  async create(meId: number, body: CreatePartnerDto): Promise<CreatedAccount> {
    if (!(await this.catalog.findStore(body.storeId))) throw new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No store has this id');
    if (await this.users.phoneInUse(body.phone)) {
      throw new ApiException(HttpStatus.CONFLICT, 'PHONE_TAKEN', 'This phone already has an account');
    }
    const password = generatePassword();
    const id = await this.users.create({
      role: 'partner',
      phone: body.phone,
      firstName: body.firstName,
      lastName: body.lastName ?? '',
      storeId: body.storeId,
      passwordHash: await hashPassword(password),
    });
    return { account: toPartnerAccount((await this.partners.find(id))!, meId), password };
  }

  /** A new generated password; the old one and every session of the account stop working. */
  async resetPassword(id: number): Promise<GeneratedPassword> {
    await this.partnerOrThrow(id);
    const password = generatePassword();
    await this.users.endSessions(id, { passwordHash: await hashPassword(password) });
    await this.sessions.revokeAllForUser(id);
    return { password };
  }

  /** A disabled account is signed out at once. */
  async setDisabled(meId: number, id: number, disabled: boolean): Promise<PartnerAccount> {
    await this.partnerOrThrow(id);
    if (disabled) {
      await this.users.endSessions(id, { disabledAt: new Date() });
      await this.sessions.revokeAllForUser(id);
    } else {
      await this.users.update(id, { disabledAt: null });
    }
    return toPartnerAccount((await this.partners.find(id))!, meId);
  }

  private async partnerOrThrow(id: number): Promise<PartnerRow> {
    const row = await this.partners.find(id);
    if (!row) throw new ApiException(HttpStatus.NOT_FOUND, 'ACCOUNT_NOT_FOUND', 'No partner has this id');
    return row;
  }
}
