import path from 'node:path';
import { type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { UPLOADS_DIR } from '@tawsela/shared';
import helmet from 'helmet';
import { ApiValidationPipe } from './common/pipes/api-validation.pipe.js';
import type { Env } from './core/config/env.js';

/** Everything main.ts sets on the app. e2e tests call this too, so they test the real setup. */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<Env, true>);
  const dev = config.get('NODE_ENV', { infer: true }) !== 'production';

  app.use(helmet());
  // The phone app needs no CORS. Browsers get the listed origins; with none listed,
  // any origin is allowed outside production, and none in production.
  const origins = config.get('CORS_ORIGINS', { infer: true });
  app.enableCors({ origin: origins.length ? origins : dev, credentials: true });

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

  app.enableShutdownHooks();

  const doc = new DocumentBuilder()
    .setTitle('Tawsela API')
    .setDescription('REST API for the Tawsela mobile app and dashboard. Errors use the standard NestJS shape.')
    .setVersion('1')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, doc), { jsonDocumentUrl: 'docs-json' });
}
