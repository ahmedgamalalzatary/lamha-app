import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { DriverAction, DriverOffer, DriverOrder, DriverOrderDetails, DriverShiftState, SkipResult } from '@tawsela/shared';
import { api } from '@/core/api/client';
import { useSession } from '@/core/auth/session';

/** The signed-in delivery man, so one never sees the previous one's cached shift or orders. */
const useDriverId = () => useSession((s) => (s.user?.role === 'driver' ? s.user.id : undefined));

/** Every query of the driver area starts with this key, so one refresh covers them all. */
export const driverKey = ['driver'] as const;

/** His shift: a slow fallback refresh; the times on screen move on their own. */
export function useDriverShift() {
  const id = useDriverId();
  return useQuery({
    queryKey: [...driverKey, id, 'shift'],
    queryFn: () => api<DriverShiftState>('/driver/shift'),
    enabled: id !== undefined,
    refetchInterval: 60_000,
  });
}

/** بدء نوبة العمل, تمديد, إنهاء: the answer is the new state; offers change with it. */
export function useShiftAction() {
  const queries = useQueryClient();
  const id = useDriverId();
  return useMutation({
    mutationFn: (action: 'start' | 'extend' | 'end') => api<DriverShiftState>(`/driver/shift/${action}`, { method: 'POST' }),
    onSuccess: (state) => queries.setQueryData([...driverKey, id, 'shift'], state),
    onSettled: () => queries.invalidateQueries({ queryKey: driverKey }),
  });
}

/** The offers he may take now (none off shift or while blocked). The socket refreshes them; this is the fallback. */
export function useDriverOffers() {
  const id = useDriverId();
  return useQuery({
    queryKey: [...driverKey, id, 'offers'],
    queryFn: () => api<DriverOffer[]>('/driver/offers'),
    enabled: id !== undefined,
    refetchInterval: 30_000,
  });
}

/** قبول: either way everything is read again (OFFER_TAKEN means someone else was first). */
export function useAcceptOffer() {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: (orderId: number) => api<DriverOrderDetails>(`/driver/offers/${orderId}/accept`, { method: 'POST' }),
    onSettled: () => queries.invalidateQueries({ queryKey: driverKey }),
  });
}

/** تخطي: the answer says whether it brought a warning or a block. */
export function useSkipOffer() {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: (orderId: number) => api<SkipResult>(`/driver/offers/${orderId}/skip`, { method: 'POST' }),
    onSettled: () => queries.invalidateQueries({ queryKey: driverKey }),
  });
}

/** الطلبات الحالية. */
export function useDriverOrders() {
  const id = useDriverId();
  return useQuery({
    queryKey: [...driverKey, id, 'orders'],
    queryFn: () => api<DriverOrder[]>('/driver/orders'),
    enabled: id !== undefined,
    refetchInterval: 60_000,
  });
}

export function useDriverOrder(orderId: number | undefined) {
  const id = useDriverId();
  return useQuery({
    queryKey: [...driverKey, id, 'order', orderId],
    queryFn: () => api<DriverOrderDetails>(`/driver/orders/${orderId}`),
    enabled: id !== undefined && orderId !== undefined,
  });
}

/** وصلت للمتجر, خارج للتوصيل, تم التوصيل. */
export function useDriverStep() {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number; action: DriverAction }) => api<DriverOrderDetails>(`/driver/orders/${id}/${action}`, { method: 'POST' }),
    onSettled: () => queries.invalidateQueries({ queryKey: driverKey }),
  });
}
