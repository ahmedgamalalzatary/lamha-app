import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { GENDERS, type Gender, type Locale, normalizeEmail } from '@tawsela/shared';
import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/** PATCH /v1/me: what the profile screen may change. Name, phone and region are locked (§8.14). */
export class UpdateMeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? normalizeEmail(value) : value))
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({ enum: GENDERS })
  @IsOptional()
  @IsIn(GENDERS)
  gender?: Gender;

  @ApiPropertyOptional({ enum: ['ar', 'en'] })
  @IsOptional()
  @IsIn(['ar', 'en'])
  locale?: Locale;
}

/** DELETE /v1/me: the password confirms it is really the owner. */
export class DeleteMeDto {
  @ApiProperty()
  @IsString()
  password: string;
}
