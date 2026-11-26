import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { POINTS_ADJUST_MAX, WALLET_KINDS, WALLET_NOTE_LIMIT, type WalletKind } from '@tawsela/shared';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** PATCH /v1/admin/settings/points: any of the fields. */
export class PointsSettingsDto {
  @ApiPropertyOptional({ minimum: 0.01, example: 10, description: 'Every full this many ج.م earns one point' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100_000)
  earnEvery?: number;

  @ApiPropertyOptional({ minimum: 0, example: 0.1, description: 'What one point pays, in ج.م' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1000)
  pointValue?: number;

  @ApiPropertyOptional({ minimum: 0, example: 100, description: 'الحد الأدنى للاستبدال' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  minimum?: number;
}

/** POST /v1/admin/customers/:id/points. Whether a deduction fits the balance is the service's check. */
export class PointsAdjustDto {
  @ApiProperty({ enum: WALLET_KINDS })
  @IsIn(WALLET_KINDS)
  kind: WalletKind;

  @ApiProperty({ minimum: 1, maximum: POINTS_ADJUST_MAX })
  @IsInt()
  @Min(1)
  @Max(POINTS_ADJUST_MAX)
  points: number;

  @ApiProperty({ maxLength: WALLET_NOTE_LIMIT, description: 'The reason; the customer sees it on the row' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(WALLET_NOTE_LIMIT)
  note: string;
}
