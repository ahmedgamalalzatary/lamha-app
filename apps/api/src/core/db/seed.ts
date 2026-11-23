// `pnpm db:seed`: the accounts to try the apps with (Phase 1). Safe to run twice: an existing phone is skipped.
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/mysql2';
import { createConnection } from 'mysql2/promise';
import type { Role } from '@tawsela/shared';
import { hashPassword } from '../../modules/auth/password.js';
import { users } from '../../modules/users/users.schema.js';

config({ path: '../../.env', quiet: true });

const url = process.env.DATABASE_URL;
const password = process.env.SEED_PASSWORD;
if (!url || !password) throw new Error('DATABASE_URL and SEED_PASSWORD must be set in the root .env');

/** Partners and drivers are normally created by an admin (Phase 4 and 12); these are for trying the apps. */
const ACCOUNTS: { role: Role; phone: string; firstName: string; lastName?: string }[] = [
  { role: 'admin', phone: '01000000001', firstName: 'مدير توصيلة' },
  { role: 'partner', phone: '01000000002', firstName: 'مورد تجريبي' },
  { role: 'driver', phone: '01000000003', firstName: 'مندوب تجريبي' },
  // Phase 3: more admins, so حسابات الإدارة has rows to reset and disable.
  { role: 'admin', phone: '01000000004', firstName: 'سارة', lastName: 'علي' },
  { role: 'admin', phone: '01000000005', firstName: 'محمود', lastName: 'حسن' },
];

const conn = await createConnection({ uri: url });
const db = drizzle({ client: conn });
const passwordHash = await hashPassword(password);
for (const account of ACCOUNTS) {
  const [res] = await db.insert(users).ignore().values({ ...account, passwordHash });
  console.log(`${account.role} ${account.phone}: ${res.affectedRows ? 'created' : 'already there'}`);
}
await conn.end();
