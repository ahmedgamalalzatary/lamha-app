import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AUTH } from '@tawsela/shared';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { PhoneDto } from '../../auth/dto/auth.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** POST /v1/admin/admins: the name and phone; the password is generated (contract §2). */
export class CreateAdminDto extends PhoneDto {
  @ApiProperty({ maxLength: AUTH.nameMaxLength })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(AUTH.nameMaxLength)
  firstName: string;

  @ApiPropertyOptional({ maxLength: AUTH.nameMaxLength })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(AUTH.nameMaxLength)
  lastName?: string;
}

/** PATCH /v1/admin/admins/:id: disable or enable the account. */
export class SetDisabledDto {
  @ApiProperty()
  @IsBoolean()
  disabled: boolean;
}
