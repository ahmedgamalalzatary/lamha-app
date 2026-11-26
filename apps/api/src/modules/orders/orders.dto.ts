import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { COUPON, ORDER_STATUSES, type OrderStatus } from '@tawsela/shared';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';
import { LatLngDto } from '../addresses/dto/addresses.dto.js';

/** POST /v1/me/checkout/quote */
export class CheckoutQuoteDto {
  @ApiPropertyOptional({ description: 'The saved address it goes to; required for a delivery' })
  @IsOptional()
  @IsInt()
  addressId?: number;

  @ApiPropertyOptional({ type: LatLngDto, description: 'The spot confirmed on the map, when it moved from the saved one' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LatLngDto)
  location?: LatLngDto;

  @ApiPropertyOptional({ maxLength: COUPON.codeMaxLength, example: 'Black Friday', description: '"وفر على طلبك": a code, as typed; empty is none' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsString()
  @MaxLength(COUPON.codeMaxLength)
  couponCode?: string;
}

/** POST /v1/me/orders */
export class PlaceOrderDto extends CheckoutQuoteDto {
  @ApiProperty()
  @IsInt()
  cartId: number;

  @ApiProperty({ type: Number, nullable: true, description: 'A slot from the quote (minutes after midnight in Cairo), or null for now' })
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(0)
  @Max(2 * 1440)
  slot: number | null;

  @ApiProperty({ description: 'The total the customer saw' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  expectedTotal: number;

  @ApiPropertyOptional({ description: 'What "رصيد المحفظة" pays, as the customer saw it; 0 or left out: the wallet is off' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  expectedWalletPaid?: number;

  @ApiPropertyOptional({ description: 'The points "نقاطي" spends, as the customer saw it; 0 or left out: points are off' })
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedPointsSpent?: number;

  @ApiProperty({ format: 'uuid', description: 'One per tap of "تنفيذ الطلب"' })
  @IsUUID()
  requestId: string;
}

/** GET /v1/admin/orders */
export class AdminOrdersQuery {
  @ApiPropertyOptional({ enum: ORDER_STATUSES })
  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: OrderStatus;
}

/** POST /v1/me/orders/:id/reorder */
export class ReorderDto {
  @ApiPropertyOptional({ description: "Another store's cart the customer agreed to replace" })
  @IsOptional()
  @IsInt()
  replaceCartId?: number;
}
