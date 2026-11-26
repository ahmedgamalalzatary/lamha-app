import { BadRequestException, Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type InviteOverview, type InviteSettings, inviteSettingsProblem } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuditService } from '../audit/audit.service.js';
import { InviteSettingsDto } from './dto/invites.dto.js';
import { InvitesService } from './invites.service.js';

/** ادعُ أصدقاءك (contract §8.17). Customers only. */
@ApiTags('invites')
@ApiBearerAuth()
@Roles('customer')
@Controller('me/invite')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Get()
  @ApiOperation({ summary: 'The code, the rules, ربحت, رصيدك المتاح, what the month still allows, and the friends who joined' })
  mine(@CurrentUser() me: AuthUser): Promise<InviteOverview> {
    return this.invites.mine(me.id);
  }
}

/** التسويق والعروض › مكافآت الدعوة (contract §11 A17). */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/settings/invites')
export class AdminInvitesController {
  constructor(
    private readonly invites: InvitesService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  settings(): Promise<InviteSettings> {
    return this.invites.settings();
  }

  @Patch()
  async update(@CurrentUser() me: AuthUser, @Body() body: InviteSettingsDto): Promise<InviteSettings> {
    // Only the fields sent: the DTO's missing ones are undefined and must not blank the saved ones.
    const change = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)) as Partial<InviteSettings>;
    const problem = inviteSettingsProblem({ ...(await this.invites.settings()), ...change });
    if (problem) throw new BadRequestException(`Invalid ${problem}`);
    const saved = await this.invites.updateSettings(change);
    await this.audit.record(me.id, 'settings.invites', { type: 'settings', id: 1, name: 'مكافآت الدعوة' }, change);
    return saved;
  }
}
