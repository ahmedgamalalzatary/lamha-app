import type { Me } from '@tawsela/shared';

/** An account object for pure logic tests (the gate); screen tests use real accounts from the API. */
export function me(over: Partial<Me> = {}): Me {
  return {
    id: 1,
    role: 'customer',
    phone: '01554459196',
    email: 'ahmed@gmail.com',
    firstName: 'احمد',
    lastName: 'الزعتري',
    gender: null,
    region: null,
    locale: 'ar',
    inviteCode: '3JXDEB',
    ...over,
  };
}
