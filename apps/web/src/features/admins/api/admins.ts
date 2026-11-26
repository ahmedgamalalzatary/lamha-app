'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreatedAccount, GeneratedPassword, StaffAccount } from '@tawsela/shared';
import { api } from '@/core/api/client';

const KEY = ['admin', 'admins'];

export const useAdmins = () => useQuery({ queryKey: KEY, queryFn: () => api.request<StaffAccount[]>('/admin/admins') });

/** Every change refreshes the list afterwards. */
function useAdminMutation<A, R>(fn: (args: A) => Promise<R>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => client.invalidateQueries({ queryKey: KEY }) });
}

export const useCreateAdmin = () =>
  useAdminMutation((body: { firstName: string; lastName: string; phone: string }) =>
    api.request<CreatedAccount>('/admin/admins', { method: 'POST', body }),
  );

export const useResetAdminPassword = () =>
  useAdminMutation((id: number) => api.request<GeneratedPassword>(`/admin/admins/${id}/password`, { method: 'POST' }));

export const useSetAdminDisabled = () =>
  useAdminMutation(({ id, disabled }: { id: number; disabled: boolean }) =>
    api.request<StaffAccount>(`/admin/admins/${id}`, { method: 'PATCH', body: { disabled } }),
  );
