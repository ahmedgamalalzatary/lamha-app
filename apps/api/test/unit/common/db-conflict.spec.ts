import { dbConflict } from '../../../src/common/filters/db-error.filter.js';

/** mysql2's error, as drizzle passes it on (directly or as the `cause`). */
const mysqlError = (code: string, message = '') => Object.assign(new Error(message), { code });

describe('dbConflict (review F12, F37)', () => {
  it('turns a duplicate email or phone into the same 409 the checks give', () => {
    const email = dbConflict(mysqlError('ER_DUP_ENTRY', "Duplicate entry 'a@b.co' for key 'users.users_email_unique'"));
    expect(email?.getStatus()).toBe(409);
    expect(email?.getResponse()).toMatchObject({ code: 'EMAIL_TAKEN' });
    const phone = dbConflict({ cause: mysqlError('ER_DUP_ENTRY', "Duplicate entry '010' for key 'users.users_phone_unique'") });
    expect(phone?.getResponse()).toMatchObject({ code: 'PHONE_TAKEN' });
  });

  it('answers CONFLICT for any other clash: another duplicate, a row deleted meanwhile, a deadlock', () => {
    for (const code of ['ER_DUP_ENTRY', 'ER_NO_REFERENCED_ROW_2', 'ER_ROW_IS_REFERENCED_2', 'ER_LOCK_DEADLOCK']) {
      const res = dbConflict(mysqlError(code, "Duplicate entry 'X' for key 'users.users_invite_code_unique'"));
      expect(res?.getStatus()).toBe(409);
      expect(res?.getResponse()).toMatchObject({ code: 'CONFLICT' });
    }
  });

  it('leaves every other error alone', () => {
    expect(dbConflict(new Error('boom'))).toBeUndefined();
    expect(dbConflict(mysqlError('ER_BAD_FIELD_ERROR'))).toBeUndefined();
    expect(dbConflict(undefined)).toBeUndefined();
  });
});
