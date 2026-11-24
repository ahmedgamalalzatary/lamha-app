import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  CATALOG,
  DELIVERED_BY,
  type DeliveredBy,
  HOME_TILE_ROWS,
  PRODUCT_OPTIONS,
  RATING_FLOORS,
  SEARCH_SCOPES,
  type SearchScope,
  STORE_SORTS,
  type StoreSort,
  type TileRow,
  STORE_LAYOUTS,
  type StoreLayout,
  VERTICALS,
  type Vertical,
} from '@tawsela/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
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
import { LatLngDto } from '../../addresses/dto/addresses.dto.js';
import { CreateAdminDto } from '../../admins/dto/admins.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Empty text means "none". */
const trimOrNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

/** A path the upload route returned, or a seed image: "/uploads/…". */
const IMAGE_PATH = /^\/uploads\/[A-Za-z0-9/_.-]+$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const MONEY = { maxDecimalPlaces: 2 } as const;
const MAX_MONEY = 100_000;
const SEARCH_MAX_LENGTH = 100;

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

  @ApiPropertyOptional({ type: Number, nullable: true, description: 'The delivery zone it serves (§8.9)' })
  @IsOptional()
  @IsInt()
  zoneId?: number | null;

  @ApiPropertyOptional({ type: LatLngDto, nullable: true, description: 'Where the store is, for "الأقرب إليك"' })
  @IsOptional()
  @ValidateNested()
  @Type(() => LatLngDto)
  location?: LatLngDto | null;
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

/** "true"/"false" in a query string; anything else stays as it is and fails IsBoolean. */
const queryBool = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);

const SearchText = () =>
  applyDecorators(ApiProperty({ maxLength: SEARCH_MAX_LENGTH }), Transform(trim), IsString(), IsNotEmpty(), MaxLength(SEARCH_MAX_LENGTH));

/** The customer's chosen address (§8.9): only stores of its zone are listed, "الأقرب إليك" measures from it. */
const AddressId = () =>
  applyDecorators(ApiPropertyOptional({ description: "The customer's chosen address" }), IsOptional(), Type(() => Number), IsInt());

/** GET /v1/catalog/stores: a store list with its search box, sort sheet, rating sheet and chips (§8.3). */
export class CatalogStoresQuery extends StoreListQuery {
  @AddressId()
  addressId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cuisineId?: number;

  @ApiPropertyOptional({ maxLength: SEARCH_MAX_LENGTH })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(SEARCH_MAX_LENGTH)
  q?: string;

  @ApiPropertyOptional({ enum: STORE_SORTS })
  @IsOptional()
  @IsIn(STORE_SORTS)
  sort?: StoreSort;

  @ApiPropertyOptional({ enum: RATING_FLOORS })
  @IsOptional()
  @Type(() => Number)
  @IsIn(RATING_FLOORS)
  minRating?: number;

  @ApiPropertyOptional({ description: 'توصيل سريع' })
  @IsOptional()
  @Transform(queryBool)
  @IsBoolean()
  fast?: boolean;

  @ApiPropertyOptional({ description: 'الاستلام' })
  @IsOptional()
  @Transform(queryBool)
  @IsBoolean()
  pickup?: boolean;
}

/** GET /v1/catalog/search and …/suggestions (§8.13). */
export class SearchQuery {
  @SearchText()
  q: string;

  @ApiPropertyOptional({ enum: SEARCH_SCOPES, default: 'all' })
  @IsOptional()
  @IsIn(SEARCH_SCOPES)
  scope: SearchScope = 'all';

  @AddressId()
  addressId?: number;
}

/** A store category, a cuisine: a name and an optional image. */
export class NamedImageDto {
  @Name()
  name: string;

  @Image()
  image?: string | null;
}

export class UpdateNamedImageDto extends PartialType(NamedImageDto) {}

/** A store category: a sub-category names its main category (one level, same store). */
export class CategoryDto extends NamedImageDto {
  @ApiPropertyOptional({ type: Number, nullable: true, description: 'The main category; null for a main category' })
  @IsOptional()
  @IsInt()
  parentId?: number | null;
}

export class UpdateCategoryDto extends PartialType(CategoryDto) {}

/** A row of an option group: "ربع كيلو (+58.75 ج.م)". */
export class OptionDto {
  @Name()
  name: string;

  @ApiProperty({ minimum: 0 })
  @IsNumber(MONEY)
  @Min(0)
  @Max(MAX_MONEY)
  priceDelta: number;
}

/** An option group on the product sheet (§8.5). */
export class OptionGroupDto {
  @ApiProperty({ maxLength: CATALOG.nameMaxLength, example: 'الوزن' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CATALOG.nameMaxLength)
  title: string;

  @ApiProperty({ description: 'مطلوب' })
  @IsBoolean()
  required: boolean;

  @ApiProperty({ minimum: 1, description: '1 is "اختر 1"; never more than its options' })
  @IsInt()
  @Min(1)
  maxChoices: number;

  @ApiProperty({ type: [OptionDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(PRODUCT_OPTIONS.maxOptions)
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options: OptionDto[];
}

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

  @ApiPropertyOptional({ type: [OptionGroupDto], description: 'Replaces every group when given' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PRODUCT_OPTIONS.maxGroups)
  @ValidateNested({ each: true })
  @Type(() => OptionGroupDto)
  optionGroups?: OptionGroupDto[];

  @ApiPropertyOptional({ type: [String], description: 'المكونات الاساسية; replaces them when given', example: ['٥ اسبايسي ليمون'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PRODUCT_OPTIONS.maxIngredients)
  @Transform(({ value }: { value: unknown }) => (Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v.trim() : v)) : value))
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(CATALOG.nameMaxLength, { each: true })
  ingredients?: string[];
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
