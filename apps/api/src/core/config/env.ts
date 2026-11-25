import { plainToInstance, Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min, MinLength, validateSync } from 'class-validator';

const NODE_ENVS = ['development', 'test', 'production'] as const;

/**
 * Every env var the API reads, checked once at start-up (contract §5: one root .env).
 * Fixed product rules live in @tawsela/shared constants, not here.
 */
export class Env {
  @IsIn(NODE_ENVS)
  NODE_ENV: (typeof NODE_ENVS)[number] = 'development';

  @Transform(({ value }) => (value === undefined || value === '' ? 4000 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 4000;

  @IsString()
  @Matches(/^mysql:\/\//, { message: 'DATABASE_URL must be a mysql:// URL' })
  DATABASE_URL: string;

  /** Comma-separated browser origins. Empty means any origin outside production. */
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : (value ?? []),
  )
  @IsString({ each: true })
  CORS_ORIGINS: string[] = [];

  /** Signs access tokens and sign-up tickets. Long and random. */
  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;

  /**
   * Optional mail server for sign-in and password codes, e.g. Gmail (smtp.gmail.com, 465, the
   * address and a Google app password). Without SMTP_HOST the code is written to the log.
   */
  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @Transform(({ value }) => (value === undefined || value === '' ? 465 : Number(value)))
  @IsInt()
  @Min(1)
  @Max(65535)
  SMTP_PORT = 465;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  /** The sender shown, e.g. "Tawsela <tawsela@gmail.com>". Defaults to SMTP_USER. */
  @IsOptional()
  @IsString()
  MAIL_FROM?: string;

  /** Optional: Expo's access token, when push security is turned on in the Expo project. */
  @IsOptional()
  @IsString()
  EXPO_ACCESS_TOKEN?: string;

  /**
   * How many proxies (nginx) stand in front of the API. With 1, the client's address comes from
   * X-Forwarded-For, so rate limits count each customer, not the proxy. 0 (the default) trusts none.
   */
  @Transform(({ value }) => (value === undefined || value === '' ? 0 : Number(value)))
  @IsInt()
  @Min(0)
  @Max(10)
  TRUST_PROXY = 0;

  /** Password for the seeded admin, partner and driver. Only the seed script reads it. */
  @IsOptional()
  @IsString()
  SEED_PASSWORD?: string;
}

/** Used by ConfigModule's `validate`. Throws one error that lists every bad variable. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, { exposeDefaultValues: true });
  const errors = validateSync(env, { skipMissingProperties: false });
  const lines = errors.map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`);
  // Production sends real sign-up and reset codes: without a mail server they would never arrive.
  if (env.NODE_ENV === 'production') {
    for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'] as const) {
      if (!env[key]) lines.push(`${key}: required in production (codes are emailed)`);
    }
  }
  if (lines.length) {
    throw new Error(`Invalid environment:\n  ${lines.join('\n  ')}`);
  }
  return env;
}
