import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import type { AuditPage } from '@tawsela/shared';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuditService } from './audit.service.js';

export class AuditQuery {
  @ApiPropertyOptional({ description: 'The `next` of the previous page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  before?: number;
}

/** Router for `/v1/admin/audit`: الإعدادات › سجل التغييرات (review F70). Admins only. */
@ApiTags('admin')
@ApiBearerAuth()
@Roles('admin')
@Controller('admin/audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() query: AuditQuery): Promise<AuditPage> {
    return this.audit.list(query.before);
  }
}
