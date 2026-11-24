import type { Gender, Locale, Me, OtpSent } from '@tawsela/shared';
import { api } from '@/core/api/client';

export const meApi = {
  update: (body: { email?: string; gender?: Gender; locale?: Locale }) => api<Me>('/me', { method: 'PATCH', body }),
  remove: (password: string) => api<void>('/me', { method: 'DELETE', body: { password } }),
  /** "تغيير رقم الهاتف": a code for the new number, sent to the account's email (no SMS). */
  sendPhoneCode: (phone: string) => api<OtpSent>('/me/phone/code', { method: 'POST', body: { phone } }),
  changePhone: (phone: string, code: string) => api<Me>('/me/phone', { method: 'POST', body: { phone, code } }),
  /** "اختر صورة": the picked photo, as a file on the phone. */
  setAvatar: (uri: string) => {
    const form = new FormData();
    // React Native's FormData sends a file from its uri.
    form.append('image', { uri, name: 'avatar.jpg', type: 'image/jpeg' } as unknown as Blob);
    return api<Me>('/me/avatar', { method: 'POST', body: form });
  },
};
