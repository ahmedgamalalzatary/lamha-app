import path from 'node:path';
import { type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { UPLOADS_DIR } from '@tawsela/shared';
import helmet from 'helmet';
import { DbErrorFilter } from './common/filters/db-error.filter.js';
import { ApiValidationPipe } from './common/pipes/api-validation.pipe.js';
import type { Env } from './core/config/env.js';

/** socket.io with the HTTP API's CORS rule. */
class CorsIoAdapter extends IoAdapter {
  constructor(
    app: INestApplication,
    private readonly cors: { origin: string[] | boolean; credentials: boolean },
  ) {
    super(app);
  }

  override createIOServer(port: number | undefined, options?: ServerOptions): Server {
    return super.createIOServer(port, { ...options, cors: this.cors } as ServerOptions);
  }
}

/** Everything main.ts sets on the app. e2e tests call this too, so they test the real setup. */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<Env, true>);
  const dev = config.get('NODE_ENV', { infer: true }) !== 'production';

  // Behind nginx: read the client's address from X-Forwarded-For, so rate limits count each client.
  const hops = config.get('TRUST_PROXY', { infer: true });
  if (hops > 0) (app as NestExpressApplication).set('trust proxy', hops);

  app.use(helmet());
  // The phone app needs no CORS. Browsers get the listed origins; with none listed,
  // any origin is allowed outside production, and none in production.
  const origins = config.get('CORS_ORIGINS', { infer: true });
  const cors = { origin: origins.length ? origins : dev, credentials: true };
  app.enableCors(cors);
  // The live orders socket follows the same origins.
  app.useWebSocketAdapter(new CorsIoAdapter(app, cors));

  app.setGlobalPrefix('v1', { exclude: ['docs', 'docs-json'] });

  // Uploaded images live under /uploads. In production nginx serves that folder itself.
  if (dev) {
    (app as NestExpressApplication).useStaticAssets(path.resolve(UPLOADS_DIR), {
      prefix: '/uploads/',
      maxAge: '7d',
      // Images are public; helmet's same-origin policy would block them in a web preview.
      setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
    });
  }

  app.useGlobalPipes(new ApiValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  // A write that lost a race (duplicate, row deleted meanwhile, deadlock) answers 409, not 500.
  app.useGlobalFilters(new DbErrorFilter(app.get(HttpAdapterHost).httpAdapter));

  app.enableShutdownHooks();

  const doc = new DocumentBuilder()
    .setTitle('Wassal API')
    .setDescription('REST API for the Wassal mobile app and dashboard. Errors use the standard NestJS shape.')
    .setVersion('1')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, doc), { jsonDocumentUrl: 'docs-json' });
}
