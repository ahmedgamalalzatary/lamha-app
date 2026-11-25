import type { RatePrompt, RatingInput, SupportPhone, TicketInput } from '@tawsela/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/core/api/client';

export const supportApi = {
  rate: (orderId: number, body: RatingInput) => api<void>(`/me/orders/${orderId}/rating`, { method: 'POST', body }),
  prompt: () => api<{ order: RatePrompt | null }>('/me/rate-prompt'),
  skip: (orderId: number) => api<void>(`/me/orders/${orderId}/rating/skip`, { method: 'POST' }),
  ticket: (body: TicketInput) => api<void>('/me/tickets', { method: 'POST', body }),
  phones: () => api<SupportPhone[]>('/support/phones'),
};

/** "تواصل معنا": the numbers the admin keeps, loaded when the sheet opens. */
export const useSupportPhones = (enabled: boolean) => useQuery({ queryKey: ['support', 'phones'], queryFn: supportApi.phones, enabled });
