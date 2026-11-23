import { plainToInstance, Transform } from 'class-transformer';
import { IsIn, IsInt, IsString, Matches, Max, Min, MinLength, validateSync } from 'class-validator';

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

  /** Signs access tokens. Long and random. */
  @IsString()
  @MinLength(32)
  JWT_ACCESS_SECRET: string;
}

/** Used by ConfigModule's `validate`. Throws one error that lists every bad variable. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const env = plainToInstance(Env, raw, { exposeDefaultValues: true });
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length) {
    const lines = errors.map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`);
    throw new Error(`Invalid environment:\n  ${lines.join('\n  ')}`);
  }
  return env;
}
