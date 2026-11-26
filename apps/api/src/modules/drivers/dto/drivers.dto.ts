import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  type DeliveryFeeRule,
  FINE_AMOUNT_MAX,
  FINE_REASON_LIMIT,
  isDayString,
  isFeeRuleOrNull,
  isSpeedLevels,
  isWeekSchedule,
  type SpeedLevel,
  type WeekSchedule,
} from '@tawsela/shared';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateBy, type ValidationOptions } from 'class-validator';

/** A check from the shared package, as a class-validator decorator. */
const Checked = (name: string, check: (value: unknown) => boolean, message: string, options?: ValidationOptions) =>
  ValidateBy({ name, validator: { validate: check, defaultMessage: () => message } }, options);

/** Seven days from Sunday, each `{ start, end }` in "HH:MM" Cairo time or null; with `nullable`, null for the whole week too. */
const IsWeek = (nullable: boolean, options?: ValidationOptions) =>
  ValidateBy(
    {
      name: 'isWeek',
      validator: {
        validate: (value: unknown) => (nullable && value === null) || isWeekSchedule(value),
        defaultMessage: () => 'schedule must be 7 days from Sunday, each { start, end } in HH:MM or null',
      },
    },
    options,
  );

const SCHEDULE_DOC = {
  type: 'array',
  description: 'Sunday to Saturday; { start: "18:00", end: "02:00" } (an end at or before the start runs past midnight) or null for no shift',
  example: [null, { start: '18:00', end: '02:00' }, { start: '18:00', end: '02:00' }, null, null, null, null],
} as const;

/** PATCH /v1/admin/settings/drivers: any of the fields. */
export class DriverSettingsDto {
  @ApiPropertyOptional(SCHEDULE_DOC)
  @IsOptional()
  @IsWeek(false)
  schedule?: WeekSchedule;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  startEarlyMinutes?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  startLateMinutes?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  extendMinutes?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  extendMax?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(600)
  offerSeconds?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  skipWarn?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  skipBlock?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  blockMinutes?: number;

  @ApiPropertyOptional({ example: [{ maxMinutesPerKm: 10, points: 5 }, { maxMinutesPerKm: 12, points: 2 }], description: 'Speed points by minutes per km, up to 10' })
  @IsOptional()
  @Checked('isSpeedLevels', isSpeedLevels, 'speedLevels must be up to 10 of { maxMinutesPerKm > 0, points: whole 1-10000 }, no speed twice')
  speedLevels?: SpeedLevel[];

  @ApiPropertyOptional({ example: 2.5, description: 'A speed point in ج.م' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(10_000)
  pointValue?: number;
}

/** PUT /v1/admin/drivers/:id/fee: his own fee rule for his earnings (§8.7), or null for the customer's fee. */
export class DriverFeeDto {
  @ApiProperty({ nullable: true, example: { baseFee: 15, baseKm: 2, perKm: 5 } })
  @Checked('isFeeRule', isFeeRuleOrNull, 'fee must be null or { baseFee, baseKm, perKm } amounts')
  fee: DeliveryFeeRule | null;
}

/** POST /v1/admin/drivers/:id/fines */
export class FineDto {
  @ApiProperty({ example: 20 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(FINE_AMOUNT_MAX)
  amount: number;

  @ApiProperty({ maxLength: FINE_REASON_LIMIT, example: 'تأخير في التوصيل' })
  @IsString()
  @Checked('notBlank', (v) => typeof v === 'string' && v.trim() !== '', 'reason must not be empty')
  @MaxLength(FINE_REASON_LIMIT)
  reason: string;

  @ApiPropertyOptional({ description: 'One of his orders' })
  @IsOptional()
  @IsInt()
  orderId?: number;
}

/** GET /v1/driver/history: "YYYY-MM-DD" days in Cairo. */
export class HistoryQuery {
  @ApiProperty({ example: '2026-01-01' })
  @IsNotEmpty()
  @Checked('isDay', (v) => typeof v === 'string' && isDayString(v), 'from must be a date YYYY-MM-DD')
  from: string;

  @ApiProperty({ example: '2026-11-22' })
  @IsNotEmpty()
  @Checked('isDay', (v) => typeof v === 'string' && isDayString(v), 'to must be a date YYYY-MM-DD')
  to: string;
}

/** PUT /v1/admin/drivers/:id/schedule: his own week, or null to follow the global one. */
export class DriverScheduleDto {
  @ApiProperty({ ...SCHEDULE_DOC, nullable: true })
  @IsWeek(true)
  schedule: WeekSchedule | null;
}

/** POST /v1/admin/orders/:id/driver */
export class AssignDriverDto {
  @ApiProperty()
  @IsInt()
  driverId: number;
}

export class DriversQuery {
  @ApiPropertyOptional({ description: 'Matches the name or the phone' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;
}
