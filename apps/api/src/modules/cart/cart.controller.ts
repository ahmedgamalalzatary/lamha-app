import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AddCartLineDto, CartQuantityDto, EditCartDto } from './cart.dto.js';
import { CartService } from './cart.service.js';

@ApiTags('cart')
@ApiBearerAuth()
@Roles('customer')
@Controller('me/cart')
export class CartController {
  constructor(private readonly carts: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get the current cart and its totals at current catalog prices' })
  get(@CurrentUser() me: AuthUser) {
    return this.carts.get(me.id);
  }

  @Post('lines')
  @ApiOperation({ summary: 'Add an item, merging equal selections and requiring confirmation to change stores' })
  add(@CurrentUser() me: AuthUser, @Body() input: AddCartLineDto) {
    return this.carts.add(me.id, input);
  }

  @Patch('lines/:id')
  adjust(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() body: CartQuantityDto) {
    return this.carts.adjust(me.id, id, body.delta);
  }

  @Delete('lines/:id')
  remove(@CurrentUser() me: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.carts.remove(me.id, id);
  }

  @Patch()
  edit(@CurrentUser() me: AuthUser, @Body() input: EditCartDto) {
    return this.carts.edit(me.id, input);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check whether the current cart is ready to move to checkout' })
  validate(@CurrentUser() me: AuthUser) {
    return this.carts.validate(me.id);
  }
}
