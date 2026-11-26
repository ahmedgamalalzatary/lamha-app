import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuditPage } from '@tawsela/shared';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { AuditService } from './audit.service.js';
import { AuditQuery } from './dto/audit.dto.js';

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
