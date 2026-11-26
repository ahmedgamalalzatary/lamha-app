import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  COUPON,
  ORDER_STATUSES,
  type OrderStatus,
  PHARMACY_REQUEST_KINDS,
  PHARMACY_REQUEST_TEXT_LIMIT,
  type PharmacyRequestKind,
  REQUEST_IMAGE_PATTERN,
  REQUEST_PRICE_MAX,
} from '@tawsela/shared';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';
import { LatLngDto } from '../addresses/dto/addresses.dto.js';

/** A pharmacy request (contract §8.11): a photo from POST /v1/me/uploads, a text, or both. */
export class PharmacyRequestDto {
  @ApiProperty({ description: 'The pharmacy chosen in "اختر صيدلية"' })
  @IsInt()
  storeId: number;

  @ApiProperty({ enum: PHARMACY_REQUEST_KINDS })
  @IsIn(PHARMACY_REQUEST_KINDS)
  kind: PharmacyRequestKind;

  @ApiProperty({ type: String, nullable: true, example: '/uploads/requests/0f3c.jpg' })
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(REQUEST_IMAGE_PATTERN)
  image: string | null;

  @ApiProperty({ maxLength: PHARMACY_REQUEST_TEXT_LIMIT, description: '"اكتب طلبك"; may be empty with a photo' })
  @IsString()
  @MaxLength(PHARMACY_REQUEST_TEXT_LIMIT)
  text: string;
}

/** POST /v1/me/checkout/quote */
export class CheckoutQuoteDto {
  @ApiPropertyOptional({ description: "The store's cart being paid for (one per store); or a pharmacy request" })
  @IsOptional()
  @IsInt()
  cartId?: number;

  @ApiPropertyOptional({ type: PharmacyRequestDto, description: 'A pharmacy request instead of a cart: no code or points, priced on accept' })
  @IsOptional()
  @ValidateNested()
  @Type(() => PharmacyRequestDto)
  request?: PharmacyRequestDto;

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

/** POST /v1/partner/orders/:id/:action */
export class PartnerStepDto {
  @ApiPropertyOptional({ description: '"قبول" of a pharmacy request: the items price the pharmacy sets (§8.11)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(REQUEST_PRICE_MAX)
  price?: number;
}
