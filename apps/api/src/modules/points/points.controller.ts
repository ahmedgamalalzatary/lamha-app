import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { MyPoints, PointsSettings } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuditService } from '../audit/audit.service.js';
import { PointsAdjustDto, PointsSettingsDto } from './points.dto.js';
import { PointsService } from './points.service.js';

/** نقاطي (contract §8.16). Customers only. */
@ApiTags('points')
@ApiBearerAuth()
@Roles('customer')
@Controller('me/points')
export class PointsController {
  constructor(private readonly points: PointsService) {}

  @Get()
  @ApiOperation({ summary: 'The balance, its value, the rules, and المكتسبة / المنفقة, newest first' })
  mine(@CurrentUser() me: AuthUser): Promise<MyPoints> {
    return this.points.mine(me.id);
  }
}

/** الإعدادات › النقاط and the customers' points (contract §11 A5, A21). */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminPointsController {
  constructor(
    private readonly points: PointsService,
    private readonly audit: AuditService,
  ) {}

  @Get('settings/points')
  settings(): Promise<PointsSettings> {
    return this.points.settings();
  }

  @Patch('settings/points')
  async update(@CurrentUser() me: AuthUser, @Body() body: PointsSettingsDto): Promise<PointsSettings> {
    const saved = await this.points.updateSettings(body);
    await this.audit.record(me.id, 'settings.points', { type: 'settings', id: 1, name: 'النقاط' }, { ...body });
    return saved;
  }

  @Post('customers/:id/points')
  @ApiOperation({ summary: 'Add or deduct points with a reason (422 POINTS_BALANCE: a deduction over the balance)' })
  async adjust(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: PointsAdjustDto): Promise<{ balance: number }> {
    const { balance, name } = await this.points.adjust(me.id, id, body);
    await this.audit.record(me.id, 'customer.points', { type: 'account', id, name }, { kind: body.kind, points: body.points, note: body.note, balance });
    return { balance };
  }
}
