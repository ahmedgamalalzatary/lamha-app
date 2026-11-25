import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { isWeekSchedule, type WeekSchedule } from '@tawsela/shared';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateBy, type ValidationOptions } from 'class-validator';

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
