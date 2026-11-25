import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CAMPAIGN_BODY_LIMIT, CAMPAIGN_TITLE_LIMIT, isExpoPushToken } from '@tawsela/shared';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateBy, ValidateIf } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** POST and DELETE /v1/me/push-tokens */
export class PushTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  @MaxLength(255)
  @ValidateBy({ name: 'isExpoPushToken', validator: { validate: (v: unknown) => typeof v === 'string' && isExpoPushToken(v), defaultMessage: () => 'token must be an Expo push token' } })
  token: string;
}

/** GET /v1/me/notifications */
export class NotificationsQuery {
  @ApiPropertyOptional({ default: 30, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'The id of the last notification already shown' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  before?: number;
}

/** POST /v1/admin/campaigns */
export class CampaignDto {
  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(CAMPAIGN_TITLE_LIMIT)
  title: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(CAMPAIGN_BODY_LIMIT)
  body: string;

  @ApiProperty({ type: Number, nullable: true, description: 'Customers with an address in this zone, or null for every customer' })
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  zoneId: number | null;
}
