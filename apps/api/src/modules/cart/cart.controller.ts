import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AddCartLineDto, CartQuantityDto, EditCartDto } from './dto/cart.dto.js';
import { CartService } from './cart.service.js';

/** The customer's carts, one per store (contract §8.6). */
@ApiTags('cart')
@ApiBearerAuth()
@Roles('customer')
@Controller('me')
export class CartController {
  constructor(private readonly carts: CartService) {}

  @Get('carts')
  @ApiOperation({ summary: '"سلاتي": the customer\'s carts, one per store, newest first' })
  list(@CurrentUser() me: AuthUser) {
    return this.carts.list(me.id);
  }

  @Delete('carts')
  @ApiOperation({ summary: '"حذف كل السلات؟": empties every cart' })
  clearAll(@CurrentUser() me: AuthUser) {
    return this.carts.clearAll(me.id);
  }

  @Delete('carts/:storeId')
  @ApiOperation({ summary: "سلاتي's delete on one store: empties that store's cart and returns the carts left" })
  removeStore(@CurrentUser() me: AuthUser, @Param('storeId', ParseIntPipe) storeId: number) {
    return this.carts.removeStore(me.id, storeId);
  }

  @Get('carts/:storeId')
  @ApiOperation({ summary: "A store's cart and its totals at current catalog prices (null when empty)" })
  get(@CurrentUser() me: AuthUser, @Param('storeId', ParseIntPipe) storeId: number) {
    return this.carts.get(me.id, storeId);
  }

  @Post('carts/:storeId/validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Check whether a store's cart is ready to move to checkout (409 CART_STORE_CLOSED for a closed store)" })
  validate(@CurrentUser() me: AuthUser, @Param('storeId', ParseIntPipe) storeId: number) {
    return this.carts.validate(me.id, storeId);
  }

  @Post('cart/lines')
  @ApiOperation({ summary: "Add an item to its store's cart, merging equal selections; a closed store's items go in too" })
  add(@CurrentUser() me: AuthUser, @Body() input: AddCartLineDto) {
    return this.carts.add(me.id, input);
  }

  @Patch('cart/lines/:id')
  adjust(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: CartQuantityDto) {
    return this.carts.adjust(me.id, id, body.delta);
  }

  @Delete('cart/lines/:id')
  remove(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.carts.remove(me.id, id);
  }

  @Patch('cart')
  edit(@CurrentUser() me: AuthUser, @Body() input: EditCartDto) {
    return this.carts.edit(me.id, input);
  }
}
