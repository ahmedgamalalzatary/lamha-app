import type { CreatedAccount, DriverAccount, GeneratedPassword } from '@tawsela/shared';
import { api } from '@/core/api/client';

/** The admin's driver accounts (contract §11.2): the same routes the dashboard uses. */
export const driversApi = {
  list: (q: string) => api<DriverAccount[]>(`/admin/drivers${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`),
  create: (body: { firstName: string; lastName: string; phone: string }) => api<CreatedAccount>('/admin/drivers', { method: 'POST', body }),
  resetPassword: (id: number) => api<GeneratedPassword>(`/admin/drivers/${id}/password`, { method: 'POST' }),
  setDisabled: (id: number, disabled: boolean) => api<DriverAccount>(`/admin/drivers/${id}`, { method: 'PATCH', body: { disabled } }),
};
