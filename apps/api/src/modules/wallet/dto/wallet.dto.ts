import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WALLET_ADJUST_MAX, WALLET_KINDS, WALLET_NOTE_LIMIT, type WalletKind } from '@tawsela/shared';
import { Transform } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** POST /v1/admin/customers/:id/wallet. Whether a deduction fits the balance is the service's check. */
export class WalletAdjustDto {
  @ApiProperty({ enum: WALLET_KINDS })
  @IsIn(WALLET_KINDS)
  kind: WalletKind;

  @ApiProperty({ minimum: 0.01, maximum: WALLET_ADJUST_MAX, description: 'EGP, in whole piastres' })
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(WALLET_ADJUST_MAX)
  amount: number;

  @ApiProperty({ maxLength: WALLET_NOTE_LIMIT, description: 'The reason; the customer sees it on the row' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(WALLET_NOTE_LIMIT)
  note: string;
}

export class CustomersQuery {
  @ApiPropertyOptional({ description: 'Matches the name, the phone or the email' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
