import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AdminOrder, CheckoutQuote, CustomerOrder, PlacedOrder } from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AdminOrdersQuery, CheckoutQuoteDto, PlaceOrderDto } from './orders.dto.js';
import { OrdersService } from './orders.service.js';

/** "إتمام الدفع" and طلباتي (contract §8.7, §8.8). Customers only. */
@ApiTags('orders')
@ApiBearerAuth()
@Roles('customer')
@Controller('me')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('checkout/quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "The bill for the cart: items, the distance fee and today's later slots" })
  quote(@CurrentUser() me: AuthUser, @Body() body: CheckoutQuoteDto): Promise<CheckoutQuote> {
    return this.orders.quote(me.id, body);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Place the order at the bill the customer saw (409 CHECKOUT_TOTAL_CHANGED otherwise)' })
  place(@CurrentUser() me: AuthUser, @Body() body: PlaceOrderDto): Promise<PlacedOrder> {
    return this.orders.place(me.id, body);
  }

  @Get('orders')
  mine(@CurrentUser() me: AuthUser): Promise<CustomerOrder[]> {
    return this.orders.mine(me.id);
  }
}

/** The dashboard's الطلبات table (contract §11). */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query() query: AdminOrdersQuery): Promise<AdminOrder[]> {
    return this.orders.adminList(query.status);
  }
}
