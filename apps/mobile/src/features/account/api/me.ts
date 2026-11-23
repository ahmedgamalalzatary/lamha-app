import type { Gender, Locale, Me } from '@tawsela/shared';
import { api } from '@/core/api/client';

export const meApi = {
  update: (body: { email?: string; gender?: Gender; locale?: Locale }) => api<Me>('/me', { method: 'PATCH', body }),
  remove: (password: string) => api<void>('/me', { method: 'DELETE', body: { password } }),
};
