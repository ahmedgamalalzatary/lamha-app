import { PartialType, PickType } from '@nestjs/swagger';
import { StoreFieldsDto } from '../../catalog/dto/catalog.dto.js';

/**
 * PATCH /v1/partner/store: only what a partner may change (contract §11.1, decided 2026-11-23).
 * Any other store field is refused (400), so the fee, minimum order and the rest stay the admin's.
 */
export class PartnerStoreDto extends PartialType(PickType(StoreFieldsDto, ['opensAt', 'closesAt', 'closedNow', 'cover'] as const), {
  skipNullProperties: false,
}) {}
