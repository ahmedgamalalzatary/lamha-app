import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  CATALOG,
  DELIVERED_BY,
  type DeliveredBy,
  HOME_TILE_ROWS,
  type TileRow,
  STORE_LAYOUTS,
  type StoreLayout,
  VERTICALS,
  type Vertical,
} from '@tawsela/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateAdminDto } from '../../admins/dto/admins.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Empty text means "none". */
const trimOrNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

/** A path the upload route returned, or a seed image: "/uploads/…". */
const IMAGE_PATH = /^\/uploads\/[A-Za-z0-9/_.-]+$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const MONEY = { maxDecimalPlaces: 2 } as const;
const MAX_MONEY = 100_000;

const Name = () =>
  applyDecorators(
    ApiProperty({ maxLength: CATALOG.nameMaxLength }),
    Transform(trim),
    IsString(),
    IsNotEmpty(),
    MaxLength(CATALOG.nameMaxLength),
  );

const Image = () =>
  applyDecorators(
    ApiPropertyOptional({ type: String, nullable: true, example: '/uploads/catalog/2b1c.jpg' }),
    IsOptional(),
    Matches(IMAGE_PATH, { message: 'images must be a path from /v1/admin/uploads' }),
  );

/** POST /v1/admin/stores and PATCH (every field optional there). */
export class StoreFieldsDto {
  @ApiProperty({ enum: VERTICALS })
  @IsIn(VERTICALS)
  vertical: Vertical;

  @Name()
  name: string;

  @Image()
  logo?: string | null;

  @Image()
  cover?: string | null;

  @ApiProperty({ minimum: 1, maximum: 600 })
  @IsInt()
  @Min(1)
  @Max(600)
  deliveryMinutes: number;

  @ApiProperty({ minimum: 0 })
  @IsNumber(MONEY)
  @Min(0)
  @Max(MAX_MONEY)
  deliveryFee: number;

  @ApiProperty({ minimum: 0 })
  @IsNumber(MONEY)
  @Min(0)
  @Max(MAX_MONEY)
  minimumOrder: number;

  @ApiProperty({ enum: DELIVERED_BY })
  @IsIn(DELIVERED_BY)
  deliveredBy: DeliveredBy;

  @ApiProperty({ enum: STORE_LAYOUTS })
  @IsIn(STORE_LAYOUTS)
  layout: StoreLayout;

  @ApiProperty()
  @IsBoolean()
  pickupAllowed: boolean;

  @ApiProperty({ example: '10:00', description: 'Cairo time, HH:MM' })
  @Matches(TIME, { message: 'opensAt must be HH:MM' })
  opensAt: string;

  @ApiProperty({ example: '02:00', description: 'Cairo time, HH:MM; earlier than opensAt runs past midnight' })
  @Matches(TIME, { message: 'closesAt must be HH:MM' })
  closesAt: string;

  @ApiProperty()
  @IsBoolean()
  closedNow: boolean;

  @ApiProperty()
  @IsBoolean()
  active: boolean;

  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  cuisineIds: number[];
}

/** The partner account made with the store: name and phone; the password is generated (contract §2). */
export class StorePartnerDto extends CreateAdminDto {}

export class CreateStoreDto extends StoreFieldsDto {
  @ApiProperty({ type: StorePartnerDto })
  @ValidateNested()
  @Type(() => StorePartnerDto)
  partner: StorePartnerDto;
}

export class UpdateStoreDto extends PartialType(StoreFieldsDto) {}

export class StoreListQuery {
  @ApiPropertyOptional({ enum: VERTICALS })
  @IsOptional()
  @IsIn(VERTICALS)
  vertical?: Vertical;
}

export class CatalogStoresQuery extends StoreListQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cuisineId?: number;
}

/** A store category, a cuisine: a name and an optional image. */
export class NamedImageDto {
  @Name()
  name: string;

  @Image()
  image?: string | null;
}

export class UpdateNamedImageDto extends PartialType(NamedImageDto) {}

/** PUT …/order: every id of the list, in the new order. */
export class OrderDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  ids: number[];
}

export class CreateProductDto {
  @ApiProperty()
  @IsInt()
  categoryId: number;

  @Name()
  name: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: CATALOG.descriptionMaxLength })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(CATALOG.descriptionMaxLength)
  description?: string | null;

  @ApiProperty({ minimum: 0 })
  @IsNumber(MONEY)
  @Min(0)
  @Max(MAX_MONEY)
  price: number;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: CATALOG.unitMaxLength, example: 'كيلو' })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(CATALOG.unitMaxLength)
  unit?: string | null;

  @Image()
  image?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class HomeTileDto {
  @ApiProperty({ maxLength: CATALOG.nameMaxLength })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CATALOG.nameMaxLength)
  label: string;

  @Image()
  image?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: CATALOG.badgeMaxLength, example: 'سريع' })
  @IsOptional()
  @Transform(trimOrNull)
  @IsString()
  @MaxLength(CATALOG.badgeMaxLength)
  badge?: string | null;

  @ApiProperty({ enum: HOME_TILE_ROWS })
  @IsIn(HOME_TILE_ROWS)
  row: TileRow;

  @ApiPropertyOptional({ enum: VERTICALS, nullable: true, description: 'Set this or targetStoreId' })
  @IsOptional()
  @IsIn(VERTICALS)
  targetVertical?: Vertical | null;

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'Set this or targetVertical' })
  @IsOptional()
  @IsInt()
  targetStoreId?: number | null;
}

export class UpdateHomeTileDto extends PartialType(HomeTileDto) {}
