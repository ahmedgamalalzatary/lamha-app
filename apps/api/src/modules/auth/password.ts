import { hash, verify } from '@node-rs/argon2';

/** Argon2id hash. */
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

/** False for an empty hash (a deleted account). */
export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  if (!passwordHash) return false;
  return verify(passwordHash, password).catch(() => false);
}
