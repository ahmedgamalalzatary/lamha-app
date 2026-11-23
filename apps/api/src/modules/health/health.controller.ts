import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import type { HealthResponse } from '@tawsela/shared';
import { HealthService } from './health.service.js';

/** Router for `/v1/health`. The apps use it to show they reach the API. */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOkResponse({ description: 'API and database are up' })
  @ApiServiceUnavailableResponse({ description: 'The database is down' })
  async check(): Promise<HealthResponse> {
    const report = await this.health.check();
    if (report.db === 'down') throw new ServiceUnavailableException(report);
    return report;
  }
}
