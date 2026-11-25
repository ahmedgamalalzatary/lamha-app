'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreatedAccount, DriverAccount, DriverSettings, GeneratedPassword, WeekSchedule } from '@tawsela/shared';
import { api } from '@/core/api/client';

const KEY = ['admin', 'drivers'] as const;
const SETTINGS_KEY = ['admin', 'settings', 'drivers'] as const;

/** المندوبين, optionally matching a name or phone. The shift column changes on its own, so it looks again every half minute. */
export const useDrivers = (q = '') =>
  useQuery({
    queryKey: [...KEY, q.trim()],
    queryFn: () => api.request<DriverAccount[]>(q.trim() ? `/admin/drivers?q=${encodeURIComponent(q.trim())}` : '/admin/drivers'),
    refetchInterval: 30_000,
  });

/** Every change refreshes the list afterwards. */
function useDriverMutation<A, R>(fn: (args: A) => Promise<R>) {
  const client = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => client.invalidateQueries({ queryKey: KEY }) });
}

export const useCreateDriver = () =>
  useDriverMutation((body: { firstName: string; lastName: string; phone: string }) => api.request<CreatedAccount>('/admin/drivers', { method: 'POST', body }));

export const useResetDriverPassword = () =>
  useDriverMutation((id: number) => api.request<GeneratedPassword>(`/admin/drivers/${id}/password`, { method: 'POST' }));

export const useSetDriverDisabled = () =>
  useDriverMutation(({ id, disabled }: { id: number; disabled: boolean }) => api.request<DriverAccount>(`/admin/drivers/${id}`, { method: 'PATCH', body: { disabled } }));

export const useSetDriverSchedule = () =>
  useDriverMutation(({ id, schedule }: { id: number; schedule: WeekSchedule | null }) =>
    api.request<DriverAccount>(`/admin/drivers/${id}/schedule`, { method: 'PUT', body: { schedule } }),
  );

export const useStartDriverShift = () => useDriverMutation((id: number) => api.request<DriverAccount>(`/admin/drivers/${id}/shift`, { method: 'POST' }));

export const useDriverSettings = () => useQuery({ queryKey: SETTINGS_KEY, queryFn: () => api.request<DriverSettings>('/admin/settings/drivers') });

export function useSaveDriverSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: DriverSettings) => api.request<DriverSettings>('/admin/settings/drivers', { method: 'PATCH', body }),
    onSuccess: (saved) => client.setQueryData(SETTINGS_KEY, saved),
  });
}

/** The 🛵 in الطلبات: the order table reads again afterwards. */
export function useAssignDriver() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, driverId }: { orderId: number; driverId: number }) =>
      api.request<void>(`/admin/orders/${orderId}/driver`, { method: 'POST', body: { driverId } }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['admin', 'orders'] }),
  });
}
