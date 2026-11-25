import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminRating, AdminTicket, RatePrompt, SupportPhone } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuditService } from '../audit/audit.service.js';
import { RatingDto, SupportPhonesDto, TicketDto, TicketStatusDto, TicketsQuery } from './support.dto.js';
import { SupportService } from './support.service.js';

/** قيّم طلبك, تقديم شكوى, تقديم مقترح and تواصل معنا (contract §8.8, §8.14). Customers only. */
@ApiTags('support')
@ApiBearerAuth()
@Roles('customer')
@Controller()
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post('me/orders/:id/rating')
  @ApiOperation({ summary: 'Rate a delivered order once (409 ALREADY_RATED, ORDER_STATUS); 1-3 stars need a problem chip' })
  rate(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: RatingDto): Promise<void> {
    return this.support.rate(me.id, id, body);
  }

  @Get('me/rate-prompt')
  @ApiOperation({ summary: 'The delivered order the app asks to rate when it opens ({ order: null } for none)' })
  async prompt(@CurrentUser() me: AuthUser): Promise<{ order: RatePrompt | null }> {
    return { order: await this.support.prompt(me.id) };
  }

  @Post('me/orders/:id/rating/skip')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '✕ on the rating popup: not asked again for this order' })
  skip(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.support.skipPrompt(me.id, id);
  }

  @Post('me/tickets')
  @ApiOperation({ summary: 'A complaint (general or about a past order) or a suggestion' })
  ticket(@CurrentUser() me: AuthUser, @Body() body: TicketDto): Promise<void> {
    return this.support.createTicket(me.id, body);
  }

  @Get('support/phones')
  phones(): Promise<SupportPhone[]> {
    return this.support.phones();
  }
}

/** الشكاوى والاقتراحات, the ratings and the "تواصل معنا" numbers (contract §11). */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin')
export class AdminSupportController {
  constructor(
    private readonly support: SupportService,
    private readonly audit: AuditService,
  ) {}

  @Get('tickets')
  tickets(@Query() query: TicketsQuery): Promise<AdminTicket[]> {
    return this.support.adminTickets(query);
  }

  @Patch('tickets/:id')
  @ApiOperation({ summary: 'Mark a complaint or suggestion done (or open again)' })
  async setStatus(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: TicketStatusDto): Promise<AdminTicket> {
    const ticket = await this.support.setTicketStatus(me.id, id, body.status);
    await this.audit.record(me.id, 'ticket.done', { type: 'ticket', id, name: ticket.customer.name }, { status: body.status });
    return ticket;
  }

  @Get('ratings')
  ratings(): Promise<AdminRating[]> {
    return this.support.adminRatings();
  }

  @Get('settings/support-phones')
  phones(): Promise<SupportPhone[]> {
    return this.support.phones();
  }

  @Put('settings/support-phones')
  async setPhones(@CurrentUser() me: AuthUser, @Body() body: SupportPhonesDto): Promise<SupportPhone[]> {
    const saved = await this.support.setPhones(body.phones);
    await this.audit.record(me.id, 'settings.support', { type: 'settings', id: 1, name: 'أرقام التواصل' }, { phones: saved });
    return saved;
  }
}
