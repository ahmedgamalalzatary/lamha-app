import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  BANNER_OPENS,
  BANNER_PLACES,
  type BannerOpens,
  type BannerPlace,
  COUPON,
  COUPON_KINDS,
  type CouponKind,
  OFFER_KINDS,
  type OfferKind,
  PAID_BY,
  type PaidBy,
  SEARCH_SCOPES,
  type SearchScope,
} from '@tawsela/shared';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const MONEY = { maxDecimalPlaces: 2 } as const;
const MAX_MONEY = 100_000;
const IMAGE_PATH = /^\/uploads\/[A-Za-z0-9/_.-]+$/;

/** POST /v1/admin/coupons (every field optional on PATCH). Who pays is set per code [Owner, 2026-11-26]. */
export class CouponDto {
  @ApiProperty({ maxLength: COUPON.codeMaxLength, example: 'Black Friday', description: 'Matched however it is typed' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(COUPON.codeMaxLength)
  code: string;

  @ApiProperty({ maxLength: COUPON.titleMaxLength, example: 'Black Friday' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(COUPON.titleMaxLength)
  title: string;

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'null: every store' })
  @IsOptional()
  @IsInt()
  storeId?: number | null;

  @ApiProperty({ enum: COUPON_KINDS })
  @IsIn(COUPON_KINDS)
  kind: CouponKind;

  @ApiProperty({ description: 'ج.م, or 1–100 for a percentage' })
  @IsNumber(MONEY)
  @Min(0.01)
  @Max(MAX_MONEY)
  value: number;

  @ApiPropertyOptional({ type: Number, nullable: true, description: "A percentage's cap in ج.م" })
  @IsOptional()
  @IsNumber(MONEY)
  @Min(0.01)
  @Max(MAX_MONEY)
  maxDiscount?: number | null;

  @ApiProperty({ minimum: 0 })
  @IsNumber(MONEY)
  @Min(0)
  @Max(MAX_MONEY)
  minOrder: number;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-11-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  startsAt?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '2026-11-30T21:59:59.000Z' })
  @IsOptional()
  @IsISO8601()
  endsAt?: string | null;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  perCustomer: number;

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Uses by everyone; null for no limit' })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalLimit?: number | null;

  @ApiProperty({ enum: PAID_BY })
  @IsIn(PAID_BY)
  paidBy: PaidBy;

  @ApiProperty()
  @IsBoolean()
  active: boolean;
}

export class UpdateCouponDto extends PartialType(CouponDto, { skipNullProperties: false }) {}

/** PUT /v1/admin/products/:id/discount */
export class ProductDiscountDto {
  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Above the price; null ends the discount' })
  @IsOptional()
  @IsNumber(MONEY)
  @Min(0.01)
  @Max(MAX_MONEY)
  oldPrice?: number | null;

  @ApiProperty({ enum: PAID_BY })
  @IsIn(PAID_BY)
  paidBy: PaidBy;
}

/** POST /v1/admin/banners (every field optional on PATCH). */
export class BannerDto {
  @ApiProperty({ example: '/uploads/catalog/2b1c.jpg' })
  @Matches(IMAGE_PATH, { message: 'images must be a path from /v1/admin/uploads' })
  image: string;

  @ApiProperty({ enum: BANNER_PLACES })
  @IsIn(BANNER_PLACES)
  place: BannerPlace;

  @ApiProperty()
  @IsInt()
  storeId: number;

  @ApiProperty({ enum: BANNER_OPENS })
  @IsIn(BANNER_OPENS)
  opens: BannerOpens;

  @ApiProperty()
  @IsInt()
  sortOrder: number;

  @ApiProperty()
  @IsBoolean()
  active: boolean;
}

export class UpdateBannerDto extends PartialType(BannerDto) {}

/** GET /v1/catalog/offers: the offers screen's tab and sub-tab (§8.10). */
export class OffersQueryDto {
  @ApiProperty({ enum: OFFER_KINDS })
  @IsIn(OFFER_KINDS)
  kind: OfferKind;

  @ApiPropertyOptional({ enum: SEARCH_SCOPES, default: 'all' })
  @IsOptional()
  @IsIn(SEARCH_SCOPES)
  scope: SearchScope = 'all';

  @ApiPropertyOptional({ description: "The customer's chosen address" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  addressId?: number;
}
