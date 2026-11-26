import { ApiPropertyOptional } from '@nestjs/swagger';
import { PAYOUT_OPTIONS, type PayoutOption } from '@tawsela/shared';
import { IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';

const MONEY = { maxDecimalPlaces: 2 } as const;

/** PATCH /v1/admin/settings/delivery: any of the fields. */
export class DeliverySettingsDto {
  @ApiPropertyOptional({ minimum: 0, example: 20, description: 'What the first base km cost' })
  @IsOptional()
  @IsNumber(MONEY)
  @Min(0)
  @Max(10_000)
  baseFee?: number;

  @ApiPropertyOptional({ minimum: 0, example: 2 })
  @IsOptional()
  @IsNumber(MONEY)
  @Min(0)
  @Max(1000)
  baseKm?: number;

  @ApiPropertyOptional({ minimum: 0, example: 10, description: 'Each started km over the base' })
  @IsOptional()
  @IsNumber(MONEY)
  @Min(0)
  @Max(10_000)
  perKm?: number;

  @ApiPropertyOptional({ enum: PAYOUT_OPTIONS })
  @IsOptional()
  @IsIn(PAYOUT_OPTIONS)
  payoutOption?: PayoutOption;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, example: 10 })
  @IsOptional()
  @IsNumber(MONEY)
  @Min(0)
  @Max(100)
  appPercent?: number;
}
