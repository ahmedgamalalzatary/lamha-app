import { newInviteCode } from '../../../../src/modules/users/invite-code.js';

describe('newInviteCode (like Tawsilty\'s "3JXDEB")', () => {
  it('is 6 capitals and digits', () => {
    for (let i = 0; i < 200; i++) expect(newInviteCode()).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('leaves out the look-alikes 0, O, 1 and I', () => {
    const all = Array.from({ length: 500 }, () => newInviteCode()).join('');
    expect(all).not.toMatch(/[0O1I]/);
  });
});
