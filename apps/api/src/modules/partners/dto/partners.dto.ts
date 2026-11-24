import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateAdminDto } from '../../admins/dto/admins.dto.js';

/** POST /v1/admin/partners: another account for a store; the password is generated (contract §2, §11.2). */
export class CreatePartnerDto extends CreateAdminDto {
  @ApiProperty()
  @IsInt()
  storeId: number;
}

export class PartnersQuery {
  @ApiPropertyOptional({ description: 'Matches the name, the phone or the store name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  storeId?: number;
}
