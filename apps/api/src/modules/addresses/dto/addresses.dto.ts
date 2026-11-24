import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional, IntersectionType, PartialType } from '@nestjs/swagger';
import { ADDRESS_TYPES, type AddressType } from '@tawsela/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PhoneDto } from '../../auth/dto/auth.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Empty text means "none". */
const trimOrNull = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || null : value);

/** A spot on the map. */
export class LatLngDto {
  @ApiProperty({ example: 29.3205 })
  @IsLatitude()
  lat: number;

  @ApiProperty({ example: 30.8364 })
  @IsLongitude()
  lng: number;
}

/** POST /v1/admin/zones; PATCH takes any of its fields. */
export class ZoneDto {
  @ApiProperty({ maxLength: 120 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ type: [LatLngDto], description: 'The outline, at least three corners' })
  @IsArray()
  @ArrayMinSize(3)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => LatLngDto)
  polygon: LatLngDto[];

  @ApiProperty()
  @IsBoolean()
  active: boolean;
}

export class UpdateZoneDto extends PartialType(ZoneDto, { skipNullProperties: false }) {}

const Optional = (max: number) =>
  applyDecorators(ApiPropertyOptional({ type: String, nullable: true, maxLength: max }), IsOptional(), Transform(trimOrNull), IsString(), MaxLength(max));
const Required = (max: number) => applyDecorators(ApiProperty({ maxLength: max }), Transform(trim), IsString(), IsNotEmpty(), MaxLength(max));

/** "عنوان جديد" / "تعديل العنوان" (§8.9). The phone is "رقم الهاتف الجوال", any way it is typed. */
export class AddressDto extends IntersectionType(LatLngDto, PhoneDto) {
  @ApiProperty({ enum: ADDRESS_TYPES })
  @IsIn(ADDRESS_TYPES)
  type: AddressType;

  @Optional(120)
  building: string | null = null;

  @Required(60)
  apartment: string;

  @Optional(30)
  floor: string | null = null;

  @Optional(160)
  street: string | null = null;

  /** علامة مميزة, required: "يرجى إدخال علامة مميزة للعنوان". */
  @Required(160)
  landmark: string;

  @ApiProperty()
  @IsBoolean()
  isDefault: boolean;
}
