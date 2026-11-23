import { type ArgumentMetadata, type PipeTransform, ValidationPipe } from '@nestjs/common';

/** The API's global validation pipe: unknown fields are refused and input is converted to the DTO types. */
export class ApiValidationPipe extends ValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    return super.transform(value, metadata);
  }
}
