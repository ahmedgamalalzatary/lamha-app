import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { type Env, validateEnv } from './core/config/env.js';
import { DbModule } from './core/db/db.module.js';
import { MailModule } from './core/mail/mailer.js';
import { AddressesModule } from './modules/addresses/addresses.module.js';
import { AdminsModule } from './modules/admins/admins.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CartModule } from './modules/cart/cart.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { FavoritesModule } from './modules/favorites/favorites.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { MaintenanceModule } from './modules/maintenance/maintenance.module.js';
import { DriversModule } from './modules/drivers/drivers.module.js';
import { OrdersModule } from './modules/orders/orders.module.js';
import { PartnersModule } from './modules/partners/partners.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { SupportModule } from './modules/support/support.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { UsersModule } from './modules/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // The single .env lives at the repo root (contract §5). Tests get their
      // variables from the root .env.test through vitest instead.
      envFilePath: '../../.env',
      ignoreEnvFile: process.env.NODE_ENV === 'test',
      validate: validateEnv,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const env = config.get('NODE_ENV', { infer: true });
        return {
          pinoHttp: {
            level: env === 'test' ? 'silent' : env === 'production' ? 'info' : 'debug',
            // pino-pretty is a dev dependency, so only development uses it.
            transport: env === 'development' ? { target: 'pino-pretty', options: { singleLine: true } } : undefined,
            redact: ['req.headers.authorization', 'req.headers.cookie'],
          },
        };
      },
    }),
    DbModule,
    MailModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AdminsModule,
    CatalogModule,
    CartModule,
    OrdersModule,
    DriversModule,
    SettingsModule,
    SupportModule,
    FavoritesModule,
    AddressesModule,
    PartnersModule,
    UploadsModule,
    MaintenanceModule,
    AuditModule,
  ],
})
export class AppModule {}
