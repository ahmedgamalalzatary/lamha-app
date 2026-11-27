import type { Gender, Locale, Me, OtpSent } from '@tawsela/shared';
import { api } from '@/core/api/client';
import { photoForm } from '@/core/api/photo-form';

export const meApi = {
  update: (body: { gender?: Gender; locale?: Locale; notificationsEnabled?: boolean }) => api<Me>('/me', { method: 'PATCH', body }),
  /** A new email: the code goes to the new address, which only its owner can read (review F01). */
  sendEmailCode: (email: string) => api<OtpSent>('/me/email/code', { method: 'POST', body: { email } }),
  changeEmail: (email: string, code: string) => api<Me>('/me/email', { method: 'POST', body: { email, code } }),
  remove: (password: string) => api<void>('/me', { method: 'DELETE', body: { password } }),
  /** "تغيير رقم الهاتف": a code for the new number, sent to the account's email (no SMS). */
  sendPhoneCode: (phone: string) => api<OtpSent>('/me/phone/code', { method: 'POST', body: { phone } }),
  changePhone: (phone: string, code: string) => api<Me>('/me/phone', { method: 'POST', body: { phone, code } }),
  /** "اختر صورة": the picked photo, as the picker's base64. */
  setAvatar: (base64: string) => api<Me>('/me/avatar', { method: 'POST', body: photoForm(base64, 'avatar.jpg') }),
};
