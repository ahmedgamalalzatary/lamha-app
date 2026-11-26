import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type AdminOrder,
  type CheckoutQuote,
  type CustomerOrder,
  type CustomerOrderDetails,
  PARTNER_ACTIONS,
  type PartnerAction,
  type PartnerOrder,
  type PartnerOrderCounts,
  type PartnerOrderDetails,
  type PlacedOrder,
  type ReorderResult,
} from '@tawsela/shared';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import type { StoreRow } from '../catalog/catalog.schema.js';
import { CurrentStore, PartnerArea } from '../partners/partner-store.guard.js';
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

  @Get('orders/:id')
  @ApiOperation({ summary: 'تفاصيل الطلب: lines, address, captain and payment' })
  details(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<CustomerOrderDetails> {
    return this.orders.details(me.id, id);
  }

  @Post('orders/:id/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'اطلب تاني: a finished order back in the cart, skipping lines gone from the menu (409 CART_ITEM_UNAVAILABLE, ORDER_STATUS)',
  })
  reorder(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number): Promise<ReorderResult> {
    return this.orders.reorder(me.id, id);
  }
}

/** The store's orders, in the partner app and /partner (contract §9, §11.1): only the partner's own store. */
@ApiTags('partner')
@ApiBearerAuth()
@PartnerArea()
@Controller('partner/orders')
export class PartnerOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@CurrentStore() store: StoreRow, @Query() query: AdminOrdersQuery): Promise<PartnerOrder[]> {
    return this.orders.partnerList(store.id, query.status);
  }

  @Get('counts')
  counts(@CurrentStore() store: StoreRow): Promise<PartnerOrderCounts> {
    return this.orders.partnerCounts(store.id);
  }

  @Get(':id')
  details(@CurrentStore() store: StoreRow, @Param('id', ParseIntPipe) id: number): Promise<PartnerOrderDetails> {
    return this.orders.partnerDetails(store.id, id);
  }

  @Post(':id/:action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'accept, reject, ready, collected (a pickup the customer took), out and delivered (a store delivering itself); 409 ORDER_STATUS when it already moved on' })
  step(
    @CurrentUser() me: AuthUser,
    @CurrentStore() store: StoreRow,
    @Param('id', ParseIntPipe) id: number,
    @Param('action') action: string,
  ): Promise<PartnerOrderDetails> {
    if (!(PARTNER_ACTIONS as readonly string[]).includes(action)) throw new NotFoundException();
    return this.orders.partnerStep(store, me.id, id, action as PartnerAction);
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
