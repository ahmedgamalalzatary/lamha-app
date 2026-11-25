'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminRating, AdminTicket, SupportPhone, TicketStatus, TicketType } from '@tawsela/shared';
import { api } from '@/core/api/client';

const TICKETS = ['admin', 'tickets'] as const;
const PHONES = ['admin', 'settings', 'support-phones'] as const;

export const useTickets = (type: TicketType) =>
  useQuery({ queryKey: [...TICKETS, type], queryFn: () => api.request<AdminTicket[]>(`/admin/tickets?type=${type}`) });

export function useSetTicketStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: TicketStatus }) => api.request<AdminTicket>(`/admin/tickets/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: () => client.invalidateQueries({ queryKey: TICKETS }),
  });
}

export const useRatings = () => useQuery({ queryKey: ['admin', 'ratings'], queryFn: () => api.request<AdminRating[]>('/admin/ratings') });

export const useSupportPhones = () => useQuery({ queryKey: PHONES, queryFn: () => api.request<SupportPhone[]>('/admin/settings/support-phones') });

export function useSaveSupportPhones() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (phones: SupportPhone[]) => api.request<SupportPhone[]>('/admin/settings/support-phones', { method: 'PUT', body: { phones } }),
    onSuccess: (saved) => client.setQueryData(PHONES, saved),
  });
}
