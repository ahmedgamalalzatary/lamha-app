import type { AdminStore, CreatedAccount, GeneratedPassword, PartnerAccount } from '@tawsela/shared';
import { api } from '@/core/api/client';

/** The admin's partner accounts (contract §11.2): the same routes the dashboard uses. */
export const partnersApi = {
  list: (q: string) => api<PartnerAccount[]>(`/admin/partners${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`),
  stores: () => api<AdminStore[]>('/admin/stores'),
  create: (body: { storeId: number; firstName: string; lastName: string; phone: string }) =>
    api<CreatedAccount>('/admin/partners', { method: 'POST', body }),
  resetPassword: (id: number) => api<GeneratedPassword>(`/admin/partners/${id}/password`, { method: 'POST' }),
  setDisabled: (id: number, disabled: boolean) => api<PartnerAccount>(`/admin/partners/${id}`, { method: 'PATCH', body: { disabled } }),
};
