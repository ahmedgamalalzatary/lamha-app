import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RATING_TAGS,
  RATING_TEXT_LIMIT,
  type RatingTag,
  TICKET_STATUSES,
  TICKET_TEXT_LIMIT,
  TICKET_TYPES,
  type TicketStatus,
  type TicketType,
} from '@tawsela/shared';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** POST /v1/me/orders/:id/rating. Whether the chips fit the stars is checked by ratingProblem. */
export class RatingDto {
  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  stars: number;

  @ApiProperty({ enum: RATING_TAGS, isArray: true, description: '1 to 3 stars: at least one problem chip; 4 and 5: good chips, optional' })
  @IsArray()
  @ArrayMaxSize(RATING_TAGS.length)
  @IsIn(RATING_TAGS, { each: true })
  tags: RatingTag[];

  @ApiProperty({ description: 'أخبرنا المزيد, may be empty' })
  @IsString()
  @MaxLength(RATING_TEXT_LIMIT)
  text: string;
}

/** POST /v1/me/tickets */
export class TicketDto {
  @ApiProperty({ enum: TICKET_TYPES })
  @IsIn(TICKET_TYPES)
  type: TicketType;

  @ApiPropertyOptional({ description: 'A past order of the customer, for a complaint about it' })
  @IsOptional()
  @IsInt()
  orderId?: number;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(TICKET_TEXT_LIMIT)
  text: string;
}

/** GET /v1/admin/tickets */
export class TicketsQuery {
  @ApiPropertyOptional({ enum: TICKET_TYPES })
  @IsOptional()
  @IsIn(TICKET_TYPES)
  type?: TicketType;

  @ApiPropertyOptional({ enum: TICKET_STATUSES })
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatus;
}

/** PATCH /v1/admin/tickets/:id */
export class TicketStatusDto {
  @ApiProperty({ enum: TICKET_STATUSES })
  @IsIn(TICKET_STATUSES)
  status: TicketStatus;
}

export class SupportPhoneDto {
  @ApiProperty({ example: 'هاتف 1' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  label: string;

  @ApiProperty({ example: '01021846434' })
  @Transform(trim)
  @Matches(/^\+?\d{5,15}$/, { message: 'phone must be digits' })
  phone: string;
}

/** PUT /v1/admin/settings/support-phones: the whole list, in order. */
export class SupportPhonesDto {
  @ApiProperty({ type: [SupportPhoneDto] })
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => SupportPhoneDto)
  phones: SupportPhoneDto[];
}
