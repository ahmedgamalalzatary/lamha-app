import { validateEnv } from '../../../../src/core/config/env.js';

const valid = {
  DATABASE_URL: 'mysql://root:pw@localhost:3306/tawsela',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('accepts the minimum and defaults the port to 4000', () => {
    expect(validateEnv(valid)).toMatchObject({ PORT: 4000, DATABASE_URL: valid.DATABASE_URL });
  });

  it('turns PORT into a number', () => {
    expect(validateEnv({ ...valid, PORT: '4001' }).PORT).toBe(4001);
  });

  it('refuses to start without a database URL', () => {
    expect(() => validateEnv({ ...valid, DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
  });

  it('refuses a database URL that is not MySQL', () => {
    expect(() => validateEnv({ ...valid, DATABASE_URL: 'postgres://x@y/z' })).toThrow(/DATABASE_URL/);
  });

  it('refuses a missing or short JWT secret', () => {
    expect(() => validateEnv({ ...valid, JWT_ACCESS_SECRET: undefined })).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => validateEnv({ ...valid, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('refuses a port that is not a number', () => {
    expect(() => validateEnv({ ...valid, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('splits CORS_ORIGINS on commas and drops blanks', () => {
    expect(validateEnv({ ...valid, CORS_ORIGINS: 'https://a.test, https://b.test,' }).CORS_ORIGINS).toEqual([
      'https://a.test',
      'https://b.test',
    ]);
    expect(validateEnv(valid).CORS_ORIGINS).toEqual([]);
  });

  it('refuses an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('lists every problem at once', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL[\s\S]*JWT_ACCESS_SECRET/);
  });
});
