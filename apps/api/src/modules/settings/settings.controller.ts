import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { DeliverySettings } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuditService } from '../audit/audit.service.js';
import { DeliverySettingsDto } from './settings.dto.js';
import { SettingsService } from './settings.service.js';

@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Get('delivery')
  @ApiOperation({ summary: 'The delivery fee rule and the global payment option' })
  delivery(): Promise<DeliverySettings> {
    return this.settings.delivery();
  }

  @Patch('delivery')
  async update(@CurrentUser() me: AuthUser, @Body() body: DeliverySettingsDto): Promise<DeliverySettings> {
    const saved = await this.settings.updateDelivery(body);
    await this.audit.record(me.id, 'settings.delivery', { type: 'settings', id: 1, name: 'رسوم التوصيل والدفع' }, { ...body });
    return saved;
  }
}
