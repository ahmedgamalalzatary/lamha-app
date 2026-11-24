import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { GENDERS, type Gender, type Locale } from '@tawsela/shared';
import { IsIn, IsOptional, IsString } from 'class-validator';

/**
 * PATCH /v1/me: what the profile screen may change. Name, phone and region are locked (§8.14); the
 * phone and the email change only with a code (/v1/me/phone, /v1/me/email).
 */
export class UpdateMeDto {
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
