import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Campaign, NotificationsPage } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuditService } from '../audit/audit.service.js';
import { CampaignDto, NotificationsQuery, PushTokenDto } from './dto/notifications.dto.js';
import { NotificationsService } from './notifications.service.js';

/** الإشعارات and the phone's push token, for every signed-in account (contract §8.14, §9, §10). */
@ApiTags('notifications')
@ApiBearerAuth()
@Roles('customer', 'partner', 'driver', 'admin')
@Controller('me')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Post('push-tokens')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "This phone's Expo push token; it moves to whoever signed in on the phone last" })
  register(@CurrentUser() me: AuthUser, @Body() body: PushTokenDto): Promise<void> {
    return this.notifications.registerToken(me.id, body.token);
  }

  @Delete('push-tokens')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Signing out on this phone: no more pushes to it' })
  remove(@CurrentUser() me: AuthUser, @Body() body: PushTokenDto): Promise<void> {
    return this.notifications.removeToken(me.id, body.token);
  }

  @Get('notifications')
  list(@CurrentUser() me: AuthUser, @Query() query: NotificationsQuery): Promise<NotificationsPage> {
    return this.notifications.list(me.id, query.limit ?? 30, query.before);
  }

  @Post('notifications/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  read(@CurrentUser() me: AuthUser): Promise<void> {
    return this.notifications.markAllRead(me.id);
  }
}

/** التسويق والعروض › الإشعارات التفاعلية (contract §11): sent now [Owner]. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/campaigns')
export class AdminCampaignsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  list(): Promise<Campaign[]> {
    return this.notifications.campaigns();
  }

  @Post()
  @ApiOperation({ summary: 'Send a push and a الإشعارات entry to every customer, or those with an address in one zone' })
  async send(@CurrentUser() me: AuthUser, @Body() body: CampaignDto): Promise<Campaign> {
    const sent = await this.notifications.sendCampaign(me.id, body);
    await this.audit.record(me.id, 'campaign.send', { type: 'campaign', id: sent.id, name: sent.title }, { zone: sent.zone?.name ?? null, recipients: sent.recipients });
    return sent;
  }
}
