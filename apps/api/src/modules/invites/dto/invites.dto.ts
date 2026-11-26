import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

const MONEY = { maxDecimalPlaces: 2 } as const;

/** PATCH /v1/admin/settings/invites: any of the fields. That the per-order limit fits the reward is the service's check. */
export class InviteSettingsDto {
  @ApiPropertyOptional({ example: 300 })
  @IsOptional()
  @IsNumber(MONEY)
  @Min(0)
  @Max(100_000)
  reward?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber(MONEY)
  @Min(0)
  @Max(100_000)
  rewardPerOrder?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  rewardDays?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber(MONEY)
  @Min(0)
  @Max(100_000)
  friendReward?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  friendDays?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  firstOrderDays?: number;

  @ApiPropertyOptional({ example: 1000 })
  @IsOptional()
  @IsNumber(MONEY)
  @Min(0)
  @Max(1_000_000)
  monthlyCap?: number;

  @ApiPropertyOptional({ description: 'Off: invite money never expires' })
  @IsOptional()
  @IsBoolean()
  expires?: boolean;
}
