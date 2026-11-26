import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CART_MODES, CART_NOTE_LIMIT, CART_QUANTITY_LIMIT, PRODUCT_OPTIONS, type AddCartLine, type CartMode } from '@tawsela/shared';
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsInt, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';

export class AddCartLineDto implements AddCartLine {
  @ApiProperty()
  @IsInt()
  @Min(1)
  productId!: number;

  @ApiProperty({ minimum: 1, maximum: CART_QUANTITY_LIMIT })
  @IsInt()
  @Min(1)
  @Max(CART_QUANTITY_LIMIT)
  quantity!: number;

  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(PRODUCT_OPTIONS.maxGroups * PRODUCT_OPTIONS.maxOptions)
  @IsInt({ each: true })
  @Min(1, { each: true })
  optionIds!: number[];

  @ApiProperty({ type: [Number] })
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(PRODUCT_OPTIONS.maxIngredients)
  @IsInt({ each: true })
  @Min(1, { each: true })
  removedIngredientIds!: number[];
}

export class CartQuantityDto {
  @ApiProperty({ enum: [-1, 1] })
  @IsIn([-1, 1])
  delta!: -1 | 1;
}

export class EditCartDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  cartId!: number;

  @ApiPropertyOptional({ maxLength: CART_NOTE_LIMIT })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @MaxLength(CART_NOTE_LIMIT)
  note?: string;

  @ApiPropertyOptional({ enum: CART_MODES })
  @ValidateIf((_, value) => value !== undefined)
  @IsIn(CART_MODES)
  mode?: CartMode;
}
